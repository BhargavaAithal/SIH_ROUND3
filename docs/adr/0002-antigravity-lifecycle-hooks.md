# ADR-0002: Antigravity Lifecycle Safety & Quality Guardrails

- **Status**: Accepted
- **Date**: 2026-09-12
- **Authors**: Antigravity Agent & System Architects
- **Tags**: #security #guardrails #hooks #antigravity #quality

---

## Context & Problem Statement
Autonomous pair-programming agents have shell execution, file modification, and git version control capabilities. Without rigorous guardrails, risks include:
* Direct destructive commits or pushes to production branches (`main`, `master`).
* Accidental execution of system-destroying shell commands (`format`, `rmdir /s /q`, registry alterations).
* Leaving broken syntax or unlinted code in the workspace upon task conclusion.

---

## Decision Drivers
* Guaranteed branch protection even if the agent is commanded to push to `main`.
* Protection of the developer's host operating system and filesystem.
* Uncompromising code hygiene and syntax enforcement before commits or task termination.
* Sub-200ms latency overhead during agent execution loops.

---

## Considered Options
1. **Human Oversight Only**: Rely on the user to visually inspect every terminal command.
2. **Git Pre-commit Hooks Only**: Traditional git hooks in `.git/hooks/` (only protects git operations, does not guard general shell actions or file editing).
3. **Antigravity Lifecycle Hooks Subsystem (`hooks.json`)**: Deep lifecycle interception integrated into the agent loop (`PreToolUse`, `PostToolUse`, `Stop`).

---

## Decision Outcome
**Chosen Option**: Option 3 (Antigravity Lifecycle Hooks Subsystem).

### Architecture & Components
* **Configuration**: `.antigravity/hooks.json` (mirrored in `.agents/hooks.json`).
* **Branch Guard** (`.antigravity/scripts/branch-guard.js`): Intercepts `PreToolUse` on `run_command` and denies direct push, force-push, deletion, or commit on `main`, `master`, `prod*`, `release/*`, `stable`.
* **Shell Sandbox** (`.antigravity/scripts/shell-sandbox.js`): Intercepts `PreToolUse` on `run_command`, denies high-risk destructive commands, confines execution to workspace directories, and prompts on global installations.
* **Lint Enforcer** (`.antigravity/scripts/lint-enforcer.js`): Intercepts file edits (`PostToolUse`), denies commits if syntax errors exist (`PreToolUse`), and forces continuation on `Stop` if syntax issues remain unresolved.

### Positive Consequences
* Zero-trust safety boundary enforcing deterministic rules before commands touch the host shell.
* Agent self-corrects autonomously when syntax errors are detected at the `Stop` event.

---

## Invariants & Compliance Rules
1. Hooks configuration must remain active and functional in all environments.
2. All hook scripts must remain zero-dependency Node.js scripts.
3. Protected branches cannot be modified directly; all changes must flow through feature branches.
