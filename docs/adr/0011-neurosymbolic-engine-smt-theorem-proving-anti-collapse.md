# ADR-0011: Neurosymbolic Engine, SMT Theorem Proving & Anti-Collapse State Machine (SMITRACE ADR-004)

- **Status**: Accepted
- **Date**: 2026-09-20
- **Authors**: SMITRACE Architecture Team
- **Tags**: #neurosymbolic #z3 #smt #qf_nra #anti_collapse #asme #api510 #api650 #verification

## Context & Problem Statement
Industrial engineering deliverables in high-hazard facilities (refinery piping circuits, pressure vessels, chemical storage tanks) cannot tolerate probabilistic hallucinations or non-zero error rates. Stochastic LLM outputs must be bound by formal mathematical proofs enforcing physical invariants across statutory engineering codes (**ASME B31.3, API 510, API 650, API 570, ISO 13703**) with a non-negotiable **0.0% False Assurance Rate (FAR)**.

Furthermore, autonomous multi-turn debugging agents frequently suffer from "cognitive collapse," cycling into degenerative error loops when fed sprawling conversational error histories.

## Decision Drivers
- **Zero-Tolerance Safety**: An incorrect wall thickness or corrosion calculation can cause refinery overpressurization or catastrophic vessel rupture; mathematical verification must be deterministic.
- **Precision Integrity**: Standard IEEE-754 floating-point arithmetic introduces rounding and truncation errors that corrupt statutory compliance margins.
- **Agent Convergence**: Multi-turn self-correction must reliably converge within $\le 3$ iterations without entering infinite loops or context degradation.
- **Auditability**: Every verification decision must be cryptographically sealed in an append-only ledger for non-repudiation during regulatory audits.

## Considered Options
1. **Formal SMT Solvers**:
   - **Microsoft Z3 (v4.12+)**: Industry standard; native First-Order Non-Linear Real Arithmetic (`QF_NRA`) via Cylindrical Algebraic Decomposition (CAD) and NLSat; supports exact rational arithmetic.
   - **CVC5**: Powerful SMT solver with strong quantifier support, but slightly higher latency on non-linear polynomial systems.
   - **Bitwuzla**: Optimized for bit-vector logics; less suited for continuous engineering real arithmetic.
2. **Arithmetic Representation**:
   - **Exact Algebraic Rational Numbers (`QF_NRA`)**: Eliminates floating-point rounding errors entirely by representing parameters as exact fractions (e.g. $t_m = \frac{223}{1008}\text{ in}$).
   - **IEEE-754 64-bit Floats**: Vulnerable to precision loss and non-deterministic behavior across different CPU architectures.
3. **Agent Self-Correction Control Loop**:
   - **State-Isolated Anti-Collapse Loop**: Decouples Immutable Spec, Mutable State, and Failure Hashes; feeds only clean context on error.
   - **Conversational Chat Loop (LangChain / AutoGen)**: Accumulates full dialogue history; small models (7B–14B) suffer context poisoning and repetitive looping.

## Decision Outcome
Chosen Option: **Microsoft Z3 SMT Theorem Prover using exact rational First-Order Non-Linear Real Arithmetic (`QF_NRA`)**, paired with a **Two-Phase Verification Protocol**, a **State-Isolated Anti-Collapse Control Loop**, and an **Append-Only Merkle Audit Log**.

### Implementation Architecture
1. **Formal SMT Engine**: Standardize on **Microsoft Z3** using exact algebraic rational numbers over `QF_NRA`. Z3's NLSat engine evaluates non-linear multi-variable constraint envelopes:
   $$t_{\text{actual}} \ge t_{\text{min}} = \frac{P \cdot D}{2(S \cdot E + P \cdot Y)} + c$$
   $$\Phi_{\text{MAWP}} = \frac{2 \cdot S(T) \cdot E \cdot (t - c)}{D - 2 \cdot Y \cdot (t - c)} \ge P_{\text{design}}$$
2. **Two-Phase Verification Protocol (0.0% FAR)**:
   - **Phase 1 (AST Security Check)**: `ast_guard.py` parses calculation code, rejecting forbidden modules, unverified imports, and destructive filesystem calls.
   - **Phase 2 (Z3 SMT Proof)**: Z3 evaluates the physical constraint envelope. Any solver timeout ($\ge 5.0\text{s}$), syntax error, or boundary violation results in strict `FAIL`—zero heuristic or floating-point fallbacks are permitted.
3. **State-Isolated Anti-Collapse Control Loop**:
   - Decouple memory into three disjoint components:
     1. **Immutable Specification**: Task objective, statutory formulas, and boundary constraints.
     2. **Mutable Script State**: Active code attempt under test.
     3. **Failure Signature Registry**: SHA-256 hashes of failed attempts and Z3 counterexamples.
   - On error, previous conversational turns are discarded; the model receives only the clean Immutable Spec + failing traceback + Z3 counterexample.
4. **Append-Only Merkle Audit Log**: Record every SAT/UNSAT proof, AST validation result, and agent action in an append-only SHA-256 Merkle chain WAL for non-repudiation.

### Positive Consequences
- Mathematical guarantee that no unverified, non-compliant, or hazardous calculation can enter the committed state.
- Elimination of IEEE-754 floating-point drift in legal compliance deliverables.
- 100% convergence of self-correction loops within $\le 3$ iterations.
- Non-repudiable proof of compliance satisfying OISD, PESO, and NCIIPC statutory mandates.

### Negative Consequences / Tradeoffs
- Complex non-linear real arithmetic proofs can require up to 500ms; mitigated by process pool caching and 5.0s hard kill switches.
- Prompts must be strictly formatted with explicit SMT-LIB2 / Python Z3 contracts.

## Invariants & Compliance Rules
1. **Zero False Assurance Invariant**: The system must maintain an exact 0.0% False Assurance Rate; any SMT solver timeout, exception, or ambiguity must strictly emit `FAIL` with zero heuristic approximation.
2. **Exact Rational Invariant**: All physical calculations must be evaluated using exact rational fractions or algebraic numbers; floating-point approximations are forbidden in statutory proofs.
3. **Anti-Collapse Hard Ceiling Invariant**: Self-correction loops must not exceed 3 iterations; duplicate failure signatures trigger immediate escalation to `WAITING_HUMAN`.
