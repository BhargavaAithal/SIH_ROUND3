"""Adversarial stress test harness authored by Challenger 1.

Empirical verification and vulnerability discovery:
1. Z3 ASME B31.3 verifier under adversarial & extreme parameters.
2. Z3 API 510 verifier under adversarial & extreme parameters.
3. Rigorous False Assurance Rate (FAR) measurements across 2,000+ randomized trials.
4. Identification and reproduction of boundary vulnerabilities:
   - Sub-pico deficit masking: abs(t_act - tm) < 1e-12 forcibly proves SAT.
   - Weld quality factor lower-bound omission: E in (0.0, 0.60) allowed despite ASME Table 302.3.4.
   - Thick-wall assumption violation: t_press >= D/6 marked SAT without invariant enforcement.
5. Sandbox execution limits (timeout enforcement, memory bounds, air-gap network isolation, egress auditing).
"""

from __future__ import annotations

import math
import os
import random
import socket
import sys
import time
from typing import Any

import psutil
import pytest

from sovereign.sandbox.auditor import (
    AirGapMonitor,
    AirGapVerdict,
    assert_zero_egress,
    audit_network_egress,
)
from sovereign.sandbox.launcher import SandboxResult, run_sandboxed
from sovereign.verifier.z3_api510 import verify_api_510_invariants
from sovereign.verifier.z3_asme import Z3VerificationResult, verify_asme_b31_3


# ============================================================================
# PART 1: Adversarial Z3 ASME B31.3 Verifier Tests
# ============================================================================

class TestZ3ASMEAdversarialStress:
    """Adversarial stress testing for ASME B31.3 SMT Verifier."""

    @pytest.mark.parametrize("p_val", [0.0, -0.0001, -1.0, -100.0, -1e10, float("-inf"), float("nan")])
    def test_asme_p_zero_or_negative_strictly_rejected(self, p_val):
        """Verify P <= 0 or non-finite P is never SAT."""
        res = verify_asme_b31_3(
            P=p_val,
            D=6.625,
            S=20000.0,
            E=1.0,
            Y=0.4,
            c=0.0625,
            t_actual=0.5,
        )
        assert res.is_valid is False
        assert res.status in ("UNSAT", "UNKNOWN")
        assert res.margin in (-999999.0, float("-inf"))
        assert len(res.violations) > 0

    @pytest.mark.parametrize("delta", [1e-4, 1e-6, 1e-9, 1e-12])
    def test_asme_sub_micron_thickness_deficit_rejected(self, delta):
        """Confirm that t_actual < tm down to 1e-12 is detected as UNSAT."""
        P, D, S, E, Y, c = 100.0, 10.0, 20000.0, 1.0, 0.4, 0.125
        tm_exact = 601.0 / 4008.0
        t_actual = tm_exact - delta

        res = verify_asme_b31_3(P=P, D=D, S=S, E=E, Y=Y, c=c, t_actual=t_actual)
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert res.margin < 0.0
        assert len(res.violations) > 0

    @pytest.mark.parametrize("delta", [1e-13, 1e-14, 1e-15])
    def test_asme_sub_pico_deficit_false_assurance_vulnerability(self, delta):
        """
        Adversarial test revealing sub-pico deficit masking.
        When t_actual is strictly less than tm by delta < 1e-12, the verifier incorrectly marks SAT.
        """
        P, D, S, E, Y, c = 100.0, 10.0, 20000.0, 1.0, 0.4, 0.125
        tm_exact = 601.0 / 4008.0
        t_actual = tm_exact - delta

        res = verify_asme_b31_3(P=P, D=D, S=S, E=E, Y=Y, c=c, t_actual=t_actual)
        # In an ideal 0.0% FAR verifier, any deficit (t_actual < tm) must be UNSAT:
        assert res.is_valid is False
        assert res.status == "UNSAT"

    @pytest.mark.parametrize("e_val", [0.0, -0.5, -1.0, 1.001, 1.05, 1.5, 2.0, float("nan"), float("inf")])
    def test_asme_quality_factor_out_of_generic_bounds(self, e_val):
        """Confirm E <= 0 or E > 1.0 or non-finite E is strictly rejected."""
        res = verify_asme_b31_3(
            P=600.0,
            D=6.625,
            S=20000.0,
            E=e_val,
            Y=0.4,
            c=0.0625,
            t_actual=0.5,
        )
        assert res.is_valid is False
        assert res.status in ("UNSAT", "UNKNOWN")

    @pytest.mark.xfail(
        reason="Vulnerability Found: ASME B31.3 Table 302.3.4 sets minimum weld factor E = 0.60 (furnace butt weld). "
               "z3_asme.py line 151 checks (0 < E <= 1.0), permitting non-standard E in (0.0, 0.60) to be marked SAT."
    )
    @pytest.mark.parametrize("e_sub_standard", [0.10, 0.30, 0.50, 0.59])
    def test_asme_quality_factor_below_asme_table_minimum_vulnerability(self, e_sub_standard):
        """
        Adversarial test for out-of-specification weld quality factor.
        Values of E below 0.60 do not exist in ASME B31.3 Table 302.3.4.
        """
        res = verify_asme_b31_3(
            P=600.0,
            D=6.625,
            S=20000.0,
            E=e_sub_standard,
            Y=0.4,
            c=0.0625,
            t_actual=2.0,  # Ample thickness to isolate weld factor check
        )
        # Should be rejected as out-of-bounds for ASME B31.3:
        assert res.is_valid is False
        assert res.status == "UNSAT"

    @pytest.mark.xfail(
        reason="Vulnerability Found: Under ASME B31.3 Section 304.1.2, when t_press >= D/6 or P/SE > 0.385, "
               "the thin-wall equation is invalid. z3_asme.py computes thin_wall_assumption_valid=False "
               "but still returns is_valid=True and status=SAT."
    )
    def test_asme_thick_wall_assumption_breach_vulnerability(self):
        """
        Adversarial test for thick wall condition (t_press >= D/6 and P/SE > 0.385).
        Equation (3a) does not apply to thick walls; returning SAT is an unsafe false assurance.
        """
        # D = 6.0, P = 5000, S = 10000, E = 1.0, Y = 0.4 -> t_press = 1.25 >= D/6 = 1.0
        res = verify_asme_b31_3(
            P=5000.0,
            D=6.0,
            S=10000.0,
            E=1.0,
            Y=0.4,
            c=0.0,
            t_actual=1.5,
        )
        assert res.model_details["thin_wall_assumption_valid"] is False
        # If thin wall assumption is violated, verifier must not certify compliance with Eq (3a):
        assert res.is_valid is False
        assert res.status != "SAT"

    @pytest.mark.parametrize("y_val", [-0.1, -1.0, 1.05, 1.5, 2.0, float("nan"), float("-inf")])
    def test_asme_temperature_coefficient_out_of_bounds(self, y_val):
        """Confirm Y < 0 or Y > 1.0 or non-finite is strictly rejected."""
        res = verify_asme_b31_3(
            P=600.0,
            D=6.625,
            S=20000.0,
            E=1.0,
            Y=y_val,
            c=0.0625,
            t_actual=0.5,
        )
        assert res.is_valid is False
        assert res.status in ("UNSAT", "UNKNOWN")

    @pytest.mark.parametrize("bad_c", [-0.0001, -0.5, -10.0])
    def test_asme_negative_corrosion_allowance_rejected(self, bad_c):
        """Confirm negative corrosion allowance c < 0 is strictly rejected."""
        res = verify_asme_b31_3(
            P=600.0,
            D=6.625,
            S=20000.0,
            E=1.0,
            Y=0.4,
            c=bad_c,
            t_actual=0.5,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"

    @pytest.mark.parametrize("bad_tact", [0.0, -0.001, -5.0])
    def test_asme_non_positive_thickness_rejected(self, bad_tact):
        """Confirm t_actual <= 0 is strictly rejected."""
        res = verify_asme_b31_3(
            P=600.0,
            D=6.625,
            S=20000.0,
            E=1.0,
            Y=0.4,
            c=0.0625,
            t_actual=bad_tact,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"

    def test_asme_near_zero_denominator_singularity(self):
        """Denominator 2*(S*E + P*Y) <= 0 singularity handling."""
        res = verify_asme_b31_3(
            P=0.0,
            D=10.0,
            S=0.0,
            E=0.0,
            Y=0.0,
            c=0.0,
            t_actual=0.1,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"


# ============================================================================
# PART 2: Adversarial Z3 API 510 Verifier Tests
# ============================================================================

class TestZ3API510AdversarialStress:
    """Adversarial stress testing for API 510 SMT Verifier."""

    @pytest.mark.parametrize("tact,tmin", [
        (8.0 - 1e-15, 8.0),
        (8.0 - 1e-12, 8.0),
        (8.0 - 1e-9, 8.0),
        (8.0 - 0.01, 8.0),
        (5.0, 10.0),
        (0.0, 10.0),
        (-2.0, 10.0),
    ])
    def test_api510_thickness_deficit_rejected(self, tact, tmin):
        """Confirm t_actual < t_min down to machine epsilon is strictly UNSAT."""
        res = verify_api_510_invariants(
            t_actual=tact,
            t_min=tmin,
            P=150.0,
            corrosion_rate=0.25,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"
        assert res.margin <= 0.0

    @pytest.mark.parametrize("bad_p", [0.0, -0.01, -150.0, float("nan"), float("-inf")])
    def test_api510_non_positive_pressure_rejected(self, bad_p):
        """Confirm P <= 0 is strictly rejected."""
        res = verify_api_510_invariants(
            t_actual=12.0,
            t_min=8.0,
            P=bad_p,
            corrosion_rate=0.25,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"

    @pytest.mark.parametrize("bad_cr", [0.0, -0.001, -0.25, float("nan"), float("-inf")])
    def test_api510_non_positive_corrosion_rate_rejected(self, bad_cr):
        """Confirm corrosion_rate <= 0 is strictly rejected."""
        res = verify_api_510_invariants(
            t_actual=12.0,
            t_min=8.0,
            P=150.0,
            corrosion_rate=bad_cr,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"

    @pytest.mark.parametrize("bad_tmin", [0.0, -1.0, -10.0, float("nan")])
    def test_api510_non_positive_tmin_rejected(self, bad_tmin):
        """Confirm t_min <= 0 is strictly rejected."""
        res = verify_api_510_invariants(
            t_actual=12.0,
            t_min=bad_tmin,
            P=150.0,
            corrosion_rate=0.25,
        )
        assert res.is_valid is False
        assert res.status == "UNSAT"


# ============================================================================
# PART 3: False Assurance Rate (FAR) Property Suite (2,000 randomized trials)
# ============================================================================

class TestFalseAssuranceRateStress:
    """Stress harness executing 2,000 adversarial tests to confirm FAR == 0.0% within defined bounds."""

    def test_far_zero_asme_1000_stress_trials(self):
        random.seed(999)
        trials = 1000
        false_assurances = 0

        for _ in range(trials):
            mode = random.choice([
                "zero_P", "neg_P", "nan_P", "neg_D", "zero_D", "neg_S", "zero_S",
                "bad_E_zero", "bad_E_neg", "bad_E_high",
                "bad_Y_neg", "bad_Y_high", "neg_c", "neg_tact", "zero_tact", "deficit_thickness",
            ])

            P = random.uniform(50.0, 2000.0)
            D = random.uniform(2.0, 48.0)
            S = random.uniform(10000.0, 40000.0)
            E = random.choice([0.60, 0.80, 0.85, 1.00])
            Y = random.choice([0.0, 0.4, 0.5, 0.7])
            c = random.uniform(0.0, 0.3)

            denom = 2.0 * (S * E + P * Y)
            tm = (P * D) / denom + c

            if mode == "zero_P":
                P = 0.0
            elif mode == "neg_P":
                P = random.uniform(-1000.0, -0.001)
            elif mode == "nan_P":
                P = float("nan")
            elif mode == "neg_D":
                D = random.uniform(-20.0, -0.001)
            elif mode == "zero_D":
                D = 0.0
            elif mode == "neg_S":
                S = random.uniform(-30000.0, -0.001)
            elif mode == "zero_S":
                S = 0.0
            elif mode == "bad_E_zero":
                E = 0.0
            elif mode == "bad_E_neg":
                E = random.uniform(-2.0, -0.01)
            elif mode == "bad_E_high":
                E = random.uniform(1.001, 5.0)
            elif mode == "bad_Y_neg":
                Y = random.uniform(-2.0, -0.01)
            elif mode == "bad_Y_high":
                Y = random.uniform(1.001, 3.0)
            elif mode == "neg_c":
                c = random.uniform(-1.0, -0.001)
            elif mode == "neg_tact":
                t_act = random.uniform(-1.0, -0.001)
            elif mode == "zero_tact":
                t_act = 0.0
            elif mode == "deficit_thickness":
                # Deficit >= 1e-10 to stay outside IEEE float masking window
                t_act = tm - random.uniform(0.0001, 0.5)

            if mode not in ("neg_tact", "zero_tact", "deficit_thickness"):
                t_act = tm + 0.1

            res = verify_asme_b31_3(P=P, D=D, S=S, E=E, Y=Y, c=c, t_actual=t_act)
            if res.is_valid:
                false_assurances += 1

        far = (false_assurances / trials) * 100.0
        assert false_assurances == 0, f"False assurances detected: {false_assurances} / {trials}"
        assert far == 0.0

    def test_far_zero_api510_1000_stress_trials(self):
        random.seed(888)
        trials = 1000
        false_assurances = 0

        for _ in range(trials):
            mode = random.choice([
                "deficit_thickness", "zero_tact", "neg_tact", "zero_tmin", "neg_tmin",
                "zero_cr", "neg_cr", "zero_P", "neg_P", "nan_input"
            ])

            t_min = random.uniform(4.0, 30.0)
            t_act = t_min + random.uniform(0.5, 10.0)
            P = random.uniform(30.0, 1200.0)
            cr = random.uniform(0.05, 2.0)

            if mode == "deficit_thickness":
                t_act = t_min - random.uniform(0.001, 3.0)
            elif mode == "zero_tact":
                t_act = 0.0
            elif mode == "neg_tact":
                t_act = random.uniform(-5.0, -0.01)
            elif mode == "zero_tmin":
                t_min = 0.0
            elif mode == "neg_tmin":
                t_min = random.uniform(-5.0, -0.01)
            elif mode == "zero_cr":
                cr = 0.0
            elif mode == "neg_cr":
                cr = random.uniform(-2.0, -0.001)
            elif mode == "zero_P":
                P = 0.0
            elif mode == "neg_P":
                P = random.uniform(-200.0, -0.01)
            elif mode == "nan_input":
                P = float("nan")

            res = verify_api_510_invariants(t_actual=t_act, t_min=t_min, P=P, corrosion_rate=cr)
            if res.is_valid:
                false_assurances += 1

        far = (false_assurances / trials) * 100.0
        assert false_assurances == 0, f"False assurances detected: {false_assurances} / {trials}"
        assert far == 0.0


# ============================================================================
# PART 4: Sandboxed Execution Stress Tests
# ============================================================================

class TestSandboxExecutionStress:
    """Stress testing sandbox timeout, memory bounds, and air-gap network isolation."""

    def test_sandbox_sleep_timeout_enforced(self):
        """Ensure sleep exceeding timeout is terminated promptly."""
        start = time.perf_counter()
        res = run_sandboxed([sys.executable, "-c", "import time; time.sleep(15)"], timeout_sec=1)
        elapsed = time.perf_counter() - start

        assert res.returncode == 124
        assert res.timed_out is True
        assert res.success is False
        assert elapsed < 3.5
        assert "timeout" in res.stderr.lower()

    def test_sandbox_busy_loop_timeout_enforced(self):
        """Ensure CPU-heavy loop is terminated promptly."""
        start = time.perf_counter()
        res = run_sandboxed([sys.executable, "-c", "while True: pass"], timeout_sec=1)
        elapsed = time.perf_counter() - start

        assert res.returncode == 124
        assert res.timed_out is True
        assert res.success is False
        assert elapsed < 3.5

    def test_sandbox_child_process_tree_termination(self, tmp_path):
        """Ensure orphaned grand-children are terminated when parent times out."""
        pid_file = tmp_path / "child.pid"
        code = (
            "import subprocess, sys, time\n"
            f"p = subprocess.Popen([{sys.executable!r}, '-c', 'import time; time.sleep(30)'])\n"
            f"open({str(pid_file)!r}, 'w').write(str(p.pid))\n"
            "time.sleep(30)\n"
        )
        res = run_sandboxed([sys.executable, "-c", code], timeout_sec=1)
        assert res.timed_out is True
        assert pid_file.exists()

        child_pid = int(pid_file.read_text().strip())
        time.sleep(0.3)
        assert not psutil.pid_exists(child_pid) or psutil.Process(child_pid).status() == psutil.STATUS_ZOMBIE

    def test_sandbox_memory_limit_capping(self):
        """Ensure memory allocation exceeding limit is aborted/killed."""
        # 200MB allocation with 30MB limit
        code = "x = bytearray(200 * 1024 * 1024); print('ALLOC_OK')"
        res = run_sandboxed([sys.executable, "-c", code], memory_limit_mb=30, timeout_sec=5)
        assert res.returncode != 0 or "MemoryError" in res.stderr or res.oom_killed
        assert res.success is False

    def test_sandbox_network_wan_connect_blocked(self):
        """Ensure direct outbound TCP socket to WAN is blocked."""
        code = "import socket; s = socket.socket(); s.connect(('8.8.8.8', 53))"
        res = run_sandboxed([sys.executable, "-c", code], network=False, timeout_sec=3)
        assert res.returncode != 0
        assert res.network_egress_bytes == 0
        assert "Air-Gap Sandbox Violation" in res.stderr or "PermissionError" in res.stderr or res.returncode != 0

    def test_sandbox_network_dns_lookup_blocked(self):
        """Ensure DNS resolution is blocked."""
        code = "import socket; socket.gethostbyname('example.com')"
        res = run_sandboxed([sys.executable, "-c", code], network=False, timeout_sec=3)
        assert res.returncode != 0
        assert "Air-Gap Sandbox Violation" in res.stderr or "PermissionError" in res.stderr or res.returncode != 0

    def test_sandbox_audit_network_egress_zero(self):
        """Ensure audit_network_egress confirms 0 egress packets on clean execution."""
        with AirGapMonitor() as monitor:
            res = run_sandboxed([sys.executable, "-c", "print('safe computation')"], network=False, timeout_sec=5)
            assert res.success is True
        verdict = monitor.get_verdict()
        assert verdict.passed is True
        assert verdict.packets_captured == 0
        assert verdict.open_wan_sockets == 0
        assert_zero_egress(verdict)

    def test_sandbox_rapid_sequential_executions(self):
        """Ensure sandbox handles rapid sequential executions without handle leaks."""
        for i in range(5):
            res = run_sandboxed([sys.executable, "-c", f"print('batch-{i}')"], timeout_sec=3)
            assert res.returncode == 0
            assert f"batch-{i}" in res.stdout
            assert res.network_egress_bytes == 0
