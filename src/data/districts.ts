import type { DistrictDef } from '../core/types';

// Districts unlock with town tiers. Plot layout lives in sim/map.ts (PLOT_LAYOUT).
export const DISTRICTS: DistrictDef[] = [
  { id: 'residential', name: 'Old Town', icon: '🏡', tier: 0, color: '#e8a87c', blurb: 'Homes, bakeries and squares around the Dynamo.' },
  { id: 'farms', name: 'Meadow Farms', icon: '🌾', tier: 0, color: '#d6c15a', blurb: 'Fields, orchards and windmills that feed the town.' },
  { id: 'industry', name: 'Copperworks', icon: '⚙️', tier: 0, color: '#b98762', blurb: 'Workshops and foundries that turn power into materials.' },
  { id: 'harbor', name: 'Tidewater Harbor', icon: '⚓', tier: 2, color: '#6fa9c9', blurb: 'Docks, boats and a lighthouse on the western shore.' },
  { id: 'campus', name: 'Lumen Campus', icon: '🔭', tier: 3, color: '#9d8fd6', blurb: 'Libraries and labs that generate research.' },
  { id: 'gecko', name: 'Gecko Sanctuary', icon: '🦎', tier: 4, color: '#5fae7b', blurb: 'A misty fern jungle where crested geckos thrive.' },
  { id: 'sky', name: 'Sky Dock', icon: '🎈', tier: 5, color: '#9fc6ea', blurb: 'Cloud platforms where airships moor above the town.' },
];

export const DISTRICT = Object.fromEntries(DISTRICTS.map((d) => [d.id, d])) as Record<string, DistrictDef>;
