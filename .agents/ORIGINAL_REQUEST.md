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
