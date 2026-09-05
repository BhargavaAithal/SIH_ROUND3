# Roadmap: Sovereign AI Execution Plane Implementation (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)

## Phase 1: Core Air-Gap & Local Runtime Foundation
- [x] Establish architecture blueprint & master documentation (`PRD.md`, `TRD.md`, `Architecture.md`, `context.md`, `State.md`, `PROJECT.md`).
- [x] Implement `scripts/airgap_audit.sh` (Kernel `nftables` DROP policy check + `tcpdump` zero-egress monitor).
- [ ] Set up local inference daemon with vLLM / llama.cpp serving Qwen-2.5-14B AWQ & Qwen2-VL-7B.
- [ ] Configure local LanceDB vector store & embedding model pipeline (`bge-small-en-v1.5`).

## Phase 2: Ingestion & Topology Reconstruction Engine (Milestone 2 - COMPLETED)
- [x] Develop two-tier spatial layout parser (pure NumPy vectorized Zhang-Suen `_zhang_suen_pure_numpy` & OpenCV line skeletonization, drawing tiling/slicing `patcher.py`).
- [x] Implement equipment tag (`10-P-101-CS`) bounding-box & centroid snapping extractor with spatial KD-Tree and orthogonal projection (`graph_builder.py`).
- [x] Build NetworkX topological graph builder connecting equipment nodes and pipe junctions (`nx.Graph` & `nx.DiGraph`).
- [x] Implement procedural synthetic 4000x3000 P&ID benchmark generator (`synthetic_pid.py`) and comprehensive 39-test verification suite (`tests/test_vision.py`).

## Phase 3: Compound Router & Neurosymbolic Execution Engine
- [ ] Implement hardware-aware scoring scheduler using mathematical objective function.
- [x] Implement process sandbox launcher (`run_sandboxed`, `--network none`, 512MB RAM, 10s CPU limit, Windows fallback).
- [x] Develop AST security parser & Z3 SMT constraint verification engine for ASME B31.3 / API 510 formulas (0.0% False Assurance Rate).
- [x] Build State-Isolated Anti-Collapse Loop with clean-context re-prompting (3-turn limit, failure hash deduplication).

## Phase 4: Headless Deliverable Engine & Workbench UI
- [x] Build `python-docx` template populator for official PSU memo formatting (`Approval_Note.docx`).
- [x] Build `openpyxl` engine for audited mechanical calculation workbooks with active dynamic formulas (`Analysis.xlsx`).
- [ ] Develop Workbench UI dashboard (Execution DAG graph, tool logs, VRAM pressure, eBPF sovereignty telemetry).

## Phase 5: Comprehensive 4-Tier E2E Testing Track (Milestone 6)
- [x] Tier 1: Feature Coverage (R1-R5: 29 tests validating baseline functional contracts).
- [x] Tier 2: Boundary & Corner Cases (R1-R5: 25 tests stress-testing non-nominal, extreme, and malformed inputs).
- [x] Tier 3: Cross-Feature Combinations (Pairwise matrix across vision, verifier, sandbox, anti-collapse, reports).
- [x] Tier 4: Real-World PSU Application Scenarios (Refined Products Pipeline, CDU Topology, Corrupt Script Recovery).
- [x] Unified Test Runner CLI (`tests/e2e/runner.py` with ANSI table, JSON/XML reporting, fail-fast, tier filtering).
- [x] Test Publication Certification (`TEST_READY.md`).
