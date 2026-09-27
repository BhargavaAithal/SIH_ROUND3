# ADR-0005: Comprehensive Behavioral Skills Suite (Workflow & Cognitive Discipline)

- **Status**: Accepted
- **Date**: 2026-09-12
- **Authors**: Antigravity Agent & System Architects
- **Tags**: #behavioral-skills #matt-pocock #tdd #to-prd #simplify #surgical-edits #think-first #git-guardrails

---

## Context & Problem Statement
While lifecycle hooks provide deterministic safety boundaries on shell commands and git commits, autonomous coding agents require explicit behavioral runbooks to govern both:
1. **Delivery Workflows**: How requirements are broken down, contracts defined, tests written, and code committed.
2. **Cognitive Discipline**: Preventing unstated assumptions, premature complexity, collateral blast radius, and unverified execution loops.

---

## Decision Outcome
Install an 8-part behavioral skills suite in `.agents/skills/` divided into two complementary layers:

### Layer 1: Workflow & Delivery Skills
* **`to-prd`**: Requirements formalization — translates natural language prompts into atomic `prd.json` task lists with binary acceptance criteria.
* **`design-an-interface`**: Contract-first design — mandates strict typing, schema, and API boundary definitions before writing implementation bodies.
* **`tdd`**: Red-Green-Refactor enforcement — prohibits authoring production code without an automated failing test first.
* **`git-guardrails`**: Safe version control — enforces Conventional Commits, selective staging, and isolation in ephemeral feature branches (`feature/*`, `fix/*`).

### Layer 2: Cognitive Discipline Skills (Operationalizing Core Rules)
* **`think-first`** (Rule 1: Think Before Coding): States assumptions explicitly, surfaces trade-offs, presents alternative interpretations, and halts on ambiguity.
* **`simplify`** (Rule 2: Simplicity First): Post-implementation complexity reduction, eliminating single-use helpers, speculative flexibility, and defensive code for impossible cases.
* **`surgical-edits`** (Rule 3: Surgical Changes): Zero adjacent collateral damage, matching existing style, cleaning up only owned orphans, and verifying 100% diff traceability.
* **`goal-driven-dev`** (Rule 4: Goal-Driven Execution): Transforms tasks into testable success criteria and loops autonomously until verified.

*(Note: `grill-me` is intentionally excluded as an external file because interactive interview planning is already built natively into Antigravity slash commands).*

---

## Invariants & Compliance Rules
1. Every task execution must adhere to both the Delivery Workflow (`to-prd` -> `design-an-interface` -> `tdd` -> `git-guardrails`) and the Cognitive Discipline rules (`think-first` -> `surgical-edits` -> `simplify` -> `goal-driven-dev`).
2. No code may be committed if it contains speculative configurability or single-use abstractions that violate the `simplify` audit.
