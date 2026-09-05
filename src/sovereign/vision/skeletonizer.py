"""
Morphological Line Skeletonization and Topological Node Detection
Reduces process line drawings to 1-pixel centerlines and detects
T-junctions, cross-junctions, and line endpoints.
"""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None


@dataclass
class TopologicalPoint:
    x: int
    y: int
    point_type: str  # "endpoint", "tee_junction", "cross_junction", "corner"

    @property
    def coordinate(self) -> Tuple[int, int]:
        return (self.x, self.y)


@dataclass
class SkeletonPath:
    points: List[Tuple[int, int]]
    start_point: Optional[TopologicalPoint] = None
    end_point: Optional[TopologicalPoint] = None


def binarize_engineering_drawing(
    img: np.ndarray,
    threshold_val: int = 200,
    invert: bool = True
) -> np.ndarray:
    """Standardize drawing to white foreground (255) on black background (0)."""
    if img is None or not isinstance(img, np.ndarray) or img.size == 0 or len(img.shape) < 2 or 0 in img.shape:
        raise ValueError("Empty or invalid image array")

    if len(img.shape) == 3:
        if cv2:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.mean(axis=2).astype(np.uint8)
    else:
        gray = img.copy()

    if np.mean(gray) > 127:
        if cv2:
            _, binary = cv2.threshold(gray, threshold_val, 255, cv2.THRESH_BINARY_INV if invert else cv2.THRESH_BINARY)
        else:
            binary = ((gray < threshold_val) if invert else (gray >= threshold_val)).astype(np.uint8) * 255
    else:
        if cv2:
            _, binary = cv2.threshold(gray, 50, 255, cv2.THRESH_BINARY if invert else cv2.THRESH_BINARY_INV)
        else:
            binary = ((gray > 50) if invert else (gray <= 50)).astype(np.uint8) * 255

    return binary


def _cv2_morphological_skeleton(binary: np.ndarray) -> np.ndarray:
    """Fast native C++ morphological skeletonization using standard OpenCV."""
    skel = np.zeros(binary.shape, dtype=np.uint8)
    element = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    temp = np.empty(binary.shape, dtype=np.uint8)
    curr = binary.copy()

    while True:
        cv2.morphologyEx(curr, cv2.MORPH_OPEN, element, dst=temp)
        cv2.bitwise_not(temp, temp)
        cv2.bitwise_and(curr, temp, temp)
        cv2.bitwise_or(skel, temp, skel)
        cv2.erode(curr, element, dst=curr)
        if cv2.countNonZero(curr) == 0:
            break

    return skel


def _zhang_suen_thinning(binary_image: np.ndarray) -> np.ndarray:
    """Zhang-Suen morphological thinning fallback in numpy."""
    im = binary_image.copy() // 255
    prev = np.zeros_like(im)
    diff = 1

    while diff > 0:
        p2 = np.roll(im, -1, axis=0)
        p3 = np.roll(np.roll(im, -1, axis=0), 1, axis=1)
        p4 = np.roll(im, 1, axis=1)
        p5 = np.roll(np.roll(im, 1, axis=0), 1, axis=1)
        p6 = np.roll(im, 1, axis=0)
        p7 = np.roll(np.roll(im, 1, axis=0), -1, axis=1)
        p8 = np.roll(im, -1, axis=1)
        p9 = np.roll(np.roll(im, -1, axis=0), -1, axis=1)

        n_neighbors = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9

        transitions = (
            ((p2 == 0) & (p3 == 1)).astype(int) +
            ((p3 == 0) & (p4 == 1)).astype(int) +
            ((p4 == 0) & (p5 == 1)).astype(int) +
            ((p5 == 0) & (p6 == 1)).astype(int) +
            ((p6 == 0) & (p7 == 1)).astype(int) +
            ((p7 == 0) & (p8 == 1)).astype(int) +
            ((p8 == 0) & (p9 == 1)).astype(int) +
            ((p9 == 0) & (p2 == 1)).astype(int)
        )

        mask1 = (
            (im == 1) &
            (n_neighbors >= 2) & (n_neighbors <= 6) &
            (transitions == 1) &
            (p2 * p4 * p6 == 0) &
            (p4 * p6 * p8 == 0)
        )
        im[mask1] = 0

        p2 = np.roll(im, -1, axis=0)
        p3 = np.roll(np.roll(im, -1, axis=0), 1, axis=1)
        p4 = np.roll(im, 1, axis=1)
        p5 = np.roll(np.roll(im, 1, axis=0), 1, axis=1)
        p6 = np.roll(im, 1, axis=0)
        p7 = np.roll(np.roll(im, 1, axis=0), -1, axis=1)
        p8 = np.roll(im, -1, axis=1)
        p9 = np.roll(np.roll(im, -1, axis=0), -1, axis=1)

        n_neighbors = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9

        transitions = (
            ((p2 == 0) & (p3 == 1)).astype(int) +
            ((p3 == 0) & (p4 == 1)).astype(int) +
            ((p4 == 0) & (p5 == 1)).astype(int) +
            ((p5 == 0) & (p6 == 1)).astype(int) +
            ((p6 == 0) & (p7 == 1)).astype(int) +
            ((p7 == 0) & (p8 == 1)).astype(int) +
            ((p8 == 0) & (p9 == 1)).astype(int) +
            ((p9 == 0) & (p2 == 1)).astype(int)
        )

        mask2 = (
            (im == 1) &
            (n_neighbors >= 2) & (n_neighbors <= 6) &
            (transitions == 1) &
            (p2 * p4 * p8 == 0) &
            (p2 * p6 * p8 == 0)
        )
        im[mask2] = 0

        diff = np.count_nonzero(im != prev)
        prev = im.copy()

    return (im * 255).astype(np.uint8)


_zhang_suen_pure_numpy = _zhang_suen_thinning


def skeletonize_lines(image_or_patch, method: str = "auto") -> np.ndarray:
    """
    Perform morphological thinning on binary drawing to extract 1-pixel skeletons.
    Handles empty images, inverted backgrounds, and noise filtering.
    """
    if hasattr(image_or_patch, "image_array"):
        img = image_or_patch.image_array
    else:
        img = image_or_patch

    if img is None:
        raise ValueError("Invalid image input")

    if len(img.shape) == 3:
        if cv2:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.mean(axis=2).astype(np.uint8)
    else:
        gray = img.copy()

    min_val, max_val = int(gray.min()), int(gray.max())
    if min_val == max_val:
        return np.zeros_like(gray, dtype=np.uint8)

    binary = binarize_engineering_drawing(gray)

    if cv2 and cv2.countNonZero(binary) == 0:
        return np.zeros_like(gray, dtype=np.uint8)
    elif np.count_nonzero(binary) == 0:
        return np.zeros_like(gray, dtype=np.uint8)

    # Morphological open
    if cv2:
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    if method == "numpy" or not cv2:
        skeleton = _zhang_suen_thinning(binary)
    else:
        if hasattr(cv2, "ximgproc") and hasattr(cv2.ximgproc, "thinning"):
            skeleton = cv2.ximgproc.thinning(binary, thinningType=cv2.ximgproc.THINNING_ZHANGSUEN)
        else:
            skeleton = _cv2_morphological_skeleton(binary)

    return skeleton


def compute_crossing_number(bin_skel: np.ndarray) -> np.ndarray:
    """Compute Rutovitz crossing number for 8-neighborhood safely without edge wrap-around.
    CN = 0.5 * sum(|p_{i} - p_{i+1}|) for 8 neighbors in clockwise order around each pixel.
    """
    im = (bin_skel > 0).astype(np.uint8)
    padded = np.pad(im, 1, mode='constant', constant_values=0)

    # Clockwise 8-neighbors around pixel (y, x):
    # p2: Top, p3: Top-Right, p4: Right, p5: Bottom-Right,
    # p6: Bottom, p7: Bottom-Left, p8: Left, p9: Top-Left
    p2 = padded[0:-2, 1:-1]
    p3 = padded[0:-2, 2:]
    p4 = padded[1:-1, 2:]
    p5 = padded[2:,   2:]
    p6 = padded[2:,   1:-1]
    p7 = padded[2:,   0:-2]
    p8 = padded[1:-1, 0:-2]
    p9 = padded[0:-2, 0:-2]

    neighbors = [p2, p3, p4, p5, p6, p7, p8, p9, p2]
    diff_sum = np.zeros_like(im, dtype=np.float32)
    for i in range(8):
        diff_sum += np.abs(neighbors[i].astype(np.float32) - neighbors[i + 1].astype(np.float32))
    cn = (0.5 * diff_sum).astype(np.uint8)
    cn[im == 0] = 0
    return cn


def find_junctions_and_endpoints(skeleton: np.ndarray) -> Tuple[List[Tuple[int, int]], List[Tuple[int, int]]]:
    """
    Detect 3-way/4-way junctions and 1-way pipe endpoints from skeletonized lines.
    Returns (junctions, endpoints) as lists of (x, y) coordinates.
    """
    if np.count_nonzero(skeleton) == 0:
        return [], []

    bin_skel = (skeleton > 0).astype(np.uint8)
    cn = compute_crossing_number(bin_skel)

    endpoint_mask = (bin_skel == 1) & (cn == 1)
    ep_y, ep_x = np.where(endpoint_mask)
    raw_endpoints = list(zip(ep_x.tolist(), ep_y.tolist()))

    junction_mask = (bin_skel == 1) & (cn >= 3)
    j_y, j_x = np.where(junction_mask)
    raw_junctions = list(zip(j_x.tolist(), j_y.tolist()))

    clustered_junctions: List[Tuple[int, int]] = []
    for x, y in raw_junctions:
        if not any((abs(x - cx) <= 8 and abs(y - cy) <= 8) for cx, cy in clustered_junctions):
            clustered_junctions.append((x, y))

    clustered_endpoints: List[Tuple[int, int]] = []
    for x, y in raw_endpoints:
        if not any((abs(x - cx) <= 8 and abs(y - cy) <= 8) for cx, cy in clustered_endpoints):
            if not any((abs(x - jx) <= 8 and abs(y - jy) <= 8) for jx, jy in clustered_junctions):
                clustered_endpoints.append((x, y))

    return clustered_junctions, clustered_endpoints


def _rdp_pure_numpy(points: List[Tuple[int, int]], epsilon: float = 2.0) -> List[Tuple[int, int]]:
    """Ramer-Douglas-Peucker line simplification algorithm."""
    if len(points) <= 2:
        return points

    dmax = 0.0
    index = 0
    p1 = np.array(points[0])
    p2 = np.array(points[-1])
    line_vec = p2 - p1
    line_len = float(np.linalg.norm(line_vec))

    for i in range(1, len(points) - 1):
        p = np.array(points[i])
        if line_len == 0:
            d = float(np.linalg.norm(p - p1))
        else:
            d = float(abs(line_vec[0] * (p1[1] - p[1]) - line_vec[1] * (p1[0] - p[0]))) / line_len
        if d > dmax:
            index = i
            dmax = d

    if dmax > epsilon:
        rec_results1 = _rdp_pure_numpy(points[:index + 1], epsilon)
        rec_results2 = _rdp_pure_numpy(points[index:], epsilon)
        return rec_results1[:-1] + rec_results2
    else:
        return [points[0], points[-1]]


def simplify_polyline(points: List[Tuple[int, int]], epsilon: float = 2.0) -> List[Tuple[int, int]]:
    return _rdp_pure_numpy(points, epsilon)


def trace_skeleton_paths(
    skeleton: np.ndarray,
    junctions: Optional[List[Tuple[int, int]]] = None,
    endpoints: Optional[List[Tuple[int, int]]] = None,
    epsilon: float = 1.5,
    min_length: float = 5.0
) -> List[Dict[str, Any]]:
    """Traces connected branches in skeleton from junction to junction or endpoint."""
    if junctions is None or endpoints is None:
        juncs, ends = find_junctions_and_endpoints(skeleton)
        junctions = junctions if junctions is not None else juncs
        endpoints = endpoints if endpoints is not None else ends

    bin_skel = (skeleton > 0).astype(np.uint8)
    y_idxs, x_idxs = np.where(bin_skel > 0)
    if len(y_idxs) == 0:
        return []

    import networkx as nx
    pixel_set = set(zip(x_idxs.tolist(), y_idxs.tolist()))
    pixel_graph = nx.Graph()
    for x, y in pixel_set:
        pixel_graph.add_node((x, y))
        for dx, dy in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
            nx_pt = (x + dx, y + dy)
            if nx_pt in pixel_set and nx_pt > (x, y):
                pixel_graph.add_edge((x, y), nx_pt)

    # Key pixels
    key_pixels = set()
    for pt in junctions + endpoints:
        px, py = int(round(pt[0])), int(round(pt[1]))
        best_p, min_d = None, float('inf')
        for dx in range(-5, 6):
            for dy in range(-5, 6):
                cand = (px + dx, py + dy)
                if cand in pixel_set:
                    d = (dx * dx + dy * dy) ** 0.5
                    if d < min_d:
                        min_d, best_p = d, cand
        if best_p:
            key_pixels.add(best_p)

    for node, deg in pixel_graph.degree():
        if deg != 2:
            key_pixels.add(node)

    visited_edges = set()
    paths: List[Dict[str, Any]] = []
    run_idx = 0

    for start_node in key_pixels:
        for neighbor in pixel_graph.neighbors(start_node):
            edge = tuple(sorted([start_node, neighbor]))
            if edge in visited_edges:
                continue

            branch = [start_node, neighbor]
            visited_edges.add(edge)
            curr, prev = neighbor, start_node

            while curr not in key_pixels:
                next_neighbors = [n for n in pixel_graph.neighbors(curr) if n != prev]
                if not next_neighbors:
                    break
                next_node = next_neighbors[0]
                e = tuple(sorted([curr, next_node]))
                visited_edges.add(e)
                branch.append(next_node)
                prev, curr = curr, next_node

            length = sum(
                np.linalg.norm(np.array(branch[i + 1]) - np.array(branch[i]))
                for i in range(len(branch) - 1)
            )
            if length >= min_length:
                simplified = simplify_polyline(branch, epsilon=epsilon)
                paths.append({
                    'id': f'run_{run_idx}',
                    'points': simplified,
                    'euclidean_length': float(length),
                    'start_node': branch[0],
                    'end_node': branch[-1],
                })
                run_idx += 1

    return paths
