# Teamwork Project Prompt — Draft

> Status: Launched  
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

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
- [ ] Dual Theme toggle seamlessly switches UI styling between Industrial Dark (`#0B0F19`) and Modern Light (`#F8FAFC`).
- [ ] Sovereignty header displays green pulse indicator "AIR-GAP ACTIVE: 0 BYTES WAN" with expandable eBPF modal.

### System Non-Regression
- [ ] Full `pytest` verification suite passes cleanly with 0 failures across all 326 unit tests and 69 E2E tests.

---
*Next: when approved → delegate via invoke_subagent (see Delegation Protocol)*
