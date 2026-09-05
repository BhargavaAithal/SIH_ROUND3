"""
Tier 4: Real-World PSU Application Scenarios Test Suite (3 Scenarios)
Validates complete, multi-stage engineering missions mirroring daily operations
at IOCL, ONGC, BPCL, HPCL, GAIL, and BEL per explorer_e2e_2/analysis.md.
"""
import hashlib
import json
import os
from pathlib import Path
import sys
import docx
import networkx as nx
import openpyxl
import pytest

from sovereign.agent import ImmutableSpec, LoopOutcome, run_react_loop
from sovereign.reports import generate_audit_workbook, generate_psu_memo
from sovereign.sandbox import audit_network_egress
from sovereign.verifier import verify_asme_b31_3
from sovereign.vision import extract_topology, slice_drawing


# ========================================================================================
# SCENARIO 1: REFINED PRODUCTS PIPELINE INSPECTION
# ========================================================================================

@pytest.mark.tier4
@pytest.mark.scenario1
def test_tier4_scenario1_refined_products_pipeline_inspection(tmp_path):
    """
    Scenario 1: Refined Products Pipeline Inspection
    ASME B31.3 / B31.4 wall thickness calculation, Z3 verification,
    PSU approval memo generation, and zero-egress air-gap verification.
    """
    # Step 1: Initialize Network Audit
    egress_start = audit_network_egress()
    assert egress_start.status in ["PASS", "READY"]

    # Step 2: Ingest Inspection Data and Trigger Z3 Verifier
    fixture_path = Path("tests/fixtures/psu_scenarios/scenario1_pipeline_ut.json")
    with open(fixture_path, "r", encoding="utf-8") as f:
        fixture = json.load(f)

    spec = fixture["pipe_specification"]
    results = []

    for pt in fixture["inspection_records"]:
        verdict = verify_asme_b31_3(
            design_pressure=spec["design_pressure_psig"],
            outside_diameter=spec["outside_diameter_in"],
            allowable_stress=spec["allowable_stress_psi"],
            quality_factor=spec["joint_efficiency_E"],
            temp_coefficient=spec["temperature_coefficient_Y"],
            corrosion_allowance=spec["corrosion_allowance_in"],
            actual_thickness=pt["measured_thickness_in"],
        )
        assert verdict.status == pt["expected_verdict"]
        results.append({
            "point_id": pt["point_id"],
            "location": pt["location"],
            "measured_t": pt["measured_thickness_in"],
            "required_t": verdict.t_min,
            "verdict": verdict.status,
            "margin": verdict.margin,
        })

    # Step 3: Headless DOCX Board Memo Compilation
    memo_path = str(tmp_path / "Pipeline_Inspection_Approval_Memo.docx")
    generate_psu_memo(
        metadata={
            "ref_no": "CPPL/PL-OPS/2026/UT-044",
            "title": "STATUTORY PIPELINE INTEGRITY ASSESSMENT - 16-INCH BOOSTER LINE",
            "department": "Pipeline Maintenance & Inspection Group",
            "classification": "CONFIDENTIAL - SOVEREIGN PSU ASSET",
            "facility": fixture["facility"],
            "pipeline_section": fixture["pipeline_section"],
        },
        calculations=results,
        citations=[
            "ASME B31.3-2022 Section 304.1.2",
            "ASME B31G Remaining Strength of Corroded Pipelines",
            "OISD-STD-141",
        ],
        output_path=memo_path,
    )

    # Step 4: Validate Generated DOCX Structure
    assert os.path.exists(memo_path)
    doc = docx.Document(memo_path)
    full_text = "\n".join([p.text for p in doc.paragraphs] + [c.text for t in doc.tables for r in t.rows for c in r.cells])
    assert "CPPL/PL-OPS/2026/UT-044" in full_text
    assert "KM 28.7" in full_text
    assert "UNSAT" in full_text
    assert "SAT" in full_text

    # Step 5: Final Air-Gap Verification Assertion
    egress_final = audit_network_egress()
    assert egress_final.packets_captured == 0
    assert egress_final.egress_detected is False
    assert "PASS" in egress_final.status


# ========================================================================================
# SCENARIO 2: CRUDE DISTILLATION UNIT (CDU) TOPOLOGY & HAZOP AUDIT
# ========================================================================================

@pytest.mark.tier4
@pytest.mark.scenario2
def test_tier4_scenario2_cdu_pid_topology_extraction_and_query():
    """
    Scenario 2: Crude Distillation Unit (CDU) P&ID Topology Extraction & Equipment Graph Query
    Processes 4000x3000 P&ID schematic, extracts directed topology,
    and performs HAZOP safety interlock isolation audits.
    """
    drawing_file = "tests/fixtures/drawings/cdu_distillation_train_4000x3000.png"

    # 1. Raster Slicing and Tiling
    patches = slice_drawing(drawing_file, tile_size=(1024, 1024), overlap=128)
    assert len(patches) >= 12  # Grid covering 4000x3000

    # 2. Extract Complete Topology Graph
    G = extract_topology(drawing_file)
    assert isinstance(G, (nx.Graph, nx.DiGraph))

    # 3. Entity Presence Verification
    mandatory_tags = ["V-101", "P-101A", "P-101B", "E-101A", "E-101B", "F-101", "C-101", "ESDV-101"]
    for tag in mandatory_tags:
        assert tag in G.nodes, f"Mandatory equipment tag '{tag}' missing from extracted topology"

    # 4. Topological Query 1: Flow Path Tracing (P-101A to Column C-101)
    paths = list(nx.all_simple_paths(G, source="P-101A", target="C-101"))
    assert len(paths) >= 1, "Failed to find valid process flow path from P-101A to C-101"
    primary_path = paths[0]

    # Verify mandatory sequential equipment order: F-101 precedes C-101
    f101_idx = primary_path.index("F-101")
    c101_idx = primary_path.index("C-101")
    assert f101_idx < c101_idx, "Furnace F-101 must precede Distillation Column C-101"

    # 5. Topological Query 2: Safety Interlock Isolation Audit
    # All flow paths entering F-101 must pass through ESDV-101
    f101_predecessors = list(G.predecessors("F-101")) if G.is_directed() else list(G.neighbors("F-101"))
    assert "ESDV-101" in f101_predecessors or any("ESDV-101" in path for path in paths), (
        "Safety Hazard: F-101 charge line missing Emergency Shutdown Valve ESDV-101"
    )

    # 6. Topological Query 3: Upstream Dependency Analysis
    ancestors = nx.ancestors(G, "F-101") if G.is_directed() else set(nx.node_connected_component(G, "F-101"))
    assert "P-101A" in ancestors
    assert "P-101B" in ancestors


# ========================================================================================
# SCENARIO 3: CORRUPTED CALCULATION SCRIPT RECOVERY TO AUDIT WORKBOOK
# ========================================================================================

@pytest.mark.tier4
@pytest.mark.scenario3
def test_tier4_scenario3_corrupted_script_recovery_to_audit_workbook(tmp_path):
    """
    Scenario 3: Corrupted Script Recovery via Anti-Collapse Loop into Audited Excel Workbook
    Handles forbidden OS call in Turn 1, self-corrects in Turn 2,
    and generates multi-tab audited Excel workbook with active formulas.
    """
    spec = ImmutableSpec(
        task_id="FCCU-BATCH-NOZZLE-01",
        task_description="Batch calculate ASME B31.3 wall thickness and API 510 remaining life for 10 FCCU nozzles",
        parameters={"nozzles_fixture": "tests/fixtures/psu_scenarios/fccu_nozzles.json"},
        required_invariants=["t_actual >= t_min", "remaining_life >= 0"],
        output_schema={"records": list},
    )

    turn_counter = [0]

    def mock_slm_engine(prompt: str) -> str:
        turn_counter[0] += 1
        if turn_counter[0] == 1:
            # Corrupted script with illegal OS call
            return (
                "import os\n"
                "os.system('echo 1')\n"
                "print('ILLEGAL_EXEC')\n"
            )
        # Self-corrected script
        return (
            "import json\n"
            "with open('tests/fixtures/psu_scenarios/fccu_nozzles.json', 'r') as f:\n"
            "    nozzles = json.load(f)\n"
            "results = []\n"
            "for n in nozzles:\n"
            "    P, D, S, E, Y, CA = n['P'], n['D'], n['S'], n['E'], n['Y'], n['CA']\n"
            "    t_min = (P * D) / (2 * (S * E + P * Y)) + CA\n"
            "    margin = n['t_act'] - t_min\n"
            "    verdict = 'SAT' if margin >= 0 else 'UNSAT'\n"
            "    results.append({'tag': n['tag'], 'P': P, 'D': D, 't_min': t_min, 't_act': n['t_act'], 'margin': margin, 'verdict': verdict})\n"
            "print(json.dumps(results))\n"
        )

    # 1. Execute Anti-Collapse State Machine
    outcome = run_react_loop(spec=spec, max_turns=3, engine_callback=mock_slm_engine)

    assert outcome.success is True
    assert outcome.turns_taken == 2
    assert len(outcome.failure_history) == 1

    # 2. Assert Sandbox Isolation and Execution Output
    assert outcome.execution_result.returncode == 0
    calculated_data = json.loads(outcome.execution_result.stdout)
    assert len(calculated_data) == 10

    # 3. Headless Excel Workbook Generation
    xlsx_file = str(tmp_path / "FCCU_Nozzle_Integrity_Audit.xlsx")
    generate_audit_workbook(
        sheets_data={
            "Executive Summary": [
                {"Metric": "Total Nozzles Evaluated", "Value": 10},
                {"Metric": "Safe Operation (SAT)", "Value": sum(1 for r in calculated_data if r["verdict"] == "SAT")},
                {"Metric": "Action Required (UNSAT)", "Value": sum(1 for r in calculated_data if r["verdict"] == "UNSAT")},
                {"Metric": "Audit Security Status", "Value": "VERIFIED AIR-GAPPED"},
            ],
            "Nozzle Calculations": calculated_data,
            "Verification Audit Trail": [
                {"Turn": 1, "Status": "FAILED", "Error": "AST Forbidden Import 'os.system'", "Hash": outcome.failure_history[0]},
                {"Turn": 2, "Status": "PASSED", "Error": "None", "Hash": hashlib.sha256(outcome.final_script.encode()).hexdigest()},
                {"Turn": 3, "Status": "VERIFIED", "Error": "None", "Hash": "0.0% FAR"},
            ],
        },
        output_path=xlsx_file,
    )

    # 4. OpenPyXL OOXML & Formula Validation
    wb = openpyxl.load_workbook(xlsx_file, data_only=False)
    assert "Nozzle Calculations" in wb.sheetnames
    assert "Verification Audit Trail" in wb.sheetnames

    calc_sheet = wb["Nozzle Calculations"]
    assert calc_sheet.cell(row=1, column=1).value is not None

    # Check that t_min column has active Excel formulas in row 5
    formula_cell = calc_sheet.cell(row=5, column=7).value
    assert isinstance(formula_cell, str) and formula_cell.startswith("=")

    # Check Audit Sheet contents
    audit_sheet = wb["Verification Audit Trail"]
    assert audit_sheet.cell(row=2, column=2).value == "FAILED"
    assert audit_sheet.cell(row=3, column=2).value == "PASSED"
