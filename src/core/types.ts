// Shared type definitions for game state and content config.

export type ResKey = 'energy' | 'food' | 'materials' | 'research' | 'gold' | 'sparks';
export type Res = Record<ResKey, number>;
export type Cost = Partial<Res>;

export type DistrictId = 'residential' | 'farms' | 'industry' | 'harbor' | 'campus' | 'gecko' | 'sky';
export type Terrain = 'grass' | 'water' | 'sand' | 'cloud' | 'jungle' | 'void';

export interface DistrictDef {
  id: DistrictId;
  name: string;
  icon: string;
  tier: number; // town tier that unlocks it (0-based)
  color: string; // accent for UI and ground tint
  blurb: string;
}

export interface TierLevel {
  name: string;
  minHousing?: number;
  /** what this tier looks like / does, shown in UI */
  label: string;
  cost: Cost;
  housing?: number;
  /** production per hour at this tier */
  prod?: Partial<Res>;
  happiness?: number;
  /** extra battery capacity in kJ */
  battery?: number;
  /** passive multipliers, e.g. { rideEnergy: 0.02 } */
  boost?: Partial<Record<BoostKey, number>>;
}

export type BoostKey =
  | 'rideEnergy' // % bonus to kJ credited while riding
  | 'eventReward' // % bonus to event rewards
  | 'food' | 'materials' | 'research' | 'gold' // production multipliers
  | 'upkeep' // % reduction of idle energy draw
  | 'popGrowth'
  | 'importRate'; // extra fraction for imported rides

export interface BuildingDef {
  id: string;
  name: string;
  district: DistrictId;
  icon: string;
  desc: string;
  /** art key in render/art registry */
  art: string;
  size?: 1 | 2;
  /** Max copies. Undefined = unlimited */
  max?: number;
  /** must touch water */
  coastal?: boolean;
  /** research node needed (besides district unlock) */
  needs?: string;
  /** minimum town tier (0-based), on top of district */
  minTier?: number;
  /** idle draw in kJ per hour (scaled by tier) */
  upkeep: number;
  tiers: TierLevel[];
  /** decor = cheap cosmetic that does not count toward building achievements */
  decor?: boolean;
}

export interface Building {
  id: number;
  type: string;
  x: number;
  y: number;
  tier: number; // 0-based
  builtAt: number; // ms, for construction animation
  flip?: boolean;
}

export type SegKind = 'erg' | 'free' | 'sprint' | 'cadence';
export interface Segment {
  kind: SegKind;
  /** seconds */
  dur: number;
  /** fraction of FTP (for erg/cadence; sprint uses as minimum) */
  pct: number;
  /** optional end pct for ramps */
  pctEnd?: number;
  /** label shown on HUD */
  label: string;
  /** cadence target for cadence drills */
  rpm?: number;
  /** counts toward event score (warmups/recoveries don't) */
  work?: boolean;
}

export interface EventDef {
  id: string;
  name: string;
  icon: string;
  workout: string; // e.g. "Sweet spot"
  zone: string; // e.g. "Z3/Z4"
  desc: string; // story
  district: DistrictId; // flavor + camera focus + where the reward lands
  weather: WeatherKind;
  segments: Segment[];
  reward: { energy: number; sparks: number; happiness: number; gold?: number; food?: number; materials?: number; research?: number };
  /** decor building granted on completion */
  decor?: string;
  minTier?: number;
}

export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog' | 'heat' | 'festival' | 'wind';

export interface ResearchDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  branch: 'power' | 'growth' | 'industry' | 'science' | 'whimsy';
  cost: Cost;
  needs: string[];
  /** effects */
  unlocks?: string[]; // building ids
  boost?: Partial<Record<BoostKey, number>>;
  battery?: number;
  cosmetic?: string;
  minTier?: number;
}

export interface Citizen {
  id: string;
  name: string;
  emoji: string;
  arrived: number;
  request: CitizenRequest | null;
  done: number; // requests fulfilled
}

export type CitizenRequest =
  | { kind: 'build'; type: string; count: number; text: string; reward: Cost & { happiness?: number } }
  | { kind: 'upgrade'; type: string; tier: number; text: string; reward: Cost & { happiness?: number } }
  | { kind: 'event'; event: string; text: string; reward: Cost & { happiness?: number } }
  | { kind: 'ride'; kj: number; text: string; reward: Cost & { happiness?: number } }
  | { kind: 'research'; node: string; text: string; reward: Cost & { happiness?: number } };

export interface CharterGoal {
  id: string;
  text: string;
  metric: CharterMetric;
  target: number;
  progress: number;
}
export type CharterMetric = 'events' | 'rides' | 'kj' | 'minutes' | 'builds' | 'requests' | 'z2min' | 'sprints' | 'upgrades';

export interface RideSummary {
  id: string;
  start: number;
  secs: number;
  kj: number;
  credited: number; // energy credited (after bonuses/rates)
  avg: number;
  np: number;
  maxP: number;
  avgHr: number;
  mode: 'event' | 'plan' | 'free' | 'import';
  events: { id: string; score: number }[];
  source?: 'game' | 'tcx' | 'fit';
  bests?: { p1: number; p5: number; p20: number };
}

export interface Settings {
  ftp: number;
  weightKg: number;
  gears: 'virtual' | 'real';
  gearFeel: number;
  gear: number;
  ergBias: number; // % adjustment to ERG targets
  keys: Record<KeyAction, string>;
  vol: { master: number; music: number; amb: number; sfx: number };
  muted: boolean;
  timeMode: 'real' | 'day' | 'night' | 'fast';
  seasonMode: 'real' | 'fast' | 'spring' | 'summer' | 'autumn' | 'winter';
  quality: 'high' | 'balanced' | 'battery';
  weeklyRides: number; // streak target (rides per week)
  debug: boolean;
  showFps: boolean;
  importRate: number;
}

export type KeyAction = 'shiftUp' | 'shiftDown' | 'confirm' | 'cancel' | 'next' | 'prev' | 'pause' | 'skip';

export interface WeekStats {
  rides: number;
  kj: number;
  events: number;
  minutes: number;
}

export interface Stats {
  rides: number;
  rideSecs: number;
  maxRideKJ: number;
  events: Record<string, { tries: number; full: number; partial: number; best: number }>;
  bests: { p5s: number; p1: number; p5: number; p20: number; p60: number };
  daily: Record<string, number>; // dayKey -> kJ credited
  weeks: Record<string, WeekStats>;
  built: number;
  upgrades: number;
  requests: number;
  charters: number;
  imports: number;
  importKJ: number;
  plans: Record<string, number>; // plan length -> count
  z2min: number;
  sprints: number;
  overflowGold: number;
  maxPop: number;
}

export interface Decor {
  id: number;
  type: string;
  x: number;
  y: number;
  at: number;
}

export interface GameState {
  v: number;
  createdAt: number;
  seed: number;
  lastTick: number;
  timeOffset: number; // debug time-skip offset (ms)
  settings: Settings;
  res: Res;
  lifetimeKJ: number;
  tier: number;
  plots: number[];
  buildings: Building[];
  nextId: number;
  pop: number;
  festive: number; // temporary happiness from events, decays slowly to 0
  citizens: Citizen[];
  research: string[];
  achievements: Record<string, number>;
  stats: Stats;
  charter: { week: string; goals: CharterGoal[]; claimed: boolean } | null;
  rides: RideSummary[];
  imported: string[];
  notices: string[]; // queued unlock notices
  seen: Record<string, boolean>; // tutorials / first-time flags
  cosmetics: { dynamo: string; lanterns: string; fireworks: boolean };
  lastAway: number; // last time the "away" report was shown
  board: { day: string; ids: string[] } | null;
}
