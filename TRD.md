# Technical Requirements Document (TRD) — Sovereign AI Execution Plane (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)

## 1. Technical Scope & Architecture Principles
The Sovereign AI Execution Plane (SMITRACE) delivers an air-gapped, high-performance execution engine engineered for on-premises deployment on enterprise Linux servers. It integrates model multiplexing, sandboxed execution, neurosymbolic verification, and kernel-level network isolation into a unified architecture.

## 2. Technical Stack Specifications

| Component Layer | Production Tooling | 24GB Demo Profile | Purpose |
| :--- | :--- | :--- | :--- |
| **Inference Engine** | vLLM (PagedAttention / AWQ) | vLLM / llama.cpp | Sub-100ms model multiplexing & PagedAttention KV-cache |
| **Primary Reasoner** | Qwen-2.5-14B-Instruct (4-bit AWQ) | Qwen-2.5-14B-Instruct (~9.5GB VRAM) | Instruction follower, DAG execution, memo synthesis |
| **Vision Specialist** | Qwen2-VL-7B-Instruct (4-bit) | Qwen2-VL-7B (~5.5GB VRAM warm-swapped) | Multimodal layout parser, spatial & OCR extraction |
| **Code Specialist** | Qwen-2.5-Coder-14B (AWQ) | Shared with 14B Reasoner | Python script synthesis for ASME calculations |
| **Constraint Verifier** | Z3 Theorem Prover (Python API) | Z3 SMT Solver (Python) | Neurosymbolic constraint evaluation |
| **Execution Sandbox** | `nsjail` / `gVisor` (`runsc`) | `nsjail` (`--network none`) | Ephemeral process jail with cgroup limits |
| **Vector DB / Store** | LanceDB (Embedded) | LanceDB (Embedded) | In-process columnar vector retrieval & relational index |
| **Document Assembly** | `python-docx`, `openpyxl`, `reportlab` | `python-docx`, `openpyxl` | Headless native `.docx` / `.xlsx` binary generator |
| **Firewall Isolation** | Linux kernel `nftables` | `nftables` (`policy drop`) | Default outbound WAN packet dropping |
| **Audit Telemetry** | Tetragon (Cilium eBPF) | Tetragon / `tcpdump` probe | Kernel socket monitoring & zero-egress dashboard |

## 3. Subsystem Specifications

### 3.1 Compound Hardware-Aware Routing Engine
The dynamic scheduler scores candidate models $m$ for task $w$ at time $t$ using the mathematical objective function:

$$\text{Score}(m, w, t) = \text{Quality}(m, t) - (\lambda_1 \cdot \text{Latency}_{\text{est}}) - (\lambda_2 \cdot \text{VRAM}_{\text{pressure}}) + (\lambda_3 \cdot \text{PrefixAffinity}) - (\lambda_4 \cdot \text{QueueDepth})$$

- **Structural Fast-Path**: Direct routing based on MIME type & AST analysis without LLM classification overhead.
- **Prefix Affinity**: Reuses active KV-caches to maintain >85% hit rate.

### 3.2 Multimodal Relational Ingestion Engine (**Milestone 2 - COMPLETED**)
- **Vectorized Zhang-Suen & OpenCV Skeletonization (`skeletonizer.py`)**: Vectorized pure NumPy parallel thinning (`_zhang_suen_pure_numpy`) with OpenCV Guo-Hall/Zhang-Suen fallback. Preserves strict 1-pixel line connectivity under air-gapped environments lacking `cv2.ximgproc`.
- **Topological Invariant Detection**: Evaluates Rutovitz Crossing Number ($CN=1$ endpoints, $CN=2$ continuous lines/diagonal steps, $CN \ge 3$ junctions). Employs 8-connected component analysis to aggregate multi-pixel junction clusters into single integer centroids.
- **Polyline Path Tracing & Simplification**: Traces deterministic 1D branches between nodes and applies Ramer-Douglas-Peucker (RDP) polyline simplification (`cv2.approxPolyDP` and pure NumPy fallback `_rdp_pure_numpy`).
- **Tiled Sliding Window Patching (`patcher.py`)**: Slices arbitrary high-res schematics (4000x3000) into uniform tiles with overlap using stride-shifting (`edge_mode="shift"`), clipping, and padding. Provides exact bidirectional coordinate mappings for points and bounding boxes. Implements cross-patch IoU NMS deduplication, OCR text reconciliation, centroid clustering, polyline stitching, and alpha-feathered image reconstruction (`stitch_patches`).
- **ISA-5.1 Tag Extraction & Snapping (`graph_builder.py`)**: Regular expression extraction for equipment tags, valve designations, and ASME B31.3 piping line specs with OCR confusion repair. Employs spatial KD-Tree (`GeometricSnapper`) to snap line endpoints to symbol centroids within 35px and project orthogonal segments for T-junctions.
- **Dual NetworkX Assembly**: Compiles undirected physical connectivity (`nx.Graph`) and directed process flow topology (`nx.DiGraph`).
- **Synthetic Benchmark Generator (`synthetic_pid.py`)**: Procedurally generates 4000x3000 P&ID diagrams with verified ground-truth topological graphs.

### 3.3 Neurosymbolic Verification Engine
- Parses generated Python AST for forbidden imports (`socket`, `requests`, `os.system`).
- Translates ASME B31.3 internal pipe pressure thickness formulas into Z3 logic:
  $$t_{\text{min}} = \frac{P \cdot D}{2 \cdot (S \cdot E + P \cdot Y)} + CA$$
- Asserts: $P > 0$, $D > 0$, $S > 0$, $E \in [0.6, 1.0]$, $CA \ge 0$, $t_{\text{actual}} \ge t_{\text{min}}$.

### 3.4 State-Isolated Anti-Collapse Loop
- Separates memory into:
  - **Immutable Spec**: Original task definition, code constraints, Z3 assertions.
  - **Mutable State**: Current script attempt and stderr traceback.
  - **Historical Signatures**: SHA-256 hashes of past failed attempts.
- Clean-context re-prompting ensures small models do not hallucinate or drop constraints across multi-turn repairs (capped at 3 turns).

### 3.5 Headless Deliverable Assembly Engine
- Injects verified JSON outputs into pre-authored PSU Word (`.docx`) and Excel (`.xlsx`) templates.
- Guarantees exact typography, page layout, and legal signature lines without markdown conversion errors.

## 4. Hardware Allocation Profile (24GB VRAM Workstation)

```
+-------------------------------------------------------------------+
| 24.0 GB TOTAL GPU VRAM ALLOCATION BUDGET                          |
+-----------------------------------+-------------------------------+
| Qwen-2.5-14B (AWQ 4-bit)          | ~9.5 GB                       |
| Qwen2-VL-7B (4-bit Warm-Swapped)  | ~5.5 GB                       |
| Dynamic Paged KV Cache            | ~6.5 GB                       |
| CUDA Context & Buffer Headroom    | ~2.5 GB                       |
+-----------------------------------+-------------------------------+
```

## 5. Non-Functional & Security Requirements
- **Strict Air-Gap**: System must operate with zero external internet access (`nftables` outbound drop).
- **Execution Isolation**: Ephemeral `nsjail` execution (`--network none`, read-only rootfs, 512MB RAM, 10s CPU limit, max 10 processes).
- **Auditability**: All system actions logged with eBPF Tetragon kernel socket traces.
