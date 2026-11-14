// All building content. Add a building by appending to BUILDINGS and giving it an `art` key
// that exists in src/render/art/buildings.ts (or reuse an existing art key).
// Each tier lists: label (what visibly changes), cost, and what it does.
import type { BuildingDef, Cost, DistrictId, TierLevel } from '../core/types';

type T = [label: string, cost: Cost, fx?: Omit<TierLevel, 'name' | 'label' | 'cost'>];

function b(
  id: string,
  name: string,
  district: DistrictId,
  icon: string,
  desc: string,
  upkeep: number,
  tiers: T[],
  extra: Partial<BuildingDef> = {},
): BuildingDef {
  return {
    id,
    name,
    district,
    icon,
    desc,
    upkeep,
    art: id,
    tiers: tiers.map(([label, cost, fx], i) => ({ name: `${name} ${['I', 'II', 'III', 'IV'][i]}`, label, cost, ...(fx || {}) })),
    ...extra,
  };
}

export const BUILDINGS: BuildingDef[] = [
  // ---------------- Old Town (residential) ----------------
  b('cottage', 'Cottage', 'residential', '🏠', 'A snug home for a few townsfolk.', 0.3, [
    ['Thatched cottage', { energy: 60, materials: 20 }, { housing: 4 }],
    ['Timber cottage with a porch', { energy: 140, materials: 50, gold: 10 }, { housing: 8 }],
    ['Two-storey stone cottage', { energy: 320, materials: 120, gold: 40 }, { housing: 14 }],
  ]),
  b('townhouse', 'Townhouse', 'residential', '🏘️', 'Tall, narrow and colourful.', 0.6, [
    ['Three-storey townhouse', { energy: 200, materials: 80, gold: 20 }, { housing: 10 }],
    ['Bay windows and balconies', { energy: 450, materials: 180, gold: 60 }, { housing: 18 }],
    ['Rooftop garden terrace', { energy: 900, materials: 350, gold: 140 }, { housing: 28 }],
  ], { minTier: 1 }),
  b('apartments', 'Apartment Block', 'residential', '🏢', 'Lots of homes on a small footprint.', 1.2, [
    ['Brick block, four floors', { energy: 900, materials: 400, gold: 120 }, { housing: 30 }],
    ['Six floors with a lift tower', { energy: 1800, materials: 800, gold: 260 }, { housing: 50 }],
    ['Glass sky-lounge crown', { energy: 3600, materials: 1500, gold: 500, sparks: 2 }, { housing: 80 }],
  ], { minTier: 3, needs: 'civic' }),
  b('bakery', 'Bakery', 'residential', '🥐', 'Warm bread. Everyone is happier.', 0.5, [
    ['Wood-fired oven', { energy: 90, materials: 40 }, { prod: { food: 3 }, happiness: 3 }],
    ['Striped awning and café tables', { energy: 220, materials: 90, gold: 20 }, { prod: { food: 6 }, happiness: 5 }],
    ['Grand patisserie', { energy: 500, materials: 200, gold: 60 }, { prod: { food: 10 }, happiness: 8 }],
  ]),
  b('cafe', 'Bike Café', 'residential', '☕', 'Espresso, cake and bikes leaning on the wall.', 0.5, [
    ['Corner café', { energy: 150, materials: 60, gold: 20 }, { prod: { gold: 2 }, happiness: 4 }],
    ['Bike racks and a terrace', { energy: 350, materials: 140, gold: 50 }, { prod: { gold: 4 }, happiness: 6 }],
    ['Roastery with rooftop seating', { energy: 800, materials: 300, gold: 120 }, { prod: { gold: 7 }, happiness: 9 }],
  ]),
  b('park', 'Pocket Park', 'residential', '🌳', 'Trees, benches and a bit of quiet.', 0.1, [
    ['Lawn and a tree', { energy: 40, materials: 10 }, { happiness: 3 }],
    ['Flower beds and benches', { energy: 120, materials: 40, gold: 10 }, { happiness: 5 }],
    ['Gazebo and pond', { energy: 300, materials: 100, gold: 40 }, { happiness: 8 }],
  ]),
  b('fountain', 'Fountain Square', 'residential', '⛲', 'A plaza for gossip and pigeons.', 0.3, [
    ['Stone basin', { energy: 120, materials: 60 }, { happiness: 4 }],
    ['Tiered fountain', { energy: 300, materials: 140, gold: 30 }, { happiness: 7 }],
    ['Dancing jets that pulse with your watts', { energy: 700, materials: 300, gold: 80, sparks: 1 }, { happiness: 11 }],
  ]),
  b('market', 'Market Hall', 'residential', '🧺', 'Stalls that turn produce into gold.', 0.5, [
    ['Canvas stalls', { energy: 120, materials: 50 }, { prod: { gold: 3 } }],
    ['Covered hall', { energy: 300, materials: 130, gold: 30 }, { prod: { gold: 6 } }],
    ['Clock-tower market', { energy: 700, materials: 280, gold: 80 }, { prod: { gold: 11 }, happiness: 3 }],
  ]),
  b('school', 'Schoolhouse', 'residential', '🏫', 'Little minds, big ideas: a trickle of research.', 0.5, [
    ['One-room school', { energy: 140, materials: 60, gold: 20 }, { prod: { research: 1.5 }, happiness: 2 }],
    ['Bell tower and playground', { energy: 340, materials: 150, gold: 60 }, { prod: { research: 3 }, happiness: 3 }],
    ['Academy with a science wing', { energy: 800, materials: 320, gold: 140 }, { prod: { research: 5 }, happiness: 4 }],
  ]),
  b('bikeshop', 'Bike Shop', 'residential', '🚲', 'Tuned bikes mean more power to the grid.', 0.4, [
    ['Repair stand', { energy: 200, materials: 80, gold: 40 }, { boost: { rideEnergy: 0.02 }, happiness: 2 }],
    ['Wheel-building workshop', { energy: 500, materials: 200, gold: 100 }, { boost: { rideEnergy: 0.04 }, happiness: 3 }],
    ['Pro fit studio', { energy: 1200, materials: 450, gold: 240, sparks: 2 }, { boost: { rideEnergy: 0.06 }, happiness: 5 }],
  ], { max: 1 }),
  b('townhall', 'Town Hall', 'residential', '🏛️', 'The heart of civic life. Boosts gold and growth.', 0.8, [
    ['Wooden meeting hall', { energy: 300, materials: 150, gold: 60 }, { prod: { gold: 4 }, boost: { popGrowth: 0.15 }, happiness: 3 }],
    ['Columned hall with a dome', { energy: 900, materials: 400, gold: 200 }, { prod: { gold: 8 }, boost: { popGrowth: 0.3 }, happiness: 5 }],
    ['Gilded clock dome', { energy: 2400, materials: 1000, gold: 500, sparks: 3 }, { prod: { gold: 14 }, boost: { popGrowth: 0.5 }, happiness: 8 }],
  ], { max: 1, minTier: 1 }),
  b('bandstand', 'Bandstand', 'residential', '🎺', 'Music on summer evenings. Festival events pay more.', 0.3, [
    ['Wooden stage', { energy: 180, materials: 80, gold: 20 }, { happiness: 5, boost: { eventReward: 0.03 } }],
    ['Painted pavilion with bunting', { energy: 420, materials: 180, gold: 60 }, { happiness: 7, boost: { eventReward: 0.05 } }],
    ['Lantern-lit concert shell', { energy: 1000, materials: 400, gold: 150, sparks: 1 }, { happiness: 10, boost: { eventReward: 0.08 } }],
  ], { max: 1 }),

  // ---------------- Meadow Farms ----------------
  b('wheat', 'Wheat Field', 'farms', '🌾', 'Golden rows that sway in the wind.', 0.2, [
    ['Small plot', { energy: 50, materials: 15 }, { prod: { food: 4 } }],
    ['Fenced field with a scarecrow', { energy: 130, materials: 40 }, { prod: { food: 8 } }],
    ['Irrigated field with a tractor', { energy: 320, materials: 110, gold: 30 }, { prod: { food: 14 } }],
  ]),
  b('orchard', 'Orchard', 'farms', '🍎', 'Apple trees that blossom in spring.', 0.2, [
    ['Young saplings', { energy: 90, materials: 30 }, { prod: { food: 4 }, happiness: 1 }],
    ['Fruiting trees and crates', { energy: 220, materials: 80, gold: 10 }, { prod: { food: 8 }, happiness: 2 }],
    ['Cider press', { energy: 520, materials: 180, gold: 50 }, { prod: { food: 12, gold: 2 }, happiness: 3 }],
  ]),
  b('barn', 'Dairy Barn', 'farms', '🐄', 'Cows, milk and a red barn.', 0.4, [
    ['Red barn', { energy: 160, materials: 70 }, { prod: { food: 7 } }],
    ['Silo and paddock', { energy: 400, materials: 170, gold: 30 }, { prod: { food: 13 } }],
    ['Creamery with twin silos', { energy: 900, materials: 380, gold: 90 }, { prod: { food: 22, gold: 2 } }],
  ], { minTier: 1 }),
  b('windmill', 'Windmill', 'farms', '🌬️', 'Grinds grain. Boosts all food output.', 0.3, [
    ['Post mill', { energy: 200, materials: 90 }, { prod: { food: 3 }, boost: { food: 0.08 } }],
    ['Tower mill with sails', { energy: 500, materials: 220, gold: 40 }, { prod: { food: 5 }, boost: { food: 0.14 } }],
    ['Painted mill with a bakery annex', { energy: 1100, materials: 450, gold: 120 }, { prod: { food: 8 }, boost: { food: 0.2 } }],
  ], { max: 2 }),
  b('beehive', 'Apiary', 'farms', '🐝', 'Bees, honey and very happy flowers.', 0.1, [
    ['Three hives', { energy: 80, materials: 25 }, { prod: { food: 2, gold: 1 }, happiness: 2 }],
    ['Hive row and wildflowers', { energy: 200, materials: 70, gold: 20 }, { prod: { food: 3, gold: 2 }, happiness: 3 }],
    ['Honey house', { energy: 480, materials: 160, gold: 60 }, { prod: { food: 5, gold: 4 }, happiness: 4 }],
  ], { needs: 'beekeeping' }),
  b('greenhouse', 'Greenhouse', 'farms', '🪴', 'Grows food all year, even in winter.', 0.8, [
    ['Glass lean-to', { energy: 300, materials: 140, gold: 30 }, { prod: { food: 10 } }],
    ['Vaulted glasshouse', { energy: 700, materials: 320, gold: 90 }, { prod: { food: 18 } }],
    ['Crystal palace conservatory', { energy: 1600, materials: 700, gold: 220, sparks: 2 }, { prod: { food: 30 }, happiness: 4 }],
  ], { needs: 'irrigation' }),

  // ---------------- Copperworks (industry) ----------------
  b('workshop', 'Workshop', 'industry', '🔨', 'Turns stored power into building materials.', 0.6, [
    ['Carpenter shed', { energy: 100, materials: 30 }, { prod: { materials: 4 } }],
    ['Brick workshop and crane', { energy: 260, materials: 80, gold: 20 }, { prod: { materials: 8 } }],
    ['Machine shop with a chimney', { energy: 600, materials: 200, gold: 60 }, { prod: { materials: 14 } }],
  ]),
  b('sawmill', 'Sawmill', 'industry', '🪚', 'Logs in, planks out.', 0.6, [
    ['Water-wheel saw', { energy: 160, materials: 40 }, { prod: { materials: 6 } }],
    ['Log yard and conveyor', { energy: 400, materials: 120, gold: 30 }, { prod: { materials: 11 } }],
    ['Steam sawmill', { energy: 900, materials: 300, gold: 90 }, { prod: { materials: 18 } }],
  ], { minTier: 1 }),
  b('brickworks', 'Brickworks', 'industry', '🧱', 'Kilns that fire bricks and boost materials.', 0.9, [
    ['Bottle kiln', { energy: 300, materials: 100, gold: 30 }, { prod: { materials: 7 }, boost: { materials: 0.06 } }],
    ['Twin kilns', { energy: 700, materials: 260, gold: 80 }, { prod: { materials: 12 }, boost: { materials: 0.1 } }],
    ['Hoffmann ring kiln', { energy: 1600, materials: 600, gold: 200 }, { prod: { materials: 20 }, boost: { materials: 0.15 } }],
  ], { needs: 'masonry', max: 2 }),
  b('foundry', 'Foundry', 'industry', '🔥', 'Molten copper for coils and machines.', 1.4, [
    ['Crucible furnace', { energy: 600, materials: 250, gold: 80 }, { prod: { materials: 14, gold: 2 } }],
    ['Blast furnace', { energy: 1400, materials: 600, gold: 200 }, { prod: { materials: 24, gold: 4 } }],
    ['Electric arc furnace', { energy: 3200, materials: 1300, gold: 450, sparks: 2 }, { prod: { materials: 40, gold: 7 } }],
  ], { needs: 'metallurgy' }),
  b('factory', 'Factory', 'industry', '🏭', 'Assembly lines. Factory Orders pay out here.', 1.6, [
    ['Sawtooth-roof shed', { energy: 900, materials: 400, gold: 120 }, { prod: { materials: 16, gold: 6 } }],
    ['Assembly hall and loading bay', { energy: 2000, materials: 900, gold: 300 }, { prod: { materials: 28, gold: 10 } }],
    ['Clockwork mega-works', { energy: 4500, materials: 2000, gold: 700, sparks: 3 }, { prod: { materials: 45, gold: 16 } }],
  ], { size: 2, needs: 'assembly' }),
  b('battery', 'Battery Bank', 'industry', '🔋', 'Stores more of your energy between rides.', 0.2, [
    ['Lead-acid racks', { energy: 150, materials: 60 }, { battery: 400 }],
    ['Copper cells', { energy: 400, materials: 160, gold: 40 }, { battery: 900 }],
    ['Glowing flow battery', { energy: 1000, materials: 400, gold: 120, sparks: 1 }, { battery: 1800 }],
  ]),
  b('capacitor', 'Capacitor Tower', 'industry', '⚡', 'Lightning Surge sprints charge it. Raises event rewards.', 0.5, [
    ['Tesla coil', { energy: 400, materials: 200, gold: 60 }, { battery: 300, boost: { eventReward: 0.05 } }],
    ['Twin-ring tower', { energy: 1000, materials: 450, gold: 160, sparks: 1 }, { battery: 700, boost: { eventReward: 0.08 } }],
    ['Arc-crowned spire', { energy: 2500, materials: 1000, gold: 400, sparks: 3 }, { battery: 1500, boost: { eventReward: 0.12 } }],
  ], { max: 1 }),
  b('turbine', 'Grid Regulator', 'industry', '🎛️', 'Smart wiring. The town sips less power while you rest.', 0.1, [
    ['Switch cabinet', { energy: 250, materials: 120, gold: 40 }, { boost: { upkeep: 0.1 } }],
    ['Transformer yard', { energy: 600, materials: 280, gold: 100 }, { boost: { upkeep: 0.18 } }],
    ['Humming substation', { energy: 1400, materials: 600, gold: 240 }, { boost: { upkeep: 0.25 } }],
  ], { max: 2, minTier: 1 }),

  // ---------------- Tidewater Harbor ----------------
  b('fishdock', 'Fishing Dock', 'harbor', '🎣', 'Boats bring in the catch every morning.', 0.4, [
    ['Wooden jetty and rowboat', { energy: 200, materials: 80 }, { prod: { food: 9 } }],
    ['Pier with a trawler', { energy: 480, materials: 200, gold: 40 }, { prod: { food: 16 } }],
    ['Smokehouse and twin boats', { energy: 1100, materials: 450, gold: 120 }, { prod: { food: 26, gold: 3 } }],
  ], { coastal: true }),
  b('lighthouse', 'Lighthouse', 'harbor', '🗼', 'Guides ships home. Trade and happiness rise.', 0.6, [
    ['Stone beacon', { energy: 400, materials: 200, gold: 60 }, { prod: { gold: 4 }, happiness: 4 }],
    ['Striped tower with a lamp room', { energy: 1000, materials: 450, gold: 160 }, { prod: { gold: 8 }, happiness: 6 }],
    ['Great lens that sweeps the night', { energy: 2400, materials: 1000, gold: 400, sparks: 2 }, { prod: { gold: 14 }, happiness: 9 }],
  ], { coastal: true, max: 1 }),
  b('shipyard', 'Shipyard', 'harbor', '⛵', 'Builds boats; spare timber becomes materials.', 1.0, [
    ['Slipway', { energy: 500, materials: 200, gold: 60 }, { prod: { materials: 10, gold: 3 } }],
    ['Covered dry dock', { energy: 1200, materials: 500, gold: 160 }, { prod: { materials: 18, gold: 5 } }],
    ['Gantry crane yard', { energy: 2800, materials: 1100, gold: 380 }, { prod: { materials: 30, gold: 9 } }],
  ], { coastal: true, needs: 'shipbuilding' }),
  b('tradeport', 'Trade Port', 'harbor', '🚢', 'Ships from far away buy your goods.', 0.9, [
    ['Warehouse and quay', { energy: 600, materials: 260, gold: 50 }, { prod: { gold: 10 } }],
    ['Customs house and crane', { energy: 1400, materials: 600, gold: 150 }, { prod: { gold: 18 } }],
    ['Steamship terminal', { energy: 3200, materials: 1300, gold: 380 }, { prod: { gold: 30 } }],
  ], { coastal: true }),
  b('fishmarket', 'Fish Market', 'harbor', '🐟', 'Fresh fish and seagulls. Boosts gold.', 0.4, [
    ['Ice-box stall', { energy: 250, materials: 100, gold: 20 }, { prod: { gold: 4, food: 2 }, happiness: 2 }],
    ['Tiled market hall', { energy: 600, materials: 260, gold: 70 }, { prod: { gold: 7, food: 4 }, happiness: 3 }],
    ['Seafood restaurant pier', { energy: 1400, materials: 560, gold: 180 }, { prod: { gold: 12, food: 6 }, happiness: 6 }],
  ]),

  // ---------------- Lumen Campus ----------------
  b('library', 'Library', 'campus', '📚', 'Quiet halls of research.', 0.6, [
    ['Reading room', { energy: 400, materials: 180, gold: 60 }, { prod: { research: 4 }, happiness: 2 }],
    ['Domed library', { energy: 1000, materials: 420, gold: 160 }, { prod: { research: 8 }, happiness: 3 }],
    ['Grand atrium of books', { energy: 2400, materials: 950, gold: 380 }, { prod: { research: 14 }, happiness: 5 }],
  ]),
  b('lab', 'Laboratory', 'campus', '🧪', 'Bubbling flasks and tesla sparks.', 1.0, [
    ['Brick lab', { energy: 600, materials: 260, gold: 90 }, { prod: { research: 6 } }],
    ['Lab with a fume tower', { energy: 1400, materials: 600, gold: 220 }, { prod: { research: 11 } }],
    ['Particle-loop laboratory', { energy: 3200, materials: 1300, gold: 500, sparks: 2 }, { prod: { research: 19 } }],
  ]),
  b('observatory', 'Observatory', 'campus', '🔭', 'Stargazing. Research boost at night.', 0.7, [
    ['Small dome', { energy: 800, materials: 350, gold: 120 }, { prod: { research: 6 }, happiness: 3 }],
    ['Rotating dome and telescope', { energy: 1800, materials: 800, gold: 300 }, { prod: { research: 11 }, boost: { research: 0.05 }, happiness: 4 }],
    ['Twin-dome observatory', { energy: 4000, materials: 1700, gold: 650, sparks: 3 }, { prod: { research: 18 }, boost: { research: 0.1 }, happiness: 6 }],
  ], { needs: 'astronomy', max: 1 }),
  b('university', 'University', 'campus', '🎓', 'Spires and quads. Big research and pride.', 1.4, [
    ['College hall', { energy: 1500, materials: 700, gold: 250 }, { prod: { research: 10 }, boost: { research: 0.08 }, happiness: 4 }],
    ['Spired quadrangle', { energy: 3500, materials: 1500, gold: 600 }, { prod: { research: 18 }, boost: { research: 0.14 }, happiness: 6 }],
    ['Clock-spire university', { energy: 8000, materials: 3200, gold: 1300, sparks: 4 }, { prod: { research: 30 }, boost: { research: 0.2 }, happiness: 9 }],
  ], { size: 2, max: 1 }),
  b('aerolab', 'Wind Tunnel', 'campus', '🌀', 'Aero research makes every ride count for more.', 1.0, [
    ['Fan tunnel', { energy: 1200, materials: 500, gold: 200 }, { prod: { research: 4 }, boost: { rideEnergy: 0.03 } }],
    ['Smoke-wand test hall', { energy: 2800, materials: 1100, gold: 450, sparks: 1 }, { prod: { research: 7 }, boost: { rideEnergy: 0.05 } }],
    ['Supersonic loop', { energy: 6000, materials: 2400, gold: 1000, sparks: 3 }, { prod: { research: 11 }, boost: { rideEnergy: 0.08 } }],
  ], { needs: 'aerodynamics', max: 1 }),

  // ---------------- Gecko Sanctuary ----------------
  b('terrarium', 'Terrarium Dome', 'gecko', '🦎', 'A misty glass dome full of crested geckos.', 0.6, [
    ['Glass terrarium', { energy: 1200, materials: 500, gold: 200 }, { happiness: 8, prod: { research: 3 } }],
    ['Misting dome with vines', { energy: 2800, materials: 1100, gold: 450 }, { happiness: 12, prod: { research: 5 } }],
    ['Bioluminescent biodome', { energy: 6000, materials: 2400, gold: 1000, sparks: 3 }, { happiness: 18, prod: { research: 8 } }],
  ], { size: 2 }),
  b('nursery', 'Gecko Nursery', 'gecko', '🥚', 'Hatchlings! Visitors pay to see them.', 0.5, [
    ['Incubator hut', { energy: 1000, materials: 400, gold: 150 }, { prod: { gold: 8 }, happiness: 5 }],
    ['Hatchery with viewing windows', { energy: 2400, materials: 900, gold: 380 }, { prod: { gold: 14 }, happiness: 8 }],
    ['Gecko academy', { energy: 5200, materials: 2000, gold: 850, sparks: 2 }, { prod: { gold: 22 }, happiness: 12 }],
  ], { needs: 'herpetology' }),
  b('ferngarden', 'Fern Garden', 'gecko', '🌿', 'Giant ferns and stepping stones.', 0.1, [
    ['Fern grove', { energy: 400, materials: 150, gold: 50 }, { happiness: 5 }],
    ['Mossy stepping stones', { energy: 900, materials: 350, gold: 120 }, { happiness: 8 }],
    ['Glowing fern hollow', { energy: 2000, materials: 800, gold: 300, sparks: 1 }, { happiness: 12 }],
  ]),
  b('grotto', 'Waterfall Grotto', 'gecko', '💧', 'A waterfall into a jungle pool.', 0.3, [
    ['Rock pool', { energy: 900, materials: 400, gold: 140 }, { happiness: 7, prod: { food: 4 } }],
    ['Waterfall', { energy: 2100, materials: 900, gold: 340 }, { happiness: 11, prod: { food: 7 } }],
    ['Rainbow falls', { energy: 4800, materials: 1900, gold: 760, sparks: 2 }, { happiness: 16, prod: { food: 11 } }],
  ], { max: 2 }),
  b('cricketfarm', 'Cricket Farm', 'gecko', '🦗', 'Gecko snacks. Also oddly profitable.', 0.4, [
    ['Cricket crates', { energy: 700, materials: 260, gold: 90 }, { prod: { food: 8, gold: 3 } }],
    ['Fruit-mash kitchen', { energy: 1600, materials: 600, gold: 220 }, { prod: { food: 14, gold: 5 } }],
    ['Gourmet gecko diner', { energy: 3600, materials: 1300, gold: 520 }, { prod: { food: 22, gold: 9 }, happiness: 4 }],
  ]),

  // ---------------- Sky Dock ----------------
  b('mooring', 'Mooring Mast', 'sky', '🗼', 'Airships tie up here. Trade from the clouds.', 0.8, [
    ['Lattice mast', { energy: 2500, materials: 1000, gold: 400 }, { prod: { gold: 16 } }],
    ['Mast with a docked blimp', { energy: 5500, materials: 2200, gold: 900 }, { prod: { gold: 28 } }],
    ['Twin-mast skyport', { energy: 12000, materials: 4800, gold: 2000, sparks: 4 }, { prod: { gold: 46 } }],
  ]),
  b('hangar', 'Airship Hangar', 'sky', '🛩️', 'Builds airships out of your watts.', 1.6, [
    ['Arched hangar', { energy: 3500, materials: 1500, gold: 600 }, { prod: { materials: 30, gold: 8 } }],
    ['Hangar with a gondola crane', { energy: 8000, materials: 3200, gold: 1300 }, { prod: { materials: 50, gold: 14 } }],
    ['Cloud foundry', { energy: 17000, materials: 7000, gold: 2800, sparks: 5 }, { prod: { materials: 80, gold: 22 } }],
  ], { size: 2, needs: 'airships' }),
  b('cloudgarden', 'Cloud Garden', 'sky', '☁️', 'Flowers that grow on clouds.', 0.3, [
    ['Puffy planters', { energy: 1500, materials: 600, gold: 250 }, { happiness: 10, prod: { food: 10 } }],
    ['Floating terraces', { energy: 3500, materials: 1400, gold: 600 }, { happiness: 14, prod: { food: 18 } }],
    ['Rainbow canopy', { energy: 8000, materials: 3200, gold: 1300, sparks: 3 }, { happiness: 20, prod: { food: 28 } }],
  ]),
  b('lanterntower', 'Sky Lantern Tower', 'sky', '🏮', 'Releases lanterns that light the whole city.', 0.6, [
    ['Lantern post', { energy: 2000, materials: 800, gold: 350 }, { happiness: 10, boost: { eventReward: 0.05 } }],
    ['Pagoda of lanterns', { energy: 4500, materials: 1800, gold: 800 }, { happiness: 15, boost: { eventReward: 0.08 } }],
    ['Thousand-lantern spire', { energy: 10000, materials: 4000, gold: 1700, sparks: 4 }, { happiness: 22, boost: { eventReward: 0.12 } }],
  ], { max: 1 }),
  b('balloonport', 'Balloon Port', 'sky', '🎈', 'Hot-air balloon rides for the townsfolk.', 0.5, [
    ['Basket and burner', { energy: 1800, materials: 700, gold: 300 }, { happiness: 9, prod: { gold: 8 } }],
    ['Three balloons', { energy: 4200, materials: 1600, gold: 700 }, { happiness: 13, prod: { gold: 14 } }],
    ['Balloon festival field', { energy: 9500, materials: 3600, gold: 1500, sparks: 3 }, { happiness: 18, prod: { gold: 22 } }],
  ]),

  // ---------------- Decor (event rewards & cheap cosmetics) ----------------
  b('lamppost', 'Lamp Post', 'residential', '💡', 'A little light. Earned from Festival Night.', 0, [
    ['Iron lamp', { energy: 20 }, { happiness: 1 }],
    ['Double lamp', { energy: 60, materials: 10 }, { happiness: 1 }],
    ['Lamp with flower baskets', { energy: 140, materials: 30 }, { happiness: 2 }],
  ], { decor: true }),
  b('statue', 'Cyclist Statue', 'residential', '🗿', 'A bronze rider in full sprint.', 0, [
    ['Stone plinth', { energy: 200, materials: 120 }, { happiness: 3 }],
    ['Bronze rider', { energy: 500, materials: 250, gold: 60 }, { happiness: 5 }],
    ['Golden rider with laurels', { energy: 1200, materials: 500, gold: 200, sparks: 2 }, { happiness: 8 }],
  ], { decor: true, needs: 'statue' }),
  b('flowerbed', 'Flower Bed', 'residential', '🌷', 'Seasonal blooms.', 0, [
    ['Tulips', { energy: 15 }, { happiness: 1 }],
    ['Raised bed', { energy: 50, materials: 10 }, { happiness: 1 }],
    ['Topiary garden', { energy: 120, materials: 30 }, { happiness: 2 }],
  ], { decor: true }),
  b('lightningrod', 'Lightning Rod', 'industry', '🌩️', 'A souvenir from the Storm Blackout.', 0, [
    ['Copper rod', { energy: 40 }, { happiness: 1, battery: 40 }],
    ['Coiled rod', { energy: 120, materials: 40 }, { happiness: 1, battery: 90 }],
    ['Storm catcher', { energy: 300, materials: 100 }, { happiness: 2, battery: 160 }],
  ], { decor: true }),
  b('arch', 'Festival Arch', 'residential', '🎉', 'Bunting and lights over the street.', 0, [
    ['Ribbon arch', { energy: 40 }, { happiness: 2 }],
    ['Lantern arch', { energy: 120, materials: 30 }, { happiness: 3 }],
    ['Firework arch', { energy: 300, materials: 80, gold: 30 }, { happiness: 4 }],
  ], { decor: true }),
  b('tree', 'Tree', 'farms', '🌲', 'Just a lovely tree.', 0, [
    ['Sapling', { energy: 10 }, { happiness: 0.5 }],
    ['Leafy tree', { energy: 30 }, { happiness: 1 }],
    ['Ancient oak', { energy: 90, materials: 10 }, { happiness: 1.5 }],
  ], { decor: true }),
  b('crane', 'Harbor Crane', 'harbor', '🏗️', 'A memento of the Harbor Tide.', 0, [
    ['Wooden crane', { energy: 60, materials: 20 }, { happiness: 1, prod: { gold: 0.5 } }],
    ['Iron crane', { energy: 160, materials: 60 }, { happiness: 1, prod: { gold: 1 } }],
    ['Steam crane', { energy: 400, materials: 140 }, { happiness: 2, prod: { gold: 2 } }],
  ], { decor: true }),
  b('geckostatue', 'Gecko Topiary', 'gecko', '🦎', 'A hedge clipped into a crested gecko.', 0, [
    ['Small topiary', { energy: 60 }, { happiness: 2 }],
    ['Big topiary', { energy: 160, materials: 40 }, { happiness: 3 }],
    ['Topiary with fairy lights', { energy: 400, materials: 100 }, { happiness: 4 }],
  ], { decor: true }),
];

export const BUILDING: Record<string, BuildingDef> = Object.fromEntries(BUILDINGS.map((d) => [d.id, d]));
export const REAL_BUILDINGS = BUILDINGS.filter((d) => !d.decor);

// Builders need feeding: homes, harbor, campus, sanctuary and sky buildings also cost food,
// so farms matter beyond growing the population.
const FED = new Set(['residential', 'harbor', 'campus', 'gecko', 'sky']);
for (const d of BUILDINGS) {
  if (d.decor || !FED.has(d.district)) continue;
  for (const t of d.tiers) if (t.cost.food == null) t.cost.food = Math.max(5, Math.round(((t.cost.energy || 0) * 0.35) / 5) * 5);
}
