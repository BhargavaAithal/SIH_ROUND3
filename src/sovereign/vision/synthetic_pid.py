"""
Procedural Synthetic 4000x3000 P&ID Diagram & Ground-Truth Topology Generator.
Used for zero-dependency regression testing of Project Sovereign vision pipeline.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple
import networkx as nx
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None


class SyntheticPIDGenerator:
    """
    Generates a 4000x3000 industrial P&ID diagram conforming to ISA-5.1.
    Simultaneously produces the exact ground-truth NetworkX topology graph.
    """
    def __init__(self, width: int = 4000, height: int = 3000):
        self.width = width
        self.height = height
        self.image = np.full((height, width, 3), 255, dtype=np.uint8)
        self.gt_graph = nx.DiGraph()
        self.detected_symbols: List[Dict[str, Any]] = []
        self.piping_runs: List[Dict[str, Any]] = []

    def draw_border_and_title_block(self):
        """Draws outer border, margin, and title block."""
        if cv2 is None:
            return
        # Outer border
        cv2.rectangle(self.image, (60, 60), (self.width - 60, self.height - 60), (0, 0, 0), thickness=4)
        # Title block (bottom right)
        tb_x1, tb_y1 = self.width - 900, self.height - 350
        tb_x2, tb_y2 = self.width - 60, self.height - 60
        cv2.rectangle(self.image, (tb_x1, tb_y1), (tb_x2, tb_y2), (0, 0, 0), thickness=3)
        cv2.line(self.image, (tb_x1, tb_y1 + 80), (tb_x2, tb_y1 + 80), (0, 0, 0), thickness=2)
        cv2.putText(
            self.image,
            "PROJECT SOVEREIGN - BENCHMARK P&ID",
            (tb_x1 + 30, tb_y1 + 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.2,
            (0, 0, 0),
            3,
        )
        cv2.putText(
            self.image,
            "DWG NO: SOV-M2-PID-001   REV: 0",
            (tb_x1 + 30, tb_y1 + 130),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 0, 0),
            2,
        )
        cv2.putText(
            self.image,
            "SCALE: NONE   SIZE: 4000x3000",
            (tb_x1 + 30, tb_y1 + 180),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 0, 0),
            2,
        )

    def draw_vessel(
        self,
        tag: str,
        center_x: int,
        center_y: int,
        width: int = 180,
        height: int = 400,
    ) -> Dict[str, Any]:
        """Draws a vertical cylindrical pressure vessel with dished heads."""
        x1, y1 = center_x - width // 2, center_y - height // 2
        x2, y2 = center_x + width // 2, center_y + height // 2
        head_h = 50

        if cv2 is not None:
            # Cylinder body
            cv2.rectangle(self.image, (x1, y1 + head_h), (x2, y2 - head_h), (0, 0, 0), thickness=4)
            # Top elliptical head
            cv2.ellipse(self.image, (center_x, y1 + head_h), (width // 2, head_h), 0, 180, 360, (0, 0, 0), thickness=4)
            # Bottom elliptical head
            cv2.ellipse(self.image, (center_x, y2 - head_h), (width // 2, head_h), 0, 0, 180, (0, 0, 0), thickness=4)
            # Tag text
            cv2.putText(self.image, tag, (center_x - 70, center_y), cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 0, 0), 3)

        bbox = [x1, y1, x2, y2]
        node_id = f"equip_{tag}"
        node_data = {
            'node_id': node_id,
            'type': 'equipment',
            'sub_type': 'vessel',
            'tag': tag,
            'centroid': (float(center_x), float(center_y)),
            'bbox': bbox,
        }
        self.gt_graph.add_node(node_id, **node_data)
        self.detected_symbols.append(node_data)
        return node_data

    def draw_pump(
        self,
        tag: str,
        center_x: int,
        center_y: int,
        radius: int = 50,
    ) -> Dict[str, Any]:
        """Draws a centrifugal pump with tangential discharge and suction nozzles."""
        if cv2 is not None:
            # Pump casing circle
            cv2.circle(self.image, (center_x, center_y), radius, (0, 0, 0), thickness=4)
            # Discharge nozzle (vertical top)
            cv2.line(self.image, (center_x, center_y - radius), (center_x, center_y - radius - 30), (0, 0, 0), thickness=4)
            # Suction nozzle (horizontal left)
            cv2.line(self.image, (center_x - radius, center_y), (center_x - radius - 30, center_y), (0, 0, 0), thickness=4)
            # Tag label below pump
            cv2.putText(
                self.image,
                tag,
                (center_x - 80, center_y + radius + 45),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.1,
                (0, 0, 0),
                3,
            )

        bbox = [center_x - radius - 30, center_y - radius - 30, center_x + radius, center_y + radius + 50]
        node_id = f"equip_{tag}"
        node_data = {
            'node_id': node_id,
            'type': 'equipment',
            'sub_type': 'pump',
            'tag': tag,
            'centroid': (float(center_x), float(center_y)),
            'bbox': bbox,
            'suction_coord': (float(center_x - radius - 30), float(center_y)),
            'discharge_coord': (float(center_x), float(center_y - radius - 30)),
        }
        self.gt_graph.add_node(node_id, **node_data)
        self.detected_symbols.append(node_data)
        return node_data

    def draw_heat_exchanger(
        self,
        tag: str,
        center_x: int,
        center_y: int,
        width: int = 280,
        height: int = 140,
    ) -> Dict[str, Any]:
        """Draws a horizontal shell and tube heat exchanger."""
        x1, y1 = center_x - width // 2, center_y - height // 2
        x2, y2 = center_x + width // 2, center_y + height // 2
        head_w = 40

        if cv2 is not None:
            # Shell body
            cv2.rectangle(self.image, (x1 + head_w, y1), (x2 - head_w, y2), (0, 0, 0), thickness=4)
            # Channel head (left semi-ellipse)
            cv2.ellipse(self.image, (x1 + head_w, center_y), (head_w, height // 2), 0, 90, 270, (0, 0, 0), thickness=4)
            # Shell cover (right semi-ellipse)
            cv2.ellipse(self.image, (x2 - head_w, center_y), (head_w, height // 2), 0, 270, 450, (0, 0, 0), thickness=4)
            # Tag text
            cv2.putText(self.image, tag, (center_x - 60, center_y + 10), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 3)

        bbox = [x1, y1, x2, y2]
        node_id = f"equip_{tag}"
        node_data = {
            'node_id': node_id,
            'type': 'equipment',
            'sub_type': 'heat_exchanger',
            'tag': tag,
            'centroid': (float(center_x), float(center_y)),
            'bbox': bbox,
        }
        self.gt_graph.add_node(node_id, **node_data)
        self.detected_symbols.append(node_data)
        return node_data

    def draw_valve(
        self,
        tag: str,
        center_x: int,
        center_y: int,
        valve_type: str = 'HV',
        orientation: str = 'horizontal',
    ) -> Dict[str, Any]:
        """Draws a bowtie valve (manual or control valve with actuator)."""
        w, h = 30, 20
        if cv2 is not None:
            if orientation == 'horizontal':
                pts_left = np.array(
                    [[center_x, center_y], [center_x - w, center_y - h], [center_x - w, center_y + h]],
                    np.int32,
                )
                pts_right = np.array(
                    [[center_x, center_y], [center_x + w, center_y - h], [center_x + w, center_y + h]],
                    np.int32,
                )
                cv2.polylines(self.image, [pts_left], isClosed=True, color=(0, 0, 0), thickness=3)
                cv2.polylines(self.image, [pts_right], isClosed=True, color=(0, 0, 0), thickness=3)
                if 'FCV' in tag:
                    # Actuator stem and diaphragm
                    cv2.line(self.image, (center_x, center_y), (center_x, center_y - 40), (0, 0, 0), thickness=3)
                    cv2.circle(self.image, (center_x, center_y - 55), 15, (0, 0, 0), thickness=3)
            else:  # vertical
                pts_top = np.array(
                    [[center_x, center_y], [center_x - h, center_y - w], [center_x + h, center_y - w]],
                    np.int32,
                )
                pts_bot = np.array(
                    [[center_x, center_y], [center_x - h, center_y + w], [center_x + h, center_y + w]],
                    np.int32,
                )
                cv2.polylines(self.image, [pts_top], isClosed=True, color=(0, 0, 0), thickness=3)
                cv2.polylines(self.image, [pts_bot], isClosed=True, color=(0, 0, 0), thickness=3)

            # Text label
            cv2.putText(self.image, tag, (center_x - 50, center_y + 45), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 2)

        bbox = [center_x - w, center_y - h - (40 if 'FCV' in tag else 0), center_x + w, center_y + h + 50]
        node_id = f"valve_{tag}"
        node_data = {
            'node_id': node_id,
            'type': 'valve',
            'sub_type': 'control_valve' if 'FCV' in tag else 'manual_valve',
            'tag': tag,
            'centroid': (float(center_x), float(center_y)),
            'bbox': bbox,
        }
        self.gt_graph.add_node(node_id, **node_data)
        self.detected_symbols.append(node_data)
        return node_data

    def draw_pipe_line(
        self,
        path: List[Tuple[int, int]],
        pipe_spec: str = "",
        flow_direction: str = 'forward',
    ) -> Dict[str, Any]:
        """Draws an orthogonal piping line and registers it in ground-truth graph."""
        if cv2 is not None:
            pts = np.array(path, np.int32).reshape((-1, 1, 2))
            cv2.polylines(self.image, [pts], isClosed=False, color=(0, 0, 0), thickness=5)

            # Draw line spec label midway along the longest segment
            if pipe_spec and len(path) >= 2:
                mid_idx = len(path) // 2
                mx = (path[mid_idx - 1][0] + path[mid_idx][0]) // 2
                my = (path[mid_idx - 1][1] + path[mid_idx][1]) // 2 - 15
                cv2.putText(self.image, pipe_spec, (mx, my), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)

        total_length = 0.0
        for i in range(len(path) - 1):
            total_length += math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1])

        run_data = {
            'path': [(float(p[0]), float(p[1])) for p in path],
            'length': total_length,
            'pipe_spec': pipe_spec,
            'flow_direction': flow_direction,
        }
        self.piping_runs.append(run_data)
        return run_data

    def generate_benchmark_diagram(
        self,
    ) -> Tuple[np.ndarray, nx.DiGraph, List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Builds the canonical 4000x3000 process plant flowsheet:
        V-102 -> HV-101A/B -> P-101A/B (pumps) -> NRV-101 & FCV-202 -> E-101 -> TK-500
        """
        self.draw_border_and_title_block()

        # 1. Equipment
        v102 = self.draw_vessel("V-102", 500, 1500, width=200, height=500)
        p101a = self.draw_pump("10-P-101A", 1300, 2200, radius=50)
        p101b = self.draw_pump("10-P-101B", 1300, 2600, radius=50)
        e101 = self.draw_heat_exchanger("E-101", 2500, 1500, width=320, height=160)
        tk500 = self.draw_vessel("TK-500", 3400, 1200, width=300, height=600)

        # 2. In-Line Valves
        hv101a = self.draw_valve("HV-101A", 1000, 2200, valve_type='HV')
        hv101b = self.draw_valve("HV-101B", 1000, 2600, valve_type='HV')
        fcv202 = self.draw_valve("FCV-202", 1800, 1500, valve_type='FCV')

        # 3. Piping Connections & Manhattan Routes
        # Route 1: V-102 bottom nozzle (500, 1750) down and split to HV-101A and HV-101B
        self.draw_pipe_line([(500, 1750), (500, 2200), (970, 2200)], pipe_spec='4"-P-101-CS-150')
        self.draw_pipe_line([(500, 2200), (500, 2600), (970, 2600)], pipe_spec='4"-P-102-CS-150')
        # Route 2: HV-101 to Pump Suction
        self.draw_pipe_line([(1030, 2200), (1220, 2200)], pipe_spec='4"-P-101-CS-150')
        self.draw_pipe_line([(1030, 2600), (1220, 2600)], pipe_spec='4"-P-102-CS-150')
        # Route 3: Pump Discharges merge into Header to FCV-202
        self.draw_pipe_line([(1300, 2120), (1300, 1500), (1770, 1500)], pipe_spec='3"-P-103-CS-150')
        self.draw_pipe_line([(1300, 2520), (1300, 2120)], pipe_spec='3"-P-104-CS-150')
        # Route 4: FCV-202 to E-101 Shell Inlet
        self.draw_pipe_line([(1830, 1500), (2340, 1500)], pipe_spec='3"-P-103-CS-150')
        # Route 5: E-101 Shell Outlet to TK-500
        self.draw_pipe_line([(2660, 1500), (3000, 1500), (3000, 1200), (3250, 1200)], pipe_spec='3"-P-105-CS-150')

        # 4. Populate Ground Truth Topological Edges
        self.gt_graph.add_edge(v102['node_id'], hv101a['node_id'], pipe_spec='4"-P-101-CS-150')
        self.gt_graph.add_edge(v102['node_id'], hv101b['node_id'], pipe_spec='4"-P-102-CS-150')
        self.gt_graph.add_edge(hv101a['node_id'], p101a['node_id'], pipe_spec='4"-P-101-CS-150')
        self.gt_graph.add_edge(hv101b['node_id'], p101b['node_id'], pipe_spec='4"-P-102-CS-150')
        self.gt_graph.add_edge(p101a['node_id'], fcv202['node_id'], pipe_spec='3"-P-103-CS-150')
        self.gt_graph.add_edge(p101b['node_id'], fcv202['node_id'], pipe_spec='3"-P-104-CS-150')
        self.gt_graph.add_edge(fcv202['node_id'], e101['node_id'], pipe_spec='3"-P-103-CS-150')
        self.gt_graph.add_edge(e101['node_id'], tk500['node_id'], pipe_spec='3"-P-105-CS-150')

        return self.image, self.gt_graph, self.detected_symbols, self.piping_runs
