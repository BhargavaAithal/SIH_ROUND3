# ADR-0014: Control Plane Concurrency, Resilient Leases, Staged Quarantining & Fault Isolation (SMITRACE ADR-007)

- **Status**: Accepted
- **Date**: 2026-09-20
- **Authors**: SMITRACE Architecture Team
- **Tags**: #control_plane #concurrency #sqlite_wal #leases #staging #fault_isolation #audit #merkle

## Context & Problem Statement
In multi-worker industrial environments running concurrent vision extraction, Z3 theorem proving, and report compilation, the control plane must maintain absolute linear event provenance, eliminate database lock contention (`SQLITE_BUSY`), autonomously recover from worker crashes (OOM/SIGKILL), quarantine candidate deliverables until formally verified, and contain failures without paralyzing independent plant operations.

Under the Oil Industry Safety Directorate (OISD) standards, Petroleum and Explosives Safety Organization (PESO) SMPV Rules 2016, Factories Act 1948 §31, and NCIIPC guidelines under Information Technology Act 2000 §70, automated engineering recommendations are legally inadmissible unless backed by an unbroken, tamper-evident write-ahead log and an accountable human sign-off protocol.

## Decision Drivers
- **Linear Event Provenance**: Legal admissibility requires a strictly linear, fork-free event log with SHA-256 hash chaining from genesis block 0 to the tip.
- **Lock-Free Concurrency**: Up to 50 concurrent reader threads must access projection tables without experiencing database busy locks or stalling write transactions.
- **Worker Crash Resilience**: If a worker process crashes mid-execution, its leased task must be autonomously reclaimed without operator intervention.
- **Deliverable Integrity**: Unverified or corrupted draft documents must never enter permanent statutory archives or be accessible for plant maintenance issuance.
- **Fault Isolation**: An invariant failure in one calculation branch must not stall independent parallel maintenance workflows.

## Considered Options
1. **Database Write Concurrency**:
   - **Serialized SQLite WAL Writer Actor (Synchronous Barrier)**: Single dedicated write thread with `BEGIN IMMEDIATE` transactions; callers block on synchronous `threading.Event` barriers. Guarantees linear event sequence and eliminates `SQLITE_BUSY`.
   - **Multiple Independent Writer Connections with Retry Loops**: Prone to lock contention, non-deterministic commit ordering, and potential audit log forks.
2. **Crash Recovery Mechanisms**:
   - **Autonomous Heartbeat Watchdog with 3-Strike Escalation**: 60s lease TTL with 15s worker heartbeats; autonomous reaper reclaims expired leases, escalating to `WAITING_HUMAN` after 3 failures.
   - **Manual Administrative Cleanup**: Causes operational downtime while waiting for plant engineers to manually identify and reset crashed worker tasks.
3. **Deliverable Staging Protocols**:
   - **Two-Phase Ephemeral Staging with Atomic Commit**: Writes uncommitted candidates to `staging/{lease_id}/`; atomically moves artifacts (`os.replace`) to `cases/{case_id}/` strictly after formal Z3 proofs pass.
   - **Direct In-Place Case Writes**: Risks leaving partial, corrupted, or unverified documents in permanent case storage.
4. **Assurance Plane Isolation**:
   - **Process-Isolated Subprocess Pool**: Dedicated `ProcessPoolExecutor` bounded by a 5.0-second hard wall-clock kill switch; prevents solver crashes or hangs from destabilizing the control plane.
   - **In-Process Thread Pool**: Native C++ solver crashes (e.g. out of memory) terminate the entire daemon process.

## Decision Outcome
Chosen Option: **Serialized SQLite WAL Writer Actor with Synchronous Barriers**, paired with an **Autonomous Lease Watchdog**, **Two-Phase Ephemeral Staging**, a **Process-Isolated Assurance Pool**, and a **Surgical DAG Branch Suspension Protocol**.

### Implementation Architecture
1. **Serialized SQLite WAL Writer Actor**:
   - All state transitions and event log appends route through a single-writer background thread holding an exclusive persistent write connection with `BEGIN IMMEDIATE` transactions.
   - Callers block on a synchronous `threading.Event` barrier until the writer commits and confirms persistence (5.0s timeout), guaranteeing read-after-write consistency.
2. **Autonomous Lease Watchdog & 3-Strike Escalation**:
   - Enforces a 60-second lease TTL (`lease_expires_at`) renewed via 15-second worker heartbeats (`last_heartbeat`).
   - A background watchdog thread polls every 10 seconds, sweeping expired leases back to `READY` and incrementing `retry_count`.
   - Tasks exceeding 3 retries transition to `WAITING_HUMAN` to prevent poison-pill crash loops.
3. **Two-Phase Ephemeral Staging with Atomic Commit**:
   - Generated engineering deliverables write strictly to an isolated staging sandbox (`staging/{lease_id}/`).
   - Promotion to `cases/{case_id}/` via atomic $O(1)$ `os.replace` occurs strictly after formal AST and Z3 SMT proofs pass.
   - Staging sandboxes are purged immediately upon verification failure, exception, or lease expiration.
4. **Process-Isolated Assurance Pool**:
   - Executes AST guards and Z3 SMT proofs in an isolated subprocess pool with a 5.0-second hard wall-clock kill switch.
   - Solver timeouts strictly emit `FAIL (SMT_TIMEOUT)` with zero heuristic or floating-point fallback, preserving the 0.0% False Assurance Rate.
5. **Cold-Boot Genesis-to-Tip Replay**:
   - On daemon cold boot, traverses `event_log` from block 0 to the tip, verifying linear SHA-256 continuity.
   - Automatically reclaims orphaned `EXECUTING` tasks from prior sessions to `READY`.
   - On projection table desynchronization, deterministically rebuilds state views by replaying the immutable event log.
6. **Surgical DAG Branch Suspension & Statutory Human Override**:
   - When a work unit experiences a fatal failure, only its direct downstream dependents transition to `BLOCKED`; independent sibling branches continue executing uninterrupted.
   - Human overrides require an immutable `HUMAN_OVERRIDE` ledger event containing `operator_id`, resolution mode (`RETRY_WITH_NEW_INPUTS`, `FORCE_VERIFIED`, or `ABORT_BRANCH`), physical engineering justification ($\ge 20$ characters), and an HMAC-SHA256 signature satisfying OISD, PESO, and NCIIPC statutory mandates.

### Positive Consequences
- Zero SQLite locking errors (`SQLITE_BUSY`) under heavy concurrent worker loads.
- Guaranteed protection of statutory archives against unverified or corrupted draft documents.
- Continuous operation of compliant plant workflows even when one isolated calculation branch stalls.
- Complete non-repudiable forensic chain of custody for court-of-inquiry accident investigations.

### Negative Consequences / Tradeoffs
- Serialized writer actor introduces a small bottleneck under extreme write concurrency (>5,000 writes/sec); mitigated by batching event commits.
- Staging directory requires filesystem-level atomic rename support (`os.replace` on the same mount volume).

## Invariants & Compliance Rules
1. **Serialized Writer Invariant**: All mutations to the authoritative state ledger must execute through the serialized writer actor using `BEGIN IMMEDIATE` transactions; direct out-of-band writes to the SQLite database are strictly prohibited.
2. **Two-Phase Commit Invariant**: Unverified draft deliverables must never be written directly to permanent case directories; promotion requires passing formal Z3 verification followed by an atomic filesystem rename.
3. **Statutory Override Invariant**: Any manual transition of a `WAITING_HUMAN` state must be recorded as an immutable `HUMAN_OVERRIDE` event in the Merkle event log, including verified operator ID, physical justification ($\ge 20$ chars), and an HMAC-SHA256 signature.
