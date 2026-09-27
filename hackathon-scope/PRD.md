# Product Requirements Document (PRD) — Hackathon Scope (SMITRACE)

> **Sovereign AI Execution Plane & Industrial Engineering Workbench — Hackathon MVP Product Requirements**  
> *Mirrored from the Target Enterprise PRD with Reduced Python/React Complexity for 100% Demo Reliability.*

---

### 1. Executive Summary & Problem Statement

#### 1.1 Executive Summary
The SMITRACE Hackathon MVP is an air-gapped, sovereign, neurosymbolic industrial inspection workbench designed to demonstrate undeniable value to judges, plant integrity engineers, and Public Sector Undertaking (PSU) evaluators within a focused 3-day sprint. 

Departing from fragile, conversational single-model loops and rigid, uncustomizable pipelines, the Hackathon MVP mirrors the target enterprise **Four-Plane Separation of Authority** using a streamlined, high-performance stack (Python 3.11+ FastAPI + React 18):
1. **Intelligence Plane (Probabilistic)**: Employs a Declarative Model Gateway (`config/models.yaml`), In-Process Laya ONNX non-autoregressive decision model (<15ms) for System 1 capability routing, Dynamic Plan Engine generating versioned Work Unit DAGs ($G_{WU}$), and a Multi-Tier Ingestion Parser normalizing documents into a typed Multimodal Intermediate Representation (MIR) schema.
2. **State & Provenance Plane (Deterministic Control Plane)**: Provides an interactive **User Intervention Gate** allowing the operator to inspect, edit, prune intermediate steps (e.g. skip OCR or suppress PPTX generation), or reorder steps. Tracks task precedence and data lineage across a Dual-Graph State Ledger ($G_{WU}$ and $G_{Art}$) with an append-only SQLite WAL and relative case vault (`./cases/{case_id}/`).
3. **Execution Plane (Deterministic)**: Features a **Dual-Mode Execution Broker** (Docker/Podman container primary with 500ms fallback to an isolated virtualenv subprocess) ensuring 100% demo continuity, programmatic office deliverable compilers (`python-docx`, `python-pptx`, `openpyxl` with live formulas), and an isolated **Coding Competency Sandbox**.
4. **Assurance Plane (Deterministic Verifiers)**: Enforces a pre-execution **AST Security Visitor Gate** (<5ms rejection of dangerous calls), Microsoft Z3 SMT solver proofs for ASME B31.3 (§304.1.2) and API 510 with exact rationals (`z3.Q()`) and a 3.0s watchdog to guarantee **0.0% False Assurance Rate (FAR)**, and a 3-turn **State-Isolated Anti-Collapse Loop** escalating to `WAITING_HUMAN`.

**Core Invariant**:  
> *Models propose. Users govern. Sandboxes execute. Verifiers prove. The Control Plane commits.*

#### 1.2 Hackathon Problem Statement & Antidotes
1. **Rigid Script vs. Agentic Flexibility Trap**: Most hackathon projects hardcode a single linear script. SMITRACE empowers the user with an explicit **Work Unit DAG & User Intervention Gate** to prune or customize execution steps before running.
2. **Model Lock-In Trap**: Hardcoding a single LLM prevents adapting to local open-weight advances. SMITRACE uses a **Declarative Model Registry (`config/models.yaml`)** and Laya ONNX (<15ms) for System 1 routing.
3. **Fragile Un-Sandboxed Tool Execution**: Running code on the bare host causes Python dependency collisions and permission errors. SMITRACE implements a **Dual-Mode Execution Broker** with container isolation and automatic subprocess fallback.
4. **Ungrounded Conversational Hallucination**: AI models answer without grounding in real plant manuals. SMITRACE uses a **Local Hybrid Retrieval Engine** (BM25 + pre-bundled local vector cache) with cryptographic chunk citations.
5. **Catastrophic Arithmetic Drift**: Probabilistic LLMs cannot be trusted with pipe wall thickness ($t_m$) or remaining life ($L$) calculations. SMITRACE guarantees mathematical truth via **Z3 SMT formal theorem proofs** ($t_m = \frac{223}{1008}\text{ in}$).
6. **Unsafe & Unverified Learner Code**: When engineers write custom calculation scripts, evaluating them without sandboxing risks host corruption. SMITRACE pairs an **AST Security Visitor** with an isolated **Coding Competency Sandbox** and cryptographic record sealing.

---

### 2. Target Personas & Operational Roles

| Persona | Role & Responsibilities | Hackathon Demonstration Flow |
| :--- | :--- | :--- |
| **Plant Integrity Engineer / Learner** | Evaluates piping circuits, verifies ASME B31.3 / API 510 compliance, solves domain coding challenges. | Quick-loads degraded UT logs; inspects planned Work Unit DAG; prunes non-essential steps; reviews exact Z3 rational proofs ($t_m = \frac{223}{1008}\text{ in}$); solves domain coding challenges in the sandbox with agent hints. |
| **Refinery Safety Inspector (NDT)** | Collects ultrasonic thickness data at Condition Monitoring Locations (CMLs), maps corrosion thinning. | Observes automated table extraction of CML-01 to CML-05 into MIR schema; reviews automated red flagging of degraded elbow CML-03 ($t_{\text{act}} < t_m$). |
| **PSU Executive / Plant General Manager** | Approves capital maintenance budgets, reviews executive memos, certifies statutory compliance. | Downloads completed ISO/IEC 29500 `.docx` Board Memos, `.pptx` Briefing Decks, and `.xlsx` Audit Workbooks with live recalculable formulas and digital sign-off blocks. |
| **Statutory / Forensic Compliance Auditor** | Audits historical PTW authorizations, verifies cryptographic non-repudiation. | Inspects chunk provenance graph, Merkle event log, and cryptographically sealed competency records verifying code hash, test matrix, and execution traces. |

---

### 3. Operational Presentation Flows

#### 3.1 The User-Governed 4-Beat Inspection Pipeline
```
[ Beat 1: Ingestion & Quick-Load ] ──> [ Beat 2: DAG Proposal & User Gate ] ──> [ Beat 3: Z3 SMT Verification ] ──> [ Beat 4: Deliverable Payoff ]
```

1. **Beat 1 (Ingestion & Quick-Load)**: Operator drags and drops raw engineering inspection files (`.pdf`, `.csv`, `.xlsx`) OR clicks a 1-click demo scenario (*Case A: CML-03 Degraded Elbow [Repair Alert]* or *Case B: Nominal Circuit [Compliant]*). Multi-tier parser converts inputs into the standardized `MIRDocument` schema.
2. **Beat 2 (DAG Proposal & User Intervention Gate)**: The Dynamic Plan Engine synthesizes a 6-node Work Unit DAG. The operator inspects the DAG, toggles/prunes intermediate steps (e.g. skips PPTX generation to save time, or skips OCR if digital tables are verified), adjusts parameters, and commits execution.
3. **Beat 3 (Deterministic Analysis & Z3 SMT Proof)**: Workers execute under Control Plane leases. Z3 SMT evaluates ASME B31.3 (§304.1.2) and API 510 under the 3.0s watchdog. Compliant points show green PASS; degraded elbow CML-03 shows red REPAIR REQUIRED with rational deficiency formulas ($t_m = \frac{223}{1008}\text{ in}$).
4. **Beat 4 (Verified Deliverables & Payoff)**: Instant binary downloads for `.docx` Board Approval Note, `.pptx` Presentation Deck, and `.xlsx` Audit Workbook with active formulas (`=C4-D4*E4`), validated by the `ArtifactValidator`.

#### 3.2 Sandboxed Coding Competency Lifecycle
```
CASE ➔ Knowledge/Evidence ➔ Coding Task ➔ AST Security Gate ➔ Sandbox Run ➔ Fail ➔ AI Hint ➔ Fix ➔ Sealed Record
```

1. **Task & Evidence**: Active case vault grounds learner in plant SOPs and ASME B31.3 requirements.
2. **AST Security Gate**: Learner's submitted Python code passes through `ASTVisitor` in $<5\text{ms}$ to ensure zero forbidden system calls.
3. **Sandbox Run**: Dual-Mode Broker runs public test cases in micro-sandbox (`--network none`, 512MB RAM, 5s timeout); exposes granular input/expected/actual diffs.
4. **Inline Agent Diagnostic**: Learner clicks "Diagnose Failure"; agent analyzes trace and standard clauses to guide the fix without leaking solution code.
5. **Sealed Submission**: Learner submits final revision; full suite (public + hidden) evaluates and seals cryptographic record into `./cases/{case_id}/competency_record.json`.

---

### 4. Hackathon Functional Requirements

* **FR-H1 (Dual-Mode Ingestion & 1-Click Quick Scenarios)**:
  - Ingests structured PDF inspection sheets, CSV tables, and Excel workbooks.
  - Provides 1-click bundled scenario buttons (*Case A: Degraded Elbow Repair Alert*, *Case B: Compliant Circuit*) ensuring 100% demo reliability under presentation time constraints.
* **FR-H2 (Modality-Aware Ingestion Fabric & Multimodal Intermediate Representation)**:
  - Tier 1: Fast digital PDF table extraction (<50ms) using `pdfplumber`.
  - Tier 2: Local lightweight OCR fallback on image/scanned PDFs via `rapidocr`/`pytesseract`.
  - Tier 3: Interactive UI "Assisted Field Mapping" modal if table boundaries are ambiguous, preventing unhandled HTTP 500 exceptions.
  - Normalizes extracted data into a canonical `MIRDocument` Pydantic schema with bounding boxes, confidence, and cell coordinates.
* **FR-H3 (Dynamic Plan Engine, Work Unit DAG & User Intervention Gate)**:
  - Decomposes goals into an explicit, versioned Work Unit DAG ($G_{WU}$) with typed work units (`Ingestion_WU`, `Retrieval_WU`, `Verification_WU`, `Docx_WU`, `Xlsx_WU`, `Pptx_WU`).
  - Interactive UI User Intervention Gate allows the operator to toggle/prune intermediate steps, edit task parameters, or reorder steps before execution.
  - Dynamic Replanning Engine invalidates dependent child nodes while preserving verified sibling nodes on intermediate failure (**Sibling Protection Guarantee**).
* **FR-H4 (Declarative Model Gateway & In-Process Laya ONNX Routing)**:
  - Loads model definitions dynamically from `config/models.yaml` (specifying capabilities, context length, priority, and quantization).
  - Uses `onnxruntime` (`CPUExecutionProvider`, <800MB RAM) to run the Laya ONNX decision model in $<15\text{ms}$, emitting a typed `CanonicalDecision`.
  - Deterministic Policy Gate verifies confidence ($P \ge 0.75$) before granting execution leases; provides fallback escalation for complex reasoning tasks.
* **FR-H5 (Assurance Plane: AST Security Visitor & Neurosymbolic Z3 SMT Gate)**:
  - AST Security Visitor (`ast_visitor.py`) statically scans learner/generated code in $<5\text{ms}$, rejecting forbidden imports (`os`, `sys`, `subprocess`, `socket`) and dangerous functions (`eval`, `exec`).
  - Encodes ASME B31.3 (§304.1.2) coupled MAWP equation and API 510 cylindrical shell retirement thickness and remaining service life equations using exact rationals (`z3.Q()`).
  - Wraps Z3 solver execution in an `asyncio.wait_for(timeout=3.0)` watchdog to eliminate non-linear CAD hangs.
  - Implements defensive physical boundary validation ($c_r \le 0 \to 999.0\text{y}$, $P > 0, D > 0$).
  - Evaluates each CML independently; flags degraded elbow CML-03 ($t_{\text{act}} < t_m$) with exact rational deficiency values and SMT-LIB2 transcripts.
* **FR-H6 (Dual-Mode Execution Broker & Multi-Format Deliverables)**:
  - Dual-Mode Broker probes Docker/Podman with a 500ms timeout; executes inside `smitrace-worker` container (`--network none`, 512MB RAM, 5s timeout) if daemon is healthy; otherwise immediately falls back to an isolated virtualenv subprocess (`python -m compilers`).
  - Programmatic compilers generate ISO/IEC 29500 `.docx` Board Approval Memos with PSU styling, `.pptx` Executive Slide Decks, and multi-tab `.xlsx` Audit Workbooks preserving live recalculable formulas (`=C4-D4*E4`).
* **FR-H7 (Artifact Validator Gate)**:
  - Validates generated ZIP structure (`zipfile.is_zipfile()`), OOXML schemas, and Excel formula syntax (zero `#REF!` or `#VALUE!` anomalies) before committing deliverables to the vault.
* **FR-H8 (State-Isolated Anti-Collapse Loop & WAITING_HUMAN Gate)**:
  - Automatically isolates failed tool or verifier steps, allowing up to 3 diagnostic self-healing attempts before parking safely in `WAITING_HUMAN` for human engineer confirmation.
* **FR-H9 (Local Hybrid Retrieval Engine & Provenance Graph)**:
  - Pre-bundles in-tree local embedding model weights (`all-MiniLM-L6-v2` ONNX/Safetensors, <80MB) and pre-seeded SQLite vector database (`knowledge.db`).
  - Dual indexing: Lexical Search (BM25) + Dense Semantic Search (Local Embeddings) fused via Reciprocal Rank Fusion (RRF).
  - Binds chunk-level provenance on every chunk: `document_id`, `source_location`, `page_number`, `revision`, `chunk_hash`, and `timestamp`.
* **FR-H10 (Air-Gap Sovereignty & Cross-Platform Relative Vault)**:
  - Backend daemon binds strictly to `127.0.0.1:8000` (loopback). Rejects non-loopback proxy headers with HTTP 403 Forbidden.
  - Uses `pathlib.Path` for cross-platform relative case vault storage (`./cases/{case_id}/`) with SHA-256 Merkle leaf digests.
* **FR-H11 (Discreet Bottom Status Bar & Interactive Drawers)**:
  - Bottom status bar displaying live air-gap (`127.0.0.1:8000`, 0 outbound packets), active lease ID, 24GB MVP baseline compute state, and solver SAT/UNSAT telemetry.
  - Interactive slide-out drawers for exact mathematical proofs ($t_m = \frac{223}{1008}\text{ in}$) and Knowledge Provenance citations.
* **FR-H12 (Sandboxed Coding Competency & Evidence Sealing)**:
  - Curated industrial challenges: `API510-CALC-01` (Remaining Life & Retirement Thickness calculation) and `UT-PARSER-02` (Ultrasonic Thickness gauge string sanitizer & validator).
  - Two-step evaluation: "Run Tests" (public test cases with diffs) and "Submit Assessment" (public + hidden test suite).
  - Inline Agent Diagnostic Guidance: Explains failure causes referencing standard clauses without emitting solution code.
  - Cryptographically seals learner code SHA-256, test results, and telemetry into `./cases/{case_id}/competency_record.json`.
* **FR-H13 (Single-Click Zero-Dependency Launcher `start_demo.py`)**:
  - Python root script verifying local virtualenv, recycling port 8000 conflicts, and mounting pre-built static React UI directly from FastAPI (`backend/app/static/`).
  - Launches browser automatically with zero `npm` or Node.js commands on presentation day.

---

### 5. Hackathon Non-Functional Requirements

* **NFR-H1 (Latency & Interactivity)**: End-to-end DAG execution from file drop to deliverable download completes in $< 3.0\text{ seconds}$. Laya ONNX decision routing executes in $< 15\text{ms}$. AST security inspection completes in $< 5\text{ms}$. Sandbox test runs return in $< 1.0\text{ second}$.
* **NFR-H2 (Isolation & Continuity)**: Worker containers enforce CPU/RAM quotas and `--network none`; dual-mode broker fallback guarantees 100% demo continuity with zero unhandled crashes across all laptop environments.
* **NFR-H3 (Air-Gap Completeness)**: The entire stack runs 100% offline with zero internet connectivity and zero external cloud API calls.
* **NFR-H4 (Zero Node.js Runtime Requirement)**: Presentation execution requires solely Python 3.10+; the compiled React frontend is statically mounted to guarantee instant boot.
* **NFR-H5 (Defensive Boundary Invariants)**: Mathematical solver never hangs indefinitely; non-linear constraints terminate within 3.0s with deterministic mathematical error reporting. False Assurance Rate is an exact **0.0%**.
* **NFR-H6 (Sandbox Containment & Evidence Integrity)**: Sandboxed code cannot make network connections, escape the ephemeral working folder, or exceed 512MB RAM / 5s CPU time. Verification records are strictly derived from learner-submitted source code.
