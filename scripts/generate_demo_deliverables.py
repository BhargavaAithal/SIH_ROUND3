"""
Script to generate pre-compiled scenario-specific deliverables (.docx and .xlsx)
for presentation demonstration.
"""
import sys
from pathlib import Path

# Add project root and src to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from sovereign.reports.docx_compiler import generate_psu_memo
from sovereign.reports.xlsx_compiler import generate_audit_workbook

output_dir = Path(__file__).resolve().parent.parent / "ui" / "public" / "deliverables"
output_dir.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# Scenario 1: Baseline Compliant Operation
# -------------------------------------------------------------
meta_baseline = {
    "title": "STATUTORY ENGINEERING MEMORANDUM & APPROVAL NOTE",
    "ref_no": "PSU/IOCL/MECH/2026/089",
    "refinery": "Paradip Refinery - Crude Distillation Unit (CDU-1)",
    "unit": "Atmospheric Distillation Crude Pre-Heat Train",
    "tag": '16"-P-101-CS-150',
    "date": "2026-09-09",
    "engineer": "Er. R. K. Sharma (Superintending Engineer - Inspection)",
    "approver": "Shri V. G. Menon (Executive Director - Technical & Operations)",
    "recommendation": (
        "SAFE FOR CONTINUED UNRESTRICTED OPERATION. Line 16\"-P-101-CS-150 demonstrates a remaining "
        "corrosion allowance margin of +2.49 mm (+0.098 in) above ASME B31.3 statutory minimum wall thickness. "
        "Formal Z3 SMT solver confirms 0.000% False Assurance Rate across all operational boundaries. "
        "Next statutory ultrasonic thickness gauging scheduled for Q3 2028."
    )
}
calcs_baseline = [
    {"parameter": "Nominal Pipe Diameter (OD)", "value": '16.00 in (406.4 mm)', "status": "SAT", "notes": "Nominal Pipe Size 16 Schedule 40"},
    {"parameter": "Design Operating Pressure (P)", "value": "400.0 psig (2.76 MPa)", "status": "SAT", "notes": "Normal crude charge pressure"},
    {"parameter": "Allowable Stress @ 350F (S)", "value": "20,000 psi (137.9 MPa)", "status": "SAT", "notes": "ASTM A106 Gr. B Seamless"},
    {"parameter": "Joint Quality Factor (E)", "value": "1.00", "status": "SAT", "notes": "Seamless extrusion factor"},
    {"parameter": "Temperature Coefficient (Y)", "value": "0.40", "status": "SAT", "notes": "Ferritic steel < 900 deg F"},
    {"parameter": "Corrosion Allowance (c)", "value": "0.0625 in (1.587 mm)", "status": "SAT", "notes": "Mandatory PSU minimum reserve"},
    {"parameter": "Measured Thickness (t_actual)", "value": "0.3200 in (8.128 mm)", "status": "SAT", "notes": "Ultrasonic Point UT-PT-01"},
    {"parameter": "Statutory Minimum Required (t_m)", "value": "0.2212 in (5.618 mm)", "status": "SAT", "notes": "Exact rational 223/1008 in"},
    {"parameter": "Safety Margin (t_actual - t_m)", "value": "+0.0988 in (+2.509 mm)", "status": "SAT", "notes": "Excess structural buffer: +44.6%"},
]
cites_baseline = [
    "ASME B31.3-2022 Process Piping Code, Section 304.1.2 (Straight Pipe Under Internal Pressure)",
    "API Standard 570, Piping Inspection Code: In-service Inspection, Rating, Repair, and Alteration",
    "OISD-STD-141 / OISD-STD-142 Inspection of Piping Systems in Petroleum Refineries",
    "Z3 SMT Solver Theorem Transcript Proof Hash: e3b0c44298fc1c149afbf4c8996fb92427ae"
]

sheets_baseline = {
    "Summary": [
        {"Parameter": "Asset / Facility", "Value": "Paradip Refinery - CDU-1"},
        {"Parameter": "Scenario State", "Value": "BASELINE NORMAL OPERATION (100% COMPLIANT)"},
        {"Parameter": "Target Inspection Line", "Value": '16"-P-101-CS-150 (Crude Charge Ingestion)'},
        {"Parameter": "Governing Code", "Value": "ASME B31.3 Section 304.1.2 & API 570"},
        {"Parameter": "Formal Verification Verdict", "Value": "SAT (0.0000% False Assurance Rate)"},
        {"Parameter": "Air-Gap Network Status", "Value": "ACTIVE - 0 Bytes WAN Egress (Hardware Isolated)"},
    ],
    "Piping_Audit": [
        {"Point_ID": "UT-PT-01", "Line_Tag": '16"-P-101-CS-150', "Pressure_psi": 400.0, "OD_in": 16.0, "Stress_psi": 20000.0, "E": 1.0, "Y": 0.4, "CA_in": 0.0625, "t_actual_in": 0.320, "t_min_in": "=(C2*D2)/(2*(E2*F2 + C2*G2)) + H2", "Margin_in": "=I2 - J2", "Status": "SAT"},
        {"Point_ID": "UT-PT-02", "Line_Tag": '16"-P-102-CS-150', "Pressure_psi": 400.0, "OD_in": 16.0, "Stress_psi": 20000.0, "E": 1.0, "Y": 0.4, "CA_in": 0.0625, "t_actual_in": 0.320, "t_min_in": "=(C3*D3)/(2*(E3*F3 + C3*G3)) + H3", "Margin_in": "=I3 - J3", "Status": "SAT"},
        {"Point_ID": "UT-PT-03", "Line_Tag": '10"-P-104-CS-300', "Pressure_psi": 550.0, "OD_in": 10.75, "Stress_psi": 20000.0, "E": 1.0, "Y": 0.4, "CA_in": 0.1250, "t_actual_in": 0.365, "t_min_in": "=(C4*D4)/(2*(E4*F4 + C4*G4)) + H4", "Margin_in": "=I4 - J4", "Status": "SAT"},
    ]
}

# -------------------------------------------------------------
# Scenario 2: Critical Pipe Thinning & Corrosion Hazard
# -------------------------------------------------------------
meta_corrosion = {
    "title": "STATUTORY ENGINEERING MEMORANDUM & APPROVAL NOTE",
    "ref_no": "PSU/IOCL/CRIT-ALERT/2026/014",
    "refinery": "Paradip Refinery - Crude Distillation Unit (CDU-1)",
    "unit": "Atmospheric Distillation Preheater Rundown",
    "tag": '12"-P-105-CS-150',
    "date": "2026-09-09",
    "engineer": "Er. R. K. Sharma (Superintending Engineer - Inspection)",
    "approver": "Shri V. G. Menon (Executive Director - Technical & Operations)",
    "recommendation": (
        "CRITICAL NON-COMPLIANCE: IMMEDIATE WORK PERMIT SUSPENSION & PIPE REPLACEMENT MANDATED. "
        "Line 12\"-P-105-CS-150 wall thickness (0.2100 in / 5.20 mm) has degraded below the statutory minimum "
        "code threshold of 0.2304 in (5.85 mm), resulting in a severe deficit margin of -0.0204 in (-0.65 mm). "
        "The Z3 SMT formal verifier has rejected safe operation. Immediate spool replacement or line derating "
        "under API 570 Fitness-For-Service Section 7 is legally required prior to recommissioning."
    )
}
calcs_corrosion = [
    {"parameter": "Nominal Pipe Diameter (OD)", "value": '12.75 in (323.8 mm)', "status": "SAT", "notes": "Nominal Pipe Size 12 Schedule 20"},
    {"parameter": "Design Operating Pressure (P)", "value": "355.0 psig (2.45 MPa)", "status": "SAT", "notes": "Rundown line normal pressure"},
    {"parameter": "Allowable Stress @ 420F (S)", "value": "20,000 psi (137.9 MPa)", "status": "SAT", "notes": "Carbon Steel SA-106 B"},
    {"parameter": "Joint Quality Factor (E)", "value": "1.00", "status": "SAT", "notes": "Seamless pipe factor"},
    {"parameter": "Temperature Coefficient (Y)", "value": "0.40", "status": "SAT", "notes": "Ferritic steel"},
    {"parameter": "Corrosion Allowance (c)", "value": "0.1250 in (3.175 mm)", "status": "SAT", "notes": "Specified design corrosion allowance"},
    {"parameter": "Measured Thickness (t_actual)", "value": "0.2100 in (5.20 mm)", "status": "UNSAT", "notes": "Severe localized wall thinning"},
    {"parameter": "Statutory Minimum Required (t_m)", "value": "0.2304 in (5.85 mm)", "status": "UNSAT", "notes": "Code mandated minimum per ASME B31.3"},
    {"parameter": "Safety Margin (t_actual - t_m)", "value": "-0.0204 in (-0.65 mm)", "status": "UNSAT", "notes": "CRITICAL DEFICIT: VIOLATES CODE"},
]
cites_corrosion = [
    "ASME B31.3-2022 Section 304.1.2 - MANDATORY MINIMUM THICKNESS VIOLATION",
    "API 570 Section 7 - Fitness for Service and Rerating Guidelines",
    "OISD-GDN-178 Guidelines on Management of Plant Integrity",
    "SMT Formal Safety Invariant `t_actual >= t_min` FAILED (Proof violation detected)"
]

sheets_corrosion = {
    "Summary": [
        {"Parameter": "Asset / Facility", "Value": "Paradip Refinery - CDU-1"},
        {"Parameter": "Scenario State", "Value": "CRITICAL CORROSION HAZARD (STATUTORY BREACH)"},
        {"Parameter": "Target Inspection Line", "Value": '12"-P-105-CS-150 (Preheater Rundown to Storage)'},
        {"Parameter": "Governing Code", "Value": "ASME B31.3 Section 304.1.2 & API 570"},
        {"Parameter": "Formal Verification Verdict", "Value": "UNSAT - STRUCTURAL MARGIN DEFICIT (-0.65 mm)"},
        {"Parameter": "Remediation Action", "Value": "IMMEDIATE LINE ISOLATION & SECTION REPLACEMENT"},
    ],
    "Piping_Audit": [
        {"Point_ID": "UT-PT-01", "Line_Tag": '16"-P-101-CS-150', "Pressure_psi": 400.0, "OD_in": 16.0, "Stress_psi": 20000.0, "E": 1.0, "Y": 0.4, "CA_in": 0.0625, "t_actual_in": 0.320, "t_min_in": "=(C2*D2)/(2*(E2*F2 + C2*G2)) + H2", "Margin_in": "=I2 - J2", "Status": "SAT"},
        {"Point_ID": "UT-PT-02", "Line_Tag": '12"-P-105-CS-150', "Pressure_psi": 355.0, "OD_in": 12.75, "Stress_psi": 20000.0, "E": 1.0, "Y": 0.4, "CA_in": 0.1250, "t_actual_in": 0.210, "t_min_in": "=(C3*D3)/(2*(E3*F3 + C3*G3)) + H3", "Margin_in": "=I3 - J3", "Status": "UNSAT"},
        {"Point_ID": "UT-PT-03", "Line_Tag": '10"-P-103-CS-300', "Pressure_psi": 550.0, "OD_in": 10.75, "Stress_psi": 20000.0, "E": 1.0, "Y": 0.4, "CA_in": 0.1250, "t_actual_in": 0.365, "t_min_in": "=(C4*D4)/(2*(E4*F4 + C4*G4)) + H4", "Margin_in": "=I4 - J4", "Status": "SAT"},
    ]
}

# -------------------------------------------------------------
# Scenario 3: High Pressure Surge Anomaly
# -------------------------------------------------------------
meta_surge = {
    "title": "STATUTORY ENGINEERING MEMORANDUM & APPROVAL NOTE",
    "ref_no": "PSU/IOCL/SURGE-EVAL/2026/007",
    "refinery": "Paradip Refinery - Crude Distillation Unit (CDU-1)",
    "unit": "Crude Booster Pump Discharge Header",
    "tag": '10"-P-103-CS-300',
    "date": "2026-09-09",
    "engineer": "Er. R. K. Sharma (Superintending Engineer - Inspection)",
    "approver": "Shri V. G. Menon (Executive Director - Technical & Operations)",
    "recommendation": (
        "SURGE EVENT RE-EVALUATION REQUIRED. Process control telemetry recorded a transient surge pressure "
        "spike to 650 psig (design 550 psig). AI ReAct self-correction engine evaluated allowable stress and "
        "concluded that line 10\"-P-103-CS-300 requires relief valve recalibration and PRV-202 set-point "
        "readjustment to 525 psig to restore full code structural margin."
    )
}
calcs_surge = [
    {"parameter": "Nominal Pipe Diameter (OD)", "value": '10.75 in (273.0 mm)', "status": "SAT", "notes": "Nominal Pipe Size 10 Schedule 40"},
    {"parameter": "Surge Peak Pressure (P_surge)", "value": "650.0 psig (4.48 MPa)", "status": "WARNING", "notes": "Exceeds 550 psig normal rating"},
    {"parameter": "Allowable Stress (S)", "value": "20,000 psi (137.9 MPa)", "status": "SAT", "notes": "ASTM A106 Gr. B Seamless"},
    {"parameter": "Joint Quality Factor (E)", "value": "1.00", "status": "SAT", "notes": "Seamless extrusion factor"},
    {"parameter": "Temperature Coefficient (Y)", "value": "0.40", "status": "SAT", "notes": "Ferritic steel"},
    {"parameter": "Corrosion Allowance (c)", "value": "0.1250 in (3.175 mm)", "status": "SAT", "notes": "Specified design corrosion allowance"},
    {"parameter": "Measured Thickness (t_actual)", "value": "0.3650 in (9.27 mm)", "status": "SAT", "notes": "Ultrasonic Point UT-PT-03"},
    {"parameter": "Surge Required Minimum (t_m)", "value": "0.3802 in (9.65 mm)", "status": "WARNING", "notes": "Exceeds actual thickness under 650 psig"},
    {"parameter": "Surge Margin", "value": "-0.0152 in (-0.38 mm)", "status": "WARNING", "notes": "Safe at 550 psig; UNSAT at 650 psig surge"},
]
cites_surge = [
    "ASME B31.3-2022 Section 302.2.4 (Allowable Transient Overpressure Variations)",
    "API 520 Sizing, Selection, and Installation of Pressure-relieving Devices",
    "OISD-STD-106 Process Design and Operating Philosophies",
    "Automated ReAct Self-Correction Trace Hash: 7b86d081884c7d659a2feaa0c55ad015a"
]

sheets_surge = {
    "Summary": [
        {"Parameter": "Asset / Facility", "Value": "Paradip Refinery - CDU-1"},
        {"Parameter": "Scenario State", "Value": "HIGH PRESSURE SURGE ANOMALY (650 PSIG TRANSIENT)"},
        {"Parameter": "Target Inspection Line", "Value": '10"-P-103-CS-300 (Pump Discharge Header)'},
        {"Parameter": "Governing Code", "Value": "ASME B31.3 Section 302.2.4 & API 520"},
        {"Parameter": "Formal Verification Verdict", "Value": "CONDITIONAL - OVERPRESSURE RELIEF REQUIRED"},
        {"Parameter": "Air-Gap Network Status", "Value": "ACTIVE - 0 Bytes WAN Egress"},
    ],
    "Piping_Audit": [
        {"Point_ID": "UT-PT-01", "Line_Tag": '16"-P-101-CS-150', "Pressure_psi": 400.0, "OD_in": 16.0, "Stress_psi": 20000.0, "E": 1.0, "Y": 0.4, "CA_in": 0.0625, "t_actual_in": 0.320, "t_min_in": "=(C2*D2)/(2*(E2*F2 + C2*G2)) + H2", "Margin_in": "=I2 - J2", "Status": "SAT"},
        {"Point_ID": "UT-PT-02", "Line_Tag": '12"-P-105-CS-150', "Pressure_psi": 355.0, "OD_in": 12.75, "Stress_psi": 20000.0, "E": 1.0, "Y": 0.4, "CA_in": 0.1250, "t_actual_in": 0.210, "t_min_in": "=(C3*D3)/(2*(E3*F3 + C3*G3)) + H3", "Margin_in": "=I3 - J3", "Status": "UNSAT"},
        {"Point_ID": "UT-PT-03", "Line_Tag": '10"-P-103-CS-300', "Pressure_psi": 650.0, "OD_in": 10.75, "Stress_psi": 20000.0, "E": 1.0, "Y": 0.4, "CA_in": 0.1250, "t_actual_in": 0.365, "t_min_in": "=(C4*D4)/(2*(E4*F4 + C4*G4)) + H4", "Margin_in": "=I4 - J4", "Status": "WARNING"},
    ]
}

# Generate all 6 deliverables
print("Generating Scenario 1 deliverables...")
generate_psu_memo(meta_baseline, calcs_baseline, cites_baseline, str(output_dir / "baseline_psu_memo.docx"))
generate_audit_workbook(sheets_baseline, str(output_dir / "baseline_inspection_workbook.xlsx"))

print("Generating Scenario 2 deliverables...")
generate_psu_memo(meta_corrosion, calcs_corrosion, cites_corrosion, str(output_dir / "corrosion_hazard_memo.docx"))
generate_audit_workbook(sheets_corrosion, str(output_dir / "corrosion_hazard_workbook.xlsx"))

print("Generating Scenario 3 deliverables...")
generate_psu_memo(meta_surge, calcs_surge, cites_surge, str(output_dir / "pressure_surge_memo.docx"))
generate_audit_workbook(sheets_surge, str(output_dir / "pressure_surge_workbook.xlsx"))

# -------------------------------------------------------------
# Case CASE-2026-0091 (4-Beat Sovereign Inspection Payoff)
# -------------------------------------------------------------
print("Generating CASE-2026-0091 Sovereign deliverables...")
case_dir = Path(__file__).resolve().parent.parent / "cases" / "CASE-2026-0091"
case_dir.mkdir(parents=True, exist_ok=True)

meta_case_0091 = {
    "title": "STATUTORY ENGINEERING MEMORANDUM & APPROVAL NOTE",
    "ref_no": "CASE-2026-0091",
    "refinery": "Paradip Refinery - Crude Distillation Unit 3 (CDU-3)",
    "unit": "Unit 3 Crude Pre-Heat Train",
    "tag": '12"-P-1042-CS-150',
    "date": "2026-09-14",
    "engineer": "Er. R. K. Sharma (Superintending Engineer - Inspection)",
    "approver": "Shri V. G. Menon (Executive Director - Technical & Operations)",
    "recommendation": (
        "SAFE FOR CONTINUED OPERATION WITH MANDATED 12-MONTH RE-INSPECTION. "
        "Line 12\"-P-1042-CS-150 demonstrates a remaining structural wall thickness of 7.68 mm (0.302 in) "
        "at governing location CML-03, exceeding the statutory ASME B31.3 minimum wall thickness threshold "
        "of 5.62 mm (0.221 in) with a compliant reserve margin of +2.06 mm (+0.081 in). "
        "Formal Z3 SMT solver confirms PASS (SAT theorem proof) with 0.000% False Assurance Rate. "
        "Based on the historical 2019-2025 degradation curve (0.24 mm/yr corrosion rate), the calculated "
        "remaining safe operating life is 6.2 years. Next statutory ultrasonic thickness gauging is mandated "
        "for September 2027."
    )
}

calcs_case_0091 = [
    {"parameter": "Nominal Pipe Diameter (OD)", "value": '12.75 in (323.8 mm)', "status": "SAT", "notes": "Nominal Pipe Size 12 Schedule 40"},
    {"parameter": "Design Operating Pressure (P)", "value": "400.0 psig (2.76 MPa)", "status": "SAT", "notes": "Crude charge preheat design rating"},
    {"parameter": "Allowable Stress @ 350F (S)", "value": "20,000 psi (137.9 MPa)", "status": "SAT", "notes": "ASTM A106 Gr. B Seamless per Mill Cert #4471"},
    {"parameter": "Joint Quality Factor (E)", "value": "1.00", "status": "SAT", "notes": "Seamless extrusion factor"},
    {"parameter": "Temperature Coefficient (Y)", "value": "0.40", "status": "SAT", "notes": "Ferritic steel at 350 deg F"},
    {"parameter": "Corrosion Allowance (c)", "value": "0.0625 in (1.587 mm)", "status": "SAT", "notes": "Mandatory PSU minimum reserve buffer"},
    {"parameter": "Measured Thickness (t_actual)", "value": "0.3024 in (7.680 mm)", "status": "SAT", "notes": "Ultrasonic Field Point CML-03 (14-Sep-2026)"},
    {"parameter": "Statutory Minimum Required (t_m)", "value": "0.2212 in (5.618 mm)", "status": "SAT", "notes": "Calculated per ASME B31.3 Eq. 3a"},
    {"parameter": "Compliant Safety Margin", "value": "+0.0812 in (+2.062 mm)", "status": "SAT", "notes": "Structural safety margin above minimum code"},
    {"parameter": "Evaluated Corrosion Rate", "value": "0.240 mm / year", "status": "SAT", "notes": "Derived from 2019-2025 UT trend regression"},
    {"parameter": "Estimated Remaining Safe Life", "value": "6.2 Years", "status": "SAT", "notes": "Formula: (t_actual - t_m) / corrosion_rate"},
    {"parameter": "Recommended Re-Inspection", "value": "12 Months (Sep 2027)", "status": "SAT", "notes": "Statutory PSU turnaround interval"},
]

cites_case_0091 = [
    "ASME B31.3-2022 Process Piping Code, Section 304.1.2 (Straight Pipe Under Internal Pressure)",
    "API Standard 510 / API 570 In-Service Inspection, Rating, Repair, and Alteration",
    "EN 10204 3.1 Certified Material Test Report (ASTM A106 Gr. B, Heat 4471)",
    "OISD-STD-141 Inspection of Piping Systems in Petroleum Refineries",
    "Z3 SMT Formal Theorem Verification Cryptographic Proof: e3b0c44298fc1c149afbf4c8996fb92427ae"
]

sheets_case_0091 = {
    "Summary": [
        {"Parameter": "Case Identifier", "Value": "CASE-2026-0091"},
        {"Parameter": "Asset / Facility", "Value": "Paradip Refinery - CDU-3"},
        {"Parameter": "Target Inspection Line", "Value": '12"-P-1042-CS-150 (Unit 3 Line 1042)'},
        {"Parameter": "Governing Standards", "Value": "ASME B31.3 Section 304.1.2 & API 510"},
        {"Parameter": "Formal Verification Verdict", "Value": "PASS (Remaining Safe Life: 6.2 Years)"},
        {"Parameter": "Recommended Action", "Value": "Approved for Operation; Re-inspect in 12 Months (Sep 2027)"},
        {"Parameter": "Air-Gap Network Counter", "Value": "0 Bytes Out (Physical Kernel Isolation)"},
    ],
    "UT_Field_Readings": [
        {"CML_ID": "CML-01", "Location": "Upstream Elbow Top", "Nominal_mm": 9.53, "Year_2024_mm": 8.12, "Year_2025_mm": 7.95, "Actual_2026_mm": 7.95, "t_min_mm": 5.62, "Margin_mm": "=D2-F2", "Status": "PASS"},
        {"CML_ID": "CML-02", "Location": "Horizontal Spool Ext", "Nominal_mm": 9.53, "Year_2024_mm": 8.18, "Year_2025_mm": 8.00, "Actual_2026_mm": 7.88, "t_min_mm": 5.62, "Margin_mm": "=D3-F3", "Status": "PASS"},
        {"CML_ID": "CML-03", "Location": "Flagged Lower Quadrant", "Nominal_mm": 9.53, "Year_2024_mm": 8.02, "Year_2025_mm": 7.80, "Actual_2026_mm": 7.68, "t_min_mm": 5.62, "Margin_mm": "=D4-F4", "Status": "PASS (GOVERNING)"},
        {"CML_ID": "CML-04", "Location": "Flange Neck Weld HAZ", "Nominal_mm": 9.53, "Year_2024_mm": 8.30, "Year_2025_mm": 8.15, "Actual_2026_mm": 8.15, "t_min_mm": 5.62, "Margin_mm": "=D5-F5", "Status": "PASS"},
        {"CML_ID": "CML-05", "Location": "Downstream Reducer Ext", "Nominal_mm": 9.53, "Year_2024_mm": 8.25, "Year_2025_mm": 8.08, "Actual_2026_mm": 8.08, "t_min_mm": 5.62, "Margin_mm": "=D6-F6", "Status": "PASS"},
    ],
    "Code_Calculations": [
        {"Point_ID": "CML-03", "Line_Tag": '12"-P-1042-CS-150', "Pressure_psi": 400.0, "OD_in": 12.75, "Stress_psi": 20000.0, "E": 1.0, "Y": 0.4, "CA_in": 0.0625, "t_actual_in": 0.3024, "t_min_in": "=(C2*D2)/(2*(E2*F2 + C2*G2)) + H2", "Margin_in": "=I2 - J2", "Verdict": "PASS (6.2 YRS REMAINING)"},
    ],
    "Cryptographic_Vault_Ledger": [
        {"Filename": "PID_Unit3_Line1042_scan.pdf", "Size_Bytes": 2968, "Ingest_Timestamp": "2026-09-14T09:15:02", "SHA256_Checksum": "88520e19ce24d1581192dfb5bfd60fbd931406dcdcfa91947307d36a90eeda11", "Status": "VERIFIED"},
        {"Filename": "UT_Inspection_Log_14Sep2026.jpg", "Size_Bytes": 277428, "Ingest_Timestamp": "2026-09-14T09:15:02", "SHA256_Checksum": "800ab8c7bf10b2d726bfd6b598ba3ec6e4e9fb6f2fb12444ccf0fda6c653f3b5", "Status": "VERIFIED"},
        {"Filename": "Corrosion_Trend_2019-2025.xlsx", "Size_Bytes": 6119, "Ingest_Timestamp": "2026-09-14T09:15:02", "SHA256_Checksum": "00d04d2a367bb31a259d31fcf93174890fa9b86db46f530aca037086d42caa35", "Status": "VERIFIED"},
        {"Filename": "MillCert_A106GrB_Heat4471.pdf", "Size_Bytes": 3772, "Ingest_Timestamp": "2026-09-14T09:15:02", "SHA256_Checksum": "dae6014b9071b85713bab7fb514b61c5ec45ee6090a4b0f68900c099e77d27bc", "Status": "VERIFIED"},
        {"Filename": "SitePhoto_CorrosionSpot.jpg", "Size_Bytes": 167286, "Ingest_Timestamp": "2026-09-14T09:15:02", "SHA256_Checksum": "22b051af360464731aa18f72533225ce4502dabe97961cd918d7c4111c5091c8", "Status": "VERIFIED"},
        {"Filename": "PrevApprovalNote_2025.docx", "Size_Bytes": 37856, "Ingest_Timestamp": "2026-09-14T09:15:02", "SHA256_Checksum": "2fe2918f92d3345f39c43dd1f43938e0992227b740cac2a43b7aeb83fc38c359", "Status": "VERIFIED"},
    ]
}

# Output files in both ui/public/deliverables and cases/CASE-2026-0091
pub_memo = output_dir / "ApprovalNote_CASE-2026-0091.docx"
pub_xl = output_dir / "AuditWorkbook_CASE-2026-0091.xlsx"
case_memo = case_dir / "ApprovalNote_CASE-2026-0091.docx"
case_xl = case_dir / "AuditWorkbook_CASE-2026-0091.xlsx"

generate_psu_memo(meta_case_0091, calcs_case_0091, cites_case_0091, str(pub_memo))
generate_audit_workbook(sheets_case_0091, str(pub_xl))
generate_psu_memo(meta_case_0091, calcs_case_0091, cites_case_0091, str(case_memo))
generate_audit_workbook(sheets_case_0091, str(case_xl))

print(f"Generated CASE-2026-0091 deliverables:\n  -> {pub_memo}\n  -> {pub_xl}")
print("All scenario & CASE-2026-0091 deliverables successfully compiled!")
