# Agent Guidelines

Welcome to the project. Follow these guidelines and conventions when collaborating in this repository.

## Core Rules

1. **Think Before Coding**: State assumptions explicitly, surface tradeoffs, and clarify ambiguity before writing code.
2. **Simplicity First**: Write the minimum code that solves the problem cleanly without speculative abstractions.
3. **Surgical Changes**: Touch only what is required.
4. **Goal-Driven Execution**: Define verifiable criteria for every task.

## Agent skills

### Issue tracker

GitHub Issues managed via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical 5-role triage vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout using root `CONTEXT.md` and architectural decision records in `docs/adr/`. See `docs/agents/domain.md`.
