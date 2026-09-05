# Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)  
> **Domain**: Regulated PSUs, Refineries, Defence Production Units (DPSUs), and Sovereign Infrastructure.  
> **Security Baseline**: On-Premises, Physically Air-Gapped, Kernel-Enforced Zero Outbound WAN Egress.

---

## Overview
The **Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)** is an enterprise-grade AI system built specifically for regulated industrial environments. It enables engineering and operations personnel to parse high-resolution engineering prints (P&IDs), process handwritten/scanned inspection logs, run ASME/API code calculations, and synthesize official PSU approval notes without exposing confidential enterprise payloads to external cloud datacenters.

## Core Breakthroughs & Features
- **Evolutionary Model Merging (Sakana AI Paradigm)**: Co-locates quantized 14B instruction/code models and 7B vision models within a single 24GB VRAM footprint.
- **Compound Hardware-Aware Router**: Dynamically routes workloads based on MIME type, KV-cache prefix hit rates, and VRAM pressure metrics.
- **Raster-to-Graph P&ID Reconstruction**: OpenCV edge skeletonization + VLM symbol extraction producing queryable NetworkX topological graphs.
- **Neurosymbolic Z3 Verification Engine**: AST parsing and Z3 SMT solver verifying ASME B31.3 physical invariants before code execution (False Assurance Rate = 0.0%).
- **State-Isolated Anti-Collapse Loop**: Decouples Immutable Spec and failing tracebacks to eliminate cognitive collapse in 7B–14B models.
- **Headless Enterprise Deliverables**: Direct binary `.docx` and `.xlsx` compilation into official PSU templates.
- **Kernel-Enforced Air-Gap**: `nftables` default drop firewall with eBPF Tetragon socket monitoring proving 0 outbound WAN bytes transferred.

---

## Workspace Documentation Layout
- [`context.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/context.md) / [`CONTEXT.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/CONTEXT.md): System executive context & regulatory domain background.
- [`State.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/State.md): Active task status & execution state tracking.
- [`PRD.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/PRD.md) / [`01_product/prd.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/01_product/prd.md): Product Requirements Document & Demonstration Workflows.
- [`TRD.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/TRD.md) / [`02_architecture/trd.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/02_architecture/trd.md): Technical Requirements Document & Technology Stack.
- [`Architecture.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/Architecture.md) / [`02_architecture/system-design.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/02_architecture/system-design.md): System Master Architecture & Breakthrough Details.
- [`ToDo.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/ToDo.md) / [`Roadmap.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/Roadmap.md): Implementation roadmap & verification task checklist.

---

## Verification & Air-Gap Audit Script
To audit network isolation on the host system:

```bash
chmod +x scripts/airgap_audit.sh
./scripts/airgap_audit.sh
```
