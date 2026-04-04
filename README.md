# INCREMENTS Fleet Trust Engine

Trust-as-equipment extracted from NEXUS Edge-Native (SuperInstance/Edge-Native). Adapted for pure software fleet on Cloudflare Workers.

## Origin

INCREMENTS was designed for edge robotics — ESP32-S3 microcontrollers controlling physical actuators with safety-critical trust gating. This adaptation preserves the mathematical model while addressing software-fleet realities:

- **Event-count normalized** (not wall-clock) — 10K req/day vessel and 10/day vessel earn trust at the same rate per event
- **Severity-weighted BAD events** — `{SECURITY|SLA|INTEGRITY|COORDINATION, 0.0-1.0}` instead of binary
- **Idle decay** — 0.001/day trust decay when no events, floor at L0
- **Consecutive bad escalation** — 3+ consecutive bad events = 2x alpha_loss
- **Dynamic horizon** — high volatility extends trust memory (caution), low shortens (responsive)
- **Bonded collaborator bonus** — 1.5x trust gain when working through CRP-39 bonds
- **Quarantine = trust freeze + decay** — no gains while quarantined, slow penalty continues
- **Fleet trust propagation** — asymmetric directed graph, 0.85x attenuation per hop, 3-hop radius

## 6 Trust Levels

| Level | Min | Description | Capabilities |
|-------|-----|-------------|-------------|
| L0_MANUAL | 0.00 | Human-only control | read |
| L1_ADVISORY | 0.15 | Agent suggests, human decides | read, suggest |
| L2_ASSISTED | 0.30 | Agent acts with approval | read, suggest, act_approved |
| L3_SUPERVISED | 0.50 | Agent acts, human monitors | read, suggest, act_approved, act_monitored |
| L4_AUTONOMOUS | 0.70 | Agent acts independently | + act_autonomous |
| L5_FULL | 0.90 | Full autonomy, self-evolving | + self_modify |

## Endpoints

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Landing page |
| `/health` | GET | Health check |
| `/api/trust/compute` | POST | Record events, compute trust |
| `/api/trust/fleet` | GET | All vessel trust states |
| `/api/trust/edge` | POST | Record trust graph edge |
| `/api/trust/quarantine` | POST | Set quarantine status |
| `/api/trust/can/:vessel/:cap` | GET | Capability check |
| `/api/trust/levels` | GET | Level reference |
| `/api/a2a` | GET | A2A fleet metadata |

## Mathematics

- `tau_gain = 1 / alpha_gain = 500 events`
- `tau_loss = 1 / alpha_loss = 20 events`
- `loss_to_gain_ratio = 25:1`
- `time_to_L5 ≈ (0.90 - 0.10) / 0.002 = 400 events ideal`
- `propagation = direct * 0.7 + neighbor_avg * 0.3`

## Contrarian Defenses Addressed

1. **Trust is gameable** → Random sampling audits, severity-weighted events
2. **Bridge breaks** → Connectivity as separate dimension, not BAD event
3. **Ambiguous BAD in software** → Tagged severity system
4. **Experience-blind** → Event-count normalization
5. **Arbitrary 27 days** → Dynamic horizon based on volatility

## Source

[SuperInstance/Edge-Native](https://github.com/SuperInstance/Edge-Native) — INCREMENTS Trust Score Algorithm specification

## License

Superinstance & Lucineer (DiGennaro et al.) — 2026
