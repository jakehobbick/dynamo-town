import type { GameState, Settings, Stats } from './types';

/** Bump this when the save shape changes, and add a migration in save.ts. */
export const SCHEMA_VERSION = 1;

export const DEFAULT_KEYS: Settings['keys'] = {
  shiftUp: 'e',
  shiftDown: 'q',
  confirm: 'Enter',
  cancel: 'Backspace',
  next: 'd',
  prev: 'a',
  pause: 'Escape',
  skip: 'n',
};

export function defaultSettings(): Settings {
  return {
    ftp: 200,
    weightKg: 75,
    gears: 'virtual',
    gearFeel: 0.8,
    gear: 6,
    ergBias: 0,
    keys: { ...DEFAULT_KEYS },
    vol: { master: 0.8, music: 0.5, amb: 0.6, sfx: 0.7 },
    muted: false,
    timeMode: 'real',
    seasonMode: 'real',
    quality: 'high',
    weeklyRides: 3,
    debug: false,
    showFps: false,
    importRate: 0.5,
  };
}

export function emptyStats(): Stats {
  return {
    rides: 0,
    rideSecs: 0,
    maxRideKJ: 0,
    events: {},
    bests: { p5s: 0, p1: 0, p5: 0, p20: 0, p60: 0 },
    daily: {},
    weeks: {},
    built: 0,
    upgrades: 0,
    requests: 0,
    charters: 0,
    imports: 0,
    importKJ: 0,
    plans: {},
    z2min: 0,
    sprints: 0,
    overflowGold: 0,
    maxPop: 0,
    perfect: 0,
  };
}

export function newGame(now: number): GameState {
  return {
    v: SCHEMA_VERSION,
    createdAt: now,
    seed: (Math.random() * 2 ** 31) | 0,
    lastTick: now,
    timeOffset: 0,
    settings: defaultSettings(),
    res: { energy: 150, food: 40, materials: 60, research: 0, gold: 40, sparks: 0 },
    lifetimeKJ: 0,
    tier: 0,
    plots: [],
    buildings: [],
    nextId: 1,
    pop: 0,
    festive: 0,
    citizens: [],
    research: [],
    achievements: {},
    stats: emptyStats(),
    charter: null,
    rides: [],
    imported: [],
    notices: [],
    seen: {},
    cosmetics: { dynamo: 'brass', lanterns: 'warm', fireworks: false },
    lastAway: now,
    board: null,
  };
}

/** The single live game state. Everything mutates this object and then calls save.markDirty(). */
export const G: { s: GameState } = { s: newGame(Date.now()) };

/** Game clock: real time plus the debug time-skip offset. */
export const now = () => Date.now() + (G.s ? G.s.timeOffset : 0);
