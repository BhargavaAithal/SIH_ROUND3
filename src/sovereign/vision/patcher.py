"""
Sovereign AI Execution Plane — Multimodal Vision Engine
Module: src/sovereign/vision/patcher.py

Features:
- Arbitrary high-resolution diagram slicing (4000x3000, 8000x6000, etc.)
- Edge boundary handling via stride-shifting ("shift"), clipping ("clip"), and padding ("pad")
- Bidirectional coordinate mappings for points and bounding boxes
- Cross-patch feature deduplication (IoU NMS, OCR reconciliation, centroid clustering, polyline stitching)
- Seamless raster reconstruction with linear alpha feathering and binary max blending
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional, Tuple, Union
import cv2
import numpy as np


@dataclass
class Patch:
    """
    Represents an extracted rectangular image tile from a high-resolution diagram.

    Attributes:
        patch_id: Unique integer identifier for the patch.
        image_array: Numpy array containing the pixel data (grayscale or multi-channel).
        x_offset: Global horizontal pixel offset of the top-left corner.
        y_offset: Global vertical pixel offset of the top-left corner.
        width: Width of the patch in pixels.
        height: Height of the patch in pixels.
    """
    patch_id: int
    image_array: np.ndarray
    x_offset: int
    y_offset: int
    width: int
    height: int

    @property
    def image(self) -> np.ndarray:
        return self.image_array

    @property
    def bbox(self) -> Tuple[int, int, int, int]:
        return (self.x_offset, self.y_offset, self.x_offset + self.width, self.y_offset + self.height)

    @property
    def tile_id(self) -> str:
        return f"tile_{self.patch_id}_{self.x_offset}_{self.y_offset}"


def compute_grid_1d(
    dim: int,
    tile_len: int,
    overlap: int,
    edge_mode: Literal["shift", "clip", "pad"] = "shift",
) -> List[Tuple[int, int]]:
    """
    Computes (start, end) coordinate intervals along a single spatial dimension.

    Args:
        dim: Total size of the dimension in pixels.
        tile_len: Desired tile length.
        overlap: Overlap in pixels between adjacent tiles.
        edge_mode: Strategy for handling boundaries:
            - "shift": Shifts final tile start backward so it ends at dim,
                       preserving exact tile_len.
            - "clip": Emits final tile truncated to dim.
            - "pad": Emits final tile of tile_len, expecting caller to pad.

    Returns:
        List of (start, end) tuples representing pixel slices.
    """
    if dim <= tile_len:
        return [(0, dim)]

    stride = tile_len - overlap
    if stride <= 0:
        raise ValueError(f"Overlap ({overlap}) must be strictly less than tile_len ({tile_len})")

    starts: List[int] = []
    pos = 0
    while pos + tile_len < dim:
        starts.append(pos)
        pos += stride

    if edge_mode == "shift":
        starts.append(max(0, dim - tile_len))
    elif edge_mode in ("clip", "pad"):
        starts.append(pos)
    else:
        raise ValueError(f"Unsupported edge_mode: '{edge_mode}'. Choose 'shift', 'clip', or 'pad'.")

    # Deduplicate while preserving ascending order
    unique_starts = sorted(list(dict.fromkeys(starts)))
    intervals: List[Tuple[int, int]] = []
    for s in unique_starts:
        if edge_mode == "shift":
            e = s + tile_len
        elif edge_mode == "clip":
            e = min(s + tile_len, dim)
        elif edge_mode == "pad":
            e = s + tile_len
        intervals.append((s, e))

    return intervals


def slice_drawing(
    image_path_or_array: Union[str, Path, np.ndarray],
    tile_size: Tuple[int, int] = (1024, 1024),
    overlap: int = 128,
    edge_mode: Literal["shift", "clip", "pad"] = "shift",
) -> List[Patch]:
    """
    Slices a high-resolution engineering drawing into overlapping patches.

    Args:
        image_path_or_array: File path string, Path object, or pre-loaded numpy image array.
        tile_size: (width, height) of each patch in pixels.
        overlap: Overlap margin in pixels along both axes.
        edge_mode: Boundary handling strategy ("shift", "clip", or "pad").

    Returns:
        List of Patch objects covering the entire image.
    """
    if isinstance(image_path_or_array, (str, Path)):
        img = cv2.imread(str(image_path_or_array), cv2.IMREAD_UNCHANGED)
        if img is None:
            raise FileNotFoundError(f"Could not load image from: {image_path_or_array}")
    elif isinstance(image_path_or_array, np.ndarray):
        img = image_path_or_array
    else:
        raise TypeError(f"Expected file path or np.ndarray, got {type(image_path_or_array)}")

    H, W = img.shape[:2]
    tile_w, tile_h = tile_size

    x_steps = compute_grid_1d(W, tile_w, overlap, edge_mode)
    y_steps = compute_grid_1d(H, tile_h, overlap, edge_mode)

    patches: List[Patch] = []
    patch_id = 0

    for y1, y2 in y_steps:
        for x1, x2 in x_steps:
            if edge_mode == "pad" and (x2 > W or y2 > H):
                crop_y2 = min(y2, H)
                crop_x2 = min(x2, W)
                crop = img[y1:crop_y2, x1:crop_x2]
                pad_val = 255  # Standard engineering paper background
                if img.ndim == 2:
                    patch_img = np.full((y2 - y1, x2 - x1), pad_val, dtype=img.dtype)
                    patch_img[0:(crop_y2 - y1), 0:(crop_x2 - x1)] = crop
                else:
                    patch_img = np.full((y2 - y1, x2 - x1, img.shape[2]), pad_val, dtype=img.dtype)
                    patch_img[0:(crop_y2 - y1), 0:(crop_x2 - x1), :] = crop
            else:
                patch_img = img[y1:y2, x1:x2].copy()

            p = Patch(
                patch_id=patch_id,
                image_array=patch_img,
                x_offset=x1,
                y_offset=y1,
                width=patch_img.shape[1],
                height=patch_img.shape[0],
            )
            patches.append(p)
            patch_id += 1

    return patches


def local_to_global_point(
    patch: Patch,
    local_x: float,
    local_y: float,
) -> Tuple[float, float]:
    """
    Transforms local patch (x, y) coordinates to global drawing coordinates.
    """
    return (float(local_x + patch.x_offset), float(local_y + patch.y_offset))


def global_to_local_point(
    patch: Patch,
    global_x: float,
    global_y: float,
    clip: bool = False,
) -> Optional[Tuple[float, float]]:
    """
    Transforms global coordinates to local patch coordinates.

    Args:
        patch: Patch object.
        global_x: Global X coordinate.
        global_y: Global Y coordinate.
        clip: If True, clamps coordinates to patch boundaries if outside.
              If False, returns None when outside.
    """
    lx = global_x - patch.x_offset
    ly = global_y - patch.y_offset

    if 0.0 <= lx < patch.width and 0.0 <= ly < patch.height:
        return (float(lx), float(ly))

    if clip:
        cx = max(0.0, min(float(patch.width - 1), lx))
        cy = max(0.0, min(float(patch.height - 1), ly))
        return (cx, cy)

    return None


def local_to_global_bbox(
    patch: Patch,
    bbox: Tuple[float, float, float, float],
) -> Tuple[float, float, float, float]:
    """
    Transforms local bounding box (x1, y1, x2, y2) to global coordinates.
    """
    x1, y1, x2, y2 = bbox
    return (
        float(x1 + patch.x_offset),
        float(y1 + patch.y_offset),
        float(x2 + patch.x_offset),
        float(y2 + patch.y_offset),
    )


def global_to_local_bbox(
    patch: Patch,
    bbox: Tuple[float, float, float, float],
    clip: bool = False,
) -> Optional[Tuple[float, float, float, float]]:
    """
    Transforms a global bounding box (x1, y1, x2, y2) to local patch coordinates.

    Args:
        patch: Patch object.
        bbox: (x1, y1, x2, y2) in global coordinates.
        clip: If True, clips bbox to patch boundaries. If intersection is empty, returns None.
              If False, requires full containment; returns None if partially or fully outside.
    """
    x1, y1, x2, y2 = bbox
    lx1 = x1 - patch.x_offset
    ly1 = y1 - patch.y_offset
    lx2 = x2 - patch.x_offset
    ly2 = y2 - patch.y_offset

    if not clip:
        if 0.0 <= lx1 and 0.0 <= ly1 and lx2 <= patch.width and ly2 <= patch.height:
            return (float(lx1), float(ly1), float(lx2), float(ly2))
        return None
    else:
        cx1 = max(0.0, min(float(patch.width), lx1))
        cy1 = max(0.0, min(float(patch.height), ly1))
        cx2 = max(0.0, min(float(patch.width), lx2))
        cy2 = max(0.0, min(float(patch.height), ly2))
        if cx2 > cx1 and cy2 > cy1:
            return (float(cx1), float(cy1), float(cx2), float(cy2))
        return None


# Aliases for compatibility
local_to_global = local_to_global_point
global_to_local = global_to_local_point
local_bbox_to_global = local_to_global_bbox
global_bbox_to_local = global_to_local_bbox


def compute_iou(
    boxA: Tuple[float, float, float, float],
    boxB: Tuple[float, float, float, float],
) -> float:
    """
    Computes Intersection over Union (IoU) between two bounding boxes (x1, y1, x2, y2).
    """
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    inter_w = max(0.0, xB - xA)
    inter_h = max(0.0, yB - yA)
    inter_area = inter_w * inter_h

    boxAArea = max(0.0, boxA[2] - boxA[0]) * max(0.0, boxA[3] - boxA[1])
    boxBArea = max(0.0, boxB[2] - boxB[0]) * max(0.0, boxB[3] - boxB[1])

    union_area = boxAArea + boxBArea - inter_area
    if union_area <= 0.0:
        return 0.0
    return float(inter_area / union_area)


def merge_detections_across_patches(
    patch_detections: List[Dict[str, Any]],
    iou_threshold: float = 0.5,
) -> List[Dict[str, Any]]:
    """
    Deduplicates detections across overlapping patches using Class-Aware NMS
    and OCR text reconciliation.

    Each detection dictionary must have:
        - "bbox": [x1, y1, x2, y2] (in GLOBAL coordinates)
        - "label": str (optional, defaults to "default")
        - "confidence": float (optional, defaults to 1.0)
        - "text": str (optional OCR tag content)

    Returns:
        List of deduplicated detection dictionaries.
    """
    if not patch_detections:
        return []

    labels = set(d.get("label", "default") for d in patch_detections)
    merged_results: List[Dict[str, Any]] = []

    for label in labels:
        group = [dict(d) for d in patch_detections if d.get("label", "default") == label]
        group.sort(key=lambda d: float(d.get("confidence", 1.0)), reverse=True)

        while group:
            best = group.pop(0)
            merged_results.append(best)

            remaining: List[Dict[str, Any]] = []
            for candidate in group:
                iou = compute_iou(tuple(best["bbox"]), tuple(candidate["bbox"]))
                if iou >= iou_threshold:
                    # Reconcile OCR text: choose longer/more complete string
                    if "text" in best or "text" in candidate:
                        t_best = best.get("text") or ""
                        t_cand = candidate.get("text") or ""
                        if len(t_cand) > len(t_best):
                            best["text"] = t_cand
                else:
                    remaining.append(candidate)
            group = remaining

    return merged_results


def cluster_centroids(
    centroids: List[Dict[str, Any]],
    distance_threshold: float = 15.0,
) -> List[Dict[str, Any]]:
    """
    Groups and merges nearby centroid points (valves, ports, junctions) across patches.

    Each item must contain:
        - "point": (x, y) in global coordinates
        - "label": str (optional)
        - "confidence": float (optional)

    Returns:
        List of merged centroid items with confidence-weighted coordinates.
    """
    if not centroids:
        return []

    labels = set(c.get("label", "default") for c in centroids)
    merged: List[Dict[str, Any]] = []

    for label in labels:
        group = [dict(c) for c in centroids if c.get("label", "default") == label]
        used = [False] * len(group)

        for i in range(len(group)):
            if used[i]:
                continue
            cluster = [group[i]]
            used[i] = True

            p_i = np.array(group[i]["point"], dtype=float)
            for j in range(i + 1, len(group)):
                if used[j]:
                    continue
                p_j = np.array(group[j]["point"], dtype=float)
                if float(np.linalg.norm(p_i - p_j)) <= distance_threshold:
                    cluster.append(group[j])
                    used[j] = True

            weights = np.array([float(c.get("confidence", 1.0)) for c in cluster], dtype=float)
            total_weight = float(weights.sum()) if weights.sum() > 0 else 1.0
            points = np.array([c["point"] for c in cluster], dtype=float)
            merged_pt = (points * weights[:, None]).sum(axis=0) / total_weight

            best_item = max(cluster, key=lambda c: float(c.get("confidence", 1.0))).copy()
            best_item["point"] = (float(merged_pt[0]), float(merged_pt[1]))
            best_item["merged_count"] = len(cluster)
            merged.append(best_item)

    return merged


def stitch_polylines(
    polylines: List[List[Tuple[float, float]]],
    snap_distance: float = 15.0,
) -> List[List[Tuple[float, float]]]:
    """
    Stitches disconnected polyline segments from overlapping patches into continuous paths.

    Args:
        polylines: List of polyline coordinate sequences [[(x1, y1), (x2, y2), ...], ...].
        snap_distance: Maximum distance in pixels between endpoints to trigger stitching.

    Returns:
        List of consolidated, continuous polylines.
    """
    if not polylines:
        return []

    active_lines = [list(line) for line in polylines if len(line) >= 2]

    changed = True
    while changed:
        changed = False
        num_lines = len(active_lines)
        merged_i = -1
        merged_j = -1
        stitch_mode = None

        for i in range(num_lines):
            line_a = active_lines[i]
            tail_a = np.array(line_a[-1], dtype=float)
            head_a = np.array(line_a[0], dtype=float)

            for j in range(i + 1, num_lines):
                line_b = active_lines[j]
                tail_b = np.array(line_b[-1], dtype=float)
                head_b = np.array(line_b[0], dtype=float)

                if np.linalg.norm(tail_a - head_b) <= snap_distance:
                    merged_i, merged_j, stitch_mode = i, j, "tail_to_head"
                    break
                elif np.linalg.norm(tail_a - tail_b) <= snap_distance:
                    merged_i, merged_j, stitch_mode = i, j, "tail_to_tail"
                    break
                elif np.linalg.norm(head_a - head_b) <= snap_distance:
                    merged_i, merged_j, stitch_mode = i, j, "head_to_head"
                    break
                elif np.linalg.norm(head_a - tail_b) <= snap_distance:
                    merged_i, merged_j, stitch_mode = i, j, "head_to_tail"
                    break

            if stitch_mode is not None:
                break

        if stitch_mode is not None:
            a = active_lines[merged_i]
            b = active_lines[merged_j]
            if stitch_mode == "tail_to_head":
                combined = a + b
            elif stitch_mode == "tail_to_tail":
                combined = a + b[::-1]
            elif stitch_mode == "head_to_head":
                combined = a[::-1] + b
            elif stitch_mode == "head_to_tail":
                combined = b + a
            else:
                combined = a + b

            # Remove redundant consecutive identical points
            cleaned = [combined[0]]
            for pt in combined[1:]:
                if np.linalg.norm(np.array(pt) - np.array(cleaned[-1])) > 1e-4:
                    cleaned.append(pt)

            active_lines[merged_i] = cleaned
            active_lines.pop(merged_j)
            changed = True

    return active_lines


def stitch_patches(
    patches: List[Patch],
    full_shape: Union[Tuple[int, int], Tuple[int, int, int]],
    blend_mode: Literal["linear", "max", "replace"] = "linear",
) -> np.ndarray:
    """
    Reconstructs the full drawing from individual patches.

    Args:
        patches: List of Patch objects.
        full_shape: Target dimensions (Height, Width) or (Height, Width, Channels).
        blend_mode:
            - "linear": Accumulates 2D cosine/tent weighted pixels for seamless alpha feathering.
            - "max": Takes bitwise/intensity maximum (ideal for binary line skeletons).
            - "replace": Direct overwrite (fast, for non-overlapping grids).

    Returns:
        Reconstructed numpy image array matching full_shape and patch dtype.
    """
    if not patches:
        raise ValueError("Cannot stitch an empty list of patches.")

    if len(full_shape) == 2:
        H, W = full_shape
    else:
        H, W = full_shape[0], full_shape[1]

    first_patch = patches[0].image_array
    dtype = first_patch.dtype
    is_multichannel = (first_patch.ndim == 3)

    if blend_mode == "max":
        shape = (H, W, first_patch.shape[2]) if is_multichannel else (H, W)
        canvas = np.zeros(shape, dtype=dtype)
        for p in patches:
            y1, y2 = p.y_offset, p.y_offset + p.height
            x1, x2 = p.x_offset, p.x_offset + p.width
            canvas[y1:y2, x1:x2] = np.maximum(canvas[y1:y2, x1:x2], p.image_array)
        return canvas

    elif blend_mode == "linear":
        accum_shape = (H, W, first_patch.shape[2]) if is_multichannel else (H, W)
        accum = np.zeros(accum_shape, dtype=np.float32)
        weight_sum = np.zeros((H, W), dtype=np.float32)

        for p in patches:
            ph, pw = p.height, p.width
            wx = np.minimum(np.arange(pw), np.arange(pw)[::-1]) + 1.0
            wy = np.minimum(np.arange(ph), np.arange(ph)[::-1]) + 1.0
            w2d = np.outer(wy, wx).astype(np.float32)
            w2d /= w2d.max()

            y1, y2 = p.y_offset, p.y_offset + ph
            x1, x2 = p.x_offset, p.x_offset + pw

            weight_sum[y1:y2, x1:x2] += w2d
            if is_multichannel:
                accum[y1:y2, x1:x2] += p.image_array.astype(np.float32) * w2d[:, :, None]
            else:
                accum[y1:y2, x1:x2] += p.image_array.astype(np.float32) * w2d

        weight_sum = np.maximum(weight_sum, 1e-6)
        if is_multichannel:
            result = accum / weight_sum[:, :, None]
        else:
            result = accum / weight_sum

        return np.clip(np.round(result), 0, 255).astype(dtype)

    else:  # "replace"
        shape = (H, W, first_patch.shape[2]) if is_multichannel else (H, W)
        canvas = np.zeros(shape, dtype=dtype)
        for p in patches:
            y1, y2 = p.y_offset, p.y_offset + p.height
            x1, x2 = p.x_offset, p.x_offset + p.width
            canvas[y1:y2, x1:x2] = p.image_array
        return canvas
