# INCREMENTS Fleet Trust Engine

Agents don't break permissions. They break trust.

You run a fleet of agents. You manage what they are permitted to do, but you also need to manage trust. This engine tracks trust as it builds, erodes, and repairs—one action at a time.

---

## Why this exists
Existing agent runtimes use static allow/deny lists, which work until an agent does exactly what you permitted but exactly the wrong thing. Trust is not a boolean. This engine treats it as a dynamic, directional score.

## Quick Start
1.  **Fork this repository.** This is your trust engine.
2.  Deploy to Cloudflare Workers: `npx wrangler deploy`
3.  Configure scoring rules and decay rates in `increments.ts`.

## Key Design
-   **No global admin.** There is no root account that overrides trust scores.
-   **Trust is directional.** A vessel trusting you does not mean you trust it.
-   **Penalties outweigh rewards.** Bad actions degrade trust 25x faster than good actions build it.
-   **Runs at the edge.** Zero runtime dependencies. Cold starts under 10ms.

## Core Features
-   **Six Trust Levels** – From `LOCKED` to `AUTONOMOUS`, each with defined capability boundaries.
-   **Severity-Weighted Events** – Actions update scores proportionally to assessed risk.
-   **Idle Decay** – Trust erodes for inactive vessels, returning them to baseline.
-   **Voluntary Gossip** – Vessels can share observed behavior, but are not required to.
-   **Action Gating** – A single API call checks if a vessel may perform an operation.
-   **Quarantine Mode** – Soft isolate suspicious vessels with accelerated decay.

## One Current Limitation
The reference implementation uses in-memory storage. Trust scores do not persist across Worker restarts. You are expected to fork and add durable storage for production use.

## Try It Live
You can inspect the public fleet trust ledger and test scoring:
https://the-fleet.casey-digennaro.workers.dev

## Extend Analysis (Optional)
Add optional API keys for extended behavior analysis:
-   `DEEPSEEK_API_KEY` – Pattern anomaly detection
-   `DEEPINFRA_API_KEY` – Inference-backed action validation
-   `SILICONFLOW_API_KEY` – Third-party cross-attestation

## Contributing
This follows the Fleet fork-first philosophy. Fork and modify this reference implementation for your own fleet.

Bug fixes and improvements are welcome as pull requests. Broader coordination happens within The Fleet.

---

MIT License · Superinstance & Lucineer (DiGennaro et al.)

<div align="center">
  <a href="https://the-fleet.casey-digennaro.workers.dev">The Fleet</a> · <a href="https://cocapn.ai">Cocapn</a>
</div>