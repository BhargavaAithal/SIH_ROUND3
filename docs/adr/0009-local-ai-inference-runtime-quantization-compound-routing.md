# ADR-0009: Local AI Inference Runtime, Quantization & Compound Routing Engine (SMITRACE ADR-002)

- **Status**: Accepted
- **Date**: 2026-09-20
- **Authors**: SMITRACE Architecture Team
- **Tags**: #inference #vllm #quantization #awq #xgrammar #compound_routing #vram

## Context & Problem Statement
In air-gapped refineries, petrochemical complexes, and defence infrastructure, external cloud AI APIs are strictly prohibited under national data sovereignty mandates. As established in [[ADR-0015]], *SMITRACE adapts to hardware, rather than hardware becoming part of SMITRACE's identity*. This ADR defines the engineering specifications for the baseline **24GB VRAM Workstation Profile** (e.g., NVIDIA RTX 4090 / RTX 6000 Ada / A10G).

When executing under a 24GB VRAM envelope, co-locating a **14B Reasoning Model** (e.g., Qwen-2.5-14B / DeepSeek-R1-Distill-14B) and a **7B Vision-Language Model** (e.g., Qwen2-VL-7B) requires strict memory isolation, elimination of dynamic PCIe bus model swapping, sub-100ms Time-To-First-Token (TTFT), and deterministic adherence to structured JSON schemas.


## Decision Drivers
- **Rigid VRAM Envelope**: The total static model footprint must fit comfortably within 24GB VRAM while reserving at least 8.5GB for dynamic PagedAttention KV-cache pools.
- **Zero PCIe Thrashing**: Dynamic swapping of multi-modal models across PCIe Gen4/5 buses causes 4–10s latency spikes and CUDA context invalidation, which violates real-time operational requirements.
- **Schema Admissibility**: Generated tool calls, engineering proposals, and deliverable metadata must strictly adhere to declarative JSON schemas without syntax errors.
- **Cache Reuse**: Multi-turn verification loops must maximize prefix and KV-cache reuse to minimize redundant compute.

## Considered Options
1. **Serving Runtimes**:
   - **vLLM (PagedAttention + Marlin kernels)**: Optimal throughput, native AWQ support, non-contiguous KV-cache allocation, and extensible guided decoding.
   - **SGLang (RadixAttention)**: Superior prefix cache sharing for multi-turn loops; slightly higher operational complexity for multi-model co-location.
   - **llama.cpp (GGUF)**: Broad CPU/GPU flexibility, but lower multi-concurrent throughput and limited KV-cache pooling.
2. **Quantization Schemes**:
   - **AWQ (4-bit)**: Preserves critical salient weight channels; delivers near-FP16 perplexity with a 3.2x memory reduction and high-speed Marlin GEMM kernels.
   - **GPTQ (4-bit)**: Comparable compression; slightly slower inference speeds on newer Ada Lovelace architectures.
   - **FP8 (E4M3)**: Native on Ada/Hopper, but consumes ~14GB for 14B models alone, exceeding the 24GB multi-model budget.
3. **Structured Output Enforcement**:
   - **XGrammar**: Compiles JSON schemas into Pushdown Automata (PDA) with adaptive token mask caching, reducing logit masking overhead to <0.04ms per token.
   - **Outlines**: Interleaved regex logit masking; introduces up to 1.8ms per-token latency and higher TTFT penalties.

## Decision Outcome
Chosen Option: **vLLM with AWQ 4-bit quantization**, integrated with **XGrammar pushdown automata** and a **Three-Tier Compound Router**.

### Implementation Architecture
1. **Serving Engine**: Deploy **vLLM** leveraging PagedAttention and Marlin tensor kernels as the core inference daemon, incorporating RadixAttention principles for multi-turn prefix reuse.
2. **Static Weight Quantization**: Standardize on **AWQ 4-bit** quantization:
   - 14B Reasoning LLM: ~8.52 GB
   - 7B Vision Model: ~4.41 GB
   - **Total Static Weights**: 12.93 GB, leaving ~9.2 GB VRAM dedicated to the PagedAttention dynamic KV-Cache pool.
3. **Structured Output Enforcement**: Integrate **XGrammar** into vLLM to enforce strict JSON schemas for work unit proposals and deliverable generation (reducing TTFT penalty to <12ms).
4. **Three-Tier Compound Routing**:
   - **Tier 1 (Structural Fast-Path)**: MIME/AST triage without model inference.
   - **Tier 2 (Multi-Objective Scoring)**:
     $$\text{Score}(m, w, t) = \text{Quality}(m, t) - (\lambda_1 \cdot \text{Latency}_\text{est}) - (\lambda_2 \cdot \text{VRAM}_\text{pressure}) + (\lambda_3 \cdot \text{PrefixAffinity}) - (\lambda_4 \cdot \text{QueueDepth})$$
   - **Tier 3 (Prefix/KV-Cache Affinity)**: Routes requests to models with matching prefix caches to maximize radix cache hits.

### Positive Consequences
- Both 14B reasoning and 7B vision models operate concurrently within a 24GB GPU without PCIe swapping.
- Sub-100ms TTFT achieved for structured engineering proposals.
- Exact schema compliance guaranteed for all emitted JSON artifacts.
- Zero reliance on external or cloud-hosted AI APIs.

### Negative Consequences / Tradeoffs
- AWQ quantization requires a one-time calibration pass using domain-specific industrial texts (ASME/API codes).
- GPU VRAM allocation is tightly budgeted; concurrent batch sizes must be throttled to prevent KV-cache OOM.

## Invariants & Compliance Rules
1. **Zero PCIe Swapping Invariant**: Dynamic unloading, swapping, or reloading of model weights over the PCIe bus during operational shifts is strictly prohibited.
2. **Structured Output Invariant**: All model-generated work unit proposals, calculation scripts, and document metadata must pass XGrammar pushdown automata validation prior to token emission.
3. **VRAM Ceiling Invariant**: Total static model weights must not exceed 13.5GB VRAM, preserving a minimum of 8.5GB exclusively for PagedAttention KV-cache pools.
