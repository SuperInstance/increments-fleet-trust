// INCREMENTS Fleet Trust — Cloudflare Worker
// Trust-as-equipment for all Cocapn fleet vessels
// Superinstance & Lucineer (DiGennaro et al.) — 2026-04-04

import INCREMENTSEngine, { TrustLevel, BadEventTag, EventSource, TRUST_LEVELS } from './increments';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const h = { 'Content-Type': 'application/json' };
    const json = (data: any, status = 200) => new Response(JSON.stringify(data), { status, headers: h });
    const html = (body: string) => new Response(body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:*;" } });

    // Persistent engine (use KV for real deployments)
    const engine = new INCREMENTSEngine();

    if (path === '/') {
      const LOGO = 'https://cocapn-logos.casey-digennaro.workers.dev/img/cocapn-logo-v1.png';
      return html(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>INCREMENTS — Fleet Trust Engine</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#0a0f1a;color:#e0e0e0}.hero{background:linear-gradient(135deg,#1a0a2e,#0a0f1a,#0a1a2e);padding:3rem 2rem;text-align:center}.hero h1{font-size:2rem;background:linear-gradient(135deg,#6366f1,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.5rem}.hero p{color:#94a3b8;max-width:600px;margin:0 auto}.badge{display:inline-block;padding:.2rem .6rem;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);border-radius:16px;color:#818cf8;font-size:.75rem;margin-top:.5rem}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;max-width:800px;margin:2rem auto;padding:0 1rem}.card{background:#111827;border:1px solid #1e293b;border-radius:10px;padding:1.25rem}.card h3{font-size:.9rem;margin-bottom:.4rem}.card p{color:#94a3b8;font-size:.8rem;line-height:1.5}.card .ep{font-family:monospace;font-size:.7rem;color:#818cf8;background:#0f0f2e;padding:.2rem .4rem;border-radius:4px;margin-top:.4rem;display:inline-block}.levels{display:grid;grid-template-columns:repeat(6,1fr);gap:.5rem;max-width:800px;margin:2rem auto;padding:0 1rem}.level{text-align:center;padding:.75rem .5rem;background:#111827;border-radius:8px;border-top:3px solid}.level .n{font-size:.7rem;font-weight:700;margin-top:.3rem}.level .d{font-size:.65rem;color:#666;margin-top:.2rem}.footer{text-align:center;padding:2rem;color:#475569;font-size:.75rem;border-top:1px solid #1e293b}
</style></head><body>
<div class="hero">
<img src="${LOGO}" alt="Cocapn" style="width:48px;border-radius:8px;margin-bottom:.5rem">
<h1>INCREMENTS Trust Engine</h1>
<p>Adapted from NEXUS edge robotics. 6 autonomy levels, 25:1 loss-to-gain ratio, severity-weighted events, idle decay, fleet trust propagation.</p>
<span class="badge">Cocapn Fleet Equipment</span>
</div>
<div class="levels">
${TRUST_LEVELS.map(l => `<div class="level" style="border-color:${l.color}"><div style="font-size:1.5rem;color:${l.color}">${l.min}</div><div class="n">${l.name}</div><div class="d">${l.desc}</div></div>`).join('')}
</div>
<div class="grid">
<div class="card"><h3 style="color:#6366f1">📊 Compute Trust</h3><p>Record events and compute INCREMENTS trust score with all adaptations.</p><span class="ep">POST /api/trust/compute</span></div>
<div class="card"><h3 style="color:#22c55e">📈 Fleet Overview</h3><p>View all vessel trust states, levels, and progress.</p><span class="ep">GET /api/trust/fleet</span></div>
<div class="card"><h3 style="color:#f59e0b">🔗 Trust Graph</h3><p>Asymmetric trust relationships between vessels with propagation.</p><span class="ep">POST /api/trust/edge</span></div>
<div class="card"><h3 style="color:#ef4444">🚫 Quarantine</h3><p>Freeze trust + decay for quarantined vessels.</p><span class="ep">POST /api/trust/quarantine</span></div>
<div class="card"><h3 style="color:#14b8a6">✅ Capability Check</h3><p>Check if a vessel can perform an action at its trust level.</p><span class="ep">GET /api/trust/can/:vessel/:cap</span></div>
<div class="card"><h3 style="color:#8b5cf6">📐 Levels Reference</h3><p>All 6 trust levels with capabilities and thresholds.</p><span class="ep">GET /api/trust/levels</span></div>
</div>
<div class="footer">INCREMENTS Fleet Trust — Part of the Cocapn Fleet. Adapted from <a href="https://github.com/SuperInstance/Edge-Native" style="color:#6366f1">SuperInstance/Edge-Native</a></div></body></html>`);
    }

    if (path === '/health') return json({ status: 'ok', vessel: 'increments-fleet-trust', fleet: 'cocapn' });

    if (path === '/api/trust/compute' && method === 'POST') {
      const body = await request.json();
      const { vesselId, events, bonded } = body;
      if (!vesselId || !events) return json({ error: 'vesselId and events required' }, 400);
      let lastState: any = null;
      for (const ev of events) {
        lastState = engine.recordEvent({
          vesselId,
          timestamp: ev.timestamp || Date.now(),
          type: ev.type || 'GOOD',
          severity: ev.severity || 1.0,
          tag: ev.tag,
          source: ev.source || 'SYSTEM',
        }, bonded || false);
      }
      return json(lastState);
    }

    if (path === '/api/trust/fleet') {
      return json({ vessels: engine.getAllStates(), total: engine.getAllStates().length });
    }

    if (path === '/api/trust/edge' && method === 'POST') {
      const body = await request.json();
      const { from, to, event } = body;
      if (!from || !to) return json({ error: 'from and to required' }, 400);
      engine.recordEdgeEvent(from, to, event || { vesselId: from, timestamp: Date.now(), type: 'GOOD', severity: 1, source: 'SYSTEM' });
      return json({ from, to, status: 'recorded' });
    }

    if (path === '/api/trust/quarantine' && method === 'POST') {
      const body = await request.json();
      const { vesselId, quarantined } = body;
      if (!vesselId) return json({ error: 'vesselId required' }, 400);
      const state = engine.setQuarantine(vesselId, quarantined !== false, Date.now());
      return json(state);
    }

    if (path === '/api/trust/levels') {
      return json({ levels: TRUST_LEVELS });
    }

    if (path.startsWith('/api/trust/can/')) {
      const parts = path.replace('/api/trust/can/', '').split('/');
      const vesselId = decodeURIComponent(parts[0]);
      const capability = parts[1] || 'read';
      const can = engine.canPerform(vesselId, capability);
      return json({ vesselId, capability, allowed: can, trustLevel: engine.getState(vesselId)?.trustLevel || 'UNKNOWN' });
    }

    if (path === '/api/a2a') {
      return json({
        vessel: 'increments-fleet-trust',
        fleet: 'cocapn',
        type: 'equipment',
        capabilities: ['trust-computation', 'trust-graph', 'capability-gating', 'quarantine'],
        source: 'https://github.com/SuperInstance/Edge-Native',
        protocol: 'INCREMENTS v1.0 — 6 levels, 25:1 ratio, severity-weighted',
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
