# Context & Environment Metadata — Hackathon Scope (SMITRACE)

## 1. Operating Environment & Technology Stack
* **Project Subsystem**: SMITRACE Hackathon MVP (`hackathon-scope/`)
* **Backend Runtime**: Python 3.11+ 64-bit (`fastapi`, `uvicorn`, `z3-solver`, `pdfplumber`, `rank-bm25`, `sentence-transformers`, `onnxruntime`, `python-docx`, `python-pptx`, `openpyxl`, `pyyaml`, `pydantic`)
* **Dynamic Plan Engine**: In-process DAG planner decomposing missions into typed Work Units ($G_{WU}$), providing an interactive **User Intervention Gate** for step pruning (e.g. skipping OCR or suppressing PPTX) and dynamic replanning with sibling protection.
* **Declarative Model Gateway**: Dynamic configuration loader reading `config/models.yaml`, pairing **In-Process Laya ONNX** (`onnxruntime` CPUExecutionProvider, <15ms) for System 1 routing with local reasoning fallback.
* **Assurance Core**: Microsoft **`z3-solver`** running First-Order Non-Linear Real Arithmetic (`QF_NRA`) with exact `z3.Q()` rationals, a **3.0s async watchdog**, defensive physical guards, and an **AST Security Visitor** (`ast.NodeVisitor`) rejecting dangerous syscalls in $<5\text{ms}$.
* **Tool Execution**: **Dual-Mode Execution Broker**
  - Primary: Docker / Podman Worker (`smitrace-worker`) with Python 3.11-slim, resource constraints (512MB RAM, 5s timeout, `--network none`)
  - Fallback: In-process virtualenv subprocess (`python -m compilers`) triggered if Docker health check fails within 500ms
* **Frontend Runtime**: React 18 + Vite + Zustand + Vanilla CSS Sovereign Design System (compiled into `backend/app/static/` for zero-Node.js presentation runtime)
* **Serving Port**: `http://127.0.0.1:8000` (Single-port serving: FastAPI mounts static React bundle at root `/` and API at `/api/v1/`)
* **Pre-Bundled Offline Embeddings**: In-tree `all-MiniLM-L6-v2` ONNX/Safetensors weights (<80MB) and pre-seeded SQLite vector cache (`knowledge.db`)
* **MVP Baseline Hardware Target**:
  - **CPU**: Modern x86_64 (8–16 cores)
  - **RAM**: 32 GB – 64 GB
  - **GPU**: 24 GB VRAM class (NVIDIA RTX 4090 / RTX 6000 Ada / A10G)
  - **Storage**: 1 TB – 2 TB NVMe SSD
  - **Models**: 4-bit AWQ / 8-bit GGUF quantized models
  - **Target OS**: Linux First (Ubuntu 22.04 LTS / RHEL 9) with Windows 11 host parity via WSL2 / Docker Desktop
* **Workspace Directory**: `c:\Users\Vinyas G M\OneDrive\Desktop\smitrace\hackathon-scope`

---

## 2. Canonical Directory Structure Reference

```
hackathon-scope/
├── README.md                   # Hackathon vs Enterprise comparison & presentation guide
├── PRD.md                      # Hackathon Product Requirements Document
├── TRD.md                      # Hackathon Technical Requirements Document
├── Architecture.md             # Streamlined 4-Plane System Architecture Document
├── ToDo.md                     # Actionable 3-Day Sprint Roadmap
├── State.md                    # Active Sprint State & Verification Metrics
├── context.md                  # Runtime Environment & Engineering Standards Context (this file)
│
├── config/
│   └── models.yaml             # Declarative Model Registry (Laya ONNX, Qwen Coder, etc.)
│
├── backend/
│   ├── Dockerfile              # Docker/Podman worker container definition
│   ├── requirements.txt        # Backend dependencies
│   ├── app/
│   │   ├── main.py             # FastAPI entrypoint (binds 127.0.0.1:8000, mounts static UI)
│   │   ├── static/             # Pre-built React static bundle (index.html, assets/)
│   │   ├── routers/
│   │   │   ├── cases.py        # /api/v1/cases/upload, /sample/{id}, /dag, /dag/prune, /execute
│   │   │   ├── knowledge.py    # /api/v1/knowledge/ingest, /api/v1/knowledge/query
│   │   │   ├── competency.py   # /api/v1/competency/challenges, /run, /diagnose, /submit
│   │   │   └── telemetry.py    # /api/v1/telemetry/status-bar
│   │   ├── core/
│   │   │   ├── planner.py      # Dynamic Plan Engine (WorkUnit DAG, replanning, step pruning)
│   │   │   ├── vault.py        # Relative case vault (./cases/{id}/) & SHA-256 hashing
│   │   │   ├── parser.py       # Multi-tier ingestion parser (pdfplumber + OCR ➔ MIR)
│   │   │   ├── ast_visitor.py  # AST Security Visitor (<5ms static sandbox gate)
│   │   │   ├── verifier.py     # Hardened z3-solver (3.0s watchdog, physical guards, Q rationals)
│   │   │   ├── compilers.py    # Programmatic python-docx, python-pptx & openpyxl compilers
│   │   │   ├── tool_runner.py  # Dual-Mode Execution Broker (Docker + virtualenv fallback)
│   │   │   ├── artifact_validator.py # OOXML ZIP & formula syntax validation
│   │   │   ├── competency_sandbox.py # Sandboxed coding competency test harness
│   │   │   ├── retrieval.py    # Local Hybrid Retrieval Engine (BM25 + Local Embeddings + RRF)
│   │   │   ├── chunker.py      # Semantic chunking with cryptographic provenance
│   │   │   └── connectors.py   # Air-gapped connectors (Folder, SMB/NFS, PST/EML)
│   │   ├── models/
│   │   │   ├── mir.py          # Pydantic Multimodal Intermediate Representation (MIR) schemas
│   │   │   ├── dag.py          # Pydantic WorkUnit & DAG execution schemas
│   │   │   ├── schemas.py      # Case, CML, and analysis schemas
│   │   │   ├── knowledge.py    # Chunk and retrieval schemas
│   │   │   └── competency.py   # Coding challenge, test matrix, and sealed record schemas
│   │   └── services/
│   │       └── model_gateway.py # Declarative Model Gateway & In-Process Laya ONNX routing
│   ├── cases/                  # Cross-platform relative vault storage (gitignored)
│   ├── sample_data/            # Bundled demo datasets, sample SOPs, and models
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

## 3. Active Domain Standards & Statutory Invariants

1. **ASME B31.3 (§304.1.2)**:
   - Process piping minimum required wall thickness ($t_m$):
     $$t_m = \frac{P \cdot D}{2(S \cdot E + P \cdot Y)} + c$$
   - Coupled MAWP assertion: $\Phi_{\text{MAWP}} = \text{SAT} \iff t_{\text{act}} \ge t_m$.
2. **API 510 (§7.1)**:
   - Pressure vessel retirement thickness ($t_{\text{min}}$) and remaining service life ($L$):
     $$t_{\text{min}} = \frac{P \cdot R}{S \cdot E - 0.6 \cdot P}, \quad L = \frac{t_{\text{act}} - t_{\text{min}}}{c_r}$$
   - Statutory retirement threshold: $L < 2.0\text{ years} \implies \text{CRITICAL REPAIR REQUIRED}$.
3. **Factories Act 1948 §31 & OISD-STD-105**:
   - Mandates third-party verifiable engineering calculation records and non-destructive testing (NDT) provenance.
