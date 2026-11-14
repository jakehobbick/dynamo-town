// Named citizens and their soft-quest requests. A new named citizen arrives every
// CITIZEN_EVERY residents. Requests never expire and never punish.
export const CITIZEN_EVERY = 12;

export const NAMES: [string, string][] = [
  ['Mira', '👩‍🍳'], ['Tomas', '👨‍🌾'], ['Ada', '👩‍🔬'], ['Juno', '🧑‍🎤'], ['Pip', '🧒'], ['Oskar', '👴'], ['Lena', '👩‍🏫'],
  ['Rafi', '🧑‍🔧'], ['Nell', '👵'], ['Theo', '🧑‍🚒'], ['Ines', '👩‍🎨'], ['Bram', '🧔'], ['Sol', '🧑‍🚀'], ['Wren', '🧝'],
  ['Kiko', '👧'], ['Dario', '👨‍🍳'], ['Hazel', '👩‍🌾'], ['Felix', '🧑‍💼'], ['Ottie', '🦦'], ['Marta', '👩‍⚕️'], ['Lou', '🧑‍🎨'],
  ['Ezra', '👨‍🏫'], ['Noor', '🧕'], ['Calla', '💃'], ['Jasper', '🕺'], ['Bea', '🐝'], ['Arlo', '🧑‍✈️'], ['Ivy', '🌿'],
  ['Quin', '🧙'], ['Rosa', '🌹'], ['Hugo', '🎩'], ['Tilly', '🎈'], ['Vik', '⛵'], ['Mae', '📚'], ['Cosmo', '🔭'], ['Fern', '🦎'],
  ['Gus', '🚂'], ['Yara', '🧜'], ['Basil', '🌱'], ['Odette', '🦢'], ['Ren', '🪁'], ['Elio', '☀️'], ['Pearl', '🐚'], ['Nico', '🛠️'],
];

/** Request templates. `{name}` is the citizen. Weighted towards things the player can currently do. */
export const BUILD_WISHES: Record<string, string[]> = {
  bakery: ['{name} misses the smell of fresh bread and wants a bakery.', '{name} dreams of croissants. A bakery, please!'],
  park: ['{name} needs somewhere green to read. Could we have a park?'],
  fountain: ['{name} wants a fountain to meet friends by.'],
  cafe: ['{name} wants a bike café with proper espresso.'],
  market: ['{name} has turnips to sell and needs a market.'],
  school: ['{name} has kids who need a schoolhouse.'],
  wheat: ['{name} wants to bake their own bread: more wheat fields!'],
  orchard: ['{name} would love an orchard for apple pie season.'],
  windmill: ['{name} says the town is not a town without a windmill.'],
  beehive: ['{name} is convinced the flowers need bees.'],
  workshop: ['{name} is a carpenter looking for a workshop.'],
  battery: ['{name} worries the lights flicker at night. More battery banks?'],
  fishdock: ['{name} wants to go fishing at dawn.'],
  lighthouse: ['{name} keeps losing boats in the fog. A lighthouse!'],
  library: ['{name} has read every book in town twice. A library?'],
  bandstand: ['{name} plays the tuba and needs a stage.'],
  terrarium: ['{name} found a crested gecko in the laundry. It needs a home!'],
  cloudgarden: ['{name} wants to grow tulips on a cloud.'],
  cottage: ['{name} has a cousin moving to town. One more cottage?'],
  townhouse: ['{name} wants to live somewhere tall and colourful.'],
  bikeshop: ['{name} has a squeaky chain and nowhere to fix it.'],
};
export const EVENT_WISHES: Record<string, string> = {
  festival: '{name} has been practising the lantern dance. Can we have a Festival Night?',
  storm: '{name} wants to see the lights come back after a Storm Blackout.',
  factory: '{name} needs a Factory Order finished for their shop.',
  surge: '{name} wants to see the capacitor tower glow. Lightning Surge!',
  harvest: '{name} wants the harvest in before the rain. Harvest Haul?',
  tide: '{name} has a boat stuck at low tide. Harbor Tide, please!',
  lantern: '{name} would like a slow Lantern Walk this evening.',
  commute: '{name} is late for work. Morning Commute?',
};
