# ToDo.md / Roadmap — Sovereign AI Execution Plane Implementation (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)  
> **Status**: All 5 Core Requirements (R1 through R5) and Milestones M1 through M5 are 100% IMPLEMENTED and VERIFIED.

## Phase 0: Repository & Documentation Initialization
- [x] Link repository origin `https://github.com/VINYASGM/smitrace.git` on `main`.
- [x] Configure standard production `.gitignore`.
- [x] Synchronize PRD, TRD, Architecture, Roadmap/ToDo, State, context, README, and PROJECT specifications.

## Phase 1 (Milestone 1): Core Air-Gap & Process Sandboxing (R1)
- [x] Establish architecture blueprint & master documentation (`PRD.md`, `TRD.md`, `Architecture.md`, `context.md`, `State.md`, `PROJECT.md`).
- [x] Implement `scripts/airgap_audit.sh` (Kernel `nftables` DROP policy check + `tcpdump` zero-egress monitor).
- [x] Implement process sandbox launcher (`src/sovereign/sandbox/launcher.py`, `--network none`, 512MB RAM, 10s CPU limit, Windows Job Objects & Linux fallback).
- [x] Implement network auditor module (`src/sovereign/sandbox/auditor.py`, `AirGapVerdict`, `AirGapMonitor`, log parsers).
- [x] Implement Milestone 1 test suite (`tests/test_sandbox.py`, 34/34 tests passing across all 6 scenarios, 0 egress bytes).

## Phase 2 (Milestone 2): Multimodal Raster-to-Graph Engine (R2)
- [x] Develop spatial layout skeletonizer (`src/sovereign/vision/skeletonizer.py`, pure NumPy vectorized Zhang-Suen & OpenCV morphological thinning).
- [x] Implement image patcher for 4000x3000 P&ID drawings (`src/sovereign/vision/patcher.py`).
- [x] Build NetworkX topological graph builder (`src/sovereign/vision/graph_builder.py`, equipment nodes, pipe junctions, KD-Tree endpoint snapping, line tag and pipe attribute extraction).
- [x] Implement `get_pipe_attributes(graph, line_tag)` in `src/sovereign/vision/graph_builder.py` and export in `src/sovereign/vision/__init__.py`.
- [x] Create synthetic P&ID generator (`src/sovereign/vision/synthetic_pid.py`) and test suite (`tests/test_vision.py`, 39/39 tests passing).

## Phase 3 (Milestone 3): Neurosymbolic AST & Z3 Verification Engine (R3)
- [x] Develop AST security visitor (`src/sovereign/verifier/ast_guard.py`, blocking prohibited network/subprocess imports).
- [x] Implement ASME B31.3 pipe wall thickness equation Z3 verifier (`src/sovereign/verifier/z3_asme.py`).
- [x] Implement API 510 pressure vessel retirement Z3 verifier (`src/sovereign/verifier/z3_api510.py`).
- [x] Unit test suite (`tests/test_verifier.py`, 75/75 tests passing, 0.0% False Assurance Rate verified across 2,200 adversarial trials).

## Phase 4 (Milestone 4): State-Isolated Anti-Collapse Self-Correction Loop (R4)
- [x] Implement 3-turn ReAct self-correction engine (`src/sovereign/agent/state_machine.py`, `run_react_loop`).
- [x] Decouple `ImmutableSpec`, mutable script state, and SHA-256 rejected failure hashes.
- [x] Clean-context re-prompting eliminating cognitive collapse across multi-turn debugging with <= 3 turns convergence.

## Phase 5 (Milestone 5): Headless Enterprise Deliverable Compiler (R5)
- [x] Build native `python-docx` compiler (`src/sovereign/reports/docx_compiler.py`) for PSU Approval Memos with asset tables, formulas, citations, and sign-offs.
- [x] Build native `openpyxl` compiler (`src/sovereign/reports/xlsx_compiler.py`) for multi-tab audit workbooks with dynamic calculation formulas.
- [x] Validate OOXML compliance (`zipfile.testzip()`, valid XML, non-empty package parts, robust handling of non-existent parent paths).

## Phase 6: Full 4-Tier End-to-End Verification Track
- [x] Tier 1: Feature Coverage (R1-R5: 29/29 tests passing).
- [x] Tier 2: Boundary & Invariants (25/25 tests passing).
- [x] Tier 3: Cross-Feature Combinations (12/12 tests passing).
- [x] Tier 4: Real-World PSU Application Scenarios (3/3 tests passing: Refined Products, CDU Distillation, Corrupt Script Self-Healing).

## Phase 7: Robustness Hardening & Remediation (Challenger 2 & Forensic Audit)
- [x] Protect against ZeroDivisionError when parsing fractional pipe tags in `src/sovereign/vision/graph_builder.py` (`get_pipe_attributes`).
- [x] Excel forbidden character sanitization (`[\\/*?:\[\]]`) in `src/sovereign/reports/xlsx_compiler.py` (`generate_audit_workbook`).
- [x] Dynamic formula generation per data row for calculation sheets in `src/sovereign/reports/xlsx_compiler.py`.
- [x] Remove test fixture loading from production code in `src/sovereign/vision/graph_builder.py` (`extract_topology`).
- [x] Unified identifier resolution and alias node registration in `src/sovereign/vision/graph_builder.py`.
- [x] Strict boundary enforcement (Zero False Assurance Rate) in `src/sovereign/verifier/z3_asme.py` eliminating boundary slack.
## Phase 8 (Milestone 7): Industrial Sovereign Workbench UI & API Execution Plane (R6) (COMPLETED & VERIFIED)
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

## Phase 9: Adversarial Hardening & Remediation Track (COMPLETED & VERIFIED)
- [x] Eliminate unhandled HTTP 500 crashes on non-finite floats (`-inf`, `nan`) and `NoneType` parameters in `src/sovereign/verifier/z3_asme.py` and `src/sovereign/api/server.py`.
- [x] Clamp margin on physical boundary violations ($P \le 0, D \le 0, t \le 0$) to safe finite float (`-999999.0`) to maintain Starlette/FastAPI `json.dumps` compliance.
- [x] Protect against ZeroDivisionError on $c_r = 0.0$ in `/api/v1/pid/calculate` (returning `remaining_life_years = 999.0`).
- [x] Close proxy header bypasses in `MTLSSecurityMiddleware` by inspecting `X-Forwarded-For`, `X-Real-IP`, `Forwarded`, `X-Forwarded-Host`, `X-Client-IP`, `CF-Connecting-IP`, `True-Client-IP` and rejecting non-loopback with HTTP 403 Forbidden.
- [x] Inject complete `STANDARD_SECURITY_HEADERS` (CSP, `X-AirGap-Status: ACTIVE`, `X-WAN-Egress-Bytes: 0`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`) on all responses, including early 403 Forbidden and 401 Unauthorized.
- [x] Harden AST guard in `src/sovereign/verifier/ast_guard.py` against filesystem modifications (`pathlib.Path.write_text`, `open('w')`, `unlink`, `rmdir`, `rename`, `replace`) and add `sqlite3`, `tempfile` to `FORBIDDEN_MODULES`.
- [x] Eliminate frontend mock facades in `ui/src/components/pid/QuickActionDrawer.jsx`: wire "Verify in Z3 Formal Verifier" and "Recalculate Formula" to live backend API endpoints (`evaluateZ3Formal`, `calculatePipeASME`).
- [x] Eliminate self-certifying fake SAT/success fallback in `ui/src/components/sandbox/CodePlayground.jsx`: display genuine failure with `is_safe: false`.
- [x] Wire live topology fetching into Zustand store via `setTopology(data)` in `PIDViewerTab.jsx`.
- [x] Persist canvas zoom and pan offsets in `useWorkbenchStore.js` (`zoomLevel: 0.38`, `panOffset: { x: 60, y: 30 }`), eliminating reset regression across tab switching.
- [x] Correct initial `z3Result` rational representation to match true ASME B31.3 formula evaluation in `z3_asme.py` ($223/1008$).
- [x] Rebuild frontend bundle in `ui/dist/` with Zero-CDN verification.
- [x] Update adversarial stress suite `tests/test_challenger_ui_1_stress.py` to assert hardened behavior (85/85 tests passing).
- [x] Verify zero regression across entire system: all PyTest unit tests passing + all E2E tests passing.

## Phase 10: Exhaustive God-Mode Systems Architecture & Technology Evaluation (COMPLETED & VERIFIED)
- [x] **Pillar 1 Research (Daemon Core & Zero-Copy IPC)**: Completed [`01_low_latency_daemon_ipc.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/02_architecture/research/god_mode/01_low_latency_daemon_ipc.md) (Rust Axum + Tokio static `musl` daemon, POSIX Shared Memory `shm_open` + `io_uring` 31.2 GB/s, <250ns latency).
- [x] **Pillar 2 Research (AI Inference, Quantization & Routing)**: Completed [`02_inference_quantization_routing.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/02_architecture/research/god_mode/02_inference_quantization_routing.md) (vLLM Marlin AWQ 4-bit, XGrammar Pushdown Automata <0.04ms logit mask, Sakana AI merged `SMITRACE-Sovereign-14B-v1`, Radix Tree prefix cache).
- [x] **Pillar 3 Research (Air-Gap Security, PKI & Micro-Sandboxing)**: Completed [`03_airgap_sandboxing_security.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/02_architecture/research/god_mode/03_airgap_sandboxing_security.md) (`nsjail` Tier 1 process namespaces + gVisor `nvproxy` Tier 2 fallback, `nftables` DROP, Tetragon, YubiKey PKCS#11 mTLS PKI & WebAuthn).
- [x] **Pillar 4 Research (Neurosymbolic SMT & Anti-Collapse State)**: Completed [`04_neurosymbolic_smt_anticollapse.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/02_architecture/research/god_mode/04_neurosymbolic_smt_anticollapse.md) (Z3 exact rational lifting, 0.0% FAR across ASME B31.3/API 510/API 650/API 570/ISO 13703, process pool GIL elimination, dual-tier BLAKE3 Merkle WAL).
- [x] **Pillar 5 Research (Vision Skeletonization & Spatial Graph)**: Completed [`05_raster_to_graph_spatial.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/02_architecture/research/god_mode/05_raster_to_graph_spatial.md) (OpenCV Guo-Hall / CUDA thinning, Rust `rstar` R*-Tree, Rust `petgraph` 106.6x faster Dijkstra, PaddleOCR v4 ONNX).
- [x] **Pillar 6 Research (Industrial UI & Model Context Protocol)**: Completed [`06_frontend_mcp_integration.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/02_architecture/research/god_mode/06_frontend_mcp_integration.md) (SolidJS/Svelte 5 fine-grained signals, WebGL 2.0/WebGPU 60 FPS 50,000+ vector viewport with $O(1)$ offscreen color picking, native MCP server over stdio/WS).
- [x] Synchronize research master index in [`02_architecture/research/README.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/02_architecture/research/README.md) and system documentation files.

## Phase 11: Settled Phased Milestone Migration Execution Plan
- [ ] **Phase 11.1 — Rust Backend Daemon Core & UDS gRPC IPC**:
  - Implement static `musl` Rust daemon using Axum + Tokio.
  - Implement gRPC over Unix Domain Sockets (`/tmp/smitrace-worker.sock`) connecting Rust daemon to Python worker processes for Z3 SMT and ML inference.
  - Implement Dual Isolation boundary (`nsjail` process namespaces + Landlock LSM).
- [ ] **Phase 11.2 — Pixi.js WebGL 2.0 / WebGPU Schematic Viewport Rewrite**:
  - Migrate `ui/src/components/pid/PIDViewerTab.jsx` to Pixi.js v8 rendering engine with WebGL 2.0 / WebGPU acceleration.
  - Integrate RBush R-Tree spatial index for 60 FPS rendering of 50,000+ vector nodes.
  - Implement offscreen 24-bit RGB color picking for $O(1)$ constant-time vector node selection.
- [ ] **Phase 11.3 — Native Model Context Protocol (MCP) Server**:
  - Implement native MCP server in Rust daemon over `stdio` and WebSocket transports.
  - Expose production JSON-RPC 2.0 tool schemas (`z3_formal_audit`, `pid_topology_query`, `asme_stress_calc`, `compile_ooxml_document`).
  - Secure tool execution within `nsjail` container sandboxes.
- [ ] **Phase 11.4 — Sakana AI Merged Model & vLLM Inference Pipeline**:
  - Perform Sakana AI evolutionary model merging (SLERP + TIES) creating `SMITRACE-Sovereign-14B-v1`.
  - Quantize checkpoint to 4-bit AWQ (Marlin format) co-located with 7B VLM on single 24GB GPU.
  - Serve merged model via vLLM with XGrammar Pushdown Automata logit masking and Radix Tree prefix caching.



