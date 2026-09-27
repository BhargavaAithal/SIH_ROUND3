# ADR-0004: Antigravity Knowledge Injection & Anti-Hallucination Planning Policy

- **Status**: Accepted
- **Date**: 2026-09-12
- **Authors**: Antigravity Agent & System Architects
- **Tags**: #knowledge-injection #anti-hallucination #graphify #settings #antigravity2.0

---

## Context & Problem Statement
When autonomous agents plan new features, refactors, or fixes, a common failure mode is **dependency hallucination**: the agent speculates imports, assumes non-existent helper functions, or predicts incorrect call hierarchies instead of inspecting real codebase relationships.

To prevent this, the project mounts `.antigravity/graph.json` (AST topological graph) and `docs/` (ADR vault and architecture notes) as persistent knowledge sources directly inside Antigravity 2.0 Project Settings and lifecycle hooks.

---

## Decision Drivers
* Eliminate dependency hallucinations during the planning and implementation phases.
* Force agents to verify AST caller/callee relationships before modifying code.
* Unify Antigravity 2.0 Project Settings (`.antigravity/settings.json`), always-on agent rules (`.agents/rules/knowledge-substrate.md`), and IDE Knowledge Items.

---

## Decision Outcome
**Chosen Option**: Multi-layer Knowledge Injection and Mandatory Graph Query Policy.

### Mounted Sources
1. **`.antigravity/graph.json`**: Primary ground-truth topological knowledge source containing all AST symbols, modules, function definitions, and dependency edges.
2. **`docs/adr/`**: Architectural invariants, accepted designs, and historical context.
3. **`docs/architecture/`**: Visual Obsidian canvas and component notes.

### Enforcement Mechanisms
* **Antigravity 2.0 Project Settings** (`.antigravity/settings.json`): Sets `requireGraphTopologyQuery: true` and `disallowHallucinatedDependencies: true`.
* **Always-On Workspace Rule** (`.agents/rules/knowledge-substrate.md` & `GEMINI.md`): Directs model reasoning to check `.antigravity/graph.json` before proposing changes.
* **PreInvocation Hook** (`knowledge-injector.js`): Injects an ephemeral reminder in the agent loop prior to model calls.
* **IDE Knowledge Item** (`<appDataDir>\knowledge\start-codebase-topology`): Persists knowledge metadata across sessions.

---

## Invariants & Compliance Rules
1. During feature planning, the agent must check `.antigravity/graph.json` for existing callers, callees, and imports before asserting new dependencies.
2. Speculative or hallucinated dependencies are strictly prohibited.
3. If an edge or module does not appear in the topology, the agent must verify the filesystem before assuming its existence.
