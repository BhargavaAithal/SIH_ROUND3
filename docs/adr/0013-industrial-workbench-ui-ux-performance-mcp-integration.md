# ADR-0013: Industrial Workbench UI/UX Performance & Model Context Protocol (MCP) Integration (SMITRACE ADR-006)

- **Status**: Accepted
- **Date**: 2026-09-20
- **Authors**: SMITRACE Architecture Team
- **Tags**: #frontend #react #vite #zustand #mcp #telemetry #sse #canvas #webgl #industrial_ui

## Context & Problem Statement
Plant integrity engineers and safety inspectors require an intuitive, high-performance workbench to inspect dense industrial schematics, review formal mathematical proofs, monitor real-time execution logs, and generate compliant statutory documentation. The frontend must sustain 60 FPS rendering under 10,000+ vector nodes, operate 100% offline without CDN or external font dependencies, and interface seamlessly with external agent tooling via open protocol standards.

## Decision Drivers
- **Rendering Performance**: Navigating massive P&ID schematics (pan/zoom/highlight) must maintain 60 FPS without DOM thrashing or memory leaks.
- **Offline Sovereignty**: The web application bundle must be entirely self-contained; zero external HTTP/HTTPS calls to CDNs or font repositories are permitted.
- **Interoperability**: System capabilities (Z3 verification, topology querying, stress calculations, document compilation) must be exposed via standardized interfaces for autonomous agent execution.
- **Real-Time Observability**: Kernel air-gap status, worker lease heartbeats, and SMT solver states must stream continuously to the user interface.

## Considered Options
1. **Frontend Application Frameworks**:
   - **React 18 + Vite + Zustand**: Mature ecosystem, high-speed HMR, lightweight reactive state management, seamless integration with visualization libraries.
   - **Svelte 5 (Runes)**: Excellent fine-grained reactivity, but smaller ecosystem for specialized engineering canvas components.
   - **Rust Leptos (WASM)**: Ultra-high memory efficiency, but longer compilation cycles and complex DOM canvas bridging.
2. **Schematic Viewport Technologies**:
   - **Interactive SVG / HTML5 Canvas**: Low overhead, crisp vector rendering for up to 10,000 elements; immediate implementation choice.
   - **Pixi.js WebGL 2.0 / WebGPU**: Hardware-accelerated rendering with offscreen color picking buffers and Level-of-Detail (LOD) tiers; target roadmap for 50,000+ elements.
3. **Tool Interoperability Standards**:
   - **Model Context Protocol (MCP)**: Anthropic/open industry standard for exposing tools and resources via JSON-RPC 2.0; supports structured tool schemas and bidirectional messaging.
   - **Proprietary REST Endpoints**: Ad-hoc, lacks standard discovery and introspection contracts required by autonomous agents.
4. **Telemetry Streaming Protocols**:
   - **Server-Sent Events (SSE)**: Unidirectional, lightweight, native browser reconnection, optimal for streaming execution traces and air-gap metrics.
   - **WebSockets**: Bidirectional, but higher framing overhead and unnecessary complexity for unidirectional telemetry feeds.

## Decision Outcome
Chosen Option: **React 18 + Vite with Zustand state management** compiled as a self-contained offline bundle, integrated with an **Interactive SVG/Canvas Viewport**, an **In-Process Model Context Protocol (MCP) Server**, and **Server-Sent Events (SSE)** for real-time telemetry streaming.

### Implementation Architecture
1. **Offline Workbench Framework**: Single-page application in **React 18 + Vite** with **Zustand** store; compiled into static assets (`ui/dist/`) with zero external Google Fonts, CDN scripts, or tracking pixels.
2. **Schematic Viewport Engine**: Interactive SVG/Canvas viewport supporting smooth pan, zoom, symbol overlay, and Quick Action drawer, with a documented migration path to Pixi.js WebGL 2.0 / WebGPU for massive schematics.
3. **In-Process MCP Native Server**: Exposes production JSON-RPC 2.0 tool definitions:
   - `z3_formal_audit`: Executes Z3 SMT physical constraint verification.
   - `pid_topology_query`: Queries shortest paths, connected equipment, and valve isolation boundaries.
   - `asme_stress_calc`: Computes minimum wall thickness and retirement horizons.
   - `compile_ooxml_document`: Compiles validated `.docx` and `.xlsx` artifacts.
4. **Real-Time Telemetry Stream**: Server-Sent Events endpoint (`/api/v1/events`) backed by a ring-buffer log virtualizer streaming air-gap metrics, active lease countdowns, and SMT proof events at 1 Hz.

### Positive Consequences
- Immediate deployment on air-gapped field laptops and control room consoles with zero external network access.
- Standardized MCP interface allows any compliant agent harness to leverage SMITRACE's neurosymbolic verification tools.
- Real-time mathematical proof visibility builds operator trust and satisfies regulatory audit standards.

### Negative Consequences / Tradeoffs
- SVG rendering performance degrades when schematic complexity exceeds 15,000 vector elements, necessitating the planned WebGL/Pixi.js upgrade.
- Offline font bundling slightly increases initial asset payload size (~2.4MB).

## Invariants & Compliance Rules
1. **Zero-CDN Invariant**: The frontend build artifact must not contain any external HTTP/HTTPS resource URLs; all fonts, icons, and scripts must be bundled locally in `ui/dist/`.
2. **MCP Compliance Invariant**: All tools exposed to autonomous agents must adhere strictly to the Model Context Protocol (JSON-RPC 2.0) specification with validated input/output schemas.
3. **Telemetry Frequency Invariant**: The telemetry stream must deliver air-gap status and execution lease health updates at a frequency of at least 1 Hz during active analysis operations.
