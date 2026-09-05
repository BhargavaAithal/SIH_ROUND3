"""Comprehensive Verification Test Suite for Milestone 3.

Neurosymbolic AST & Z3 Verification Engine:
1. AST Security Visitor (`ast_guard.py`)
2. ASME B31.3 Piping Thickness SMT Verifier (`z3_asme.py`)
3. API 510 Pressure Vessel SMT Verifier (`z3_api510.py`)
4. False Assurance Rate (FAR == 0.0%) across 1,000+ adversarial trials.
"""

import math
import random
import pytest

from sovereign.verifier.ast_guard import verify_python_ast, ASTVerificationResult
from sovereign.verifier.z3_asme import verify_asme_b31_3, Z3VerificationResult
from sovereign.verifier.z3_api510 import verify_api_510_invariants


# =====================================================================
# 1. AST Security Guard Tests
# =====================================================================

class TestASTGuard:
    """Unit tests for AST static analysis security visitor."""

    def test_safe_pure_python_calculation(self):
        code = """
def calc_asme_b31_3(P: float, D: float, S: float, E: float, Y: float, c: float) -> float:
    numerator = P * D
    denominator = 2.0 * (S * E + P * Y)
    t_m = (numerator / denominator) + c
    return t_m
"""
        res = verify_python_ast(code)
        assert res.is_safe is True
        assert len(res.violations) == 0

    def test_safe_math_library_usage(self):
        code = """
import math

def calculate_remaining_life(t_actual: float, t_min: float, corrosion_rate: float) -> float:
    if corrosion_rate <= 0:
        raise ValueError("Corrosion rate must be strictly positive.")
    life = (t_actual - t_min) / corrosion_rate
    return math.floor(life * 100.0) / 100.0
"""
        res = verify_python_ast(code)
        assert res.is_safe is True
        assert len(res.violations) == 0

    def test_safe_json_and_typing(self):
        code = """
import json
from typing import List, Dict

def parse_corrosion_readings(payload: str) -> List[Dict[str, float]]:
    data = json.loads(payload)
    results = []
    for item in data.get("readings", []):
        results.append({"thickness": float(item["t"]), "loss": float(item.get("loss", 0.0))})
    return results
"""
        res = verify_python_ast(code)
        assert res.is_safe is True
        assert len(res.violations) == 0

    def test_safe_readonly_file_open(self):
        code = """
with open("sensor_readings.csv", "r") as f:
    raw_lines = f.readlines()
parsed = [line.strip().split(",") for line in raw_lines]

with open("binary_data.dat", "rb") as f2:
    header = f2.read(16)

with open("default_read.txt") as f3:
    content = f3.read()
"""
        res = verify_python_ast(code)
        assert res.is_safe is True
        assert len(res.violations) == 0

    def test_safe_classes_and_comprehensions(self):
        code = """
class ThicknessEvaluator:
    def __init__(self, baseline: float) -> None:
        self.baseline = baseline
    
    def evaluate(self, measurements: list[float]) -> dict[str, float]:
        deltas = [self.baseline - m for m in measurements if m < self.baseline]
        return {"count": len(deltas), "max_delta": max(deltas, default=0.0)}
"""
        res = verify_python_ast(code)
        assert res.is_safe is True
        assert len(res.violations) == 0

    @pytest.mark.parametrize("payload,expected_snippet", [
        ("import socket\ns = socket.socket()", "Forbidden import 'socket'"),
        ("import requests\nrequests.get('https://example.com')", "Forbidden import 'requests'"),
        ("from urllib.request import urlopen", "Forbidden from-import module 'urllib.request'"),
        ("import aiohttp", "Forbidden import 'aiohttp'"),
        ("import httpx", "Forbidden import 'httpx'"),
        ("import paramiko", "Forbidden import 'paramiko'"),
    ])
    def test_reject_network_imports(self, payload, expected_snippet):
        res = verify_python_ast(payload)
        assert res.is_safe is False
        assert any(expected_snippet in v for v in res.violations)

    @pytest.mark.parametrize("payload,expected_snippet", [
        ("import subprocess\nsubprocess.run(['sh', '-c', 'whoami'])", "Forbidden import 'subprocess'"),
        ("import os\nos.system('rm -rf /')", "Forbidden import 'os'"),
        ("from shutil import rmtree\nrmtree('/etc')", "Forbidden from-import module 'shutil'"),
        ("import pty\npty.spawn('/bin/bash')", "Forbidden import 'pty'"),
    ])
    def test_reject_subprocess_and_os(self, payload, expected_snippet):
        res = verify_python_ast(payload)
        assert res.is_safe is False
        assert any(expected_snippet in v for v in res.violations)

    @pytest.mark.parametrize("payload,expected_snippet", [
        ("eval(\"__import__('os').system('ls')\")", "eval"),
        ("exec(\"import os; os.system('whoami')\")", "exec"),
        ("compile('x = 1', '<string>', 'exec')", "compile"),
        ("__import__('os')", "__import__"),
    ])
    def test_reject_eval_exec_primitives(self, payload, expected_snippet):
        res = verify_python_ast(payload)
        assert res.is_safe is False
        assert any(expected_snippet in v for v in res.violations)

    @pytest.mark.parametrize("payload,expected_snippet", [
        ("with open('config.txt', 'w') as f:\n    f.write('bad')", "Forbidden open() mode 'w'"),
        ("f = open('audit.log', mode='a')", "Forbidden open() mode 'a'"),
        ("f = open('firmware.bin', 'r+b')", "Forbidden open() mode 'r+b'"),
        ("m = 'w'\nf = open('payload.py', m)", "Forbidden dynamic mode expression"),
    ])
    def test_reject_file_write_attempts(self, payload, expected_snippet):
        res = verify_python_ast(payload)
        assert res.is_safe is False
        assert any(expected_snippet in v for v in res.violations)

    @pytest.mark.parametrize("payload,expected_snippet", [
        ("subclasses = ().__class__.__bases__[0].__subclasses__()", "__subclasses__"),
        ("fn = getattr(__builtins__, 'eval')", "getattr"),
        ("e = eval\ne('1 + 1')", "Forbidden reference to 'eval'"),
        ("o = open\no('leak.txt', 'w')", "Forbidden reference to 'open' outside direct call"),
        ("ns = globals()", "globals"),
        ("import sys\nsys.modules['os'].system('id')", "Forbidden import 'sys'"),
    ])
    def test_reject_reflection_and_jailbreaks(self, payload, expected_snippet):
        res = verify_python_ast(payload)
        assert res.is_safe is False
        assert any(expected_snippet in v for v in res.violations)

    def test_syntax_error_handled_safely(self):
        code = "def unclosed_block("
        res = verify_python_ast(code)
        assert res.is_safe is False
        assert any("SyntaxError" in v for v in res.violations)

    def test_empty_code_string(self):
        res = verify_python_ast("   \n\t  ")
        assert res.is_safe is False
        assert any("EmptyCodeString" in v for v in res.violations)


# =====================================================================
# 2. ASME B31.3 Z3 Verifier Tests
# =====================================================================

class TestZ3ASME:
    """Unit tests for ASME B31.3 piping wall thickness Z3 SMT verifier."""

    def test_asme_standard_carbon_steel_seamless_pass(self):
        """NPS 6 Sch 40 ASTM A106 Grade B at 300 F, 600 psig (Adequate thickness)."""
        # D = 6.625", P = 600 psig, S = 20,000 psi, E = 1.0, Y = 0.4, c = 0.0625"
        # Nom thk = 0.280", minus 12.5% mill tolerance = 0.245"
        # tm = 3975 / 40480 + 0.0625 = 0.0981966 + 0.0625 = 0.1606966"
        res = verify_asme_b31_3(
            P=600.0,
            D=6.625,
            S=20000.0,
            E=1.0,
            Y=0.4,
            c=0.0625,
            t_actual=0.245,
        )
        assert res.is_valid is True
        assert res.status == "SAT"
        assert pytest.approx(res.model_details["t_m"], rel=1e-4) == 0.160697
        assert pytest.approx(res.margin, rel=1e-4) == (0.245 - 0.160697)
        assert res.margin > 0
        assert len(res.violations) == 0
        # Check backward compatibility properties
        assert res.t_min == res.model_details["t_m"]
        assert res.t_actual == 0.245
        assert res.invariant_passed is True

    def test_asme_corroded_pipe_thickness_deficit_fail(self):
        """NPS 6 Sch 40 ASTM A106 Grade B severely corroded to 0.120" (Insufficient thickness)."""
        res = verify_asme_b31_3(
            P=600.0,
            D=6.625,
            S=20000.0,
            E=1.0,
            Y=0.4,
            c=0.0625,
            t_actual=0.120,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert res.margin < 0
        assert any("Pipe thickness deficit" in v for v in res.violations)
        assert res.counterexample is not None
        assert res.counterexample["t_actual"] == 0.120

    def test_asme_exact_boundary_condition(self):
        """Verify that t_actual == tm satisfies the ASME standard (margin == 0)."""
        P, D, S, E, Y, c = 100.0, 10.0, 20000.0, 1.0, 0.4, 0.125
        # denom = 2 * (20000 + 40) = 40080
        # t = 1000 / 40080 = 25 / 1002
        # tm = 25/1002 + 1/8 = 601 / 4008 = 0.1499500998...
        tm_exact = 601.0 / 4008.0

        res = verify_asme_b31_3(P=P, D=D, S=S, E=E, Y=Y, c=c, t_actual=tm_exact)
        assert res.is_valid is True
        assert res.status == "SAT"
        assert abs(res.margin) < 1e-9

    @pytest.mark.parametrize("delta", [1e-6, 1e-9, 1e-12])
    def test_asme_sub_micron_deficit_caught(self, delta):
        """Verify that t_actual = tm - delta is strictly detected as UNSAT (Zero FAR)."""
        P, D, S, E, Y, c = 100.0, 10.0, 20000.0, 1.0, 0.4, 0.125
        tm_exact = 601.0 / 4008.0
        t_under = tm_exact - delta

        res = verify_asme_b31_3(P=P, D=D, S=S, E=E, Y=Y, c=c, t_actual=t_under)
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert res.margin < 0

    @pytest.mark.parametrize("bad_P", [-100.0, -1.0, 0.0])
    def test_invariant_negative_or_zero_pressure(self, bad_P):
        res = verify_asme_b31_3(P=bad_P, D=10.0, S=20000.0, E=1.0, Y=0.4, c=0.125, t_actual=0.25)
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("pressure P must be strictly positive" in v for v in res.violations)

    @pytest.mark.parametrize("bad_D", [-5.0, 0.0])
    def test_invariant_negative_or_zero_diameter(self, bad_D):
        res = verify_asme_b31_3(P=100.0, D=bad_D, S=20000.0, E=1.0, Y=0.4, c=0.125, t_actual=0.25)
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("diameter D must be strictly positive" in v for v in res.violations)

    @pytest.mark.parametrize("bad_S", [-20000.0, 0.0])
    def test_invariant_negative_or_zero_allowable_stress(self, bad_S):
        res = verify_asme_b31_3(P=100.0, D=10.0, S=bad_S, E=1.0, Y=0.4, c=0.125, t_actual=0.25)
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("stress S must be strictly positive" in v for v in res.violations)

    @pytest.mark.parametrize("bad_E", [-0.5, 0.0, 1.05, 2.0])
    def test_invariant_quality_factor_out_of_bounds(self, bad_E):
        res = verify_asme_b31_3(P=100.0, D=10.0, S=20000.0, E=bad_E, Y=0.4, c=0.125, t_actual=0.25)
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("quality factor E must satisfy" in v for v in res.violations)

    @pytest.mark.parametrize("bad_Y", [-0.2, 1.1, 2.0])
    def test_invariant_temperature_coefficient_out_of_bounds(self, bad_Y):
        res = verify_asme_b31_3(P=100.0, D=10.0, S=20000.0, E=1.0, Y=bad_Y, c=0.125, t_actual=0.25)
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("coefficient Y must satisfy" in v for v in res.violations)

    @pytest.mark.parametrize("bad_c", [-0.5, -0.001])
    def test_invariant_negative_corrosion_allowance(self, bad_c):
        res = verify_asme_b31_3(P=100.0, D=10.0, S=20000.0, E=1.0, Y=0.4, c=bad_c, t_actual=0.25)
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("allowance c must be non-negative" in v for v in res.violations)

    @pytest.mark.parametrize("bad_tact", [-0.2, 0.0])
    def test_invariant_negative_or_zero_actual_thickness(self, bad_tact):
        res = verify_asme_b31_3(P=100.0, D=10.0, S=20000.0, E=1.0, Y=0.4, c=0.125, t_actual=bad_tact)
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("thickness t_actual must be strictly positive" in v for v in res.violations)

    def test_non_finite_inputs_rejected(self):
        res = verify_asme_b31_3(P=float("nan"), D=10.0, S=20000.0, E=1.0, Y=0.4, c=0.125, t_actual=0.25)
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("must be finite" in v for v in res.violations)

    def test_enterprise_keyword_arguments_alias_compatibility(self):
        res = verify_asme_b31_3(
            design_pressure=600.0,
            outside_diameter=6.625,
            allowable_stress=20000.0,
            quality_factor=1.0,
            temp_coefficient=0.4,
            corrosion_allowance=0.0625,
            actual_thickness=0.245,
        )
        assert res.is_valid is True
        assert res.status == "SAT"
        assert res.model_details["P"] == 600.0
        assert res.t_min > 0.0


# =====================================================================
# 3. API 510 Z3 Verifier Tests
# =====================================================================

class TestZ3API510:
    """Unit tests for API 510 pressure vessel inspection invariants Z3 SMT verifier."""

    def test_api510_nominal_valid(self):
        """Nominal operating vessel (t_act = 12.5, t_m = 8.0, P = 150.0, C_R = 0.25)."""
        res = verify_api_510_invariants(
            t_actual=12.5,
            t_min=8.0,
            P=150.0,
            corrosion_rate=0.25,
        )
        assert res.is_valid is True
        assert res.status == "SAT"
        assert res.margin == 4.5
        assert res.model_details["remaining_life"] == 18.0
        assert res.model_details["half_remaining_life"] == 9.0
        assert res.model_details["max_inspection_interval"] == 9.0
        assert res.model_details["is_at_retirement_limit"] is False
        assert len(res.violations) == 0

    def test_api510_exact_retirement_boundary(self):
        """Exact boundary condition (t_act == t_min)."""
        res = verify_api_510_invariants(
            t_actual=8.0,
            t_min=8.0,
            P=150.0,
            corrosion_rate=0.25,
        )
        assert res.is_valid is True
        assert res.status == "SAT"
        assert res.margin == 0.0
        assert res.model_details["remaining_life"] == 0.0
        assert res.model_details["max_inspection_interval"] == 0.0
        assert res.model_details["is_at_retirement_limit"] is True

    def test_api510_thickness_breach(self):
        """Unsafe thinning (t_act < t_min)."""
        res = verify_api_510_invariants(
            t_actual=7.5,
            t_min=8.0,
            P=150.0,
            corrosion_rate=0.25,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert res.margin == -0.5
        assert any("Thickness retirement breach" in v for v in res.violations)
        assert res.counterexample is not None
        assert res.counterexample["deficit"] == 0.5

    @pytest.mark.parametrize("delta", [1e-6, 1e-9, 1e-12])
    def test_api510_sub_micron_breach(self, delta):
        """Sub-micron thinning breach."""
        res = verify_api_510_invariants(
            t_actual=8.0 - delta,
            t_min=8.0,
            P=150.0,
            corrosion_rate=0.25,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert res.margin < 0

    @pytest.mark.parametrize("bad_cr", [0.0, -0.01, -0.5])
    def test_api510_zero_or_negative_corrosion_rate(self, bad_cr):
        res = verify_api_510_invariants(
            t_actual=12.5,
            t_min=8.0,
            P=150.0,
            corrosion_rate=bad_cr,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("Corrosion rate violation" in v for v in res.violations)

    @pytest.mark.parametrize("bad_p", [0.0, -5.0, -14.7])
    def test_api510_vacuum_or_zero_pressure(self, bad_p):
        res = verify_api_510_invariants(
            t_actual=12.5,
            t_min=8.0,
            P=bad_p,
            corrosion_rate=0.25,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("Operating pressure violation" in v for v in res.violations)

    def test_api510_compound_multi_violations(self):
        """Simultaneous multiple breaches."""
        res = verify_api_510_invariants(
            t_actual=6.0,
            t_min=8.0,
            P=-10.0,
            corrosion_rate=-0.5,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("Thickness retirement breach" in v for v in res.violations)
        assert any("Operating pressure violation" in v for v in res.violations)
        assert any("Corrosion rate violation" in v for v in res.violations)

    def test_api510_inspection_interval_10yr_cap(self):
        """Long remaining life: RL = (20.0 - 5.0) / 0.5 = 30 yrs; RL / 2 = 15 yrs."""
        # When cap_interval_10yr is True: capped at 10.0
        res_capped = verify_api_510_invariants(
            t_actual=20.0,
            t_min=5.0,
            P=100.0,
            corrosion_rate=0.5,
            cap_interval_10yr=True,
        )
        assert res_capped.is_valid is True
        assert res_capped.model_details["remaining_life"] == 30.0
        assert res_capped.model_details["half_remaining_life"] == 15.0
        assert res_capped.model_details["max_inspection_interval"] == 10.0

        # When cap_interval_10yr is False: uncapped at 15.0
        res_uncapped = verify_api_510_invariants(
            t_actual=20.0,
            t_min=5.0,
            P=100.0,
            corrosion_rate=0.5,
            cap_interval_10yr=False,
        )
        assert res_uncapped.is_valid is True
        assert res_uncapped.model_details["max_inspection_interval"] == 15.0

    def test_api510_non_finite_inputs(self):
        res = verify_api_510_invariants(
            t_actual=float("nan"),
            t_min=8.0,
            P=150.0,
            corrosion_rate=0.25,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert any("non-finite" in v for v in res.violations)

    def test_api510_keyword_aliases(self):
        res = verify_api_510_invariants(
            t_actual=12.5,
            t_min=8.0,
            pressure=150.0,
            cr=0.25,
        )
        assert res.is_valid is True
        assert res.status == "SAT"
        assert res.model_details["P"] == 150.0


# =====================================================================
# 4. Property-Based Adversarial Suite: False Assurance Rate (FAR == 0.0%)
# =====================================================================

class TestFARZeroPropertySuite:
    """Mathematical and empirical proof that False Assurance Rate is identically 0.0%."""

    def test_far_zero_asme_1000_adversarial_trials(self):
        """Prove FAR == 0.0% over 1,000 randomized adversarial ASME B31.3 edge cases."""
        random.seed(42)
        trials = 1000
        false_assurances = 0

        for _ in range(trials):
            mode = random.choice([
                "neg_P", "neg_D", "neg_S", "bad_E_low", "bad_E_high",
                "bad_Y_low", "bad_Y_high", "neg_c", "neg_tact", "deficit_thickness"
            ])

            P = random.uniform(50.0, 1500.0)
            D = random.uniform(2.0, 36.0)
            S = random.uniform(10000.0, 35000.0)
            E = random.choice([0.60, 0.80, 0.85, 1.00])
            Y = random.choice([0.0, 0.4, 0.5, 0.7])
            c = random.uniform(0.0, 0.25)

            denom = 2.0 * (S * E + P * Y)
            tm = (P * D) / denom + c

            if mode == "neg_P":
                P = random.uniform(-500.0, 0.0)
            elif mode == "neg_D":
                D = random.uniform(-10.0, 0.0)
            elif mode == "neg_S":
                S = random.uniform(-20000.0, 0.0)
            elif mode == "bad_E_low":
                E = random.uniform(-1.0, 0.0)
            elif mode == "bad_E_high":
                E = random.uniform(1.01, 3.0)
            elif mode == "bad_Y_low":
                Y = random.uniform(-1.0, -0.01)
            elif mode == "bad_Y_high":
                Y = random.uniform(1.01, 2.5)
            elif mode == "neg_c":
                c = random.uniform(-0.5, -0.001)
            elif mode == "neg_tact":
                t_act = random.uniform(-0.5, 0.0)
            elif mode == "deficit_thickness":
                t_act = tm - random.uniform(0.0001, 0.2)

            if mode not in ("neg_tact", "deficit_thickness"):
                t_act = tm + 0.1  # Plausible thickness, but invariant violated

            res = verify_asme_b31_3(P=P, D=D, S=S, E=E, Y=Y, c=c, t_actual=t_act)

            # Ground truth: every single generated case here is UNSAFE
            if res.is_valid:
                false_assurances += 1

        far = (false_assurances / trials) * 100.0
        assert false_assurances == 0, f"False assurances detected: {false_assurances} / {trials}"
        assert far == 0.0

    def test_far_zero_api510_1200_adversarial_trials(self):
        """Prove FAR == 0.0% over 1,200 randomized adversarial API 510 edge cases."""
        random.seed(1337)
        trials = 1200
        false_assurances = 0

        for _ in range(trials):
            mode = random.choice([
                "thickness_deficit",
                "sub_micron_deficit",
                "zero_corrosion",
                "negative_corrosion",
                "zero_pressure",
                "vacuum_pressure",
                "compound_breach",
                "non_finite_nan",
            ])

            t_min = random.uniform(5.0, 25.0)
            t_act = t_min + random.uniform(0.1, 10.0)
            P = random.uniform(50.0, 1000.0)
            cr = random.uniform(0.05, 1.5)

            if mode == "thickness_deficit":
                t_act = t_min - random.uniform(0.01, 4.0)
            elif mode == "sub_micron_deficit":
                delta = random.choice([1e-6, 1e-9, 1e-12])
                t_act = t_min - delta
            elif mode == "zero_corrosion":
                cr = 0.0
            elif mode == "negative_corrosion":
                cr = random.uniform(-2.0, -0.001)
            elif mode == "zero_pressure":
                P = 0.0
            elif mode == "vacuum_pressure":
                P = random.uniform(-100.0, -0.01)
            elif mode == "compound_breach":
                t_act = t_min - 1.0
                cr = -0.5
                P = -10.0
            elif mode == "non_finite_nan":
                t_act = float("nan")

            res = verify_api_510_invariants(
                t_actual=t_act,
                t_min=t_min,
                P=P,
                corrosion_rate=cr,
            )

            # Ground truth: every case is UNSAFE
            if res.is_valid:
                false_assurances += 1

        far = (false_assurances / trials) * 100.0
        assert false_assurances == 0, f"False assurances detected: {false_assurances} / {trials}"
        assert far == 0.0
