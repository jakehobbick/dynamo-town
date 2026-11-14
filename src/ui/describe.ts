// Human-readable summaries of what buildings / tiers / research do.
import type { BoostKey, TierLevel } from '../core/types';
import { fmtNum } from '../core/util';
import { RES_ICON } from './ui';

const BOOST_TXT: Record<BoostKey, string> = {
  rideEnergy: 'ride energy',
  eventReward: 'event rewards',
  food: 'food',
  materials: 'materials',
  research: 'research',
  gold: 'gold',
  upkeep: 'less idle draw',
  popGrowth: 'growth',
  importRate: 'import credit',
};

export function tierFx(t: TierLevel): string[] {
  const out: string[] = [];
  if (t.housing) out.push(`🏠 ${t.housing} homes`);
  if (t.prod) for (const [k, v] of Object.entries(t.prod)) if (v) out.push(`${RES_ICON[k as keyof typeof RES_ICON]} +${fmtNum(v)}/h`);
  if (t.happiness) out.push(`😊 +${t.happiness}`);
  if (t.battery) out.push(`🔋 +${fmtNum(t.battery)} kJ`);
  if (t.boost) for (const [k, v] of Object.entries(t.boost)) if (v) out.push(`✨ +${Math.round(v * 100)}% ${BOOST_TXT[k as BoostKey]}`);
  return out;
}

export function boostTxt(b: Partial<Record<BoostKey, number>>) {
  return Object.entries(b)
    .filter(([, v]) => v)
    .map(([k, v]) => `+${Math.round((v || 0) * 100)}% ${BOOST_TXT[k as BoostKey]}`)
    .join(', ');
}
