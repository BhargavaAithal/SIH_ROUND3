# Roadmap — Sovereign AI Execution Plane Implementation

## Phase 1: Core Air-Gap & Local Runtime Foundation
- [x] Establish architecture blueprint & master documentation (`PRD.md`, `TRD.md`, `Architecture.md`, `context.md`, `State.md`).
- [ ] Implement `scripts/airgap_audit.sh` (Kernel `nftables` DROP policy check + `tcpdump` zero-egress monitor).
- [ ] Set up local inference daemon with vLLM / llama.cpp serving Qwen-2.5-14B AWQ & Qwen2-VL-7B.
- [ ] Configure local LanceDB vector store & embedding model pipeline (`bge-small-en-v1.5`).

## Phase 2: Ingestion & Topology Reconstruction Engine
- [ ] Develop two-tier spatial layout parser (Docling / OpenCV edge skeletonization).
- [ ] Implement VLM tile-based OCR and equipment tag (`10-P-101-CS`) bounding-box extractor.
- [ ] Build NetworkX geometric snapping matrix for raster line endpoints to symbol centroids.
- [ ] Build hierarchical evidence graph chunking module for relational table-text references.

## Phase 3: Compound Router & Neurosymbolic Execution Engine
- [ ] Implement hardware-aware scoring scheduler using mathematical objective function.
- [ ] Implement `nsjail` sandbox launcher (`--network none`, 512MB RAM, 10s CPU limit).
- [ ] Develop AST parser & Z3 SMT constraint verification engine for ASME B31.3 / API 510 formulas.
- [ ] Build State-Isolated Anti-Collapse Loop with clean-context re-prompting (3-turn limit).

## Phase 4: Headless Deliverable Engine & Workbench UI
- [ ] Build `python-docx` template populator for official PSU memo formatting (`Approval_Note.docx`).
- [ ] Build `openpyxl` engine for audited mechanical calculation workbooks (`Analysis.xlsx`).
- [ ] Develop Workbench UI dashboard (Execution DAG graph, tool logs, VRAM pressure, eBPF sovereignty telemetry).

## Phase 5: Verification, Benchmarking & Demonstration
- [ ] Validate Demonstration Workflow A: Scanned UT Report -> Formatted PSU Approval Note.
- [ ] Validate Demonstration Workflow B: ASME B31.3 Pipe Lifespan Calculation with Z3 Verification & Self-Correction.
- [ ] Run Quantitative Evaluation Benchmark Suite.
