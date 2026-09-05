"""
State-Isolated Anti-Collapse Loop
3-Turn ReAct self-correction engine enforcing clean-context re-prompting,
SHA-256 failure hash tracking and deduplication, and architectural separation
between Immutable Spec, Mutable Script, and Failure Hashes.
"""
from dataclasses import dataclass, field
import hashlib
import json
import sys
from typing import Any, Callable, Dict, List, Optional

from sovereign.agent.prompt_templates import build_clean_retry_prompt, build_initial_prompt
from sovereign.sandbox.launcher import run_sandboxed, SandboxResult
from sovereign.verifier.ast_guard import verify_python_ast
from sovereign.verifier.z3_asme import verify_asme_b31_3, Z3VerificationResult


@dataclass(frozen=True)
class ImmutableSpec:
    task_id: str
    task_description: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    required_invariants: List[str] = field(default_factory=list)
    output_schema: Dict[str, Any] = field(default_factory=dict)
    asme_parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class LoopOutcome:
    success: bool
    turns_used: int
    final_script: str
    execution_result: SandboxResult
    z3_result: Optional[Z3VerificationResult] = None
    failure_hashes: List[str] = field(default_factory=list)
    trace: List[Dict[str, Any]] = field(default_factory=list)

    @property
    def turns_taken(self) -> int:
        return self.turns_used

    @property
    def failure_history(self) -> List[str]:
        return self.failure_hashes


def _default_engineering_script(spec: ImmutableSpec, turn: int) -> str:
    """Generate deterministic fallback script for ASME B31.3 calculation."""
    params = spec.parameters or spec.asme_parameters
    p = params.get("P", params.get("design_pressure", 2.5))
    d = params.get("D", params.get("outside_diameter", 323.8))
    s = params.get("S", params.get("allowable_stress", 137.9))
    e = params.get("E", params.get("quality_factor", 1.0))
    y = params.get("Y", params.get("temp_coefficient", 0.4))
    c = params.get("c", params.get("CA", params.get("corrosion_allowance", 3.0)))
    t_act = params.get("t_actual", params.get("t_act", 9.52))

    return (
        "import json\n"
        f"P = {p}\n"
        f"D = {d}\n"
        f"S = {s}\n"
        f"E = {e}\n"
        f"Y = {y}\n"
        f"c = {c}\n"
        f"t_actual = {t_act}\n"
        "t_min = (P * D) / (2 * (S * E + P * Y)) + c\n"
        "margin = t_actual - t_min\n"
        "verdict = 'SAT' if margin >= 0 else 'UNSAT'\n"
        "out = [{'tag': 'PIPE-01', 't_min': t_min, 'margin': margin, 'verdict': verdict}]\n"
        "print(json.dumps(out))\n"
    )


def run_react_loop(
    spec: ImmutableSpec,
    max_turns: int = 3,
    engine_callback: Optional[Callable[[str], str]] = None,
) -> LoopOutcome:
    """
    Execute state-isolated 3-turn ReAct self-correction loop.
    Enforces immutable spec, cleans context between turns, and tracks failure hashes.
    """
    if spec is None or not getattr(spec, "task_id", None) or not getattr(spec, "task_description", None):
        raise ValueError("Invalid spec: task_id and description required")

    failure_hashes: List[str] = []
    trace: List[Dict[str, Any]] = []
    current_prompt = build_initial_prompt(spec.task_id, spec.task_description, spec.parameters)
    last_exec_result = SandboxResult(
        returncode=-1, stdout="", stderr="Uninitialized", duration_sec=0.0, memory_peak_mb=0.0
    )
    last_z3_result: Optional[Z3VerificationResult] = None
    final_script = ""

    for turn in range(1, max_turns + 1):
        # 1. Synthesize code via callback or default generator
        if engine_callback:
            script = engine_callback(current_prompt)
        else:
            script = _default_engineering_script(spec, turn)

        final_script = script

        # 2. AST Static Security Verification
        ast_result = verify_python_ast(script)
        if not ast_result.is_safe:
            err_msg = "; ".join(ast_result.violations)
            f_hash = hashlib.sha256((script + err_msg).encode("utf-8")).hexdigest()

            # Detect duplicate failure stall
            stalled = len(failure_hashes) > 0 and failure_hashes[-1] == f_hash
            failure_hashes.append(f_hash)

            trace_entry = {
                "turn": turn,
                "category": "AST_VIOLATION",
                "error": err_msg,
                "stderr": err_msg,
                "hash": f_hash,
                "stalled": stalled,
            }
            trace.append(trace_entry)

            if stalled:
                # Cognitive collapse short-circuit
                return LoopOutcome(
                    success=False,
                    turns_used=turn,
                    final_script=script,
                    execution_result=SandboxResult(
                        returncode=1, stdout="", stderr=err_msg, duration_sec=0.01, memory_peak_mb=0.0
                    ),
                    failure_hashes=failure_hashes,
                    trace=trace,
                )

            # Re-prompt clean context for next turn
            current_prompt = build_clean_retry_prompt(spec.task_id, spec.task_description, err_msg)
            continue

        # 3. Sandbox Ephemeral Execution
        exec_result = run_sandboxed([sys.executable, "-c", script], timeout_sec=5)
        last_exec_result = exec_result

        if exec_result.returncode != 0:
            category = "TIMEOUT" if exec_result.timed_out else "RUNTIME_ERROR"
            err_msg = exec_result.stderr or "Process returned non-zero exit code"
            f_hash = hashlib.sha256((script + err_msg).encode("utf-8")).hexdigest()

            stalled = len(failure_hashes) > 0 and failure_hashes[-1] == f_hash
            failure_hashes.append(f_hash)

            trace_entry = {
                "turn": turn,
                "category": category,
                "error": err_msg,
                "stderr": err_msg,
                "hash": f_hash,
                "stalled": stalled,
            }
            trace.append(trace_entry)

            if stalled:
                return LoopOutcome(
                    success=False,
                    turns_used=turn,
                    final_script=script,
                    execution_result=exec_result,
                    failure_hashes=failure_hashes,
                    trace=trace,
                )

            current_prompt = build_clean_retry_prompt(spec.task_id, spec.task_description, err_msg)
            continue

        # 4. Neurosymbolic Z3 Formal Invariant Evaluation
        # If ASME parameters specified in spec, verify via Z3
        params = spec.parameters or spec.asme_parameters
        if params and ("P" in params or "design_pressure" in params):
            z3_res = verify_asme_b31_3(
                design_pressure=float(params.get("P", params.get("design_pressure", 2.5))),
                outside_diameter=float(params.get("D", params.get("outside_diameter", 323.8))),
                allowable_stress=float(params.get("S", params.get("allowable_stress", 137.9))),
                quality_factor=float(params.get("E", params.get("quality_factor", 1.0))),
                temp_coefficient=float(params.get("Y", params.get("temp_coefficient", 0.4))),
                corrosion_allowance=float(params.get("c", params.get("CA", params.get("corrosion_allowance", 3.0)))),
                actual_thickness=float(params.get("t_actual", params.get("t_act", 9.52))),
            )
            last_z3_result = z3_res

            if not z3_res.is_valid:
                err_msg = f"Z3 UNSAT: {z3_res.violations}"
                f_hash = hashlib.sha256((script + err_msg).encode("utf-8")).hexdigest()
                failure_hashes.append(f_hash)

                trace.append({
                    "turn": turn,
                    "category": "Z3_UNSAT",
                    "error": err_msg,
                    "stderr": err_msg,
                    "hash": f_hash,
                })
                current_prompt = build_clean_retry_prompt(
                    spec.task_id, spec.task_description, f"Counterexample: {z3_res.counterexample}"
                )
                continue

        # Successful completion
        return LoopOutcome(
            success=True,
            turns_used=turn,
            final_script=script,
            execution_result=exec_result,
            z3_result=last_z3_result,
            failure_hashes=failure_hashes,
            trace=trace,
        )

    # Cutoff reached after max_turns
    return LoopOutcome(
        success=False,
        turns_used=max_turns,
        final_script=final_script,
        execution_result=last_exec_result,
        z3_result=last_z3_result,
        failure_hashes=failure_hashes,
        trace=trace,
    )
