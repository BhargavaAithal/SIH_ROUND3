# Context & Environment Metadata — SMITRACE

## 1. Operating Environment
* **Project Name**: SMITRACE (Sovereign AI Execution Plane & Industrial Workbench)
* **Backend Runtime**: Pure Rust 1.80+ (Axum + Tokio, static musl ELF target)
* **OS**: Windows 11 Home Single Language (Build 26100) & Linux Edge Target (Ubuntu 22.04 / RHEL 9)
* **Shell**: PowerShell (`powershell.exe`) & Windows Command Processor (`cmd.exe`)
* **Rust**: Rust 1.80+ (`cargo`, `rustc`, `clippy`, `rustfmt`)
* **Node.js**: Modern LTS runtime supporting ES modules and CommonJS
* **Python**: Python 3.11+ 64-bit (used for ML vision models in isolated sandbox and hackathon scope)
* **Version Control**: Git 2.47+ with GitHub CLI (`gh`)
* **Workspace Directory**: `c:\Users\Vinyas G M\OneDrive\Desktop\smitrace`
* **App Data Directory**: `C:\Users\Vinyas G M\.gemini\antigravity-ide`
* **Customization Roots**:
  - Global: `%USERPROFILE%\.gemini\config`
  - Workspace: `.agents` and canonical `.agent/`

---

## 2. Canonical Directory Structure Reference

```
smitrace/
├── PRD.md                      # Product Requirements Document (Pure Rust backend, 4 planes, 5 pillars)
├── TRD.md                      # Technical Requirements Document (Model Gateway, MIR, Tri-Index, Z3)
├── Architecture.md             # System Architecture Document (5 pillars, hardware-agnostic deployment)
├── ToDo.md                     # Phased development roadmap across 10 milestones
├── State.md                    # Real-time project status overview & active metrics
├── context.md                  # Runtime environment metadata & active domain standards
├── AGENTS.md                   # Three-Layer Master Directive (Directive, Orchestration, Execution)
├── MEMORY.md                   # State persistence substrate (survives 135k context compaction)
├── GEMINI.md                   # Knowledge substrate invariants & anti-hallucination policies
├── mcp_config.json             # Model Context Protocol configuration
├── eslint.config.mjs           # Flat ESLint configuration for CodeRabbit
├── .coderabbit.yaml            # CodeRabbit assertiveness profile and audit rules
├── .gitignore                  # Ignores node_modules, cache, and docs/architecture/
├── package.json                # Project scripts (graphify, test, eval)
│
├── config/
│   └── models.yaml             # Declarative Model Registry catalog (capabilities, endpoints, hardware)
│
├── hackathon-scope/            # Dedicated 3-Day Hackathon & Demo MVP Scope (Python FastAPI + React)
│   ├── README.md               # Hackathon vs. Target Enterprise scope comparison guide
│   ├── PRD.md                  # Hackathon Product Requirements Document
│   ├── TRD.md                  # Hackathon Technical Requirements Document
│   ├── Architecture.md         # Streamlined 4-Plane Hackathon Architecture
│   └── ToDo.md                 # 3-Day Hackathon Actionable Roadmap
│
├── demo/                       # Interactive Sovereign AI Workbench Frontend Demo (React 18 + Vite)
│   ├── index.html              # Outfit/Inter typography, sovereign metadata
│   ├── package.json            # Vite + React dependencies
│   └── src/
│       ├── index.css           # Complete beige glassmorphic design system
│       ├── App.jsx             # Main sovereign lifecycle coordinator
│       └── components/
│           ├── SplashScreen.jsx    # "Smitrace" bold header + "A sovereign AI work bench"
│           ├── CryptoLogin.jsx     # Ed25519 cryptographic challenge-response
│           ├── Header.jsx          # DCS/avionics instrument panel, semantic telemetry, operator identity drawer
│           ├── PermittedVault.jsx  # Role-scoped vault & SHA-256 ingestion
│           ├── PipelineScenario.jsx # Scenario 1: ASME B31.3 Z3 SMT proofs & reports
│           ├── CodebaseScenario.jsx # Scenario 2: Sandbox pytest & agentic coding help
│           └── AuditTerminalDock.jsx# Hierarchical session audit dock with zero-overflow flex scrolling
│
├── sample_inputs/              # Manual Ingestion Test Files & Datasets Suite
│   ├── README.md               # User guide for live manual ingestion flow
│   ├── piping/                 # Persona 1: Shiva (CML-03 Degraded Elbow, CML-01 Straight, Circuit 400 Line List)
│   └── codebase/               # Persona 2: Eshwari (API 510 evaluator patch & boundary test suite)
│
├── .github/workflows/
│   ├── coderabbit.yml          # Automated PR static & AI audit
│   └── coder-eval.yml          # Continuous evaluation CI/CD quality gate
│
├── evals/                      # Coder-Eval Continuous Evaluation Infrastructure
│   ├── coder-eval.config.yml   # Quality thresholds and evaluation configuration
│   ├── tasks/                  # Declarative YAML evaluation suites
│   │   ├── skill-routing.yml   # Semantic routing integrity (skill_triggered)
│   │   ├── code-generation.yml # Code correctness, AST syntax & guardrails
│   │   └── ab-experiments.yml  # A/B prompt & scoping benchmarks
│   └── results/                # Evaluation output reports (report.json, summary.md)
│
├── .agent/ & .agents/          # Antigravity customization roots (mirrored for total parity)
│   ├── hooks.json              # Authoritative lifecycle hook registration
│   ├── rules/                  # Contextual rules with frontmatter glob targeting
│   │   ├── frontend-react.md   # Scoped to frontend components and styles
│   │   ├── backend-database.md # Scoped to backend services, SQL, and migrations
│   │   ├── devops-ci.md        # Scoped to CI workflows, scripts, and Terraform
│   │   └── knowledge-substrate.md # Scoped globally to enforce AST topology navigation
│   ├── skills/                 # Semantic skills with progressive disclosure
│   └── workflows/              # Multi-step process automations & slash commands
│
├── .antigravity/
│   ├── graph.json              # Ground-truth AST dependency topology (120 nodes, 158 edges)
│   ├── .cache/                 # Local syntax cache for modified files
│   └── scripts/                # Hardened hook handlers
│       ├── branch-guard.js     # Fail-closed branch locking
│       ├── shell-sandbox.js    # Fail-closed PowerShell & shell sandbox
│       ├── lint-enforcer.js    # Multi-language syntax verification
│       ├── knowledge-injector.js # PreInvocation injection with mtime staleness check
│       ├── open-pr-on-goal.js  # Injection-immune, goal-driven PR dispatcher
│       └── parse-coderabbit-review.js # Injection-immune review comment parser
│
├── docs/
│   ├── adr/                    # Formal Obsidian ADR vault (ADR-0001 - ADR-0017)
│   │   ├── 0001-architecture-three-layer-directive-orchestration-execution.md
│   │   ├── 0002-state-management-sqlite-event-sourcing.md
│   │   ├── 0003-safety-guardrails-fail-closed-hooks.md
│   │   ├── 0004-knowledge-substrate-ast-graph.md
│   │   ├── 0005-behavioral-skills-suite.md
│   │   ├── 0006-coderabbit-review-gates-remediation.md
│   │   ├── 0007-continuous-evaluation-coder-eval.md
│   │   ├── 0008-language-low-latency-edge-daemon-zero-copy-ipc.md
│   │   ├── 0009-local-ai-inference-runtime-quantization-compound-routing.md
│   │   ├── 0010-kernel-air-gap-sovereignty-hardware-security-micro-sandboxing.md
│   │   ├── 0011-neurosymbolic-engine-smt-theorem-proving-anti-collapse.md
│   │   ├── 0012-raster-to-graph-topology-reconstruction-spatial-engine.md
│   │   ├── 0013-industrial-workbench-ui-ux-performance-mcp-integration.md
│   │   ├── 0014-control-plane-concurrency-resilient-leases-staged-quarantining.md
│   │   ├── 0015-dynamic-model-gateway-and-registry.md
│   │   ├── 0016-user-governed-agentic-dag-planning.md
│   │   ├── 0017-non-autoregressive-decision-model-laya.md
│   │   └── README.md           # Master index of all 17 Architecture Decision Records
│   └── architecture/           # Regenerable visual canvas & AST notes (gitignored)
│
└── tests/
    └── test-hooks.js           # Automated verification test suite (41 / 41 tests passing)
```

---

## 3. Active Domain Standards & Statutory Invariants

1. **ASME B31.3 (§304.1.2)**: Process piping design pressure and wall thickness formulas.
2. **API 510 (§7.1)**: Pressure vessel inspection code, retirement thickness ($t_{\text{min}}$), and remaining life calculations.
3. **API 650 / API 620**: Welded steel tanks for oil storage, One-Foot Method, Variable-Design-Point method, and hydrostatic test limits ($0.85 F_y$).
4. **API 520 / API 521**: Sizing, selection, and installation of pressure-relieving devices (PSV) in refineries.
5. **AWS D1.1 / ISO 13703**: Structural welding inspection and defect classification.
6. **OISD Standards (OISD-STD-105, OISD-RP-108, OISD-STD-129)**: Process safety, work permit, and piping/tank inspection standards for petroleum installations.
7. **PESO SMPV Rules 2016 & Factories Act 1948 §31**: Statutory deterministic verification mandate for pressure vessels and high-hazard piping Fitness-For-Service (FFS) and PTW authorizations.
8. **NCIIPC & IT Act 2000 §70**: Critical Information Infrastructure (CII) protection, zero cloud egress, and tamper-evident audit logging.
9. **IEC 62443 & SCOMET**: Industrial cybersecurity zones/conduits and strategic dual-use technology protection against unauthorized telemetry exfiltration.

---

## 4. Active Security & Operational Invariants
1. **Separation of Authority**: Probabilistic LLMs propose work units; users govern the execution DAG; sandboxes execute under leases; verifiers prove admissibility; the Control Plane commits state.
2. **Zero False Assurance Rate (FAR)**: SMT proofs reject invalid states with 0.0% tolerance. Solver timeouts emit `FAIL`.
3. **Hardware-Agnostic Profile Discovery**: Automatically detects CPU/GPU resources and activates Minimum (8-16GB VRAM), Standard (24-48GB VRAM), or High-End (80GB+ VRAM) configurations.
4. **Declarative Model Gateway**: Open-weight models (Qwen, Llama, Mistral, Gemma, OCR/VLM runtimes) configured via `config/models.yaml` with zero backend recompilation.
5. **Linear Event Ledger**: Serialized writer actor using `BEGIN IMMEDIATE` transactions preventing split-brain states or audit log forks.
6. **Timed Leases & Watchdog**: 60s lease TTL with 15s heartbeats preventing zombie processes from corrupting plant maintenance flows.
7. **Atomic Two-Phase Commit**: Unverified drafts quarantine in `staging/{lease_id}/`; promotion to `cases/{case_id}/` occurs strictly post-verification.
8. **Boundary Hardening**: Finite float clamping (`-999999.0`), defensive division guards, mTLS proxy filtering, and AST forbidden modules denylist.
9. **Air-Gap Tri-Index Grounding**: Local Tantivy lexical + HNSW vector + metadata search grounded in organization manuals, SOPs, and past correspondence with cryptographic chunk provenance.
10. **Interactive Code Authoring**: In-situ code buffer edits with live dirty tracking, instant syntax problem evaluation, and non-blocking AST checks.
11. **Strict Workspace Boundary Isolation**: All path resolutions and sandboxed operations are securely scoped within the user-specified workspace root, rejecting path traversals.
12. **Offline Extension & Skill Parity**: Skills and extensions adhere to the `.agents/skills/<name>/SKILL.md` declarative contract, discoverable offline with zero WAN dependencies.
13. **Asynchronous Multi-Agent Concurrency**: Background subagents execute non-blockingly with distinct task IDs, isolated memory/CPU quotas, live step telemetry, and non-destructive differential merge gates into the active buffer.
14. **Sovereign Glassmorphism Optical Invariant**: All workbench surfaces strictly adhere to a 5-layer optical composite model: multi-point ambient orbital mesh background, translucent frosted glass panes (`.glass-card`, `.glass-elevated`), specular perimeter reflections (`inset 0 1px 1px #ffffff`, `1px solid var(--glass-border)`), Smoked Obsidian Glass (`.glass-obsidian`) for dark developer interfaces (Code Editor, Audit Terminal Dock, SMT Constraint Box), and Frosted Alabaster Glass Paper sheets (`.glass-paper`) for executive deliverables (DOCX Memo, XLSX Audit Matrix). Flat, opaque solid fills (`#ffffff`, `#141210`, `#faf7f0`) are strictly banned.


