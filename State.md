# Project State — SMITRACE

## Current Phase: Phase 1 Completed & Governed (Architecture, Requirements, 5 Pillars & Invariants Synchronized)
**Last Updated**: 2026-09-24

---

### 1. Status Overview

* **Governance & Directives Substrate**:
  - [PRD.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/PRD.md): Formal Product Requirements Document defining 4-plane topology, 5 foundational pillars (Model Gateway with Two-Tier Laya Routing, User-Governed Planning, Multimodal Ingestion, Local Knowledge Fabric, Brokered Sandbox & Compilers), hardware-agnostic deployment tiers, and statutory mandates (OISD, PESO, Factories Act §31, NCIIPC / IT Act §70, IEC 62443).
  - [TRD.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/TRD.md): Technical Requirements Document specifying Model Gateway schemas (including Laya in-process ONNX decision engine), MIR schemas, Tri-Index contracts, Z3 QF_NRA formulations, SQLite WAL event schemas, CAS lease protocols, and AST security rules.
  - [Architecture.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/Architecture.md): System Architecture Document detailing the 4-plane enterprise topology, 5 pillars (with System 1 Laya Decision Model + System 2 Reasoning Specialists), dynamic Work Unit DAG with user intervention gate, brokered execution fabric, and hardware-agnostic deployment matrix.
  - [ToDo.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/ToDo.md): Phased development roadmap across 10 milestones.
  - [AGENTS.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/AGENTS.md): Three-Layer Directive (Directive, Orchestration, Execution) with subagent personas (`architect`, `dev`, `devops`, `data_engineer`).
  - [MEMORY.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/MEMORY.md): State persistence substrate engineered to survive 135,000-token context compaction.
  - [hackathon-scope/](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/hackathon-scope/): Dedicated Hackathon & Demo MVP directory mirroring the 4-plane enterprise architecture with reduced Python/React complexity (FastAPI, React 18, Declarative Model Gateway with models.yaml, Dynamic Plan Engine with Work Unit DAG & User Intervention Gate, MIR schema, AST Security Visitor, hardened Z3 SMT solver, and Dual-Mode Execution Broker).
  - [context.md](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/context.md): Runtime environment metadata, directory layout, and active domain definitions.
  - [docs/adr/](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/docs/adr/): Formal Obsidian ADR vault containing canonical setup records (ADR-0001 to ADR-0007), domain SMITRACE solutions (ADR-0008 to ADR-0014), architectural pillars (ADR-0015, ADR-0016), and the non-autoregressive decision model architecture (ADR-0017).
  - [config/models.yaml](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/config/models.yaml): Declarative Model Registry including in-process ONNX decision specialists (`laya-modernbert-onnx`, `laya-mmbert-onnx`), coding specialists (Qwen 2.5 Coder 32B/7B), reasoning specialists (Llama 3.3 70B, Qwen 2.5 14B, Gemma 2 9B), and vision/OCR specialists (Qwen2-VL, PaddleOCR).

* **Hardened Lifecycle Guardrails & Hooks**:
  - Authoritative registration: [.agents/hooks.json](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/.agents/hooks.json).
  - [.antigravity/scripts/branch-guard.js](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/.antigravity/scripts/branch-guard.js): Fail-closed branch protection (`main`, `master`, `release/*`, `production*`).
  - [.antigravity/scripts/shell-sandbox.js](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/.antigravity/scripts/shell-sandbox.js): Fail-closed shell sandbox intercepting destructive PowerShell cmdlets, unrecoverable Git data loss, and broad staging gating.
  - [.antigravity/scripts/lint-enforcer.js](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/.antigravity/scripts/lint-enforcer.js): Multi-language syntax verification (`.json`, `.js`, `.py`, `.ts`).
  - [.antigravity/scripts/knowledge-injector.js](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/.antigravity/scripts/knowledge-injector.js): PreInvocation knowledge reminder with mechanical mtime staleness alerts.
  - [.antigravity/scripts/open-pr-on-goal.js](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/.antigravity/scripts/open-pr-on-goal.js): Injection-safe (`spawnSync`), goal-driven PR dispatcher.

* **Continuous Evaluation & Quality Gates (`coder-eval`)**:
  - Configuration: [`evals/coder-eval.config.yml`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/evals/coder-eval.config.yml) enforcing `min_weighted_score: 0.85` and `require_skill_triggered: true`.
  - Task Suites: [`evals/tasks/skill-routing.yml`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/evals/tasks/skill-routing.yml), [`evals/tasks/code-generation.yml`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/evals/tasks/code-generation.yml), [`evals/tasks/ab-experiments.yml`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/evals/tasks/ab-experiments.yml).
  - Benchmark Runner: [`scripts/coder-eval-runner.js`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/scripts/coder-eval-runner.js) passed with 100.0% score across all gates.
  - CI/CD Quality Gate: [`.github/workflows/coder-eval.yml`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/.github/workflows/coder-eval.yml).

* **Sovereign AI Workbench Demo MVP (`demo/`)**:
  - Implementation: React 18 + Vite with custom Vanilla CSS beige glassmorphic design system (`demo/src/index.css`).
  - Landing & Splash: Subtle typography animations with bold "Smitrace" and small "A sovereign AI work bench".
  - Instrument Panel Header: Two-tier DCS/avionics glassmorphic console replacing generic pill UI:
    - Engineering Brand: `SMITRACE / STATION // 01 / SOVEREIGN ENGINEERING` with authoritative typography hierarchy and no shield icon.
    - Glassmorphic Aesthetic: Sleek micro-proportional profile (~58px) with high optical transparency (`rgba(255, 252, 245, 0.48)` to `rgba(245, 238, 225, 0.32)`), `backdrop-filter: blur(20px) saturate(180%)`, specular hairline borders (`rgba(255, 255, 255, 0.75)`), and delicate ambient drop-shadow.
    - System Telemetry Bay: 3-state semantic status hierarchy (Normal: `● ACTIVE`, Attention: `▲ DEGRADED`, Blocking: `■ BLOCKED`) combining geometric shape markers, distinct borders, and explicit text without relying on color alone (`AIR-GAP ACTIVE 127.0.0.1`, `ASSURANCE BLOCKED: UNSAT • HUMAN REVIEW`).
    - Compact Operator Identity: Refined `S Shiva / PIPING ENGINEER ⌄` profile with cryptographic dropdown drawer revealing TPM 2.0 / Enclave status, full Ed25519 root-of-trust fingerprint, 1-click copy, and dedicated in-drawer `🔒 Terminate Session (Logout)` control (with extraneous persona switch removed).
    - Lower Instrument Deck: Status strip featuring `CASE-2026-0091 • EXECUTION HALTED` coupled with real-time `AUDIT` toggle (standalone, clean control surface).
  - Cryptographic Identity Gateway: Ed25519 challenge-response handshake with role-bound sovereign personas (`Shiva` and `Eshwari`).
  - Permitted Documents Vault: Professional engineering document management with dense list/table layout, compact upload toolbar, Left Rail collections/filters (Collections, Security levels, Status counts), rich document rows with why-mounted popovers, and slide-over Document Inspector drawer (Integrity, Provenance, Version, Access, Used By Work Unit DAG, Why Mounted, SHA-256 copy, Open preview, and Lineage tracing). Baseline standards + authentic manual ingestion (via native file browser picker and OS drag-and-drop) with client-side Web Crypto SHA-256 Merkle leaf sealing and 0 WAN egress.
  - Manual Input Suite (`sample_inputs/`): Authentic engineering datasets for Shiva (`sample_inputs/piping/` containing CML-03 ultrasonic degraded scan, CML-01 compliant run, and Circuit 400 line list) and Eshwari (`sample_inputs/codebase/` containing API 510 evaluator patch & boundary pytest suite) for realistic live manual ingestion demonstrations.
  - Scenario 1 (Piping Integrity Engineer): 4-Beat inspection pipeline, ASME B31.3 deterministic calculation, Z3 formal SMT theorem prover (0.0% FAR, UNSAT alert), and official PSU deliverable compilation (`.docx` Approval Note & `.xlsx` live formula audit sheet).
  - Scenario 2 (Core Infrastructure Developer): Dense 3-column engineering IDE cockpit with compressed 95px header banner, hierarchical repository file explorer (`● Modified`, `✓ Verified`, `! Failed`), code editor visual anchor with line-number gutter and surgical line highlighting, 4-tab evidence-driven Diagnostic Assistant (`Diagnosis`, `Evidence` table with physical delta values & CML-03 provenance, `Patch` surgical diff, `Verification` proofs) enforcing explicit epistemic separation between probabilistic Model Belief (β) and deterministic Assurance (α), horizontal Verification Pipeline strip (`PATCH → AST → EXECUTION → TESTS → SMT`), and collapsible bottom Execution Console drawer with live pytest traces and POSIX sandbox telemetry.
  - Sovereign Audit & Telemetry Dock: On-demand slide-up console tray completely hidden off-screen when closed; triggers on click from the top header `AUDIT` button, sliding smoothly up from the bottom with real-time `[USER]`, `[PLATFORM]`, `[AGENT]`, `[SOLVER]`, `[SANDBOX]` tags, actor filters, search query, auto-scroll, and JSON export. Features chronological hierarchical session clustering (grouping events by login/boot milestone and execution phases), high-contrast custom scrollbars, robust non-overflowing flex scroll geometry (`minHeight: 0`), and strict scroll isolation (dedicated non-passive wheel interceptor and CSS `overscroll-behavior: contain` ensuring mouse-wheel scrolling inside the audit dock strictly scrolls the dock without leaking to or moving the background dashboard, while mouse scrolling outside continues normal dashboard scroll).
  - Browser Verification: Successfully validated and recorded via browser subagent (`verify_header_panel_1790347429265.webp`).

* **Verification Metrics**:
  - Live Demo Server: **ACTIVE & RUNNING** at [`http://localhost:5173/`](http://localhost:5173/) (verified HTTP 200 OK).
  - Automated Test Suite: **41 / 41 passing** (100% pass rate in [`tests/test-hooks.js`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/tests/test-hooks.js)).
  - Coder-Eval Score: **100.0%** (6/6 skills triggered, 0 regressions).
  - Vite Demo Build: Production bundle built cleanly with 0 errors in 312ms.
  - Codebase Topology: **202 AST nodes, 255 edges, 19 communities** in [`.antigravity/graph.json`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/smitrace/.antigravity/graph.json).

---

### 2. Next Immediate Milestones
1. Refine offline backend IPC bridges between Vite frontend (`demo/`) and local Python/Rust daemon.
2. Extend Model Gateway profile activator for multi-model open-weight inference.
3. Add further statutory rulebases (API 653 tank inspection, ASME Sec VIII vessels).

3. Author declarative model registry configuration (`config/models.yaml`).
4. Implement `ModelGateway` trait and capability-based router in Rust supporting local vLLM, llama.cpp, and ONNX endpoints.
5. Author unit tests for dynamic model registration, routing, and failover.
