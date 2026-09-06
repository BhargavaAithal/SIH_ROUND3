"""
Adversarial Stress Testing Suite — Project Sovereign Challenger 2
Validates robustness, edge cases, and failure mode isolation across:
1. P&ID Vision Subsystem (skeletonize_lines, slice_drawing, extract_topology, get_pipe_attributes)
2. State-Isolated Anti-Collapse Loop (run_react_loop, failure hash isolation, <= 3 turns)
3. Deliverable Generator (docx_compiler, xlsx_compiler, OOXML packaging)
"""

import math
import os
import tempfile
import zipfile
from pathlib import Path
from typing import Any, Dict, List

import networkx as nx
import numpy as np
import pytest
import docx
import openpyxl

from sovereign.vision.skeletonizer import (
    binarize_engineering_drawing,
    skeletonize_lines,
    find_junctions_and_endpoints,
    trace_skeleton_paths,
)
from sovereign.vision.patcher import (
    Patch,
    compute_grid_1d,
    slice_drawing,
    stitch_patches,
    merge_detections_across_patches,
    cluster_centroids,
    stitch_polylines,
)
from sovereign.vision.graph_builder import (
    parse_isa51_tag,
    extract_topology,
    get_pipe_attributes,
    PIDGraphBuilder,
)
from sovereign.agent.state_machine import (
    ImmutableSpec,
    LoopOutcome,
    run_react_loop,
)
from sovereign.sandbox.launcher import SandboxResult
from sovereign.reports.docx_compiler import generate_psu_memo
from sovereign.reports.xlsx_compiler import generate_audit_workbook


# ============================================================================
# TIER 1: P&ID VISION SUBSYSTEM ADVERSARIAL STRESS TESTS
# ============================================================================

class TestVisionSkeletonizeAdversarial:
    """Stress testing skeletonize_lines with degenerate inputs."""

    def test_all_black_image(self):
        """All zero pixels (blank black canvas)."""
        img = np.zeros((100, 100), dtype=np.uint8)
        skel = skeletonize_lines(img)
        assert skel.shape == (100, 100)
        assert np.count_nonzero(skel) == 0

    def test_all_white_image(self):
        """All 255 pixels (blank white canvas)."""
        img = np.full((100, 100), 255, dtype=np.uint8)
        skel = skeletonize_lines(img)
        assert skel.shape == (100, 100)
        assert np.count_nonzero(skel) == 0

    def test_uniform_gray_image(self):
        """All identical non-zero, non-255 pixels (uniform gray)."""
        img = np.full((80, 80), 128, dtype=np.uint8)
        skel = skeletonize_lines(img)
        assert skel.shape == (80, 80)
        assert np.count_nonzero(skel) == 0

    def test_multi_channel_blank_images(self):
        """Multi-channel (3-channel BGR) black, white, and gray canvases."""
        for val in [0, 128, 255]:
            img = np.full((50, 50, 3), val, dtype=np.uint8)
            skel = skeletonize_lines(img)
            assert skel.shape == (50, 50)
            assert np.count_nonzero(skel) == 0

    def test_minimal_dimensions(self):
        """Minimal dimensions (1x1, 2x2, 3x3, 1x100, 100x1)."""
        dims = [(2, 2), (3, 3), (1, 100), (100, 1), (5, 5)]
        for h, w in dims:
            canvas = np.zeros((h, w), dtype=np.uint8)
            skel = skeletonize_lines(canvas)
            assert skel.shape == (h, w)
            assert np.count_nonzero(skel) == 0

    def test_random_salt_and_pepper_noise(self):
        """Extreme noise: high-density salt-and-pepper noise."""
        np.random.seed(42)
        noise = (np.random.rand(100, 100) > 0.5).astype(np.uint8) * 255
        # Must execute without crash or infinite loop
        skel = skeletonize_lines(noise, method="numpy")
        assert skel.shape == (100, 100)
        assert skel.dtype == np.uint8

        skel_auto = skeletonize_lines(noise, method="auto")
        assert skel_auto.shape == (100, 100)

    def test_disconnected_single_pixel_components(self):
        """Scattered isolated single pixels (checkerboard-like)."""
        canvas = np.zeros((60, 60), dtype=np.uint8)
        canvas[::4, ::4] = 255  # sparse dots
        skel = skeletonize_lines(canvas)
        assert skel.shape == (60, 60)
        juncs, ends = find_junctions_and_endpoints(skel)
        assert isinstance(juncs, list)
        assert isinstance(ends, list)

    def test_invalid_none_or_empty_input(self):
        """None or zero-size inputs should fail gracefully."""
        with pytest.raises(ValueError):
            skeletonize_lines(None)

        with pytest.raises(ValueError):
            skeletonize_lines(np.array([]))


class TestVisionSliceDrawingAdversarial:
    """Stress testing slice_drawing with degenerate geometry."""

    def test_image_smaller_than_tile_size(self):
        """Image much smaller than tile size (e.g. 50x50 with 1024x1024 tiles)."""
        tiny = np.ones((50, 50), dtype=np.uint8) * 200
        patches = slice_drawing(tiny, tile_size=(1024, 1024), overlap=128, edge_mode="shift")
        assert len(patches) == 1
        assert patches[0].width == 50
        assert patches[0].height == 50
        assert patches[0].x_offset == 0
        assert patches[0].y_offset == 0

    def test_image_exact_tile_size(self):
        """Image exactly matching tile size (1024x1024)."""
        exact = np.zeros((1024, 1024), dtype=np.uint8)
        patches = slice_drawing(exact, tile_size=(1024, 1024), overlap=128, edge_mode="shift")
        assert len(patches) == 1
        assert patches[0].width == 1024
        assert patches[0].height == 1024

    def test_all_edge_modes_on_odd_dimensions(self):
        """Edge modes ('shift', 'clip', 'pad') on asymmetric dimensions."""
        img = np.zeros((777, 1333, 3), dtype=np.uint8)
        for mode in ["shift", "clip", "pad"]:
            patches = slice_drawing(img, tile_size=(512, 512), overlap=64, edge_mode=mode)
            assert len(patches) > 0
            for p in patches:
                assert p.image_array.ndim == 3
                if mode in ("shift", "pad"):
                    assert p.width == 512
                    assert p.height == 512
                elif mode == "clip":
                    assert p.width <= 512
                    assert p.height <= 512

    def test_invalid_overlap_raises(self):
        """Overlap >= tile size must raise ValueError."""
        img = np.zeros((500, 500), dtype=np.uint8)
        with pytest.raises(ValueError, match="strictly less than tile_len"):
            slice_drawing(img, tile_size=(256, 256), overlap=256)

        with pytest.raises(ValueError, match="strictly less than tile_len"):
            slice_drawing(img, tile_size=(256, 256), overlap=300)

    def test_invalid_image_path_raises(self):
        """Non-existent image path raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            slice_drawing("non_existent_file_path_12345.png")

    def test_invalid_input_type_raises(self):
        """Non-path, non-ndarray type raises TypeError."""
        with pytest.raises(TypeError):
            slice_drawing(12345)


class TestVisionExtractTopologyAdversarial:
    """Stress testing extract_topology with noisy, blank, and disconnected inputs."""

    def test_blank_black_image_no_tags(self):
        """All-black image without tags returns empty graph."""
        img = np.zeros((500, 500), dtype=np.uint8)
        g = extract_topology(img, tags_data=None)
        assert isinstance(g, nx.Graph)
        assert len(g.nodes) == 0
        assert len(g.edges) == 0

    def test_blank_white_image_no_tags(self):
        """All-white image without tags returns empty graph."""
        img = np.full((500, 500), 255, dtype=np.uint8)
        g = extract_topology(img, tags_data=None)
        assert isinstance(g, nx.Graph)
        assert len(g.nodes) == 0
        assert len(g.edges) == 0

    def test_noisy_image_without_tags(self):
        """Random salt-and-pepper noise image does not crash topology extraction."""
        np.random.seed(123)
        noise = (np.random.rand(300, 300) > 0.98).astype(np.uint8) * 255
        g = extract_topology(noise, tags_data=None)
        assert isinstance(g, nx.Graph)

    def test_unparseable_and_malformed_tags(self):
        """Tags with completely unparseable, empty, unicode, or corrupted formats."""
        degenerate_tags = [
            {"tag": "", "bbox": [10, 10, 50, 50]},
            {"tag": "!!!???@@@", "bbox": [60, 60, 100, 100]},
            {"tag": "UNKNOWN_EQUIPMENT_12345", "bbox": [110, 110, 150, 150]},
            {"tag": "🔥_EMOJI_TAG_💀", "bbox": [160, 160, 200, 200]},
            {"tag": "SELECT * FROM pipes; --", "bbox": [210, 210, 250, 250]},
            "naked_string_tag_without_bbox",
            {"missing_tag_key": "val"},
            None,
            12345,
        ]
        img = np.zeros((400, 400), dtype=np.uint8)
        g = extract_topology(img, tags_data=degenerate_tags)
        assert isinstance(g, nx.Graph)
        assert len(g.nodes) >= 1

    def test_disconnected_components_with_tags(self):
        """Multiple components far apart beyond snap distance remain disconnected."""
        img = np.zeros((1000, 1000), dtype=np.uint8)
        tags = [
            {"tag": "V-101", "bbox": [50, 50, 100, 100], "class_name": "vessel"},
            {"tag": "P-101", "bbox": [900, 900, 950, 950], "class_name": "pump"},
        ]
        g = extract_topology(img, tags_data=tags, snap_distance=40.0)
        assert isinstance(g, nx.Graph)
        assert not nx.has_path(g, "V-101", "P-101")


class TestVisionPipeAttributesAdversarial:
    """Stress testing get_pipe_attributes with edge-case and degenerate inputs."""

    def test_none_and_empty_graph(self):
        """None or empty graph returns defaults."""
        res_none = get_pipe_attributes(None, "16-CR-101")
        assert res_none["tag"] == "16-CR-101"
        assert res_none["outside_diameter"] == 16.0
        assert res_none["design_pressure"] == 285.0

        empty_g = nx.Graph()
        res_empty = get_pipe_attributes(empty_g, "16-CR-101")
        assert res_empty["outside_diameter"] == 16.0

    def test_empty_or_whitespace_tag(self):
        """Empty or whitespace tag string handles cleanly."""
        res_empty = get_pipe_attributes(None, "")
        assert res_empty["tag"] == ""
        assert res_empty["outside_diameter"] == 16.0
        assert res_empty["design_pressure"] == 285.0

        res_space = get_pipe_attributes(None, "   ")
        assert res_space["tag"] == ""

    def test_fractional_sizes(self):
        """Fractional pipe sizes like 1/2\", 3/4\", 1.5\"."""
        res_half = get_pipe_attributes(None, '1/2"-P-101-CS')
        assert res_half["outside_diameter"] == 0.5

        res_three_quarter = get_pipe_attributes(None, '3/4"-P-102-CS')
        assert res_three_quarter["outside_diameter"] == 0.75

        res_decimal = get_pipe_attributes(None, '1.5"-P-103-CS')
        assert res_decimal["outside_diameter"] == 1.5

    def test_flange_ratings_lookup(self):
        """Various ASME ratings (150#, 300#, 600#, 900#, 1500#, 2500#)."""
        ratings = {
            150: 285.0,
            300: 740.0,
            600: 1480.0,
            900: 2220.0,
            1500: 3705.0,
            2500: 6170.0,
        }
        for rating, expected_p in ratings.items():
            res = get_pipe_attributes(None, f'8"-P-101-CS-{rating}#')
            assert res["design_pressure"] == expected_p

    def test_pipe_attributes_zero_denominator_fraction_hardened(self):
        """
        VERIFICATION OF CHALLENGER 2 HARDENING:
        Fractional pipe tags with zero denominator (e.g. '0/0"-CR-101' or '1/0"-CR-101')
        are safely caught and fallback to default outside_diameter (16.0) without raising ZeroDivisionError.
        """
        res = get_pipe_attributes(None, '0/0"-CR-101')
        assert res["outside_diameter"] == 16.0
        res_zero = get_pipe_attributes(None, '1/0"-CR-101')
        assert res_zero["outside_diameter"] == 16.0

    def test_gibberish_and_special_character_tags(self):
        """Completely non-standard tags do not crash."""
        gibberish = [
            "XYZ-UNKNOWN-NO-SIZE",
            "PUMP_SUCTION_LINE",
            "12345",
            "---___---",
            "PIPE-LINE-WITH-NO-NUMBERS",
        ]
        for tag in gibberish:
            res = get_pipe_attributes(None, tag)
            assert isinstance(res, dict)
            assert "outside_diameter" in res
            assert "design_pressure" in res
            assert "measured_thickness" in res


# ============================================================================
# TIER 2: ANTI-COLLAPSE LOOP ADVERSARIAL STRESS TESTS
# ============================================================================

class TestAntiCollapseLoopAdversarial:
    """Stress testing run_react_loop for <= 3 turns convergence, cycle rejection, and hash isolation."""

    @pytest.fixture
    def base_spec(self):
        return ImmutableSpec(
            task_id="TASK_STRESS_001",
            task_description="Calculate ASME B31.3 minimum wall thickness",
            parameters={"P": 2.5, "D": 323.8, "S": 137.9, "E": 1.0, "Y": 0.4, "c": 3.0, "t_actual": 9.52},
        )

    def test_strict_max_turns_enforcement_on_persistent_failure(self, base_spec):
        """Loop must terminate within exactly max_turns=3 when synthesis repeatedly fails."""
        # Generator that returns a different runtime error each turn
        call_count = 0
        def failing_engine(prompt: str) -> str:
            nonlocal call_count
            call_count += 1
            return f"raise RuntimeError('Persistent Failure Turn {call_count}')"

        outcome = run_react_loop(base_spec, max_turns=3, engine_callback=failing_engine)
        assert outcome.success is False
        assert outcome.turns_used == 3
        assert call_count == 3
        assert len(outcome.failure_hashes) == 3
        # Each unique script + error must yield a unique failure hash
        assert len(set(outcome.failure_hashes)) == 3

    def test_immediate_short_circuit_on_consecutive_identical_failure(self, base_spec):
        """If engine generates identical failing code consecutively, detect stall and abort early."""
        call_count = 0
        def stalled_engine(prompt: str) -> str:
            nonlocal call_count
            call_count += 1
            return "raise ValueError('Identical persistent syntax/logic error')"

        outcome = run_react_loop(base_spec, max_turns=3, engine_callback=stalled_engine)
        assert outcome.success is False
        # Should detect duplicate failure on Turn 2 and abort immediately without waiting for Turn 3
        assert outcome.turns_used == 2
        assert call_count == 2
        assert len(outcome.trace) == 2
        assert outcome.trace[-1]["stalled"] is True

    def test_immediate_short_circuit_on_consecutive_ast_violation(self, base_spec):
        """AST violations consecutively repeated abort on Turn 2."""
        call_count = 0
        def unsafe_engine(prompt: str) -> str:
            nonlocal call_count
            call_count += 1
            return "import os\nos.system('dir')"

        outcome = run_react_loop(base_spec, max_turns=3, engine_callback=unsafe_engine)
        assert outcome.success is False
        assert outcome.turns_used == 2
        assert outcome.trace[-1]["stalled"] is True

    def test_cyclic_oscillation_between_two_failures(self, base_spec):
        """Engine oscillating between Failure A and Failure B hits 3-turn bound and stops."""
        call_count = 0
        def cyclic_engine(prompt: str) -> str:
            nonlocal call_count
            call_count += 1
            if call_count % 2 == 1:
                return "raise RuntimeError('Error Mode Alpha')"
            else:
                return "raise RuntimeError('Error Mode Beta')"

        outcome = run_react_loop(base_spec, max_turns=3, engine_callback=cyclic_engine)
        assert outcome.success is False
        assert outcome.turns_used == 3
        assert call_count == 3
        assert len(outcome.failure_hashes) == 3

    def test_clean_context_reprompting(self, base_spec):
        """Verify prompt clean context: prompts sent to callback do not accumulate raw conversation dumps."""
        received_prompts = []
        def inspecting_engine(prompt: str) -> str:
            received_prompts.append(prompt)
            return f"raise RuntimeError('Failure in turn {len(received_prompts)}')"

        outcome = run_react_loop(base_spec, max_turns=3, engine_callback=inspecting_engine)
        assert len(received_prompts) == 3

        # Turn 1 is initial prompt
        assert "TASK_ID: TASK_STRESS_001" in received_prompts[0]
        assert "DESCRIPTION: Calculate ASME B31.3" in received_prompts[0]
        assert "--- PREVIOUS TURN FAILURE TRACEBACK ---" not in received_prompts[0]

        # Turn 2 has clean retry prompt with error from Turn 1
        assert "--- PREVIOUS TURN FAILURE TRACEBACK ---" in received_prompts[1]
        assert "Failure in turn 1" in received_prompts[1]

        # Turn 3 has clean retry prompt with error from Turn 2 ONLY (Turn 1 error is purged)
        assert "--- PREVIOUS TURN FAILURE TRACEBACK ---" in received_prompts[2]
        assert "Failure in turn 2" in received_prompts[2]
        assert "Failure in turn 1" not in received_prompts[2]

    def test_sandbox_timeout_handling_in_loop(self, base_spec):
        """Sandbox timeout in agent loop is caught and recorded as TIMEOUT with failure hash."""
        def timeout_engine(prompt: str) -> str:
            return "import time\nwhile True:\n    pass\n"

        outcome = run_react_loop(base_spec, max_turns=2, engine_callback=timeout_engine)
        assert outcome.success is False
        assert outcome.turns_used == 2
        assert len(outcome.failure_hashes) == 2
        assert outcome.trace[0]["category"] == "TIMEOUT"

    def test_successful_convergence_on_turn_2(self, base_spec):
        """Engine fails on turn 1, but fixes code on turn 2 -> successful termination."""
        call_count = 0
        def self_correcting_engine(prompt: str) -> str:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return "raise ValueError('Initial bug')"
            else:
                return (
                    "import json\n"
                    "print(json.dumps([{'tag': 'PIPE-01', 't_min': 5.2, 'margin': 4.32, 'verdict': 'SAT'}]))\n"
                )

        outcome = run_react_loop(base_spec, max_turns=3, engine_callback=self_correcting_engine)
        assert outcome.success is True
        assert outcome.turns_used == 2
        assert len(outcome.failure_hashes) == 1
        assert outcome.execution_result.returncode == 0

    def test_invalid_spec_validation(self):
        """Invalid spec missing task_id or description raises ValueError."""
        with pytest.raises(ValueError):
            run_react_loop(None)

        with pytest.raises(ValueError):
            run_react_loop(ImmutableSpec(task_id="", task_description=""))


# ============================================================================
# TIER 3: DELIVERABLE GENERATOR ADVERSARIAL STRESS TESTS
# ============================================================================

class TestDeliverableGeneratorAdversarial:
    """Stress testing docx and xlsx compilers for empty tables, invalid paths, and OOXML integrity."""

    @pytest.fixture
    def temp_dir(self):
        with tempfile.TemporaryDirectory() as td:
            yield Path(td)

    # --- DOCX COMPILER TESTS ---

    def test_docx_empty_tables_and_empty_metadata(self, temp_dir):
        """Generate docx memo with empty metadata, empty calculations, and empty citations."""
        out_path = temp_dir / "empty_memo.docx"
        res = generate_psu_memo(
            metadata={},
            calculations=[],
            citations=[],
            output_path=str(out_path),
        )
        assert Path(res).exists()
        assert out_path.stat().st_size > 0

        # Verify valid OOXML zip structure
        with zipfile.ZipFile(out_path, "r") as z:
            namelist = z.namelist()
            assert "[Content_Types].xml" in namelist
            assert "word/document.xml" in namelist

        # Verify reloadability via python-docx
        doc = docx.Document(str(out_path))
        text = "\n".join(p.text for p in doc.paragraphs)
        assert "STATUTORY ENGINEERING MEMORANDUM" in text
        assert "No calculation records provided." in text
        assert "No citations recorded." in text

    def test_docx_special_characters_and_types(self, temp_dir):
        """Calculations containing floats, ints, bools, None, strings, and unicode."""
        out_path = temp_dir / "special_memo.docx"
        meta = {
            "title": "MÉMOIRE TECHNIQUE — PIPELINE CDU & FCCU (2026)",
            "facility": "Paradip Refinery / <Unit-01> & \"Special\"",
            "tag": "16\"-P-101-CS-150#",
        }
        calcs = [
            {"tag": "PIPE-01", "t_min": 5.123456, "margin": 4.39, "verdict": "SAT", "notes": "Normal"},
            {"tag": "PIPE-02", "t_min": 9.99, "margin": -0.47, "verdict": "UNSAT", "flag": True},
            {"tag": "PIPE-03", "t_min": None, "margin": "N/A", "verdict": "UNKNOWN"},
        ]
        citations = [
            "ASME B31.3-2022 Process Piping Clause 304.1.2",
            "API 570 Section 7.1.2 Thickness Measurement Inspection",
        ]
        res = generate_psu_memo(meta, calcs, citations, str(out_path))
        assert Path(res).exists()

        doc = docx.Document(str(out_path))
        tables = doc.tables
        assert len(tables) >= 3  # metadata, calculations, sign-off

    def test_docx_invalid_output_path(self):
        """Unwritable or non-existent root path raises FileNotFoundError or OSError."""
        invalid_path = "/non_existent_drive_or_root_99999/test.docx"
        with pytest.raises((FileNotFoundError, OSError)):
            generate_psu_memo({}, [], [], invalid_path)

    # --- XLSX COMPILER TESTS ---

    def test_xlsx_empty_workbook(self, temp_dir):
        """Generate xlsx workbook with empty sheets dict."""
        out_path = temp_dir / "empty_audit.xlsx"
        res = generate_audit_workbook({}, str(out_path))
        assert Path(res).exists()

        # Verify valid OOXML zip structure
        with zipfile.ZipFile(out_path, "r") as z:
            namelist = z.namelist()
            assert "[Content_Types].xml" in namelist
            assert "xl/workbook.xml" in namelist

        # Reload with openpyxl
        wb = openpyxl.load_workbook(str(out_path))
        assert "Summary" in wb.sheetnames
        ws = wb["Summary"]
        assert ws.cell(row=1, column=1).value == "No Data"

    def test_xlsx_sheet_with_empty_rows(self, temp_dir):
        """Generate xlsx workbook with empty row list."""
        out_path = temp_dir / "empty_sheet.xlsx"
        sheets = {"Inspection_Data": []}
        res = generate_audit_workbook(sheets, str(out_path))
        assert Path(res).exists()

        wb = openpyxl.load_workbook(str(out_path))
        assert "Inspection_Data" in wb.sheetnames
        ws = wb["Inspection_Data"]
        assert ws.cell(row=1, column=1).value == "Empty Sheet"

    def test_xlsx_nan_inf_and_formulas(self, temp_dir):
        """Workbook with NaN, Inf, formulas, and 5+ rows to trigger formula insertion."""
        out_path = temp_dir / "calc_audit.xlsx"
        rows = [
            {"tag": "P-101", "P": 2.5, "D": 323.8, "S": 137.9, "E": 1.0, "t_act": 9.52, "t_min": 5.12},
            {"tag": "P-102", "P": float("nan"), "D": 219.1, "S": 137.9, "E": 1.0, "t_act": 8.18, "t_min": 0.0},
            {"tag": "P-103", "P": float("inf"), "D": 168.3, "S": 137.9, "E": 1.0, "t_act": 7.11, "t_min": 0.0},
            {"tag": "P-104", "P": 1.5, "D": 114.3, "S": 137.9, "E": 1.0, "t_act": 6.02, "t_min": 2.11},
            {"tag": "P-105", "P": 3.0, "D": 406.4, "S": 137.9, "E": 1.0, "t_act": 12.7, "t_min": 7.89},
        ]
        sheets = {"ASME_Calculations": rows}
        res = generate_audit_workbook(sheets, str(out_path))
        assert Path(res).exists()

        wb = openpyxl.load_workbook(str(out_path))
        ws = wb["ASME_Calculations"]
        assert ws.max_row >= 5
        # Verify NaN mapped to 'N/A'
        assert ws.cell(row=3, column=2).value == "N/A"
        # Verify Inf mapped to '#NUM!'
        assert ws.cell(row=4, column=2).value == "#NUM!"
        # Verify formula in G5 starts with '='
        formula_val = str(ws["G5"].value)
        assert formula_val.startswith("=")
        assert "C5*D5" in formula_val

    def test_xlsx_forbidden_characters_in_sheet_title_sanitized(self, temp_dir):
        """
        VERIFICATION OF CHALLENGER 2 HARDENING:
        Sheet titles containing Excel-disallowed characters (:, *, ?, [, ]) are
        sanitized via regex to '-' and packaged into valid OOXML without raising ValueError.
        """
        out_path = temp_dir / "forbidden_chars.xlsx"
        sheets = {"Inspection:Unit*01?[Area]": [{"val": 100}]}
        res = generate_audit_workbook(sheets, str(out_path))
        assert Path(res).exists()
        wb = openpyxl.load_workbook(str(out_path))
        assert len(wb.sheetnames) == 1
        assert wb.sheetnames[0] == "Inspection-Unit-01--Area-"

    def test_xlsx_invalid_output_path(self):
        """Unwritable or non-existent root path raises FileNotFoundError or OSError."""
        invalid_path = "/non_existent_drive_or_root_99999/test.xlsx"
        with pytest.raises((FileNotFoundError, OSError)):
            generate_audit_workbook({"Sheet1": [{"a": 1}]}, invalid_path)
