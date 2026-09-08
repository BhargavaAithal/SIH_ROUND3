"""
Comprehensive Test Suite for Project Sovereign Milestone 2:
Multimodal Raster-to-Graph & Layout Parser.

Covers:
- Binarization & polarity detection
- Morphological skeletonization & vectorized Zhang-Suen pure NumPy thinning
- Rutovitz Crossing Number invariant & diagonal step robustness
- Connected-component junction cluster centroid aggregation
- Subtractive branch tracing & Ramer-Douglas-Peucker (RDP) polyline simplification
- Tiling patcher 4000x3000 slicing & bidirectional coordinate mapping
- IoU NMS deduplication, OCR text reconciliation, centroid clustering, polyline stitching
- Alpha-feathered and max-intensity raster reconstruction
- ISA-5.1 tag parsing & OCR noise repair
- KD-Tree geometric snapping & orthogonal segment projection
- NetworkX dual graph assembly & process flow direction inference
- Procedural synthetic 4000x3000 P&ID generation and end-to-end topology extraction
"""

import math
import numpy as np
import networkx as nx
import pytest
import cv2

from sovereign.vision.skeletonizer import (
    binarize_engineering_drawing,
    skeletonize_lines,
    _zhang_suen_pure_numpy,
    compute_crossing_number,
    find_junctions_and_endpoints,
    _rdp_pure_numpy,
    simplify_polyline,
    trace_skeleton_paths,
)

from sovereign.vision.patcher import (
    Patch,
    compute_grid_1d,
    slice_drawing,
    local_to_global_point,
    global_to_local_point,
    local_to_global_bbox,
    global_to_local_bbox,
    compute_iou,
    merge_detections_across_patches,
    cluster_centroids,
    stitch_polylines,
    stitch_patches,
)

from sovereign.vision.graph_builder import (
    parse_isa51_tag,
    parse_pid_tag,
    clean_ocr_text,
    repair_ocr_tag,
    calculate_bbox_centroid,
    calculate_mask_centroid,
    GeometricSnapper,
    PIDGraphBuilder,
    DetectedSymbol,
    PipingRun,
    extract_topology,
    find_piping_path,
    get_valves_on_line,
    trace_downstream,
)

from sovereign.vision.synthetic_pid import SyntheticPIDGenerator


# ============================================================================
# 1. BINARIZATION & SKELETONIZATION TESTS
# ============================================================================

def test_binarize_engineering_drawing_polarity():
    # 1. Dark lines on light background (standard CAD / scanned paper)
    canvas_light = np.full((100, 100, 3), 240, dtype=np.uint8)
    # Draw dark black lines
    canvas_light[45:55, :] = 10
    bin_light = binarize_engineering_drawing(canvas_light)
    assert bin_light[50, 50] == 255  # Line should be foreground (255)
    assert bin_light[10, 10] == 0    # Background should be 0

    # 2. Light lines on dark background (blueprint / inverted scan)
    canvas_dark = np.full((100, 100, 3), 20, dtype=np.uint8)
    canvas_dark[45:55, :] = 240
    bin_dark = binarize_engineering_drawing(canvas_dark)
    assert bin_dark[50, 50] == 255  # Line should be foreground (255)
    assert bin_dark[10, 10] == 0    # Background should be 0

    # 3. Empty image validation
    with pytest.raises(ValueError):
        binarize_engineering_drawing(np.array([]))


def test_zhang_suen_pure_numpy_thinning():
    # Construct a 20x20 image with a 5-pixel wide horizontal bar
    img = np.zeros((30, 30), dtype=np.uint8)
    img[12:17, 5:25] = 255

    skel_np = _zhang_suen_pure_numpy(img)
    assert skel_np.shape == (30, 30)
    assert np.any(skel_np == 255)

    # In the middle (x=15), the skeleton should have thickness strictly == 1
    col_pts = np.where(skel_np[:, 15] == 255)[0]
    assert len(col_pts) == 1, f"Expected 1 pixel width, got {len(col_pts)}"


def test_skeletonize_lines_dispatch():
    canvas = np.zeros((40, 40), dtype=np.uint8)
    canvas[15:25, 5:35] = 255

    # Enforce pure NumPy
    skel_np = skeletonize_lines(canvas, method="numpy")
    assert np.any(skel_np == 255)

    # Auto dispatch
    skel_auto = skeletonize_lines(canvas, method="auto")
    assert np.any(skel_auto == 255)


# ============================================================================
# 2. CROSSING NUMBER & TOPOLOGICAL FEATURES
# ============================================================================

def test_crossing_number_endpoint_and_junction():
    # Construct a 1-pixel wide T-junction
    # Horizontal line: y=10, x from 5 to 15
    # Vertical stem going down: x=10, y from 10 to 15
    skel = np.zeros((25, 25), dtype=np.uint8)
    skel[10, 5:16] = 1
    skel[10:16, 10] = 1

    cn = compute_crossing_number(skel)

    # Endpoints: (5, 10), (15, 10), (10, 15) -> CN should be 1
    assert cn[10, 5] == 1
    assert cn[10, 15] == 1
    assert cn[15, 10] == 1

    # T-junction point at (10, 10) -> CN should be 3
    assert cn[10, 10] == 3

    # Regular line points (e.g. (7, 10)) -> CN should be 2
    assert cn[10, 7] == 2


def test_crossing_number_diagonal_step_invariant():
    # Diagonal step from (2, 0) to (1, 1) to (0, 2), plus step pixel (1, 2)
    # Center pixel is at (1, 1).
    # Naive neighbor count = 3, but Crossing Number should strictly be 2!
    skel = np.zeros((3, 3), dtype=np.uint8)
    skel[0, 2] = 1
    skel[1, 1] = 1
    skel[1, 2] = 1
    skel[2, 0] = 1

    cn = compute_crossing_number(skel)
    # The center pixel MUST NOT be a junction!
    assert cn[1, 1] == 2, f"Expected CN=2 for diagonal step, got {cn[1, 1]}"


def test_find_junctions_and_endpoints_cluster_aggregation():
    # Create a line with thick intersection creating a multi-pixel junction cluster
    img = np.zeros((50, 50), dtype=np.uint8)
    img[23:27, 10:40] = 255  # Horizontal thick line
    img[10:40, 23:27] = 255  # Vertical thick line

    skel = skeletonize_lines(img, method="numpy")
    junctions, endpoints = find_junctions_and_endpoints(skel)

    # Multi-pixel intersection should merge into a single junction centroid
    assert len(junctions) == 1, f"Expected 1 merged junction, got {len(junctions)}"
    jx, jy = junctions[0]
    # Centroid should be approximately (24, 24) or (25, 25)
    assert 22 <= jx <= 27
    assert 22 <= jy <= 27

    # Should have 4 distinct endpoints
    assert len(endpoints) == 4, f"Expected 4 endpoints, got {len(endpoints)}"


# ============================================================================
# 3. PATH TRACING & RDP SIMPLIFICATION
# ============================================================================

def test_rdp_polyline_simplification():
    # Straight line of 50 collinear points
    line_pts = [(x, 10) for x in range(50)]
    simplified = simplify_polyline(line_pts, epsilon=1.5)
    assert len(simplified) == 2
    assert simplified[0] == (0, 10)
    assert simplified[-1] == (49, 10)

    # 90-degree corner: (0, 0) -> (20, 0) -> (20, 30)
    corner_pts = [(x, 0) for x in range(21)] + [(20, y) for y in range(1, 31)]
    simplified_corner = simplify_polyline(corner_pts, epsilon=1.5)
    assert len(simplified_corner) == 3
    assert simplified_corner[0] == (0, 0)
    assert simplified_corner[1] == (20, 0)
    assert simplified_corner[2] == (20, 30)

    # Test pure numpy fallback matches
    rdp_np = _rdp_pure_numpy(corner_pts, epsilon=1.5)
    assert len(rdp_np) == 3


def test_trace_skeleton_paths_tee_line():
    # Simple T-junction: horizontal line (10, 20) to (90, 20), branch down (50, 20) to (50, 70)
    skel = np.zeros((100, 100), dtype=np.uint8)
    skel[20, 10:91] = 255
    skel[20:71, 50] = 255

    junctions, endpoints = find_junctions_and_endpoints(skel)
    paths = trace_skeleton_paths(skel, junctions, endpoints, epsilon=1.5)

    # Should trace 3 distinct branches meeting at junction (50, 20)
    assert len(paths) == 3
    for p in paths:
        assert len(p['points']) >= 2
        assert p['euclidean_length'] > 10.0


# ============================================================================
# 4. PATCHER & 4000x3000 SLICING
# ============================================================================

def test_compute_grid_1d():
    # 4000 dimension with 1024 tile and 128 overlap
    intervals_shift = compute_grid_1d(4000, 1024, 128, edge_mode="shift")
    # Expected 5 tiles: [0, 1024], [896, 1920], [1792, 2816], [2688, 3712], [2976, 4000]
    assert len(intervals_shift) == 5
    assert intervals_shift[0] == (0, 1024)
    assert intervals_shift[-1] == (2976, 4000)

    # Small dimension <= tile size
    intervals_small = compute_grid_1d(500, 1024, 128)
    assert intervals_small == [(0, 500)]


def test_slice_drawing_4000x3000():
    # Mock a 4000x3000 single-channel canvas
    canvas = np.zeros((3000, 4000), dtype=np.uint8)
    patches = slice_drawing(canvas, tile_size=(1024, 1024), overlap=128, edge_mode="shift")

    # 5 horizontal steps * 4 vertical steps = 20 patches
    assert len(patches) == 20
    for p in patches:
        assert p.width == 1024
        assert p.height == 1024
        assert p.image_array.shape == (1024, 1024)


def test_bidirectional_coordinate_mapping():
    p = Patch(
        patch_id=3,
        image_array=np.zeros((1024, 1024), dtype=np.uint8),
        x_offset=896,
        y_offset=1792,
        width=1024,
        height=1024,
    )

    # Point mapping
    lx, ly = 50.0, 75.0
    gx, gy = local_to_global_point(p, lx, ly)
    assert gx == 896 + 50.0
    assert gy == 1792 + 75.0

    rx, ry = global_to_local_point(p, gx, gy)
    assert rx == lx
    assert ry == ly

    # Point outside patch
    outside_pt = global_to_local_point(p, 100.0, 100.0, clip=False)
    assert outside_pt is None

    clipped_pt = global_to_local_point(p, 100.0, 100.0, clip=True)
    assert clipped_pt == (0.0, 0.0)

    # Bounding box mapping
    l_box = (10.0, 20.0, 100.0, 120.0)
    g_box = local_to_global_bbox(p, l_box)
    assert g_box == (896 + 10.0, 1792 + 20.0, 896 + 100.0, 1792 + 120.0)

    r_box = global_to_local_bbox(p, g_box)
    assert r_box == l_box


def test_iou_and_deduplication():
    boxA = (100.0, 100.0, 200.0, 200.0)
    boxB = (150.0, 100.0, 250.0, 200.0)
    iou = compute_iou(boxA, boxB)
    assert 0.3 < iou < 0.4  # Intersection is 50x100 = 5000, union is 15000 -> 0.333

    # Identical boxes
    assert compute_iou(boxA, boxA) == 1.0

    # Cross-patch detections deduplication with OCR reconciliation
    dets = [
        {"bbox": [100, 100, 200, 200], "confidence": 0.85, "text": "10-P-10", "label": "tag"},
        {"bbox": [102, 98, 202, 198], "confidence": 0.92, "text": "10-P-101-CS", "label": "tag"},
    ]
    merged = merge_detections_across_patches(dets, iou_threshold=0.5)
    assert len(merged) == 1
    assert merged[0]["confidence"] == 0.92
    assert merged[0]["text"] == "10-P-101-CS"  # Longest text preserved


def test_cluster_centroids():
    centroids = [
        {"point": (100.0, 100.0), "confidence": 0.9, "label": "valve"},
        {"point": (104.0, 102.0), "confidence": 0.8, "label": "valve"},
        {"point": (500.0, 500.0), "confidence": 0.95, "label": "valve"},
    ]
    clustered = cluster_centroids(centroids, distance_threshold=15.0)
    assert len(clustered) == 2
    # First cluster should be weighted average near (102, 101)
    near_100 = [c for c in clustered if c["point"][0] < 200][0]
    assert 101.0 <= near_100["point"][0] <= 103.0
    assert near_100["merged_count"] == 2


def test_stitch_polylines():
    # Segment 1 ending at (100, 200), Segment 2 starting at (105, 200)
    line1 = [(10.0, 200.0), (100.0, 200.0)]
    line2 = [(105.0, 200.0), (250.0, 200.0)]
    stitched = stitch_polylines([line1, line2], snap_distance=15.0)
    assert len(stitched) == 1
    assert stitched[0][0] == (10.0, 200.0)
    assert stitched[0][-1] == (250.0, 200.0)


def test_stitch_patches_linear_and_max():
    # Test seamless image reconstruction
    canvas = np.zeros((500, 500), dtype=np.uint8)
    canvas[100:400, 100:400] = 180

    patches = slice_drawing(canvas, tile_size=(256, 256), overlap=64, edge_mode="shift")
    reconstructed = stitch_patches(patches, full_shape=(500, 500), blend_mode="linear")

    assert reconstructed.shape == (500, 500)
    # Check max absolute error between original canvas and reconstructed
    diff = np.abs(canvas.astype(int) - reconstructed.astype(int))
    assert np.max(diff) <= 1  # Near bit-exact reconstruction!


# ============================================================================
# 5. ISA-5.1 TAG PARSING & OCR REPAIR
# ============================================================================

@pytest.mark.parametrize("raw_text, expected_tag, expected_type", [
    ("10-P-101-CS", "10-P-101-CS", "P"),
    ("P-101A", "P-101A", "P"),
    ("P-102B", "P-102B", "P"),
    ("V-102", "V-102", "V"),
    ("TK-500", "TK-500", "TK"),
    ("D-201", "D-201", "D"),
    ("C-301", "C-301", "C"),
    ("E-101", "E-101", "E"),
    ("E-102A/B", "E-102A/B", "E"),
])
def test_parse_isa51_equipment_tags(raw_text, expected_tag, expected_type):
    parsed = parse_isa51_tag(raw_text)
    assert parsed is not None
    assert parsed['category'] == 'equipment'
    assert parsed['tag'] == expected_tag
    assert parsed['equipment_type'] == expected_type


@pytest.mark.parametrize("raw_text, expected_tag, expected_type", [
    ("HV-101", "HV-101", "HV"),
    ("FCV-202", "FCV-202", "FCV"),
    ("PRV-301", "PRV-301", "PRV"),
    ("V-101", "V-101", "V"),
    ("MOV-105A", "MOV-105A", "MOV"),
])
def test_parse_isa51_valve_tags(raw_text, expected_tag, expected_type):
    parsed = parse_isa51_tag(raw_text, tag_hint='valve')
    assert parsed is not None
    assert parsed['category'] == 'valve'
    assert parsed['tag'] == expected_tag
    assert parsed['valve_type'] == expected_type


@pytest.mark.parametrize("raw_text, expected_size, expected_service, expected_spec", [
    ('4"-P-101-CS-150', '4', 'P', 'CS'),
    ('2"-HC-204-SS', '2', 'HC', 'SS'),
    ('6"-CW-102-CS', '6', 'CW', 'CS'),
    ('1/2"-IA-101-CU', '1/2', 'IA', 'CU'),
])
def test_parse_piping_line_specs(raw_text, expected_size, expected_service, expected_spec):
    parsed = parse_isa51_tag(raw_text)
    assert parsed is not None
    assert parsed['category'] == 'pipe_line'
    assert parsed['size'] == expected_size
    assert parsed['service'] == expected_service
    assert parsed['material_spec'] == expected_spec


def test_ocr_repair_rules():
    # 'O' in sequence number should repair to '0'
    p1 = parse_isa51_tag("P-1O1A")
    assert p1 is not None
    assert p1['sequence'] == "101"
    assert p1['tag'] == "P-101A"

    # 'I' in sequence number should repair to '1'
    p2 = parse_isa51_tag("V-I02")
    assert p2 is not None
    assert p2['sequence'] == "102"
    assert p2['tag'] == "V-102"

    # 'S' in sequence number should repair to '5'
    p3 = parse_isa51_tag("TK-S00")
    assert p3 is not None
    assert p3['sequence'] == "500"
    assert p3['tag'] == "TK-500"


# ============================================================================
# 6. GEOMETRIC SNAPPING & SEGMENT PROJECTION
# ============================================================================

def test_geometric_snapping_kdtree():
    snapper = GeometricSnapper(snap_distance=35.0)
    snapper.add_node("node_pump", (200.0, 300.0), "equipment")
    snapper.add_node("node_valve", (600.0, 700.0), "valve")

    # Point within 20px of pump -> should snap
    snapped, matched_id, dist = snapper.snap_endpoint((210.0, 315.0))
    assert matched_id == "node_pump"
    assert snapped == (200.0, 300.0)
    assert dist < 20.0

    # Point 60px away -> should NOT snap
    orig = (300.0, 300.0)
    snapped2, matched_id2, dist2 = snapper.snap_endpoint(orig)
    assert matched_id2 is None
    assert snapped2 == orig
    assert dist2 == float('inf')


def test_project_point_to_segment():
    snapper = GeometricSnapper()
    a = (100.0, 200.0)
    b = (500.0, 200.0)
    p = (300.0, 225.0)  # 25px below segment midpoint

    proj, dist, t = snapper.project_point_to_segment(p, a, b)
    assert pytest.approx(proj[0]) == 300.0
    assert pytest.approx(proj[1]) == 200.0
    assert pytest.approx(dist) == 25.0
    assert pytest.approx(t) == 0.5


# ============================================================================
# 7. DUAL NETWORKX GRAPH ASSEMBLY & QUERIES
# ============================================================================

def test_graph_builder_assembly_and_flow():
    builder = PIDGraphBuilder(snap_distance=40.0)

    symbols = [
        DetectedSymbol("v1", "vessel", [100, 100, 200, 300], tag="V-101"),
        DetectedSymbol("vlv1", "valve", [280, 180, 320, 220], tag="HV-101"),
        DetectedSymbol("p1", "pump", [400, 400, 500, 500], tag="P-101A"),
    ]
    builder.add_symbols(symbols)

    # Pipe 1: V-101 center (150, 200) to HV-101 center (300, 200)
    run1 = PipingRun("r1", [(150.0, 200.0), (300.0, 200.0)], pipe_spec='3"-P-101-CS')
    # Pipe 2: HV-101 center (300, 200) to P-101 suction nozzle (410, 450)
    run2 = PipingRun("r2", [(300.0, 200.0), (300.0, 450.0), (450.0, 450.0)], pipe_spec='3"-P-101-CS')

    builder.add_piping_runs([run1, run2])
    g, dg = builder.build()

    # Undirected path connectivity
    assert nx.has_path(g, "equipment_V-101", "equipment_P-101A")
    path = find_piping_path(g, "V-101", "P-101A")
    assert path == ["equipment_V-101", "valve_HV-101", "equipment_P-101A"]

    # Valves on line query
    valves = get_valves_on_line(g, "V-101", "P-101A")
    assert len(valves) == 1
    assert valves[0]["tag"] == "HV-101"

    # Directed graph process flow
    assert dg.has_edge("equipment_V-101", "valve_HV-101")
    assert dg.has_edge("valve_HV-101", "equipment_P-101A")
    downstream = trace_downstream(dg, "V-101")
    assert "HV-101" in downstream
    assert "P-101A" in downstream


# ============================================================================
# 8. SYNTHETIC 4000x3000 BENCHMARK & TOPOLOGY EXTRACTION
# ============================================================================

def test_synthetic_pid_generator():
    gen = SyntheticPIDGenerator(width=4000, height=3000)
    image, gt_graph, symbols, runs = gen.generate_benchmark_diagram()

    # Image canvas verification
    assert image.shape == (3000, 4000, 3)
    assert image.dtype == np.uint8

    # Verify equipment tags in ground truth
    tags_in_gt = {data['tag'] for _, data in gt_graph.nodes(data=True) if 'tag' in data}
    expected_tags = {"V-102", "10-P-101A", "10-P-101B", "E-101", "TK-500", "HV-101A", "HV-101B", "FCV-202"}
    assert expected_tags.issubset(tags_in_gt)

    # Verify complete process path in ground-truth graph: V-102 -> ... -> TK-500
    assert nx.has_path(gt_graph, "equip_V-102", "equip_TK-500")
    full_path = nx.shortest_path(gt_graph, "equip_V-102", "equip_TK-500")
    assert full_path[0] == "equip_V-102"
    assert full_path[-1] == "equip_TK-500"
    assert "valve_FCV-202" in full_path
    assert "equip_E-101" in full_path


def test_extract_topology_end_to_end():
    # Generate smaller synthetic diagram for fast end-to-end extraction test
    gen = SyntheticPIDGenerator(width=1000, height=1000)
    v1 = gen.draw_vessel("V-101", 200, 500, width=100, height=200)
    vlv = gen.draw_valve("HV-101", 500, 500, valve_type='HV')
    p1 = gen.draw_pump("P-101A", 800, 500, radius=30)
    gen.draw_pipe_line([(200, 500), (500, 500)], pipe_spec='3"-P-101-CS')
    gen.draw_pipe_line([(500, 500), (800, 500)], pipe_spec='3"-P-101-CS')

    # Run extract_topology with snap_distance ensuring equipment endpoint snapping
    graph = extract_topology(gen.image, tags_data=gen.detected_symbols, snap_distance=120.0)


    # Assert major equipment nodes exist in extracted graph
    tags_in_extracted = {d.get('tag') for _, d in graph.nodes(data=True)}
    assert "V-101" in tags_in_extracted
    assert "HV-101" in tags_in_extracted
    assert "P-101A" in tags_in_extracted

    # Assert piping runs connect the nodes
    node_v = [n for n, d in graph.nodes(data=True) if d.get('tag') == 'V-101'][0]
    node_p = [n for n, d in graph.nodes(data=True) if d.get('tag') == 'P-101A'][0]
    assert nx.has_path(graph.to_undirected(), node_v, node_p)


