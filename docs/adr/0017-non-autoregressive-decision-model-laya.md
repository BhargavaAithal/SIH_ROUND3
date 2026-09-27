# ADR-0017: Non-Autoregressive Decision Model (Laya) for Low-Latency Capability Routing & Work Unit Dispatch

- **Status**: Accepted
- **Date**: 2026-09-24
- **Authors**: SMITRACE Architecture Team
- **Tags**: #decision_model #laya #routing #onnx #system_1 #non_autoregressive #latency #model_gateway #canonical_schema

## Context & Problem Statement
In SMITRACE's Compound Inference and Agentic DAG architecture (ADR-0009, ADR-0015, ADR-0016), every incoming natural language request and dynamic work unit must be routed to the appropriate specialist model (coding, reasoning, vision, or OCR) or local execution tool.

Previously, capability routing either relied on heuristic keyword parsing (inflexible, brittle to semantic nuance) or required invoking heavy autoregressive LLMs (e.g. Llama 3.3 70B or Qwen 2.5 14B), which introduced a 500ms–2000ms token-generation latency penalty just to decide *which* specialist engine to trigger. Furthermore, autoregressive models are prone to syntax hallucination and parsing failures when generating structured JSON routing schemas.

## Decision Drivers
- **Deterministic Low Latency**: Task routing and capability classification must complete in <20ms to preserve real-time UI interactivity.
- **Structured Output Guarantees**: System 1 decisions must emit typed output primitives (choice, score, boolean) in a single forward pass without token-by-token autoregressive decoding or schema parsing errors.
- **Contract-First Transport Agnosticism**: In-process ONNX execution and local/remote HTTP endpoints must implement an identical decision contract.
- **Two-Tier Compound Routing & Deterministic Policy**: Fast-path queries must resolve instantly through a canonical decision schema, capability registry, and deterministic policy gate before committing execution leases.
- **Resource Footprint & Air-Gap Compliance**: The decision engine must run fully local (`127.0.0.1`), consume <1.2GB VRAM, and operate in-process via ONNX Runtime without external network dependencies.

## Decision Outcome
Adopt **Laya**, an open-source non-autoregressive decision model family (built upon ModernBERT and mmBERT backbones), as the primary **System 1 Decision & Routing Engine** in the SMITRACE Model Gateway, orchestrated through a **Canonical Decision Schema and Deterministic Policy Pipeline**.

### Implementation Architecture

#### 1. Contract-First Decision Pipeline
```
   In-process Laya (ONNX FFI) ──────┐
                                    ├──> [ Identical Decision Contract ]
   Remote/local Laya (HTTP REST) ───┘                 │
                                                      ▼
                                                Laya Decision
                                                      │
                                                      ▼
                                          Canonical Decision Schema
                                                      │
                                                      ▼
                                             Capability Registry
                                                      │
                                                      ▼
                                             Deterministic Policy
```

1. **Laya Decision**: System 1 non-autoregressive forward pass evaluating the input state in <15ms.
2. **Identical Decision Contract**: In-process ONNX (`endpoint: in_process_onnx`) and Local/Remote HTTP (`endpoint: http://127.0.0.1:8005/v1`) implementations share the identical FFI/JSON serialization contract, ensuring zero vendor or transport lock-in.
3. **Canonical Decision Schema (`CanonicalDecision`)**: Normalizes output primitives into typed, immutable Rust data structures (`Choice` distributions, ordinal `Score`, or `Boolean` probability).
4. **Capability Registry**: Matches the canonical intent to healthy models, OCR engines, or local sandboxed tools registered in `models.yaml`.
5. **Deterministic Policy Gate**: Enforces non-negotiable enterprise constraints (confidence threshold $P \ge 0.75$, statutory role-based permissions, air-gap boundaries, and hardware quotas) prior to granting execution leases.

#### 2. Model Registration (`config/models.yaml`)
- `laya-modernbert-onnx`: Primary English-optimized non-autoregressive decision model (8192 context window, ONNX_FP16 quantization, 800MB VRAM footprint, in-process ONNX runtime, priority 110).
- `laya-mmbert-onnx`: Multilingual companion model supporting 100+ languages for cross-border and multinational industrial plant documentation (8192 context, ONNX_FP16, 1100MB VRAM, priority 105).
- `laya-modernbert-http`: Local HTTP microservice variant (8192 context, ONNX_FP16, 800MB VRAM, priority 95, endpoint `http://127.0.0.1:8005/v1`) adhering to the identical decision contract.

#### 3. Two-Tier Hierarchical Routing Flow
- **Tier 1 (System 1 Fast Path — Laya)**:
  The incoming prompt/work unit is fed directly into Laya. Laya outputs a typed choice probability vector across candidate capabilities (`coding`, `reasoning`, `vision`, `ocr`, `tool_use`).
  $$\text{Decision} = \arg\max_{c \in C} P(c \mid \text{Input})$$
  If confidence $P(\text{Decision}) \ge 0.75$ and deterministic policy verifies tool authorization, dispatch occurs immediately (<15ms).
- **Tier 2 (System 2 Slow Path — Escalation to Llama 3.3 / Qwen 2.5)**:
  If confidence $P(\text{Decision}) < 0.75$, or if the input requires complex multi-step DAG decomposition and SMT constraint solving, the request escalates to the reasoning specialists (`llama-3.3-70b-instruct-q4` or `qwen-2.5-14b-instruct-awq`).

### Positive Consequences
- **Sub-15ms Dispatch**: Capability routing latency drops by 90–95% compared to autoregressive LLM routing.
- **Zero Hallucination on Decision Primitives**: Non-autoregressive forward passes natively output calibrated classification probabilities and discrete choices, eliminating JSON formatting failures.
- **Transport Independence**: Switching between in-process ONNX (low VRAM/CPU) and local HTTP daemon requires zero downstream changes to the capability registry or policy gate.
- **Deterministic Governance**: Policy enforcement occurs strictly downstream of the canonical schema, guaranteeing that unverified model outputs cannot bypass safety checks.
- **Multilingual Resilience**: `laya-mmbert-onnx` ensures robust zero-shot intent routing across technical manuals in German, Japanese, Chinese, and French.

### Negative Consequences / Tradeoffs
- Requires bundling and maintaining ONNX model weights (`.onnx`) alongside PaddleOCR assets in the model cache.
- Laya is specialized strictly for discrete decisions and routing; it cannot generate free-form text or explain its chain-of-thought directly (explanation is delegated to Tier 2 when requested).

## Invariants & Compliance Rules
1. **Decision Invariant**: Laya must never be used for open-ended generative text generation; its role is strictly bounded to structured classification, routing, and scoring primitives.
2. **Contract Invariance Rule**: In-process and HTTP Laya backends must emit identical `CanonicalDecision` schemas. Transport details must never leak into downstream capability routing or policy evaluation.
3. **Deterministic Policy Gate Invariant**: Any routing decision with confidence $P < 0.75$ or failing statutory role permissions must automatically escalate to the System 2 reasoning model or surface an ambiguity confirmation prompt to the user.
4. **Local Loopback Invariant**: All Laya endpoints must bind strictly to in-process memory or local loopback (`127.0.0.1`); remote WAN-hosted inference is forbidden.
