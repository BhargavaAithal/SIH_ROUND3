# ToDo / Roadmap: Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)

## Phase 1: Planning, Governance & 5-Pillar Architecture Alignment [COMPLETED]
- [x] Author Product Requirements Document (`PRD.md`) with 5 pillars, multi-model gateway, user-governed planning, and statutory mandates
- [x] Author Technical Requirements Document (`TRD.md`) with Model Gateway schemas, MIR schemas, Tri-Index specs, Z3 QF_NRA formulations, and SQLite schemas
- [x] Author System Architecture Document (`Architecture.md`) with 5 pillars, 4-plane separation, and hardware-agnostic deployment tiers
- [x] Synchronize Project State (`State.md`) and Environment Context (`context.md`)
- [x] Formalize Three-Layer Directive (`AGENTS.md`) and Persistent Memory Substrate (`MEMORY.md`)
- [x] Maintain Obsidian ADR vault with canonical setups (ADR-0001 to ADR-0007), domain solutions (ADR-0008 to ADR-0014), and architectural pillars (ADR-0015, ADR-0016, ADR-0017: Laya Decision Model)
- [x] **Sovereign AI Workbench Demo MVP (`demo/`)**:
  - [x] Implement complete beige glassmorphism UI design system with bold high-contrast typography (`demo/src/index.css`)
  - [x] Implement animated loading splash screen with bold "Smitrace" and subtle "A sovereign AI work bench"
  - [x] Refactor Header from pill UI to two-tier DCS/avionics Instrument Panel with semantic status hierarchy (Active, Degraded, Blocked), zero-shield brand hierarchy, compact operator identity with popover drawer (housing cryptographic fingerprint and in-drawer session termination logout, with switch button removed), and lower case ticker deck
  - [x] Implement Cryptographic Identity Access with Ed25519 personas (`Shiva` & `Eshwari`)
  - [x] Build Permitted Documents Vault with dense list/table layout, compact upload toolbar, Left Rail collections/filters (Collections, Security, Status), rich document rows with why-mounted popovers, and slide-over Document Inspector drawer (Integrity, Provenance, Version, Access, Used By Work Unit DAG, Why Mounted, SHA-256 copy, Open preview, and Lineage tracing) with genuine client-side Web Crypto SHA-256 Merkle leaf sealing
  - [x] Author Authentic Manual Input Files Suite (`sample_inputs/piping/` and `sample_inputs/codebase/`) for live hands-on manual ingestion demonstrations
  - [x] Implement Scenario 1: Pipeline CML thickness ingestion, ASME B31.3 Z3 SMT formal proof, and PSU deliverable package (`.docx` & `.xlsx`)
  - [x] Implement Scenario 2 Layout Hierarchy, Density & State Machine Overhaul:
    - [x] Core layout primitive: 3 coordinated workspaces (`Repository` ~18% × `Code / Diff Editor` ~54% × `AI Engineer` ~28%) + full-width `Verification Pipeline` strip + full-width collapsible `Execution Console` (160-220px)
    - [x] Eliminate unnatural editor viewport stretching; preserve code-proportional height with live footer (`Problems 0 | Warnings 0 [Format] [Compare]`)
    - [x] Semantic repository state markers (`●` modified, `✓` verified, `⚠` attention) with Explorer / Changeset CS-00918 / Commit History views and operational Git badge (`⎇ main • 1 change` / `clean`)
    - [x] Operational top bar with muted breadcrumb (`CASE / PSU-2026-0017 / src / physics / corrosion_evaluator.py`), air-gap badges, and state-machine-driven action buttons
    - [x] AI Engineer diagnostic workspace overhaul: fixed header, fixed mode tabs, single active mode pane (no nested scrollbars/cards), fixed bottom action bar
    - [x] Epistemic rigor: Probabilistic Model Signal (98.4%) cleanly separated to evidence diagnostics; Deterministic Assurance (`PASS 9/9`) dominating verification gates
    - [x] Deterministic state machine: `Initial/Ready` → `Run Sandbox` → `Failure Detected` → `Diagnose Failure` → `Review Diff` → `Apply Patch` → `Verify Patch` → `Deploy Capability`
    - [x] Zero-Scroll Single-Frame Cockpit: All 3 panels (Repository Explorer with docked sandbox spec card, Code Editor with diagnostics & line numbers, and AI Engineer Diagnostic Workspace with Ask AI prompt form) fit entirely inside a single 100vh viewport frame with 0 vertical page scrollbars. File tree, code buffer, and chat messages scroll strictly internally via bounded flex containers.
    - [x] VS Code IDE File & Folder Explorer Interface: Hierarchical interactive collapsible carets (`▶` / `▼`), indent guide lines (`tree-indent-guide`), official file type icons (vector Python SVG, PyTest beaker, JSON braces, Markdown), full-row hover/active selection, amber `M` Git-modified badge, green `✓` verified badge, red `⚠` test-failure badge, and workspace action toolbar (`+` New File, `⤹⤸` Toggle All, `📁` Switch Workspace).
    - [x] Elevated & Enlarged Execution Console & Background Fleet Drawers: Increased standard height to 285px (expandable to 380px via `⤢`/`⊡` maximize toggle), increased background fleet deck height to 240px, elevated top border/shadows with zero clipping on 9 test matrix items and summary footer, and widened Left Explorer panel to 22% (minWidth: 220px) for optimal readability.
  - [x] Implement Sovereign Audit & Telemetry Dock as expandable bottom console tray with hierarchical session milestone grouping, vertical timeline trees, zero-overflow flex scrolling (`minHeight: 0`), strict scroll isolation (wheel event capture & `overscroll-behavior: contain`), real-time timestamps, and JSON export (with clear button removed)
  - [x] Validate build with Vite (0 errors, 457ms) and perform full end-to-end verification


---

## Phase 2: Hardware Profiler & Model Gateway Fabric (Pillar 1) [IN PROGRESS]
- [x] Create declarative model registry configuration (`config/models.yaml`) including Laya in-process ONNX and HTTP models (`laya-modernbert-onnx`, `laya-mmbert-onnx`, `laya-modernbert-http`)
- [ ] Implement `HardwareProfiler` probe in Rust discovering CPU cores, RAM, NVIDIA GPU count, and free VRAM
- [ ] Implement deployment tier activator (Minimum, Standard, High-End) dynamically setting model parameters
- [ ] Implement `CanonicalDecision` schema and `DecisionPrimitive` in Rust (`contracts::decision`)
- [ ] Implement `DecisionBackend` trait with in-process ONNX (`InProcessOnnxBackend`) and HTTP REST (`HttpEndpointBackend`) adapters
- [ ] Implement `DeterministicPolicyGate` (confidence thresholds, tool permissions, and step pruning validation)
- [ ] Implement Two-Tier hierarchical routing in `ModelGateway` (Laya fast path >= 0.75 confidence; System 2 escalation to Llama 3.3 / Qwen 2.5)
- [ ] Implement `ModelGateway` trait and capability-based router in Rust supporting local vLLM, llama.cpp, and ONNX endpoints
- [ ] Implement health check, latency tracking, and automatic failover across local inference backends
- [ ] Test dynamic addition and hot-reloading of open-weight models via YAML with zero code recompilation

---

## Phase 3: Dynamic Plan Engine & User Intervention Protocol (Pillar 2) [PENDING]
- [ ] Implement `PlanEngine` decomposing user goals into a versioned execution DAG of typed Work Units
- [ ] Implement User Intervention Gate endpoints (`/api/v1/plan/prune`, `/api/v1/plan/reorder`, `/api/v1/plan/approve`)
- [ ] Build interactive DAG visualization and step toggle/pruning controls in the workbench UI
- [ ] Implement autonomous iterative tool execution loop with intermediate result evaluation
- [ ] Implement `ReplanningEngine` with DAG diff calculation and Sibling Protection Guarantee

---

## Phase 4: Modality-Aware Multimodal Ingestion & MIR (Pillar 3) [PENDING]
- [ ] Implement input preprocessor for DPI normalization, deskewing, and contrast adjustment
- [ ] Implement modality classifier (Scanned PDF, Handwritten Log, P&ID Drawing, Field Photo)
- [ ] Integrate local specialized regional engines (PaddleOCR/Surya for tables, TrOCR for handwriting, OpenCV for CAD lines/symbols)
- [ ] Implement Multimodal Intermediate Representation (MIR) serializer and validator
- [ ] Integrate selective local VLM reasoner (e.g. Qwen2-VL) for complex visual and spatial synthesis

---

## Phase 5: Versioned Provenance Knowledge Fabric & Tri-Index (Pillar 4) [PENDING]
- [ ] Implement air-gapped enterprise connectors for local files, SMB/NFS shares, and email archives (PST/EML/Mbox)
- [ ] Build in-process Lexical Index using Rust `tantivy` for exact technical tags and standard clauses
- [ ] Build embedded Dense Vector Index using local embeddings for semantic retrieval
- [ ] Build Metadata Index in SQLite tracking source, department, revision, and effective date
- [ ] Implement Query Planning Layer (Exact + Semantic + Graph Traversal) and local cross-encoder reranker
- [ ] Build Cryptographic Provenance Graph embedding document name, revision, page, and chunk SHA-256 into all responses

---

## Phase 6: Brokered Sandbox Execution & Typed Deliverable Compilers (Pillar 5) [PENDING]
- [ ] Implement policy-controlled `ExecutionBroker` enforcing CPU, RAM, and network boundaries (`--network none`)
- [ ] Implement Code Worker sandbox (Linux `nsjail` with cgroups; Windows Job Objects / AppContainer)
- [ ] Implement Calculation Worker with deterministic math solver and step-by-step arithmetic traces
- [ ] Implement native ISO/IEC 29500 `.docx` compiler in Rust (`docx-rs`) for formal PSU Approval Notes
- [ ] Implement native `.pptx` presentation compiler in Rust for executive briefing decks
- [ ] Implement native `.xlsx` compiler in Rust (`rust_xlsxwriter`) preserving active formulas and 16-decimal precision
- [ ] Implement post-generation `zip::ZipArchive` validation gate and immutable vault commit

---

## Phase 7: State & Control Plane Infrastructure (Rust) [PENDING]
- [ ] Implement authoritative SQLite WAL `event_log` schema with SHA-256 hash chaining using Rust `rusqlite`
- [ ] Implement Serialized Rust Writer Actor using `BEGIN IMMEDIATE` transactions in Tokio
- [ ] Implement Compare-and-Swap (CAS) lease protocol (`execution_lease_id`, 60s TTL, 15s heartbeats) in Rust
- [ ] Build Dual-Graph Engine in Rust: Work Unit DAG ($G_{WU}$) and Artifact Lineage Graph ($G_{Art}$)
- [ ] Implement Breadth-First Cascade Invalidation algorithm with Sibling Protection Guarantee in Rust
- [ ] Implement boot-time genesis-to-tip cryptographic replay and projection table repair in Rust

---

## Phase 8: Assurance Plane & Neurosymbolic Z3 SMT Solvers (Rust Crate) [PENDING]
- [ ] Implement Z3 QF_NRA solver for ASME B31.3 (§304.1.2) coupled MAWP constraint envelope via Rust `z3` crate
- [ ] Implement API 510 pressure vessel retirement thickness ($t_{\text{min}}$) and remaining life solver in Rust
- [ ] Implement API 650 / API 620 storage tank solvers (One-Foot and Variable Design Point methods) in Rust
- [ ] Implement API 520 / API 521 safety relief valve (PSV) orifice sizing solver in Rust
- [ ] Build process-isolated Assurance Pool in Rust with 5.0s hard wall-clock kill switch (0.0% False Assurance Rate)
- [ ] Author property-based adversarial testing suite for SMT constraint envelopes (2,200 trials)

---

## Phase 9: Headless Rust Daemon, mTLS & Physical Security Hardening [PENDING]
- [ ] Configure headless Rust Axum daemon listening strictly on `127.0.0.1`
- [ ] Implement Tower `MTLSSecurityMiddleware` in Rust rejecting non-loopback proxy headers with HTTP 403
- [ ] Integrate x509 client certificate authentication with offline OpenSSL root CA via `rustls`
- [ ] Implement AST security visitor rejecting forbidden modules and destructive methods
- [ ] Implement boundary serialization safety clamping non-finite floats (`-inf`, `nan` -> `-999999.0`) in `serde_json`
- [ ] Implement defensive division guards in remaining life calculations ($c_r = 0.0 \to 999.0\text{ yrs}$)
- [ ] Configure Linux `nftables` kernel firewall policy with default `policy drop` on outbound traffic
- [ ] Attach eBPF Tetragon probes to `sys_enter_connect` to stream live kernel egress telemetry to the Rust daemon

---

## Phase 10: Interactive Workbench UI & Verification [PENDING]
- [ ] Build dynamic Plan & DAG Workbench UI (`PlanGraphView.jsx`) with interactive step pruning and reordering
- [ ] Build Multimodal Ingestion Stepper (`MultimodalIngestion.jsx`) with MIR visualization
- [ ] Build Enterprise Knowledge Base Explorer (`KnowledgeExplorer.jsx`) with source provenance highlights
- [ ] Build Deliverables Drawer (`DeliverablesViewer.jsx`) with instant DOCX, PPTX, XLSX downloads and math proof viewers
- [ ] Build discreet bottom status bar (`StatusBar.jsx`) rendering live air-gap, active lease, hardware profile, and SMT telemetry
- [ ] Maintain 41 / 41 passing automated tests in `tests/test-hooks.js` and 100.0% weighted score on `coder-eval`

---

## Phase 11: Sovereign Developer Substrate & Multi-Agent Background Fabric [COMPLETED]
- [x] Specify interactive code authoring architecture with dirty-state tracking, live problems count, and hotkey save (`Ctrl+S`)
- [x] Specify workspace configuration schema with sandboxed root resolution and path traversal enforcement
- [x] Design offline extensions and skills manager (`.agents/skills/`) compatible with Claude Code / Antigravity IDE
- [x] Design asynchronous multi-agent background worker substrate with task queuing, step telemetry, and differential merge gate
- [x] Implement interactive in-browser code editor with live syntax editing, line numbers, and file switching in `demo/`
- [x] Implement workspace selector modal & path switcher with preset industrial repositories (`smitrace`, `refinery-core`, `api510-engine`)
- [x] Implement offline extensions & skills drawer with 1-click install/toggle and offline package importer (`.agyskill`)
- [x] Implement background subagents operations tray with concurrent agent dispatch, live progress, thinking logs, and patch merge gate

---

## Phase 12: Sovereign Glassmorphism Aesthetic & Tactile Design System [COMPLETED]
- [x] Unify global design tokens (`--glass-bg`, `--glass-bg-elevated`, `--glass-bg-inset`, `--glass-border`, `--glass-blur`, `--glass-shadow-sm`)
- [x] Replace flat opaque body background with 5-point warm champagne/platinum/gold orbital mesh for authentic backdrop refraction
- [x] Upgrade all cards and layout columns (`leftCol`, `centerCol`, `rightCol`) to translucent frosted glass with specular highlight edges
- [x] Implement Smoked Obsidian Glass (`.glass-obsidian`) for dark developer interfaces (Code Editor, Audit Terminal Dock, SMT Constraint Box)
- [x] Implement Frosted Alabaster Glass Paper sheets (`.glass-paper`) for executive deliverables (DOCX Memo, XLSX Audit Matrix)
- [x] Upgrade all interactive buttons, inputs, tabs, and modals to frosted glass controls (`.btn-glass`, `.modal-card`)
- [x] Verify zero compilation errors with `npm run build` in `demo/`


