// Town tiers, reached by lifetime energy (kJ) generated on the bike.
// A 45-minute ride at ~200 W is ~540 kJ, so Village is ~3 weeks of riding and City ~9-12 months.
export interface TownTier {
  name: string;
  kj: number;
  icon: string;
  blurb: string;
  reward: { sparks: number; gold: number };
}

export const TIERS: TownTier[] = [
  { name: 'Outpost', kj: 0, icon: '⛺', blurb: 'A dynamo, a few cottages and a field.', reward: { sparks: 0, gold: 0 } },
  { name: 'Hamlet', kj: 2500, icon: '🏘️', blurb: 'Copperworks opens: workshops and battery banks.', reward: { sparks: 2, gold: 80 } },
  { name: 'Village', kj: 10000, icon: '🏡', blurb: 'Tidewater Harbor opens on the western shore.', reward: { sparks: 3, gold: 200 } },
  { name: 'Town', kj: 25000, icon: '🏛️', blurb: 'Lumen Campus opens: research takes off. Apartments allowed.', reward: { sparks: 4, gold: 400 } },
  { name: 'Borough', kj: 50000, icon: '🌿', blurb: 'The Gecko Sanctuary opens in the southern jungle.', reward: { sparks: 6, gold: 700 } },
  { name: 'City', kj: 100000, icon: '🌆', blurb: 'The Sky Dock rises above the clouds.', reward: { sparks: 8, gold: 1200 } },
  { name: 'Metropolis', kj: 200000, icon: '👑', blurb: 'The Dynamo gets its golden crown. Legendary.', reward: { sparks: 12, gold: 2500 } },
];

export function tierFor(kj: number) {
  let t = 0;
  for (let i = 0; i < TIERS.length; i++) if (kj >= TIERS[i].kj) t = i;
  return t;
}
