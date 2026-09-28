# System Architecture Document: Sovereign AI Execution Plane & Industrial Engineering Workbench (SMITRACE)

---

## 1. System Master Architecture & Four-Plane Topology

### 1.1 Four-Plane Separation of Authority

SMITRACE departs from fragile, conversational single-model loops by enforcing strict architectural decoupling across four specialized planes, orchestrated through an open-weight model gateway, user-governed planning, and brokered sandboxed execution:

1. **Intelligence Plane (Probabilistic)**: Houses local, open-weight Small Language Models (SLMs), Large Language Models (LLMs), and Vision-Language Models (VLMs) accessed via a capability-based Model Gateway and declarative Model Registry. It parses multi-modal inputs, generates versioned Work Unit DAGs, proposes code/calculations, and performs semantic synthesis. It possesses **zero** direct operating system privileges, file system write permissions outside ephemeral staging, or network access.
2. **Execution Plane (Deterministic)**: Houses an authorized Execution Broker, physical ephemeral process sandboxes (`nsjail`, Windows Job Objects / AppContainer), and specialized worker fleets (Code Worker, Calculation Worker, Artifact Worker) that execute work units under explicit, time-bounded leases granted by the Control Plane.
3. **Assurance Plane (Deterministic)**: Enforces Abstract Syntax Tree (AST) security boundaries, statutory engineering codes (ASME B31.3, API 510, API 650, API 520/521), and Microsoft Z3 SMT formal theorem proofs to guarantee an exact **0.0% False Assurance Rate (FAR)** across all physical safety checks.
4. **State & Provenance Plane (Deterministic Control Plane)**: The authoritative, append-only event-sourced ledger that manages execution leases, coordinates the dual-graph scheduler ($G_{WU}$ and $G_{Art}$), seals Merkle audit chains, tracks versioned document provenance, and commits verified state transitions.

```
                 ┌──────────────────────────────────────────────────────────┐
                 │                     OPERATOR / MISSION                   │
                 └────────────────────────────┬─────────────────────────────┘
                                              │ Natural Language Goal & Prompts
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        1. INTELLIGENCE PLANE (Probabilistic)                           │
│                                                                                        │
│   ┌────────────────────────────────┐            ┌──────────────────────────────────┐   │
│   │ Dynamic Plan Engine            │            │ Model Gateway                    │   │
│   │ - Versioned Work Unit DAG      │            │ - Capability Router & Scheduler  │   │
│   │ - Replanning Engine            │            │ - Health / Failover & Context Mgr│   │
│   └───────────────┬────────────────┘            └─────────────────┬────────────────┘   │
│                   │                                               │                    │
│                   ▼                                               ▼                    │
│   ┌────────────────────────────────┐            ┌──────────────────────────────────┐   │
│   │ Modality-Aware Ingestion       │            │ Declarative Model Registry       │   │
│   │ - Preprocessing & Quality Gate │            │ (models.yaml: Laya, Qwen,        │   │
│   │ - Policy Router ➔ MIR Schema   │            │  Llama, Gemma, OCR/VLM Runtimes) │   │
│   └────────────────────────────────┘            └──────────────────────────────────┘   │
└─────────────────────────────────────────────┬──────────────────────────────────────────┘
                                              │ Proposes Intent & Versioned Work Units
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               4. STATE & PROVENANCE PLANE (Deterministic Control Plane)                │
│                                                                                        │
│   USER INTERVENTION GATE: [ Inspect | Edit | Prune Intermediate Steps | Reorder ]     │
│                                                                                        │
│   Capability Registry │ Dynamic Quota & Leases │ Merkle Event WAL │ State Graph Engine │
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
│  │ Execution Broker (Auth / Policy / Quotas / Capability Checks)    │  │              │
│  └──────────────────────────────────┬───────────────────────────────┘  │              │
│                                     ▼                                   │              │
│  ┌────────────────────────┐  ┌────────────────────────┐  ┌──────────────┴──────────┐   │
│  │ Code Worker            │  │ Calculation Worker     │  │ Artifact Worker         │   │
│  │ (Ephemeral OS Sandbox) │  │ (Deterministic Runtime)│  │ (DOCX / PPTX / XLSX)    │   │
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
│   │ (Unsafe Call Rejection)│  │ (Z3 Dual-Solver Proof) │  │ (ASME B31.3 / API 510) │   │
│   └────────────────────────┘  └───────────┬────────────┘  └────────────────────────┘   │
└───────────────────────────────────────────┼────────────────────────────────────────────┘
                                            │
                                  ┌─────────┴─────────┐
                                  ▼                   ▼
                           VERIFIED (PASS)      REJECTED (FAIL)
                                  │                   │
                                  │                   ▼
                                  │          State-Isolated Anti-Collapse Loop
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
                    SHA-256 MERKLE FORENSIC LOG
```

**Core Invariant**: *Models propose. Users govern. Sandboxes execute. Verifiers prove. The Control Plane commits.*

---

## 2. The Five Foundational Architectural Pillars

### Pillar 1: Model Gateway & Capability Registry Fabric

The backend is completely decoupled from any single LLM or provider. It supports multiple open-weight models running concurrently across local inference backends (vLLM, llama.cpp, ONNX Runtime, specialized OCR/VLM runtimes), dynamically routing requests based on task requirements:

```
                         ┌──────────────────────────┐
                         │       SMITRACE Core      │
                         │                          │
                         │  Agent Orchestrator      │
                         │  Cognitive Model         │
                         │  Assessment Engine       │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                    ┌────────────────────────────────┐
                    │       MODEL GATEWAY             │
                    │                                │
                    │ Capability Router               │
                    │ Request Scheduler              │
                    │ Health / Failover              │
                    │ Context Management              │
                    │ Policy Enforcement              │
                    └───────────────┬────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │    MODEL REGISTRY   │
                         │   (models.yaml)     │
                         │                     │
                         │ model_id            │
                         │ capabilities        │
                         │ context_length      │
                         │ quantization        │
                         │ hardware_vram_min   │
                         │ endpoint            │
                         │ priority            │
                         └──────────┬──────────┘
                                    │
        ┌─────────────┬─────────────────────┼─────────────────────┐
        │             │                     │                     │
        ▼             ▼                     ▼                     ▼
 ┌─────────────┐┌─────────────┐       ┌─────────────┐       ┌─────────────┐
 │ Laya (ONNX) ││ vLLM        │       │ llama.cpp   │       │ Vision/OCR  │
 │ In-Process  ││ Service     │       │ Service     │       │ Runtime     │
 │             ││             │       │             │       │             │
 │ Laya-Modern ││ Qwen2.5-Code│       │ Llama-3.3   │       │ PaddleOCR   │
 │ Laya-mmBERT ││ Qwen2.5-14B │       │ Gemma-2     │       │ Qwen2-VL    │
 └─────────────┘└─────────────┘       └─────────────┘       └─────────────┘
```

1. **Declarative Model Registry (`models.yaml`)**: Adding a new open-weight model requires zero code changes or recompilation. Models are registered with metadata specifying `model_id`, `capabilities` (`["decision", "routing", "classification", "coding", "reasoning", "vision", "summarization"]`), context length, quantization format (ONNX, GGUF, AWQ, FP8), and local endpoint URI.
2. **Two-Tier Dynamic Capability Routing & Decision Architecture (ADR-0017)**:
   - **Tier 1 (System 1 Decision Engine — Laya)**: Incoming requests and dynamic DAG work units are first evaluated in-process via non-autoregressive Laya ONNX models (`laya-modernbert-onnx` / `laya-mmbert-onnx`). Laya delivers typed choice/probability vectors in <15ms with zero token-by-token decoding latency and zero schema formatting hallucinations.
   - **Tier 2 (System 2 Reasoning Specialists)**: If Laya routing confidence is below 0.75 or if the task requires complex multi-step DAG planning and SMT formal theorem formulation, the Model Gateway escalates to deep reasoning models (`Llama-3.3-70B`, `Qwen-2.5-14B`).
3. **Hardware-Agnostic Profile Matrix**: Adapts model scheduling and batching dynamically to the host hardware profile:
   - **Minimum Profile** (1 GPU / CPU fallback, lower VRAM): Small quantized models (7B/8B GGUF Q4_K_M, Laya ONNX <800MB), sequential execution, reduced KV-cache allocation.
   - **Standard Profile** (1–2 GPUs, 24GB–48GB VRAM): Medium quantized models (14B–32B AWQ/GGUF, Laya ONNX), concurrent vision and reasoning execution.
   - **High-End Profile** (Multi-GPU, 80GB+ VRAM): Large models (70B+ FP8/AWQ), high-throughput parallel tool workers, dedicated Laya decision router, and deep reasoning branches.

4. **Dynamic Decision Pipeline & Transport-Agnostic Contract (ADR-0017)**:
   The decision engine decouples inference physical transport from state evaluation through an immutable canonical contract:

```
   In-process Laya (ONNX FFI) ──────┐
                                    ├──> [ Identical Decision Contract ]
   Remote/local Laya (HTTP REST) ───┘                 │
                                                      ▼
                                                Laya Decision
                                                      │
                                                      ▼
                                          Canonical Decision Schema
                                                      │
                                                      ▼
                                             Capability Registry
                                                      │
                                                      ▼
                                             Deterministic Policy
```

   - **Laya Decision**: System 1 non-autoregressive forward pass evaluating the input state in <15ms.
   - **Identical Decision Contract**: In-process ONNX (`endpoint: in_process_onnx`) and Local/Remote HTTP (`endpoint: http://127.0.0.1:8005/v1`) implementations share the identical FFI/JSON serialization contract, ensuring zero vendor or transport lock-in.
   - **Canonical Decision Schema**: Normalizes output primitives into typed, immutable Rust data structures (`Choice` distributions, ordinal `Score`, or `Boolean` probability).
   - **Capability Registry**: Matches the canonical intent to healthy models, OCR engines, or local sandboxed tools registered in `models.yaml`.
   - **Deterministic Policy**: Enforces non-negotiable enterprise constraints (confidence threshold $P \ge 0.75$, statutory role-based permissions, air-gap boundaries, and hardware quotas) prior to granting execution leases.

---

### Pillar 2: Plan-First, User-Governed Agent Engine

SMITRACE does not execute a monolithic, inflexible pipeline. Instead, it operates as a true goal-driven agent that plans out multi-step work, surfaces the execution DAG to the user for governance, and executes tools iteratively:

```
                            USER GOAL & INTENT
                                    │
                                    ▼
                             ┌─────────────┐
                             │ Plan Engine │
                             └──────┬──────┘
                                    │
                                    ▼
                          Versioned Execution DAG
                        ┌──────┬──────┬──────┐
                        │ W1   │ W2   │ W3   │
                        └──────┴──────┴──────┘
                                    │
                             USER INTERVENTION
                          ┌─────────┼─────────┐
                          ▼         ▼         ▼
                       Edit      Prune      Approve
                                    │
                                    ▼
                              EXECUTION LOOP
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
                   Tool / Model             Tool / Model
                        │                       │
                        └───────────┬───────────┘
                                    ▼
                              New Evidence
                                    │
                                    ▼
                             Replanning Engine
                                    │
                             ┌──────┴──────┐
                             ▼             ▼
                        Continue       Re-plan
```

1. **Versioned Execution DAG**: When a user submits an instruction, the Plan Engine decomposes the goal into a DAG of typed Work Units ($W_i$) complete with dependencies, candidate tools, expected output artifacts, confidence thresholds, and estimated compute cost.
2. **User Intervention Gate (Prune, Edit, Reorder)**: Before execution, the UI displays the proposed DAG. The user can:
   - **Prune**: Deselect intermediate layers they do not need (e.g., skip OCR if clean text is provided; skip SMT formal proofs for preliminary exploratory queries; omit PPT deck compilation).
   - **Edit**: Adjust parameters, constraints, or tool choices for individual work units.
   - **Reorder**: Change precedence or split/merge work units.
3. **Iterative Autonomous Execution**: Workers execute local tools (`file_read`, `file_write`, `code_execution`, `spreadsheet_work`, `internal_search`, `math_solve`), evaluating intermediate outputs against success criteria. If a tool fails or produces partial results, the agent iterates and refines rather than halting.
4. **Dynamic Replanning**: When unexpected tool evidence or solver counterexamples invalidate downstream assumptions, the Replanning Engine invalidates affected child nodes and proposes a targeted sub-plan update without restarting unaffected branches (Sibling Protection Guarantee).

---

### Pillar 3: Modality-Aware Multimodal Ingestion Fabric

Real industrial environments involve complex, degraded non-text inputs: scanned PDFs, handwritten inspection logbooks, isometric P&IDs, and field photos. The ingestion fabric processes these locally with high fidelity:

```
                                  INPUT ARTIFACT
                                        │
                            ┌───────────▼───────────┐
                            │ Preprocessing /       │
                            │ Quality Assessment    │
                            └───────────┬───────────┘
                                        │
                            ┌───────────▼───────────┐
                            │ Document / Modality   │
                            │ Classification        │
                            └───────────┬───────────┘
                                        │
                                  Policy Router
                                        │
        ┌───────────────┬───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼
     Text/OCR      Handwriting       Tables         Drawings         Photos
      engine         engine          engine          engine          VLM
        │               │               │               │               │
        └───────────────┴───────────────┼───────────────┴───────────────┘
                                        ▼
                          ┌────────────────────────────┐
                          │ Multimodal Intermediate    │
                          │ Representation (MIR)       │
                          │                            │
                          │ text + boxes + relations   │
                          │ confidence + provenance    │
                          │ page/region references     │
                          └──────────────┬─────────────┘
                                         ▼
                                Local VLM Reasoner
                                         │
                                         ▼
                                Semantic Knowledge
                                         │
                                         ▼
                                   SMITRACE Core
```

1. **Preprocessing & Quality Assessment**: Evaluates resolution, DPI, contrast, and skew, applying adaptive deskewing, noise reduction, and illumination normalization.
2. **Modality Classification**: Automatically classifies incoming pages/regions into Scanned Document, Tabular Grid, Handwritten Notes, Technical Drawing / P&ID, or Field Photograph.
3. **Specialized Regional Processors**:
   - **Text & Tabular OCR**: High-speed ONNX engines (PaddleOCR / Surya) for dense printed text and multi-column tables.
   - **Handwriting Engine**: Specialized handwriting models (TrOCR / fine-tuned ViT) for technician log entries and field remarks.
   - **Technical Drawing Engine**: OpenCV line tracing, morphological skeletonization (Guo-Hall), Hough line bridging, and ISA-5.1 symbol detection.
   - **Photo VLM**: Local Vision-Language Models (e.g., Qwen2-VL) for equipment corrosion assessment, nameplate reading, and defect classification.
4. **Multimodal Intermediate Representation (MIR)**: Standardized JSON schema capturing text content, bounding box geometries, spatial layout hierarchies, confidence scores, and raw coordinate provenance.
5. **Selective Local VLM Reasoner**: Invoked only for high-level cross-modal reasoning over ambiguous or conflicting MIR regions, preserving compute budgets.

---

### Pillar 4: Versioned Provenance-Aware Knowledge Fabric

The agent grounds its decisions in the organization's proprietary manuals, SOPs, past correspondence, and engineering standards with zero external network connectivity:

```
                           LOCAL KNOWLEDGE SOURCES
                  ┌───────────┬───────────┬───────────┐
                  │           │           │           │
                 PDFs       SOPs       Emails      Archives
                  └───────────┴───────────┴───────────┘
                                   │
                                   ▼
                           Ingestion Fabric
                                   │
                        Parse + Classify + OCR
                                   │
                                   ▼
                          Document Normalizer
                                   │
                        ┌──────────┼──────────┐
                        ▼          ▼          ▼
                     Chunks     Entities   Metadata
                        │          │          │
                        ▼          ▼          ▼
                  ┌──────────┐ ┌─────────┐ ┌──────────┐
                  │ Lexical  │ │ Vector  │ │ Metadata │
                  │  Index   │ │  Index  │ │  Index   │
                  └────┬─────┘ └────┬────┘ └────┬─────┘
                       └────────────┼────────────┘
                                    ▼
                           Query Planning Layer
                                    │
                        ┌───────────┼───────────┐
                        ▼           ▼           ▼
                    Exact      Semantic       Graph
                   Retrieval   Retrieval    Traversal
                        └───────────┼───────────┘
                                    ▼
                              Local Reranker
                                    │
                                    ▼
                           Evidence Assembly
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │ Provenance Graph    │
                        │ source + version    │
                        │ page + chunk hash   │
                        │ timestamp + ACL     │
                        └──────────┬──────────┘
                                   ▼
                            SMITRACE Agents
```

1. **Air-Gapped Local Connectors**: Ingests files directly from local enterprise sources: local folders, internal SMB/NFS file shares, document repositories, and email archives (`.pst`, `.eml`, `.mbox`).
2. **Tri-Index Architecture**:
   - **Lexical Index** (Tantivy / SQLite FTS5): Deterministic exact matching for engineering tag numbers (e.g., `10-P-101A`), ASME/API standard clauses, and procedural codes.
   - **Dense Vector Index** (Local Embeddings, e.g., `bge-large` / `nomic-embed`): Semantic conceptual similarity retrieval.
   - **Metadata Index**: Filterable taxonomy including document category, department, revision number, effective date, and security classifications.
3. **Query Planning & Hybrid Traversal**: Deconstructs user tasks into multi-path search queries combining exact keyword filters, semantic vector nearest neighbors, and entity graph relationships.
4. **Local Cross-Encoder Reranker**: Reranks assembled candidate evidence using a local cross-encoder model before presenting context to the agent.
5. **Immutable Provenance Graph**: Every retrieved fact retains cryptographic provenance: source file path, document revision, page number, section header, and SHA-256 chunk hash for verifiable auditability.

---

### Pillar 5: Brokered Sandboxed Execution Fabric with Typed Artifact Compilers

To produce real, verifiable enterprise deliverables (Word memos, PowerPoint presentations, Excel workbooks with live formulas, runnable scripts, step-by-step math derivations) without security vulnerabilities, SMITRACE strictly separates execution brokering, worker sandboxing, and artifact compilation:

```
                           SMITRACE AGENT
                                 │
                                 ▼
                      ┌────────────────────┐
                      │ Execution Broker   │
                      │                    │
                      │ Auth / Policy      │
                      │ Quotas             │
                      │ Capability checks  │
                      └─────────┬──────────┘
                                │
                      ┌─────────▼──────────┐
                      │ Job Scheduler      │
                      └─────────┬──────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        Code Worker       Calculation Worker   Artifact Worker
        ───────────       ──────────────────   ───────────────
        MicroVM /         Isolated runtime     Typed compiler
        Container/Sandbox deterministic        validation
              │                 │                 │
              │                 │          ┌──────┼──────┐
              │                 │          ▼      ▼      ▼
              │                 │        DOCX   PPTX   XLSX
              │                 │          │      │      │
              └─────────────────┴──────────┴──────┴──────┘
                                        │
                                        ▼
                                Artifact Validator
                                        │
                                        ▼
                                Provenance / Vault
```

1. **Execution Broker & Policy Gate**: Acts as the single authorization boundary between probabilistic agent proposals and host compute. Validates capability tokens, CPU/RAM quotas, execution timeouts, and filesystem permissions before dispatching jobs.
2. **Isolated Worker Fleet**:
   - **Code Worker**: Executes Python/Rust scripts in short-lived, ephemeral OS sandboxes (Linux `nsjail` with `--network none` and cgroups; Windows Job Objects / AppContainer) with read-only root filesystems and restricted scratch tmpfs.
   - **Calculation Worker**: Runs deterministic engineering math and formal SMT solvers (Z3) with step-by-step arithmetic traces and exact rational representation.
   - **Artifact Worker**: Dedicated compilation pipeline generating native OpenXML files from strongly-typed schemas:
     - `.docx`: Formal corporate memos, inspection certificates, and PSU board notes.
     - `.pptx`: Executive briefing decks, visual risk summaries, and plant topology slides.
     - `.xlsx`: Multi-tab engineering workbooks preserving 16-decimal-place precision and live, recalculable formulas.
3. **Post-Generation Artifact Validator**: Traverses compiled files via native archive extractors (`zip::ZipArchive`) to verify XML schema validity, formula correctness, and document integrity before committing to the immutable vault.

---

## 3. Operational Lifecycles & State Orchestration

### 3.1 Dual-Graph Execution Engine

The Control Plane maintains two decoupled mathematical graphs:
1. **Work Unit DAG ($G_{WU} = (V_{WU}, E_{WU})$)**: Defines task execution precedence and scheduling constraints.
2. **Artifact Lineage Graph ($G_{Art} = (V_{Art}, E_{Art})$)**: Defines data provenance, causality, and mathematical derivation.

### 3.2 Dynamic Cascade Invalidation with Sibling Protection Guarantee

When a parameter is updated, a tool fails, or the user edits an intermediate step:
1. Invalidation cascades strictly along the directed edges of $G_{Art}$ using breadth-first search:
   $$\text{Invalidate}(A) = \{A\} \cup \bigcup_{A' \in \text{Children}(A)} \text{Invalidate}(A')$$
2. All invalidated artifacts transition to `INVALIDATED`, and dependent Work Units return to `READY`.
3. **Sibling Protection Guarantee**: Unaffected sibling branches remain valid and committed, preventing expensive full-pipeline restarts.

### 3.3 Compare-and-Swap (CAS) Lease Protocol & Watchdog

To prevent race conditions, zombie processes, or concurrent writer corruption:
- Workers acquire execution leases via atomic CAS queries:
  ```sql
  UPDATE work_units 
  SET status = 'EXECUTING', 
      execution_lease_id = :lease_id, 
      lease_expires_at = datetime('now', '+60 seconds'),
      last_heartbeat = datetime('now')
  WHERE id = :wu_id AND status = 'READY';
  ```
- Workers renew leases every 15 seconds. An autonomous watchdog sweeps every 10 seconds, reclaiming expired leases back to `READY` and escalating to `WAITING_HUMAN` after 3 consecutive failures.

### 3.4 Orthogonal Trust Tensor

Model confidence and deterministic assurance are evaluated along two orthogonal axes:
$$\mathbf{T} = \langle \beta, \alpha \rangle$$
Where $\beta \in [0.0, 1.0]$ represents probabilistic belief, and $\alpha \in \{\text{PASS}, \text{FAIL}, \text{PENDING}\}$ represents deterministic mathematical proof. An artifact is automatically committed if and only if $\beta \ge 0.85$ and $\alpha = \text{PASS}$.

---

## 4. Hardware-Agnostic Deployment Profile Architecture

### 4.1 The Hardware Adaptability Principle
> **Architectural Invariant**: *SMITRACE adapts to hardware, rather than hardware becoming part of SMITRACE's identity.*

Hardware is an external execution constraint dynamically sensed and managed by the **Hardware Profiler** and **Model Gateway**, rather than a static identity bound to the software. SMITRACE scales fluidly across the hardware spectrum:

```
    24 GB VRAM                    48 GB VRAM                      Multi-GPU
        │                             │                               │
        ▼                             ▼                               ▼
  7B/14B quantized             Larger reasoning /             Model parallelism &
  models (AWQ/GGUF)            VLM models (32B/70B Q4)        concurrent model fleet
        │                             │                               │
        ▼                             ▼                               ▼
  Local sequential /            Higher context window         Specialized parallel reasoning,
  lightweight concurrent        & higher worker concurrency   vision & embedding workers
```

```
                           SMITRACE
                               │
                       Hardware Profiler
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
                 24 GB       48 GB     MULTI-GPU
                PROFILE     PROFILE     PROFILE
                    │          │            │
                1 GPU       1-2 GPU     Multi-GPU
               (24GB VRAM) (48GB VRAM) (80GB+ VRAM)
                    │          │            │
                    └──────────┼────────────┘
                               ▼
                       Resource Scheduler
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
                 7B / 14B     32B / 70B    Model Fleet /
                Quantized    Larger VLMs   Parallelism
                    │          │            │
                    └──────────┼────────────┘
                               ▼
                         Agent Runtime
```

| Profile Metric | 24 GB Profile (Baseline Workstation) | 48 GB Profile (Advanced Workstation) | Multi-GPU Profile (Enterprise Server Node) |
| :--- | :--- | :--- | :--- |
| **GPU Configuration** | 1 GPU (24GB VRAM, e.g. RTX 4090/A10G) | 1–2 GPUs (48GB VRAM, e.g. RTX 6000 Ada / A6000) | Multi-GPU Cluster (80GB–160GB+ VRAM, e.g. H100 / A100) |
| **System RAM** | 32 GB – 64 GB | 64 GB – 128 GB | 256 GB – 512 GB+ |
| **Reasoning Model** | 7B–14B (AWQ / GGUF Q4_K_M) | 14B–32B AWQ / 70B GGUF Q4 | 70B+ FP8 / AWQ with Tensor Parallelism |
| **Vision Model** | PaddleOCR + Qwen2-VL-7B | PaddleOCR + Qwen2-VL-7B/32B | PaddleOCR + Qwen2-VL-72B / InternVL |
| **Model Concurrency** | Local sequential / time-shared inference | Concurrent Reasoning + VLM workers | Dedicated concurrent fleet (Reasoning + Vision + Embedding) |
| **Tool Workers** | 2–4 concurrent sandboxes | 8 concurrent sandboxes | 16–32 concurrent sandboxes |
| **Context Window** | 16K – 32K tokens | 32K – 64K tokens | 64K – 128K tokens |


---

## 5. Subsystem Architecture & Engineering Solutions

### 5.1 Low-Latency Edge Daemon & Zero-Copy IPC (ADR-0008)
- **Rust Master Daemon (Axum + Tokio)**: Statically linked `musl` binary (<10ms boot, 8.4MB idle RSS, $p_{99.9} = 650\mu\text{s}$, zero GC pauses).
- **POSIX Shared Memory Ring Buffers**: `/dev/shm/smitrace_matrix_shm` with atomic sequence counters for sub-microsecond (<250ns) streaming of 48MB P&ID rasters.
- **Control Messaging**: Unix Domain Sockets with gRPC Protocol Buffers (`proto/smitrace.proto`).

### 5.2 Dynamic Model Gateway & Registry (ADR-0015)
- **Unified Local Inference Gateway**: Provides high-throughput streaming through local OpenAI-compatible REST endpoints.
- **Dynamic Model Catalog**: `config/models.yaml` defines model capabilities, hardware requirements, and endpoints without recompiling backend binaries.
- **Prefix Caching & State Affinity**: Leverages vLLM RadixAttention or llama.cpp slot caches to keep system prompts, statutory codes, and active case contexts warm.

### 5.3 User-Governed Agent Planning & Intervention (ADR-0016)
- **Interactive Execution Graph**: Graph-based task state machine rendering live nodes (`PENDING`, `READY`, `EXECUTING`, `COMPLETED`, `FAILED`, `PRUNED`).
- **User Intervention Protocol**: UI endpoints (`/api/v1/plan/prune`, `/api/v1/plan/reorder`, `/api/v1/plan/approve`) enable seamless human-in-the-loop governance.

### 5.4 Multimodal Intermediate Representation (MIR) Engine (ADR-0012)
- **Spatial Topology Graph**: Converts raster drawings to spatial KD-Tree graphs with Rutovitz Crossing Number ($CN$) junction invariants.
- **Unified MIR Serialization**: Normalizes OCR text, handwriting strokes, CAD geometry, and photo bounding boxes into a standardized JSON representation.

### 5.5 Versioned Knowledge Fabric & Air-Gapped Tri-Index
- **Tantivy Lexical Engine**: In-process Rust search engine indexing millions of technical standard clauses and equipment tag IDs with zero external JVM dependencies.
- **Cryptographic Chunk Tracking**: SHA-256 Merkle proofs anchoring every cited paragraph to source files and version timestamps.

### 5.6 Brokered Sandboxed Execution & Typed Compilers
- **Native OOXML Compilers**: Pure Rust compilers (`docx-rs`, `rust_xlsxwriter`) generating compliant Office files with live formulas and verified math traces.
- **PowerPoint Compiler**: Generates structured `.pptx` decks using native OpenXML presentation generation.
- **Execution Broker**: Dispatches untrusted execution to ephemeral sandboxes enforcing strict network, memory, and CPU limits.

### 5.7 Neurosymbolic Z3 SMT Theorem Proving (ADR-0011)
- **First-Order Non-Linear Real Arithmetic (`QF_NRA`)**: Solves physical safety envelopes (ASME B31.3, API 510, API 650, API 520) using exact rational representation.
- **0.0% False Assurance Rate (FAR)**: Two-phase verification ensuring zero false positives. Solver timeouts ($\ge 5.0\text{s}$) strictly emit `FAIL`.

### 5.8 Kernel Air-Gap Sovereignty & eBPF Tetragon Audit (ADR-0010)
- **Default Drop Firewall**: Linux `nftables` policy dropping all non-loopback packets.
- **eBPF Tetragon Audit**: Traces `sys_enter_connect` to guarantee zero WAN packets exfiltrate the plant boundary.

### 5.9 Enclave Vault & Sovereign Manual Ingestion Architecture (ADR-0013)
- **Local Input Suite Integration**: Direct operator file ingestion from designated local directories (`sample_inputs/piping/` and `sample_inputs/codebase/`) alongside baseline pre-mounted statutory documents.
- **In-Browser Web Crypto SHA-256 Merkle Sealing**: Client-side byte-level hashing (`crypto.subtle.digest`) eliminates simulated presentation mockups while maintaining 100% air-gap compliance with zero WAN egress.
- **Dual Ingestion Vector**: Provides native OS file browsing dialogs alongside desktop drag-and-drop with real-time audit ledger emission (`[USER] Manually ingested input file: <filename>`).

### 5.10 Engineering Code Lab Coordinated Workspaces & Control Room Architecture (ADR-0018)
- **Core Layout Primitive**: Coordinates three peer workspaces (`Repository` × `Code / Diff Editor` × `Engineering AI Workspace`) aligned with full-width verification and execution tiers:
  ```
  ┌─────────────────┬─────────────────────────────────┬────────────────────┐
  │ REPOSITORY      │ CODE / DIFF EDITOR              │ AI ENGINEER        │
  │ [Explorer/      │ 3 Layers: Lang/Version/Status   │ Diagnostic Space   │
  │  Changes/       │ Monospace Gutter Code Body      │ Fixed Header/Tabs  │
  │  History]       │ Live Footer (Problems/Actions)  │ Fixed Action Bar   │
  ├─────────────────┴─────────────────────────────────┴────────────────────┤
  │ VERIFICATION PIPELINE (AST ✓ → Sandbox ✓ → Tests ✓ → Domain ✓ → SMT ✓) │
  ├────────────────────────────────────────────────────────────────────────┤
  │ EXECUTION CONSOLE (Collapsible Full-Width Bottom Strip, Stdout/Matrix) │
  └────────────────────────────────────────────────────────────────────────┘
  ```
- **Density & Viewport Elasticity**: Editor vertical dimension conforms strictly to syntax lines without artificial blank dilation; unused space resolves to system verification state and live execution logs.
- **State Machine Engine**: Drives deterministic operator progression: `Initial` → `Run Sandbox` → `Failure Detected` → `Diagnose Failure` → `Review Diff` → `Apply Patch` → `Verify Patch` → `Deploy Capability`.
- **Probabilistic vs Deterministic Epistemic Segregation**: Model Signal ($\beta=98.4\%$) is segregated to evidence analytics; Deterministic Assurance ($\alpha=\text{PASS}$) visually dominates the verification pipeline and deployment authorization gates.

### 5.11 Sovereign Developer Substrate: Interactive Authoring, Workspace Scoping, Offline Extensions & Multi-Agent Fabric (ADR-0019)
- **Interactive Code Authoring Tier**:
  - Full interactive code editor with line gutter, dirty buffer tracking, syntax problem counters, Tab indentation, and hot-key save (`Ctrl+S`).
  - Supports live buffer switching, inline diff inspection, side-by-side comparison, and instantaneous AST security re-verification upon save.
- **Workspace Scoping & Path Resolution**:
  - Operators can select or configure active workspace roots (e.g. `smitrace`, `refinery-core-physics`, or arbitrary local directories).
  - Sandboxed path normalizer prevents path traversal outside the active root, dynamically binding the workspace's file tree, configuration, and project-local `.agents/skills/`.
- **Air-Gapped Offline Extensions & Skills Substrate**:
  - Implements a local skill registry adhering to the Claude Code / Antigravity IDE standard (`.agents/skills/<skill_name>/SKILL.md` with YAML frontmatter).
  - Enables offline browsing, installation, and inspection of cached skills (`ast-guard`, `z3-smt-verifier`, `code-review`, `statutory-linter`, `tdd`, `diagnosing-bugs`) with zero WAN exfiltration.
  - Supports offline package imports (`.agyskill` / `.tar.gz`) verified via SHA-256 integrity digests.
- **Asynchronous Multi-Agent Background Worker Fabric**:
  - Enables operators to dispatch ("throw") multiple concurrent autonomous background agents (e.g. `AST Security Auditor`, `PyTest Regression Runner`, `Z3 SMT Invariant Solver`, `Refactoring Specialist`) while actively coding in the foreground.
  - Workers run asynchronously in isolated threads/processes, updating live status cards, step logs, CPU time, and memory usage.
  - Generates unified patch diffs with a 1-click differential merge gate directly into the active editor buffer.

### 5.12 Sovereign Glassmorphic Presentation & Multi-Layer Optical Model (ADR-0020)
- **Optical Architecture**:
  - The UI layout abandons flat opaque color blocks in favor of a 5-layer optical composite model:
    1. **Ambient Lighting Substrate**: A 5-point warm champagne/platinum/gold radial gradient mesh on the root `body`, simulating natural environmental lighting and providing the chromatic variance necessary for backdrop refractions.
    2. **Tactile Translucent Panes (`.glass-card`, `.glass-elevated`)**: Alpha translucency (`0.65` to `0.85`) combined with `backdrop-filter: blur(18px) saturate(180%)` providing physical depth and separation from underlying canvases.
    3. **Specular Perimeter Framing**: Inset specular reflection highlights (`inset 0 1px 1px #ffffff`) and subtle boundary outlines (`1px solid var(--glass-border)`) defining clean, sharp visual edges.
    4. **Smoked Obsidian Developer Enclaves (`.glass-obsidian`)**: Deep charcoal translucent glass (`rgba(26, 24, 21, 0.88)` with `blur(18px)`) specifically reserved for terminal consoles, code buffers, and mathematical SMT proof viewers.
    5. **Frosted Alabaster Document Sheets (`.glass-paper`)**: Off-white translucent frosted sheets (`rgba(255, 255, 255, 0.78)` with `blur(24px)`) rendering executive deliverables (DOCX memos and XLSX matrices) with tactile materiality.
- **Hardware-Accelerated Compositing**:
  - Hardware GPU layers are isolated using `will-change` on dynamic transforms (Audit Terminal Dock slide-up) and discrete stacking contexts to prevent layout thrashing and maintain 60 FPS during background subagent log streaming.

