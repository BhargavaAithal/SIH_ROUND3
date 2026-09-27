# Technical Requirements Document (TRD) — SMITRACE

## Project: Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)

---

### 1. Architectural Interfaces & Four-Plane Isolation Contracts

SMITRACE enforces strict process and memory boundaries across four architectural planes. Communication across planes is governed by typed schemas, capability tokens, and explicit time-bounded execution leases.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        1. INTELLIGENCE PLANE (Probabilistic)                           │
│   - Runtime: Rust Model Gateway + local inference (vLLM / llama.cpp / OCR-VLM runtimes)│
│   - Model Registry: Declarative models.yaml with capability-based dynamic routing      │
│   - Privilege: Zero direct OS access; no network; no file write outside staging/       │
│   - Output: Versioned Work Unit DAG proposals, semantic inferences, and tool requests  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Proposes Versioned WorkUnit DAG
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               4. STATE & PROVENANCE PLANE (Deterministic Control Plane)                │
│   - Runtime: Rust 1.80+ (Axum + Tokio) + rusqlite WAL + Serialized Writer Actor        │
│   - User Intervention Gate: Intercepts, prunes, edits, or reorders DAG nodes           │
│   - Concurrency: Atomic CAS leases; single-writer (BEGIN IMMEDIATE); concurrent readers│
│   - Invariants: Dual-graph scheduling; Merkle event chaining; Tri-Index provenance     │
└────────────────────────┬────────────────────────────────────────────────┬──────────────┘
                         │ Grants Lease                                   │ Passes Artifacts
                         ▼                                                ▼
┌─────────────────────────────────────────────────┐ ┌────────────────────────────────────┐
│      2. EXECUTION PLANE (Deterministic)         │ │   3. ASSURANCE PLANE (Verifiers)   │
│ - Execution Broker: Auth, quotas, capabilities  │ │ - Z3 SMT Prover (Rust z3 crate)    │
│ - Workers: Code Worker (nsjail/Job Objects),    │ │ - Subprocess Pool: 5.0s hard kill  │
│   Calculation Worker, Artifact Worker (Office)  │ │ - False Assurance Rate: EXACT 0.0% │
│ - Deliverables: Native .docx, .pptx, .xlsx      │ │ - AST Security Visitor Gate        │
└─────────────────────────────────────────────────┘ └────────────────────────────────────┘
```

---

### 2. Model Gateway & Declarative Registry Specifications

#### 2.1 Declarative Model Registry Schema (`config/models.yaml`)
```yaml
version: "1.0"
models:
  - model_id: "laya-modernbert-onnx"
    display_name: "Laya Decision Model (ModernBERT ONNX)"
    capabilities: ["decision", "routing", "classification", "intent_detection"]
    context_length: 8192
    quantization: "ONNX_FP16"
    hardware_vram_min_mb: 800
    endpoint: "in_process_onnx"
    priority: 110
    engine: "onnx_runtime"

  - model_id: "laya-mmbert-onnx"
    display_name: "Laya Multilingual Decision Model (mmBERT ONNX)"
    capabilities: ["decision", "routing", "classification", "multilingual_routing"]
    context_length: 8192
    quantization: "ONNX_FP16"
    hardware_vram_min_mb: 1100
    endpoint: "in_process_onnx"
    priority: 105
    engine: "onnx_runtime"

  - model_id: "laya-modernbert-http"
    display_name: "Laya Decision Model (Local HTTP Microservice)"
    capabilities: ["decision", "routing", "classification", "intent_detection"]
    context_length: 8192
    quantization: "ONNX_FP16"
    hardware_vram_min_mb: 800
    endpoint: "http://127.0.0.1:8005/v1"
    priority: 95
    engine: "http_rest"

  - model_id: "qwen-2.5-coder-32b-awq"
    display_name: "Qwen 2.5 Coder 32B (AWQ)"
    capabilities: ["coding", "numerical_script", "tool_use"]
    context_length: 32768
    quantization: "AWQ_4BIT"
    hardware_vram_min_mb: 18432
    endpoint: "http://127.0.0.1:8001/v1"
    priority: 100
    engine: "vllm"

  - model_id: "llama-3.3-70b-instruct-q4"
    display_name: "Llama 3.3 70B Instruct (Q4_K_M)"
    capabilities: ["reasoning", "task_planning", "summarization"]
    context_length: 65536
    quantization: "GGUF_Q4_K_M"
    hardware_vram_min_mb: 40960
    endpoint: "http://127.0.0.1:8002/v1"
    priority: 90
    engine: "llama_cpp"

  - model_id: "qwen2-vl-7b-instruct"
    display_name: "Qwen2-VL 7B Vision"
    capabilities: ["vision", "multimodal_reasoning", "drawing_inspection"]
    context_length: 16384
    quantization: "AWQ_4BIT"
    hardware_vram_min_mb: 6144
    endpoint: "http://127.0.0.1:8003/v1"
    priority: 85
    engine: "vllm"

  - model_id: "paddleocr-v4-onnx"
    display_name: "PaddleOCR v4 Layout & Table Engine"
    capabilities: ["ocr", "table_extraction"]
    context_length: 0
    quantization: "ONNX_FP16"
    hardware_vram_min_mb: 1200
    endpoint: "in_process_onnx"
    priority: 100
    engine: "onnx_runtime"
```

#### 2.2 Model Gateway Traits & Rust Contracts
```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Capability {
    Decision,
    Routing,
    Classification,
    IntentDetection,
    MultilingualRouting,
    Coding,
    Reasoning,
    TaskPlanning,
    Summarization,
    Vision,
    DrawingInspection,
    Ocr,
    TableExtraction,
}

/// Output primitives supported by Laya decision models
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DecisionPrimitive {
    Choice {
        selected: String,
        distribution: HashMap<String, f32>,
    },
    Score {
        value: f32,
        scale_min: f32,
        scale_max: f32,
    },
    Boolean {
        value: bool,
        probability: f32,
    },
}

/// Canonical Decision Schema: Normalized, transport-agnostic decision contract
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CanonicalDecision {
    pub decision_id: String,
    pub input_hash: String,
    pub primary_capability: Capability,
    pub secondary_capabilities: Vec<Capability>,
    pub confidence: f32,
    pub primitive: DecisionPrimitive,
    pub suggested_tools: Vec<String>,
    pub latency_ms: f32,
}

/// Identical Decision Contract implemented by In-Process ONNX and Remote/Local HTTP backends
#[async_trait]
pub trait DecisionBackend: Send + Sync {
    async fn evaluate_decision(&self, input: &str) -> Result<CanonicalDecision, GatewayError>;
}

/// Capability Registry: Maps capabilities to healthy, available model descriptors
pub struct CapabilityRegistry {
    pub models_by_capability: HashMap<Capability, Vec<ModelDescriptor>>,
}

impl CapabilityRegistry {
    pub fn resolve_candidates(&self, capability: &Capability) -> Vec<&ModelDescriptor> {
        self.models_by_capability
            .get(capability)
            .map(|list| list.iter().filter(|m| m.healthy).collect())
            .unwrap_or_default()
    }
}

/// Deterministic Policy Gate: Enforces safety, confidence thresholds, and hardware constraints
pub struct DeterministicPolicyGate {
    pub min_confidence_threshold: f32, // Default: 0.75
    pub allowed_tools: HashSet<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum PolicyVerdict {
    Proceed(ModelDescriptor),
    EscalateToSystem2Reasoning { reason: String },
    RejectPolicyViolation { reason: String },
}

impl DeterministicPolicyGate {
    pub fn evaluate(
        &self,
        decision: &CanonicalDecision,
        candidates: &[&ModelDescriptor],
    ) -> PolicyVerdict {
        if decision.confidence < self.min_confidence_threshold {
            return PolicyVerdict::EscalateToSystem2Reasoning {
                reason: format!(
                    "Confidence {:.2} below threshold {:.2}",
                    decision.confidence, self.min_confidence_threshold
                ),
            };
        }
        if let Some(best) = candidates.first() {
            PolicyVerdict::Proceed((*best).clone())
        } else {
            PolicyVerdict::EscalateToSystem2Reasoning {
                reason: "No healthy specialist model found for capability".to_string(),
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelDescriptor {
    pub model_id: String,
    pub display_name: String,
    pub capabilities: HashSet<Capability>,
    pub context_length: usize,
    pub hardware_vram_min_mb: usize,
    pub endpoint: String,
    pub priority: u32,
    pub healthy: bool,
}

#[async_trait]
pub trait ModelGateway: Send + Sync {
    /// Decision Pipeline: Laya Decision -> Canonical Decision Schema -> Capability Registry -> Deterministic Policy
    async fn route_instruction(&self, prompt: &str) -> Result<PolicyVerdict, GatewayError>;

    /// Generation pass dispatched to chosen specialist model
    async fn route_prompt(
        &self,
        required_capability: Capability,
        prompt: &str,
        context_budget: usize,
    ) -> Result<String, GatewayError>;

    async fn register_model(&self, descriptor: ModelDescriptor) -> Result<(), GatewayError>;
    async fn check_health(&self) -> HashMap<String, bool>;
}
```

---

### 3. Dynamic Plan Engine & User Intervention Protocol

#### 3.1 Versioned Work Unit DAG Schema
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "VersionedExecutionDAG",
  "type": "object",
  "required": ["dag_id", "mission_id", "version", "work_units"],
  "properties": {
    "dag_id": { "type": "string" },
    "mission_id": { "type": "string" },
    "version": { "type": "integer", "minimum": 1 },
    "work_units": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "capability_required", "dependencies", "status"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" },
          "capability_required": { "type": "string" },
          "tool_bindings": { "type": "array", "items": { "type": "string" } },
          "dependencies": { "type": "array", "items": { "type": "string" } },
          "is_pruned": { "type": "boolean", "default": false },
          "status": { 
            "type": "string", 
            "enum": ["PENDING", "READY", "EXECUTING", "COMPLETED", "FAILED", "PRUNED"] 
          },
          "estimated_cost": { "type": "number" },
          "confidence_score": { "type": "number" }
        }
      }
    }
  }
}
```

#### 3.2 User Intervention API Contracts
* `POST /api/v1/plan/prune`: Allows user to mark non-essential intermediate nodes as `PRUNED`.
* `POST /api/v1/plan/reorder`: Adjusts node dependencies and execution order prior to launch.
* `POST /api/v1/plan/approve`: Authorizes execution of the versioned DAG.
* `POST /api/v1/plan/replan`: Triggered when tool execution introduces new evidence; computes diff DAG and applies Sibling Protection.

---

### 4. Modality-Aware Multimodal Ingestion & MIR Schema

#### 4.1 Multimodal Intermediate Representation (MIR)
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MultimodalIntermediateRepresentation",
  "type": "object",
  "required": ["document_id", "sha256_hash", "pages"],
  "properties": {
    "document_id": { "type": "string" },
    "sha256_hash": { "type": "string" },
    "pages": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["page_number", "width_px", "height_px", "modality", "elements"],
        "properties": {
          "page_number": { "type": "integer" },
          "width_px": { "type": "integer" },
          "height_px": { "type": "integer" },
          "modality": { 
            "type": "string", 
            "enum": ["SCANNED_PDF", "HANDWRITTEN_LOG", "PID_DRAWING", "FIELD_PHOTO", "MIXED"] 
          },
          "elements": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["element_id", "type", "bounding_box", "confidence"],
              "properties": {
                "element_id": { "type": "string" },
                "type": { "type": "string", "enum": ["TEXT_BLOCK", "TABLE", "HANDWRITING", "SYMBOL", "LINE_VECTOR", "PHOTO_REGION"] },
                "bounding_box": {
                  "type": "object",
                  "required": ["x1", "y1", "x2", "y2"],
                  "properties": {
                    "x1": { "type": "number" },
                    "y1": { "type": "number" },
                    "x2": { "type": "number" },
                    "y2": { "type": "number" }
                  }
                },
                "text_content": { "type": "string" },
                "confidence": { "type": "number" },
                "spatial_relations": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "target_element_id": { "type": "string" },
                      "relation_type": { "type": "string" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

### 5. Versioned Provenance Knowledge Fabric & Tri-Index

#### 5.1 Tri-Index Storage Architecture
1. **Lexical Index (`smitrace_lexical_index`)**: Powered by in-process Rust `tantivy`. Indexes technical tags, standard clause numbers, and equipment IDs with BM25 scoring.
2. **Dense Vector Index (`smitrace_vector_index`)**: Embedded HNSW vector store indexing 1024-dimensional embeddings (e.g. `bge-large-en-v1.5`) for semantic retrieval.
3. **Metadata Index (`smitrace_meta_index`)**: SQLite table with indices on `source_path`, `department`, `revision_id`, `created_date`, and `access_level`.

#### 5.2 Provenance Node Contract
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvenanceNode {
    pub chunk_id: String,
    pub source_path: String,
    pub document_title: String,
    pub revision: String,
    pub page_number: u32,
    pub section_header: String,
    pub chunk_sha256: String,
    pub text_payload: String,
    pub similarity_score: f32,
    pub lexical_score: f32,
    pub reranked_score: f32,
}
```

---

### 6. Brokered Sandboxed Execution & Typed Artifact Compilers

#### 6.1 Execution Broker Architecture
All untrusted executions pass through `ExecutionBroker`:
```
Agent Proposal ➔ Policy Gate (Auth, Quotas) ➔ Job Scheduler ➔ Worker Sandbox ➔ Artifact Validator ➔ Case Vault
```
* **Code Worker Sandbox**: Linux `nsjail` (`--network none`, 512MB RAM, 10s CPU limit, read-only root) or Windows Job Objects / AppContainer.
* **Calculation Worker**: Deterministic Rust runtime executing Z3 SMT formulations with step-by-step arithmetic formatting.
* **Artifact Worker**: Native OpenXML compilers:
  - `docx_compiler.rs` (`docx-rs`): Formal corporate memos, headers, tables, digital sign-off.
  - `pptx_compiler.rs`: Native XML presentation generator with executive slide templates.
  - `xlsx_compiler.rs` (`rust_xlsxwriter`): Multi-tab workbooks with active formulas and 16-decimal-place precision.

---

### 7. Neurosymbolic Z3 SMT Formal Mathematical Formulations

#### 7.1 ASME B31.3 §304.1.2 Minimum Required Pipe Thickness & MAWP
$$\Phi_{\text{MAWP}} = \left( P \le \frac{2 \cdot S(T) \cdot E \cdot (t_0 - c_r \cdot t_{\text{service}} - c)}{D - 2 \cdot Y \cdot (t_0 - c_r \cdot t_{\text{service}} - c)} \right) \land (S(T) = f_{\text{derate}}(T)) \land (t_{\text{act}} - c_r \cdot t_{\text{service}} \ge t_{\text{min}})$$

* Evaluated using exact rational numbers (`z3::ast::Real`).
* False Assurance Rate: $\text{FAR} \equiv 0.0\%$. Solver timeouts ($\ge 5.0\text{s}$) strictly emit `FAIL`.

#### 7.2 API 510 Pressure Vessel Remaining Life
$$t_{\text{min}} = \frac{P \cdot R}{S \cdot E - 0.6 \cdot P}, \quad L = \frac{t_{\text{act}} - t_{\text{min}}}{c_r}$$
* If $c_r \le 0.0$, defensive division guard clamps $L$ to $999.0\text{ years}$.

---

### 8. Hardware Adaptability & Deployment Profile Matrix

#### 8.1 The Hardware Adaptability Principle
SMITRACE enforces the rule that *hardware is an external execution constraint that the runtime adapts to, rather than part of SMITRACE's identity*. The `HardwareProfiler` detects resources dynamically and configures model placement, batching, and context allocation accordingly.

```
24 GB VRAM   ──► 7B/14B quantized models (AWQ/GGUF)   ──► local sequential/time-shared inference
48 GB VRAM   ──► larger reasoning/VLM (32B/70B Q4)    ──► higher context (32K-64K) & worker concurrency
Multi-GPU    ──► model parallelism & model fleet      ──► concurrent specialized reasoning, vision & embeddings
```

#### 8.2 Hardware Profiler Probe
At daemon startup, the profiler detects:
- Available CPU cores and physical memory (`sysinfo`).
- Attached NVIDIA GPUs, peer-to-peer topology, and available VRAM (`nvml` / `cudarc`).
- Storage IOPS and read throughput for vector indexing.

#### 8.3 Deployment Profile Matrix
| Parameter | 24 GB Profile (Baseline) | 48 GB Profile (Advanced) | Multi-GPU Profile (Enterprise Node) |
| :--- | :--- | :--- | :--- |
| **GPU Target** | 1 GPU (24GB VRAM) | 1–2 GPUs (48GB VRAM) | Multi-GPU (80GB–160GB+ VRAM) |
| **System RAM** | 32 GB – 64 GB | 64 GB – 128 GB | 256 GB – 512 GB+ |
| **Max Concurrent Work Units** | 2–4 | 8 | 32 |
| **Active Reasoner** | 7B–14B (AWQ / GGUF Q4_K_M) | 14B–32B (AWQ) / 70B (GGUF Q4) | 70B+ (FP8 / AWQ with Tensor Parallelism) |
| **Active Vision** | PaddleOCR + Qwen2-VL-7B | PaddleOCR + Qwen2-VL-7B/32B | PaddleOCR + Qwen2-VL-72B / InternVL |
| **Model Concurrency** | Time-shared sequential invocation | Concurrent Reasoning + VLM workers | Dedicated concurrent fleet (Reasoning + Vision + Embedding) |
| **Office Compilers** | Sequential compilation | Parallel document jobs | High-throughput batch workers |
| **Max Context Budget** | 16,384 – 32,768 tokens | 32,768 – 65,536 tokens | 65,536 – 131,072 tokens |


---

### 9. Event Sourcing & Audit Ledger

```sql
CREATE TABLE event_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('Mission', 'WorkUnit', 'Artifact', 'PlanUpdate')),
    entity_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    previous_hash TEXT,
    hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_log_entity ON event_log(entity_type, entity_id);
CREATE INDEX idx_event_log_mission ON event_log(mission_id);
```
* Append-only event chaining with SHA-256 Merkle proofs guarantees tamper-evident execution histories.

---

### 10. Client Ingestion & Enclave Vault Cryptographic Interface

```
Local File System (sample_inputs/) ➔ Native File Picker / Drag-and-Drop ➔ In-Browser Web Crypto SHA-256 ➔ Enclave Vault Sealing ➔ Scenario Engine
```

#### 10.1 Ingestion Contracts & Web Crypto Hashing
* **Client-Side Hashing**: Input documents undergo client-side Web Crypto hashing (`crypto.subtle.digest('SHA-256', arrayBuffer)`). No unhashed external artifact enters workbench memory.
* **Zero WAN Egress Policy**: Ingestion processes execute purely locally within memory buffers with strictly zero external network packets.
* **Manual Ingestion Protocol**: Eliminates simulated/hardcoded mock data in the presentation tier. Operators explicitly feed authentic datasets from `sample_inputs/piping/` (CML ultrasonic surveys, line lists) or `sample_inputs/codebase/` (engineering patches, pytest test suites) via file selection or OS drag-and-drop.
* **Audit Chaining**: Every manual file ingestion automatically appends a typed audit record (`[USER] Manually ingested input file: <filename>`) linked to a platform Merkle leaf confirmation (`[PLATFORM] SHA-256 Merkle leaf registered and sealed into vault`).
