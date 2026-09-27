# ADR-0001: Establish Memory Substrate with Graphify + Obsidian

- **Status**: Accepted
- **Date**: 2026-09-12
- **Authors**: Antigravity Agent & System Architects
- **Tags**: #memory-substrate #graphify #obsidian #context-optimization #architecture

---

## Context & Problem Statement
In agentic software development, AI pair programmers frequently ingest thousands of lines of raw source code to answer architectural questions, trace dependency chains, or plan refactors. This brute-force ingestion introduces three severe failure modes:
1. **Context Window Exhaustion**: Rapidly depletes finite context token limits.
2. **Attention Dilution**: Massive unstructured raw code diminishes the model's reasoning accuracy across subtle constraints.
3. **Loss of Architectural Intent**: Code shows *what* is implemented, but completely obscures *why* a particular trade-off was made.

We need an automated memory substrate that routes codebase context through structured graph topologies and human/agent-readable architectural decisions.

---

## Decision Drivers
* Minimize context consumption during codebase comprehension.
* Maintain bi-directional relationship maps of modules, classes, and functions without manual documentation drift.
* Provide an Obsidian-compatible markdown vault for visual knowledge browsing and wikilinking.
* Seamless integration with Google Antigravity lifecycle and CLI environments.

---

## Considered Options
1. **Raw Code Ingestion**: Require agents to grep and view files as needed.
2. **Vector Embeddings (RAG)**: Standard chunk-based semantic search.
3. **Dual Memory Substrate (Graphify AST Topology + Obsidian ADRs)**: Graph-based dependency extraction coupled with bi-directionally linked markdown decision records.

---

## Decision Outcome
**Chosen Option**: Option 3 (Dual Memory Substrate: Graphify + Obsidian ADRs).

### Architecture Overview
1. **Graphify AST Topology**:
   - Extracted using Graphify to parse Abstract Syntax Trees and identify dependencies, call graphs, clusters, and god nodes.
   - Serialized as `.antigravity/graph.json` for machine/agent parsing and exported as markdown notes and canvas in `docs/architecture/` for Obsidian exploration.
2. **Obsidian ADR Vault (`docs/adr/`)**:
   - Standardized architectural decision records documenting decisions, alternatives, and invariants.
   - Wikilinked directly to architectural components (`[[docs/architecture/index|Architecture Index]]`).

### Positive Consequences
* **90%+ Token Reduction**: Agents can query the graph topology or read targeted ADRs rather than reading entire directory trees.
* **Deterministic Traceability**: Architectural invariants are explicit and checked by agents before writing code.
* **Human-Agent Alignment**: Developers can visually inspect the architecture canvas in Obsidian while agents navigate the underlying JSON graph.

### Negative Consequences / Tradeoffs
* Requires periodic re-indexing (`graphify`) when significant codebase refactors occur.
* Developers and agents must maintain discipline in codifying new architectural decisions into ADRs.

---

## Invariants & Compliance Rules
1. Any non-trivial architectural modification (e.g. database schema changes, new communication protocols, external integration) must be preceded by an accepted ADR in `docs/adr/`.
2. When answering architectural or structural questions about the project, agents must first query `.antigravity/graph.json` or `docs/adr/` before performing brute-force file scans.
