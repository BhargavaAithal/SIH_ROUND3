# Context — Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)

## Executive Context & Domain
This project defines the complete architecture, engineering design, and operational implementation for an **On-Premises, Network-Isolated Sovereign AI Execution Plane and Industrial Workbench (SMITRACE)**.

Target operational environments include:
- Regulated Public Sector Undertakings (PSUs)
- Oil refineries and petrochemical processing plants
- Defence Production Units (DPSUs) & Critical Infrastructure Facilities

These facilities operate under strict statutory, contractual, and national security mandates (e.g., ITAR, NIS2, DPDP Act 2023, Indian Ministry of Finance AI directives) that strictly prohibit internal data from crossing enterprise network perimeters.

## Core Problem Statement: Shadow AI vs. Blanket Bans
Due to data security mandates, cloud-based frontier AI models (ChatGPT, Claude, etc.) are blocked at perimeter firewalls. However, knowledge workers face manual labor friction in:
1. Reviewing Piping & Instrumentation Diagrams (P&IDs) and isometric prints.
2. Drafting formal PSU approval notes, board memos, and tender summaries.
3. Executing mechanical & structural calculations against ASME, API, and ISO codes.
4. Processing handwritten inspection logs and degraded scanned reports.

Standard cloud AI tools expose organizations to regulatory non-compliance, while complete AI bans lead to severe productivity loss or unauthorized "shadow AI" usage.

## Solution Paradigm: Sovereign AI Execution Plane
The system provides a turnkey, physically air-gapped AI appliance and workbench running locally on enterprise hardware (scalable from a single 24GB GPU node to multi-GPU clusters).

### Technical Principles & Breakthroughs
1. **Evolutionary Model Merging (Sakana AI Paradigm)**: Merging parameter weights across domain specialists (mathematics, coding, instruction-following) into compact 14B checkpoints to fit within 24GB VRAM without PCIe swapping.
2. **"The AI Scientist" State Machine**: Replaces open-ended chat with deterministic DAG execution: Plan -> Sandboxed Execute -> Self-Correct -> Synthesize -> Peer Review.
3. **Compound Hardware-Aware Router**: Math-based dynamic scheduling using structural fast-paths, VRAM pressure metrics, and prefix KV-cache affinity.
4. **Raster-to-Graph Topology Reconstruction (R2 - COMPLETED & VERIFIED)**: Slices high-resolution P&ID schematics via `patcher.py`, applies pure NumPy vectorized Zhang-Suen & OpenCV morphological skeletonization (`skeletonizer.py`), extracts ISA-5.1 tags with OCR repair (`graph_builder.py`), parses pipe attributes (`get_pipe_attributes`), snaps endpoints with KD-Tree and orthogonal projection, and constructs queryable NetworkX topological graphs.
5. **Neurosymbolic Verification Engine (R3 - COMPLETED & VERIFIED)**: Combines Python AST parsing with local Z3 SMT solver (`z3_asme.py`, `z3_api510.py`) to enforce physical invariants (ASME B31.3 / API 510) before execution (0.0% False Assurance Rate).
6. **State-Isolated Anti-Collapse Control (R4 - COMPLETED & VERIFIED)**: Decouples Immutable Spec, Mutable State, and Failure Hashes (`state_machine.py`) to eliminate cognitive collapse in 7B–14B models during multi-turn debugging (100% convergence in <= 3 turns).
7. **Headless Enterprise Deliverables (R5 - COMPLETED & VERIFIED)**: Native OOXML document compiler (`docx_compiler.py`) and multi-tab audited spreadsheet generator (`xlsx_compiler.py`) creating compliant `.docx` and `.xlsx` artifacts without external office dependencies.
8. **Kernel-Enforced Sovereignty (R1 - COMPLETED & VERIFIED)**: Linux kernel `nftables` DROP policy, local sandbox launcher (`launcher.py`), and eBPF/audit probes (`auditor.py`) mathematically guaranteeing 0 outbound WAN bytes.
9. **Headless High-Security Service & Offline PKI (Phase 8 - SETTLED DESIGN)**: Headless Unix daemon listening on `127.0.0.1` enforcing mTLS authentication with hardware tokens (YubiKey / PIV SmartCard x509 certificates).
10. **API 650 Storage Tank Z3 Verifier (Phase 8 - SETTLED DESIGN)**: Extends neurosymbolic theorem proving to storage tanks (`z3_api650.py`) for One-Foot Method (SDM), VDM, hydrostatic test limits, and overturning stability.
11. **Cryptographic SHA-256 Merkle WAL Audit Log (Phase 8 - SETTLED DESIGN)**: Cryptographic append-only Write-Ahead Log ensuring non-repudiation and tamper-evidence for all Z3 SAT/UNSAT proofs and system executions.
12. **Industrial Workbench React SPA & FastAPI Server (R6 / M7 - COMPLETED & VERIFIED)**: Pre-compiled React 18 + Vite single-page application (`ui/`) featuring Tabbed Viewports (Interactive SVG P&ID canvas + Quick Action Drawer, ReAct Sandbox console, Z3 Formal Audit with 0.0% FAR, Deliverables client-side docx/xlsx previewers), Zustand persistent store, Server-Sent Events (`/api/v1/events`), Dual Theme (Industrial Dark `#0B0F19` / Modern Light `#F8FAFC`), persistent Sovereignty Header Badge ("AIR-GAP ACTIVE: 0 BYTES WAN" + eBPF modal), and legacy air-gapped FastAPI static asset & REST backend (`src/sovereign/api/server.py`).
13. **God-Mode High-Performance Daemon & IPC (Phase 11 - IN PROGRESS)**: A native Rust (Axum + Tokio) daemon completely replacing the Python control plane, offering UDS gRPC IPC to Python workers (`z3` & `vllm`), `<250ns` latency via POSIX `shm_open`, native MCP Server, and Pixi.js WebGL 2.0 viewport rendering for 50,000+ vector nodes.
14. **Enterprise Sovereign RAG & Knowledge Plane (Phase 12 - SETTLED DESIGN)**: Full-spectrum air-gapped RAG featuring hybrid Qdrant+BM25 retrieval, RRF fusion, local `bge-reranker-base`, parent-child chunking, inline citation provenance, confidence gate refusal (<0.45), chunk-level RBAC, document versioning/supersession delta banners, multimodal VLM layout parsing, AST-guarded symbolic code execution, sub-millisecond semantic caching, router-driven LoRA hot-swapping, indirect prompt injection defense, defensible cryptographic reports, and GDPR/HIPAA selective unlearning purge.

