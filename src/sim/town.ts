// Town actions: placing, upgrading, moving buildings and buying plots.
import { G, now } from '../core/state';
import type { Building, BuildingDef, Cost } from '../core/types';
import { BUILDING } from '../data/buildings';
import { DISTRICT } from '../data/districts';
import { RESEARCH } from '../data/research';
import { emit } from '../core/bus';
import { canAfford, invalidate, mods, pay } from './economy';
import { buildable, CORE_PLOT, DYNAMO, districtAt, genWorld, inMap, N, plotDistrict, plotOf, PLOTS, START_PLOTS, type World } from './map';

let world: World | null = null;
let worldSeed = -1;
export function getWorld() {
  if (!world || worldSeed !== G.s.seed) {
    world = genWorld(G.s.seed);
    worldSeed = G.s.seed;
  }
  return world;
}

// occupancy grid, rebuilt lazily
let occ: Int32Array | null = null;
export function invalidateOcc() {
  occ = null;
}
export function occupancy() {
  if (occ) return occ;
  occ = new Int32Array(N * N);
  for (let y = DYNAMO.y; y < DYNAMO.y + DYNAMO.size; y++) for (let x = DYNAMO.x; x < DYNAMO.x + DYNAMO.size; x++) occ[y * N + x] = -1;
  for (const b of G.s.buildings) {
    const sz = BUILDING[b.type]?.size || 1;
    for (let dy = 0; dy < sz; dy++) for (let dx = 0; dx < sz; dx++) if (inMap(b.x + dx, b.y + dy)) occ[(b.y + dy) * N + b.x + dx] = b.id;
  }
  return occ;
}

export const ensureStartPlots = () => {
  if (!G.s.plots.length) G.s.plots = [...START_PLOTS];
};

export const ownsTile = (x: number, y: number) => inMap(x, y) && G.s.plots.includes(plotOf(x, y));
export const districtUnlocked = (id: string) => (DISTRICT[id]?.tier ?? 99) <= G.s.tier;

export function researchUnlocks(id: string) {
  return RESEARCH.some((r) => r.unlocks?.includes(id));
}

export type Lock = { ok: true } | { ok: false; why: string };

/** Can this building type be built at all right now (ignoring tile and cost)? */
export function typeAvailable(d: BuildingDef): Lock {
  const s = G.s;
  if (!districtUnlocked(d.district)) return { ok: false, why: `${DISTRICT[d.district].name} opens at a later town tier` };
  if (d.minTier != null && s.tier < d.minTier) return { ok: false, why: `Needs town tier ${d.minTier + 1}` };
  if (d.needs && !s.research.includes(d.needs)) return { ok: false, why: `Needs research: ${RESEARCH.find((r) => r.id === d.needs)?.name}` };
  if (d.max != null && (mods().counts[d.id] || 0) >= d.max) return { ok: false, why: `Limit ${d.max}` };
  if (!s.plots.some((p) => plotDistrict(p) === d.district) && !d.decor) return { ok: false, why: `Buy a ${DISTRICT[d.district].name} plot first` };
  return { ok: true };
}

export function nearWater(x: number, y: number) {
  const w = getWorld();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const xx = x + dx, yy = y + dy;
    if (inMap(xx, yy) && w.terrain[yy * N + xx] === 'water') return true;
  }
  return false;
}

/** Can a building of this type go on this tile? */
export function canPlaceAt(d: BuildingDef, x: number, y: number, ignoreId = 0): Lock {
  const sz = d.size || 1;
  const w = getWorld();
  const o = occupancy();
  for (let dy = 0; dy < sz; dy++)
    for (let dx = 0; dx < sz; dx++) {
      const xx = x + dx, yy = y + dy;
      if (!inMap(xx, yy)) return { ok: false, why: 'Off the map' };
      if (!ownsTile(xx, yy)) return { ok: false, why: 'Buy this plot first' };
      const t = w.terrain[yy * N + xx];
      if (!buildable(t)) return { ok: false, why: t === 'water' ? 'That is water' : 'Nothing to build on' };
      const oc = o[yy * N + xx];
      if (oc !== 0 && oc !== ignoreId) return { ok: false, why: 'Occupied' };
      if (!d.decor && districtAt(xx, yy) !== d.district) return { ok: false, why: `Belongs in ${DISTRICT[d.district].name}` };
    }
  if (d.coastal && !nearWater(x, y)) return { ok: false, why: 'Must touch the water' };
  return { ok: true };
}

export function place(type: string, x: number, y: number, free = false): Building | null {
  const d = BUILDING[type];
  if (!d) return null;
  if (!free) {
    if (!typeAvailable(d).ok || !canAfford(d.tiers[0].cost)) return null;
  }
  if (!canPlaceAt(d, x, y).ok) return null;
  if (!free) pay(d.tiers[0].cost);
  const b: Building = { id: G.s.nextId++, type, x, y, tier: 0, builtAt: now(), flip: Math.random() < 0.5 };
  G.s.buildings.push(b);
  if (!d.decor) G.s.stats.built++;
  invalidate();
  invalidateOcc();
  emit('town:changed', { kind: 'build', b });
  return b;
}

export const upgradeCost = (b: Building): Cost | null => {
  const d = BUILDING[b.type];
  return d && b.tier + 1 < d.tiers.length ? d.tiers[b.tier + 1].cost : null;
};

export function upgrade(b: Building) {
  const c = upgradeCost(b);
  if (!c || !canAfford(c)) return false;
  pay(c);
  b.tier++;
  b.builtAt = now();
  if (!BUILDING[b.type].decor) G.s.stats.upgrades++;
  invalidate();
  emit('town:changed', { kind: 'upgrade', b });
  return true;
}

export function move(b: Building, x: number, y: number) {
  const d = BUILDING[b.type];
  if (!canPlaceAt(d, x, y, b.id).ok) return false;
  b.x = x;
  b.y = y;
  invalidateOcc();
  emit('town:changed', { kind: 'move', b });
  return true;
}

/** Demolish refunds half of everything spent. Only offered for decor and on request; nothing is destroyed automatically. */
export function demolish(b: Building) {
  const d = BUILDING[b.type];
  const refund: Record<string, number> = {};
  for (let i = 0; i <= b.tier; i++) for (const [k, v] of Object.entries(d.tiers[i].cost)) refund[k] = (refund[k] || 0) + (v || 0) * 0.5;
  for (const [k, v] of Object.entries(refund)) (G.s.res as any)[k] += v;
  G.s.buildings = G.s.buildings.filter((x) => x !== b);
  invalidate();
  invalidateOcc();
  emit('town:changed', { kind: 'demolish', b });
  return refund;
}

export const buildingAt = (x: number, y: number) => {
  if (!inMap(x, y)) return null;
  const id = occupancy()[y * N + x];
  if (id <= 0) return null;
  return G.s.buildings.find((b) => b.id === id) || null;
};
export const isDynamoTile = (x: number, y: number) => x >= DYNAMO.x && y >= DYNAMO.y && x < DYNAMO.x + DYNAMO.size && y < DYNAMO.y + DYNAMO.size;

// ---------- plots ----------
export function plotCost(): Cost {
  const n = Math.max(0, G.s.plots.length - 3);
  return { energy: Math.round(200 * Math.pow(1.35, n)), gold: Math.round(40 * Math.pow(1.4, n)), materials: Math.round(60 * Math.pow(1.3, n)), food: Math.round(80 * Math.pow(1.35, n)) };
}
export function plotBuyable(p: number): Lock {
  if (G.s.plots.includes(p)) return { ok: false, why: 'Owned' };
  const d = plotDistrict(p);
  if (!districtUnlocked(d)) return { ok: false, why: `${DISTRICT[d].name} opens at tier ${DISTRICT[d].tier + 1}` };
  const px = p % PLOTS, py = Math.floor(p / PLOTS);
  const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
    const qx = px + dx, qy = py + dy;
    return qx >= 0 && qy >= 0 && qx < PLOTS && qy < PLOTS && G.s.plots.includes(qy * PLOTS + qx);
  });
  if (!adj) return { ok: false, why: 'Must border land you own' };
  return { ok: true };
}
export function buyPlot(p: number) {
  if (!plotBuyable(p).ok) return false;
  const c = plotCost();
  if (!canAfford(c)) return false;
  pay(c);
  G.s.plots.push(p);
  emit('town:changed', { kind: 'plot', p });
  return true;
}

/** Find a free tile for a reward decoration, preferring the given district near the dynamo. */
export function freeTileFor(type: string, prefer?: string): { x: number; y: number } | null {
  const d = BUILDING[type];
  if (!d) return null;
  const cands: { x: number; y: number; score: number }[] = [];
  for (const p of G.s.plots)
    for (let yy = 0; yy < 8; yy++)
      for (let xx = 0; xx < 8; xx++) {
        const x = (p % PLOTS) * 8 + xx, y = Math.floor(p / PLOTS) * 8 + yy;
        if (!canPlaceAt(d, x, y).ok) continue;
        const dist = Math.abs(x - DYNAMO.x) + Math.abs(y - DYNAMO.y);
        const pen = prefer && districtAt(x, y) !== prefer ? 30 : 0;
        cands.push({ x, y, score: dist + pen + Math.random() * 6 });
      }
  cands.sort((a, b) => a.score - b.score);
  return cands[0] || null;
}

export const corePlot = CORE_PLOT;
