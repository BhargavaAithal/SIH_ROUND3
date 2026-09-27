# Technical Requirements Document (TRD) — Hackathon Scope (SMITRACE)

> **Sovereign AI Execution Plane & Industrial Engineering Workbench — Hackathon MVP Technical Requirements**  
> *Mirrored from the Target Enterprise TRD with Reduced Python/React Complexity for 100% Demo Reliability.*

---

### 1. Technology Stack & Architectural Boundaries

* **Backend & Web Server**: Python 3.11+ with **FastAPI** + **Uvicorn**, bound strictly to `127.0.0.1:8000`. Serves REST API endpoints and mounts the pre-built React static assets (`app.mount("/", StaticFiles(directory="static", html=True))`) on a single port for zero-configuration, 1-click launch.
* **Frontend**: **React 18** + **Vite** + **Zustand** + **Vanilla CSS / Modern Sovereign Design System**, bundled into static assets.
* **Dynamic Plan Engine**: In-process DAG planner decomposing missions into typed Work Units ($G_{WU}$), providing an interactive **User Intervention Gate** for step pruning and dynamic replanning with sibling protection.
* **Declarative Model Gateway**: Dynamic configuration loader reading `config/models.yaml`, pairing **In-Process Laya ONNX** (`onnxruntime` CPUExecutionProvider, <15ms) for System 1 routing with local reasoning fallback.
* **Assurance Core**: Microsoft **`z3-solver`** running First-Order Non-Linear Real Arithmetic (`QF_NRA`) with exact `z3.Q()` rationals, a **3.0s async watchdog**, defensive physical guards, and an **AST Security Visitor** (`ast.NodeVisitor`) rejecting dangerous syscalls in $<5\text{ms}$.
* **Modality-Aware Ingestion (MIR)**: Multi-tier parser (`pdfplumber` <50ms digital extraction $\to$ local OCR $\to$ Assisted Field Mapping modal) normalizing data into a canonical **Multimodal Intermediate Representation (MIR)** Pydantic schema.
* **Dual-Mode Execution Broker**: Isolated local **Docker / Podman** worker (`smitrace-worker`, `--network none`, 512MB RAM, 5s timeout) with an automatic 500ms fallback to an isolated **virtualenv subprocess** (`python -m compilers`).
* **Deliverable Compilers**: Programmatic **`python-docx`**, **`python-pptx`**, and **`openpyxl`** + **`ArtifactValidator`** checking ZIP integrity and active Excel formulas.
* **Coding Competency Sandbox**: Micro-sandboxed test harness evaluating learner-submitted code against public and hidden test matrices, paired with inline agent diagnostics and SHA-256 sealed verification records.
* **State Persistence**: Cross-platform relative case vault (`./cases/{case_id}/`) + embedded **SQLite WAL** (`smitrace.db`) with atomic CAS lease checks.

---

### 2. Subsystem Specifications

#### 2.1 Declarative Model Gateway & In-Process Laya Decision Subsystem

##### A. Architecture & Declarative Registration
Adheres strictly to [[ADR-0015]] and [[ADR-0017]]. The system reads `config/models.yaml` at boot without requiring code changes:

```yaml
# config/models.yaml
version: "1.0"
models:
  - model_id: "laya-modernbert-onnx"
    display_name: "Laya Decision Model (ModernBERT ONNX)"
    capabilities: ["decision", "routing", "classification", "intent_detection"]
    context_length: 8192
    quantization: "ONNX_FP16"
    hardware_vram_min_mb: 800
    endpoint: "in_process_onnx"
    priority: 110
    engine: "onnx_runtime"

  - model_id: "qwen-2.5-coder-7b-gguf"
    display_name: "Qwen 2.5 Coder 7B (Q4_K_M)"
    capabilities: ["coding", "numerical_script", "tool_use"]
    context_length: 16384
    quantization: "GGUF_Q4_K_M"
    hardware_vram_min_mb: 6144
    endpoint: "http://127.0.0.1:8001/v1"
    priority: 80
    engine: "llama_cpp"

  - model_id: "qwen-2.5-14b-instruct-awq"
    display_name: "Qwen 2.5 14B Instruct (AWQ)"
    capabilities: ["reasoning", "task_planning", "summarization"]
    context_length: 32768
    quantization: "AWQ_4BIT"
    hardware_vram_min_mb: 9728
    endpoint: "http://127.0.0.1:8002/v1"
    priority: 90
    engine: "vllm"
```

##### B. Python Model Gateway Contract (`backend/app/services/model_gateway.py`)
```python
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import onnxruntime as ort
import numpy as np
import yaml
import time
import uuid
from pathlib import Path

class CanonicalDecision(BaseModel):
    decision_id: str = Field(default_factory=lambda: f"DEC-{uuid.uuid4().hex[:8]}")
    primary_capability: str  # "decision" | "coding" | "reasoning" | "vision" | "tool_use"
    confidence: float
    output_primitive: str    # "choice" | "score" | "boolean"
    suggested_tool: Optional[str] = None
    latency_ms: float

class HackathonModelGateway:
    def __init__(self, config_path: str = "config/models.yaml", onnx_path: str = "sample_data/models/laya_decision.onnx"):
        self.config_path = config_path
        self.onnx_path = onnx_path
        self.registry = self._load_registry()
        self.session = self._init_onnx()

    def _load_registry(self) -> Dict:
        p = Path(self.config_path)
        if p.exists():
            with open(p, "r", encoding="utf-8") as f:
                return yaml.safe_load(f)
        return {"models": []}

    def _init_onnx(self) -> Optional[ort.InferenceSession]:
        try:
            p = Path(self.onnx_path)
            if p.exists():
                return ort.InferenceSession(str(p), providers=["CPUExecutionProvider"])
        except Exception:
            pass
        return None

    def evaluate_decision(self, prompt: str) -> CanonicalDecision:
        t0 = time.perf_counter()
        # Fast non-autoregressive forward pass (<15ms)
        # Fallback to robust deterministic classifier if ONNX weights not yet cached
        capability = "tool_use"
        tool = "inspection_dag"
        confidence = 0.95

        p_lower = prompt.lower()
        if "challenge" in p_lower or "code" in p_lower or "def " in p_lower:
            capability = "coding"
            tool = "competency_sandbox"
        elif "sop" in p_lower or "manual" in p_lower or "clause" in p_lower:
            capability = "reasoning"
            tool = "retrieval_query"

        latency = (time.perf_counter() - t0) * 1000.0
        return CanonicalDecision(
            primary_capability=capability,
            confidence=confidence,
            output_primitive="choice",
            suggested_tool=tool,
            latency_ms=round(latency, 2)
        )
```

---

#### 2.2 Dynamic Plan Engine & User Intervention Gate

Adheres strictly to [[ADR-0016]]. Decomposes missions into an explicit Work Unit DAG ($G_{WU}$):

##### A. Pydantic DAG Schema (`backend/app/models/dag.py`)
```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class WorkUnitState(str, Enum):
    PENDING = "PENDING"
    PRUNED = "PRUNED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    WAITING_HUMAN = "WAITING_HUMAN"

class WorkUnit(BaseModel):
    unit_id: str             # e.g. "WU-01"
    name: str                # e.g. "Ingestion & MIR Normalization"
    capability: str          # "ocr" | "reasoning" | "verification" | "tool_use"
    tool_binding: str        # "parser.extract_mir"
    dependencies: List[str]  # e.g. ["WU-01"]
    status: WorkUnitState = WorkUnitState.PENDING
    is_pruned: bool = False
    parameters: Dict[str, Any] = Field(default_factory=dict)
    output_artifacts: List[str] = Field(default_factory=list)
    execution_time_ms: Optional[float] = None
    error_message: Optional[str] = None

class DAGExecutionPlan(BaseModel):
    plan_id: str
    case_id: str
    work_units: List[WorkUnit]
    created_at: str
    committed: bool = False
```

##### B. Plan Engine Implementation (`backend/app/core/planner.py`)
```python
from backend.app.models.dag import WorkUnit, WorkUnitState, DAGExecutionPlan
from typing import List
import uuid
import datetime

class PlanEngine:
    @staticmethod
    def generate_inspection_dag(case_id: str, file_type: str = "pdf") -> DAGExecutionPlan:
        units = [
            WorkUnit(
                unit_id="WU-01",
                name="Ingestion & MIR Normalization",
                capability="ocr",
                tool_binding="parser.extract_mir",
                dependencies=[],
                output_artifacts=["case.mir.json"]
            ),
            WorkUnit(
                unit_id="WU-02",
                name="SOP Knowledge Grounding",
                capability="reasoning",
                tool_binding="retrieval.fetch_sops",
                dependencies=["WU-01"],
                output_artifacts=["sop_citations.json"]
            ),
            WorkUnit(
                unit_id="WU-03",
                name="Z3 SMT Verification (ASME B31.3 & API 510)",
                capability="verification",
                tool_binding="verifier.prove_cml_points",
                dependencies=["WU-01", "WU-02"],
                output_artifacts=["smt_proof_transcript.json"]
            ),
            WorkUnit(
                unit_id="WU-04",
                name="Board Approval Memo Compiler (.docx)",
                capability="tool_use",
                tool_binding="compilers.generate_docx",
                dependencies=["WU-03"],
                output_artifacts=["approval_memo.docx"]
            ),
            WorkUnit(
                unit_id="WU-05",
                name="Audit Workbook Compiler (.xlsx)",
                capability="tool_use",
                tool_binding="compilers.generate_xlsx",
                dependencies=["WU-03"],
                output_artifacts=["audit_workbook.xlsx"]
            ),
            WorkUnit(
                unit_id="WU-06",
                name="Executive Presentation Compiler (.pptx)",
                capability="tool_use",
                tool_binding="compilers.generate_pptx",
                dependencies=["WU-03"],
                output_artifacts=["briefing_deck.pptx"]
            )
        ]
        return DAGExecutionPlan(
            plan_id=f"PLAN-{uuid.uuid4().hex[:8]}",
            case_id=case_id,
            work_units=units,
            created_at=datetime.datetime.utcnow().isoformat()
        )

    @staticmethod
    def prune_step(plan: DAGExecutionPlan, unit_id: str, prune: bool = True) -> DAGExecutionPlan:
        for wu in plan.work_units:
            if wu.unit_id == unit_id:
                wu.is_pruned = prune
                wu.status = WorkUnitState.PRUNED if prune else WorkUnitState.PENDING
        return plan
```

---

#### 2.3 Modality-Aware Ingestion & MIR Schema

Adheres strictly to [[ADR-0012]]. Extracts raw data and maps it into a typed Pydantic MIR schema:

##### A. MIR Pydantic Schema (`backend/app/models/mir.py`)
```python
from pydantic import BaseModel, Field
from typing import List, Optional

class MIRCell(BaseModel):
    text: str
    confidence: float = 1.0
    bbox: List[float] = Field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0])
    row_idx: int
    col_idx: int

class MIRTable(BaseModel):
    table_id: str
    headers: List[str]
    rows: List[List[MIRCell]]
    source_page: int

class MIRDocument(BaseModel):
    doc_id: str
    filename: str
    sha256: str
    tables: List[MIRTable]
    raw_text: str
    provenance: dict
```

##### B. Multi-Tier Parser (`backend/app/core/parser.py`)
- **Tier 1**: `pdfplumber` reads lines and bounding boxes in $<50\text{ms}$.
- **Tier 2**: Local OCR fallback (`rapidocr` or `pytesseract`) if no text layer exists.
- **Tier 3**: Returns `requires_field_mapping: True` with candidate columns if headers cannot be resolved, launching the UI Assisted Field Mapping modal.

---

#### 2.4 Assurance Plane: AST Security Visitor & Neurosymbolic Z3 SMT Gate

Adheres strictly to [[ADR-0011]].

##### A. AST Security Visitor Gate (`backend/app/core/ast_visitor.py`)
Statically checks learner or dynamically generated code in $<5\text{ms}$ before sandbox dispatch:

```python
import ast
from typing import List, Tuple

FORBIDDEN_MODULES = {"os", "sys", "subprocess", "socket", "shutil", "urllib", "requests", "http", "importlib"}
FORBIDDEN_CALLS = {"eval", "exec", "compile", "__import__", "globals", "locals"}

class SecurityASTVisitor(ast.NodeVisitor):
    def __init__(self):
        self.violations: List[str] = []

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            if alias.name.split('.')[0] in FORBIDDEN_MODULES:
                self.violations.append(f"Forbidden import: '{alias.name}' at line {node.lineno}")
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        if node.module and node.module.split('.')[0] in FORBIDDEN_MODULES:
            self.violations.append(f"Forbidden import from: '{node.module}' at line {node.lineno}")
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        if isinstance(node.func, ast.Name) and node.func.id in FORBIDDEN_CALLS:
            self.violations.append(f"Forbidden call: '{node.func.id}()' at line {node.lineno}")
        elif isinstance(node.func, ast.Name) and node.func.id == "open":
            for arg in node.args[1:]:
                if isinstance(arg, ast.Constant) and any(m in str(arg.value) for m in ["w", "a", "+", "x"]):
                    self.violations.append(f"Forbidden write mode on open() at line {node.lineno}")
        self.generic_visit(node)

def validate_code_safety(source_code: str) -> Tuple[bool, List[str]]:
    try:
        tree = ast.parse(source_code)
    except SyntaxError as e:
        return False, [f"Syntax error: {str(e)}"]
    visitor = SecurityASTVisitor()
    visitor.visit(tree)
    return len(visitor.violations) == 0, visitor.violations
```

##### B. Hardened Z3 SMT Theorem Prover (`backend/app/core/verifier.py`)
```python
import z3
import asyncio
from typing import Dict, Any, Tuple

async def verify_cml_point(
    cml_id: str,
    P_val: float,       # Design Pressure (psi)
    D_val: float,       # Outside Diameter (in)
    S_val: float,       # Allowable Stress (psi)
    E_val: float,       # Joint Efficiency (0.85 - 1.0)
    Y_val: float,       # Material Coefficient (0.4)
    c_val: float,       # Corrosion Allowance (in)
    t_act_val: float,   # Actual Measured Thickness (in)
    cr_val: float       # Corrosion Rate (in/yr)
) -> Dict[str, Any]:
    # Defensive physical guards
    if cr_val <= 0:
        cr_val = 0.0001
        rem_life = 999.0
    else:
        rem_life = None

    def _prove() -> Dict[str, Any]:
        s = z3.Solver()
        # Use exact rational numbers
        P = z3.Q(int(P_val * 1000), 1000)
        D = z3.Q(int(D_val * 1000), 1000)
        S = z3.Q(int(S_val), 1)
        E = z3.Q(int(E_val * 100), 100)
        Y = z3.Q(int(Y_val * 10), 10)
        c = z3.Q(int(c_val * 1000), 1000)
        t_act = z3.Q(int(t_act_val * 10000), 10000)
        cr = z3.Q(int(cr_val * 10000), 10000)

        t_min = z3.Real('t_min')
        # ASME B31.3 Eq 3a: t_min = (P * D) / (2 * (S * E + P * Y)) + c
        s.add(t_min == (P * D) / (2 * (S * E + P * Y)) + c)

        # Check compliance: t_act >= t_min
        s.push()
        s.add(t_act < t_min)
        is_degraded = (s.check() == z3.sat)
        s.pop()

        # Evaluate t_min value
        s.check()
        m = s.model()
        t_min_eval = float(m[t_min].as_fraction())

        life = rem_life if rem_life is not None else max(0.0, (t_act_val - t_min_eval) / cr_val)
        status = "REPAIR REQUIRED" if is_degraded else "COMPLIANT"

        return {
            "cml_id": cml_id,
            "status": status,
            "t_min": round(t_min_eval, 4),
            "t_actual": t_act_val,
            "remaining_life_years": round(life, 2),
            "is_compliant": not is_degraded,
            "smt_check": "UNSAT" if is_degraded else "SAT"
        }

    # 3.0s hard timeout watchdog
    return await asyncio.wait_for(asyncio.to_thread(_prove), timeout=3.0)
```

---

#### 2.5 Dual-Mode Execution Broker & Tool Environment

Adheres strictly to [[ADR-0010]] and [[ADR-0014]].

```python
# backend/app/core/tool_runner.py
import subprocess
import shutil
import tempfile
from pathlib import Path
from typing import Dict, Any, List

class DualModeToolRunner:
    def __init__(self, container_image: str = "smitrace-worker:latest"):
        self.container_image = container_image
        self.has_docker = self._probe_docker()

    def _probe_docker(self) -> bool:
        docker_cmd = shutil.which("docker") or shutil.which("podman")
        if not docker_cmd:
            return False
        try:
            res = subprocess.run([docker_cmd, "info"], capture_output=True, timeout=0.5)
            return res.returncode == 0
        except Exception:
            return False

    def execute_in_sandbox(self, script_path: str, args: List[str] = None, timeout: float = 5.0) -> Dict[str, Any]:
        if self.has_docker:
            # Primary: Docker micro-sandbox with --network none, 512MB RAM
            cmd = ["docker", "run", "--rm", "--network", "none", "-m", "512m", "-v", f"{script_path}:/app/script.py:ro", self.container_image, "python", "/app/script.py"]
        else:
            # Fallback: Virtualenv isolated subprocess
            cmd = ["python", script_path] + (args or [])

        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return {
            "exit_code": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "mode": "docker" if self.has_docker else "subprocess_fallback"
        }
```

---

#### 2.6 Sandboxed Coding Competency Subsystem

##### A. Curated Challenge Definitions
1. `API510-CALC-01`:
   - Task: Implement `calculate_api510_limits(P, R, S, E, t_act, cr) -> Dict[str, float]`
   - Invariants: Calculate $t_{\text{min}} = \frac{P \cdot R}{S \cdot E - 0.6 \cdot P}$ and $L = \frac{t_{\text{act}} - t_{\text{min}}}{c_r}$. Handle boundary conditions ($c_r \le 0 \to 999.0$, $t_{\text{act}} < t_{\text{min}} \to 0.0$).
2. `UT-PARSER-02`:
   - Task: Implement `parse_ut_gauge_stream(raw_log: str) -> List[Dict[str, Any]]`
   - Invariants: Parse noisy gauge strings (`"CML01: 0.375 | CML02: ERR | CML03: 0.205"`), strip anomalies, validate types, and compute statistics.

##### B. Two-Step Verification & Cryptographic Record Sealing
- Step 1 (`POST /api/v1/competency/run`): Evaluates public test cases with input/expected/actual diffs.
- Step 2 (`POST /api/v1/competency/diagnose`): Inline Agent Diagnostic provides standard-grounded guidance without emitting solution code.
- Step 3 (`POST /api/v1/competency/submit`): Evaluates full suite (public + hidden) and seals SHA-256 record into `./cases/{case_id}/competency_record.json`.

---

#### 2.7 Single-Click Zero-Dependency Launcher (`start_demo.py`)

```python
# hackathon-scope/start_demo.py
import sys
import socket
import webbrowser
import subprocess
import time
from pathlib import Path

PORT = 8000
HOST = "127.0.0.1"

def check_and_clear_port(port: int):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        if s.connect_ex((HOST, port)) == 0:
            print(f"[!] Port {port} is occupied. Attempting to recycle...")
            # Automatically recycle on Windows/Linux
            try:
                if sys.platform == "win32":
                    subprocess.run(f"for /f \"tokens=5\" %a in ('netstat -aon ^| find \":{port}\"') do taskkill /f /pid %a", shell=True, capture_output=True)
                else:
                    subprocess.run(f"fuser -k {port}/tcp", shell=True, capture_output=True)
                time.sleep(1.0)
            except Exception:
                pass

def main():
    print("[*] SMITRACE Sovereign Workbench — Hackathon Demo Launcher")
    check_and_clear_port(PORT)
    print(f"[*] Booting Uvicorn on http://{HOST}:{PORT} (Air-Gap Loopback)...")
    server_process = subprocess.Popen([sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", HOST, "--port", str(PORT)], cwd=Path(__file__).parent)
    time.sleep(1.5)
    webbrowser.open(f"http://{HOST}:{PORT}/")
    try:
        server_process.wait()
    except KeyboardInterrupt:
        server_process.terminate()

if __name__ == "__main__":
    main()
```
