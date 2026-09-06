# Contributing & Engineering Workflows

Welcome to the Sovereign AI Execution Plane (SMITRACE) engineering documentation. This file outlines our coding standards, local development workflows, and strict error-handling procedures required to maintain a 0.0% False Assurance Rate and zero-egress invariants.

## 1. Coding Standards

### Rust (Daemon Core)
- **Idioms**: Utilize strict `tokio` asynchronous patterns. Avoid blocking the executor thread with heavy cryptographic or file I/O operations; spawn blocking tasks via `tokio::task::spawn_blocking`.
- **Memory Safety**: IPC over Unix Domain Sockets (UDS) utilizes `shm_open`. Memory boundaries between the daemon and Python workers must be rigorously sanitized using `zerocopy`.
- **Error Handling**: Do not use `.unwrap()` or `.expect()` in production paths. Propagate errors via `anyhow::Result` and map them to standard gRPC `tonic::Status` codes.

### Python (Z3 SMT & Vision Worker Pool)
- **Security Boundaries**: Banned modules (`subprocess`, `socket`, `requests`, `urllib`, `pathlib.Path.unlink`) are strictly enforced via the `ast_guard.py` hook. Do not attempt to bypass these.
- **Verification Logic**: ASME B31.3 and API 510 physical invariants are proven in local Z3 instances. Stick to rational lifting (e.g., $223/1008$) rather than floating-point floats when declaring constraints to prevent precision drift.
- **Vision Acceleration**: Rasterization and thinning must utilize vectorized pure `numpy` and OpenCV `cv2` bindings to meet the 60 FPS graph ingestion requirement.

### UI (React & Pixi.js)
- **Rendering**: 50,000+ vector node diagrams use Pixi.js v8 over WebGL 2.0/WebGPU. Use spatial indices (RBush R-Tree) for bounding box queries. Implement $O(1)$ constant-time offscreen color picking for node selection.
- **State Management**: Leverage Zustand for persistent UI state. Do not block the React main thread during WASM or intensive UI renders.

## 2. Development Workflow

- **Local Execution**: All development occurs locally over `127.0.0.1`.
- **Pre-Commit Audit**: Before any merge to `main`, the `./scripts/airgap_audit.sh` script must be run to verify zero WAN egress via `nftables`.
- **Model Merging**: Sakana AI model merging (combining reasoning and vision matrices into a 14B AWQ 4-bit footprint) is executed via our internal Slurp scripts before quantization.

## 3. Failure & Error Handling

- **Non-Finite Floats**: `NaN` and `-inf` encountered during physical calculations are strictly clamped to physical boundary equivalents (e.g., `-999999.0`) to avoid FastAPI/JSON serialization crashes.
- **Z3 UNSAT**: When the Z3 SMT solver yields an `UNSAT` (Unsatisfiable) result, the constraint proof must be preserved in the cryptographic Merkle WAL before returning the False verification status.
- **Anti-Collapse Self-Correction**: If a Python sandbox payload fails at runtime, the exception traceback is captured and appended to the history. The ReAct agent undergoes a complete context wipe, presenting only the `ImmutableSpec` and the failure history to the model, ensuring prompt convergence in $\le 3$ turns.
