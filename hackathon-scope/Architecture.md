# System Architecture Document — Hackathon Scope (SMITRACE)

> **Sovereign AI Execution Plane & Industrial Engineering Workbench — Hackathon MVP Architecture**  
> *Mirrored from the Target Enterprise Architecture with Reduced Python/React Complexity for 100% Demo Reliability.*

---

## 1. System Master Architecture: Four-Plane Separation of Authority

The Hackathon MVP strictly preserves the foundational **Four-Plane Separation of Authority** established in the enterprise specification ([[ADR-0014]], [[ADR-0015]], [[ADR-0016]], [[ADR-0017]]). Rather than a brittle conversational loop or a rigid hardcoded script, SMITRACE Hackathon MVP executes as a **user-governed, agentic DAG execution plane** implemented with high-efficiency Python 3.11+ and React 18:

```
                 ┌──────────────────────────────────────────────────────────┐
                 │                     OPERATOR / MISSION                   │
                 └────────────────────────────┬─────────────────────────────┘
                                              │ Natural Language Goal & 1-Click Quick Scenarios
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        1. INTELLIGENCE PLANE (Probabilistic)                           │
│                                                                                        │
│   ┌────────────────────────────────┐            ┌──────────────────────────────────┐   │
│   │ Dynamic Plan Engine            │            │ Declarative Model Gateway        │   │
│   │ - Versioned Work Unit DAG      │            │ - In-Process Laya ONNX (<15ms)   │   │
│   │ - Dynamic Replanning Engine    │            │ - System 1 ➔ System 2 Escalation │   │
│   └───────────────┬────────────────┘            └─────────────────┬────────────────┘   │
│                   │                                               │                    │
│                   ▼                                               ▼                    │
│   ┌────────────────────────────────┐            ┌──────────────────────────────────┐   │
│   │ Modality-Aware Ingestion (MIR) │            │ Declarative Model Registry       │   │
│   │ - pdfplumber + OCR Fallback    │            │ (config/models.yaml: Laya ONNX,  │   │
│   │ - Assisted Field Mapping Modal │            │  Qwen Coder, Llama/Gemma local)  │   │
│   └────────────────────────────────┘            └──────────────────────────────────┘   │
└─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                              │ Proposes Intent & Versioned Work Units
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               4. STATE & PROVENANCE PLANE (Deterministic Control Plane)                │
│                                                                                        │
│   USER INTERVENTION GATE: [ Inspect | Edit | Prune Intermediate Steps | Reorder ]     │
│                                                                                        │
│   Capability Registry │ Dynamic Quota & Leases │ SQLite WAL Ledger │ Relative Case Vault│
│                                                                                        │
│         ┌───────────────────────────────┴───────────────────────────────┐              │
│         ▼                                                               ▼              │
│   WORK UNIT DAG (Task Precedence)                     ARTIFACT GRAPH (Data Lineage)    │
│   + Replanning Invalidation Engine                    + Provenance Graph (Tri-Index)   │
└────────────────────────┬────────────────────────────────────────────────┬──────────────┘
                         │ Grants Execution Lease                         │ Input Data & Code
                         ▼                                                │
┌─────────────────────────────────────────────────────────────────────────┼──────────────┐
│                        2. EXECUTION PLANE (Deterministic)               │              │
│                                                                         │              │
│  ┌──────────────────────────────────────────────────────────────────┐  │              │
│  │ Dual-Mode Execution Broker (Docker Primary + Subprocess Fallback)│  │              │
│  └──────────────────────────────────┬───────────────────────────────┘  │              │
│                                     ▼                                   │              │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌──────────────┴──────────┐   │
│  │ Ephemeral Sandbox      │  │ Deterministic Math     │  │ Typed Artifact Worker   │   │
│  │ (Coding Competency)    │  │ (Exact Formula Unit)   │  │ (python-docx, pptx, xlsx│   │
│  └───────────┬────────────┘  └───────────┬────────────┘  └──────────────┬──────────┘   │
└──────────────┼───────────────────────────┼──────────────────────────────┼──────────────┘
               │                           │ Produced Artifacts           │
               └───────────────────────────┼──────────────────────────────┘
                                           ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        3. ASSURANCE PLANE (Deterministic Verifiers)                    │
│                                                                                        │
│   ┌────────────────────────┐  ┌────────────────────────┐  ┌────────────────────────┐   │
│   │ AST Security Visitor   │  │ Neurosymbolic SMT Gate │  │ Statutory Code Policy  │   │
│   │ (Unsafe Call Rejection)│  │ (Hardened Z3 3.0s Pool)│  │ (ASME B31.3 / API 510) │   │
│   └────────────────────────┘  └───────────┬────────────┘  └────────────────────────┘   │
└───────────────────────────────────────────┼────────────────────────────────────────────┘
                                            │
                                  ┌─────────┴─────────┐
                                  ▼                   ▼
                           VERIFIED (PASS)      REJECTED (FAIL)
                                  │                   │
                                  │                   ▼
                                  │          State-Isolated Anti-Collapse Loop (3 Turns)
                                  │                   │
                                  │                   ▼
                                  │          Exhausted (3 Turns) ──► WAITING_HUMAN Gate
                                  ▼
                         COMMITTED TO LEDGER
                                  │
                                  ▼
                  OFFICIAL AUDITED PSU DELIVERABLES
        (.docx Board Memo + .pptx Briefing + .xlsx Audit Workbook + Step Math)
                                  +
                    SHA-256 SEALED AUDIT MANIFEST
```

**Foundational Invariant**:  
> *Models propose. Users govern. Sandboxes execute. Verifiers prove. The Control Plane commits.*

---

## 2. Target Enterprise vs. Hackathon MVP Complexity Reduction Matrix

To ensure delivery within a 3-day sprint without sacrificing architectural integrity, low-level kernel abstractions are replaced with robust Python/React equivalents:

| Enterprise Production Architecture (Root Repo) | Hackathon MVP Reduced Complexity Architecture (`hackathon-scope/`) | Architectural Fidelity & Equivalence |
| :--- | :--- | :--- |
| **Rust 1.80+ (Axum + Tokio)** compiled static `musl` ELF binary. | **Python 3.11+ (FastAPI + Uvicorn)** bound strictly to `127.0.0.1:8000`. | Preserves typed async request handling and single-port static asset serving. |
| **POSIX Shared Memory Ring Buffers & Zero-Copy IPC**. | In-process Python memory queues + Pydantic v2 schemas (<1ms overhead). | Eliminates C IPC plumbing while retaining sub-millisecond memory transfers. |
| **Full Multi-Engine Model Gateway** (vLLM, llama.cpp daemon clusters). | **Declarative Model Gateway** (`config/models.yaml`) + **In-Process Laya ONNX** (<15ms) + Local HTTP fallback. | Adheres to ADR-0015 and ADR-0017 with identical `CanonicalDecision` contract. |
| **Linux `nsjail` & Windows AppContainer** micro-sandboxes. | **Dual-Mode Execution Broker**: Docker/Podman container (`--network none`, 512MB RAM) with 500ms fallback to virtualenv subprocess. | Guarantees resource caps and zero crash risk across diverse evaluation hosts. |
| **Native C++ Z3 Solver Pool** bound via Rust `z3` crate across 5 statutory codes. | **Python `z3-solver`** with **Hardened 3.0s Watchdog**, physical guards, and exact `z3.Q()` rationals for ASME B31.3 and API 510. | Guarantees exact **0.0% False Assurance Rate (FAR)** and formal SMT-LIB2 proofs. |
| **Modality-Aware Ingestion Fabric (MIR)** with PaddleOCR, TrOCR, & OpenCV vectorizers. | **Multi-Tier Ingestion Parser** (`pdfplumber` <50ms $\to$ local OCR $\to$ Assisted Field Mapping modal) normalizing to **MIR Schema**. | Extracts tables reliably with zero HTTP 500 crashes on degraded scans. |
| **Headless Rust OOXML Compilers** (`docx-rs`, `rust_xlsxwriter`). | Pure programmatic **`python-docx`**, **`python-pptx`**, and **`openpyxl`** + **`ArtifactValidator`**. | Generates valid ISO/IEC 29500 binaries with active formulas and zero corruption. |
| **WebGL / WebGPU Pixi.js Viewport** with 50k+ nodes & in-process MCP. | **React 18 + Vite** Workbench with **Interactive Work Unit DAG Viewer**, Proof Drawer, and Competency Sandbox. | Delivers full visual wow-factor, step pruning, and instant responsiveness. |

---

## 3. Seven Architectural Pillars (Hackathon MVP)

```
                            SMITRACE HACKATHON MVP
                                       │
     ┌───────────────────┬─────────────┼─────────────┬───────────────────┐
     ▼                   ▼             ▼             ▼                   ▼
1. DECLARATIVE      2. PLAN ENGINE &   3. MULTI-TIER 4. DUAL-MODE        5. ASSURANCE
   MODEL GATEWAY       INTERVENTION       INGESTION     EXECUTION           PLANE
   - models.yaml       - Work Unit DAG    TO MIR        BROKER              - AST Visitor
   - Laya ONNX (<15ms) - Step Pruning     - pdfplumber  - Docker container  - Z3 (3.0s pool)
   - Canonical Schema  - Replanning       - OCR / Modal - Subprocess venv   - Anti-Collapse
     │                   │             │             │                   │
     └───────────────────┼─────────────┴─────────────┼───────────────────┘
                         │                           │
                         ▼                           ▼
                6. PRE-SEEDED RETRIEVAL     7. CODING COMPETENCY &
                   & PROVENANCE GRAPH          ZERO-DEP LAUNCHER
                   - In-tree weights           - Ephemeral sandbox
                   - SQLite vector cache       - Public/hidden test harness
                   - RRF & chunk citations     - start_demo.py auto-boot
```

---

### Pillar 1: Declarative Model Gateway & In-Process Laya Decision Routing

Adheres strictly to [[ADR-0015]] and [[ADR-0017]]:
1. **Declarative Registry (`config/models.yaml`)**:
   Reads model metadata (`capabilities`, `quantization`, `priority`, `endpoints`) at startup without modifying application code.
2. **In-Process Laya ONNX (System 1)**:
   Runs non-autoregressive decision classification using Python `onnxruntime` (`CPUExecutionProvider`, <800MB RAM) in $<15\text{ms}$.
3. **Canonical Decision Contract**:
   Normalizes predictions into typed Pydantic primitives:
   ```python
   class CanonicalDecision(BaseModel):
       decision_id: str
       primary_capability: str  # "decision" | "coding" | "reasoning" | "vision" | "tool_use"
       confidence: float
       suggested_tool: Optional[str]
       latency_ms: float
   ```
4. **Deterministic Policy Gate & System 2 Escalation**:
   If confidence $P \ge 0.75$, dispatches directly to the Control Plane. If confidence $< 0.75$ or complex DAG planning is required, escalates to a local reasoning specialist (`llama-3.3-70b` or `qwen-2.5-14b`) or heuristic deterministic planner.

---

### Pillar 2: Dynamic Plan Engine, Work Unit DAG ($G_{WU}$) & User Intervention Gate

Adheres strictly to [[ADR-0016]]:
1. **Versioned Work Unit DAG ($G_{WU}$)**:
   Translates user goals or quick-load scenarios into an explicit DAG of typed Work Units ($W_i$):
   - `WU-01: Ingestion_MIR` (Parse file to MIR schema)
   - `WU-02: Retrieval_Grounding` (Index local SOPs and fetch relevant standard clauses)
   - `WU-03: Verification_SMT` (Z3 SMT solver evaluation of ASME B31.3 & API 510)
   - `WU-04: Deliverable_Docx` (Compile PSU Board Approval Memo)
   - `WU-05: Deliverable_Xlsx` (Compile Audit Spreadsheet with live formulas)
   - `WU-06: Deliverable_Pptx` (Compile Executive Briefing Slide Deck)
2. **User Intervention Gate (Prune | Edit | Reorder)**:
   The UI renders the planned DAG before execution starts. The operator can:
   - **Prune**: Deselect non-essential intermediate nodes (e.g. toggle off PPTX generation to save time, or toggle off OCR if digital tables are verified).
   - **Edit**: Adjust design pressure ($P$), allowable stress ($S$), or corrosion allowance ($c$).
   - **Reorder**: Adjust execution sequence and dependencies.
3. **Dynamic Replanning Engine with Sibling Protection**:
   If an intermediate tool fails or returns contradictory physical evidence, the planner invalidates dependent child nodes while keeping verified sibling branches committed:
   $$\text{Invalidate}(A) = \{A\} \cup \bigcup_{A' \in \text{Children}(A)} \text{Invalidate}(A')$$

---

### Pillar 3: Modality-Aware Ingestion Fabric & Multimodal Intermediate Representation (MIR)

Adheres strictly to [[ADR-0012]]:
1. **Multi-Tier Ingestion Flow**:
   - **Tier 1 (Fast Digital Extraction)**: Extracts tabular CML inspection grids using `pdfplumber` in $<50\text{ms}$.
   - **Tier 2 (Local OCR Fallback)**: If no digital text layer is detected, activates lightweight local OCR (`rapidocr`/`pytesseract`) to locate coordinate bounding boxes.
   - **Tier 3 (Assisted Field Mapping Modal)**: If table boundaries remain ambiguous, the UI presents an interactive review dialog showing extracted text snippets alongside pre-populated column suggestions, completely preventing unhandled HTTP 500 crashes.
2. **Standardized MIR Schema (`MIRDocument`)**:
   Normalizes extracted data into a canonical representation capturing geometry, confidence, and coordinate provenance:
   ```python
   class MIRCell(BaseModel):
       text: str
       confidence: float
       bbox: List[float]  # [x0, y0, x1, y1]
       row_idx: int
       col_idx: int

   class MIRTable(BaseModel):
       table_id: str
       headers: List[str]
       rows: List[List[MIRCell]]
       source_page: int

   class MIRDocument(BaseModel):
       doc_id: str
       sha256: str
       tables: List[MIRTable]
       raw_text_chunks: List[str]
   ```

---

### Pillar 4: Dual-Mode Execution Broker, Office Deliverables & Artifact Validator

Adheres strictly to [[ADR-0010]] and [[ADR-0014]]:
1. **Dual-Mode Execution Broker**:
   - **Primary Mode (Container Isolation)**: Dispatches tool jobs to a local Docker/Podman worker (`smitrace-worker`) enforcing memory limits (512MB), CPU limits (5s), and network isolation (`--network none`).
   - **Automatic Fallback Mode (Virtualenv Subprocess)**: The broker performs a 500ms daemon health check. If Docker is absent or permissions fail, it executes tools inside an isolated virtualenv subprocess (`python -m compilers`) with restricted temporary directory access, ensuring **100% demo continuity**.
2. **Real Multi-Format Deliverables**:
   - **Board Approval Note (`.docx`)**: Corporate PSU styling, official header banner, CML summary table with pass/fail badges, step-by-step Z3 mathematical callouts, and digital sign-off blocks.
   - **Audit Workbook (`.xlsx`)**: Multi-tab workbook (`Summary`, `CML Data`, `ASME Verification`, `API 510 Life`, `Competency Verification`) preserving active, recalculable formulas (`=C4-D4*E4`) and 16-decimal-place precision.
   - **Executive Slide Deck (`.pptx`)**: High-impact briefing slides summarizing risk matrices and findings.
3. **Artifact Validator Gate**:
   Pre-commit validation checking:
   - Valid ZIP container structure via `zipfile.is_zipfile()`.
   - Complete OOXML schemas (`word/document.xml`, `xl/workbook.xml`, `ppt/presentation.xml`).
   - Formula syntax integrity (zero `#REF!` or `#VALUE!` anomalies).

---

### Pillar 5: Assurance Plane — AST Security Visitor, Hardened Z3 SMT Gate & Anti-Collapse Loop

Adheres strictly to [[ADR-0011]]:
1. **AST Security Visitor Gate (`ast_visitor.py`)**:
   Statically inspects all learner-submitted code or dynamically generated calculation scripts in $<5\text{ms}$ prior to sandbox dispatch:
   - Rejects forbidden AST nodes: `Import` or `ImportFrom` referencing `os`, `sys`, `subprocess`, `socket`, `shutil`, `urllib`.
   - Rejects dangerous built-ins: `eval()`, `exec()`, `compile()`, `__import__()`.
   - Rejects ungrounded file modification: `open()` with write (`'w'`, `'a'`) or binary execution modes.
2. **Hardened Z3 SMT Theorem Prover (`verifier.py`)**:
   - Encodes ASME B31.3 (§304.1.2) coupled MAWP equation:
     $$\Phi_{\text{MAWP}} = \left( P \le \frac{2 \cdot S \cdot E \cdot (t - c)}{D - 2 \cdot Y \cdot (t - c)} \right) \land (t \ge t_{\text{min}})$$
   - Encodes API 510 cylindrical shell retirement thickness and remaining service life:
     $$t_{\text{min}} = \frac{P \cdot R}{S \cdot E - 0.6 \cdot P}, \quad L = \frac{t_{\text{act}} - t_{\text{min}}}{c_r}$$
   - Uses exact rational arithmetic (`z3.Q(n, d)`) to eliminate floating-point drift.
   - Enforces **Hardened 3.0s Async Watchdog** (`asyncio.wait_for(timeout=3.0)`).
   - Defensively clamps non-physical values ($c_r \le 0 \to 999.0\text{y}$, $P > 0, D > 0$).
   - Returns live SAT/UNSAT millisecond telemetry with full SMT-LIB2 transcripts.
3. **State-Isolated Anti-Collapse Loop & `WAITING_HUMAN` Gate**:
   When solver counterexamples or sandbox assertion failures occur:
   - Enters an isolated remediation loop with max 3 turns.
   - Agent synthesizes diagnostic hints and counterexample analysis.
   - If unverified after 3 turns, safely transitions to `WAITING_HUMAN` gate for human engineer sign-off.

---

### Pillar 6: Pre-Bundled Local Retrieval Engine & Provenance Graph

Adheres strictly to [[ADR-0004]] and [[ADR-0009]]:
1. **Zero-Download Air-Gap Operation**:
   - In-tree local embedding model weights (`all-MiniLM-L6-v2` ONNX/Safetensors, ~80MB) pre-bundled directly in `sample_data/models/`.
   - Pre-seeded SQLite vector cache (`knowledge.db`) indexing plant SOPs and piping standards at build time. Cold queries complete in $<10\text{ms}$.
2. **Dual-Index Hybrid Retrieval**:
   - **Lexical Search (BM25)**: Exact matches for equipment tags (`10-P-101A`), CML identifiers, and standard clauses.
   - **Dense Semantic Search**: Cosine similarity over local embeddings.
   - **Reciprocal Rank Fusion (RRF)**:
     $$RRF(d) = \frac{1}{60 + \text{rank}_{\text{lexical}}(d)} + \frac{1}{60 + \text{rank}_{\text{vector}}(d)}$$
3. **Chunk-Level Cryptographic Provenance**:
   Binds every citation to `document_id`, `source_location`, `page_number`, `revision`, `chunk_hash`, and `timestamp`.

---

### Pillar 7: Sandboxed Coding Competency Lifecycle & Single-Click Launcher

1. **Sandboxed Coding Competency Lifecycle**:
   ```
   CASE ➔ Knowledge/Evidence ➔ Coding Task ➔ AST Gate ➔ Sandbox Run ➔ Fail ➔ AI Hint ➔ Fix ➔ Verified Record
   ```
   - Curated engineering challenges (`API510-CALC-01` and `UT-PARSER-02`).
   - Two-step evaluation: "Run Tests" (public test cases with diff viewer) and "Submit Assessment" (public + hidden test suite).
   - Inline Agent Diagnostic Guidance: Pinpoints standard clause violations without leaking solution code.
   - Cryptographic Evidence Sealing: Commits learner code SHA-256, test matrices, and traces into `./cases/{case_id}/competency_record.json`.
2. **Single-Click Zero-Dependency Launcher (`start_demo.py`)**:
   - Pre-flight verification of Python virtual environment and port 8000 recycling.
   - Mounts pre-built static React bundle directly from FastAPI (`backend/app/static/`).
   - Opens the browser automatically to `http://127.0.0.1:8000/` with **zero `npm` or Node.js commands** on presentation day.

---

## 4. Canonical Directory Layout (Hackathon MVP)

```
hackathon-scope/
├── README.md                   # Hackathon scope comparison & quickstart guide
├── PRD.md                      # Hackathon Product Requirements Document
├── TRD.md                      # Hackathon Technical Requirements Document
├── Architecture.md             # System Architecture Document (this file)
├── ToDo.md                     # 3-Day Actionable Sprint Roadmap
├── State.md                    # Active sprint state & verification tracking
├── context.md                  # Runtime environment & statutory standards context
│
├── config/
│   └── models.yaml             # Declarative Model Registry (Laya ONNX, Qwen Coder, etc.)
│
├── backend/
│   ├── Dockerfile              # smitrace-worker container definition
│   ├── requirements.txt        # Python backend dependencies
│   ├── app/
│   │   ├── main.py             # FastAPI entrypoint (binds 127.0.0.1:8000, mounts static UI)
│   │   ├── routers/
│   │   │   ├── cases.py        # /api/v1/cases/upload, /sample/{id}, /dag, /dag/prune, /execute
│   │   │   ├── knowledge.py    # /api/v1/knowledge/query, /api/v1/knowledge/ingest
│   │   │   ├── competency.py   # /api/v1/competency/challenges, /run, /diagnose, /submit
│   │   │   └── telemetry.py    # /api/v1/telemetry/status-bar
│   │   ├── core/
│   │   │   ├── planner.py      # Dynamic Plan Engine (WorkUnit DAG, replanning, step pruning)
│   │   │   ├── vault.py        # Relative case vault (./cases/{id}/) & SHA-256 hashing
│   │   │   ├── parser.py       # Multi-tier ingestion parser (pdfplumber + OCR ➔ MIR)
│   │   │   ├── ast_visitor.py  # AST Security Visitor (<5ms static sandbox gate)
│   │   │   ├── verifier.py     # Hardened z3-solver (3.0s watchdog, physical guards, Q rationals)
│   │   │   ├── tool_runner.py  # Dual-Mode Execution Broker (Docker + venv fallback)
│   │   │   ├── compilers.py    # Programmatic python-docx, python-pptx & openpyxl compilers
│   │   │   ├── artifact_validator.py # OOXML ZIP & formula syntax validation
│   │   │   ├── competency_sandbox.py # Sandboxed coding competency test harness
│   │   │   └── retrieval.py    # Local Hybrid Retrieval Engine (BM25 + vector + RRF)
│   │   ├── models/
│   │   │   ├── mir.py          # Pydantic Multimodal Intermediate Representation (MIR) schemas
│   │   │   ├── dag.py          # Pydantic WorkUnit & DAG execution schemas
│   │   │   ├── schemas.py      # Case, CML, and analysis schemas
│   │   │   ├── knowledge.py    # Chunk and retrieval schemas
│   │   │   └── competency.py   # Coding challenge, test matrix, and sealed record schemas
│   │   └── services/
│   │       └── model_gateway.py # Declarative Model Gateway & In-Process Laya ONNX routing
│   ├── cases/                  # Cross-platform relative vault storage (gitignored)
│   ├── sample_data/            # Bundled demo datasets, SOPs, and pre-bundled models
│   │   ├── models/             # Pre-bundled local embedding weights & Laya ONNX
│   │   ├── sops/               # Seeded plant SOPs & manuals
│   │   ├── case_degraded_elbow.pdf # Bundled demo case A
│   │   └── case_compliant.pdf  # Bundled demo case B
│   └── tests/                  # Unit tests (test_dag.py, test_verifier.py, test_ast.py)
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx             # Top-level view coordinator
│       ├── index.css           # Sovereign industrial dark design system
│       └── components/
│           ├── IngestionZone.jsx       # Beat 1: Drag-and-drop & 1-click scenario buttons
│           ├── WorkUnitDAGViewer.jsx   # Beat 2: User Intervention Gate (prune/edit DAG nodes)
│           ├── VaultSummary.jsx        # Case registration & SHA-256 Merkle list badge
│           ├── AnalysisFeed.jsx        # Beat 3: Active DAG execution & per-CML status cards
│           ├── DeliverableCard.jsx     # Beat 4: .docx, .pptx, & .xlsx instant downloads
│           ├── ProofDrawer.jsx         # Slide-out exact rational proof & SMT-LIB2 drawer
│           ├── KnowledgeDrawer.jsx     # Slide-out knowledge citations & provenance drawer
│           ├── CompetencySandbox.jsx   # Coding competency editor & test console
│           ├── DiagnosticPanel.jsx     # Inline Agent failure diagnostic guidance
│           └── StatusBar.jsx           # Discreet bottom air-gap & telemetry status bar
│
└── start_demo.py               # Single-click zero-dependency presentation launcher
```

---

## 5. Operational Presentation Flows

### 5.1 The User-Governed Inspection Flow (4-Beat DAG Execution)
1. **Beat 1 (Ingestion & Quick-Load)**: Operator drops a raw PDF inspection sheet OR clicks a 1-click scenario button (*Case A: Degraded Elbow* vs *Case B: Compliant Circuit*). Multi-tier parser converts data to `MIRDocument`.
2. **Beat 2 (DAG Proposal & User Intervention Gate)**: The Dynamic Plan Engine synthesizes a 6-node Work Unit DAG. The operator inspects the DAG, toggles/prunes intermediate steps (e.g. skips PPTX generation or adjusts design pressure $P$), and commits the plan.
3. **Beat 3 (Deterministic Analysis & Z3 SMT Proof)**: The Control Plane dispatches leases to workers. Z3 SMT evaluates ASME B31.3 and API 510 under the 3.0s watchdog. Compliant points show green PASS; degraded elbow CML-03 shows red REPAIR REQUIRED with rational deficiency formulas ($t_m = \frac{223}{1008}\text{ in}$).
4. **Beat 4 (Verified Deliverable Payoff)**: Instant binary downloads for `.docx` Board Memo, `.pptx` Slide Deck, and `.xlsx` Audit Workbook with live recalculable Excel formulas, validated by the Artifact Validator.

### 5.2 Sandboxed Coding Competency Lifecycle Flow
1. **Task & Evidence**: Active case vault grounds learner in plant SOPs and ASME B31.3 requirements.
2. **AST Security Gate**: Learner's submitted Python code passes through `ASTVisitor` in $<5\text{ms}$ to ensure zero forbidden system calls.
3. **Sandbox Run**: Dual-Mode Broker runs public test cases in micro-sandbox (`--network none`, 512MB RAM, 5s timeout); exposes granular input/expected/actual diffs.
4. **Inline Agent Diagnostic**: Learner clicks "Diagnose Failure"; agent analyzes trace and standard clauses to guide the fix without leaking solution code.
5. **Sealed Submission**: Learner submits final revision; full suite (public + hidden) evaluates and seals cryptographic record into `./cases/{case_id}/competency_record.json`.
