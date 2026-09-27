# Hackathon Roadmap (ToDo) — 3-Day Sprint (SMITRACE)

> **Actionable 3-Day Sprint Plan — Hackathon Scope MVP**  
> *Mirrored from the Target Enterprise Architecture with Reduced Python/React Complexity for 100% Demo Reliability.*

---

## Day 1: Backend Foundation, Declarative Model Gateway, Dynamic Plan Engine & Assurance Core [PRIORITY 1]

- [ ] **Virtual Environment & Dependencies**:
  - [ ] Initialize Python 3.11 virtual environment in `hackathon-scope/backend/`.
  - [ ] Install requirements (`fastapi`, `uvicorn`, `z3-solver`, `pdfplumber`, `rank-bm25`, `sentence-transformers`, `onnxruntime`, `python-docx`, `python-pptx`, `openpyxl`, `pyyaml`, `pydantic`).
- [ ] **Declarative Model Registry & Gateway**:
  - [ ] Author `hackathon-scope/config/models.yaml` declaring local model profiles (`laya-modernbert-onnx`, `qwen-2.5-coder-7b`, `qwen-2.5-14b-instruct`).
  - [ ] Implement `backend/app/services/model_gateway.py`: Loads `models.yaml`, executes in-process Laya ONNX non-autoregressive decision model (<15ms) via `onnxruntime` (`CPUExecutionProvider`), returns typed `CanonicalDecision`, with deterministic local fallback.
- [ ] **Dynamic Plan Engine & User Intervention Gate**:
  - [ ] Implement `backend/app/models/dag.py`: Pydantic models for `WorkUnit`, `WorkUnitState`, and `DAGExecutionPlan`.
  - [ ] Implement `backend/app/core/planner.py`: Generates the 6-node Work Unit DAG ($G_{WU}$), provides step pruning logic (`prune_step`), and implements sibling-protected replanning.
- [ ] **Assurance Plane Core**:
  - [ ] Implement `backend/app/core/ast_visitor.py`: Static Python `ast.NodeVisitor` rejecting forbidden imports (`os`, `sys`, `subprocess`, `socket`) and dangerous functions (`eval`, `exec`) in $<5\text{ms}$.
  - [ ] Implement `backend/app/core/verifier.py`: Microsoft Z3 SMT solver for ASME B31.3 (§304.1.2) and API 510 with **Hardened 3.0s Async Watchdog** (`asyncio.wait_for(timeout=3.0)`), physical guards ($c_r \le 0 \to 999.0\text{y}$, $P > 0, D > 0$), exact rationals (`z3.Q()`), and live SAT/UNSAT millisecond telemetry.
- [ ] **State & Execution Plane Foundation**:
  - [ ] Implement `backend/app/core/vault.py`: Cross-platform relative case vault creation under `./cases/{case_id}/` and SHA-256 Merkle leaf digests.
  - [ ] Implement `backend/app/core/tool_runner.py`: **Dual-Mode Execution Broker** (`smitrace-worker` Docker container with 500ms probe $\to$ automatic fallback to virtualenv subprocess `python -m compilers`).
- [ ] **Unit Tests (Day 1)**:
  - [ ] `backend/tests/test_dag.py`: Validates DAG generation, step pruning, and serialization.
  - [ ] `backend/tests/test_verifier.py`: Validates exact rational arithmetic, watchdog timeout handling, and UNSAT detection on degraded points.
  - [ ] `backend/tests/test_ast.py`: Validates static rejection of malicious imports and functions.

---

## Day 2: Ingestion (MIR), Retrieval, Compilers & Competency Sandbox [PRIORITY 2]

- [ ] **Modality-Aware Ingestion Fabric (MIR)**:
  - [ ] Implement `backend/app/models/mir.py`: Pydantic `MIRDocument`, `MIRTable`, and `MIRCell` schemas.
  - [ ] Implement `backend/app/core/parser.py`: Multi-Tier Ingestion Parser (Tier 1 `pdfplumber` <50ms $\to$ Tier 2 local OCR fallback $\to$ Tier 3 Assisted Field Mapping modal trigger with candidate columns).
- [ ] **Local Hybrid Retrieval Engine & Provenance**:
  - [ ] Implement `backend/app/core/chunker.py`: Semantic chunker tracking `document_id`, `source_location`, `page_number`, `revision`, `chunk_hash`, and `timestamp`.
  - [ ] Implement `backend/app/core/retrieval.py`: Dual-index hybrid retrieval engine combining BM25 (`rank-bm25`) + **Pre-Bundled Offline Embeddings** (`backend/sample_data/models/`) + **Pre-Seeded SQLite Vector Cache** (`knowledge.db`) + Reciprocal Rank Fusion (RRF).
  - [ ] Implement `backend/app/routers/knowledge.py`: Endpoints for SOP ingestion and hybrid search.
- [ ] **Deliverable Compilers & Artifact Validator**:
  - [ ] Implement `backend/app/core/compilers.py`:
    - [ ] `generate_docx()`: Programmatic `.docx` PSU Board Approval Memo with styled header banner, metadata table, CML status table with badges, Z3 proof callout, competency verification summary, and sign-off blocks.
    - [ ] `generate_pptx()`: Programmatic `.pptx` Executive Briefing presentation deck.
    - [ ] `generate_xlsx()`: Programmatic multi-tab `.xlsx` Audit Workbook (`Summary`, `CML Data`, `ASME Verification`, `API 510 Life`, `Competency Verification`) preserving live recalculable formulas (`=C4-D4*E4`).
  - [ ] Implement `backend/app/core/artifact_validator.py`: Pre-commit validator checking ZIP integrity, OOXML schemas, and formula syntax.
- [ ] **Sandboxed Coding Competency Subsystem**:
  - [ ] Implement `backend/app/models/competency.py`: Pydantic schemas for challenges, test cases, execution telemetry, diagnostics, and sealed records.
  - [ ] Implement `backend/app/core/competency_sandbox.py`: Isolated test harness and runner using `DualModeToolRunner` (Docker worker `--network none`, 512MB RAM, 5.0s timeout; fallback to isolated Python subprocess with stripped env).
  - [ ] Seed curated challenges: `API510-CALC-01` (API 510 Remaining Life & Retirement Thickness calculation with boundary guards) and `UT-PARSER-02` (Ultrasonic Thickness gauge log string sanitizer & validator).
  - [ ] Implement `backend/app/routers/competency.py`: Endpoints `GET /challenges`, `GET /challenges/{id}`, `POST /run` (public tests), `POST /diagnose` (agent failure explanation without code), and `POST /submit` (full test suite + cryptographic SHA-256 seal into `./cases/{case_id}/competency_record.json`).
- [ ] **Sample Datasets & Case Router**:
  - [ ] Create bundled sample inspection datasets & SOPs in `backend/sample_data/`: `case_degraded_elbow.pdf`, `case_compliant.pdf`, and `sops/SOP_Piping_Inspection_Rev3.pdf`.
  - [ ] Implement `backend/app/routers/cases.py`:
    - [ ] `POST /api/v1/cases/upload`: File upload (PDF/CSV/XLSX).
    - [ ] `POST /api/v1/cases/sample/{scenario_id}`: 1-click scenario loader (`degraded-elbow` vs `compliant-circuit`).
    - [ ] `GET /api/v1/cases/{case_id}/dag`: Returns proposed Work Unit DAG.
    - [ ] `POST /api/v1/cases/{case_id}/dag/prune`: Prunes or un-prunes a work unit step.
    - [ ] `POST /api/v1/cases/{case_id}/execute`: Executes the committed DAG and issues deliverables.

---

## Day 3: React UI Workbench & Presentation Polish [PRIORITY 3]

- [ ] **Beat 1: Ingestion & Quick Scenarios**:
  - [ ] Build `IngestionZone.jsx`: Drag-and-drop file upload zone + 1-Click "Quick Load Demo Scenarios" buttons (*Case A: Degraded Elbow* vs *Case B: Compliant Circuit*).
  - [ ] Build `VaultSummary.jsx`: Case registration badge & SHA-256 Merkle hash list display.
- [ ] **Beat 2: User Intervention Gate (Work Unit DAG Viewer)**:
  - [ ] Build `WorkUnitDAGViewer.jsx`: Interactive visual graph displaying the 6 planned work units with toggle switches for step pruning (e.g. skip PPTX, skip OCR), parameter editing, and commit button.
- [ ] **Beat 3: Active Execution & Telemetry**:
  - [ ] Build `AnalysisFeed.jsx`: Live DAG execution checklist with millisecond telemetry, per-CML status cards, and cited SOP clauses.
  - [ ] Build `FieldMappingModal.jsx`: UI-assisted field mapping modal triggered if table columns require operator confirmation.
- [ ] **Beat 4: Deliverables & Drawers**:
  - [ ] Build `DeliverableCard.jsx`: Binary download cards for `.docx`, `.pptx`, and `.xlsx`.
  - [ ] Build `ProofDrawer.jsx`: Slide-out exact rational proof drawer displaying equations ($t_m = \frac{223}{1008}\text{ in}$), proof latency, and Z3 SMT-LIB2 code.
  - [ ] Build `KnowledgeDrawer.jsx`: Slide-out Knowledge Provenance drawer displaying document ID, revision, page, and chunk hash citations.
- [ ] **Coding Competency Sandbox View**:
  - [ ] Build `CompetencySandbox.jsx`: Code editor with syntax highlighting, challenge switcher (`API510-CALC-01` vs `UT-PARSER-02`), public test execution runner with diff viewer, and assessment submission.
  - [ ] Build `DiagnosticPanel.jsx`: Inline Agent Failure Diagnostic panel offering "Diagnose Failure" hints based on standard clauses without leaking solution code.
- [ ] **Sovereign Status Bar & Demo Launcher**:
  - [ ] Build `StatusBar.jsx`: Discreet bottom status bar displaying live air-gap (`127.0.0.1:8000`, 0 outbound packets), lease ID, 24GB MVP baseline compute state, and Z3 solver telemetry.
  - [ ] Implement `start_demo.py`: One-click zero-dependency launcher (verifies Python, recycles port 8000, mounts static React UI, and auto-opens default browser).
- [ ] **Dry-Run Rehearsal**:
  - [ ] Run full end-to-end inspection flow with step pruning under complete offline conditions.
  - [ ] Run full coding competency lifecycle (`CASE ➔ Knowledge ➔ Task ➔ Run ➔ Fail ➔ Hint ➔ Fix ➔ Verified Challenge`) with zero internet connection.
