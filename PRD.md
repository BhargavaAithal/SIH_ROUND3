# Product Requirements Document (PRD) — SMITRACE

## Project: Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)

---

### 1. Executive Summary & Problem Statement

#### 1.1 Executive Summary
SMITRACE is an air-gapped, sovereign, neurosymbolic AI execution plane and industrial engineering workbench designed for high-consequence critical infrastructure, defense installations, and Public Sector Undertakings (PSUs) such as refineries, petrochemical complexes, and power generation facilities.

Departing from rigid, single-model linear pipelines and ungrounded conversational loops, SMITRACE establishes a **multi-model, user-governed, agentic execution architecture** across four decoupled planes:
1. **Intelligence Plane (Probabilistic)**: Employs a dynamic Model Gateway and declarative registry supporting multiple open-weight models (coding, reasoning, vision, summarization) without lock-in.
2. **Execution Plane (Deterministic)**: Executes tools and untrusted code via a policy-controlled Execution Broker, OS sandboxes, and typed deliverable compilers (Word, PowerPoint, Excel, runnable code).
3. **Assurance Plane (Deterministic)**: Enforces AST security visitors, statutory codes, and formal Z3 SMT theorem proofs to guarantee an exact **0.0% False Assurance Rate (FAR)**.
4. **State & Provenance Plane (Deterministic Control Plane)**: An append-only, event-sourced ledger managing atomic leases, DAG scheduling, and versioned document provenance with 100% air-gap compliance.

#### 1.2 Problem Statement
1. **Model Lock-in & Rapidly Evolving Open-Weight Ecosystem**: Hardcoding inference to a single model prevents adoption of specialized models (e.g. dedicated coding models vs reasoning models vs vision-language models) and blocks upgrading as open-weight state-of-the-art advances.
2. **Lack of True Agentic Flexibility**: Rigid pipelines (e.g. fixed ingestion-to-Word generation) fail when users require exploratory, multi-turn, or customized tasks where intermediate layers should be pruned, customized, or reordered.
3. **Catastrophic Hallucination & Arithmetic Drift**: In high-pressure piping, pressure vessels, and tanks, approximate LLM math can cause plant overpressurization, toxic release, or explosive rupture.
4. **Regulatory & Statutory Inadmissibility**: Under OISD standards (OISD-STD-105, OISD-RP-108), PESO SMPV Rules 2016, Factories Act 1948 §31, and NCIIPC guidelines under IT Act 2000 §70, ungrounded conversational outputs cannot legally justify PTW certifications, statutory FFS approvals, or capital maintenance authorizations.
5. **Complex Multi-Modal Real-World Artifacts**: Real industrial sites handle degraded scanned PDFs, handwritten maintenance logs, P&ID engineering drawings, and equipment field photos that defeat simple text LLMs.
6. **Air-Gapped Enterprise Knowledge Grounding**: Plant decisions must strictly align with internal manuals, SOPs, and past correspondence without a single byte exfiltrating over external networks.

---

### 2. Target Personas & Operational Context

| Persona | Role & Responsibilities | Core Pain Points Addressed |
| :--- | :--- | :--- |
| **Plant Integrity Engineer** | Evaluates piping circuits, calculates remaining lifespans, verifies ASME B31.3 / API 510 code compliance, signs off on inspection reports. | Replaces manual formula errors with formal SMT proofs; automates report and multi-tab spreadsheet generation; prunes unnecessary pipeline steps. |
| **Refinery Safety Inspector (NDT)** | Collects ultrasonic thickness data at Condition Monitoring Locations (CMLs), maps corrosion trends, monitors thinning rates. | Ingests multi-modal scanned logs, handwritten notes, and drawings into a structured representation; tracks multi-year surveys. |
| **PSU Executive / Plant General Manager** | Approves capital maintenance budgets, reviews executive board memos, certifies statutory compliance (OISD / PESO / Factories Act). | Receives 100% compliant ISO/IEC 29500 (.docx/.xlsx) memos, .pptx executive slide decks with digital sign-offs and zero corruption. |
| **Maintenance & Operations Planner** | Schedules plant turnarounds, cross-references internal SOPs and historical correspondence for equipment failure precedents. | Interactively searches air-gapped organizational knowledge base with exact chunk provenance and citations. |
| **Statutory / Forensic Auditor** | Investigates incident root causes, audits historical PTW authorizations, verifies cryptographic non-repudiation. | Audits an append-only SHA-256 Merkle event ledger proving byte-for-byte execution history from genesis to tip with zero WAN egress. |

---

### 3. Core Architectural Capabilities

#### 3.1 Pluggable Model Gateway & Declarative Registry
- The system must not be locked to any single model.
- Supports heterogeneous local open-weight models running concurrently across vLLM, llama.cpp, in-process ONNX, and local HTTP endpoints.
- **Contract-First Decision Pipeline (`Laya Decision -> Canonical Decision Schema -> Capability Registry -> Deterministic Policy`)**:
  - **Identical Decision Contract**: In-process ONNX (`laya-modernbert-onnx`, `laya-mmbert-onnx`) and Local HTTP (`laya-modernbert-http`) backends expose the identical decision contract, returning normalized `CanonicalDecision` objects with discrete primitives (choice distributions, ordinal scores, boolean probability) in <15ms.
  - **Deterministic Policy Enforcement**: Raw decision model outputs pass through the Capability Registry and a Deterministic Policy Gate (enforcing statutory safety, step pruning, and $P \ge 0.75$ confidence) before granting execution leases.
  - **System 2 Escalation**: If confidence falls below 0.75 or multi-step DAG planning is required, requests escalate to deep reasoning specialists (`llama-3.3-70b-instruct-q4` or `qwen-2.5-14b-instruct-awq`).
- New models can be added dynamically via a declarative configuration file (`config/models.yaml`) without modifying or recompiling backend code.

#### 3.2 Plan-First, User-Governed Agent Engine
- Decomposes user goals into an explicit, versioned Work Unit DAG complete with task dependencies, tool bindings, and expected deliverables.
- **User Intervention Gate**: Before or during execution, users can inspect the DAG, deselect/prune unnecessary intermediate layers, adjust parameters, or reorder steps.
- **Iterative Tool Execution**: Agents invoke local tools (`file_read`, `file_write`, `code_execution`, `spreadsheet_work`, `knowledge_search`, `math_solve`), evaluating intermediate outputs and iterating upon partial failures.
- **Dynamic Replanning**: When unexpected tool outputs or solver counterexamples occur, the agent invalidates dependent child nodes and proposes an updated sub-plan without full pipeline restarts.

#### 3.3 Modality-Aware Multimodal Ingestion Fabric
- Ingests scanned PDFs, handwritten inspection logs, engineering drawings (P&IDs, isometrics), and field photographs.
- **Manual Ingestion & Enclave Vault Sealing**: Supports direct user-driven manual ingestion via native OS file browsing and drag-and-drop from local filesystem folders (e.g. `sample_inputs/piping/` and `sample_inputs/codebase/`) alongside baseline pre-mounted statutory documents.
- Computes genuine client-side SHA-256 Merkle leaf digests for all uploaded artifacts with guaranteed 0 WAN network egress.
- Quality preprocessor handles DPI normalization, deskewing, and contrast adjustment.
- Policy-driven router dispatches regions to specialized local engines: PaddleOCR/Surya for dense tables, TrOCR for handwriting, OpenCV/spatial vectorizers for drawing lines and symbols, and local VLMs for photos.
- Normalizes extracted visual data into a standardized Multimodal Intermediate Representation (MIR) capturing geometry, confidence, and coordinate provenance.

#### 3.4 Real Multi-Format Deliverables
- Compiles production deliverables rather than conversational chat snippets:
  - **Approval Notes & Executive Memos**: Binary ISO/IEC 29500 `.docx` files with corporate PSU styling, tabular metadata, and digital sign-off blocks.
  - **Executive Slide Decks**: Native `.pptx` presentations summarizing engineering findings, risk matrices, and topology schematics.
  - **Audit Workbooks**: Multi-tab `.xlsx` spreadsheets preserving active, recalculable formulas and 16-decimal-place precision.
  - **Working Runnable Code**: Validated Python/Rust scripts with explicit execution traces.
  - **Mathematical Proofs**: Step-by-step arithmetic derivations alongside Z3 SMT-LIB2 verification transcripts.

#### 3.5 Versioned Provenance-Aware Local Knowledge Fabric
- Connects to internal enterprise manuals, SOPs, past correspondence, and engineering standards.
- Operates 100% offline with zero cloud telemetry or external API calls.
- Tri-Index Retrieval combines exact lexical keyword matching (Tantivy/FTS5), dense semantic search (local embeddings), and metadata taxonomies.
- Cryptographic Provenance Graph binds every fact and citation to source file path, revision, page number, section header, and SHA-256 chunk hash.

#### 3.6 Brokered Sandboxed Execution & Hardware Adaptability Principle
- **Hardware Adaptability Principle**: *SMITRACE adapts to hardware, rather than hardware becoming part of SMITRACE's identity.* Hardware resources are dynamic operational constraints detected by the `HardwareProfiler` and managed by the `ModelGateway`.
- All untrusted code execution and artifact generation is brokered through a strict policy gate enforcing CPU, RAM, disk, process, and network isolation.
- Dispatches jobs to specialized workers: Code Worker (ephemeral OS sandbox), Calculation Worker (deterministic math/SMT runtime), and Artifact Worker (typed OpenXML compilers).
- Hardware Profiler automatically senses available CPU, RAM, and GPU VRAM at boot, dynamically scaling across hardware profiles:
  - **24 GB Profile**: 7B/14B quantized models (AWQ/GGUF), local sequential or time-shared inference, baseline context window.
  - **48 GB Profile**: Larger reasoning & VLM models (32B/70B Q4), higher context window (32K–64K tokens), higher worker concurrency.
  - **Multi-GPU Profile**: Model parallelism, concurrent model fleet, dedicated parallel reasoning, vision, and embedding workers.


---

### 4. Functional Requirements

#### FR-1: Model Gateway & Dynamic Capability Routing
* **FR-1.1**: The system must provide a Model Gateway that dispatches prompts to local inference endpoints based on task intent (`coding`, `reasoning`, `vision`, `summarization`).
* **FR-1.2**: Adding, modifying, or disabling models must be supported via a declarative YAML registry (`models.yaml`) without requiring software recompilation.
* **FR-1.3**: The Model Gateway must track endpoint health, latency, context usage, and automatic failover across redundant local backends.

#### FR-2: Goal-Driven Agent Planning & User Intervention Gate
* **FR-2.1**: The Plan Engine must generate a versioned execution DAG of typed Work Units with explicit dependencies, tool bindings, and expected outputs.
* **FR-2.2**: The workbench UI must render the proposed DAG and permit users to toggle/prune intermediate steps (e.g. skip OCR, omit SMT verification, or suppress PPTX generation) prior to execution.
* **FR-2.3**: The agent execution loop must evaluate tool outputs iteratively and propose replanning when downstream assumptions are invalidated.
* **FR-2.4**: Sibling branches unaffected by replanning or user modifications must remain committed (Sibling Protection Guarantee).

#### FR-3: Multimodal Ingestion & MIR Standardization
* **FR-3.1**: Ingests raster drawings, scanned PDFs, handwritten logs, and equipment photos without sending data outside the local host.
* **FR-3.2**: Employs a modality classifier and policy router to dispatch inputs to specialized local engines (OCR, handwriting, CAD thinning, VLM).
* **FR-3.3**: Serializes visual extractions into a standardized Multimodal Intermediate Representation (MIR) schema tracking text, bounding boxes, spatial connectivity, and confidence scores.

#### FR-4: Air-Gapped Enterprise Knowledge Fabric
* **FR-4.1**: Provides local connectors for internal manuals, SOPs, past correspondence (PST/EML/Mbox), and P&ID archives.
* **FR-4.2**: Implements a Tri-Index combining in-process lexical search (Tantivy), dense vector embeddings, and hierarchical metadata filtering.
* **FR-4.3**: Enforces exact citation tracking where every generated statement is grounded by document name, revision, page number, and SHA-256 chunk hash.

#### FR-5: Brokered Sandbox Execution & Native Deliverable Compilers
* **FR-5.1**: All code execution requests must be brokered through an authorization gate enforcing CPU, RAM, and network boundaries (`--network none`).
* **FR-5.2**: Compiles native `.docx` memos, `.pptx` briefing decks, and `.xlsx` workbooks directly from typed schemas with live Excel formulas and step-by-step math traces.
* **FR-5.3**: Validates generated OOXML archives via internal ZIP traversal prior to vault commitment.

#### FR-6: Neurosymbolic Formal SMT Verification
* **FR-6.1**: Encodes statutory engineering codes (ASME B31.3 §304.1.2, API 510 §7.1, API 650, API 520) into Z3 SMT First-Order Non-Linear Real Arithmetic (`QF_NRA`).
* **FR-6.2**: Enforces an exact **0.0% False Assurance Rate (FAR)** where timeouts ($\ge 5.0\text{s}$) or arithmetic anomalies strictly resolve to `FAIL`.

#### FR-7: Hardware-Adaptive Profile Discovery & Scheduling
* **FR-7.1**: The system must enforce the Hardware Adaptability Principle: adapting model selection, concurrency, and context limits to detected hardware constraints, without hardware becoming part of SMITRACE's identity.
* **FR-7.2**: The Hardware Profiler must detect host CPU, RAM, and GPU VRAM at launch, activating the 24GB, 48GB, or Multi-GPU profile:
  - *24 GB*: 7B/14B quantized models, local inference, baseline context.
  - *48 GB*: 32B/70B models, higher context window (32K–64K tokens), higher worker concurrency.
  - *Multi-GPU*: Model parallelism, concurrent model fleet (dedicated reasoning + vision + embedding workers).
* **FR-7.3**: The Resource Scheduler must adjust batching, KV-cache allocations, and concurrent worker pools based on the detected hardware profile.


#### FR-8: Sovereign Air-Gap Security & Cryptographic Ledger
* **FR-8.1**: Enforces default drop firewall rules (`nftables`) with kernel-level eBPF Tetragon audits asserting 0 outbound WAN packets.
* **FR-8.2**: Records all events, tool calls, and user interventions in an encrypted SQLite WAL Merkle log with SHA-256 hash chaining.

#### FR-9: Engineering Code Lab Coordinated Workspace & State Machine
* **FR-9.1**: The engineering code lab must enforce the three coordinated workspaces layout primitive:
  - Top 3 Columns: `Repository` (~18% with Explorer, Changeset, History views and semantic markers `●` modified, `✓` verified, `⚠` attention) × `Code / Diff Editor` (~54% with 3 layers: Header, Monospace Code Body, Live Footer) × `AI Engineer Diagnostic Workspace` (~28% with fixed header, fixed tabs, scrollable active-mode pane, fixed action bar).
  - Middle: Full-width `Verification Pipeline` strip (`AST Security ✓ → Sandbox ✓ → Test Matrix (9/9) ✓ → Domain Contract ✓ → SMT Solver ✓`).
  - Bottom: Full-width `Execution Console` (default height 160-220px, collapsible with status summary, live stdout / test output).
* **FR-9.2**: The interface must follow a deterministic state machine journey rather than static buttons: `Initial/Ready` → `Run Sandbox` → `Failure Detected` → `Diagnose Failure` → `Patch Proposed` → `Review Diff` → `Apply Patch` → `Verify Patch` → `Verification Passed` → `Deploy Capability`.
* **FR-9.3**: Strict visual and epistemic separation must be maintained between probabilistic `Model Signal` (e.g. 98.4%) and deterministic `Assurance` (e.g. `PASS 9/9`). The editor must never stretch empty space to fill viewports; unused vertical space must resolve to system execution state.

#### FR-10: Interactive Sovereign Code Editor & Direct Authoring
* **FR-10.1**: Users must be able to actively author and edit source code directly within the workbench editor (supporting full interactive editing, line numbering, dirty state tracking, indentation, and hot-key save `Ctrl+S`).
* **FR-10.2**: The editor must provide immediate AST syntax verification, active problem/warning tallies, and direct reconciliation between user edits and AI agent proposals.
* **FR-10.3**: Supports dynamic file addition, buffer switching, and inline diff comparison without requiring full environment reloads.

#### FR-11: Configurable Workspace Specification & Multi-Project Isolation
* **FR-11.1**: The system must allow users to specify, configure, and switch active workspace roots (e.g. local directory paths, industrial project repositories, or custom isolated folders).
* **FR-11.2**: Workspace switching must dynamically remount the active file tree, isolated sandboxes, configuration manifests, and project-specific `.agents/skills` directories with strict path boundary enforcement (preventing traversal outside the designated root).

#### FR-12: Air-Gapped Offline Extensions & Skills Substrate
* **FR-12.1**: The workbench must include an offline extensions and skills manager allowing users to browse, inspect, install, enable, and disable skills without WAN connectivity.
* **FR-12.2**: Skills must follow declarative conventions (`SKILL.md` with YAML frontmatter, tool definitions, and statutory compliance tiers) compatible with Claude Code and Antigravity IDE paradigms.
* **FR-12.3**: Supports installing skills from local air-gap cache repositories and importing signed offline extension packages (`.agyskill` / `.tar.gz`) directly into `.agents/skills/`.

#### FR-13: Asynchronous Multi-Agent Background Task Orchestration
* **FR-13.1**: The workbench must be capable of dispatching ("throwing") multiple autonomous background agents simultaneously while the user continues to code interactively in the foreground.
* **FR-13.2**: Each background agent must execute within an isolated worker context, tracking its own task ID, execution phase, CPU/token consumption, and live thinking/action traces.
* **FR-13.3**: The workbench must provide a persistent, non-intrusive Background Agents Tray / Operations Deck displaying active worker concurrency, live progress bars, pause/cancel controls, and differential patch review for merging agent results directly into the active editor buffer.

#### FR-14: Sovereign Glassmorphism Aesthetic & Tactile Design System
* **FR-14.1**: Complete elimination of flat, solid opaque surfaces (`#ffffff`, `#141210`, `#faf7f0`). All cards, panels, inputs, and overlays must utilize optical translucency (alpha `0.65` to `0.88`), multi-tier box shadows, specular highlight borders (`inset 0 1px 1px #ffffff`, `1px solid var(--glass-border)`), and true hardware-accelerated `backdrop-filter: blur(...) saturate(...)`.
* **FR-14.2**: The workbench body must render an ambient multi-point warm champagne/platinum/gold orbital mesh gradient to provide authentic optical chromatic refraction through translucent glass panes.
* **FR-14.3**: Smoked Obsidian Glass (`rgba(26, 24, 21, 0.88)` with `backdrop-filter: blur(18px)`) must be strictly applied across all developer and terminal dark surfaces (Code Editor window, Audit Terminal dock, SMT constraint boxes, execution consoles).
* **FR-14.4**: Document Deliverables (statutory DOCX inspection memos, multi-tab XLSX audit matrices) must render as tactile Frosted Alabaster Glass Paper sheets (`rgba(255, 255, 255, 0.78)` with `blur(24px)` and specular perimeter highlights) rather than flat opaque white sheets.

---

### 5. Statutory & Regulatory Compliance Specifications

1. **Oil Industry Safety Directorate (OISD) & PESO Statutory Mandates**:
   - Adheres to OISD-STD-105 (Work Permit System), OISD-RP-108 (Inspection of Piping Systems), and OISD-STD-129 (Storage Tanks).
   - Complies with Petroleum Rules 2002, SMPV Rules 2016, and Factories Act 1948 §31 requiring deterministic calculation verification for high-pressure equipment.
2. **Critical Information Infrastructure (CII) & NCIIPC / IT Act 2000 §70**:
   - Strictly isolates plant engineering networks from public WANs and external cloud APIs.
   - Enforces cryptographic non-repudiation on human overrides with operator ID, statutory justification, and HMAC-SHA256 digital signatures.
3. **Industrial Cybersecurity & Air-Gap Standards (IEC 62443 SL-3 / SL-4)**:
   - Zero outbound network traffic verified at the kernel layer, protecting proprietary process flows and plant schematics.

---

### 6. Non-Functional Requirements (NFRs)

* **NFR-1 (Mathematical Rigor)**: Exact 0.0% False Assurance Rate on statutory safety verifications.
* **NFR-2 (Extensibility)**: Zero-recompilation model onboarding via declarative YAML registry.
* **NFR-3 (Adaptability)**: Seamless execution across Minimum (8-16GB VRAM), Standard (24-48GB VRAM), and High-End (80GB+ VRAM) hardware profiles.
* **NFR-4 (Isolation)**: Sandboxed code execution with zero network access, memory quotas (512MB default), and 10s CPU limits.
* **NFR-5 (Air-Gap Sovereignty)**: 0 outbound WAN packets guaranteed by `nftables` and verified by eBPF telemetry.
* **NFR-6 (Document Fidelity)**: Native ISO/IEC 29500 binary archives passing automated schema and formula integrity tests.
