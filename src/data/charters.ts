// Weekly Town Charter goal pool. Three goals are drawn each ISO week (seeded, so stable within the week).
// `scale` lets goals grow gently with the town tier.
import type { CharterMetric } from '../core/types';

export interface CharterTpl {
  id: string;
  metric: CharterMetric;
  base: number;
  perTier: number;
  text: (n: number) => string;
}

export const CHARTERS: CharterTpl[] = [
  { id: 'events', metric: 'events', base: 3, perTier: 0, text: (n) => `Complete ${n} grid events` },
  { id: 'rides', metric: 'rides', base: 3, perTier: 0, text: (n) => `Ride ${n} times` },
  { id: 'kj', metric: 'kj', base: 1200, perTier: 250, text: (n) => `Generate ${n.toLocaleString('en-US')} kJ` },
  { id: 'minutes', metric: 'minutes', base: 120, perTier: 15, text: (n) => `Ride for ${n} minutes` },
  { id: 'builds', metric: 'builds', base: 3, perTier: 1, text: (n) => `Build ${n} new buildings` },
  { id: 'upgrades', metric: 'upgrades', base: 2, perTier: 1, text: (n) => `Upgrade ${n} buildings` },
  { id: 'requests', metric: 'requests', base: 2, perTier: 0, text: (n) => `Fulfil ${n} citizen requests` },
  { id: 'z2', metric: 'z2min', base: 60, perTier: 10, text: (n) => `Spend ${n} minutes in Zone 2` },
  { id: 'sprints', metric: 'sprints', base: 3, perTier: 0, text: (n) => `Hit ${n} sprints over 1.5× FTP` },
];

export const CHARTER_REWARD = (tier: number) => ({ sparks: 2 + Math.floor(tier / 2), gold: 100 + tier * 80, energy: 150 + tier * 60 });
