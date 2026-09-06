"""
Pydantic v2 Models for SMITRACE Sovereign AI Workbench API.
Module: sovereign.api.schemas
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Telemetry Models
# ---------------------------------------------------------------------------

class SocketInfo(BaseModel):
    pid: Optional[int] = Field(default=None, description="Process ID")
    laddr: str = Field(..., description="Local address (e.g. '127.0.0.1:8000')")
    raddr: str = Field(default="", description="Remote address")
    status: str = Field(default="LISTEN", description="Socket status")
    process: str = Field(default="unknown", description="Process name")


class AirgapTelemetryResponse(BaseModel):
    status: str = Field(..., description="Audit status: 'PASS' | 'WARNING' | 'FAIL'")
    airgap_active: bool = Field(..., description="True if verdict == 'PASS' and 0 egress")
    wan_egress_bytes: int = Field(default=0, description="Strictly 0 bytes in sovereign airgap")
    live_throughput_kbps: float = Field(default=0.0, description="Throughput ticker (0.00 KB/s)")
    packets_captured: int = Field(default=0, description="Total WAN egress packets captured")
    open_wan_sockets: int = Field(default=0, description="Count of open WAN sockets")
    sockets: List[SocketInfo] = Field(default_factory=list, description="Table of active sockets")
    audit_timestamp: float = Field(..., description="Audit epoch timestamp")
    audit_timestamp_iso: str = Field(..., description="ISO 8601 UTC timestamp")
    integrity_hash: str = Field(..., description="SHA-256 integrity hash")
    kernel_ebpf_status: str = Field(default="ENFORCING", description="eBPF kernel probe state")
    details: List[str] = Field(default_factory=list, description="Diagnostic details")


# ---------------------------------------------------------------------------
# P&ID Topology Models
# ---------------------------------------------------------------------------

class NodeModel(BaseModel):
    id: str = Field(..., description="Unique node ID or tag")
    tag: str = Field(..., description="ISA-5.1 tag")
    type: str = Field(default="equipment", description="Node type: 'equipment' | 'valve' | 'instrument'")
    equipment_type: str = Field(default="vessel", description="'vessel' | 'pump' | 'exchanger' | 'tank' | 'valve'")
    label: str = Field(..., description="Human-readable label")
    bbox: List[float] = Field(default_factory=list, description="Bounding box [x1, y1, x2, y2]")
    centroid: List[float] = Field(..., description="Centroid coordinates [x, y]")
    status: str = Field(default="OPERATIONAL", description="Operational status")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Physical and operating attributes")


class EdgeModel(BaseModel):
    id: str = Field(..., description="Unique edge/pipe ID")
    source: str = Field(..., description="Upstream node tag")
    target: str = Field(..., description="Downstream node tag")
    tag: str = Field(..., description="Piping line specification tag")
    color: str = Field(default="#06B6D4", description="Line stroke hex color")
    verdict: Optional[str] = Field(default="SAT", description="Calculated verification verdict")
    path: List[List[float]] = Field(default_factory=list, description="Waypoints [[x1, y1], [x2, y2], ...]")
    attributes: Dict[str, Any] = Field(default_factory=dict, description="Pipe physical attributes")


class TopologyResponse(BaseModel):
    drawing_id: str = Field(default="PID-CDU-01-REV4")
    title: str = Field(default="Atmospheric Distillation Unit Crude Ingestion (CDU-1)")
    dimensions: Dict[str, int] = Field(default_factory=lambda: {"width": 4000, "height": 3000})
    nodes: List[NodeModel] = Field(default_factory=list)
    edges: List[EdgeModel] = Field(default_factory=list)
    summary: Dict[str, int] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# P&ID Calculation Models
# ---------------------------------------------------------------------------

class CalculationStep(BaseModel):
    step_number: int
    formula: str
    substituted: str
    result: float
    unit: str
    label: str


class PIDCalculateRequest(BaseModel):
    standard: str = Field(default="ASME_B31_3", description="'ASME_B31_3' | 'API_510'")
    line_tag: Optional[str] = Field(default=None, description="Optional pipe/equipment tag")
    parameters: Dict[str, float] = Field(..., description="Physical parameters dictionary")


class PIDCalculateResponse(BaseModel):
    is_valid: bool
    verdict: str
    t_min: float
    t_actual: float
    margin: float
    governing_equation: str
    steps: List[CalculationStep] = Field(default_factory=list)
    violations: List[str] = Field(default_factory=list)
    z3_verified: bool = True
    proof_log: str = ""
    timestamp: str = ""


# ---------------------------------------------------------------------------
# Sandbox Execution Models
# ---------------------------------------------------------------------------

class SandboxExecuteRequest(BaseModel):
    code: str = Field(..., description="Python script to execute in sandbox")
    timeout_sec: float = Field(default=10.0, description="Execution timeout in seconds")
    memory_limit_mb: int = Field(default=512, description="cgroups memory limit in MB")
    enforce_ast_guard: bool = Field(default=True, description="Enforce static AST guard")


class SandboxExecuteResponse(BaseModel):
    success: bool
    stdout: str
    stderr: str
    returncode: int
    execution_time_sec: float
    memory_peak_mb: float
    network_egress_bytes: int = 0
    ast_guard: Dict[str, Any] = Field(default_factory=dict)
    airgap_audit: Dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Verifier Evaluate Models
# ---------------------------------------------------------------------------

class VerifierEvaluateRequest(BaseModel):
    standard: str = Field(default="ASME_B31_3", description="'ASME_B31_3' | 'API_510'")
    parameters: Dict[str, float] = Field(..., description="Parameters (P, D, S, E, Y, c, t_actual, etc.)")


class VerifierEvaluateResponse(BaseModel):
    is_valid: bool
    status: str
    margin: float
    t_min: float
    t_actual: float
    violations: List[str] = Field(default_factory=list)
    model_details: Dict[str, Any] = Field(default_factory=dict)
    proof_log: str = ""
    far_rate: float = Field(default=0.0, description="0.0% False Assurance Rate Guarantee")


# ---------------------------------------------------------------------------
# Deliverables Models
# ---------------------------------------------------------------------------

class DeliverableMemoRequest(BaseModel):
    metadata: Optional[Dict[str, Any]] = None
    calculations: Optional[List[Dict[str, Any]]] = None
    citations: Optional[List[str]] = None


class DeliverableWorkbookRequest(BaseModel):
    sheets_data: Optional[Dict[str, List[Dict[str, Any]]]] = None
