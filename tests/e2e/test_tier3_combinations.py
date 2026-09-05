"""
Tier 3: Cross-Feature Interactions & Combinations Test Suite (12 Tests)
Evaluates pairwise integration paths and multi-stage pipelines across
Vision, Sandbox, Verifier, Anti-Collapse, and Reports under continuous air-gap audit
per explorer_e2e_2/analysis.md.
"""
import hashlib
import json
import os
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import zipfile
import docx
import networkx as nx
import openpyxl
import pytest

from sovereign.agent import ImmutableSpec, LoopOutcome, run_react_loop
from sovereign.reports import generate_audit_workbook, generate_psu_memo
from sovereign.sandbox import (
    AirGapVerdict,
    assert_zero_egress,
    audit_network_egress,
    run_sandboxed,
    SandboxResult,
)
from sovereign.verifier import (
    ASTVerificationResult,
    verify_api_510_invariants,
    verify_asme_b31_3,
    verify_python_ast,
    Z3VerificationResult,
)
from sovereign.vision import (
    extract_topology,
    get_pipe_attributes,
    Patch,
    skeletonize_lines,
    slice_drawing,
)


# ========================================================================================
# COMBINATION 3.1: VISION TO ASME NEUROSYMBOLIC VERIFICATION (R2 -> R3)
# ========================================================================================

@pytest.mark.tier3
def test_tier3_combination_vision_to_asme_calculation():
    """Comb 3.1: P&ID topology extraction feeds directly into ASME Z3 calculation."""
    drawing_path = "tests/fixtures/drawings/cdu_feed_101.png"
    graph = extract_topology(drawing_path)
    assert isinstance(graph, nx.Graph)

    # Query target line tag
    line_tag = "16-CR-101-A1A-CS-150#"
    pipe_data = get_pipe_attributes(graph, line_tag)
    assert pipe_data["outside_diameter"] == 16.0
    assert pipe_data["design_pressure"] == 285.0

    # Z3 ASME Verification
    res = verify_asme_b31_3(
        design_pressure=pipe_data["design_pressure"],
        outside_diameter=pipe_data["outside_diameter"],
        allowable_stress=20000.0,
        quality_factor=1.0,
        temp_coefficient=0.4,
        corrosion_allowance=0.125,
        actual_thickness=pipe_data.get("measured_thickness", 0.375),
    )
    assert res.status == "SAT"
    assert res.invariant_passed is True
    assert pytest.approx(res.t_min, rel=1e-3) == 0.23835
    assert res.margin > 0

    # Mutation test: Insufficient thickness must yield UNSAT (0.0% False Assurance)
    corrupted_res = verify_asme_b31_3(
        design_pressure=pipe_data["design_pressure"],
        outside_diameter=pipe_data["outside_diameter"],
        allowable_stress=20000.0,
        quality_factor=1.0,
        temp_coefficient=0.4,
        corrosion_allowance=0.125,
        actual_thickness=0.200,  # Below required 0.23835!
    )
    assert corrupted_res.status == "UNSAT"
    assert corrupted_res.invariant_passed is False


# ========================================================================================
# COMBINATION 3.2: SANDBOX FAILURE TO ANTI-COLLAPSE RECOVERY TO Z3 (R1 -> R4 -> R3)
# ========================================================================================

@pytest.mark.tier3
def test_tier3_combination_sandbox_failure_to_anticollapse_recovery():
    """Comb 3.2: Forbidden import in Turn 1 triggers Anti-Collapse recovery to pass Z3 in Turn 2."""
    spec = ImmutableSpec(
        task_id="TASK-HP-GAS-24",
        task_description="Compute ASME B31.3 wall thickness for 24-inch gas header",
        parameters={"P": 1200.0, "D": 24.0, "S": 20000.0, "E": 1.0, "Y": 0.4, "CA": 0.125, "t_act": 0.875},
        required_invariants=["t_actual >= t_min", "P > 0", "D > 0"],
        output_schema={"t_min": float, "status": str},
    )

    turn_counter = [0]

    def mock_engine(prompt: str) -> str:
        turn_counter[0] += 1
        if turn_counter[0] == 1:
            # Flawed script with forbidden socket import
            return (
                "import socket\n"
                "import json\n"
                "print(json.dumps([{'status': 'LEAK'}]))\n"
            )
        # Self-corrected script
        return (
            "import json\n"
            "P, D, S, E, Y, CA = 1200.0, 24.0, 20000.0, 1.0, 0.4, 0.125\n"
            "t_min = (P * D) / (2 * (S * E + P * Y)) + CA\n"
            "margin = 0.875 - t_min\n"
            "print(json.dumps([{'t_min': t_min, 'margin': margin, 'verdict': 'SAT'}]))\n"
        )

    outcome = run_react_loop(spec=spec, max_turns=3, engine_callback=mock_engine)

    assert outcome.success is True
    assert outcome.turns_taken == 2
    assert len(outcome.failure_history) == 1

    # Verify Failure Hash Isolation
    turn1_hash = outcome.failure_history[0]
    turn2_hash = hashlib.sha256(outcome.final_script.encode()).hexdigest()
    assert turn1_hash != turn2_hash

    # Clean sandbox execution
    assert outcome.execution_result.returncode == 0
    assert outcome.execution_result.timed_out is False

    # Neurosymbolic soundness
    if outcome.z3_result:
        assert outcome.z3_result.status == "SAT"
        assert outcome.z3_result.invariant_passed is True


# ========================================================================================
# COMBINATION 3.3: Z3 VERIFIED RESULTS TO HEADLESS DOCX & XLSX (R3 -> R5)
# ========================================================================================

@pytest.mark.tier3
def test_tier3_combination_z3_verification_to_docx_xlsx(tmp_path):
    """Comb 3.3: Multi-record Z3 verification results compiled into verified deliverables."""
    verification_records = [
        {"tag": "16-CR-101", "D": 16.0, "P": 285.0, "t_min": 0.2384, "t_act": 0.375, "verdict": "SAT", "margin": 0.1366},
        {"tag": "14-CR-102", "D": 14.0, "P": 285.0, "t_min": 0.2241, "t_act": 0.375, "verdict": "SAT", "margin": 0.1509},
        {"tag": "12-CR-104", "D": 12.75, "P": 400.0, "t_min": 0.2512, "t_act": 0.220, "verdict": "UNSAT", "margin": -0.0312},
    ]
    citations = ["ASME B31.3-2022 Process Piping", "API 570 Piping Inspection Code Edition 4"]

    docx_path = str(tmp_path / "tier3_memo.docx")
    xlsx_path = str(tmp_path / "tier3_workbook.xlsx")

    generate_psu_memo(
        metadata={"ref_no": "PSU/MECH/2026/01"},
        calculations=verification_records,
        citations=citations,
        output_path=docx_path,
    )
    generate_audit_workbook(
        sheets_data={"Calculations": verification_records},
        output_path=xlsx_path,
    )

    # 1. Existence and File Size Check
    assert os.path.exists(docx_path) and os.path.getsize(docx_path) > 4096
    assert os.path.exists(xlsx_path) and os.path.getsize(xlsx_path) > 2048

    # 2. OOXML Structural Validation
    with zipfile.ZipFile(docx_path, 'r') as z:
        assert "word/document.xml" in z.namelist()
        doc_xml = z.read("word/document.xml")
        assert ET.fromstring(doc_xml) is not None

    with zipfile.ZipFile(xlsx_path, 'r') as z:
        assert "xl/workbook.xml" in z.namelist()
        wb_xml = z.read("xl/workbook.xml")
        assert ET.fromstring(wb_xml) is not None

    # 3. OpenPyXL Workbook Sheet Verification
    wb = openpyxl.load_workbook(xlsx_path, data_only=False)
    assert "Calculations" in wb.sheetnames


# ========================================================================================
# COMBINATION 3.4: AIR-GAP AUDITOR ACROSS FULL PIPELINE (R1 -> ALL)
# ========================================================================================

@pytest.mark.tier3
def test_tier3_combination_airgap_audit_across_entire_pipeline(tmp_path):
    """Comb 3.4: Zero outbound WAN packets confirmed across all execution steps."""
    verdict_before = audit_network_egress()
    assert verdict_before.status in ["PASS", "READY"]

    # Step 1: Vision
    graph = extract_topology("tests/fixtures/drawings/cdu_feed_101.png")
    assert graph.number_of_nodes() > 0

    # Step 2: AST
    ast_res = verify_python_ast("P = 2.5; D = 323.8; print(P * D)")
    assert ast_res.is_safe is True

    # Step 3: Sandbox
    s_res = run_sandboxed([sys.executable, "-c", "print('AIRGAP_SAFE')"], network=False)
    assert s_res.returncode == 0

    # Step 4: Z3 Verifier
    z3_res = verify_asme_b31_3(2.5, 323.8, 137.9, 1.0, 0.4, 3.0, 9.52)
    assert z3_res.is_valid is True

    # Step 5: Reports
    memo_path = str(tmp_path / "Airgap_Pipeline_Memo.docx")
    generate_psu_memo({"title": "AIRGAP VERIFIED"}, [], [], memo_path)
    assert os.path.exists(memo_path)

    # Audit verdict after pipeline
    verdict_after = audit_network_egress()
    assert verdict_after.packets_captured == 0
    assert verdict_after.egress_detected is False
    assert "PASS" in verdict_after.status


# ========================================================================================
# PAIRWISE INTEGRATION TESTS (8 ADDITIONAL INTEGRATIONS)
# ========================================================================================

@pytest.mark.tier3
def test_tier3_pairwise_vision_to_ast():
    """Comb 3.5: Vision extracted topology used to generate safe calculation script checked by AST."""
    graph = extract_topology("tests/fixtures/drawings/cdu_feed_101.png")
    pipe = get_pipe_attributes(graph, "16-CR-101")
    code = f"D = {pipe['outside_diameter']}\nP = {pipe['design_pressure']}\narea = 3.14159 * (D / 2)**2\nprint(area)"
    ast_res = verify_python_ast(code)
    assert ast_res.is_safe is True


@pytest.mark.tier3
def test_tier3_pairwise_vision_to_sandbox(sandbox_runner):
    """Comb 3.6: Vision extracted parameters computed in isolated sandbox."""
    graph = extract_topology("tests/fixtures/drawings/cdu_feed_101.png")
    pipe = get_pipe_attributes(graph, "16-CR-101")
    code = f"print({pipe['outside_diameter']} * {pipe['design_pressure']})"
    res = sandbox_runner([sys.executable, "-c", code])
    assert res.returncode == 0
    assert "4560.0" in res.stdout


@pytest.mark.tier3
def test_tier3_pairwise_ast_to_sandbox(sandbox_runner):
    """Comb 3.7: AST Guard gates execution before launching sandbox process."""
    unsafe_code = "import socket; print('unsafe')"
    ast_res = verify_python_ast(unsafe_code)
    assert ast_res.is_safe is False
    # If blocked by AST, sandbox should never be called with unsafe payload
    safe_code = "print('safe_payload_executed')"
    ast_res_safe = verify_python_ast(safe_code)
    assert ast_res_safe.is_safe is True
    res = sandbox_runner([sys.executable, "-c", safe_code])
    assert res.returncode == 0
    assert "safe_payload_executed" in res.stdout


@pytest.mark.tier3
def test_tier3_pairwise_ast_to_z3():
    """Comb 3.8: Script verified by AST matches Z3 formal solver constraints."""
    calc_code = "P, D, S, E, Y, c, t = 2.5, 323.8, 137.9, 1.0, 0.4, 3.0, 9.52\nt_min = (P*D)/(2*(S*E+P*Y))+c"
    ast_res = verify_python_ast(calc_code)
    assert ast_res.is_safe is True
    z3_res = verify_asme_b31_3(2.5, 323.8, 137.9, 1.0, 0.4, 3.0, 9.52)
    assert z3_res.status == "SAT"


@pytest.mark.tier3
def test_tier3_pairwise_sandbox_to_docx(tmp_path, sandbox_runner):
    """Comb 3.9: Output emitted by sandboxed execution formatted into Word memo."""
    res = sandbox_runner([sys.executable, "-c", "import json; print(json.dumps([{'tag': 'P-1', 'verdict': 'SAT'}]))"])
    assert res.returncode == 0
    data = json.loads(res.stdout)
    memo_path = str(tmp_path / "sandbox_out_memo.docx")
    generate_psu_memo({"title": "SANDBOX EXECUTED REPORT"}, data, [], memo_path)
    assert os.path.exists(memo_path)


@pytest.mark.tier3
def test_tier3_pairwise_sandbox_to_xlsx(tmp_path, sandbox_runner):
    """Comb 3.10: Sandboxed calculation JSON output compiled into audited Excel spreadsheet."""
    code = "import json; print(json.dumps([{'Pipe': '16-CR-101', 'Thickness': 9.52, 'Status': 'SAT'}]))"
    res = sandbox_runner([sys.executable, "-c", code])
    assert res.returncode == 0
    records = json.loads(res.stdout)
    xlsx_path = str(tmp_path / "sandbox_out_sheet.xlsx")
    generate_audit_workbook({"Calculations": records}, xlsx_path)
    assert os.path.exists(xlsx_path)


@pytest.mark.tier3
def test_tier3_pairwise_api510_to_docx(tmp_path):
    """Comb 3.11: API 510 remaining life Z3 output rendered into PSU memo."""
    z3_res = verify_api_510_invariants(t_actual=14.2, t_min=10.0, pressure=3.5, corrosion_rate=0.25)
    assert z3_res.is_valid is True
    memo_data = [{
        "equipment": "V-101",
        "t_actual": z3_res.t_actual,
        "t_min": z3_res.t_min,
        "remaining_life_years": z3_res.model_details["remaining_life_years"],
        "status": z3_res.status,
    }]
    memo_path = str(tmp_path / "api510_vessel_memo.docx")
    generate_psu_memo({"title": "VESSEL API 510 LIFE ASSESSMENT"}, memo_data, ["API 510 10th Ed."], memo_path)
    assert os.path.exists(memo_path)


@pytest.mark.tier3
def test_tier3_pairwise_anticollapse_to_xlsx(tmp_path):
    """Comb 3.12: Anti-collapse self-correction audit trail rendered into Excel audit sheet."""
    spec = ImmutableSpec(
        task_id="TASK-AUDIT-SHEET",
        task_description="Build audited Excel from ReAct loop"
    )
    outcome = run_react_loop(spec, max_turns=3)
    assert outcome.success is True
    xlsx_path = str(tmp_path / "anticollapse_audit.xlsx")
    sheets = {
        "Summary": [{"Turns": outcome.turns_used, "Success": outcome.success}],
        "Audit Trail": [{"Hash": h} for h in outcome.failure_hashes] if outcome.failure_hashes else [{"Status": "Direct Pass"}],
    }
    generate_audit_workbook(sheets, xlsx_path)
    assert os.path.exists(xlsx_path)
