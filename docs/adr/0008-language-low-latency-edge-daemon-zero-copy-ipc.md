# ADR-0008: Language, Low-Latency Edge Daemon & Zero-Copy IPC Architecture (SMITRACE ADR-001)

- **Status**: Accepted
- **Date**: 2026-09-20
- **Authors**: SMITRACE Architecture Team
- **Tags**: #architecture #rust #ipc #latency #airgap #control_plane

## Context & Problem Statement
SMITRACE operates as an air-gapped Sovereign AI Execution Plane within high-security Public Sector Undertaking (PSU) defence and critical infrastructure environments. The edge daemon acts as the sovereign control plane listening strictly on loopback interfaces (`127.0.0.1`) to orchestrate multi-modal raster schematic processing, neurosymbolic Z3 SMT physical verifications, headless document compilation, and local SLM inference multiplexing.

To meet strict industrial runtime SLAs, the system requires:
1. **Sub-millisecond Tail Latency ($p_{99.9} < 1.0\text{ms}$)** under 100,000 requests/sec with zero Stop-The-World (STW) garbage collection pauses.
2. **Sub-Microsecond Zero-Copy IPC ($< 250\text{ns}$)** for high-throughput streaming of 4000x3000 P&ID image matrices (48MB uncompressed RGB tiles) and AST evidence graphs between processes.
3. **Zero outbound network egress** enforced by Linux `nftables` DROP policies, eBPF Tetragon socket filters, and static single-binary packaging with zero external dynamic runtime dependencies.
4. **Deterministic memory overhead (< 25MB RSS idle)** and sub-50ms cold boot initialization time on resource-constrained industrial edge servers.

## Decision Drivers
- **Tail Latency Predictability**: Industrial plant monitoring cannot tolerate non-deterministic GC pauses that induce missed telemetry frames or delayed safety interlocks.
- **IPC Throughput**: High-resolution 48MB schematic rasters and dense spatial graphs must transfer across process boundaries in sub-microsecond intervals.
- **Air-Gapped Portability**: Packaging must produce a self-contained, statically linked binary capable of executing without dynamic system dependencies on hardened Linux servers.
- **Resource Footprint**: Control plane overhead must remain minimal (<25MB RSS) to preserve maximum RAM and VRAM for vision pipelines and local SLM inference.

## Considered Options
1. **Rust (Axum + Tokio)**: Statically linked single `musl` ELF binary (~6.5MB), RAII deterministic memory management, zero GC pauses, direct zero-copy slice FFI (18ns), $p_{99.9} = 650\mu\text{s}$, 8.4MB idle RSS.
2. **Go (Fiber + Netpoller)**: Tri-color mark-sweep garbage collector exhibits tail-latency spikes ($p_{99.9} = 14.2\text{ms}$), cgo stack-switching overhead (185ns/call).
3. **C++20 (Drogon + Boost.Asio)**: Comparable raw performance ($p_{99.9} = 520\mu\text{s}$), but lacks compile-time memory safety invariants, presenting spatial memory corruption risks in mission-critical sovereign deployments.
4. **Python (FastAPI + uvloop)**: Transitional runtime; suffers from GIL lock contention, 78MB+ idle RSS, and $p_{99.9} = 45\text{ms}$.

## Decision Outcome
Chosen Option: **Rust (Axum + Tokio)** as the target control plane architecture, supported by POSIX shared memory ring buffers and Unix Domain Sockets for inter-process communication.

### Implementation Architecture
1. **Target Control Plane**: Transition the production master daemon to **Rust (Axum + Tokio)** compiled as a static `musl` binary (<10ms boot time, 8.4MB RSS, zero GC pauses).
2. **Zero-Copy IPC**: Implement high-throughput POSIX shared memory ring buffers via `shm_open` and `mmap` (`/dev/shm/smitrace_matrix_shm`) with atomic sequence counters for streaming large P&ID arrays and AST graphs (<250ns transfer latency).
3. **Control Messaging**: Standardize on Unix Domain Sockets (UDS) with gRPC Protocol Buffers (`proto/smitrace.proto`) for inter-process control communication between the daemon and Python domain workers (Z3 SMT solver and vLLM).

### Positive Consequences
- Deterministic sub-millisecond tail latency ($p_{99.9} = 650\mu\text{s}$) with zero garbage collection pauses.
- Sub-microsecond (<250ns) data transfer for 48MB raster schematic matrices via shared memory.
- Minimal idle memory consumption (8.4MB RSS), maximizing resources available for 14B reasoning models.
- Single static `musl` binary eliminates shared library dependency drift in air-gapped environments.

### Negative Consequences / Tradeoffs
- Requires maintaining Protocol Buffer definitions (`proto/smitrace.proto`) and synchronizing schemas across Rust and Python codebases.
- Cross-compilation toolchains must be maintained for target deployment environments.

## Invariants & Compliance Rules
1. **Static Linking Invariant**: The edge daemon binary must compile against `musl` libc with zero dynamic library dependencies (`ldd` must report "not a dynamic executable").
2. **Zero-Copy Boundary Invariant**: Schematic image matrices exceeding 1MB must transfer exclusively via `/dev/shm/smitrace_matrix_shm` ring buffers; serialization over network sockets or standard pipes is strictly prohibited.
3. **Loopback Binding Invariant**: Daemon network listeners must bind strictly to `127.0.0.1` / `::1` or Unix domain sockets; binding to `0.0.0.0` or external interfaces is rejected at startup.
