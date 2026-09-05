# ToDo.md / Roadmap — Sovereign AI Execution Plane Implementation (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)  
> **Scope Note**: Execution capped at Milestone 3 (M3: Neurosymbolic AST & Z3 Verification Engine) per explicit user instruction.

## Phase 0: Repository & Documentation Initialization
- [x] Link repository origin `https://github.com/VINYASGM/smitrace.git` on `main`.
- [x] Configure standard production `.gitignore`.
- [x] Synchronize PRD, TRD, Architecture, Roadmap/ToDo, State, context, README, and PROJECT specifications.

## Phase 1 (Milestone 1): Core Air-Gap & Process Sandboxing
- [x] Establish architecture blueprint & master documentation (`PRD.md`, `TRD.md`, `Architecture.md`, `context.md`, `State.md`, `PROJECT.md`).
- [x] Implement `scripts/airgap_audit.sh` (Kernel `nftables` DROP policy check + `tcpdump` zero-egress monitor).
- [x] Implement process sandbox launcher (`src/sovereign/sandbox/launcher.py`, `--network none`, 512MB RAM, 10s CPU limit, Windows Job Objects & Linux fallback).
- [x] Implement network auditor module (`src/sovereign/sandbox/auditor.py`, `AirGapVerdict`, `AirGapMonitor`, log parsers).
- [x] Implement Milestone 1 test suite (`tests/test_sandbox.py`, 34/34 tests passing across all 6 scenarios).

## Phase 2 (Milestone 2): Multimodal Raster-to-Graph Engine
- [x] Develop spatial layout skeletonizer (`src/sovereign/vision/skeletonizer.py`, OpenCV line skeletonization).
- [x] Implement image patcher for 4000x3000 P&ID drawings (`src/sovereign/vision/patcher.py`).
- [x] Build NetworkX topological graph builder (`src/sovereign/vision/graph_builder.py`, equipment nodes and pipe junctions).
- [x] Create synthetic P&ID generator (`src/sovereign/vision/synthetic_pid.py`) and test suite (`tests/test_vision.py`).

## Phase 3 (Milestone 3): Neurosymbolic AST & Z3 Verification Engine
- [x] Develop AST security visitor (`src/sovereign/verifier/ast_guard.py`, blocking prohibited imports).
- [x] Implement ASME B31.3 pipe wall thickness equation Z3 verifier (`src/sovereign/verifier/z3_asme.py`).
- [x] Implement API 510 pressure vessel retirement Z3 verifier (`src/sovereign/verifier/z3_api510.py`).
- [x] Unit test suite (`tests/test_verifier.py`, 0.0% False Assurance Rate verified).

## Scope Capping Directive
- **Milestone 4 & Milestone 5**: Held in abeyance per user directive ("stop at m3").

