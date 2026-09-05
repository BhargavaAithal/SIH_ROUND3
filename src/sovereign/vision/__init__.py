"""
Sovereign Vision Subsystem: Multimodal Raster-to-Graph & Layout Parser.
"""

from sovereign.vision.skeletonizer import (
    TopologicalPoint,
    SkeletonPath,
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
    local_to_global,
    global_to_local,
    local_bbox_to_global,
    global_bbox_to_local,
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
    SpatialSnapper,
    DetectedSymbol,
    PipingRun,
    PIDGraphBuilder,
    extract_topology,
    find_piping_path,
    get_valves_on_line,
    trace_downstream,
)

from sovereign.vision.synthetic_pid import (
    SyntheticPIDGenerator,
)

__all__ = [
    # Skeletonizer
    "TopologicalPoint",
    "SkeletonPath",
    "binarize_engineering_drawing",
    "skeletonize_lines",
    "_zhang_suen_pure_numpy",
    "compute_crossing_number",
    "find_junctions_and_endpoints",
    "_rdp_pure_numpy",
    "simplify_polyline",
    "trace_skeleton_paths",
    # Patcher
    "Patch",
    "compute_grid_1d",
    "slice_drawing",
    "local_to_global_point",
    "global_to_local_point",
    "local_to_global_bbox",
    "global_to_local_bbox",
    "local_to_global",
    "global_to_local",
    "local_bbox_to_global",
    "global_bbox_to_local",
    "compute_iou",
    "merge_detections_across_patches",
    "cluster_centroids",
    "stitch_polylines",
    "stitch_patches",
    # Graph Builder
    "parse_isa51_tag",
    "parse_pid_tag",
    "clean_ocr_text",
    "repair_ocr_tag",
    "calculate_bbox_centroid",
    "calculate_mask_centroid",
    "GeometricSnapper",
    "SpatialSnapper",
    "DetectedSymbol",
    "PipingRun",
    "PIDGraphBuilder",
    "extract_topology",
    "find_piping_path",
    "get_valves_on_line",
    "trace_downstream",
    # Synthetic Generator
    "SyntheticPIDGenerator",
]
