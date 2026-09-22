# Agent Guidelines

Welcome to the project. Follow these guidelines and conventions when collaborating in this repository.

## Core Rules

1. **Think Before Coding**: State assumptions explicitly, surface tradeoffs, and clarify ambiguity before writing code.
2. **Simplicity First**: Write the minimum code that solves the problem cleanly without speculative abstractions.
3. **Surgical Changes**: Touch only what is required. Clean up only your own mess.
4. **Goal-Driven Execution**: Define verifiable criteria for every task. Loop until verified.

---

## Agent Skills & Repository Conventions

### Issue Tracker (GitHub)
Issues and specs for this repository live as GitHub issues. Use the `gh` CLI for all operations:
- **Create an issue**: `gh issue create --title "..." --body "..."`
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open`
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply/remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close an issue**: `gh issue close <number> --comment "..."`

### Canonical Triage Labels
The skills speak in terms of five canonical triage roles:

| Role / Skill Label | Repository Tracker Label | Meaning |
| :--- | :--- | :--- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate this issue |
| `needs-info` | `needs-info` | Waiting on reporter for more information |
| `ready-for-agent` | `ready-for-agent` | Fully specified, ready for an AFK agent |
| `ready-for-human` | `ready-for-human` | Requires human implementation |
| `wontfix` | `wontfix` | Will not be actioned |

### Domain & Architectural Decisions
- **`context.md`** at root: Contains the master domain model, ubiquitous glossary, and system invariant definitions. Always consult before naming domain concepts.
- **`adr.md`** at root: Consolidated architectural decision records (`ADR-001` through `ADR-007`). Always verify design proposals against existing accepted ADRs.
