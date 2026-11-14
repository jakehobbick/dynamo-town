// Long-term progression: town tiers, achievements, weekly charters, citizens & requests,
// idle catch-up and the "while you were away" report.
import { emit, on } from '../core/bus';
import { G, now } from '../core/state';
import { markDirty } from '../core/save';
import type { CharterGoal, Citizen, CitizenRequest, Res } from '../core/types';
import { hash, prevWeekKey, rng, weekKey } from '../core/util';
import { ACHIEVEMENTS, type AchCtx } from '../data/achievements';
import { BUILDING } from '../data/buildings';
import { CHARTERS, CHARTER_REWARD } from '../data/charters';
import { BUILD_WISHES, CITIZEN_EVERY, EVENT_WISHES, NAMES } from '../data/citizens';
import { EVENT } from '../data/events';
import { RESEARCH } from '../data/research';
import { TIERS, tierFor } from '../data/tiers';
import { grant, mods, tick, type TickReport } from './economy';
import { districtUnlocked, typeAvailable } from './town';
import { canResearch } from './research';

// ---------------- tiers ----------------
export function checkTier() {
  const t = tierFor(G.s.lifetimeKJ);
  let changed = false;
  while (G.s.tier < t) {
    G.s.tier++;
    const T = TIERS[G.s.tier];
    G.s.res.sparks += T.reward.sparks;
    G.s.res.gold += T.reward.gold;
    emit('tier', G.s.tier);
    changed = true;
  }
  if (changed) markDirty();
  return changed;
}

// ---------------- streaks ----------------
export function streaks() {
  const s = G.s;
  const target = s.settings.weeklyRides;
  const ok = (wk: string) => (s.stats.weeks[wk]?.rides || 0) >= target;
  let wk = weekKey(now());
  // current streak: this week counts if already met, otherwise start from last week
  let cur = 0;
  let w = ok(wk) ? wk : prevWeekKey(wk);
  for (let i = 0; i < 520 && ok(w); i++) {
    cur++;
    w = prevWeekKey(w);
  }
  // best streak across history
  const keys = Object.keys(s.stats.weeks).filter(ok).sort();
  let best = 0, run = 0, prev = '';
  for (const k of keys) {
    run = prev && prevWeekKey(k) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  void wk;
  return { cur, best: Math.max(best, cur) };
}

// ---------------- achievements ----------------
export function achCtx(): AchCtx {
  const s = G.s;
  const ev = Object.values(s.stats.events);
  return {
    s,
    bestStreak: streaks().best,
    buildings: s.buildings.filter((b) => !BUILDING[b.type]?.decor).length,
    pop: Math.floor(s.pop),
    maxTierOwned: s.buildings.reduce((a, b) => Math.max(a, BUILDING[b.type]?.decor ? 0 : b.tier), 0),
    eventsFull: ev.reduce((a, e) => a + e.full, 0),
    eventTypesFull: Object.values(s.stats.events).filter((e) => e.full > 0).length,
    perfect: s.stats.perfect || 0,
  };
}
export function checkAchievements(): string[] {
  const ctx = achCtx();
  const got: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (G.s.achievements[a.id]) continue;
    try {
      if (a.test(ctx)) {
        G.s.achievements[a.id] = now();
        got.push(a.id);
      }
    } catch {}
  }
  if (got.length) {
    markDirty();
    emit('achievements', got);
  }
  return got;
}

// ---------------- weekly charter ----------------
export function ensureCharter() {
  const wk = weekKey(now());
  if (G.s.charter && G.s.charter.week === wk) return G.s.charter;
  const r = rng(Math.floor(hash(wk, G.s.seed) * 1e9));
  const pool = [...CHARTERS];
  const goals: CharterGoal[] = [];
  while (goals.length < 3 && pool.length) {
    const i = Math.floor(r() * pool.length);
    const t = pool.splice(i, 1)[0];
    const target = Math.round(t.base + t.perTier * G.s.tier);
    goals.push({ id: t.id, text: t.text(target), metric: t.metric, target, progress: 0 });
  }
  G.s.charter = { week: wk, goals, claimed: false };
  markDirty();
  return G.s.charter;
}
export function charterProgress(metric: CharterGoal['metric'], amount: number) {
  const c = ensureCharter();
  let touched = false;
  for (const g of c.goals)
    if (g.metric === metric && g.progress < g.target) {
      g.progress = Math.min(g.target, g.progress + amount);
      touched = true;
    }
  if (touched && !c.claimed && c.goals.every((g) => g.progress >= g.target)) {
    c.claimed = true;
    const rw = CHARTER_REWARD(G.s.tier);
    grant(rw);
    G.s.stats.charters++;
    emit('charter:done', rw);
  }
  if (touched) markDirty();
}

// ---------------- citizens & requests ----------------
export function requestReady(r: CitizenRequest): boolean {
  const s = G.s;
  switch (r.kind) {
    case 'build':
      return (mods().counts[r.type] || 0) >= r.count;
    case 'upgrade':
      return s.buildings.some((b) => b.type === r.type && b.tier >= r.tier);
    case 'event':
      return (s.stats.events[r.event]?.full || 0) > (r.base || 0);
    case 'ride':
      return !!r.met;
    case 'research':
      return s.research.includes(r.node);
  }
}

function makeRequest(name: string, seed: number): CitizenRequest | null {
  const s = G.s;
  const r = rng(seed);
  const opts: (() => CitizenRequest | null)[] = [
    () => {
      const cands = Object.keys(BUILD_WISHES).filter((id) => BUILDING[id] && typeAvailable(BUILDING[id]).ok);
      if (!cands.length) return null;
      const id = cands[Math.floor(r() * cands.length)];
      const t = BUILD_WISHES[id];
      const have = mods().counts[id] || 0;
      const reward = { gold: 40 + s.tier * 30, sparks: r() < 0.35 ? 1 : 0, happiness: 3 };
      return { kind: 'build', type: id, count: have + 1, text: t[Math.floor(r() * t.length)].replace('{name}', name), reward };
    },
    () => {
      const owned = s.buildings.filter((b) => !BUILDING[b.type]?.decor && b.tier < 2);
      if (!owned.length) return null;
      const b = owned[Math.floor(r() * owned.length)];
      const d = BUILDING[b.type];
      return { kind: 'upgrade', type: b.type, tier: b.tier + 1, text: `${name} thinks the ${d.name} deserves an upgrade: ${d.tiers[b.tier + 1].label.toLowerCase()}.`, reward: { gold: 60 + s.tier * 40, sparks: 1, happiness: 3 } };
    },
    () => {
      const ids = Object.keys(EVENT_WISHES).filter((id) => (EVENT[id].minTier ?? 0) <= s.tier);
      const id = ids[Math.floor(r() * ids.length)];
      return { kind: 'event', event: id, base: s.stats.events[id]?.full || 0, text: EVENT_WISHES[id].replace('{name}', name), reward: { gold: 80 + s.tier * 40, sparks: 1, happiness: 5 } };
    },
    () => {
      const kj = [300, 400, 500, 600, 750][Math.min(4, Math.floor(r() * (2 + s.tier)))];
      return { kind: 'ride', kj, text: `${name} is hosting a dinner party: generate ${kj} kJ in one ride to keep the ovens hot.`, reward: { gold: 50 + s.tier * 30, materials: 60 + s.tier * 40, happiness: 3 } };
    },
    () => {
      const av = RESEARCH.filter((x) => !s.research.includes(x.id) && canResearch(x).ok !== false && x.needs.every((n) => s.research.includes(n)) && (x.minTier ?? 0) <= s.tier);
      if (!av.length) return null;
      const x = av[Math.floor(r() * av.length)];
      return { kind: 'research', node: x.id, text: `${name} has been reading about ${x.name.toLowerCase()}. Could the town research it?`, reward: { gold: 50 + s.tier * 30, research: 20 + s.tier * 15, happiness: 3 } };
    },
  ];
  const order = [0, 0, 2, 1, 3, 4, 0, 2];
  for (let i = 0; i < 6; i++) {
    const f = opts[order[Math.floor(r() * order.length)]];
    const q = f();
    if (q) return { ...q, at: now() };
  }
  return null;
}

export function citizenTick() {
  const s = G.s;
  const want = Math.floor(s.pop / CITIZEN_EVERY) + (s.buildings.length ? 1 : 0);
  let added: Citizen | null = null;
  while (s.citizens.length < Math.min(want, NAMES.length)) {
    const [name, emoji] = NAMES[s.citizens.length];
    const c: Citizen = { id: 'c' + s.citizens.length, name, emoji, arrived: now(), request: null, done: 0 };
    c.request = makeRequest(name, Math.floor(hash(name, s.seed) * 1e9));
    s.citizens.push(c);
    added = c;
  }
  // citizens without a request get a new one
  for (const c of s.citizens) if (!c.request) c.request = makeRequest(c.name, Math.floor(hash(c.name, c.done, s.seed) * 1e9));
  if (added) {
    markDirty();
    emit('citizen', added);
  }
}

export function fulfil(c: Citizen) {
  if (!c.request || !requestReady(c.request)) return false;
  const rw = { ...c.request.reward } as any;
  const h = rw.happiness || 0;
  delete rw.happiness;
  grant(rw);
  G.s.festive = Math.min(15, G.s.festive + h);
  c.done++;
  G.s.stats.requests++;
  c.request = makeRequest(c.name, Math.floor(hash(c.name, c.done, G.s.seed, now()) * 1e9));
  charterProgress('requests', 1);
  markDirty();
  return true;
}

// ---------------- idle catch-up ----------------
export interface AwayReport {
  secs: number;
  produced: Partial<Res>;
  drained: number;
  pausedHours: number;
  popGained: number;
  citizens: string[];
}

/** Simulate time since lastTick in hour steps. Production pauses (never decays) when the battery is empty. */
export function idleCatchUp(): AwayReport | null {
  const s = G.s;
  const t = now();
  const secs = (t - s.lastTick) / 1000;
  if (secs < 5) return null;
  const capped = Math.min(secs, 60 * 86400);
  const rep: TickReport = { produced: {}, drained: 0, pausedHours: 0, popGained: 0 };
  const before = s.citizens.length;
  let left = capped / 3600;
  while (left > 0) {
    const step = Math.min(1, left);
    tick(step, false, rep);
    left -= step;
  }
  citizenTick();
  s.lastTick = t;
  markDirty();
  return { secs, produced: rep.produced, drained: rep.drained, pausedHours: rep.pausedHours, popGained: rep.popGained, citizens: s.citizens.slice(before).map((c) => `${c.emoji} ${c.name}`) };
}

// hooks
on('ride:finished', (d: any) => {
  const sm = d.summary;
  if (d.summary.secs >= 60) charterProgress('rides', 1);
  charterProgress('kj', sm.kj);
  charterProgress('minutes', d.minutes);
  charterProgress('z2min', d.ride.z2 / 60);
  charterProgress('sprints', d.sprints);
  const full = d.ride.events.filter((e: any) => e.full).length;
  if (full) charterProgress('events', full);
  const perfect = d.ride.events.filter((e: any) => e.score >= 0.95).length;
  G.s.stats.perfect = (G.s.stats.perfect || 0) + perfect;
  for (const c of G.s.citizens) if (c.request && c.request.kind === 'ride' && sm.kj >= c.request.kj) c.request.met = true;
});
on('town:changed', (e: any) => {
  if (e.kind === 'build' && !BUILDING[e.b.type]?.decor) charterProgress('builds', 1);
  if (e.kind === 'upgrade' && !BUILDING[e.b.type]?.decor) charterProgress('upgrades', 1);
});
export { districtUnlocked };
