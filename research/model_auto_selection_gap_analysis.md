# Model Auto-Selection Across Task Types — Gap Analysis & Architecture Review

> **Scope**: Evaluate whether SMITRACE's current architecture supports automatic model routing for (1) an agentic inspection-report-to-approval-note pipeline, (2) sandboxed code execution, and (3) multimodal scanned document understanding — plus whether it can *prove* sovereign execution through visible network audit, not just claim it.

> **Sources**: vLLM docs (v0.6+), RouteLLM (LMSYS, 2024), SGLang RadixAttention, Martian Model Router, Orca/Gorilla function-routing patterns, SMITRACE codebase analysis.

---

## 1. What "Model Auto-Selection" Actually Means

Model auto-selection (or "model routing") is the runtime decision: *given a task, which locally-loaded model should handle it?*

In SMITRACE's 24GB single-GPU context, the candidates are:

| Slot | Model | Role | VRAM Budget |
|:-----|:------|:-----|:------------|
| A | Qwen-2.5-14B (AWQ 4-bit) | Reasoning, code generation, memo drafting | ~9.5 GB |
| B | Qwen2-VL-7B (4-bit) | Vision: scanned docs, P&ID images, OCR | ~5.5 GB |
| C | (Merged Sakana 14B — future) | Combined reasoning + code in single checkpoint | ~9.5 GB |

The router's job: inspect the incoming task or step, decide A vs. B (vs. C), and dispatch — without an LLM call to make that decision (that would burn latency and VRAM).

---

## 2. Current Architecture: What Exists

### 2.1 What's Documented but NOT Implemented

Architecture.md §2.2 describes a **Compound Routing Engine** with three tiers:

```
1. Structural Fast-Path (MIME/AST)
2. Dynamic Score Optimization
3. Prefix/KV-Cache Affinity
```

And TRD.md §3.1 specifies a scoring function:

$$\text{Score}(m, w, t) = \text{Quality}(m, t) - (\lambda_1 \cdot \text{Latency}_\text{est}) - (\lambda_2 \cdot \text{VRAM}_\text{pressure}) + (\lambda_3 \cdot \text{PrefixAffinity}) - (\lambda_4 \cdot \text{QueueDepth})$$

**But no implementation of this router exists in the codebase.** There is:

- No `src/sovereign/router/` module
- No MIME-based dispatch logic
- No scoring function
- No VRAM pressure querying
- No KV-cache affinity tracking
- No vLLM multi-model coordination code

### 2.2 What IS Implemented

| Component | File | Status |
|:----------|:-----|:-------|
| LoRA domain classifier | `src/sovereign/rag/lora_router.py` | Keyword-match only, classifies queries into ASME/API/PSU domains. No model selection — only LoRA adapter selection for a *single* base model. |
| Agent state machine | `src/sovereign/agent/state_machine.py` | Hardcoded to single model path. Uses `_default_engineering_script` or a callback. No routing decision. |
| FastAPI server | `src/sovereign/api/server.py` | Endpoints are domain-specific (pid/calculate, sandbox/execute, verifier/evaluate). No unified task intake that would trigger model selection. |
| Beat 3 autonomous checklist | `ui/src/store/useWorkbenchStore.js` | Client-side staged simulation. Steps are predefined strings, not dispatched tasks. |

### 2.3 Verdict on Current State

**The Compound Routing Engine is architecture fiction.** It's specified in docs but has zero lines of code. The system currently operates as a single-model pipeline with deterministic task sequencing. This is fine for the demo Beat 3 flow, but it cannot support the evaluator's request to see the system *choose* different models for different task types.

---

## 3. The Three Task Types You Need to Route

### Task Type 1: Agentic End-to-End (Inspection Report → Approval Note)

**Flow**: Scanned PDF/JPG → OCR + layout extraction (VLM) → key findings extraction (Reasoner) → ASME/API verification (Z3) → draft approval note (Reasoner) → compile .docx (headless engine)

**Model routing decisions**:
- Step 1-2: VLM (Qwen2-VL-7B) — image input, spatial understanding
- Step 3-5: Reasoner (Qwen-2.5-14B) — text synthesis, code generation for Z3 parameters
- Step 6: No model — deterministic `docx_compiler.py`

**What's missing**: An orchestrator that takes the ingested files, identifies which steps need vision vs. text, and dispatches accordingly. Currently Beat 3 fakes this as a timed checklist.

### Task Type 2: Coding Task (Sandbox Execution + Verification)

**Flow**: Task spec → code generation (Coder/Reasoner) → AST guard → sandbox execution → Z3 verification → self-correction loop

**Model routing decision**: Use the Coder/Reasoner model (14B). No VLM needed.

**What exists**: `state_machine.py` does this, but with `_default_engineering_script` as a hardcoded fallback. There's no actual LLM call — the code is template-generated.

**What's missing**: Actual vLLM inference call to generate the script from the task spec prompt.

### Task Type 3: Multimodal Document Understanding

**Flow**: Scanned image/PDF → VLM patch extraction → structured data output (tables, tags, measurements)

**Model routing decision**: VLM required. Reasoner cannot process image inputs.

**What exists**: `patcher.py` and `skeletonizer.py` do classical CV processing. No VLM inference is wired up.

**What's missing**: VLM serving endpoint, image preprocessing for VLM input format, output parsing.

---

## 4. What a Real Router Needs (Minimum Viable)

Based on RouteLLM (LMSYS 2024), Martian, and the existing SMITRACE architecture docs, here is the minimal router that would satisfy the evaluator for these task types:

### 4.1 Tier 1: Structural Fast-Path (Zero-LLM Classification)

This is the only tier you need for the demo. It doesn't require training data or ML classifiers.

```
Input Task/Step
    │
    ├── Has image/PDF attachment? ──→ VLM (7B Vision)
    │       (MIME: image/*, application/pdf with raster content)
    │
    ├── Task requires code generation? ──→ Reasoner/Coder (14B)
    │       (Keywords: "calculate", "generate script", "compute")
    │       (Or: AST analysis of prior turn output)
    │
    ├── Task requires text synthesis? ──→ Reasoner (14B)
    │       (Keywords: "draft", "summarize", "approval note")
    │
    └── Deterministic tool call? ──→ No model (direct function)
            (Z3 verify, docx compile, sandbox execute)
```

**Implementation**: ~100 lines of Python. A `classify_task(step: TaskStep) -> ModelSlot` function examining MIME types and keyword patterns.

### 4.2 Tier 2: Dynamic Score Optimization (Future)

The scoring function from TRD §3.1. Only needed when you have multiple models that *could* handle the same task (e.g., 14B Reasoner vs. 14B Coder for code tasks). Not needed for 2-model (VLM + Reasoner) demo.

### 4.3 Tier 3: KV-Cache Affinity (Future)

Reuse warm caches for sequential tasks from the same session. Requires vLLM prefix cache metrics. Not needed for demo.

---

## 5. Critical Missing Components (Ordered by Priority)

### Priority 1: vLLM Inference Backend (Blocks Everything)

**Without a running vLLM instance serving the models, there is no model to route to.** This is the fundamental blocker.

**What's needed**:
- vLLM server process serving Qwen-2.5-14B-AWQ on a local socket
- Python client wrapper: `async def generate(prompt, model_id, max_tokens) -> str`
- Health check endpoint confirming model is loaded

**Files to create**:
- `src/sovereign/inference/vllm_client.py` — async client wrapping vLLM's OpenAI-compatible API
- `src/sovereign/inference/model_registry.py` — tracks which models are loaded, their VRAM usage, warmth state

### Priority 2: Task Router / Dispatcher

**What's needed**:
- `src/sovereign/router/task_classifier.py` — MIME + keyword structural fast-path
- `src/sovereign/router/dispatcher.py` — maps classified task type → model slot → vLLM endpoint

**Decision table**:

| Signal | Detection Method | Model Slot |
|:-------|:-----------------|:-----------|
| Input contains `image/*` MIME | `mimetypes.guess_type()` | VLM-7B |
| Input contains `.pdf` with raster pages | PDF page render check | VLM-7B |
| Task description matches code patterns | Regex/keyword | Reasoner-14B |
| Task description matches memo/draft patterns | Regex/keyword | Reasoner-14B |
| Step is Z3/sandbox/docx deterministic | Hardcoded step type | No model |

### Priority 3: DAG Orchestrator (Wiring the Beats to Real Inference)

**What's needed**: Replace Beat 3's client-side timed checklist with a server-side DAG executor that:

1. Receives the ingested files from Beat 2
2. Builds a task DAG:
   ```
   [OCR/VLM scan] → [Extract findings] → [Z3 verify] → [Draft memo] → [Compile .docx]
   ```
3. For each step, calls the router → dispatches to the correct model → collects output → feeds to next step
4. Streams progress via SSE to the UI

**Current state**: `state_machine.py` handles the code-generation loop (Type 2) but not the multi-step agentic pipeline (Type 1).

**Files to create**:
- `src/sovereign/orchestrator/dag_executor.py` — step-by-step DAG runner
- `src/sovereign/orchestrator/task_graph.py` — defines the inspection pipeline DAG

### Priority 4: Network Audit Proof (Proving Sovereignty)

**This is the evaluator's actual test.** They want to see *visible proof* that no external calls happen during model inference. A green badge saying "0 BYTES WAN" is a claim. The proof is showing the live network monitor during execution.

**What exists**:
- `audit_network_egress()` in `src/sovereign/sandbox/auditor.py` — checks socket state
- UI sovereignty badge — static "0 BYTES WAN" display
- eBPF modal — lists hardcoded socket entries

**What's missing for a convincing proof**:

1. **Live packet counter during execution**: Not just a static number, but a counter that the evaluator can watch *tick* (or not tick) while the model is generating tokens. The `audit_network_egress()` function should be polled every 500ms during inference and the count streamed to the UI.

2. **Visible network monitor panel**: A real-time log showing:
   ```
   [19:28:43.001] Socket audit: 0 WAN connections, 2 loopback connections
   [19:28:43.501] Socket audit: 0 WAN connections, 2 loopback connections
   [19:28:44.001] Inference token generated. Socket audit: 0 WAN connections
   ```
   This should be a live stream in the UI, not a static table.

3. **Process-level socket trace**: Show which PIDs have open sockets and where they connect. This is what `openSockets` in the store does, but it's hardcoded sample data:
   ```javascript
   // Current: hardcoded in useWorkbenchStore.js
   openSockets: [
     { pid: 1028, laddr: '127.0.0.1:8000', ... },  // fake
   ]
   ```
   Needs to come from a real API call polling `psutil.net_connections()` or equivalent.

4. **nftables rule display**: Show the actual firewall rules, not just claim they exist. A read-only display of `nft list ruleset` output (or the audit script results).

---

## 6. Architecture Direction Assessment

### What's Right

1. **The 3-tier router concept** (Structural Fast-Path → Dynamic Score → KV Affinity) is a sound architecture. It matches RouteLLM's cascading approach.

2. **vLLM as the serving layer** is correct. vLLM supports multi-model serving, PagedAttention, and AWQ quantization — all things you need.

3. **The DAG / state machine pattern** in `state_machine.py` is the right foundation. It just needs to be generalized from "code gen → sandbox → Z3" to arbitrary multi-step pipelines.

4. **The separation of deterministic tools** (Z3, docx compiler, sandbox) from model inference is correct. These don't need routing — they're direct function calls.

5. **The Beat 1-4 UX flow** is excellent for demonstrating the end-to-end story.

### What's Wrong / Missing

1. **No inference backend wired up.** The entire system generates hardcoded/template outputs. No actual LLM call is made anywhere. This is the #1 gap.

2. **No router implementation.** The Compound Routing Engine exists only in documentation.

3. **No DAG executor for multi-step agentic pipelines.** `state_machine.py` only handles code-gen loops, not arbitrary task chains.

4. **Sovereignty proof is cosmetic.** The badge, the counter, the eBPF modal — all use hardcoded data. The `audit_network_egress()` function exists and works, but it's not called during the demo flow and its results aren't streamed to the UI.

5. **VLM is not served.** There's no code to start, manage, or call a vision model. The entire vision pipeline is classical CV (`skeletonizer.py`, `patcher.py`).

6. **No model lifecycle management.** No code to check if models are loaded, measure VRAM usage, warm-swap between VLM and Reasoner, or handle OOM.

---

## 7. Minimum Changes for a Credible Demo of Task Types 1 & 2

> You said "for now we have to do just 2". I interpret this as: demonstrate agentic (Type 1) and coding (Type 2) task types with real model routing visible in the system.

### Phase A: Inference Client (Prerequisite)

Create `src/sovereign/inference/vllm_client.py`:
- Wraps vLLM's OpenAI-compatible `/v1/completions` or `/v1/chat/completions` endpoint running on `127.0.0.1:8001`
- Async `generate(prompt, model_id, max_tokens, temperature)` method
- Returns streaming tokens for SSE forwarding
- Health check: `GET /health` on the vLLM port

### Phase B: Structural Fast-Path Router

Create `src/sovereign/router/classifier.py`:
- `classify_step(step: dict) -> Literal["vlm-7b", "reasoner-14b", "deterministic"]`
- Logic: MIME check → keyword check → default to reasoner
- **Logs the routing decision** — this is what makes auto-selection visible

### Phase C: DAG Executor

Extend `state_machine.py` or create `src/sovereign/orchestrator/pipeline.py`:
- Define a `Pipeline` as a list of `Step` objects, each with a `step_type` and `model_hint`
- For each step: call router → dispatch to inference client → collect result → feed to next step
- Stream each step's status via SSE (`/api/v1/events`)

### Phase D: Live Network Audit Stream

Modify the SSE event stream to include periodic network audit snapshots:
- Every 500ms during pipeline execution, run `audit_network_egress()` and emit the result as an SSE event
- UI renders this as a live scrolling log panel alongside the execution checklist

---

## 8. Architecture Diagram — What Should Exist

```
                    INGESTED FILES (Beat 1-2)
                           │
                           ▼
                 ┌─────────────────────┐
                 │   DAG Orchestrator   │
                 │  (pipeline.py)       │
                 └──────────┬──────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
    ┌──────────────────┐        ┌──────────────────┐
    │  Task Router     │        │  Deterministic    │
    │  (classifier.py) │        │  Tools (Z3, docx) │
    │  MIME + Keyword   │        └──────────────────┘
    └────────┬─────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌─────────┐    ┌─────────────┐
│ VLM-7B  │    │ Reasoner-14B│    ◄── vLLM serving both on 127.0.0.1:8001
│ (vision)│    │ (text/code) │
└─────────┘    └─────────────┘
             │
             ▼
    ┌──────────────────┐
    │  Live Network    │
    │  Audit Stream    │    ◄── Polled during inference, proving 0 WAN bytes
    │  (auditor.py)    │
    └──────────────────┘
```

---

## 9. Summary: Is the Architecture in the Right Direction?

**Yes, directionally correct. But the gap between documentation and implementation is large.**

| Aspect | Status | Gap |
|:-------|:-------|:----|
| Router concept (3-tier) | Sound design | Zero code |
| vLLM serving layer | Correct choice | Not integrated |
| State machine / DAG | Foundation exists | Single-task only, needs generalization |
| Deterministic tools (Z3, docx, sandbox) | Fully implemented | — |
| VLM integration | Classical CV exists | No VLM inference |
| Sovereignty proof | Backend audit exists | Not streamed live to UI during execution |
| UI pipeline flow | Beat 1-4 is excellent | Beat 3 is simulated, not wired to real execution |
| Network monitor visibility | Badge exists | Static data, no live proof during inference |

**The single most impactful change is wiring vLLM inference into the pipeline and streaming the network audit alongside it.** That turns the system from "a demo that claims sovereignty" into "a system that proves sovereignty by showing zero external calls while actually running a local model".

---

## References

- **RouteLLM** (Ong et al., LMSYS 2024): Cascading router framework for directing queries to weaker/stronger models based on task difficulty. Uses MIME + embedding classifiers. [github.com/lm-sys/RouteLLM](https://github.com/lm-sys/RouteLLM)
- **vLLM Multi-Model Serving**: vLLM v0.6+ supports serving multiple models on a single GPU via `--served-model-name` and LoRA adapter hot-loading. [docs.vllm.ai](https://docs.vllm.ai)
- **SGLang RadixAttention**: Prefix tree KV-cache sharing for multi-turn inference, achieving >85% cache hit rates. [github.com/sgl-project/sglang](https://github.com/sgl-project/sglang)
- **Martian Model Router**: Commercial router using MIME + lightweight classifier to dispatch between local models. [withmartian.com](https://withmartian.com)
- **SMITRACE Architecture.md** §2.2, **TRD.md** §3.1: Existing design specs for the Compound Routing Engine.
