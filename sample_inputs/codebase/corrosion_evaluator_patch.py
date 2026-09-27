"""
Physics Core Module — Corrosion & Statutory Pressure Boundary Evaluator
Adheres to ASME B31.3 §304.1.2 and API 510 §7.1.1.
"""

from dataclasses import dataclass
from typing import Tuple

@dataclass(frozen=True)
class PipeParameters:
    diameter_outer: float       # D (inches)
    design_pressure: float      # P (psig)
    allowable_stress: float     # S (psi)
    joint_efficiency: float     # E (dimensionless, 0.0 - 1.0)
    temp_coefficient: float     # Y (dimensionless, 0.4 for ferritic steels < 900F)
    corrosion_allowance: float  # c (inches)
    measured_thickness: float   # t_actual (inches)

def calculate_b31_min_thickness(params: PipeParameters) -> float:
    """
    Computes statutory minimum thickness t_min under ASME B31.3 Section 304.1.2:
    t_min = (P * D) / (2 * (S * E + P * Y)) + c
    """
    denominator = 2.0 * (params.allowable_stress * params.joint_efficiency + params.design_pressure * params.temp_coefficient)
    if denominator <= 0.0:
        raise ValueError("Invalid physical state: denominator <= 0 in ASME B31.3 calculation")
    t_pressure = (params.design_pressure * params.diameter_outer) / denominator
    return t_pressure + params.corrosion_allowance

def evaluate_statutory_margin(params: PipeParameters) -> Tuple[bool, float, float]:
    """
    Evaluates whether measured wall thickness meets statutory minimum.
    Returns: (is_compliant, margin_inches, margin_percent)
    """
    t_min = calculate_b31_min_thickness(params)
    margin_inches = params.measured_thickness - t_min
    margin_percent = (margin_inches / t_min) * 100.0
    is_compliant = margin_inches >= 0.0
    return is_compliant, margin_inches, margin_percent
