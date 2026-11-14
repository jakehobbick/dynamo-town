// Research tree actions.
import { emit } from '../core/bus';
import { G } from '../core/state';
import type { ResearchDef } from '../core/types';
import { RES_NODE } from '../data/research';
import { TIERS } from '../data/tiers';
import { canAfford, invalidate, pay } from './economy';

export function canResearch(r: ResearchDef): { ok: boolean; why?: string } {
  const s = G.s;
  if (s.research.includes(r.id)) return { ok: false, why: 'Done' };
  const miss = r.needs.filter((n) => !s.research.includes(n));
  if (miss.length) return { ok: false, why: 'Needs ' + miss.map((m) => RES_NODE[m]?.name).join(', ') };
  if ((r.minTier ?? 0) > s.tier) return { ok: false, why: `Needs ${TIERS[r.minTier!].name}` };
  return { ok: true };
}

export function doResearch(id: string) {
  const r = RES_NODE[id];
  if (!r || !canResearch(r).ok || !canAfford(r.cost)) return false;
  pay(r.cost);
  G.s.research.push(id);
  if (r.cosmetic === 'paint') G.s.cosmetics.dynamo = G.s.cosmetics.dynamo || 'brass';
  if (r.cosmetic === 'lanterns') G.s.cosmetics.lanterns = 'rainbow';
  if (r.cosmetic === 'fireworks') G.s.cosmetics.fireworks = true;
  invalidate();
  emit('research', id);
  return true;
}
