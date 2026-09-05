# Product Requirements Document (PRD) — Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)

## 1. Executive Summary
The **Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)** is an on-premises, network-isolated engineering workspace designed for regulated Public Sector Undertakings (PSUs), refineries, defence manufacturing units (DPSUs), and government facilities. It enables knowledge workers to automate complex industrial documentation, mechanical calculations against ASME/API codes, P&ID diagram parsing, and report synthesis without exposing enterprise data beyond physical network perimeters.

## 2. Regulatory Background & Market Need
- **Statutory Mandates**: ITAR, NIS2, DPDP Act 2023, and national security directives (e.g., India Ministry of Finance 2025 AI ban) prohibit uploading proprietary payloads to external cloud AI APIs.
- **Precedents**: IP leakages (e.g., Samsung semiconductor leak in 2023) highlight vulnerabilities in cloud LLMs.
- **Operational Reality**: Air-gapped plants (SCADA/DCS) have zero WAN connectivity.
- **Product Defensibility**: Form-factor optimized as a turnkey appliance for defense integrators (BEL, L&T, Tata Advanced Systems) and Government e-Marketplace (GeM) procurement.

## 3. Key User Personas
1. **Refinery / PSU Mechanical Engineer**: Needs to compute wall thickness, corrosion rates, and remaining lifespan for pressure vessels using ASME B31.3 / API 510 codes.
2. **Plant Inspection & QA Manager**: Needs to process scanned/handwritten ultrasonic thickness (UT) inspection sheets into official formatted PSU approval notes.
3. **P&ID & Systems Draftsman**: Needs to parse scanned isometric prints and P&IDs into queryable component/connectivity graphs.
4. **Enterprise Security Officer / Compliance Auditor**: Demands mathematical proof of zero outbound network egress and verifiable audit logging.

## 4. Functional Requirements

### FR-1: Multimodal Industrial Asset Ingestion
- Ingest scanned PDFs, micro-text forms, handwritten log sheets, and high-res P&ID schematics (up to 4000x3000 resolution).
- Two-tier spatial processing: OpenCV skeletonization + tiled VLM (Qwen2-VL-7B) patch extraction.
- Construct relational evidence graphs linking text callouts, table coordinates, and section headers.

### FR-2: Sandboxed Execution & Neurosymbolic Verification
- Execute generated Python calculation scripts within ephemeral `nsjail`/`gVisor` sandboxes (`--network none`, 512MB RAM, 10s timeout).
- AST parameter extraction passing formula variables into a local **Z3 SMT theorem prover**.
- Enforce strict domain invariants (e.g., $P > 0$, $D > 0$, $t_{actual} \ge t_{min}$). False Assurance Rate must strictly equal 0.0%.

### FR-3: State-Isolated Anti-Collapse Self-Correction
- Implement a 3-turn ReAct repair loop for generated script failures.
- Memory isolation: Decouple Immutable Spec, Mutable Script, and Rejected Error Signatures.
- Prevent small model (7B–14B) cognitive collapse during multi-turn debugging.

### FR-4: Headless Enterprise Deliverable Engine
- Directly generate native `.docx` (memos, approval notes) and `.xlsx` (audited workbooks) without markdown XML breakage.
- Populate pre-baked PSU enterprise templates ensuring official headers, typography, and signature blocks remain pristine.

### FR-5: Sovereignty & Air-Gap Telemetry UI
- Real-time Web UI showing execution DAG, router scheduling decisions, GPU VRAM pressure, and verification logs.
- Integrated Kernel Sovereignty Monitor backed by `nftables` policy (`policy drop`) and eBPF Tetragon socket probes proving 0 WAN bytes transferred.

## 5. End-to-End Demonstration Workflows

### Demonstration Workflow A: Scanned Inspection Log to Formatted Approval Note
1. Operator uploads degraded scanned UT inspection PDF for a distillation column.
2. Compound router sends asset to Multimodal Vision Specialist (Qwen2-VL-7B).
3. Table reader extracts wall thickness metrics and equipment tags (`C-101`).
4. System queries local LanceDB vector store for plant SOP and API 510 minimum retirement limits.
5. Reasoner model (Qwen-2.5-14B) generates formal approval memo with page/table citations.
6. Headless document engine compiles `Approval_Note.docx`.
7. UI demonstrates 0 outbound WAN bytes during processing.

### Demonstration Workflow B: Sandboxed Pipe Lifespan Calculation with Z3 Verification
1. Dispatcher requests ASME B31.3 wall thickness calculation for 12-inch carbon steel pipe.
2. Coder model generates Python calculation script (with intentional syntax error in demo mode).
3. Script runs in `nsjail`; stderr traceback captured upon failure.
4. Anti-collapse engine provides isolated specification + traceback to repair script.
5. AST verifier extracts equations; Z3 evaluates invariants and confirms mathematical soundness (SAT).
6. Script outputs `Analysis.xlsx` and matplotlib degradation curve.

## 6. Success Metrics & Quantitative Targets
- **Zero Egress Rate**: 100% physically verified (0 WAN bytes).
- **False Assurance Rate**: 0.0% (Z3 blocks all invalid calculations).
- **KV-Cache Hit Rate**: >85% via prefix rolling affinity.
- **Task Mis-Routing Rate**: <1.5%.
- **Single 24GB GPU Latency**: Sub-100ms model multiplexing, sub-second TTFT.
