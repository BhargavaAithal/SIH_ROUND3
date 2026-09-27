# SMITRACE — Hackathon Scope & MVP Execution Guide

> **Sovereign AI Execution Plane & Industrial Engineering Workbench — Hackathon MVP**  
> *Mirrored from the Target Enterprise Architecture with Reduced Python/React Complexity for 100% Demo Reliability.*

---

## 1. Purpose & Scope Boundary

This directory contains the **Demo & Hackathon MVP Scope** for SMITRACE. 

To prevent teams from getting trapped in low-level kernel plumbing (such as writing custom eBPF Tetragon kernel modules, kernel packet classifiers, or low-level C/Rust IPC ring buffers) days before a live hackathon evaluation or jury presentation, the system is explicitly divided into two execution tiers:

1. **Hackathon MVP Scope (`hackathon-scope/`)**: A pragmatic, battle-tested, high-impact implementation using **Python 3.11+ (FastAPI)**, **React 18 + Vite**, **Python `z3-solver`**, **`onnxruntime`**, **`python-docx`**, and **`openpyxl`**. It faithfully mirrors the enterprise architecture across all four planes:
   - **Intelligence Plane**: Dynamic Plan Engine generating versioned Work Unit DAGs ($G_{WU}$) + Declarative Model Gateway (`config/models.yaml`) + In-Process Laya ONNX (<15ms) System 1 routing + Multimodal Intermediate Representation (MIR) parser.
   - **State Plane**: Interactive **User Intervention Gate** (allowing the operator to inspect, edit, or prune intermediate steps such as skipping OCR or suppressing PPTX) + Dual-Graph State Ledger ($G_{WU}$ and $G_{Art}$) in SQLite WAL.
   - **Execution Plane**: **Dual-Mode Execution Broker** (Docker/Podman container primary with 500ms fallback to virtualenv subprocess) + Programmatic Office Compilers + Ephemeral Coding Competency Sandbox.
   - **Assurance Plane**: **AST Security Visitor Gate** (<5ms rejection of dangerous calls) + Hardened Microsoft Z3 SMT solver proofs for ASME B31.3 (§304.1.2) and API 510 with exact rationals (`z3.Q()`) and 3.0s watchdog (guaranteed **0.0% False Assurance Rate**) + 3-turn Anti-Collapse Loop.
2. **Target Enterprise Vision (Root Repository)**: The industrial production sovereign plane built completely in **Rust (Axum + Tokio)** with native C++ Z3 bindings, POSIX shared memory ring buffers, `nsjail` micro-sandboxing, and hardware PKI authentication.

---

## 2. Hackathon vs. Target Enterprise Comparison

| Subsystem | Hackathon MVP Scope (`hackathon-scope/`) | Target Enterprise Vision (Root Repo) |
| :--- | :--- | :--- |
| **Backend Daemon** | **Python 3.11+ (FastAPI + Uvicorn)** bound to `127.0.0.1:8000` with Pydantic v2 schemas; serves both API and static React frontend. | **Rust 1.80+ (Axum + Tokio)** compiled as a static `musl` ELF binary. |
| **Model Gateway & Registry** | **Declarative Registry (`config/models.yaml`) + In-Process Laya ONNX**: Python `onnxruntime` executing non-autoregressive decision model (<15ms) $\to$ `CanonicalDecision` $\to$ Control Plane $\to$ Execution Broker. | Decoupled Rust Model Gateway with Hardware-Adaptive Profile Matrix, multi-model registry (`models.yaml`), and Two-Tier Hierarchical Routing. |
| **Planning & User Governance** | **Dynamic Plan Engine & User Intervention Gate**: Versioned Work Unit DAG ($G_{WU}$) rendered in UI; operator can prune/toggle intermediate steps (e.g. skip OCR or omit PPTX) or edit parameters before execution. | Dynamic Plan Engine in Rust with versioned Work Unit DAG, User Intervention Gate, and dual-graph scheduler ($G_{WU}$ and $G_{Art}$). |
| **Assurance & Theorem Prover** | **AST Security Visitor (<5ms) + Python `z3-solver`**: **Hardened 3.0s Watchdog** (`asyncio.wait_for`), physical guards ($c_r \le 0$, $P > 0$), exact rationals `z3.Q()`, and 3-turn Anti-Collapse Loop. | Native C++ Z3 solver pool bound via Rust `z3` crate across 5 statutory standards + AST visitor. |
| **Document Ingestion & MIR** | **Multi-Tier Parser to MIR Schema**: `pdfplumber` (<50ms digital) $\to$ local OCR $\to$ Assisted Field Mapping modal, normalized into canonical `MIRDocument` schema. | Modality-Aware Ingestion Fabric (MIR) with PaddleOCR/Surya + TrOCR + OpenCV spatial vectorizer. |
| **Tool & Code Sandbox** | **Dual-Mode Execution Broker**: Docker/Podman container (`--network none`, 512MB RAM, 5s timeout) with 500ms fallback to virtualenv subprocess + `ArtifactValidator`. | Headless Rust OOXML streaming compilers (`docx-rs`, `rust_xlsxwriter`) + OS-level `nsjail` micro-sandboxes. |
| **Knowledge Retrieval** | **Local Hybrid Retrieval**: In-process BM25 + pre-bundled local embedding weights (`all-MiniLM-L6-v2`) + pre-seeded SQLite vector cache (`knowledge.db`) + RRF + chunk provenance. | Tri-Index Retrieval (Tantivy lexical + Qdrant vector + SQLite metadata) + Cryptographic Provenance Graph. |
| **Air-Gap & Hardware Target** | Loopback binding (`127.0.0.1:8000`); **MVP Baseline Hardware**: Modern x86_64, 32-64GB RAM, 24GB VRAM GPU, Linux-first deployment. | Linux `nftables` default drop, eBPF Tetragon socket tracing, and Hardware-Adaptive Profile Matrix (24GB / 48GB / Multi-GPU). |
| **UI Workbench** | React 18 + Vite dashboard with **Work Unit DAG Viewer & User Intervention Gate**, 1-click demo scenarios, slide-out proof drawer, knowledge drawer, coding competency sandbox, and bottom status bar. | React 18 + Vite + WebGL/WebGPU Pixi.js viewport with 50k+ node schematics and in-process MCP. |

---

## 3. Operational Presentation Flows

### 3.1 The User-Governed 4-Beat Inspection Pipeline
1. **Beat 1 (Ingestion / Quick-Load)**: Operator drops a real PDF inspection sheet OR clicks a 1-click demo scenario (*Case A: CML-03 Degraded Elbow [Repair Alert]* or *Case B: Nominal Circuit [Compliant]*). Multi-tier parser converts the file into canonical `MIRDocument` schema.
2. **Beat 2 (DAG Proposal & User Intervention Gate)**: Dynamic Plan Engine generates a 6-node Work Unit DAG. Operator inspects the graph, toggles/prunes intermediate steps (e.g. skips PPTX generation to save time, or skips OCR if digital tables are verified), edits parameters, and commits execution.
3. **Beat 3 (Deterministic Analysis & Z3 SMT Proof)**: Control Plane grants execution leases. Microsoft Z3 evaluates ASME B31.3 and API 510 under a 3.0s watchdog. Compliant points show green SAT/PASS; degraded elbow CML-03 shows red UNSAT/REPAIR REQUIRED with exact rational deficiency formulas ($t_m = \frac{223}{1008}\text{ in}$) and cited SOP clauses.
4. **Beat 4 (Deliverable Payoff)**: Instant binary download for PSU `.docx` Approval Note, `.pptx` Presentation Deck, and multi-tab `.xlsx` Audit Workbook with active formulas (`=C4-D4*E4`), validated by the `ArtifactValidator`.

### 3.2 Sandboxed Coding Competency Lifecycle
```
CASE ➔ Knowledge/Evidence ➔ Coding Task ➔ AST Security Gate ➔ Sandbox Run ➔ Fail ➔ AI Hint ➔ Fix ➔ Sealed Record
```
1. **CASE & Evidence**: Active case vault grounds the task in cited plant standards (API 510 / ASME B31.3).
2. **Coding Task**: Learner undertakes a curated engineering calculation (`API510-CALC-01`) or UT parser challenge (`UT-PARSER-02`).
3. **AST Security Gate**: Statically scans submitted code in $<5\text{ms}$ to ensure zero forbidden system calls (`os`, `subprocess`, `eval`, `exec`).
4. **Run & Failure**: Executes in isolated micro-sandbox (`--network none`, 512MB RAM, 5s timeout); exposes granular test diffs.
5. **AI Diagnostic Hint**: Agent analyzes execution traces and standard clauses to guide the fix without leaking solution code.
6. **Fix & Verification**: Learner submits revised code; full test suite (public + hidden) evaluates and seals cryptographic record into `./cases/{case_id}/competency_record.json`.

---

## 4. Single-Click Zero-Dependency Quickstart (`start_demo.py`)

To ensure flawless evaluation on any laptop without Node.js or Docker setup hurdles:

```bash
cd hackathon-scope
python start_demo.py
```

### What `start_demo.py` Does Automatically:
1. **Environment Verification**: Verifies Python 3.10+ and active virtualenv packages.
2. **Port Conflict Recycling**: Detects if port 8000 is occupied; cleanly recycles the socket or stops stale test processes.
3. **Static UI Serving**: Serves the pre-compiled React bundle from `backend/app/static/` directly through FastAPI — **zero `npm` or Node.js commands required**.
4. **Air-Gap Boot**: Mounts pre-seeded SQLite vector embeddings (`knowledge.db`) and in-tree embedding weights with zero external network access.
5. **Browser Auto-Open**: Launches the browser directly to `http://127.0.0.1:8000/`.

---

## 5. Hackathon Deliverables & Documents

- [PRD.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/PRD.md): Hackathon Product Requirements Document.
- [TRD.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/TRD.md): Hackathon Technical Requirements Document.
- [Architecture.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/Architecture.md): Hackathon System Architecture.
- [ToDo.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/ToDo.md): 3-Day Hackathon Actionable Roadmap.
- [State.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/State.md): Real-time Hackathon Sprint State & Verification Metrics.
- [context.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/context.md): Runtime Environment & Engineering Standards Context.
