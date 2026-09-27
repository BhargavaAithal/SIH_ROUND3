# Architecture Decision Records (ADR) Vault

Welcome to the **Architecture Decision Records (ADR)** repository for this project. This folder is structured as an **Obsidian Vault** to enable bi-directional wikilinking, graph visualization, and persistent memory retention for human developers and autonomous AI agents.

## Purpose & Principles
Autonomous agents consume significant context windows when reading raw codebases from scratch. This ADR vault, coupled with the Graphify AST topology in `docs/architecture/` and `.antigravity/graph.json`, forms the project's **Memory Substrate**:
1. **Decision Integrity**: Every major technical decision (state management, API invariants, schema migrations, guardrails) is codified with rationale and consequences.
2. **Token Efficiency**: Agents consult structured ADR summaries and graph relationships before opening source files.
3. **Traceability**: All ADRs are immutable once accepted unless superseded by a subsequent ADR.

---

## Index of Architecture Decision Records

| ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| [[0001-memory-substrate-graphify-obsidian\|ADR-0001]] | Establish Memory Substrate: Graphify + Obsidian | Accepted | 2026-09-12 |
| [[0002-antigravity-lifecycle-hooks\|ADR-0002]] | Antigravity Lifecycle Safety & Quality Guardrails | Accepted | 2026-09-12 |
| [[0003-adr-specification-and-invariants\|ADR-0003]] | Architecture Decision Records Standards & Invariants | Accepted | 2026-09-12 |
| [[0004-antigravity-knowledge-injection\|ADR-0004]] | Antigravity Knowledge Injection & Anti-Hallucination Policy | Accepted | 2026-09-12 |
| [[0005-behavioral-skills-suite\|ADR-0005]] | Comprehensive Behavioral Skills Suite (Workflow & Cognitive Discipline) | Accepted | 2026-09-12 |
| [[0006-coderabbit-review-gates-remediation\|ADR-0006]] | CodeRabbit Review Gates, Automated PR Dispatch & Autonomous Remediation Pass | Accepted | 2026-09-12 |
| [[0007-continuous-evaluation-coder-eval\|ADR-0007]] | Continuous Evaluation Infrastructure via Coder-Eval & CI/CD Quality Gates | Accepted | 2026-09-17 |
| [[0008-language-low-latency-edge-daemon-zero-copy-ipc\|ADR-0008]] | Language, Low-Latency Edge Daemon & Zero-Copy IPC Architecture (SMITRACE ADR-001) | Accepted | 2026-09-20 |
| [[0009-local-ai-inference-runtime-quantization-compound-routing\|ADR-0009]] | Local AI Inference Runtime, Quantization & Compound Routing Engine (SMITRACE ADR-002) | Accepted | 2026-09-20 |
| [[0010-kernel-air-gap-sovereignty-hardware-security-micro-sandboxing\|ADR-0010]] | Kernel Air-Gap Sovereignty, Hardware Security & Micro-Sandboxing (SMITRACE ADR-003) | Accepted | 2026-09-20 |
| [[0011-neurosymbolic-engine-smt-theorem-proving-anti-collapse\|ADR-0011]] | Neurosymbolic Engine, SMT Theorem Proving & Anti-Collapse State Machine (SMITRACE ADR-004) | Accepted | 2026-09-20 |
| [[0012-raster-to-graph-topology-reconstruction-spatial-engine\|ADR-0012]] | Raster-to-Graph Topology Reconstruction & Spatial Engine Architecture (SMITRACE ADR-005) | Accepted | 2026-09-20 |
| [[0013-industrial-workbench-ui-ux-performance-mcp-integration\|ADR-0013]] | Industrial Workbench UI/UX Performance & Model Context Protocol (MCP) Integration (SMITRACE ADR-006) | Accepted | 2026-09-20 |
| [[0014-control-plane-concurrency-resilient-leases-staged-quarantining\|ADR-0014]] | Control Plane Concurrency, Resilient Leases, Staged Quarantining & Fault Isolation (SMITRACE ADR-007) | Accepted | 2026-09-20 |
| [[0015-dynamic-model-gateway-and-registry\|ADR-0015]] | Dynamic Model Gateway, Declarative Registry & Hardware-Agnostic Profile Matrix | Accepted | 2026-09-21 |
| [[0016-user-governed-agentic-dag-planning\|ADR-0016]] | User-Governed Agentic DAG Planning, Step Pruning & Brokered Execution | Accepted | 2026-09-21 |
| [[0017-non-autoregressive-decision-model-laya\|ADR-0017]] | Non-Autoregressive Decision Model (Laya) for Low-Latency Capability Routing & Work Unit Dispatch | Accepted | 2026-09-24 |



---

## ADR Template
When proposing a new ADR, create `XXXX-short-title.md` following this structure:
```markdown
# ADR-XXXX: [Title]

- **Status**: [Proposed | Accepted | Deprecated | Superseded by ADR-YYYY]
- **Date**: YYYY-MM-DD
- **Authors**: [Names / Agent IDs]
- **Tags**: #architecture #security #memory

## Context & Problem Statement
[Describe the context, user request, and technical problem]

## Decision Drivers
- [Driver 1]
- [Driver 2]

## Considered Options
1. [Option 1]
2. [Option 2]

## Decision Outcome
Chosen Option: [Option X] because [rationale].

### Positive Consequences
- [...]

### Negative Consequences / Tradeoffs
- [...]

## Invariants & Compliance Rules
- [Rule 1 that all agents and developers must strictly follow]
```
