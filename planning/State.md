# Current System State — Sovereign AI Execution Plane

## Active Phase
**Milestone 15: Hardened Control Plane Resilience, Lease Watchdog & Chaos Verification (COMPLETED & VERIFIED)**  
*(Backed by 10-Stage Sovereign Judge Demo Pipeline & Physical Air-Gap Execution Plane)*

- **Milestone 15 Resilient Control Plane Foundation (Verified in `tests/test_control_plane_resilience.py`)**:
  - **Serialized SQLite WAL Writer Actor with Synchronous Event Barrier**: Dedicated single-writer channel executing `BEGIN IMMEDIATE` transactions with exponential backoff busy-timeout retry, eliminating `database is locked` errors and preventing SHA-256 hash forks. Mutating callers block on a synchronous `threading.Event` barrier for absolute read-after-write consistency. Tested under 50-thread concurrent hammer load with 0 errors.
  - **Timed Leases & Watchdog Sweeper**: 60s lease TTL (`lease_expires_at`) with 15s worker heartbeats (`last_heartbeat`) and an autonomous background watchdog thread sweeping expired leases back to `READY`. Units exceeding 3 retries automatically escalate to `WAITING_HUMAN`.
  - **Ephemeral Two-Phase Staging**: Candidate artifacts staged in isolated `/srv/smitrace/staging/{lease_id}/` sandboxes, committed to production storage and SQLite ledger only upon formal Z3/AST SMT pass. Failed or timed-out candidate directories are automatically purged.
  - **Boot Integrity & Deterministic Replay**: Cold-boot validation of SHA-256 chain continuity from block 0 to tip with automatic orphan lease reclamation and fallback projection replay from the event log.
  - **Surgical DAG Branch Suspension**: Direct descendants of a failing unit transition to `BLOCKED` while independent sibling branches continue uninterrupted, preserving independent plant maintenance flows.
  - **Statutory Cryptographic Human Override**: Immutable `HUMAN_OVERRIDE` event logging with operator ID, physical justification ($\ge 20$ characters), and HMAC-SHA256 digital signature, establishing personal legal accountability.
  - **Chaos & Fault-Injection Suite**: Verified 5/5 passing tests in `tests/test_control_plane_resilience.py`.

- **Architectural Breakthroughs & Domain Foundations**:
  - **Neurosymbolic Multi-Variable SMT Constraint Envelopes (Z3 Solver)**: Solving for Maximum Allowable Working Pressure ($\Phi_{\text{MAWP}}$) across coupled corrosion rates $c_r(t)$, temperature-dependent allowable material stresses $S(T)$, mechanical allowances $c$, and weld efficiencies $E$ simultaneously via Cylindrical Algebraic Decomposition (CAD) and NLSat in First-Order Non-Linear Real Arithmetic (QF_NRA). Guaranteed 0.0% False Assurance Rate (FAR).
  - **Zero Cross-PCIe Model Thrashing**: Dedicated lightweight vision backbone (YOLO-v8 ONNX for ISA-5.1 symbols/valves + PaddleOCR v4 ONNX for text tags, <1.2GB) operating alongside a single permanently hard-pinned 14B reasoning model (`Qwen-2.5-14B-Instruct` AWQ or `SMITRACE-Sovereign-14B-v1`). Total static VRAM footprint fixed at <11GB in 24GB VRAM, reserving >12GB for dynamic vLLM PagedAttention KV-cache pools.
  - **Spatial Parser Invariants & Aggressive Gap-Bridging**:
    - Uniform $1024 \times 1024$ sliding-window tiling with $256\text{px}$ overlap, boundary stride-shifting (`edge_mode="shift"`), and cross-patch IoU NMS.
    - Pre-skeletonization aggressive gap-bridging heuristic (`bridge_drawing_gaps` in `skeletonizer.py`) combining directional morphological closing ($1 \times 7$ and $7 \times 1$) with Probabilistic Hough Transform (`cv2.HoughLinesP`, $15\text{px}$ gap tolerance).
    - Spatial KD-Tree index (`GeometricSnapper`) enforcing a strict **$40\text{px}$ snapping radius** with orthogonal projection to pipe polyline vectors.
  - **Work Unit DAG Generalizability & Dynamic Capability Grammar**: Demonstrates multi-standard plant task dispatch beyond single-line piping (ASME B31.3 piping, API 650 storage tanks, API 510 pressure vessels, API 520/521 relief valves, AWS D1.1/ISO 13703 structural welds) with declarative JSON-RPC capability schemas and privilege dropping in ephemeral sandboxes.
  - **Statutory Auditability Framing**: All resilience mechanisms presented strictly through the lens of **Statutory Auditability (DPDP Act 2023 §8 / ITAR / DGMS Circulars)**: "Zero-trust, non-repudiable legal provenance that prevents AI hallucination from causing physical plant failure or un-audited Permitted-to-Work (PTW) breaches."

- **FastAPI Core Execution Plane & Unified SPA**: `http://127.0.0.1:8000` (Active)
- **Vite Workbench HMR Dev Server**: `http://127.0.0.1:5173` (Active)
- **Air-Gap Telemetry Status**: `HEALTHY` (0 bytes WAN egress verified live via `psutil`)

## Master Documentation Layout (De-Duplicated Architecture)
- **Core Specification Documents**:
  - `PRD.md`: Master Product Requirements Document
  - `TRD.md`: Master Technical Requirements Document
  - `Architecture.md`: Master System Architecture Blueprint & Interface Contracts
  - `context.md`: Ubiquitous Language, Glossary & System Invariants
  - `adr.md`: Consolidated Master ADRs (ADR-001 through ADR-007)
  - `ToDo.md`: Layered Architectural To-Do List (Layer 0 to Layer 7)
- **Core Directories**:
  - `planning/`: Project state, sprint tracking & milestones (`planning/State.md`)
  - `research/`: In-depth gap analyses & technical papers (`research/model_auto_selection_gap_analysis.md`)
  - `tests/`: End-to-end verification suites & chaos tests
  - `cache/`: Designated local cache directory
  - `src/`: Core Python sovereign engine & control plane
  - `ui/`: Industrial Workbench React 18 + Vite SPA
