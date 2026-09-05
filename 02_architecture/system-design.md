# Architecture.md — Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)

## 1. System Master Architecture Diagram

```
                                 OPERATOR / USER
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │   Workbench Web UI & IDE  │
                          │ (Traces / Docs / Network) │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │   Session & DAG Manager   │
                          │ (Immutable Task State DB) │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                    ┌───────────────────────────────────────┐
                    │       COMPOUND ROUTING ENGINE         │
                    │ 1. Structural Fast-Path (MIME/AST)    │
                    │ 2. Dynamic Score Optimization         │
                    │ 3. Prefix/KV-Cache Affinity           │
                    └───────────────────┬───────────────────┘
                                        │
        ┌───────────────────────────────┴───────────────────────────────┐
        ▼                                                               ▼
┌────────────────┐                                             ┌────────────────┐
│ Fast Worker    │                                             │ Specialist     │
│ 7B/8B (Quant)  │                                             │ 14B / VLM-7B   │
│ Code & Routing │                                             │ Vision/Reason  │
└───────┬────────┘                                             └───────┬────────┘
        │                                                               │
        └───────────────────────────────┬───────────────────────────────┘
                                        ▼
                             ┌─────────────────────┐
                             │ Agent Runtime (DAG) │
                             │ Grammar Constraints │
                             └──────────┬──────────┘
                                        │
        ┌────────────────┼──────────────┼────────────────┐
        ▼                ▼              ▼                ▼
 ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
 │ Relational  │  │  nsjail /   │  │ Headless    │  │ Local Lance │
 │ Document CV │  │   gVisor    │  │ DOCX / XLSX │  │ Vector DB & │
 │ Tiled Grid  │  │   Sandbox   │  │ Engine      │  │ SQLite WAL  │
 └─────────────┘  └──────┬──────┘  └─────────────┘  └─────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ Neurosymbolic Check │
              │ AST + Z3 SMT Solver │
              └──────────┬──────────┘
                         │
               ┌─────────┴─────────┐
               ▼                   ▼
             PASS                FAIL ──► State-Isolated Anti-Collapse Loop
               │
               ▼
     FINAL VERIFIED ARTIFACT (.docx / .xlsx)

 ═══════════════════════════════════════════════════════════════════════════════
                      SOVEREIGNTY & AIR-GAP CONTROL PLANE
   Kernel nftables (Default DROP) │ eBPF Socket Probes (Tetragon) │ Zero Egress
 ═══════════════════════════════════════════════════════════════════════════════
```

## 2. Five Critical Breakthrough Bottlenecks & Architectural Solutions

### 2.1 Raster-to-Graph Topology Reconstruction for Engineering Schematics
- **Problem**: 4000x3000 P&ID drawings lose line connectivity and equipment tags when downsampled into fixed 14x14 VLM patch tokens.
- **Architecture Solution**: Hybrid Computer Vision + Semantic Labeling Pipeline:
  1. High-res tile slicing with overlap.
  2. OpenCV morphological thinning and Hough transforms to extract vector coordinates and junction paths.
  3. VLM extraction of bounding boxes for tags (e.g., `10-P-101-CS`).
  4. Geometric snapping of symbol centroids to vector line endpoints, forming a NetworkX graph.

### 2.2 Sub-100ms Heterogeneous Model Multiplexing on a Single GPU
- **Problem**: Swapping distinct model architectures (Vision, Reasoner, Code) over PCIe causes 4–10s stalls.
- **Architecture Solution**: Residency-Aware Scheduling & Quantized Coexistence:
  1. Qwen-2.5-14B AWQ (~9.5GB) + Qwen2-VL-7B (~5.5GB) co-located in 24GB VRAM.
  2. Single PagedAttention runtime (vLLM) managing dynamic KV-cache pools (~6.5GB).
  3. Warm-swapping vision weights to pinned host RAM (not disk).

### 2.3 Neurosymbolic Semantic Verification for SLM-Generated Code
- **Problem**: Grammar constraints ensure code compiles, but cannot catch engineering calculation errors.
- **Architecture Solution**: Domain Specification Contracts & Z3 SMT Verification:
  1. AST parsing extracts Python variables, equations, and assigned constants.
  2. Translates ASME B31.3 pipe wall thickness equations into Z3 SMT logic.
  3. Emits UNSAT/counterexample if physical invariants are violated ($t_{\text{actual}} < t_{\text{min}}$ or corrosion rate out of historical bounds).

### 2.4 Non-Degrading Self-Correction Loops in 7B–14B Parameter Models
- **Problem**: Small models suffer cognitive collapse when fed full multi-turn conversational repair histories.
- **Architecture Solution**: Strict State-Isolated Anti-Collapse Control:
  1. Memory decoupling: Immutable Spec (task + Z3 contract), Mutable State (code + stderr), Failure Signatures (hashes).
  2. Clean-context re-prompting: Model receives ONLY Immutable Spec + immediate failing traceback.
  3. Capped 3-turn hard escalation ceiling.

### 2.5 Multi-Modal Relational Document Chunking and Retrieval
- **Problem**: Linear 500-token text chunking severs complex tables, footnotes, and callouts across manual pages.
- **Architecture Solution**: Hierarchical Evidence Graphs:
  1. Docling/Surva segmentation identifying atomic layout elements (tables, callouts, headers).
  2. Relational cross-indexing linking "Table 4.2" to "Equipment Tag PV-101".
  3. LanceDB vector retrieval returning complete relational context bundles (text + linked table + coordinates).

## 3. Physical Security & Air-Gap Enforcement
1. **Kernel Firewall**: Linux `nftables` policy with default `policy drop` on outbound traffic.
2. **eBPF Tetragon Audit**: Hooks `sys_enter_connect` and socket operations at the kernel level, streaming metrics to an on-screen Sovereignty Dashboard.
3. **Execution Sandboxing**: Ephemeral `nsjail` containers configured with `--network none`, read-only rootfs, 512MB RAM, and cgroups CPU limits.
