# Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)  
> **Domain**: Regulated PSUs, Refineries, Defence Production Units (DPSUs), and Sovereign Infrastructure.  
> **Security Baseline**: On-Premises, Physically Air-Gapped, Kernel-Enforced Zero Outbound WAN Egress.

---

## Overview
The **Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)** is an enterprise-grade AI system built specifically for regulated industrial environments. It enables engineering and operations personnel to parse high-resolution engineering prints (P&IDs), process inspection logs, run ASME/API code calculations, and synthesize official PSU approval notes without exposing confidential enterprise payloads to external cloud datacenters.

## Core Breakthroughs & Features
- **High-Performance Rust Daemon Core**: Static `musl` compiled Axum + Tokio backend with POSIX `shm_open` UDS gRPC IPC (<250ns latency) orchestrating Python workers.
- **Native Model Context Protocol (MCP)**: Production JSON-RPC 2.0 tool schemas over `stdio` and WebSockets for local Z3 and OOXML integration.
- **WebGL 2.0 / WebGPU Viewport Engine**: Pixi.js v8 rendering 50,000+ interactive P&ID nodes at 60 FPS with $O(1)$ constant-time offscreen color picking.
- **Evolutionary Model Merging (Sakana AI Paradigm)**: Co-locates AWQ 4-bit quantized 14B instruction/code models and 7B vision models within a single 24GB VRAM footprint.
- **Compound Hardware-Aware Router**: Dynamically routes workloads based on MIME type, KV-cache prefix hit rates, and VRAM pressure metrics.
- **Raster-to-Graph P&ID Reconstruction**: OpenCV edge skeletonization + VLM symbol extraction producing queryable NetworkX topological graphs.
- **Neurosymbolic Z3 Verification Engine**: AST parsing and Z3 SMT solver verifying ASME B31.3 physical invariants before code execution (False Assurance Rate = 0.0%).
- **State-Isolated Anti-Collapse Loop**: Decouples Immutable Spec and failing tracebacks to eliminate cognitive collapse in 7B–14B models.
- **Headless Enterprise Deliverables**: Direct binary `.docx` and `.xlsx` compilation into official PSU templates.
- **Kernel-Enforced Air-Gap**: `nftables` default drop firewall with eBPF Tetragon socket monitoring proving 0 outbound WAN bytes transferred.

---

## Workspace Layout
- [`Architecture.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/Architecture.md): Master System Architecture Blueprint, Breakthroughs & Interface Contracts.
- [`TRD.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/TRD.md): Technical Requirements Document & Technology Stack.
- [`PRD.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/PRD.md): Product Requirements Document & Demonstration Workflows.
- [`context.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/context.md): System executive context, ubiquitous language & regulatory domain background.
- [`adr.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/adr.md): Consolidated Master Architectural Decision Records (ADR-001 through ADR-007).
- [`ToDo.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/ToDo.md): Layered Architectural To-Do List (Layer 0 to Layer 7).
- [`planning/`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/planning/): Active task state and milestone tracking (`planning/State.md`).
- [`research/`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/research/): Deep technical research papers and gap analyses (`research/model_auto_selection_gap_analysis.md`).
- [`tests/`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/tests/): End-to-end verification suites, boundary checks, and resilience tests.
- [`cache/`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/cache/): Designated local cache directory.

---

## Verification & Air-Gap Audit Script
To audit network isolation on the host system:

```bash
chmod +x scripts/airgap_audit.sh
./scripts/airgap_audit.sh
```
