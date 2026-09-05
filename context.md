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
4. **Raster-to-Graph Topology Reconstruction (Milestone 2 - COMPLETED)**: Slices high-resolution P&ID schematics via `patcher.py`, applies pure NumPy vectorized Zhang-Suen & OpenCV morphological skeletonization (`skeletonizer.py`), extracts ISA-5.1 tags with OCR repair (`graph_builder.py`), snaps endpoints with KD-Tree and orthogonal projection, and constructs queryable NetworkX topological graphs verified on synthetic benchmarks (`synthetic_pid.py`, 39/39 tests passing).
5. **Neurosymbolic Verification Engine**: Combines Python AST parsing with a local Z3 SMT solver to enforce physical invariants (ASME B31.3 / API 510 pipe thickness rules) before code execution.
6. **State-Isolated Anti-Collapse Control**: Decouples Immutable Spec, Mutable State, and Failure Hashes to prevent cognitive collapse in 7B–14B models during multi-turn debugging.
7. **Kernel-Enforced Sovereignty**: Linux kernel `nftables` DROP policy with eBPF Tetragon probes to guarantee 0 outbound WAN bytes.
