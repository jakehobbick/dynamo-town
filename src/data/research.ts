// Research tree. `needs` are prerequisite node ids. Effects stack additively.
import type { ResearchDef } from '../core/types';

export const RESEARCH: ResearchDef[] = [
  // Power: your riding, the battery and the grid
  { id: 'gearing', name: 'Better Gearing', icon: '⚙️', branch: 'power', desc: '+3% energy from every ride.', cost: { research: 20, energy: 100 }, needs: [], boost: { rideEnergy: 0.03 } },
  { id: 'coils', name: 'Copper Coils', icon: '🧲', branch: 'power', desc: '+500 kJ battery capacity.', cost: { research: 40, energy: 200, materials: 80 }, needs: ['gearing'], battery: 500 },
  { id: 'flywheel', name: 'Heavy Flywheel', icon: '🛞', branch: 'power', desc: '+4% energy from every ride.', cost: { research: 90, energy: 400 }, needs: ['coils'], boost: { rideEnergy: 0.04 } },
  { id: 'smartgrid', name: 'Smart Grid', icon: '📶', branch: 'power', desc: 'The town draws 25% less power while you rest.', cost: { research: 120, energy: 400, materials: 200 }, needs: ['coils'], boost: { upkeep: 0.25 } },
  { id: 'supercap', name: 'Supercapacitors', icon: '🔋', branch: 'power', desc: '+1,200 kJ battery capacity.', cost: { research: 220, energy: 900, materials: 400 }, needs: ['flywheel'], battery: 1200, minTier: 2 },
  { id: 'regen', name: 'Regenerative Hubs', icon: '♻️', branch: 'power', desc: '+5% energy from every ride.', cost: { research: 400, energy: 1500, sparks: 2 }, needs: ['supercap'], boost: { rideEnergy: 0.05 }, minTier: 3 },
  { id: 'accumulator', name: 'Grand Accumulator', icon: '🏺', branch: 'power', desc: '+3,000 kJ battery capacity.', cost: { research: 800, energy: 3000, materials: 1500, sparks: 4 }, needs: ['regen'], battery: 3000, minTier: 4 },

  // Growth: food, homes, happiness
  { id: 'rotation', name: 'Crop Rotation', icon: '🔄', branch: 'growth', desc: '+20% food production.', cost: { research: 25, energy: 80 }, needs: [], boost: { food: 0.2 } },
  { id: 'beekeeping', name: 'Beekeeping', icon: '🐝', branch: 'growth', desc: 'Unlocks the Apiary.', cost: { research: 30, energy: 100 }, needs: ['rotation'], unlocks: ['beehive'] },
  { id: 'irrigation', name: 'Irrigation', icon: '💦', branch: 'growth', desc: 'Unlocks the Greenhouse. +10% food.', cost: { research: 80, energy: 300, materials: 120 }, needs: ['rotation'], unlocks: ['greenhouse'], boost: { food: 0.1 } },
  { id: 'civic', name: 'Civic Planning', icon: '📐', branch: 'growth', desc: 'Unlocks Apartment Blocks (Town tier). +25% population growth.', cost: { research: 150, energy: 500, gold: 150 }, needs: ['irrigation'], unlocks: ['apartments'], boost: { popGrowth: 0.25 } },
  { id: 'festivals', name: 'Festival Committee', icon: '🎪', branch: 'growth', desc: '+10% rewards from grid events.', cost: { research: 200, energy: 600, gold: 200 }, needs: ['civic'], boost: { eventReward: 0.1 } },
  { id: 'herpetology', name: 'Herpetology', icon: '🦎', branch: 'growth', desc: 'Unlocks the Gecko Nursery.', cost: { research: 500, energy: 2000, gold: 600 }, needs: ['festivals'], unlocks: ['nursery'], minTier: 4 },

  // Industry: materials and gold
  { id: 'masonry', name: 'Masonry', icon: '🧱', branch: 'industry', desc: 'Unlocks Brickworks.', cost: { research: 30, energy: 150, materials: 60 }, needs: [], unlocks: ['brickworks'], minTier: 1 },
  { id: 'metallurgy', name: 'Metallurgy', icon: '🔥', branch: 'industry', desc: 'Unlocks the Foundry. +10% materials.', cost: { research: 100, energy: 400, materials: 200 }, needs: ['masonry'], unlocks: ['foundry'], boost: { materials: 0.1 } },
  { id: 'logistics', name: 'Logistics', icon: '📦', branch: 'industry', desc: '+20% gold income.', cost: { research: 120, energy: 400, gold: 150 }, needs: ['masonry'], boost: { gold: 0.2 } },
  { id: 'shipbuilding', name: 'Shipbuilding', icon: '⛵', branch: 'industry', desc: 'Unlocks the Shipyard.', cost: { research: 160, energy: 600, materials: 300 }, needs: ['logistics'], unlocks: ['shipyard'], minTier: 2 },
  { id: 'assembly', name: 'Assembly Line', icon: '🏭', branch: 'industry', desc: 'Unlocks the Factory. +15% materials.', cost: { research: 260, energy: 900, materials: 500 }, needs: ['metallurgy'], unlocks: ['factory'], boost: { materials: 0.15 } },

  // Science
  { id: 'printing', name: 'Printing Press', icon: '📰', branch: 'science', desc: '+25% research.', cost: { research: 40, energy: 150, materials: 60 }, needs: [], boost: { research: 0.25 } },
  { id: 'astronomy', name: 'Astronomy', icon: '🔭', branch: 'science', desc: 'Unlocks the Observatory.', cost: { research: 250, energy: 900, gold: 250 }, needs: ['printing'], unlocks: ['observatory'], minTier: 3 },
  { id: 'aerodynamics', name: 'Aerodynamics', icon: '🌀', branch: 'science', desc: 'Unlocks the Wind Tunnel. +3% ride energy.', cost: { research: 350, energy: 1200, materials: 600 }, needs: ['printing', 'flywheel'], unlocks: ['aerolab'], boost: { rideEnergy: 0.03 }, minTier: 3 },
  { id: 'meteorology', name: 'Meteorology', icon: '🌦️', branch: 'science', desc: '+10% event rewards. Outdoor ride imports credit 10% more.', cost: { research: 300, energy: 1000 }, needs: ['astronomy'], boost: { eventReward: 0.1, importRate: 0.1 } },
  { id: 'airships', name: 'Airships', icon: '🛩️', branch: 'science', desc: 'Unlocks the Airship Hangar.', cost: { research: 900, energy: 4000, materials: 2000, sparks: 4 }, needs: ['meteorology', 'assembly'], unlocks: ['hangar'], minTier: 5 },

  // Whimsy: cosmetics
  { id: 'paint', name: 'Dynamo Paint', icon: '🎨', branch: 'whimsy', desc: 'Repaint the Dynamo in copper, teal or rose.', cost: { research: 30, energy: 120, sparks: 1 }, needs: [], cosmetic: 'paint' },
  { id: 'lanterns', name: 'Coloured Lanterns', icon: '🏮', branch: 'whimsy', desc: 'Rainbow street lanterns at night.', cost: { research: 60, energy: 200, sparks: 1 }, needs: ['paint'], cosmetic: 'lanterns' },
  { id: 'statue', name: 'Hero Statue', icon: '🗿', branch: 'whimsy', desc: 'Unlocks the Cyclist Statue.', cost: { research: 100, energy: 400, materials: 200, sparks: 1 }, needs: ['paint'], unlocks: ['statue'] },
  { id: 'fireworks', name: 'Fireworks', icon: '🎆', branch: 'whimsy', desc: 'Fireworks after every completed event.', cost: { research: 150, energy: 500, gold: 150, sparks: 2 }, needs: ['lanterns'], cosmetic: 'fireworks' },
  { id: 'goldcrown', name: 'Golden Dynamo', icon: '👑', branch: 'whimsy', desc: 'Gold-leaf the Dynamo. Pure vanity.', cost: { research: 1500, energy: 5000, gold: 2000, sparks: 8 }, needs: ['fireworks'], cosmetic: 'gold', minTier: 5 },
];

export const RES_NODE: Record<string, ResearchDef> = Object.fromEntries(RESEARCH.map((r) => [r.id, r]));
