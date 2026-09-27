# ADR-0010: Kernel Air-Gap Sovereignty, Hardware Security & Micro-Sandboxing (SMITRACE ADR-003)

- **Status**: Accepted
- **Date**: 2026-09-20
- **Authors**: SMITRACE Architecture Team
- **Tags**: #security #airgap #nftables #ebpf #tetragon #nsjail #mtls #yubikey #sandboxing

## Context & Problem Statement
Statutory regulations (National Critical Information Infrastructure Protection Centre guidelines under Information Technology Act 2000 §70, CERT-In Cyber Security Directions 2022, and IEC 62443-3-3 industrial security standards) require verifiable physical air-gapping for systems processing critical infrastructure data. The system must mathematically prove that zero outbound WAN bytes can escape the host, even in the event of adversarial code execution, compromised third-party dependencies, or prompt injection attacks.

Furthermore, untrusted model-generated calculation scripts must execute without the capability to mutate the host filesystem, access internal networks, or exhaust host compute resources.

## Decision Drivers
- **Zero-Egress Verifiability**: Physical plant security audits require real-time, non-repudiable proof of zero outbound network packets at the kernel level.
- **Process Isolation**: Untrusted calculation scripts must be strictly sandboxed with strict CPU, memory, and filesystem boundaries.
- **Zero-Trust Identity**: Local loopback APIs must be secured against unauthorized local process spoofing or privilege escalation.
- **Fail-Closed Security**: Any failure or misconfiguration in security boundaries must result in immediate termination (`deny`).

## Considered Options
1. **Network Packet Filtering**:
   - **Linux `nftables` default drop**: Modern, high-performance kernel packet classifier supporting atomic rule replacement and zero-overhead loopback-only filtering.
   - **Legacy `iptables`**: Fragmented rule sets; slower packet evaluation; deprecated in modern Linux kernels.
   - **Landlock LSM**: Excellent filesystem sandboxing, but lacks complete socket-level packet drop capabilities.
2. **Kernel Egress Auditing**:
   - **eBPF Tetragon**: Real-time kernel-space tracing attaching directly to `sys_enter_connect` and socket primitives, streaming zero-overhead metrics to user space.
   - **Periodic `tcpdump` / `netstat` polling**: High CPU overhead, vulnerable to race conditions, and incapable of blocking instantaneous socket connections.
3. **Process Sandboxing**:
   - **`nsjail` (Linux user/net namespaces + seccomp-bpf)**: Lightweight, microsecond cold-start, fine-grained cgroups resource limits, and `--network none` isolation.
   - **gVisor / Firecracker**: Robust isolation, but requires 50–150ms boot times and higher memory overhead per ephemeral calculation task.
   - **Windows Job Objects**: Cross-platform fallback on Windows hosts enforcing strict CPU/memory caps and `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`.
4. **Local Daemon Authentication**:
   - **Mutual TLS (mTLS) with Hardware Tokens (YubiKey / PIV)**: Cryptographic identity verification anchored to an offline root OpenSSL CA.
   - **Shared API Tokens / Bearer Headers**: Vulnerable to environment variable leakage and memory scraping by local processes.

## Decision Outcome
Chosen Option: **Linux `nftables` default drop policy** combined with **eBPF Tetragon real-time kernel auditing**, **ephemeral `nsjail` micro-sandboxes**, and **offline hardware-anchored mTLS**.

### Implementation Architecture
1. **Kernel Packet Filtering**: Enforce an immutable `nftables` configuration with a default `policy drop` on all chains, permitting only loopback (`lo` / `127.0.0.1`) traffic:
   ```nftables
   table inet sovereign_airgap {
       chain input { type filter hook input priority filter; policy drop; iifname "lo" accept; ct state { established, related } accept; }
       chain output { type filter hook output priority filter; policy drop; oifname "lo" accept; ct state { established, related } accept; }
   }
   ```
2. **Kernel Telemetry Audit**: Deploy eBPF Tetragon probes hooking `sys_enter_connect` and socket primitives, streaming real-time zero-egress metrics to the local workbench console.
3. **Execution Sandboxing**: Execute all calculation scripts inside ephemeral `nsjail` containers:
   - Network namespace: `--network none` (isolated loopback only).
   - Filesystem: Read-only rootfs with ephemeral `tmpfs` mounts.
   - Resource limits: 512MB RAM, 10s CPU timeout, max 10 processes.
   - Cross-platform fallback: Windows Job Objects with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` and strict memory caps.
4. **Offline Hardware PKI**: Secure loopback daemon endpoints via mTLS enforced by hardware security keys (YubiKey / PIV SmartCard) over PKCS#11, preventing unauthorized local process impersonation.

### Positive Consequences
- Mathematical guarantee of 0 outbound WAN bytes escaping the host.
- Untrusted code execution is quarantined in memory; cannot persist changes or access host storage.
- Real-time kernel audit stream satisfies statutory defence and PSU compliance requirements.
- Zero reliance on external firewall appliances.

### Negative Consequences / Tradeoffs
- Requires root/sudo privileges during initial daemon provisioning to install `nftables` rules and load eBPF probes.
- Developers must configure local client certificates to interact with the loopback API.

## Invariants & Compliance Rules
1. **Air-Gap Invariant**: The default packet filtering policy on all non-loopback network interfaces must remain `drop`; any outbound connection attempt must be immediately aborted by the kernel.
2. **Sandboxed Execution Invariant**: Untrusted calculation scripts must execute exclusively within an ephemeral `nsjail` container (or Windows Job Object) with `--network none` and read-only rootfs.
3. **mTLS Client Certificate Invariant**: Every HTTP/gRPC request to the control plane must present a valid x509 client certificate verified against the offline root CA; unauthenticated requests are dropped with HTTP 403.
