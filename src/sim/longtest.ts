// Long-term progression test: a scripted bot rides real sessions (time-accelerated),
// a simple "player" spends energy, and the clock skips between rides.
import { G, now } from '../core/state';
import { markDirty, saveNow } from '../core/save';
import { fmtInt } from '../core/util';
import { BUILDINGS } from '../data/buildings';
import { RESEARCH } from '../data/research';
import { TIERS } from '../data/tiers';
import { canAfford } from './economy';
import { checkAchievements, checkTier, citizenTick, fulfil, idleCatchUp, requestReady } from './progression';
import { canResearch, doResearch } from './research';
import { buyPlot, canPlaceAt, place, plotBuyable, plotCost, typeAvailable, upgrade, upgradeCost } from './town';
import { endRide, startRide, updateRide, ride } from '../ride/session';
import { sens, sim } from '../ride/sensors';
import { N, PLOTS } from './map';

/** Ride a full session with the bot, compressed to a few hundred steps. */
export function simulateRide(mode: 'event' | 'plan' | 'free', arg: string | number, minutes: number) {
  const prevSrc = sens.src, prevBot = sim.bot, prevSpeed = sim.speed;
  sens.src = 'sim';
  sim.bot = true;
  sim.speed = 200; // 0.05 s real step = 10 s of riding
  startRide(mode, arg);
  let guard = 0;
  while (ride && ride.t < minutes * 60 && guard++ < 20000) updateRide(0.05);
  const r = endRide();
  sens.src = prevSrc;
  sim.bot = prevBot;
  sim.speed = prevSpeed;
  return r;
}

/** Spend like a reasonable player: research, upgrades, buildings, land. */
export function autoSpend() {
  let acted = 0;
  for (let guard = 0; guard < 60; guard++) {
    let did = false;
    for (const r of RESEARCH) if (canResearch(r).ok && canAfford(r.cost) && doResearch(r.id)) did = true;
    // cheapest affordable upgrade
    const ups = G.s.buildings.map((b) => ({ b, c: upgradeCost(b) })).filter((x) => x.c && canAfford(x.c)).sort((a, b) => (a.c!.energy || 0) - (b.c!.energy || 0));
    if (ups.length && Math.random() < 0.5) {
      if (upgrade(ups[0].b)) did = true;
    }
    const defs = BUILDINGS.filter((d) => !d.decor && typeAvailable(d).ok && canAfford(d.tiers[0].cost));
    if (defs.length) {
      const d = defs[Math.floor(Math.random() * defs.length)];
      const spot = findSpot(d.id);
      if (spot && place(d.id, spot[0], spot[1])) did = true;
    }
    if (!did || G.s.plots.length < 4 + G.s.tier * 2) {
      const c = plotCost();
      for (let p = 0; p < PLOTS * PLOTS; p++) if (plotBuyable(p).ok && canAfford(c)) {
        if (buyPlot(p)) {
          did = true;
          break;
        }
      }
    }
    for (const c of G.s.citizens) if (c.request && requestReady(c.request)) fulfil(c);
    if (!did) break;
    acted++;
  }
  return acted;
}

function findSpot(type: string): [number, number] | null {
  const d = BUILDINGS.find((x) => x.id === type)!;
  for (let i = 0; i < 400; i++) {
    const x = Math.floor(Math.random() * N), y = Math.floor(Math.random() * N);
    if (canPlaceAt(d, x, y).ok) return [x, y];
  }
  return null;
}

export async function runLongTest(weeks: number, progress: (m: string) => void) {
  const lines: string[] = [];
  const start = { kj: G.s.lifetimeKJ, tier: G.s.tier, b: G.s.buildings.length, ach: Object.keys(G.s.achievements).length };
  const plans = [45, 60, 30, 90, 45];
  for (let w = 0; w < weeks; w++) {
    const rides = 3 + (w % 2);
    for (let r = 0; r < rides; r++) {
      const kind = r % 3;
      if (kind === 0) simulateRide('plan', plans[(w + r) % plans.length], plans[(w + r) % plans.length]);
      else if (kind === 1) simulateRide('event', ['factory', 'storm', 'harvest', 'surge', 'festival'][(w + r) % 5], 40);
      else simulateRide('free', 0, 50);
      checkTier();
      autoSpend();
      // skip 1-2 days (rest days)
      G.s.timeOffset += (36 + Math.random() * 18) * 3600000;
      idleCatchUp();
      citizenTick();
      checkAchievements();
    }
    G.s.timeOffset += 24 * 3600000;
    idleCatchUp();
    progress(`Week ${w + 1}/${weeks}: ${fmtInt(G.s.lifetimeKJ)} kJ · ${TIERS[G.s.tier].name} · ${G.s.buildings.length} buildings · ${Math.floor(G.s.pop)} citizens`);
    await new Promise((res) => setTimeout(res, 0));
  }
  markDirty();
  await saveNow();
  lines.push(`Simulated ${weeks} weeks (${G.s.stats.rides} rides total).`);
  lines.push(`Lifetime: ${fmtInt(start.kj)} → ${fmtInt(G.s.lifetimeKJ)} kJ`);
  lines.push(`Tier: ${TIERS[start.tier].name} → ${TIERS[G.s.tier].name}`);
  lines.push(`Buildings: ${start.b} → ${G.s.buildings.length}; plots ${G.s.plots.length}; research ${G.s.research.length}/${RESEARCH.length}`);
  lines.push(`Citizens: ${Math.floor(G.s.pop)} (${G.s.citizens.length} named, ${G.s.stats.requests} requests done)`);
  lines.push(`Achievements: ${start.ach} → ${Object.keys(G.s.achievements).length}; charters ${G.s.stats.charters}`);
  lines.push(`Clock offset now ${(G.s.timeOffset / 86400000).toFixed(1)} days (${new Date(now()).toDateString()})`);
  return lines.join('<br>');
}
