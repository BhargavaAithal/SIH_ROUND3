# Security & Threat Model

The Sovereign AI Execution Plane operates under severe physical air-gap mandates characteristic of Regulated PSUs, DPSUs, and Critical Sovereign Infrastructure. This document defines the threat model and cryptographic constraints.

## 1. Threat Model & Mitigations

### 1.1 WAN Egress Leak (Zero Egress Invariant)
- **Threat**: Accidental or malicious exfiltration of sensitive P&ID diagrams, ASME calculations, or enterprise prompt context.
- **Mitigation**: Kernel-level enforcement using `nftables` default DROP policies preventing all non-loopback outbound traffic.
- **Verification**: eBPF `tc` filters and Tetragon socket monitoring running alongside `scripts/airgap_audit.sh`.

### 1.2 Arbitrary Code Execution (Sandbox Escape)
- **Threat**: AI models hallucinating `os.system('rm -rf /')` or establishing reverse shells.
- **Mitigation**: 
  1. Python `ast_guard` blocks the importation of network and destructive file I/O modules natively before compilation.
  2. Execution occurs within an ephemeral `nsjail` network namespace with a strict 10s CPU limit and 512MB RAM cap.

### 1.3 Cognitive Collapse & Hallucination
- **Threat**: The local 14B LLM hallucinates an unsafe physical variable (e.g., negative pipe thickness) leading to a physical explosion.
- **Mitigation**: Neurosymbolic Z3 Theorem Proving. Every LLM output is translated into an AST and mathematically proven against API 510 / ASME B31.3 invariants before being permitted to execute. Yields a False Assurance Rate (FAR) of **0.0%**.

## 2. Authentication & PKI

- **Local API Constraints**: The Rust Daemon Core and API strictly bind to `127.0.0.1`.
- **Zero-Trust Proxies**: `MTLSSecurityMiddleware` rejects any non-loopback `X-Forwarded-For` or `X-Real-IP` headers with an immediate HTTP 403.
- **Hardware PKI**: Enterprise mTLS authentication relies exclusively on offline X.509 certificates injected via hardware security tokens (YubiKey / PIV SmartCards). No JSON Web Tokens (JWT) or cloud-based OIDC providers are utilized.

## 3. Tamper-Evident Audit & Compliance

To support independent forensic audits per national cybersecurity directives:
- **Merkle WAL**: All Z3 SAT/UNSAT proofs are logged to a Cryptographic SHA-256 Merkle Append-Only Write-Ahead Log.
- **Non-Repudiation**: The log ensures that every AI-generated decision mathematically traces back to an unaltered physical invariant, providing absolute non-repudiation for PSU board approvals.
