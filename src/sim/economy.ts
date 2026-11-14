// Economy: derived modifiers, production, idle drain, population and happiness.
// Design goals: readable, no chores, never punish rest days.
import { G } from '../core/state';
import type { BoostKey, Cost, GameState, Res, ResKey } from '../core/types';
import { BUILDING } from '../data/buildings';
import { RES_NODE } from '../data/research';
import { clamp } from '../core/util';
import { emit } from '../core/bus';

export const BASE_BATTERY = 600;
export const RIDE_PROD_MULT = 2.5; // the grid is fully powered while you ride
export const OVERFLOW_GOLD = 0.2; // gold per kJ that doesn't fit in the battery
export const FOOD_PER_CITIZEN = 0.12; // per hour
export const TAX_PER_CITIZEN = 0.05; // gold per hour

export interface Mods {
  battery: number;
  housing: number;
  amenity: number;
  prod: Res; // per hour, before multipliers
  boost: Record<BoostKey, number>;
  upkeep: number; // kJ/h before reduction
  counts: Record<string, number>;
}

const zeroRes = (): Res => ({ energy: 0, food: 0, materials: 0, research: 0, gold: 0, sparks: 0 });
const zeroBoost = (): Record<BoostKey, number> => ({ rideEnergy: 0, eventReward: 0, food: 0, materials: 0, research: 0, gold: 0, upkeep: 0, popGrowth: 0, importRate: 0 });

let cache: Mods | null = null;
export const invalidate = () => {
  cache = null;
};

export function mods(s: GameState = G.s): Mods {
  if (cache && s === G.s) return cache;
  const m: Mods = { battery: BASE_BATTERY, housing: 0, amenity: 0, prod: zeroRes(), boost: zeroBoost(), upkeep: 0, counts: {} };
  for (const b of s.buildings) {
    const d = BUILDING[b.type];
    if (!d) continue;
    m.counts[b.type] = (m.counts[b.type] || 0) + 1;
    const t = d.tiers[Math.min(b.tier, d.tiers.length - 1)];
    m.housing += t.housing || 0;
    m.amenity += t.happiness || 0;
    m.battery += t.battery || 0;
    m.upkeep += d.upkeep * (1 + b.tier * 0.6);
    if (t.prod) for (const k in t.prod) m.prod[k as ResKey] += t.prod[k as ResKey]!;
    if (t.boost) for (const k in t.boost) m.boost[k as BoostKey] += t.boost[k as BoostKey]!;
  }
  for (const id of s.research) {
    const r = RES_NODE[id];
    if (!r) continue;
    m.battery += r.battery || 0;
    if (r.boost) for (const k in r.boost) m.boost[k as BoostKey] += r.boost[k as BoostKey]!;
  }
  m.boost.upkeep = Math.min(0.75, m.boost.upkeep);
  if (s === G.s) cache = m;
  return m;
}

/** Happiness 0..100: amenities per capita, plus a temporary festive glow from events. */
export function happiness(s: GameState = G.s) {
  const m = mods(s);
  const per = s.pop / 10 + 5;
  const h = 42 + 50 * (1 - Math.exp(-m.amenity / per)) + clamp(s.festive, 0, 15) - (s.res.food <= 0 && s.pop > 0 ? 8 : 0);
  return clamp(h, 0, 100);
}
export const happyMult = (h: number) => 0.85 + (h / 100) * 0.35;

/** Production per hour, all multipliers applied. */
export function rates(s: GameState = G.s, riding = false) {
  const m = mods(s);
  const hm = happyMult(happiness(s));
  const rm = riding ? RIDE_PROD_MULT : 1;
  const r = {
    food: m.prod.food * (1 + m.boost.food) * hm * rm,
    materials: m.prod.materials * (1 + m.boost.materials) * hm * rm,
    research: m.prod.research * (1 + m.boost.research) * hm * rm,
    gold: (m.prod.gold + s.pop * TAX_PER_CITIZEN) * (1 + m.boost.gold) * hm * rm,
    foodUse: s.pop * FOOD_PER_CITIZEN,
    upkeep: m.upkeep * (1 - m.boost.upkeep),
  };
  return r;
}

export const batteryCap = (s: GameState = G.s) => mods(s).battery;
export const popTarget = (s: GameState = G.s) => Math.floor(mods(s).housing * (0.55 + happiness(s) / 220));

export interface TickReport {
  produced: Partial<Res>;
  drained: number;
  pausedHours: number;
  popGained: number;
}

/**
 * Advance the economy by dtH hours.
 * riding: the rider powers the grid live (no battery drain, boosted output).
 */
export function tick(dtH: number, riding = false, rep?: TickReport) {
  const s = G.s;
  if (dtH <= 0) return;
  const r = rates(s, riding);
  let powered = 1;
  if (!riding) {
    const need = r.upkeep * dtH;
    if (need > 0) {
      if (s.res.energy >= need) {
        s.res.energy -= need;
        if (rep) rep.drained += need;
      } else {
        powered = need > 0 ? s.res.energy / need : 1;
        if (rep) {
          rep.drained += s.res.energy;
          rep.pausedHours += dtH * (1 - powered);
        }
        s.res.energy = 0;
      }
    }
  }
  const add = (k: ResKey, v: number) => {
    s.res[k] += v;
    if (rep) rep.produced[k] = (rep.produced[k] || 0) + v;
  };
  add('food', (r.food - r.foodUse) * dtH * powered);
  add('materials', r.materials * dtH * powered);
  add('research', r.research * dtH * powered);
  add('gold', r.gold * dtH * powered);
  if (s.res.food < 0) {
    if (rep) rep.produced.food = (rep.produced.food || 0) - s.res.food;
    s.res.food = 0;
  }
  // population grows toward the target while there is food and power; it never shrinks
  const target = popTarget(s);
  if (s.pop < target && s.res.food > 0 && powered > 0.2) {
    const m = mods(s);
    const g = Math.max(0.6, (target - s.pop) * 0.1) * (1 + m.boost.popGrowth) * dtH * powered;
    const before = Math.floor(s.pop);
    s.pop = Math.min(target, s.pop + g);
    const gained = Math.floor(s.pop) - before;
    if (gained > 0) {
      s.res.food = Math.max(0, s.res.food - gained * 2);
      if (rep) rep.popGained += gained;
    }
  }
  s.stats.maxPop = Math.max(s.stats.maxPop, Math.floor(s.pop));
  // festive glow fades over ~2 days
  s.festive *= Math.exp(-dtH / 48);
}

/** Credit energy into the battery. Overflow becomes gold (sold to the neighbours). */
export function creditEnergy(kj: number) {
  const s = G.s;
  const cap = batteryCap(s);
  s.res.energy += kj;
  if (s.res.energy > cap) {
    const over = s.res.energy - cap;
    s.res.energy = cap;
    const g = over * OVERFLOW_GOLD;
    s.res.gold += g;
    s.stats.overflowGold += g;
    return g;
  }
  return 0;
}

export function canAfford(c: Cost, s: GameState = G.s) {
  for (const k in c) if ((s.res[k as ResKey] || 0) + 1e-6 < (c[k as ResKey] || 0)) return false;
  return true;
}
export function pay(c: Cost) {
  const s = G.s;
  for (const k in c) s.res[k as ResKey] -= c[k as ResKey] || 0;
  emit('res');
}
export function grant(c: Partial<Res>) {
  const s = G.s;
  for (const k in c) {
    if (k === 'energy') creditEnergy(c.energy || 0);
    else s.res[k as ResKey] += c[k as ResKey] || 0;
  }
  emit('res');
}
export function missing(c: Cost, s: GameState = G.s): string[] {
  const out: string[] = [];
  for (const k in c) {
    const need = (c[k as ResKey] || 0) - (s.res[k as ResKey] || 0);
    if (need > 1e-6) out.push(k);
  }
  return out;
}
