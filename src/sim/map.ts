// World layout: a 40×40 tile island split into a 5×5 grid of 8×8 plots.
// Each plot belongs to one district. The Dynamo sits in the middle of the core plot.
import type { DistrictId, Terrain } from '../core/types';
import { fbm, hash } from '../core/util';

export const N = 40;
export const PLOT = 8;
export const PLOTS = N / PLOT; // 5

// Row = plot y, column = plot x.
export const PLOT_LAYOUT: DistrictId[][] = [
  ['sky', 'sky', 'campus', 'campus', 'industry'],
  ['sky', 'residential', 'residential', 'campus', 'industry'],
  ['harbor', 'residential', 'residential', 'residential', 'industry'],
  ['harbor', 'farms', 'farms', 'residential', 'industry'],
  ['harbor', 'harbor', 'farms', 'gecko', 'gecko'],
];

export const CORE_PLOT = 2 * PLOTS + 2;
export const START_PLOTS = [CORE_PLOT, 2 * PLOTS + 1, 3 * PLOTS + 2];
export const DYNAMO = { x: 19, y: 19, size: 2 };

export const plotOf = (x: number, y: number) => Math.floor(y / PLOT) * PLOTS + Math.floor(x / PLOT);
export const plotDistrict = (p: number) => PLOT_LAYOUT[Math.floor(p / PLOTS)][p % PLOTS];
export const districtAt = (x: number, y: number) => plotDistrict(plotOf(x, y));
export const inMap = (x: number, y: number) => x >= 0 && y >= 0 && x < N && y < N;

export interface World {
  terrain: Terrain[];
  height: Float32Array; // small visual elevation offsets for land (0..1)
  shade: Float32Array; // per-tile tint noise
}

/** Deterministic terrain for a given seed. */
export function genWorld(seed: number): World {
  const terrain: Terrain[] = new Array(N * N);
  const height = new Float32Array(N * N);
  const shade = new Float32Array(N * N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const d = districtAt(x, y);
      const n = fbm(x / 6, y / 6, seed, 3);
      shade[i] = hash(x, y, seed);
      // distance from island edge
      const edge = Math.min(x, y, N - 1 - x, N - 1 - y);
      let t: Terrain = 'grass';
      if (d === 'sky') {
        // clouds: puffy blobs with gaps
        const c = fbm(x / 3.2, y / 3.2, seed + 99, 3);
        t = c > 0.42 || (x % 8 > 1 && y % 8 > 1 && c > 0.3) ? 'cloud' : 'void';
        if (edge < 1) t = 'void';
      } else if (d === 'harbor') {
        // western shore: water on the outer side, sand beach in between
        const shore = 3.2 + n * 3.5 + (d === 'harbor' && y >= 32 ? (y - 31) * 0.5 : 0);
        const dist = y >= 32 && x >= 8 ? N - 1 - y : x;
        t = dist < shore ? 'water' : dist < shore + 1.4 ? 'sand' : 'grass';
      } else if (d === 'gecko') {
        t = 'jungle';
        if (edge < 1 + n * 1.5) t = 'water';
        else if (edge < 2 + n * 1.5) t = 'sand';
      } else {
        if (edge < 0.6 + n * 1.6) t = 'water';
        else if (edge < 1.6 + n * 1.6) t = 'sand';
      }
      terrain[i] = t;
      height[i] = t === 'water' || t === 'void' ? 0 : n;
    }
  return { terrain, height, shade };
}

export const buildable = (t: Terrain) => t === 'grass' || t === 'sand' || t === 'jungle' || t === 'cloud';
