// Shared render state written by the game loop/UI and read by the renderer.
import type { DistrictId, WeatherKind } from '../core/types';
import type { Season } from './terrain';

export const RS = {
  season: 'autumn' as Season,
  hour: 12,
  night: 0, // 0 day .. 1 full night
  dusk: 0, // warm tint strength around sunrise/sunset
  weather: 'clear' as WeatherKind,
  weatherK: 0, // 0..1 intensity (fades in/out)
  grid: 0.7, // 0..1.5: how strongly the town is powered right now
  power: 0, // smoothed live watts
  cad: 0,
  ftp: 200,
  riding: false,
  crankAngle: 0,
  wheelAngle: 0,
  ghost: null as null | { type: string; x: number; y: number; ok: boolean },
  moveId: 0,
  selected: 0,
  showPlots: false,
  blackout: new Set<DistrictId>(),
  flash: 0, // lightning flash 0..1
  fireworks: 0, // seconds of fireworks remaining
  festival: false,
  surge: 0, // capacitor surge glow 0..1
  time: 0,
  fps: 60,
  lowFx: false,
};
