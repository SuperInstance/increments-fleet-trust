// INCREMENTS Fleet Trust — Trust as Reusable Equipment
// Extracted from NEXUS Edge-Native (SuperInstance/Edge-Native)
// Adapts INCREMENTS trust algorithm for pure software fleet (Cloudflare Workers)
// Superinstance & Lucineer (DiGennaro et al.) — 2026-04-04

// ── INCREMENTS Trust Engine ──
// alpha_gain=0.002, alpha_loss=0.05, 6 levels L0-L5
// 25:1 loss-to-gain ratio, ~27 days ideal to L5
// Adapted: event-count normalized (not wall-clock), severity-weighted, idle decay

export interface INCREMENTSConfig {
  alphaGain: number;       // 0.002 — trust gain per GOOD event
  alphaLoss: number;       // 0.05 — trust loss per BAD event
  tFloor: number;          // 0.10 — minimum trust
  tMax: number;            // 0.99 — maximum trust
  idleDecayPerDay: number; // 0.001 — decay when no events
  eventHorizon: number;    // 10000 — normalize by event count, not time
  consecutiveBadMultiplier: number; // 2.0 — escalate after 3+ consecutive bad
  propagationAttenuation: number;   // 0.85 — trust signal attenuates per hop
  propagationHops: number;          // 3 — max propagation distance
  bondTrustMultiplier: number;      // 1.5 — bonus when bonded collaborator
  quarantinePenalty: number;        // 0.01 — trust penalty per quarantine period
  volatilitySmoothing: number;      // 0.1 — dynamic horizon adjustment factor
}

export type TrustLevel = 'L0_MANUAL' | 'L1_ADVISORY' | 'L2_ASSISTED' | 'L3_SUPERVISED' | 'L4_AUTONOMOUS' | 'L5_FULL';

interface LevelThreshold {
  name: TrustLevel;
  min: number;
  desc: string;
  capabilities: string[];
  color: string;
}

export const TRUST_LEVELS: LevelThreshold[] = [
  { name: 'L0_MANUAL', min: 0.00, desc: 'Human-only control', capabilities: ['read'], color: '#ef4444' },
  { name: 'L1_ADVISORY', min: 0.15, desc: 'Agent suggests, human decides', capabilities: ['read', 'suggest'], color: '#f59e0b' },
  { name: 'L2_ASSISTED', min: 0.30, desc: 'Agent acts with approval', capabilities: ['read', 'suggest', 'act_approved'], color: '#eab308' },
  { name: 'L3_SUPERVISED', min: 0.50, desc: 'Agent acts, human monitors', capabilities: ['read', 'suggest', 'act_approved', 'act_monitored'], color: '#22c55e' },
  { name: 'L4_AUTONOMOUS', min: 0.70, desc: 'Agent acts independently', capabilities: ['read', 'suggest', 'act_approved', 'act_monitored', 'act_autonomous'], color: '#14b8a6' },
  { name: 'L5_FULL', min: 0.90, desc: 'Full autonomy, self-evolving', capabilities: ['read', 'suggest', 'act_approved', 'act_monitored', 'act_autonomous', 'self_modify'], color: '#6366f1' },
];

export type BadEventTag = 'SECURITY' | 'SLA' | 'INTEGRITY' | 'COORDINATION' | 'UNKNOWN';
export type EventSource = 'SELF' | 'NEIGHBOR' | 'SYSTEM' | 'HUMAN';

export interface TrustEvent {
  vesselId: string;
  timestamp: number;
  type: 'GOOD' | 'BAD';
  severity: number;        // 0.0-1.0 (for BAD: 1=SECURITY breach, 0.3=slow response)
  tag?: BadEventTag;
  source: EventSource;
  correlationId?: string;
}

export interface VesselTrustState {
  vesselId: string;
  currentTrust: number;
  effectiveTrust: number;
  trustLevel: TrustLevel;
  levelDesc: string;
  nextLevel: TrustLevel | 'MAX';
  progressToNext: number;
  eventCount: number;
  consecutiveGood: number;
  consecutiveBad: number;
  lastEventTime: number;
  lastDecayTime: number;
  isQuarantined: boolean;
  quarantineSince?: number;
  bondCount: number;
  volatility: number;
  dynamicHorizon: number;
}

export interface TrustGraphEdge {
  from: string;
  to: string;
  trust: number;
  lastEvent: number;
  eventCount: number;
}

export default class INCREMENTSEngine {
  private config: INCREMENTSConfig;
  private states: Map<string, VesselTrustState> = new Map();
  private graph: Map<string, TrustGraphEdge[]> = new Map();

  constructor(config?: Partial<INCREMENTSConfig>) {
    this.config = {
      alphaGain: 0.002,
      alphaLoss: 0.05,
      tFloor: 0.10,
      tMax: 0.99,
      idleDecayPerDay: 0.001,
      eventHorizon: 10000,
      consecutiveBadMultiplier: 2.0,
      propagationAttenuation: 0.85,
      propagationHops: 3,
      bondTrustMultiplier: 1.5,
      quarantinePenalty: 0.01,
      volatilitySmoothing: 0.1,
      ...config,
    };
  }

  getOrCreateState(vesselId: string, now: number): VesselTrustState {
    let state = this.states.get(vesselId);
    if (!state) {
      state = {
        vesselId,
        currentTrust: this.config.tFloor,
        effectiveTrust: this.config.tFloor,
        trustLevel: 'L0_MANUAL',
        levelDesc: 'Human-only control',
        nextLevel: 'L1_ADVISORY',
        progressToNext: 0,
        eventCount: 0,
        consecutiveGood: 0,
        consecutiveBad: 0,
        lastEventTime: now,
        lastDecayTime: now,
        isQuarantined: false,
        bondCount: 0,
        volatility: 0,
        dynamicHorizon: this.config.eventHorizon,
      };
      this.states.set(vesselId, state);
    }
    return state;
  }

  private computeLevel(trust: number): { level: LevelThreshold; next: LevelThreshold | null; progress: number } {
    let current = TRUST_LEVELS[0];
    for (const l of TRUST_LEVELS) {
      if (trust >= l.min) current = l;
    }
    const idx = TRUST_LEVELS.indexOf(current);
    const next = idx < TRUST_LEVELS.length - 1 ? TRUST_LEVELS[idx + 1] : null;
    const progress = next ? Math.round(((trust - current.min) / (next.min - current.min)) * 100) : 100;
    return { level: current, next, progress };
  }

  private applyIdleDecay(state: VesselTrustState, now: number): void {
    if (state.isQuarantined) return;
    const daysSinceEvent = (now - state.lastEventTime) / 86400000;
    if (daysSinceEvent > 1) {
      const decay = this.config.idleDecayPerDay * (daysSinceEvent - 1);
      state.currentTrust = Math.max(this.config.tFloor, state.currentTrust - decay);
    }
    state.lastDecayTime = now;
  }

  recordEvent(event: TrustEvent, isBonded: boolean = false): VesselTrustState {
    const state = this.getOrCreateState(event.vesselId, event.timestamp);

    // Quarantine: trust freeze + penalty, no gains
    if (state.isQuarantined) {
      if (event.type === 'BAD') {
        state.currentTrust = Math.max(this.config.tFloor, state.currentTrust - this.config.quarantinePenalty);
      }
      this.finalizeState(state, event.timestamp);
      return state;
    }

    this.applyIdleDecay(state, event.timestamp);

    if (event.type === 'GOOD') {
      let gain = this.config.alphaGain;
      if (isBonded) gain *= this.config.bondTrustMultiplier;
      state.currentTrust = Math.min(this.config.tMax, state.currentTrust + gain);
      state.consecutiveGood++;
      state.consecutiveBad = 0;
    } else {
      let loss = this.config.alphaLoss * event.severity;
      if (state.consecutiveBad >= 3) loss *= this.config.consecutiveBadMultiplier;
      state.currentTrust = Math.max(this.config.tFloor, state.currentTrust - loss);
      state.consecutiveBad++;
      state.consecutiveGood = 0;
    }

    state.eventCount++;
    state.lastEventTime = event.timestamp;

    // Volatility tracking (for dynamic horizon)
    const recentDelta = event.type === 'GOOD' ? this.config.alphaGain : this.config.alphaLoss * event.severity;
    state.volatility = state.volatility * (1 - this.config.volatilitySmoothing) + recentDelta * this.config.volatilitySmoothing;

    this.finalizeState(state, event.timestamp);
    return state;
  }

  private finalizeState(state: VesselTrustState, now: number): void {
    // Dynamic horizon: high volatility extends (caution), low shortens (responsive)
    const volFactor = Math.max(0.5, Math.min(2.0, 1 + state.volatility * 100));
    state.dynamicHorizon = Math.round(this.config.eventHorizon * volFactor);

    const { level, next, progress } = this.computeLevel(state.currentTrust);
    state.trustLevel = level.name;
    state.levelDesc = level.desc;
    state.nextLevel = next ? next.name : 'MAX';
    state.progressToNext = progress;
    state.effectiveTrust = Math.round(state.currentTrust * 10000) / 10000;
  }

  getState(vesselId: string, now?: number): VesselTrustState | null {
    const state = this.states.get(vesselId);
    if (!state) return null;
    if (now) this.applyIdleDecay(state, now);
    this.finalizeState(state, now || Date.now());
    return state;
  }

  setQuarantine(vesselId: string, quarantined: boolean, now: number): VesselTrustState {
    const state = this.getOrCreateState(vesselId, now);
    state.isQuarantined = quarantined;
    state.quarantineSince = quarantined ? now : undefined;
    if (quarantined) {
      state.consecutiveBad++;
      state.consecutiveGood = 0;
    }
    this.finalizeState(state, now);
    return state;
  }

  setBondCount(vesselId: string, count: number): void {
    const state = this.states.get(vesselId);
    if (state) state.bondCount = count;
  }

  canPerform(vesselId: string, capability: string, now?: number): boolean {
    const state = this.getState(vesselId, now);
    if (!state) return false;
    const level = TRUST_LEVELS.find(l => l.name === state.trustLevel);
    return level ? level.capabilities.includes(capability) : false;
  }

  // Trust graph for fleet propagation
  recordEdgeEvent(fromId: string, toId: string, event: TrustEvent): void {
    if (!this.graph.has(fromId)) this.graph.set(fromId, []);
    const edges = this.graph.get(fromId)!;
    let edge = edges.find(e => e.to === toId);
    if (!edge) {
      edge = { from: fromId, to: toId, trust: 0.10, lastEvent: 0, eventCount: 0 };
      edges.push(edge);
    }
    if (event.type === 'GOOD') {
      edge.trust = Math.min(0.99, edge.trust + this.config.alphaGain);
    } else {
      edge.trust = Math.max(0.10, edge.trust - this.config.alphaLoss * event.severity);
    }
    edge.lastEvent = event.timestamp;
    edge.eventCount++;
  }

  getTrustForVessel(vesselId: string, now?: number): number {
    const direct = this.getState(vesselId, now);
    if (!direct) return 0;
    // Combine direct trust with propagated trust from neighbors
    let propagatedTrust = 0;
    let propagationWeight = 0;
    const inEdges: TrustGraphEdge[] = [];
    for (const [, edges] of this.graph) {
      for (const e of edges) {
        if (e.to === vesselId) inEdges.push(e);
      }
    }
    for (const edge of inEdges.slice(0, this.config.propagationHops)) {
      const weight = Math.pow(this.config.propagationAttenuation, inEdges.indexOf(edge));
      propagatedTrust += edge.trust * weight;
      propagationWeight += weight;
    }
    if (propagationWeight > 0) propagatedTrust /= propagationWeight;
    return direct.effectiveTrust * 0.7 + propagatedTrust * 0.3;
  }

  getAllStates(now?: number): VesselTrustState[] {
    const results: VesselTrustState[] = [];
    for (const state of this.states.values()) {
      if (now) this.applyIdleDecay(state, now);
      this.finalizeState(state, now || Date.now());
      results.push(state);
    }
    return results;
  }
}
