# ADR-0016: User-Governed Agentic DAG Planning, Step Pruning & Brokered Execution

- **Status**: Accepted
- **Date**: 2026-09-21
- **Authors**: SMITRACE Architecture Team
- **Tags**: #agentic #dag #planning #user_governance #step_pruning #replanning #execution_broker

## Context & Problem Statement
Traditional conversational AI systems either operate in brittle, unguided auto-regressive loops or enforce rigid, hardcoded sequential pipelines (e.g. fixed ingestion $\to$ calculation $\to$ Word doc generation). In enterprise industrial applications, user requests are dynamic: a user may only want a quick calculation verification without compiling a 40-page Word memo, or they may provide clean tabular data and want to prune redundant OCR steps.

Furthermore, agents must use local tools iteratively (file operations, sandbox code execution, spreadsheet formula evaluation, knowledge retrieval) and handle partial failures without aborting the entire mission.

## Decision Drivers
- **Goal-Driven Autonomy**: The agent must plan out multi-step work dynamically based on arbitrary natural language instructions.
- **User Intervention & Step Pruning**: Users must have explicit visibility into the execution plan and the authority to prune, edit, or reorder intermediate layers prior to or during execution.
- **Iterative Tool Execution**: Agents must invoke local tools, evaluate intermediate outputs against success criteria, and self-correct.
- **Dynamic Replanning with Sibling Protection**: When tool execution yields unexpected evidence or counterexamples, the agent must update only the invalidated dependent sub-tree without restarting valid sibling branches.
- **Brokered Sandboxed Security**: Untrusted execution must run in isolated, policy-controlled workers separated from artifact compilation.

## Decision Outcome
Adopt a **Plan-First, User-Governed Dynamic Execution Architecture** paired with a **Policy-Controlled Execution Broker**:

### Implementation Architecture
1. **Versioned Execution DAG**:
   When a user submits an instruction, the `PlanEngine` decomposes the goal into a DAG of typed Work Units ($W_i$) complete with dependencies, candidate tools, expected output artifacts, confidence thresholds, and estimated compute cost.
2. **User Intervention Gate (Pruning, Editing, Reordering)**:
   The UI presents the proposed DAG before execution starts. The user can:
   - **Prune**: Deselect non-essential intermediate nodes (e.g. skip OCR or omit PPT deck generation).
   - **Edit**: Modify task parameters, constraints, or tool bindings.
   - **Reorder**: Adjust execution precedence and dependencies.
3. **Iterative Autonomous Execution Loop**:
   Workers execute assigned local tools (`file_read`, `file_write`, `code_execution`, `spreadsheet_work`, `internal_search`, `math_solve`). Intermediate results are evaluated against explicit success criteria before promoting state.
4. **Dynamic Replanning Engine**:
   If an intermediate tool fails or returns contradictory physical evidence, the `ReplanningEngine` calculates an invalidation diff:
   $$\text{Invalidate}(A) = \{A\} \cup \bigcup_{A' \in \text{Children}(A)} \text{Invalidate}(A')$$
   Dependent child nodes are replanned, while unaffected sibling branches remain committed (**Sibling Protection Guarantee**).
5. **Brokered Execution Fabric**:
   Code execution and deliverable generation are brokered through an authorization gate enforcing CPU, RAM, and network boundaries (`--network none`).

### Positive Consequences
- True agentic flexibility: the system adapts to whatever the user requests rather than forcing a single rigid pipeline.
- Total transparency and user control over compute resources and intermediate deliverables.
- Resilient recovery from tool errors without wasting time on full pipeline restarts.
- Strict containment of untrusted code inside ephemeral OS sandboxes.

### Negative Consequences / Tradeoffs
- Requires maintaining dual-graph state machines and handling DAG synchronization in the UI.
- Replanning requires heuristic checks to prevent infinite re-plan loops (enforcing a max 3-turn limit before escalating to `WAITING_HUMAN`).

## Invariants & Compliance Rules
1. **User Governance Invariant**: The agent must never execute high-impact or irreversible actions without rendering the execution plan and honoring user-pruned intermediate steps.
2. **Sibling Protection Invariant**: Replanning an invalidated node must never re-execute or invalidate independent, verified sibling nodes.
3. **Brokered Execution Invariant**: All code execution must route through the `ExecutionBroker`; direct un-sandboxed shell or subprocess execution by agents is strictly forbidden.
