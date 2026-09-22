# Product Requirements Document (PRD) — Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)

> **Repository**: [https://github.com/VINYASGM/smitrace](https://github.com/VINYASGM/smitrace)  
> **Authoritative Companion**: [`Architecture.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/Architecture.md) | [`docs/product/PRD.md`](file:///c:/Users/Vinyas%20G%20M/OneDrive/Desktop/SIH/docs/product/PRD.md)

## 1. Executive Summary
The **Sovereign AI Execution Plane & Industrial Workbench (SMITRACE)** is an on-premises, network-isolated engineering platform engineered for regulated Public Sector Undertakings (PSUs), refineries, critical process plants, defense manufacturing units (DPSUs), and government facilities. It enables plant engineers and inspection authorities to automate complex industrial documentation, structural calculations against ASME/API codes, P&ID diagram parsing, and report synthesis without exposing enterprise data beyond physical network perimeters.

Crucially, SMITRACE establishes **Zero-Trust, Non-Repudiable Legal Provenance (DPDP Act 2023 §8 / ITAR / DGMS Circulars)**. It eliminates reliance on probabilistic LLM assertions, mathematically preventing AI hallucinations from causing physical plant rupture, catastrophic vessel overpressurization, or un-audited Permitted-to-Work (PTW) safety breaches.

## 2. Regulatory Background & Market Need
- **Statutory Auditability & Non-Repudiation**: Under Section 8 of the Digital Personal Data Protection (DPDP) Act 2023, Directorate General of Mines Safety (DGMS) Technical Circulars, and ITAR compliance directives, automated recommendations are legally inadmissible unless backed by deterministic mathematical verification and an immutable, cryptographically sealed chain of custody.
- **Physical Safety Invariants**: In hydrocarbon refineries, chemical plants, and defense facilities, accepting an unverified calculation or hallucinated wall thickness can lead to catastrophic physical pipe rupture, fatal toxic release, or boiler explosions.
- **Operational Reality**: Air-gapped plants (SCADA/DCS) have zero WAN connectivity. Commercial cloud LLMs are legally and physically unusable in these environments.
- **Product Defensibility**: Form-factor optimized as a turnkey appliance for defense integrators (BEL, L&T, Tata Advanced Systems) and Government e-Marketplace (GeM) procurement.

## 3. Key User Personas
1. **Refinery / PSU Mechanical Integrity Engineer**: Needs to evaluate multi-variable constraint envelopes (MAWP, corrosion rates, temperature deratings) across piping, storage tanks, and pressure vessels.
2. **Plant Inspection & QA Manager**: Needs to convert scanned ultrasonic thickness (UT) inspection sheets into official board-ready PSU approval notes.
3. **P&ID & Systems Draftsman**: Needs to parse scanned isometric prints and P&IDs into queryable component/connectivity graphs without manual redrawing.
4. **Statutory Safety & Compliance Inspector (DGMS / Regulatory Audit)**: Demands court-admissible proof of zero outbound network egress, deterministic verification traces, and an immutable SHA-256 Merkle audit trail for every Permitted-to-Work issuance.

## 4. Functional Requirements

### FR-1: Multimodal Asset Ingestion & Spatial Parsing (R2) (**COMPLETED & VERIFIED**)
- Ingest scanned PDFs, micro-text forms, handwritten log sheets, and high-res P&ID schematics (up to 4000x3000 resolution).
- **Tiled Sliding Window Patching (`patcher.py`)**: Slices drawings into uniform $1024 \times 1024$ tiles with $256\text{px}$ overlap, employing boundary stride-shifting (`edge_mode="shift"`) to eliminate margin clipping, paired with cross-patch IoU Non-Maximum Suppression (NMS).
- **Aggressive Pre-Skeletonization Gap-Bridging (`skeletonizer.py` / `bridge_drawing_gaps`)**: Employs directional morphological closing ($1 \times 7$ and $7 \times 1$) to bridge broken lines without blurring parallel pipes, and Probabilistic Hough Transform (`cv2.HoughLinesP`) to reconnect collinear line gaps up to $15\text{px}$ in dashed instrumentation/electrical lines.
- **Vectorized Morphological Thinning (`skeletonizer.py`)**: Pure NumPy parallel thinning (`_zhang_suen_pure_numpy`) preserving strict 1-pixel line connectivity, evaluating the Rutovitz Crossing Number invariant ($CN=1$ endpoint, $CN=2$ line, $CN\ge 3$ junction), 8-connected junction clustering, and RDP polyline simplification.
- **KD-Tree Geometric Snapping Tolerances (`graph_builder.py`)**: Spatial `cKDTree` index enforcing a strict **$40\text{px}$ snapping radius** with orthogonal projection snapping to pipe polyline vectors.
- **ISA-5.1 Regex Tag Repair & Pipe Attributes**: Regex parsing with OCR noise repair (`repair_ocr_tag`), extracting outside diameter ($D$), design pressure ($P$), and thickness ($t_{\text{act}}$) into dual queryable NetworkX graphs (`nx.Graph` and `nx.DiGraph`).

### FR-2: Neurosymbolic Verification via Multi-Variable Constraint Envelopes (R1 & R3) (**COMPLETED & VERIFIED**)
- Execute generated Python calculation scripts within ephemeral `nsjail`/`gVisor` sandboxes (`--network none`, 512MB RAM, 10s timeout, zero WAN egress).
- **Z3 Multi-Variable SMT Constraint Envelopes (First-Order Non-Linear Real Arithmetic QF_NRA)**:
  - Formulates simultaneous safety bounds for Maximum Allowable Working Pressure (MAWP) across coupled service aging $t$, corrosion rates $c_r$, temperature-dependent material stress deratings $S(T)$, mechanical allowances $c$, and weld joint efficiencies $E$:
    $$\Phi_{\text{MAWP}} = \left( P \le \frac{2 \cdot S(T) \cdot E \cdot (t_0 - c_r \cdot t_{\text{service}} - c)}{D - 2 \cdot Y \cdot (t_0 - c_r \cdot t_{\text{service}} - c)} \right) \land \left( S(T) = f_{\text{derate}}(T) \right) \land \left( t_{\text{act}} - c_r \cdot t_{\text{service}} \ge t_{\text{min}} \right)$$
  - Solves for exact multi-dimensional boundary polytopes using Cylindrical Algebraic Decomposition (CAD) and NLSat where analytical algebraic inversion is non-trivial.
  - Multi-standard cross-verification: ASME B31.3 piping, API 510 pressure vessels, API 650 atmospheric storage tanks, API 520/521 relief valves, and AWS D1.1 structural welds.
- **0.0% False Assurance Rate (FAR)**: Guarantees 0.0% FAR across 2,200 property-based adversarial trials. On solver timeout ($\ge 5.0\text{s}$), the system strictly emits `FAIL (SMT_TIMEOUT)` with zero unverified floating-point fallbacks.

### FR-3: State-Isolated Anti-Collapse Self-Correction (R4) (**COMPLETED & VERIFIED**)
- Implement a 3-turn ReAct repair loop for generated script failures (`run_react_loop`).
- Memory isolation: Decouple `ImmutableSpec`, mutable script state, and SHA-256 rejected failure hashes.
- Prevent cognitive collapse through clean-context re-prompting and duplicate error hash stall detection with <= 3 turns convergence.

### FR-4: Headless Enterprise Deliverable Engine (R5) (**COMPLETED & VERIFIED**)
- Directly generate native corporate PSU approval notes (`.docx`) and multi-tab audited workbooks (`.xlsx`) without MS Office runtime or markdown breakage.
- Populate pre-baked PSU enterprise templates with official headers, metadata grids, formulas, citations, and digital sign-off blocks. 100% valid ISO/IEC 29500 OOXML packaging.

### FR-5: Sovereignty & Air-Gap Telemetry (R1) (**COMPLETED & VERIFIED**)
- Real-time air-gap audit telemetry backed by `audit_network_egress()` and socket guard probes mathematically proving 0 WAN packets transferred.
- Default outbound WAN packet dropping with strict zero-egress enforcement verified across all pipeline execution steps.

### FR-6: Headless High-Security API & Offline PKI Access Control (**SETTLED DESIGN**)
- High-security Unix service architecture exposing local mTLS API and embedded console restricted strictly to localhost.
- Offline Role-Based Access Control (RBAC) enforced via Hardware Token / Local PKI (YubiKey / PIV SmartCard x509 client certificates verified via local OpenSSL CA).

### FR-7: Zero-Thrashing Inference Architecture & Dedicated Vision Backbone (**SETTLED DESIGN**)
- **Elimination of Cross-PCIe Model Thrashing**: Replaces heavy dynamic multi-modal swapping with a dedicated, lightweight CPU/TensorRT vision pipeline (YOLO-v8 ONNX for symbols/valves + PaddleOCR v4 ONNX for text, <1.2GB) alongside a **single permanently hard-pinned 14B reasoning specialist** (`Qwen-2.5-14B-Instruct` AWQ or `SMITRACE-Sovereign-14B-v1`).
- Total static VRAM footprint is fixed at <11GB on a 24GB card, reserving >12GB for dynamic vLLM PagedAttention KV-cache pools with 0 PCIe bus swapping stalls.

### FR-8: Work Unit DAG Generalizability & Dynamic Capability Grammar Boundary (**SETTLED DESIGN**)
- Proves the multi-discipline generalizability of the Work Unit DAG beyond single pipe calculations:
  - **Process Piping (ASME B31.3)**: `PROVE_SMT_ENVELOPE` + `EXECUTE_NUMERICAL_SCRIPT`
  - **Storage Tanks (API 650 / 620)**: `EXECUTE_NUMERICAL_SCRIPT` + `PROVE_SMT_ENVELOPE`
  - **Pressure Vessels (API 510 / ASME VIII)**: `PROVE_SMT_ENVELOPE` + `EXECUTE_NUMERICAL_SCRIPT`
  - **Relief Systems (API 520 / 521)**: `EXECUTE_NUMERICAL_SCRIPT` + `PROVE_SMT_ENVELOPE`
  - **Fabrication & Welds (AWS D1.1 / ISO 13703)**: `QUERY_SPATIAL_TOPOLOGY` + `PROVE_SMT_ENVELOPE`
- Enforces declarative capability proposal schemas, static `CapabilityRegistry` resolution, and privilege dropping inside ephemeral sandboxes.

### FR-9: Control Plane Concurrency, Autonomous Lease Recovery & Statutory Auditability (Milestone 15 / ADR 07) (**SETTLED DESIGN**)
- **Statutory Auditability Framing**: All resilience mechanisms are presented strictly as **Zero-Trust, Non-Repudiable Legal Provenance (DPDP Act 2023 §8 / ITAR / DGMS)**:
  1. **Dedicated Serialized SQLite WAL Writer Actor (Q1 & Q7)**: Serializes all mutations through a single-writer FIFO queue executing `BEGIN IMMEDIATE` transactions. Mutating callers block on a synchronous `threading.Event` barrier (5.0s timeout), guaranteeing linear, fork-free SHA-256 Merkle chaining and eliminating uncommitted HTTP 200 responses.
  2. **60s Timed Leases & Autonomous Watchdog Reaper (Q2)**: Worker leases enforce a 60-second TTL backed by 15-second heartbeats. A background sweeper running every 10 seconds sweeps abandoned/crashed tasks back to `READY` and increments `retry_count`. Tasks exceeding 3 retries escalate to `WAITING_HUMAN` to prevent zombie workers from corrupting active Permitted-to-Work (PTW) workflows.
  3. **Two-Phase Ephemeral Staging with Atomic Commit (Q3 & Q9)**: Uncommitted artifacts write to `staging/{lease_id}/`. Promotion to `cases/{case_id}/` via $O(1)$ `os.replace` occurs strictly *after* formal SMT verification passes; failed candidate directories are purged, ensuring zero draft deliverable leakage.
  4. **Process-Isolated Assurance Pool (Q4 & Q10)**: Z3 SMT proofs execute inside an isolated subprocess pool bounded by a 5.0-second hard kill switch, blocking Algorithmic Solver DoS attacks and enforcing 0.0% FAR.
  5. **Cold-Boot Genesis-to-Tip Replay (Q5)**: On cold daemon startup, the system validates SHA-256 hash continuity from block 0, sweeps orphaned leases, and deterministically reconstructs projections.
  6. **Surgical DAG Branch Suspension (Q6)**: Failure of an isolated work unit transitions only its direct downstream dependents to `BLOCKED`. Independent parallel branches continue executing uninterrupted.
  7. **Statutory Human Overrides (Q8)**: Operator interventions require an immutable `HUMAN_OVERRIDE` event containing `operator_id`, resolution mode, physical justification ($\ge 20$ characters), and an HMAC-SHA256 signature, fixing personal legal accountability.

### FR-10: Industrial Workbench Tabbed React SPA & Discreet Status Bar (R6 / M7) (**COMPLETED & VERIFIED**)
- Four tabbed viewports: P&ID Viewer, Calculation Sandbox, Z3 Formal Audit, and Deliverables Preview.
- Docked 24px Engineering Status Bar (`StatusBar.jsx`) running unobtrusively in the background, showing real-time `127.0.0.1` loopback enforcement, sandbox isolation, and an on-demand audit trigger.
- Runtime Egress & Air-Gap Audit modal scanning live `psutil` sockets confirming 0 WAN outbound bytes and deterministic SHA-256 integrity hash.

### FR-11: Presentation-Ready Demonstration Suite & Multi-Scenario Switcher (R7 / M9) (**COMPLETED & VERIFIED**)
- Dedicated `PresenterBar` positioned below header providing 1-click toggling between three full-fidelity plant states:
  1. Normal Operating Baseline (`16"-P-101-CS-150`): Full compliance, +2.49 mm margin, SAT verdict.
  2. Critical Pipe Thinning Hazard (`12"-P-105-CS-150`): -0.65 mm deficit below statutory minimum, UNSAT verdict, Z3 formal safety gate halts execution and blocks hazardous work permits.
  3. High Pressure Surge Anomaly (`10"-P-103-CS-300`): SCADA transient overpressure spike to 650 psig, triggering ReAct agent self-correction loop and relief valve PRV-202 set-point recalibration.

### FR-12: 4-Beat Sovereign Inspection Pipeline (Dump → Vault → Deterministic Analysis → Payoff) (M11) (**COMPLETED & VERIFIED**)
- Executive progressive disclosure: Beat 1 (Deposit 6 authentic files) ➔ Beat 2 (Cryptographic Vault Sealing & Case ID) ➔ Beat 3 (Deterministic SMT Verification checklist) ➔ Beat 4 (Deliverable Payoff with slide-out Mathematical Proof & Engineering Standards drawer).

## 5. Quantitative Success Metrics & Invariants
- **Statutory Non-Repudiation**: 100% linear SHA-256 Merkle event chain adhering to DPDP Act 2023 §8 and DGMS circulars.
- **False Assurance Rate (FAR)**: Strictly 0.0% (Z3 SMT blocks all non-compliant calculations; zero float fallbacks).
- **Zero Egress Rate**: 100% physically verified (0 WAN bytes).
- **Concurrency & Non-Repudiation**: 0 SQLite locking errors (`SQLITE_BUSY`) under 50 concurrent worker threads via dedicated single-writer actor.
- **Crash Recovery Latency**: <10s orphan lease sweep and reclamation.
- **Candidate Leakage Rate**: 0.0% (ephemeral staging sandbox isolates candidate outputs until formal SMT pass).
- **Zero PCIe Model Thrashing**: Dedicated vision backbone (<1.2GB) + hard-pinned 14B reasoning model (<11GB static VRAM footprint).
- **Single 24GB GPU Latency**: Sub-100ms model multiplexing, sub-second TTFT.
