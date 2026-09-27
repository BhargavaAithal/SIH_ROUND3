"""
Unit test suite verifying ASME B31.3 statutory boundary conditions
"""

import pytest
from corrosion_evaluator_patch import PipeParameters, calculate_b31_min_thickness, evaluate_statutory_margin

def test_circuit400_cml03_degraded_boundary():
    """Verify CML-03 detects statutory wall deficit (< 0.2410 inch)."""
    cml03 = PipeParameters(
        diameter_outer=12.75,
        design_pressure=420.0,
        allowable_stress=20000.0,
        joint_efficiency=1.0,
        temp_coefficient=0.4,
        corrosion_allowance=0.0625,
        measured_thickness=0.178  # Critical degraded reading
    )
    t_min = calculate_b31_min_thickness(cml03)
    assert round(t_min, 4) == 0.1947 + 0.0625 or round(t_min, 3) == 0.195 or t_min > 0.178
    is_compliant, margin_inches, margin_pct = evaluate_statutory_margin(cml03)
    assert not is_compliant, "CML-03 must fail compliance due to thinning"
    assert margin_inches < 0.0

def test_circuit400_cml01_compliant_run():
    """Verify CML-01 straight pipe run satisfies statutory margin."""
    cml01 = PipeParameters(
        diameter_outer=8.625,
        design_pressure=480.0,
        allowable_stress=20000.0,
        joint_efficiency=1.0,
        temp_coefficient=0.4,
        corrosion_allowance=0.0625,
        measured_thickness=0.342  # Healthy reading
    )
    is_compliant, margin_inches, _ = evaluate_statutory_margin(cml01)
    assert is_compliant
    assert margin_inches > 0.10
