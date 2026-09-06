# Project: Sovereign AI Execution Plane and Industrial Workbench (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)  
> **Upstream Remote**: `https://github.com/VINYASGM/smitrace.git` (branch: `main`)

## Architecture
- `src/sovereign/daemon/`: **(NEW)** High-performance Rust Axum + Tokio daemon serving as the core Control Plane, communicating with Python workers over UDS gRPC.
- `src/sovereign/api/`: Legacy FastAPI backend, pending deprecation via Phase 11.
- `proto/`: **(NEW)** UDS gRPC Protocol Buffer definitions (`smitrace.proto`).
- `src/sovereign/sandbox/`: Air-gap enforcement, eBPF/tcpdump audit script integration, ephemeral process sandbox launcher (`nsjail` / isolation with `--network none`, cgroups/rlimit limits).
- `src/sovereign/vision/`: OpenCV morphological line skeletonization, 4000x3000 P&ID tiling/slicing, symbol centroid extraction, NetworkX topology graph builder.
- `src/sovereign/verifier/`: Python AST security checker and Neurosymbolic Z3 SMT solver for ASME B31.3 / API 510 thickness invariants ($t_{\text{actual}} \ge t_{\text{min}}$, $P > 0$) with 0.0% False Assurance Rate.
- `src/sovereign/agent/`: 3-turn ReAct self-correction engine decoupling Immutable Spec, Mutable Script, and Failure Hashes with context reset.
- `src/sovereign/reports/`: Headless enterprise deliverable generator emitting verified `.docx` approval memos and audited `.xlsx` calculation workbooks.
- `src/sovereign/cli.py`: Unified air-gapped sovereign workbench CLI entry point.
- `tests/`: Comprehensive unit, integration, and 4-tier E2E testing suites.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Air-Gap & Sandbox Launcher | `src/sovereign/sandbox/`, `scripts/airgap_audit.sh` | None | COMPLETED |
| 2 | M2: Raster-to-Graph Vision Engine | `src/sovereign/vision/` | None | COMPLETED |
| 3 | M3: Neurosymbolic AST & Z3 Verifier | `src/sovereign/verifier/` | None | COMPLETED |
| 4 | M4: State-Isolated Anti-Collapse Loop | `src/sovereign/agent/` | M1, M3 | COMPLETED |
| 5 | M5: Enterprise Deliverable Generator | `src/sovereign/reports/` | M2, M3 | COMPLETED |
| 6 | M6: E2E Testing Track & Hardening | `tests/e2e/`, `TEST_READY.md` | M1-M5 | COMPLETED |
| 7 | M7: Sovereign Workbench UI & API | `ui/`, `src/sovereign/api/`, `tests/test_api.py` | M1-M6 | COMPLETED |
| 8 | M8: Adversarial Hardening & Remediation | `src/sovereign/api/server.py`, `src/sovereign/verifier/`, `ui/src/`, `tests/` | M1-M7 | COMPLETED |
| 11 | Phase 11: God-Mode Architecture Migration | `src/sovereign/daemon/`, `proto/`, `ui/` | M1-M8 | IN PROGRESS |

## Interface Contracts
### `sovereign.sandbox`
- `run_sandboxed(command: list[str], timeout_sec: int = 10, memory_limit_mb: int = 512, network: bool = False) -> SandboxResult`
- `audit_network_egress() -> AirGapVerdict`

### `sovereign.vision`
- `slice_drawing(image_path_or_array, tile_size=(1024, 1024), overlap=128) -> list[Patch]`
- `skeletonize_lines(image_or_patch) -> np.ndarray`
- `extract_topology(image_path_or_array) -> nx.Graph`
- `get_pipe_attributes(graph: nx.Graph, line_tag: str) -> dict`

### `sovereign.verifier`
- `verify_python_ast(code: str) -> ASTVerificationResult`
- `verify_asme_b31_3(design_pressure: float, outside_diameter: float, allowable_stress: float, quality_factor: float, temp_coefficient: float, corrosion_allowance: float, actual_thickness: float) -> Z3VerificationResult`
- `verify_api_510_invariants(t_actual: float, t_min: float, pressure: float) -> Z3VerificationResult`

### `sovereign.agent`
- `run_react_loop(spec: ImmutableSpec, max_turns: int = 3, engine_callback = None) -> LoopOutcome`

### `sovereign.reports`
- `generate_psu_memo(metadata: dict, calculations: list[dict], citations: list[str], output_path: str) -> str`
- `generate_audit_workbook(sheets_data: dict, output_path: str) -> str`

### `sovereign.daemon` (Rust)
- `Unix Domain Socket (UDS) listener` at `/tmp/smitrace-worker.sock`
- `Native Model Context Protocol (MCP) Server` over `stdio` and WebSocket.

### `sovereign.api` (Python - Legacy)
- `create_app() -> FastAPI`
- `GET /api/v1/telemetry/airgap -> AirgapTelemetryResponse`
- `GET /api/v1/events -> StreamingResponse (text/event-stream)`
- `GET /api/v1/pid/topology -> TopologyResponse`
- `POST /api/v1/pid/calculate -> PIDCalculateResponse`
- `POST /api/v1/sandbox/execute -> SandboxExecuteResponse`
- `POST /api/v1/verifier/evaluate -> VerifierEvaluateResponse`
- `GET /api/v1/deliverables/memo -> docx binary stream`
- `GET /api/v1/deliverables/workbook -> xlsx binary stream`

## Code Layout
```
c:/Users/Vinyas G M/OneDrive/Desktop/SIH/
├── proto/
│   └── smitrace.proto
├── src/
│   └── sovereign/
│       ├── __init__.py
│       ├── cli.py
│       ├── daemon/
│       │   ├── Cargo.toml
│       │   └── src/
│       │       └── main.rs
│       ├── sandbox/
│       │   ├── __init__.py
│       │   ├── launcher.py
│       │   └── auditor.py
│       ├── vision/
│       │   ├── __init__.py
│       │   ├── skeletonizer.py
│       │   ├── patcher.py
│       │   └── graph_builder.py
│       ├── verifier/
│       │   ├── __init__.py
│       │   ├── ast_guard.py
│       │   ├── z3_asme.py
│       │   └── z3_api510.py
│       ├── agent/
│       │   ├── __init__.py
│       │   ├── state_machine.py
│       │   └── prompt_templates.py
│       ├── reports/
│       │   ├── __init__.py
│       │   ├── docx_compiler.py
│       │   └── xlsx_compiler.py
│       └── api/
│           ├── __init__.py
│           ├── schemas.py
│           └── server.py
├── ui/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── dist/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── store/
│       ├── services/
│       ├── assets/
│       └── components/
├── tests/
│   ├── conftest.py
│   ├── test_sandbox.py
│   ├── test_vision.py
│   ├── test_verifier.py
│   ├── test_agent.py
│   ├── test_reports.py
│   └── e2e/
│       ├── runner.py
│       ├── test_tier1_features.py
│       ├── test_tier2_boundaries.py
│       ├── test_tier3_combinations.py
│       └── test_tier4_scenarios.py
├── scripts/
│   └── airgap_audit.sh
├── PROJECT.md
├── PRD.md
├── TRD.md
├── Architecture.md
├── ToDo.md
├── Roadmap.md
├── State.md
└── context.md
```
