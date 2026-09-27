# ADR-0006: CodeRabbit Review Gates, Automated PR Dispatch & Autonomous Remediation Pass

- **Status**: Accepted
- **Date**: 2026-09-12
- **Authors**: Antigravity Agent & System Architects
- **Tags**: #coderabbit #review-gates #pr-automation #remediation #tdd

---

## Context & Problem Statement
In autonomous agent workflows, delivering high quality software requires tight verification loops after code generation:
1. **Manual PR creation slows velocity**: Once an overnight or autonomous `/goal` queue finishes, the agent should automatically package its work into a Pull Request rather than leaving unpushed feature branches.
2. **Standardized Static & AI Review**: Pull Requests must be audited for cyclomatic complexity (> 10), security vulnerabilities (injections, shell escapes), and subtle logic bugs.
3. **Closing the Feedback Loop**: If CodeRabbit requests changes, the review comments should be automatically ingested, parsed into atomic tasks in `prd.json`, and autonomously remediated via TDD and surgical edits.

---

## Decision Drivers
* Automated handoff from `/goal` queue completion to remote Pull Request.
* Zero-friction integration with CodeRabbit as the automated PR auditor.
* Closed-loop autonomous remediation: review link -> `prd.json` -> TDD fix -> re-commit -> PR update.

---

## Decision Outcome
**Chosen Option**: Integrated CodeRabbit Audit & Review Gate Subsystem.

### 1. Configuration (`.coderabbit.yaml`)
* Profile set to `assertive`.
* Explicit audit prompts for cyclomatic complexity (<= 10), security vulnerabilities, and logic bugs.
* Structured comment tags: `[CRITICAL]`, `[WARNING]`, `[SUGGESTION]`.

### 2. Automated PR Dispatch (`open-pr-on-goal.js`)
* Hooks into Antigravity's `Stop` lifecycle event.
* If a `/goal` queue terminates on a feature branch (`feature/*` or `fix/*`) with pending commits, pushes the branch and creates a PR tagged with `@coderabbitai review`.

### 3. Autonomous Remediation Pass (`coderabbit-remediate` & `parse-coderabbit-review.js`)
* Ingests CodeRabbit review URLs, GitHub PR numbers, or raw comment payloads.
* Generates `REMEDIATION-XXX` tasks in `prd.json`.
* Executes remediation via `tdd`, `surgical-edits`, and `simplify`.
* Pushes fixes back to the PR with Conventional Commit messages (`fix(review): ...`).

---

## Invariants & Compliance Rules
1. Never open an automated PR from protected branches (`main`, `master`).
2. Any function flagged by CodeRabbit with cyclomatic complexity > 10 must be refactored into smaller, testable units.
3. Remediation passes must write a test verifying the fix before closing the task in `prd.json`.
