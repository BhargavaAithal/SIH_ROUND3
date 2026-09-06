# Original User Request

## 2026-09-05T05:23:52Z

Build an air-gapped, on-premises Sovereign AI Execution Plane and Industrial Workbench for regulated PSUs, refineries, and defence units. The system automates industrial document processing, mechanical ASME calculations, P&ID raster-to-graph topology extraction, and headless DOCX/XLSX generation with zero outbound WAN network traffic.

Working directory: `c:/Users/Vinyas G M/OneDrive/Desktop/SIH`  
Integrity mode: `development`

## Requirements

### R1. Air-Gap & Sovereignty Enforcement
Implement kernel-level network isolation rules and eBPF/tcpdump network monitoring scripts (`scripts/airgap_audit.sh`) to physically guarantee and audit 0 outbound WAN bytes during execution.

### R2. Multimodal Raster-to-Graph & Document Ingestion Engine
Build a spatial layout parser using OpenCV morphological line skeletonization and VLM patch processing to slice 4000x3000 P&ID drawings, extract equipment tags, and snap symbol centroids into a queryable NetworkX graph.

### R3. Sandboxed Execution & Neurosymbolic Z3 Verification Engine
Build ephemeral `nsjail` sandbox process launcher (`--network none`) and Python AST verifier integrated with a local Z3 SMT solver enforcing ASME B31.3 / API 510 physical thickness invariants ($t_{\text{actual}} \ge t_{\text{min}}$, $P > 0$).

### R4. State-Isolated Anti-Collapse Loop
Implement a 3-turn ReAct self-correction state machine that decouples Immutable Spec, Mutable Script, and Failure Hashes with clean-context re-prompting to prevent 7B–14B model cognitive collapse.

### R5. Headless Enterprise Deliverable Generator
Build native `.docx` and `.xlsx` compilation engine using `python-docx` and `openpyxl` to populate verified calculations and citations into standard PSU approval templates.

## Acceptance Criteria

### Security & Air-Gap Verification
- [ ] Execution sandbox runs with network isolation (`--network none`), cgroups limits (512MB RAM, 10s CPU timeout).
- [ ] `./scripts/airgap_audit.sh` verifies zero outbound network packets.

### Neurosymbolic Verification
- [ ] Z3 solver evaluates ASME B31.3 pipe wall thickness equations and emits SAT for valid inputs and UNSAT for invalid inputs ($t_{\text{actual}} < t_{\text{min}}$).
- [ ] False Assurance Rate strictly equals 0.0% across test suite.

### Document & Graph Assembly
- [ ] OpenCV skeletonization correctly identifies junctions and equipment tag centroids from sample P&ID images into NetworkX graph.
- [ ] Headless deliverable engine produces valid `.docx` (memo) and `.xlsx` (audited calculations) files without XML corruption.

## 2026-09-05T05:43:25Z

USER INSTRUCTION CHANGE: The user has explicitly requested to stop execution at Milestone 3 (M3). 

Please complete, test, and verify Milestones M1 (Air-Gap & Sandbox), M2 (Multimodal Vision & Raster-to-Graph), and M3 (Neurosymbolic AST & Z3 Verification Engine). DO NOT dispatch or proceed with Milestone 4 (Anti-Collapse Loop) or Milestone 5 (Headless Deliverable Engine). Finalize the system state and test reporting at Milestone 3.

## 2026-09-05T11:46:00Z

Build an air-gapped, on-premises Sovereign AI Execution Plane and Industrial Workbench for regulated PSUs, refineries, and defence units. The system automates industrial document processing, mechanical ASME calculations, P&ID raster-to-graph topology extraction, and headless DOCX/XLSX generation with zero outbound WAN network traffic.

Working directory: `c:/Users/Vinyas G M/OneDrive/Desktop/SIH`
Integrity mode: `development`

## Requirements

### R1. Air-Gap & Sovereignty Enforcement
Implement kernel-level network isolation rules and eBPF/tcpdump network monitoring scripts (`scripts/airgap_audit.sh`) to physically guarantee and audit 0 outbound WAN bytes during execution.

### R2. Multimodal Raster-to-Graph & Document Ingestion Engine
Build a spatial layout parser using OpenCV morphological line skeletonization and VLM patch processing to slice 4000x3000 P&ID drawings, extract equipment tags, and snap symbol centroids into a queryable NetworkX graph.

### R3. Sandboxed Execution & Neurosymbolic Z3 Verification Engine
Build ephemeral `nsjail` sandbox process launcher (`--network none`) and Python AST verifier integrated with a local Z3 SMT solver enforcing ASME B31.3 / API 510 physical thickness invariants ($t_{\text{actual}} \ge t_{\text{min}}$, $P > 0$).

### R4. State-Isolated Anti-Collapse Loop
Implement a 3-turn ReAct self-correction state machine that decouples Immutable Spec, Mutable Script, and Failure Hashes with clean-context re-prompting to prevent 7B–14B model cognitive collapse.

### R5. Headless Enterprise Deliverable Generator
Build native `.docx` and `.xlsx` compilation engine using `python-docx` and `openpyxl` to populate verified calculations and citations into standard PSU approval templates.

## Acceptance Criteria

### Security & Air-Gap Verification
- [ ] Execution sandbox runs with network isolation (`--network none`), cgroups limits (512MB RAM, 10s CPU timeout).
- [ ] `./scripts/airgap_audit.sh` verifies zero outbound network packets.

### Neurosymbolic Verification
- [ ] Z3 solver evaluates ASME B31.3 pipe wall thickness equations and emits SAT for valid inputs and UNSAT for invalid inputs ($t_{\text{actual}} < t_{\text{min}}$).
- [ ] False Assurance Rate strictly equals 0.0% across test suite.

### Document & Graph Assembly
- [ ] OpenCV skeletonization correctly identifies junctions and equipment tag centroids from sample P&ID images into NetworkX graph.
- [ ] Headless deliverable engine produces valid `.docx` (memo) and `.xlsx` (audited calculations) files without XML corruption.

## 2026-09-06T03:30:24Z

Build the air-gapped Industrial Workbench Frontend Single-Page Application (React 18 + Vite + Vanilla CSS) for SMITRACE, featuring a 4-viewport Tabbed Dashboard Layout (P&ID Viewer SVG Canvas + Quick Action Drawer, Calculation Sandbox Console, Z3 Formal Verification Audit, Deliverables Previewer), Zustand state store with Server-Sent Events (SSE) streaming backend API, Dual Theme (Industrial Dark / Modern Light), and persistent Sovereignty Header Badge ("AIR-GAP ACTIVE: 0 BYTES WAN").

Working directory: `c:/Users/Vinyas G M/OneDrive/Desktop/SIH`  
Integrity mode: `development`

## Requirements

### R1. React 18 + Vite SPA & Dual Theme System
Build a pre-compiled React 18 + Vite SPA in `ui/` with zero external CDN dependencies. Implement a Dual Theme System (Industrial Dark `#0B0F19` & Modern Light `#F8FAFC`) with a manual header toggle switch, glassmorphic card containers, Inter font typography, and smooth micro-animations.

### R2. Tabbed Dashboard Layout & Viewports
Implement a 4-viewport tabbed navigation bar:
1. `PIDViewerTab`: Interactive SVG Canvas overlaying high-res P&ID schematics with clickable equipment tags, color-coded pipe attributes (OD, rating, thickness), zoom/pan controls, and a slide-out Quick Action Drawer for formula checks and graph node details.
2. `CalculationSandboxTab`: Interactive ReAct agent execution output, live code playground, and AST guard violation logs.
3. `Z3AuditTab`: Formal verification proof log, SAT/UNSAT constraint evaluation tree, and 0.0% FAR metrics dashboard.
4. `DeliverablesTab`: In-browser client-side `docx-preview` for PSU Approval Memos and interactive DataGrid table for `.xlsx` calculation workbooks.

### R3. Persistent State Management & Real-Time SSE Streaming
Implement Zustand global state store connected to local FastAPI SSE endpoint `/api/v1/events` and telemetry `/api/v1/telemetry/airgap`. Preserve execution state, logs, and user inputs seamlessly across tab switches.

### R4. Persistent Sovereignty Header Badge
Top navigation header bar widget polling `/api/v1/telemetry/airgap`, featuring a green pulsing indicator `"AIR-GAP ACTIVE: 0 BYTES WAN"`, live network throughput ticker (`0.00 KB/s`), and click-to-expand eBPF kernel socket audit details modal.

### R5. FastAPI Static Asset Server & Backend Mock/API Integration
Integrate Python FastAPI server endpoint (`src/sovereign/api/server.py`) serving static pre-compiled frontend assets from `ui/dist/` at `127.0.0.1:8000` with mTLS PKI security middleware stubs.

## Acceptance Criteria

### Build & Offline Self-Containment
- [ ] `npm run build` inside `ui/` completes with 0 errors and generates static `dist/` bundle.
- [ ] Python FastAPI backend serves `ui/dist/` static assets on `http://127.0.0.1:8000` with 0 external CDN or internet calls.

### Interactive Workbench UI Verification
- [ ] P&ID SVG Canvas renders equipment tags, color-coded line specs, zoom/pan controls, and opens Quick Action Drawer on node click.
- [ ] Tab switching between P&ID Viewer, Calculation Sandbox, Z3 Audit, and Deliverables preserves live state via Zustand store.
- [ ] Deliverables tab renders client-side `.docx` memo previews and multi-tab `.xlsx` DataGrid workbooks with binary download actions.
- [ ] Dual Theme toggle seamlessly switches UI styling between Industrial Dark (`#0B0F19`) and Modern Light `#F8FAFC`.
- [ ] Sovereignty header displays green pulse indicator "AIR-GAP ACTIVE: 0 BYTES WAN" with expandable eBPF modal.

### System Non-Regression
- [ ] Full `pytest` verification suite passes cleanly with 0 failures across all 326 unit tests and 69 E2E tests.

