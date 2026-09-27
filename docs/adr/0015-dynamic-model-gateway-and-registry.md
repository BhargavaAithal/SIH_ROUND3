# ADR-0015: Dynamic Model Gateway, Declarative Registry & Hardware-Agnostic Profile Matrix

- **Status**: Accepted
- **Date**: 2026-09-21
- **Authors**: SMITRACE Architecture Team
- **Tags**: #model_gateway #registry #open_weight #multi_model #hardware_profiles #routing

## Context & Problem Statement
In production sovereign environments, locking the backend to a single model or hardcoding inference endpoints creates architectural fragility. The open-weight AI ecosystem is evolving rapidly with specialized models excelling in distinct domains (e.g. Qwen2.5-Coder for scripts, Llama-3.3 for high-level reasoning, Qwen2-VL for drawings/photos, PaddleOCR for dense tables). 

Furthermore, host environments vary widely across critical infrastructure sites: edge laptops with 1 GPU (or CPU-only), standard engineering workstations with 24GB–48GB VRAM, and server nodes with multi-GPU clusters. SMITRACE must dynamically adapt model selection, context budgets, and worker concurrency without requiring codebase changes or re-compilation.

## Decision Drivers
- **Zero Model Lock-in**: The system must support multiple local open-weight models simultaneously and allow hot-adding new models via declarative configuration.
- **Dynamic Capability-Based Routing**: Tasks must be automatically routed to the best-suited model based on required capabilities (`coding`, `reasoning`, `vision`, `summarization`, `ocr`).
- **Hardware Agnosticism**: The architecture must adapt dynamically to detected hardware constraints across Minimum, Standard, and High-End deployment tiers.
- **Air-Gap Sovereignty**: All inference endpoints must remain strictly local (loopback `127.0.0.1`), air-gapped, and authenticated.

## Decision Outcome
Adopt a **Decoupled Model Gateway and Declarative Model Registry** orchestrated in the Rust Control Plane:

### Implementation Architecture
1. **The Hardware Adaptability Principle**:
   *SMITRACE adapts to hardware, rather than hardware becoming part of SMITRACE's identity.* The architecture does not hardcode a single VRAM budget or GPU model. Instead, hardware resources represent runtime execution constraints that the `HardwareProfiler` and `ModelGateway` adapt to dynamically.
2. **Declarative Model Registry (`config/models.yaml`)**:
   Models are registered declaratively with metadata specifying `model_id`, `capabilities`, `context_length`, `quantization`, `hardware_vram_min_mb`, `endpoint`, `hardware_tiers`, and `priority`. New open-weight models can be added or substituted without modifying or recompiling Rust backend binaries.
3. **Dynamic Capability Router & Scheduler**:
   The Model Gateway evaluates the required capability of incoming work units and dispatches them to the highest-priority healthy backend satisfying the capability and context requirements.
4. **Hardware Profiler & Deployment Profile Matrix**:
   At daemon boot, the `HardwareProfiler` scans system resources (CPU, RAM, GPU count, VRAM) and automatically activates the matching profile:
   - **24 GB Profile**: 7B/14B quantized models (AWQ/GGUF), local sequential or time-shared inference, baseline context window.
   - **48 GB Profile**: Larger reasoning & VLM models (32B/70B Q4), higher context window (32K–64K tokens), higher worker concurrency.
   - **Multi-GPU Profile**: Model parallelism, concurrent model fleet (dedicated reasoning + vision + embedding workers running in parallel).
5. **Health, Latency & Failover Tracking**:
   The gateway continuously tracks endpoint availability, request latency, and VRAM pressure, failing over to fallback models defined in the registry.


### Positive Consequences
- Immediate extensibility: new open-weight models can be deployed on-premise simply by updating `config/models.yaml`.
- Specialized models handle the tasks they are best at (code models write code, reasoning models plan tasks, vision models inspect drawings).
- Portable across varied plant hardware without manual re-engineering.

### Negative Consequences / Tradeoffs
- Requires managing multiple local model server processes (e.g. vLLM or llama.cpp daemon instances).
- Quantization levels must be verified for mathematical reasoning stability during initial model onboarding.

## Invariants & Compliance Rules
1. **Declarative Registration Invariant**: Adding a model must never require modifying Rust control plane source code; registration occurs exclusively via `models.yaml`.
2. **Local Loopback Invariant**: All model endpoints must bind strictly to `127.0.0.1`. WAN-bound model API endpoints are rejected at the network policy boundary.
