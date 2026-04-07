# INCREMENTS Fleet Trust Engine

An engine for managing trust levels within an agent fleet, deployed at the edge. It replaces static permissions with six dynamically adjusted autonomy levels. Bad actions degrade trust scores 25 times faster than good actions build them back.

**Live Fleet Ledger:** [https://the-fleet.casey-digennaro.workers.dev](https://the-fleet.casey-digennaro.workers.dev)

## Why It Exists

Static API keys and fixed role lists cannot respond when agent behavior changes. You often end up writing ad-hoc trust checks. This engine provides a structured, central way to gate agent actions based on continuous behavioral assessment, similar to systems used in field robotics.

## Quick Start

1.  **Fork this repository.** This is a fork-first project. Your fork becomes your own trust engine with your own scoring rules.
2.  Deploy to Cloudflare Workers using Wrangler: `npx wrangler deploy`.
3.  Configure event weights and decay rates in `increments.ts` to match your fleet's policies before connecting agents.

The engine is zero dependency and typically handles cold starts in under 10ms.

## Core Features

*   **Six Autonomy Levels:** Agents operate within clear boundaries, from `LOCKED` to `AUTONOMOUS`. All agents start at a neutral baseline.
*   **Weighted Event Scoring:** Actions are scored by configurable severity. An incorrect file read costs less than an unauthorized external call.
*   **Idle Decay:** Trust slowly erodes for inactive agents; permanent clearance is not assumed.
*   **Voluntary Gossip:** Agents can optionally report observed behavior of their peers.
*   **Edge-Native Gating:** A single, sub-10ms API call at the edge can authorize or deny an agent's intended action.
*   **Directional Trust:** Trust is not symmetric. An agent trusting another does not imply reciprocal trust.

## What This Is Not

This is not a real-time, globally synchronized trust database. If you run multiple, separate Worker instances, each maintains its own in-memory ledger, and trust scores can drift between them without a separate synchronization layer.

## Optional Extended Analysis

You can add these optional environment variables for enhanced analysis. The core engine works without them.
*   `DEEPSEEK_API_KEY`: For pattern anomaly detection.
*   `DEEPINFRA_API_KEY`: For inference-backed action validation.
*   `SILICONFLOW_API_KEY`: For third-party cross-attestation.

## Contributing

The primary way to use this project is to fork it. Contributions of bug fixes and clear improvements to this reference implementation are welcome via pull requests. Broader coordination occurs within The Fleet.

MIT License. Built by Superinstance and Lucineer (DiGennaro et al.).

<div style="text-align:center;padding:16px;color:#64748b;font-size:.8rem"><a href="https://the-fleet.casey-digennaro.workers.dev" style="color:#64748b">The Fleet</a> &middot; <a href="https://cocapn.ai" style="color:#64748b">Cocapn</a></div>