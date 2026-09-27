# Project State — Hackathon Scope (SMITRACE)

## Current Phase: Architecture & Specification Mirroring Completed
**Last Updated**: 2026-09-26  
**Status**: Ready for Day 1 Implementation

---

### 1. Status Overview

* **Hackathon Specification Suite (`hackathon-scope/`)**:
  - [PRD.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/PRD.md): Hardened Product Requirements Document specifying the 4-plane separation of authority, declarative Model Gateway, dynamic Plan Engine with Work Unit DAG and User Intervention Gate, MIR schema, AST Security Visitor, hardened Z3 SMT solver, dual-mode execution broker, and sandboxed coding competency.
  - [TRD.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/TRD.md): Technical Requirements Document specifying code contracts for `config/models.yaml`, Pydantic DAG schemas, AST visitor, exact rational Z3 proofs (`z3.Q()`), Docker/subprocess fallback, and programmatic deliverable compilers (`python-docx`, `python-pptx`, `openpyxl`).
  - [Architecture.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/Architecture.md): System Architecture Document detailing the four-plane topology, seven architectural pillars, complexity reduction matrix, and operational demonstration flows.
  - [ToDo.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/ToDo.md): Actionable 3-day sprint roadmap with priority gates across Day 1 (Foundation & Assurance), Day 2 (Ingestion, Compilers & Competency Sandbox), and Day 3 (React UI & Presentation Polish).
  - [README.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/README.md): Hackathon Scope vs. Target Enterprise comparison guide and operational walkthrough.
  - [context.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/context.md): Runtime environment, technology stack versions, and statutory engineering domain standards.

---

### 2. Hardened Architectural Invariants (Hackathon MVP)

1. **Declarative Model Gateway & In-Process Laya ONNX Routing**:
   - Model configurations loaded dynamically from `config/models.yaml`.
   - In-process `onnxruntime` (<15ms, <800MB RAM) running the Laya ONNX non-autoregressive decision model on ModernBERT.
   - Normalizes predictions into typed Pydantic `CanonicalDecision` objects.
2. **Dynamic Plan Engine, Work Unit DAG ($G_{WU}$) & User Intervention Gate**:
   - Missions decompose into an explicit, versioned Work Unit DAG ($G_{WU}$) rather than a hardcoded rigid pipeline.
   - User Intervention Gate renders the DAG in the UI and allows the operator to prune intermediate steps (e.g. skip PPTX generation or skip OCR) and edit parameters prior to execution.
   - Dynamic replanning invalidates dependent child nodes while preserving verified sibling nodes (**Sibling Protection Guarantee**).
3. **Modality-Aware Ingestion Fabric & MIR Schema**:
   - Multi-tier parser: Tier 1 (`pdfplumber` <50ms) $\to$ Tier 2 (local OCR fallback) $\to$ Tier 3 (Assisted Field Mapping modal).
   - Normalizes extracted tables into a typed `MIRDocument` Pydantic schema with bounding boxes and cell coordinates.
4. **Assurance Plane: AST Security Visitor & Neurosymbolic Z3 SMT Gate**:
   - Static AST Security Visitor (`ast_visitor.py`) rejects forbidden imports (`os`, `sys`, `subprocess`, `socket`) and dangerous functions (`eval`, `exec`) in $<5\text{ms}$.
   - Microsoft `z3-solver` using exact `z3.Q()` rational arithmetic for ASME B31.3 (§304.1.2) and API 510.
   - `asyncio.wait_for(timeout=3.0)` watchdog prevents non-linear CAD hangs.
   - Defensively clamps non-physical values ($c_r \le 0 \to 999.0\text{y}$, $P > 0, D > 0$).
   - Returns live SAT/UNSAT millisecond telemetry with SMT-LIB2 transcripts and an exact **0.0% False Assurance Rate (FAR)**.
5. **Dual-Mode Execution Broker & Tool Environment**:
   - Primary: Packaging Python, `openpyxl`, `python-docx`, `python-pptx`, and math engines in an isolated Docker / Podman worker (`--network none`, 512MB RAM, 5s CPU limit).
   - Fallback: 500ms Docker daemon health check; automatically switches to an in-process virtualenv subprocess (`python -m compilers`) if Docker is absent or unprivileged, preventing presentation crashes.
   - Post-generation `ArtifactValidator` checks ZIP structure, formula syntax, and document integrity.
6. **Local Hybrid Retrieval Engine & Seeded Vector Cache**:
   - Pre-bundled in-tree local embedding model weights (`all-MiniLM-L6-v2` ONNX/Safetensors, <80MB) and pre-seeded SQLite vector database (`knowledge.db`).
   - Dual-index retrieval: BM25 lexical + local vector cosine similarity fused via Reciprocal Rank Fusion (RRF).
   - Chunk-level cryptographic provenance tracking (`document_id`, `source_location`, `page_number`, `revision`, `chunk_hash`, `timestamp`).
7. **Sandboxed Coding Competency Lifecycle & Authentic Learner Record**:
   - Short-lived isolated execution via Dual-Mode Execution Broker (`smitrace-worker` Docker container with `--network none`, 512MB RAM, 5.0s timeout; fallback to isolated Python subprocess with stripped env).
   - Curated challenge pair: `API510-CALC-01` (Remaining Life & Retirement Thickness) and `UT-PARSER-02` (Ultrasonic Thickness gauge string sanitizer & validator).
   - Two-step evaluation: "Run Tests" (public tests with input/expected/actual diffs) and "Submit Assessment" (full public + hidden test suite).
   - Inline Agent Diagnostic Guidance: Explains failure causes referencing standard clauses without emitting solution code.
   - Cryptographic proof sealing: Generates `./cases/{case_id}/competency_record.json` with SHA-256 hash registered in case manifest and exported to `.docx` / `.xlsx` deliverables.
8. **Single-Click Zero-Dependency Launcher (`start_demo.py`)**:
   - Verifies Python 3.10+ environment and recycles port 8000 conflicts.
   - Mounts pre-built static React bundle directly from FastAPI (`backend/app/static/`), eliminating Node.js or `npm run dev` dependencies on evaluation day.
   - Automatically opens the default browser on `http://127.0.0.1:8000/`.

---

### 3. Immediate Next Milestones (Day 1 Execution)
1. Initialize Python virtual environment inside `hackathon-scope/backend/` and install requirements.
2. Author `hackathon-scope/config/models.yaml` and implement `backend/app/services/model_gateway.py`.
3. Implement `backend/app/models/dag.py` and `backend/app/core/planner.py` (Plan Engine with Work Unit DAG and step pruning).
4. Implement `backend/app/core/ast_visitor.py` (AST Security Visitor Gate).
5. Implement `backend/app/core/verifier.py` (Hardened Z3 SMT solver with 3.0s watchdog and exact rationals).
6. Implement `backend/app/core/vault.py` (Relative case vault and SHA-256 Merkle leaf digests).
7. Implement `backend/app/core/tool_runner.py` (Dual-Mode Execution Broker).
8. Author unit tests in `backend/tests/` (`test_dag.py`, `test_verifier.py`, `test_ast.py`).
