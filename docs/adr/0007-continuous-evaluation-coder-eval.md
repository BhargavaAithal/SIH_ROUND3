# ADR-0007: Continuous Evaluation Infrastructure via Coder-Eval & CI/CD Quality Gates

- **Status**: Accepted
- **Date**: 2026-09-17
- **Authors**: Antigravity Agent & System Architects
- **Tags**: #coder-eval #evaluation #ci-cd #benchmarking #telemetry #a-b-testing

---

## Context & Problem Statement
As underlying LLM models drift, undergo fine-tuning, or update across versions, coding agents risk silent regression:
1. **Semantic Routing Failure**: The agent might silently stop triggering installed skills semantically from natural language prompts.
2. **Instruction Following & Boundary Erosion**: The agent might begin ignoring immutable boundaries (e.g. attempting global package installations or raw SQL interpolations).
3. **API & Syntax Hallucination**: The agent might hallucinate deprecated signatures or invent non-existent APIs for newly released frameworks.
4. **Token Economics Drift**: Runaway tool loops or un-scoped context injection could exponentially increase inference costs and trigger premature context compaction.

Static general benchmarks (such as SWE-bench or SkillsBench) evaluate fixed datasets on general intelligence, but fail to evaluate the repository owner's custom skills, personas, and safety boundaries.

---

## Decision Drivers
* Real agent execution against declarative YAML evaluation tasks defined specifically by the repository owner.
* Automated regression gating integrated directly into GitHub Actions CI/CD.
* Comprehensive 4-dimensional evaluation:
  1. `skill_triggered`: Semantic routing integrity.
  2. `Weighted Scoring`: 0.0–1.0 continuous correctness rubric.
  3. `Telemetry Tracking`: Auditing token economics and tool call counts.
  4. `A/B Experimentation`: Testing modifications to `AGENTS.md` and contextual glob rules.

---

## Decision Outcome
**Chosen Option**: Adopt `coder-eval` continuous evaluation framework with declarative task suites and GitHub Actions quality gates.

### 1. Configuration & Task Suites (`evals/`)
* Root configuration in `evals/coder-eval.config.yml`.
* Quality thresholds:
  - Minimum weighted score: `0.85` (85.0%).
  - Semantic skill trigger required: `true` (100% required).
  - Maximum token consumption threshold: `12,000` tokens per task.
* Declarative suites:
  - `evals/tasks/skill-routing.yml`: Semantic trigger integrity.
  - `evals/tasks/code-generation.yml`: AST syntax integrity and safety guardrails.
  - `evals/tasks/ab-experiments.yml`: Prompt and rule scoping A/B benchmarks.

### 2. Evaluation Engine (`scripts/coder-eval-runner.js`)
* Standalone, zero-dependency Node.js benchmark engine.
* Calculates semantic match confidence using token vector similarity against `SKILL.md` frontmatter descriptions.
* Evaluates code outputs against AST, regex, and forbidden pattern rubrics.
* Generates `evals/results/report.json` and `evals/results/summary.md`.

### 3. CI/CD Quality Gate Workflow (`.github/workflows/coder-eval.yml`)
* Executes on Pull Requests, pushes to `main`/`master`, and weekly cron schedules.
* Enforces pipeline gating: fails build if semantic routing fails or score drops below 0.85.
* Publishes evaluation markdown table to GitHub Actions Step Summary.

---

## Invariants & Compliance Rules
1. Every new skill added to `.agent/skills/` must include a corresponding semantic routing task in `evals/tasks/skill-routing.yml`.
2. Any PR modifying `AGENTS.md` or `.agent/rules/` must pass the `coder-eval` quality gate without score regression.
3. If an underlying model update causes a skill to stop triggering semantically, the CI pipeline must fail immediately to prevent deploying a degraded agent configuration.
