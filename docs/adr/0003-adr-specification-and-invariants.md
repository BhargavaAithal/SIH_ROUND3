# ADR-0003: Architecture Decision Records Standards & Invariants

- **Status**: Accepted
- **Date**: 2026-09-12
- **Authors**: Antigravity Agent & System Architects
- **Tags**: #governance #adr-standards #invariants #obsidian

---

## Context & Problem Statement
To prevent degradation of the project's documentation over time, Architecture Decision Records (ADRs) require a standardized schema, immutable versioning, and strict lifecycle states.

---

## Decision Drivers
* Standardized metadata readable by both human engineers and AI parsing agents.
* Full compatibility with Obsidian graph view, backlinks, and frontmatter.
* Clear transitions between Proposed, Accepted, Deprecated, and Superseded states.

---

## Decision Outcome
**Chosen Option**: Standardized ADR Markdown Schema with Obsidian Wikilinks.

### Lifecycle States
1. **Proposed**: Under review by human engineers or pair programmers.
2. **Accepted**: Formally approved and binding on all subsequent development.
3. **Deprecated**: No longer applicable, but retained for historical context.
4. **Superseded**: Replaced by a newer ADR (must link to the replacing ADR).

### Vault Linking Conventions
* ADR files must follow the numbering format `NNNN-kebab-case-title.md`.
* Related ADRs must be linked using Obsidian wikilinks: `[[0001-memory-substrate-graphify-obsidian|ADR-0001]]`.
* Architectural entities should reference the Graphify generated notes in `docs/architecture/`.

---

## Invariants & Compliance Rules
1. Existing accepted ADRs must not be deleted or retroactively edited to alter their historical verdict. If an architectural decision changes, a new ADR must supersede it.
2. Every ADR must declare an explicit `Invariants & Compliance Rules` section.
