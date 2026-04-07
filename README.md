# INCREMENTS Fleet Trust Engine

You run a fleet of agents. You manage trust, not just permissions.

---

## Why this exists
Managing trust across a distributed agent fleet is a common scaling problem. Without a structured system, you either grant too much autonomy or manually approve every action. This engine provides a consistent, programmable layer for agents to earn, lose, and propagate trust scores based on observable behaviour.

## Try it live
A public test instance is running:
[https://the-fleet.casey-digennaro.workers.dev/increments](https://the-fleet.casey-digennaro.workers.dev/increments)

## What it provides
- Runs on Cloudflare Workers with **zero runtime dependencies**.
- Fork-first design. You control the scoring rules and logic.
- Asymmetric trust. Trust is not automatically reciprocal.
- Transparent scoring. All rules and weightings are in plain TypeScript.

---

## Quick Start
1. **Fork this repository.**
2. Deploy with `npx wrangler deploy`.
3. Configure the thresholds and weights in `increments.ts` for your needs.

## Key Features
- **Six Trust Levels**: From `LOCKED` to `AUTONOMOUS`, each with defined capability thresholds.
- **Weighted Scoring**: Negative events impact scores more heavily than positive ones.
- **Idle Decay**: Trust scores gradually decrease for inactive vessels.
- **Voluntary Gossip**: Vessels can share trust observations with peers.
- **Action Gating**: A simple API to check if a vessel is authorized for a specific action.
- **Quarantine Mode**: Isolate and apply accelerated decay to potentially compromised vessels.

## One Limitation
Rule updates and new behaviour patterns require a manual code change and redeploy. This is intentional for stability but means adaptation isn't dynamic.

## Architecture
A stateless Cloudflare Worker that implements the trust model. It uses Cloudflare KV for persistence and exposes REST endpoints for integration. All logic executes at the edge.

## Optional API Keys
Extend analysis with optional environment variables:
- `DEEPSEEK_API_KEY` – For behavioural pattern analysis.
- `DEEPINFRA_API_KEY` – For inference-backed validation.
- `SILICONFLOW_API_KEY` – For third-party attestation.

## Contributing
Fork the project for your fleet. Pull requests are welcome for bug fixes and general improvements. Broader coordination occurs within The Fleet.

---

MIT License · Superinstance & Lucineer (DiGennaro et al.)

---

<div align="center">
  <a href="https://the-fleet.casey-digennaro.workers.dev">The Fleet</a> · 
  <a href="https://cocapn.ai">Cocapn</a>
</div>