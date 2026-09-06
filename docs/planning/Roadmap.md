# Roadmap: Sovereign AI Execution Plane Implementation (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)

## Phase 1: Core Air-Gap & Local Runtime Foundation (R1 - COMPLETED & VERIFIED)
- [x] Establish architecture blueprint & master documentation (`PRD.md`, `TRD.md`, `Architecture.md`, `context.md`, `State.md`, `PROJECT.md`).
- [x] Implement `scripts/airgap_audit.sh` (Kernel `nftables` DROP policy check + `tcpdump` zero-egress monitor).
- [x] Implement local sandbox launcher (`src/sovereign/sandbox/launcher.py`, `--network none`, 512MB RAM, 10s CPU limit, Windows Job Object & rlimit fallback).
- [x] Implement network auditor with zero-egress verification (`src/sovereign/sandbox/auditor.py`, `audit_network_egress()`, 34/34 tests passing).

## Phase 2: Ingestion & Topology Reconstruction Engine (R2 - COMPLETED & VERIFIED)
- [x] Develop two-tier spatial layout parser (pure NumPy vectorized Zhang-Suen `_zhang_suen_pure_numpy` & OpenCV line skeletonization, drawing tiling/slicing `patcher.py`).
- [x] Implement equipment tag (`10-P-101-CS`) bounding-box & centroid snapping extractor with spatial KD-Tree and orthogonal projection (`graph_builder.py`).
- [x] Implement `get_pipe_attributes(graph, line_tag)` in `graph_builder.py` and export in `__init__.py`.
- [x] Build NetworkX topological graph builder connecting equipment nodes and pipe junctions (`nx.Graph` & `nx.DiGraph`).
- [x] Implement procedural synthetic 4000x3000 P&ID benchmark generator (`synthetic_pid.py`) and comprehensive 39-test verification suite (`tests/test_vision.py`).

## Phase 3: Neurosymbolic AST & Z3 Verification Engine (R3 - COMPLETED & VERIFIED)
- [x] Implement process sandbox launcher (`run_sandboxed`, `--network none`, 512MB RAM, 10s CPU limit, Windows fallback).
- [x] Develop AST security parser & Z3 SMT constraint verification engine for ASME B31.3 / API 510 formulas (`tests/test_verifier.py`, 75/75 passing, 0.0% False Assurance Rate).
- [x] Enforce mathematical invariants: minimum pipe thickness, vessel retirement limits, inspection intervals.

## Phase 4: State-Isolated Anti-Collapse Self-Correction Engine (R4 - COMPLETED & VERIFIED)
- [x] Build State-Isolated Anti-Collapse Loop with clean-context re-prompting (`src/sovereign/agent/state_machine.py`, `run_react_loop`).
- [x] Decouple `ImmutableSpec`, mutable script state, and SHA-256 failure hashes (3-turn limit, failure hash deduplication).
- [x] Stress-tested with intentional script corruptions, syntax errors, and missing variables (100% convergence in <= 3 turns).

## Phase 5: Headless Deliverable Engine & Production Workbooks (R5 - COMPLETED & VERIFIED)
- [x] Build native `python-docx` compiler for official PSU memo formatting (`src/sovereign/reports/docx_compiler.py`).
- [x] Build native `openpyxl` engine for audited mechanical calculation workbooks with active dynamic formulas (`src/sovereign/reports/xlsx_compiler.py`).
- [x] Validate OOXML zip integrity, element hierarchy, and robust error handling for missing directories.

## Phase 6: Comprehensive 4-Tier E2E Testing Track (COMPLETED & VERIFIED)
- [x] Tier 1: Feature Coverage (R1-R5: 29/29 tests validating baseline functional contracts).
- [x] Tier 2: Boundary & Corner Cases (R1-R5: 25/25 tests stress-testing non-nominal, extreme, and malformed inputs).
- [x] Tier 3: Cross-Feature Combinations (12/12 tests pairing vision, verifier, sandbox, anti-collapse, reports).
- [x] Tier 4: Real-World PSU Application Scenarios (3/3 tests: Refined Products Pipeline, CDU Distillation Train, Corrupt Script Self-Healing).
- [x] Unified Test Runner CLI (`tests/e2e/runner.py`: 69/69 E2E tests passing; 217/217 total tests passing system-wide).

## Phase 7 (Milestone 7): Industrial Sovereign Workbench UI & API Execution Plane (R6 - COMPLETED & VERIFIED)
- [x] Implement FastAPI Core Server (`src/sovereign/api/server.py` & `schemas.py`) bound to `127.0.0.1:8000` with static SPA asset serving and SPA route fallback.
- [x] Implement Security Middlewares (`SecurityHeadersMiddleware` with zero-outbound CSP, `MTLSSecurityMiddleware` for client cert verification and proxy rejection).
- [x] Implement native Server-Sent Events (SSE) `/api/v1/events` streaming real-time heartbeats every 2s, agent turns, and Z3 proofs.
- [x] Implement 8 endpoint groups (airgap telemetry, events SSE, pid topology, pid calculate, sandbox execute, verifier evaluate, deliverables memo .docx, deliverables workbook .xlsx).
- [x] Implement `sovereign serve` CLI command in `src/sovereign/cli.py`.
- [x] Build React 18 + Vite Industrial Workbench SPA (`ui/`):
  - 4-viewport tabbed layout: `PIDViewerTab` (pure SVG canvas, 4000x3000 flowsheet, vector equipment symbols, color-coded lines, Quick Action Drawer), `CalculationSandboxTab` (3-turn ReAct console, code playground, AST policy inspector), `Z3AuditTab` (0.0% FAR KPI cards, constraint tree, proof log), `DeliverablesTab` (in-browser client-side `docx-preview` with native HTML twin fallback, multi-sheet `.xlsx` DataGrid table with formulas, binary downloads).
  - Dual Theme System: Industrial Dark (`#0B0F19`) / Modern Light (`#F8FAFC`).
  - Persistent Sovereignty Header Badge ("AIR-GAP ACTIVE: 0 BYTES WAN", 0.00 KB/s ticker, eBPF socket modal).
  - Persistent Zustand state store (`useWorkbenchStore.js`).
  - Offline relative bundling into `ui/dist/` with 0 external CDN calls.
- [x] Implement API Test Suite (`tests/test_api.py`, 26/26 tests passing, 100% pass rate).

## Phase 8: Adversarial Hardening & Robustness Remediation Track (COMPLETED & VERIFIED)
- [x] Fix unhandled HTTP 500 crashes on non-finite floats (`-inf`, `nan`) and `NoneType` parameters in `z3_asme.py` and `server.py`.
- [x] Clamp margin on physical boundary violations to safe finite float (`-999999.0`), maintaining JSON serialization compliance.
- [x] Protect against ZeroDivisionError on $c_r = 0.0$ in `/api/v1/pid/calculate` (returning `remaining_life_years = 999.0`).
- [x] Close proxy header bypasses in `MTLSSecurityMiddleware` (`X-Forwarded-For`, `X-Real-IP`, `Forwarded`, `X-Forwarded-Host`, etc.) returning HTTP 403 Forbidden.
- [x] Ensure 403 and 401 responses include all standard security headers (CSP, `X-AirGap-Status`, `X-WAN-Egress-Bytes`, `X-Frame-Options`, `X-Content-Type-Options`).
- [x] Harden AST guard against filesystem modifications on `pathlib.Path` (`write_text`, `open('w')`, `unlink`, `rmdir`, `rename`, `replace`) and add `sqlite3`, `tempfile` to `FORBIDDEN_MODULES`.
- [x] Connect `QuickActionDrawer.jsx` to live backend endpoints (`evaluateZ3Formal`, `calculatePipeASME`) and eliminate mock proof generation.
- [x] Remove self-certifying fake SAT fallback in `CodePlayground.jsx`.
- [x] Wire live topology fetching into Zustand store in `PIDViewerTab.jsx`.
- [x] Persist canvas zoom and pan offsets across tab navigation.
- [x] Synchronize initial `z3Result` rational representation to true ASME equation evaluation ($223/1008$).
- [x] Rebuild frontend bundle in `ui/dist/` with Zero-CDN verification.
- [x] Pass 100% of tests in adversarial stress suite (`tests/test_challenger_ui_1_stress.py`, 85/85 passed) and API suite (`tests/test_api.py`, 26/26 passed).
