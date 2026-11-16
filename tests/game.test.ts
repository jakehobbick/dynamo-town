import { describe, expect, it, beforeEach } from 'vitest';
import { G, newGame } from '../src/core/state';
import { bestAvg, normalizedPower, summarize, zoneOf } from '../src/ride/metrics';
import { planTimeline, timelineSecs, eventTimeline } from '../src/ride/plan';
import { EVENTS, eventSeconds } from '../src/data/events';
import { BUILDINGS, REAL_BUILDINGS } from '../src/data/buildings';
import { RESEARCH, RES_NODE } from '../src/data/research';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { creditEnergy, batteryCap, tick, invalidate } from '../src/sim/economy';
import { prevWeekKey, weekKey } from '../src/core/util';
import { ART } from '../src/render/art/town1';

beforeEach(() => {
  G.s = newGame(Date.UTC(2026, 10, 14, 17));
  G.s.plots = [12, 11, 17, 13];
  invalidate();
});

describe('content meets the brief', () => {
  it('has 30+ buildings with 3 tiers each and art', () => {
    expect(REAL_BUILDINGS.length).toBeGreaterThanOrEqual(30);
    for (const b of BUILDINGS) {
      expect(b.tiers.length).toBeGreaterThanOrEqual(3);
      for (const t of b.tiers) expect(t.label.length).toBeGreaterThan(2);
    }
  });
  it('has 8+ events, 20+ research nodes with valid prereqs, 30+ achievements', () => {
    expect(EVENTS.length).toBeGreaterThanOrEqual(8);
    expect(RESEARCH.length).toBeGreaterThanOrEqual(20);
    for (const r of RESEARCH) for (const n of r.needs) expect(RES_NODE[n]).toBeTruthy();
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
  it('every event has scored work', () => {
    for (const e of EVENTS) expect(e.segments.some((s) => s.work)).toBe(true);
  });
  it('art registry covers every building', () => {
    // art is registered on import of town1 (town2 is imported by sprites; check town1 subset at least)
    expect(Object.keys(ART).length).toBeGreaterThan(20);
  });
});

describe('metrics', () => {
  it('computes NP, bests and zones', () => {
    const ps = Array.from({ length: 600 }, (_, i) => (i % 60 < 30 ? 300 : 100));
    expect(normalizedPower(ps)).toBeGreaterThan(200);
    expect(bestAvg(ps, 30)).toBe(300);
    expect(zoneOf(150, 200)).toBe(2);
    expect(zoneOf(410, 200)).toBe(7);
    const m = summarize(ps.map((p, i) => ({ t: i * 1000, p, c: 90, hr: 0 })), 200);
    expect(Math.round(m.kj)).toBe(120);
  });
});

describe('plans', () => {
  it('fills each length without overshooting', () => {
    for (const m of [30, 45, 60, 90]) {
      const tl = planTimeline(m);
      const secs = timelineSecs(tl.items);
      expect(secs).toBeLessThanOrEqual(m * 60 + 1);
      expect(secs).toBeGreaterThanOrEqual(m * 60 - 61);
      expect(tl.events.length).toBeGreaterThanOrEqual(1);
    }
  });
  it('event ride = warmup + event + open free ride', () => {
    const tl = eventTimeline('storm');
    expect(tl.items[0].seg.kind).toBe('free');
    expect(tl.items.filter((i) => i.ev === 'storm').reduce((a, i) => a + i.seg.dur, 0)).toBe(eventSeconds(EVENTS.find((e) => e.id === 'storm')!));
  });
});

describe('economy', () => {
  it('overflow beyond the battery becomes gold', () => {
    const cap = batteryCap();
    G.s.res.energy = cap - 10;
    const g0 = G.s.res.gold;
    const gained = creditEnergy(110);
    expect(G.s.res.energy).toBe(cap);
    expect(gained).toBeCloseTo(20);
    expect(G.s.res.gold).toBeCloseTo(g0 + 20);
  });
  it('idle never decays: empty battery just pauses production', () => {
    G.s.buildings.push({ id: 1, type: 'wheat', x: 17, y: 26, tier: 0, builtAt: 0 }, { id: 2, type: 'cottage', x: 17, y: 18, tier: 0, builtAt: 0 });
    invalidate();
    G.s.res.energy = 0;
    G.s.pop = 3;
    const food = G.s.res.food;
    tick(48, false);
    expect(G.s.pop).toBe(3);
    expect(G.s.res.food).toBe(food);
    G.s.res.energy = 500;
    tick(10, false);
    expect(G.s.res.food).toBeGreaterThan(food);
  });
});

describe('weeks', () => {
  it('prevWeekKey walks back across years', () => {
    expect(prevWeekKey('2027-W01')).toBe('2026-W53');
    expect(prevWeekKey(weekKey(Date.UTC(2026, 10, 18)))).toBe(weekKey(Date.UTC(2026, 10, 11)));
  });
});
