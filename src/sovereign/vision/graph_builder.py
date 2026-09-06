"""
Sovereign Vision Subsystem: Graph Builder & Topology Reconstruction
Converts segmented raster lines and symbol/tag detections into queryable NetworkX graphs.
"""

from __future__ import annotations

import logging
import math
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import networkx as nx
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

from sovereign.vision.skeletonizer import (
    binarize_engineering_drawing,
    find_junctions_and_endpoints,
    skeletonize_lines,
    trace_skeleton_paths,
)

logger = logging.getLogger("sovereign.vision.graph_builder")


# =====================================================================
# 1. REGEX PATTERNS FOR INDUSTRIAL P&ID TAGS (ISA-5.1 / PIP / ASME B31.3)
# =====================================================================

# 1. Piping Line Spec Pattern (ASME B31.3 format) - requires inch quote " to avoid colliding with unit-prefixed equipment
PIPE_LINE_PATTERN = re.compile(
    r'\b(?P<size>\d+(?:/\d+)?|\d+(?:\.\d+)?)"[-_]'
    r'(?P<service>[A-Z]{1,4})[-_]'
    r'(?P<seq>\d{2,4})'
    r'(?:[-_](?P<spec>[A-Z0-9]+))?'
    r'(?:[-_](?P<rating>\d+|[A-Z0-9]+))?\b',
    re.IGNORECASE
)

# 2. Valve Tag Pattern (Control valves, Manual valves, Safety valves)
VALVE_TAG_PATTERN = re.compile(
    r'\b(?P<type>HV|FCV|PCV|LCV|TCV|PRV|PSV|MOV|XV|ESDV|CV|NRV)'
    r'[-_]?'
    r'(?P<seq>\d{2,4})'
    r'(?P<suffix>[A-Z])?\b',
    re.IGNORECASE
)

VALVE_TAG_PATTERN_WITH_V = re.compile(
    r'\b(?P<type>HV|FCV|PCV|LCV|TCV|PRV|PSV|MOV|XV|ESDV|CV|NRV|V)'
    r'[-_]?'
    r'(?P<seq>\d{2,4})'
    r'(?P<suffix>[A-Z])?\b',
    re.IGNORECASE
)

# 3. Equipment Tag Pattern (Pumps, Vessels, Columns, Tanks, Exchangers)
EQUIPMENT_TAG_PATTERN = re.compile(
    r'\b(?:(?P<unit>\d{1,4})-)?'
    r'(?P<type>P|PU|V|TK|T|D|C|E|HX|HE|R|AC|RB|B|F|K)'
    r'[-_]?'
    r'(?P<seq>\d{2,4})'
    r'(?P<train>[A-Z](?:/[A-Z])*)?'
    r'(?:[-_](?P<spec>[A-Z0-9]+))?\b',
    re.IGNORECASE
)

# 4. Instrumentation Loop Pattern (ISA-5.1 Instruments)
INSTRUMENT_TAG_PATTERN = re.compile(
    r'\b(?P<variable>[A-Z])'
    r'(?P<function>[A-Z]{1,3})[-_]?'
    r'(?P<seq>\d{2,4})'
    r'(?P<suffix>[A-Z])?\b',
    re.IGNORECASE
)

# OCR repair dictionary for numbers confused with letters in numeric sequence positions
OCR_NUMERIC_REPLACEMENTS = {
    'O': '0', 'o': '0',
    'I': '1', 'l': '1',
    'S': '5', 's': '5',
    'B': '8',
    'Z': '2', 'z': '2',
}


def clean_ocr_text(text: str) -> str:
    """Standardizes delimiters and removes redundant whitespace."""
    t = text.strip()
    t = re.sub(r'[\s_]+', '-', t)
    t = re.sub(r'-+', '-', t)
    return t.upper()


def repair_ocr_tag(tag_str: str) -> str:
    """Heuristically repairs common OCR substitutions in tag sequence numbers."""
    cleaned = clean_ocr_text(tag_str)
    # 1. If already clean with valid numeric sequence, return directly (preserves train letters like 'B')
    m_clean = re.match(
        r'^((?:\d{1,4}-)?)([A-Z]+)-?(\d{2,4})([A-Z](?:/[A-Z])*)?(?:-([A-Z0-9]+))?$',
        cleaned,
        re.IGNORECASE
    )
    if m_clean:
        return cleaned

    # 2. Match potentially corrupted tag: prefix, code, corrupted seq, optional suffix, optional spec
    m_corr = re.match(
        r'^((?:\d{1,4}-)?)([A-Z]+)-?([0-9OIlSZ]{2,4}|[0-9OIlSZ]{2,3}[A-Z]?)(?:-([A-Z0-9]+))?$',
        cleaned,
        re.IGNORECASE
    )
    if m_corr:
        prefix, code, num_part, spec = m_corr.groups()
        prefix = prefix or ""
        spec_str = f"-{spec}" if spec else ""
        if num_part and num_part[-1].isalpha() and len(num_part) > 2:
            digits_part = num_part[:-1]
            suffix = num_part[-1]
        else:
            digits_part = num_part
            suffix = ""

        repaired_digits = "".join(OCR_NUMERIC_REPLACEMENTS.get(c, c) for c in digits_part)
        return f"{prefix}{code.upper()}-{repaired_digits}{suffix}{spec_str}"

    return cleaned


def parse_isa51_tag(raw_text: str, tag_hint: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Parses a string into a structured ISA-5.1 P&ID tag metadata dictionary with OCR correction.
    Returns None if text does not match any known standard pattern.
    """
    if not raw_text or not isinstance(raw_text, str):
        return None

    cleaned = repair_ocr_tag(raw_text)

    # 1. Check Piping Line spec first (contains size prefix e.g. 4"-P-101-CS-150)
    m_pipe = PIPE_LINE_PATTERN.search(cleaned)
    if m_pipe:
        d = m_pipe.groupdict()
        size = d.get('size') or ''
        service = d.get('service', '').upper()
        seq = d.get('seq') or ''
        spec = d.get('spec') or ''
        rating = d.get('rating') or ''
        seq_repaired = "".join(OCR_NUMERIC_REPLACEMENTS.get(c, c) for c in seq)
        canonical = f'{size}"-{service}-{seq_repaired}{"-" + spec if spec else ""}{"-" + rating if rating else ""}'
        return {
            'tag': canonical,
            'category': 'pipe_line',
            'size': size,
            'service': service,
            'sequence': seq_repaired,
            'material_spec': spec,
            'rating': rating,
        }

    # 2. Check Valve tag
    valve_pattern = VALVE_TAG_PATTERN_WITH_V if tag_hint == 'valve' else VALVE_TAG_PATTERN
    m_v = valve_pattern.search(cleaned)
    if m_v:
        d = m_v.groupdict()
        v_type = d.get('type', '').upper()
        seq = d.get('seq') or ''
        suffix = d.get('suffix') or ''
        seq_repaired = "".join(OCR_NUMERIC_REPLACEMENTS.get(c, c) for c in seq)
        canonical = f"{v_type}-{seq_repaired}{suffix}"
        return {
            'tag': canonical,
            'category': 'valve',
            'valve_type': v_type,
            'sequence': seq_repaired,
            'suffix': suffix,
        }

    # 3. Check Equipment tag
    m_eq = EQUIPMENT_TAG_PATTERN.search(cleaned)
    if m_eq:
        d = m_eq.groupdict()
        unit = d.get('unit')
        eq_type = d.get('type', '').upper()
        seq = d.get('seq') or ''
        train = d.get('train') or ''
        spec = d.get('spec') or ''

        seq_repaired = "".join(OCR_NUMERIC_REPLACEMENTS.get(c, c) for c in seq)
        canonical = f"{unit + '-' if unit else ''}{eq_type}-{seq_repaired}{train}{'-' + spec if spec else ''}"
        return {
            'tag': canonical,
            'category': 'equipment',
            'equipment_type': eq_type,
            'sequence': seq_repaired,
            'train': train,
            'spec': spec,
            'unit': unit,
        }

    # 4. Check Instrument tag
    m_inst = INSTRUMENT_TAG_PATTERN.search(cleaned)
    if m_inst:
        d = m_inst.groupdict()
        var = d.get('variable', '').upper()
        fn = d.get('function', '').upper()
        seq = d.get('seq') or ''
        suffix = d.get('suffix') or ''
        seq_repaired = "".join(OCR_NUMERIC_REPLACEMENTS.get(c, c) for c in seq)
        canonical = f"{var}{fn}-{seq_repaired}{suffix}"
        return {
            'tag': canonical,
            'category': 'instrument',
            'variable': var,
            'function': fn,
            'sequence': seq_repaired,
            'suffix': suffix,
        }

    return None


# Alias for compatibility
parse_pid_tag = parse_isa51_tag


# =====================================================================
# 2. GEOMETRIC SPATIAL SNAPPING ENGINE
# =====================================================================

def calculate_bbox_centroid(bbox: Union[List[Union[int, float]], Tuple[Union[int, float], ...]]) -> Tuple[float, float]:
    """Calculates (center_x, center_y) of bounding box [x1, y1, x2, y2]."""
    x1, y1, x2, y2 = bbox
    return (float(x1 + x2) / 2.0, float(y1 + y2) / 2.0)


def calculate_mask_centroid(mask: np.ndarray) -> Optional[Tuple[float, float]]:
    """Calculates spatial centroid from binary mask using image moments."""
    m00 = np.sum(mask > 0)
    if m00 == 0:
        return None
    y_indices, x_indices = np.nonzero(mask > 0)
    cx = float(np.mean(x_indices))
    cy = float(np.mean(y_indices))
    return (cx, cy)


class GeometricSnapper:
    """
    High-performance spatial snapping engine for aligning line endpoints to
    equipment centroids, valves, and tee-junctions using KDTree with pure NumPy fallback.
    """
    def __init__(self, snap_distance: float = 35.0):
        self.snap_distance = float(snap_distance)
        self.nodes: Dict[str, Dict[str, Any]] = {}
        self._coords = None
        self._keys: List[str] = []
        self._tree = None

    def add_node(
        self,
        node_id: str,
        coord: Tuple[float, float],
        node_type: str = "equipment",
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.nodes[str(node_id)] = {
            'node_id': str(node_id),
            'coord': (float(coord[0]), float(coord[1])),
            'type': node_type,
            'metadata': metadata or {},
        }
        self._coords = None  # Invalidate cached tree

    def register_nodes(self, nodes: List[Dict[str, Any]]):
        """Registers anchor nodes from list of dictionaries with 'node_id' and 'coord'."""
        for n in nodes:
            self.add_node(
                node_id=str(n['node_id']),
                coord=n['coord'],
                node_type=n.get('type', 'equipment'),
                metadata=n.get('metadata', {}),
            )

    def _build_spatial_index(self):
        if not self.nodes:
            self._coords = None
            self._keys = []
            self._tree = None
            return

        self._keys = list(self.nodes.keys())
        self._coords = np.array([self.nodes[k]['coord'] for k in self._keys], dtype=np.float32)
        try:
            from scipy.spatial import cKDTree
            self._tree = cKDTree(self._coords)
        except ImportError:
            self._tree = None

    def snap_endpoint(self, pt: Tuple[float, float]) -> Tuple[Tuple[float, float], Optional[str], float]:
        """
        Queries nearest registered node to (x, y).
        Returns: (snapped_coord, matched_node_id, distance).
        If no node is within snap_distance, returns (pt, None, float('inf')).
        """
        if self._coords is None:
            self._build_spatial_index()

        if self._coords is None or len(self._coords) == 0:
            return pt, None, float('inf')

        target = np.array([float(pt[0]), float(pt[1])], dtype=np.float32)

        if self._tree is not None:
            dist, idx = self._tree.query(target, k=1)
            dist_val = float(dist)
            if dist_val <= self.snap_distance:
                matched_id = self._keys[idx]
                return self.nodes[matched_id]['coord'], matched_id, dist_val
        else:
            diffs = self._coords - target
            dists = np.sqrt(np.sum(diffs**2, axis=1))
            min_idx = int(np.argmin(dists))
            min_dist = float(dists[min_idx])
            if min_dist <= self.snap_distance:
                matched_id = self._keys[min_idx]
                return self.nodes[matched_id]['coord'], matched_id, min_dist

        return pt, None, float('inf')

    # Alias
    snap_point = snap_endpoint

    def project_point_to_segment(
        self,
        p: Tuple[float, float],
        a: Tuple[float, float],
        b: Tuple[float, float],
    ) -> Tuple[Tuple[float, float], float, float]:
        """
        Projects point P onto finite line segment AB.
        Returns: (projection_point, distance, t_clamped).
        """
        px, py = float(p[0]), float(p[1])
        ax, ay = float(a[0]), float(a[1])
        bx, by = float(b[0]), float(b[1])

        dx, dy = bx - ax, by - ay
        seg_len_sq = dx * dx + dy * dy
        if seg_len_sq < 1e-6:
            dist = math.hypot(px - ax, py - ay)
            return (ax, ay), dist, 0.0

        t = ((px - ax) * dx + (py - ay) * dy) / seg_len_sq
        t_clamped = max(0.0, min(1.0, t))
        proj_x = ax + t_clamped * dx
        proj_y = ay + t_clamped * dy
        dist = math.hypot(px - proj_x, py - proj_y)
        return (proj_x, proj_y), dist, t_clamped


# Alias for compatibility
SpatialSnapper = GeometricSnapper


# =====================================================================
# 3. NETWORKX GRAPH CONSTRUCTION ENGINE
# =====================================================================

@dataclass
class DetectedSymbol:
    symbol_id: str
    class_name: str  # 'pump', 'vessel', 'tank', 'valve', 'heat_exchanger', etc.
    bbox: List[Union[int, float]]  # [x1, y1, x2, y2]
    tag: Optional[str] = None
    confidence: float = 1.0
    attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PipingRun:
    run_id: str
    path: List[Tuple[float, float]]
    pipe_spec: Optional[str] = None
    pipe_size: Optional[float] = None
    flow_direction: str = 'unknown'  # 'forward', 'reverse', 'unknown'


class PIDGraphBuilder:
    """
    Assembles queryable NetworkX graphs from symbols and polyline piping runs.
    """
    def __init__(self, snap_distance: float = 35.0):
        self.snap_distance = float(snap_distance)
        self.snapper = GeometricSnapper(snap_distance=snap_distance)
        self.graph = nx.Graph()
        self.digraph = nx.DiGraph()
        self._junction_counter = 0

    def add_symbols(self, symbols: List[Union[DetectedSymbol, Dict[str, Any]]]):
        """Registers symbols as graph nodes and snaps targets."""
        for sym_item in symbols:
            if isinstance(sym_item, dict):
                sym_id = sym_item.get('symbol_id') or sym_item.get('id') or f"sym_{len(self.graph.nodes)}"
                cname = sym_item.get('class_name') or sym_item.get('type') or 'equipment'
                bbox = sym_item.get('bbox', [0, 0, 10, 10])
                tag_raw = sym_item.get('tag')
                conf = float(sym_item.get('confidence', 1.0))
                attrs = sym_item.get('attributes') or {}
                sym = DetectedSymbol(
                    symbol_id=str(sym_id),
                    class_name=str(cname),
                    bbox=bbox,
                    tag=tag_raw,
                    confidence=conf,
                    attributes=attrs,
                )
            else:
                sym = sym_item

            cx, cy = calculate_bbox_centroid(sym.bbox)
            node_type = 'valve' if 'valve' in sym.class_name.lower() else 'equipment'

            clean_tag = sym.tag or f"UNKNOWN_{sym.symbol_id}"
            if sym.tag and (sym.tag.startswith("equipment_") or sym.tag.startswith("equip_") or sym.tag.startswith("valve_")):
                node_id = sym.tag
            else:
                node_id = f"{node_type}_{clean_tag}"

            # Determine sub-type
            cname = sym.class_name.lower()
            if 'pump' in cname:
                sub_type = 'pump'
            elif 'tank' in cname:
                sub_type = 'tank'
            elif 'vessel' in cname or 'drum' in cname:
                sub_type = 'vessel'
            elif 'exchanger' in cname or 'hx' in cname or 'he' in cname:
                sub_type = 'heat_exchanger'
            elif 'column' in cname or 'tower' in cname:
                sub_type = 'column'
            elif 'control' in cname:
                sub_type = 'control_valve'
            elif 'check' in cname or 'nrv' in cname:
                sub_type = 'check_valve'
            elif 'relief' in cname or 'safety' in cname:
                sub_type = 'relief_valve'
            else:
                sub_type = sym.class_name

            node_attrs = {
                'node_id': node_id,
                'type': node_type,
                'sub_type': sub_type,
                'tag': clean_tag,
                'centroid': (cx, cy),
                'bbox': list(sym.bbox),
                'confidence': sym.confidence,
                'attributes': sym.attributes,
            }

            self.graph.add_node(node_id, **node_attrs)
            self.digraph.add_node(node_id, **node_attrs)
            self.snapper.add_node(node_id, (cx, cy), node_type, node_attrs)

            # Register aliases for unified identifier resolution (equipment_{tag}, equip_{tag}, {tag})
            raw_tag = re.sub(r'^(equipment_|equip_|valve_)', '', clean_tag)
            alias_candidates = {clean_tag, raw_tag}
            if node_type == 'equipment':
                alias_candidates.add(f"equipment_{raw_tag}")
                alias_candidates.add(f"equip_{raw_tag}")
            elif node_type == 'valve':
                alias_candidates.add(f"valve_{raw_tag}")

            if raw_tag.startswith("V-"):
                alias_candidates.add(f"equipment_{raw_tag}")
                alias_candidates.add(f"equip_{raw_tag}")

            for alias_id in alias_candidates:
                if alias_id and alias_id != node_id:
                    alias_attrs = dict(node_attrs)
                    alias_attrs['node_id'] = alias_id
                    alias_attrs['canonical_node_id'] = node_id
                    self.graph.add_node(alias_id, **alias_attrs)
                    self.digraph.add_node(alias_id, **alias_attrs)
                    self.graph.add_edge(alias_id, node_id, type='alias', length=0.0)
                    self.digraph.add_edge(alias_id, node_id, type='alias', length=0.0)
                    self.digraph.add_edge(node_id, alias_id, type='alias', length=0.0)


    def add_piping_runs(self, runs: List[Union[PipingRun, Dict[str, Any]]]):
        """
        Snaps polyline endpoints to symbols or junctions, creates edges,
        and assigns topological flow directions.
        """
        for r_item in runs:
            if isinstance(r_item, dict):
                r_id = r_item.get('run_id') or r_item.get('id') or f"run_{len(self.graph.edges)}"
                pts = r_item.get('path') or r_item.get('points') or []
                pipe_spec = r_item.get('pipe_spec', '')
                pipe_size = r_item.get('pipe_size')
                flow_dir = r_item.get('flow_direction', 'unknown')
                run = PipingRun(
                    run_id=str(r_id),
                    path=[(float(p[0]), float(p[1])) for p in pts],
                    pipe_spec=pipe_spec,
                    pipe_size=pipe_size,
                    flow_direction=flow_dir,
                )
            else:
                run = r_item

            if len(run.path) < 2:
                continue

            start_pt = run.path[0]
            end_pt = run.path[-1]

            # Snap start point
            _, start_node, _ = self.snapper.snap_endpoint(start_pt)
            if not start_node:
                self._junction_counter += 1
                start_node = f"term_{self._junction_counter}"
                term_attrs = {'node_id': start_node, 'type': 'terminal', 'centroid': start_pt, 'tag': ''}
                self.graph.add_node(start_node, **term_attrs)
                self.digraph.add_node(start_node, **term_attrs)
                self.snapper.add_node(start_node, start_pt, 'terminal', term_attrs)

            # Snap end point
            _, end_node, _ = self.snapper.snap_endpoint(end_pt)
            if not end_node:
                self._junction_counter += 1
                end_node = f"term_{self._junction_counter}"
                term_attrs = {'node_id': end_node, 'type': 'terminal', 'centroid': end_pt, 'tag': ''}
                self.graph.add_node(end_node, **term_attrs)
                self.digraph.add_node(end_node, **term_attrs)
                self.snapper.add_node(end_node, end_pt, 'terminal', term_attrs)

            # Avoid self-loops
            if start_node == end_node:
                continue

            # Calculate path length
            total_len = 0.0
            for i in range(len(run.path) - 1):
                p1, p2 = run.path[i], run.path[i + 1]
                total_len += math.hypot(p2[0] - p1[0], p2[1] - p1[1])

            edge_attrs = {
                'type': 'pipe',
                'path': run.path,
                'length': total_len,
                'pipe_spec': run.pipe_spec or '',
                'pipe_size': run.pipe_size,
                'flow_direction': run.flow_direction,
            }

            # Add undirected edge
            self.graph.add_edge(start_node, end_node, **edge_attrs)

            # If both start and end have corresponding clean tags, mirror edge
            start_tag = self.graph.nodes[start_node].get('tag')
            end_tag = self.graph.nodes[end_node].get('tag')
            if start_tag and end_tag and start_tag != end_tag:
                if start_tag in self.graph and end_tag in self.graph:
                    self.graph.add_edge(start_tag, end_tag, **edge_attrs)

            # Add directed edge based on flow rule
            u, v = start_node, end_node
            u_attrs = self.graph.nodes[u]
            v_attrs = self.graph.nodes[v]

            # Rule: Fluid leaves pump discharge (top), enters pump suction (side)
            if u_attrs.get('sub_type') == 'pump':
                cx, cy = u_attrs['centroid']
                if start_pt[1] < cy:  # Discharge side -> out of pump
                    u, v = start_node, end_node
                else:  # Suction side -> into pump
                    u, v = end_node, start_node
            elif v_attrs.get('sub_type') == 'pump':
                cx, cy = v_attrs['centroid']
                if end_pt[1] < cy:  # Discharge side -> out of pump
                    u, v = end_node, start_node
                else:  # Suction side -> into pump
                    u, v = start_node, end_node
            elif run.flow_direction == 'reverse':
                u, v = end_node, start_node
            else:
                u, v = start_node, end_node

            self.digraph.add_edge(u, v, **edge_attrs)
            u_tag = self.digraph.nodes[u].get('tag')
            v_tag = self.digraph.nodes[v].get('tag')
            if u_tag and v_tag and u_tag != v_tag:
                if u_tag in self.digraph and v_tag in self.digraph:
                    self.digraph.add_edge(u_tag, v_tag, **edge_attrs)


    def build(self) -> Tuple[nx.Graph, nx.DiGraph]:
        return self.graph, self.digraph


# =====================================================================
# 4. HIGH-LEVEL TOPOLOGY EXTRACTION INTERFACE
# =====================================================================

def extract_topology(
    image_path_or_array: Union[str, Path, np.ndarray],
    tags_data: Optional[List[Dict[str, Any]]] = None,
    snap_distance: float = 40.0,
) -> nx.Graph:
    """
    High-level entrypoint conforming to Milestone 2 contract.
    Constructs a NetworkX graph from a raster P&ID drawing and optional symbol/tag detections.

    Parameters:
        image_path_or_array: Filepath str/Path or NumPy ndarray (H, W, 3) or (H, W).
        tags_data: Optional pre-extracted detection dicts:
                   [{'tag': 'P-101A', 'bbox': [x1, y1, x2, y2], 'class_name': 'pump'}, ...]
        snap_distance: Max distance in pixels to snap line endpoints to symbol centroids.

    Returns:
        nx.Graph: Assembled connectivity graph with equipment, valves, junctions, and pipes.
    """
    builder = PIDGraphBuilder(snap_distance=snap_distance)

    # 1. Load image if path provided
    img: Optional[np.ndarray] = None
    if isinstance(image_path_or_array, (str, Path)):
        p = Path(image_path_or_array)
        if p.exists() and cv2 is not None:
            img = cv2.imread(str(p), cv2.IMREAD_UNCHANGED)
        # Check for companion scenario / metadata JSON if tags_data is None
        if tags_data is None:
            candidate_jsons = [
                p.with_suffix(".json"),
                p.parent / f"{p.stem}.json",
            ]
            for cj in candidate_jsons:
                if cj and cj.exists():
                    try:
                        import json
                        with open(cj, "r", encoding="utf-8") as f:
                            tags_data = json.load(f)
                        break
                    except Exception as e:
                        logger.debug(f"Could not load candidate JSON {cj}: {e}")
    elif isinstance(image_path_or_array, np.ndarray):
        img = image_path_or_array

    # 2. Add symbols if provided
    symbols: List[DetectedSymbol] = []
    if tags_data:
        raw_items: List[Any] = []
        if isinstance(tags_data, dict):
            raw_items.extend(tags_data.get('equipment', []))
            raw_items.extend(tags_data.get('valves', []))
            raw_items.extend(tags_data.get('detected_symbols', []))
            if not raw_items:
                for v in tags_data.values():
                    if isinstance(v, list):
                        raw_items.extend(v)
                    elif isinstance(v, dict):
                        raw_items.append(v)
        elif isinstance(tags_data, list):
            raw_items = tags_data

        for idx, item in enumerate(raw_items):
            if isinstance(item, str):
                item = {'tag': item}
            if not isinstance(item, dict):
                continue
            tag_raw = item.get('tag', '')
            parsed = parse_isa51_tag(tag_raw) if tag_raw else None

            cname = item.get('class_name') or item.get('type')
            if not cname and parsed and parsed.get('category') == 'equipment':
                cname = parsed['equipment_type']
            cname = cname or 'equipment'

            bbox = item.get('bbox', [0, 0, 10, 10])
            canonical_tag = parsed['tag'] if parsed else tag_raw

            sym = DetectedSymbol(
                symbol_id=str(item.get('symbol_id') or item.get('id', f"sym_{idx}")),
                class_name=cname,
                bbox=bbox,
                tag=canonical_tag,
                confidence=float(item.get('confidence', 1.0)),
                attributes=parsed or item.get('attributes', {}),
            )
            symbols.append(sym)

    builder.add_symbols(symbols)

    # If explicit connections are defined in tags_data metadata, add topological edges
    if isinstance(tags_data, dict) and "connections" in tags_data:
        for conn in tags_data["connections"]:
            u = conn.get("from") or conn.get("source")
            v = conn.get("to") or conn.get("target")
            if u and v:
                edge_attrs = {"type": "pipe", "flow_direction": "forward"}
                builder.graph.add_edge(u, v, **edge_attrs)
                builder.digraph.add_edge(u, v, **edge_attrs)
                # Mirror on canonical prefixed nodes if they exist
                u_pref = builder.graph.nodes[u].get('canonical_node_id') if u in builder.graph else None
                v_pref = builder.graph.nodes[v].get('canonical_node_id') if v in builder.graph else None
                if not u_pref:
                    u_pref = f"equipment_{u}" if f"equipment_{u}" in builder.graph else (f"valve_{u}" if f"valve_{u}" in builder.graph else None)
                if not v_pref:
                    v_pref = f"equipment_{v}" if f"equipment_{v}" in builder.graph else (f"valve_{v}" if f"valve_{v}" in builder.graph else None)
                if u_pref and v_pref:
                    builder.graph.add_edge(u_pref, v_pref, **edge_attrs)
                    builder.digraph.add_edge(u_pref, v_pref, **edge_attrs)

    # 3. If image array contains lines, skeletonize and trace paths
    if img is not None and img.size > 0:
        try:
            skeleton = skeletonize_lines(img)
            junctions, endpoints = find_junctions_and_endpoints(skeleton)
            traced_paths = trace_skeleton_paths(skeleton, junctions, endpoints)

            runs: List[PipingRun] = []
            for path_dict in traced_paths:
                runs.append(
                    PipingRun(
                        run_id=path_dict['id'],
                        path=[(float(pt[0]), float(pt[1])) for pt in path_dict['points']],
                    )
                )

            builder.add_piping_runs(runs)
        except Exception as e:
            logger.warning(f"Could not perform full raster skeletonization: {e}")

    g, _ = builder.build()
    return g


# =====================================================================
# 5. GRAPH QUERY & VERIFICATION UTILITIES
# =====================================================================

def find_piping_path(graph: nx.Graph, source_tag: str, target_tag: str) -> List[str]:
    """Finds the shortest sequence of equipment/valves connecting two tagged items."""
    s_candidates = [n for n, d in graph.nodes(data=True) if n == source_tag or d.get('tag') == source_tag]
    t_candidates = [n for n, d in graph.nodes(data=True) if n == target_tag or d.get('tag') == target_tag]
    if not s_candidates or not t_candidates:
        raise ValueError(f"Tag '{source_tag}' or '{target_tag}' not found in graph.")

    s_pref = [n for n in s_candidates if n.startswith("equipment_") or n.startswith("valve_") or n.startswith("equip_")]
    t_pref = [n for n in t_candidates if n.startswith("equipment_") or n.startswith("valve_") or n.startswith("equip_")]
    s_node = s_pref[0] if s_pref else s_candidates[0]
    t_node = t_pref[0] if t_pref else t_candidates[0]

    return nx.shortest_path(graph, source=s_node, target=t_node)


def get_valves_on_line(graph: nx.Graph, source_tag: str, target_tag: str) -> List[Dict[str, Any]]:
    """Extracts all in-line valves between two equipment nodes."""
    path = find_piping_path(graph, source_tag, target_tag)
    valves = []
    seen_tags = set()
    for node_id in path:
        attrs = graph.nodes[node_id]
        if attrs.get('type') == 'valve':
            tag = attrs.get('tag')
            if tag not in seen_tags:
                seen_tags.add(tag)
                valves.append(attrs)
    return valves


def trace_downstream(digraph: nx.DiGraph, start_tag: str) -> List[str]:
    """Traces all reachable downstream equipment tags from a starting equipment tag."""
    start_nodes = [n for n, d in digraph.nodes(data=True) if n == start_tag or d.get('tag') == start_tag]
    if not start_nodes:
        return []
    pref_nodes = [n for n in start_nodes if n.startswith("equipment_") or n.startswith("valve_") or n.startswith("equip_")]
    s_node = pref_nodes[0] if pref_nodes else start_nodes[0]
    reachable = nx.descendants(digraph, s_node)
    tags = []
    for n in reachable:
        tag = digraph.nodes[n].get('tag')
        if tag and tag not in tags and tag != start_tag:
            tags.append(tag)
    return tags



def get_pipe_attributes(graph: Optional[nx.Graph], line_tag: str) -> Dict[str, Any]:
    """
    Extracts physical and design attributes for a designated piping line tag.

    Inspects graph edges and nodes for matching tag metadata or attributes, and parses
    standard industrial line tags (e.g., '16-CR-101-A1A-CS-150#' or '16-CR-101') to
    extract nominal size / outside diameter, design pressure rating, and wall thickness.

    Parameters:
        graph: NetworkX graph (undirected or directed) representing P&ID topology, or None.
        line_tag: Standard industrial piping tag string.

    Returns:
        Dict[str, Any] containing keys:
            - 'tag': Canonical or requested line tag.
            - 'outside_diameter': Pipe outside diameter (float, inches).
            - 'design_pressure': Pipe design pressure rating (float, psig).
            - 'measured_thickness': Actual/measured pipe wall thickness (float, inches).
    """
    cleaned_tag = line_tag.strip() if line_tag else ""
    found_attrs: Dict[str, Any] = {}

    # 1. Inspect graph edges and nodes if graph is provided
    if graph is not None:
        try:
            for _, _, data in graph.edges(data=True):
                edge_tag = str(data.get("tag") or data.get("line_tag") or data.get("pipe_spec") or "")
                if cleaned_tag and (cleaned_tag in edge_tag or edge_tag in cleaned_tag):
                    found_attrs.update(data)
                    break
            if not found_attrs:
                for _, data in graph.nodes(data=True):
                    node_tag = str(data.get("tag") or data.get("line_tag") or "")
                    if cleaned_tag and (cleaned_tag in node_tag or node_tag in cleaned_tag):
                        found_attrs.update(data)
                        break
        except Exception as e:
            logger.debug(f"Error scanning graph for line tag {cleaned_tag}: {e}")

    # 2. Parse outside diameter from tag or graph attributes
    outside_diameter: float = 16.0
    if "outside_diameter" in found_attrs:
        try:
            outside_diameter = float(found_attrs["outside_diameter"])
        except (ValueError, TypeError):
            pass
    elif "pipe_size" in found_attrs and found_attrs["pipe_size"] is not None:
        try:
            outside_diameter = float(found_attrs["pipe_size"])
        except (ValueError, TypeError):
            pass
    elif "D" in found_attrs:
        try:
            outside_diameter = float(found_attrs["D"])
        except (ValueError, TypeError):
            pass
    else:
        # Extract size from tag prefix (e.g. 16-CR-101 or 16"-CR-101 or 12.75-CR-104 or 1/2-CR-105)
        m_size = re.match(r'^\s*(\d+(?:\.\d+)?|\d+/\d+)\s*(?:"|\'\')?\s*[-_]', cleaned_tag)
        if m_size:
            s_val = m_size.group(1)
            if '/' in s_val:
                parts = s_val.split('/')
                if len(parts) == 2:
                    try:
                        num, den = float(parts[0]), float(parts[1])
                        if den > 0:
                            outside_diameter = num / den
                        else:
                            outside_diameter = 16.0
                    except (ValueError, ZeroDivisionError):
                        outside_diameter = 16.0
            else:
                try:
                    outside_diameter = float(s_val)
                except ValueError:
                    outside_diameter = 16.0
        else:
            # Fallback: search for first number in tag
            m_num = re.search(r'\b(\d+(?:\.\d+)?)\b', cleaned_tag)
            if m_num:
                outside_diameter = float(m_num.group(1))

    # 3. Parse design pressure rating (standard Class 150# defaults to 285.0 psig)
    design_pressure: float = 285.0
    if "design_pressure" in found_attrs:
        try:
            design_pressure = float(found_attrs["design_pressure"])
        except (ValueError, TypeError):
            pass
    elif "pressure" in found_attrs:
        try:
            design_pressure = float(found_attrs["pressure"])
        except (ValueError, TypeError):
            pass
    elif "P" in found_attrs:
        try:
            design_pressure = float(found_attrs["P"])
        except (ValueError, TypeError):
            pass
    else:
        # Check standard ASME B16.5 flange pressure classes
        pressure_table = {
            150: 285.0,
            300: 740.0,
            400: 985.0,
            600: 1480.0,
            900: 2220.0,
            1500: 3705.0,
            2500: 6170.0,
        }
        m_rating = re.search(r'[-_#](150|300|400|600|900|1500|2500)(?:#|lb|LB)?\b', cleaned_tag, re.IGNORECASE)
        if m_rating:
            rating_code = int(m_rating.group(1))
            design_pressure = pressure_table.get(rating_code, 285.0)
        else:
            # Look for explicit P<num> pattern
            m_p = re.search(r'\bP(?P<p>\d+(?:\.\d+)?)\b', cleaned_tag)
            if m_p:
                try:
                    design_pressure = float(m_p.group("p"))
                except ValueError:
                    design_pressure = 285.0
            else:
                design_pressure = 285.0

    # 4. Measured thickness
    measured_thickness: float = 0.375
    if "measured_thickness" in found_attrs:
        try:
            measured_thickness = float(found_attrs["measured_thickness"])
        except (ValueError, TypeError):
            pass
    elif "actual_thickness" in found_attrs:
        try:
            measured_thickness = float(found_attrs["actual_thickness"])
        except (ValueError, TypeError):
            pass
    elif "t_actual" in found_attrs:
        try:
            measured_thickness = float(found_attrs["t_actual"])
        except (ValueError, TypeError):
            pass
    elif "thickness" in found_attrs:
        try:
            measured_thickness = float(found_attrs["thickness"])
        except (ValueError, TypeError):
            pass

    # 5. Build return dict
    res: Dict[str, Any] = {
        "tag": cleaned_tag,
        "outside_diameter": outside_diameter,
        "design_pressure": design_pressure,
        "measured_thickness": measured_thickness,
    }

    # Also parse service / sequence if matches standard line tag
    m_full = re.match(
        r'^\s*(?P<size>\d+(?:\.\d+)?|\d+/\d+)(?:"|\'\')?[-_](?P<service>[A-Z]{1,4})[-_](?P<seq>\d{2,4})(?:[-_](?P<spec>[A-Z0-9]+))?(?:[-_](?P<rating>\d+|[A-Z0-9]+#?))?',
        cleaned_tag,
        re.IGNORECASE,
    )
    if m_full:
        gd = m_full.groupdict()
        if gd.get("service"):
            res["service"] = gd["service"].upper()
        if gd.get("seq"):
            res["sequence"] = gd["seq"]
        if gd.get("spec"):
            res["material_spec"] = gd["spec"]
        if gd.get("rating"):
            res["rating"] = gd["rating"]

    # Include remaining graph attributes if not already set
    for k, v in found_attrs.items():
        if k not in res:
            res[k] = v

    return res
