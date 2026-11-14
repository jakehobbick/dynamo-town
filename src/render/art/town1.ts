// Building art, part 1: Old Town, Meadow Farms, Copperworks.
// Each art fn draws in local tile space (origin = top corner of the footprint diamond).
// Each anim fn draws moving bits in the same space. tier is 0-based.
import { hash } from '../../core/util';
import {
  P, awning, box, bush, chimney, cone, cylinder, dome, door, env, fence, flagPole, flatRoof, flowers, gable, groundShadow, hip, lampGlow, mix, pad, poly, rgba, shade, streetLamp, tree, windowOn, windowRow, type Ctx,
} from '../prims';
import { C, M, paint } from './palette';
import { arc, blades, glow, smoke, waterSpray, flag } from './fx';

export type Art = (c: Ctx, tier: number, seed: number) => void;
export type Anim = (c: Ctx, tier: number, t: number, k: number, seed: number) => void;
export const ART: Record<string, Art> = {};
export const ANIM: Record<string, Anim> = {};
/** tallest point in px above the footprint, for sprite sizing */
export const TOP: Record<string, number> = {};

const pick = <T,>(a: T[], seed: number, i = 0) => a[Math.floor(hash(seed, i) * a.length) % a.length];
const HOUSE_COLS = [C.peach, C.sky, C.mint, C.butter, C.rose, C.lilac, C.cream];

// =============== OLD TOWN ===============
ART.cottage = (c, tier, seed) => {
  const wall = paint(pick(HOUSE_COLS, seed), tier === 2 ? 'stone' : tier === 1 ? 'plank' : 'stucco');
  if (tier === 2) wall.col = mix(wall.col, C.stone, 0.55);
  pad(c, 0.08, 0.1, 0.92, 0.92, 'grass', seed);
  if (tier === 0) {
    groundShadow(c, 0.22, 0.25, 0.78, 0.75);
    box(c, 0.22, 0.25, 0.78, 0.75, 0, 13, wall, null, seed);
    door(c, 'L', 0.75, 0.42, 0.14, 9, '#8a5634');
    windowOn(c, 'L', 0.75, 0.6, 3.5, 0.12, 5.5, { shutters: '#7aa86a' });
    windowOn(c, 'R', 0.78, 0.38, 3.5, 0.13, 5.5);
    gable(c, 0.22, 0.25, 0.78, 0.75, 13, 13, 'u', M.thatch, wall, 0.1, seed);
    fence(c, [[0.1, 0.9], [0.36, 0.9]], '#efe2c8', 3.5);
    flowers(c, 0.1, 0.8, 0.4, 0.9, 6, ['#ff8fab', '#ffd166', '#ffffff'], seed);
  } else if (tier === 1) {
    groundShadow(c, 0.16, 0.2, 0.84, 0.8);
    box(c, 0.16, 0.2, 0.84, 0.8, 0, 14, wall, null, seed);
    door(c, 'L', 0.8, 0.38, 0.15, 10, '#4f6b8a');
    windowRow(c, 'L', 0.8, 0.55, 0.84, 3.5, 1, 0.14, 6, { shutters: shade(wall.col, 0.7), box: '#ff6b6b' });
    windowOn(c, 'L', 0.8, 0.18, 3.5, 0.14, 6, { shutters: shade(wall.col, 0.7) });
    windowRow(c, 'R', 0.84, 0.2, 0.8, 3.5, 2, 0.14, 6);
    // porch roof
    box(c, 0.32, 0.8, 0.6, 0.92, 11, 12.2, M.plank, { col: C.roofRed });
    for (const u of [0.33, 0.58]) box(c, u, 0.9, u + 0.025, 0.92, 0, 11, { col: '#efe3cf' }, null);
    gable(c, 0.16, 0.2, 0.84, 0.8, 14, 12, 'u', M.tileRed, wall, 0.08, seed);
    chimney(c, 0.32, 0.42, 18, 30);
    bush(c, 0.12, 0.86, 0.7, '#5ea85a', '#ff8fab');
  } else {
    groundShadow(c, 0.14, 0.18, 0.86, 0.82);
    box(c, 0.14, 0.18, 0.86, 0.82, 0, 24, wall, null, seed);
    door(c, 'L', 0.82, 0.42, 0.15, 10, '#3e5c7a', { arch: true, lamp: true });
    windowOn(c, 'L', 0.82, 0.2, 3.5, 0.14, 6, { box: '#ff6b6b' });
    windowOn(c, 'L', 0.82, 0.64, 3.5, 0.14, 6, { box: '#ffd166' });
    windowRow(c, 'L', 0.82, 0.14, 0.86, 14.5, 3, 0.13, 6);
    windowRow(c, 'R', 0.86, 0.18, 0.82, 3.5, 2, 0.14, 6);
    windowRow(c, 'R', 0.86, 0.18, 0.82, 14.5, 2, 0.14, 6);
    // string course
    box(c, 0.14, 0.82, 0.86, 0.835, 12, 13, { col: shade(wall.col, 1.1) }, null);
    gable(c, 0.14, 0.18, 0.86, 0.82, 24, 14, 'u', M.slate, wall, 0.08, seed);
    chimney(c, 0.3, 0.38, 30, 42);
    chimney(c, 0.74, 0.38, 28, 38);
    tree(c, 0.9, 0.2, 0.75, 'round', seed);
  }
};
ANIM.cottage = (c, tier, t, k, seed) => {
  if (tier === 1) {
    const [x, y] = P(0.32, 0.42, 31);
    smoke(c, x, y, t, 0.5 + k * 0.5, '#ece8ee', 5, 22, seed);
  } else if (tier === 2) {
    const [x, y] = P(0.3, 0.38, 43);
    smoke(c, x, y, t, 0.5 + k * 0.5, '#ece8ee', 5, 22, seed);
  }
};
TOP.cottage = 70;

ART.townhouse = (c, tier, seed) => {
  pad(c, 0.06, 0.06, 0.94, 0.94, 'cobble', seed);
  const cols = [pick(HOUSE_COLS, seed), pick(HOUSE_COLS, seed, 1), pick(HOUSE_COLS, seed, 2)];
  const floors = 3;
  const fh = 11;
  const H = floors * fh + (tier >= 1 ? 2 : 0);
  // two narrow houses side by side along u
  const parts: [number, number, string][] = [[0.12, 0.5, cols[0]], [0.5, 0.88, cols[1]]];
  groundShadow(c, 0.12, 0.2, 0.88, 0.8);
  parts.forEach(([u0, u1, col], i) => {
    const hh = H + (i ? 4 : 0);
    const wall = paint(col, 'stucco');
    box(c, u0, 0.2, u1, 0.8, 0, hh, wall, null, seed + i);
    door(c, 'L', 0.8, u0 + 0.1, 0.13, 9, pick(['#3e5c7a', '#7b4a2e', '#4f7a5a'], seed, i + 4), { lamp: true });
    for (let f = 1; f < floors; f++) windowRow(c, 'L', 0.8, u0, u1, 3 + f * fh, 2, 0.11, 6.5, { arch: tier >= 1, box: tier >= 1 ? '#ff8fab' : undefined });
    windowOn(c, 'L', 0.8, u0 + 0.26, 3.5, 0.08, 6);
    if (i === 1) for (let f = 0; f < floors; f++) windowRow(c, 'R', 0.88, 0.2, 0.8, 3 + f * fh, 3, 0.1, 6.5);
    if (tier >= 1) {
      // bay window / balcony
      box(c, u0 + 0.08, 0.8, u1 - 0.08, 0.9, fh + 1, fh + 2.2, { col: '#efe6d6' }, { col: '#efe6d6' });
      const rail: [number, number][] = [[u0 + 0.08, 0.9], [u1 - 0.08, 0.9]];
      for (const z of [fh + 6]) {
        const a = P(rail[0][0], rail[0][1], z), b = P(rail[1][0], rail[1][1], z);
        c.strokeStyle = '#3d3a46';
        c.lineWidth = 0.7;
        c.beginPath();
        c.moveTo(...a);
        c.lineTo(...b);
        c.stroke();
      }
    }
    if (tier >= 2) {
      // rooftop garden terrace
      flatRoof(c, u0, 0.2, u1, 0.8, hh, { col: '#d9cbb3' });
      bush(c, (u0 + u1) / 2, 0.45, 0.55, '#5ea85a', '#ffd166');
      const [x, y] = P((u0 + u1) / 2 + 0.05, 0.62, hh + 2);
      c.fillStyle = '#e8735a';
      c.fillRect(x - 3, y - 4, 6, 4);
    } else gable(c, u0, 0.2, u1, 0.8, hh, 10, 'v', i ? M.shingleBlue : M.tileTerra, wall, 0.05, seed + i);
  });
  if (tier >= 2) {
    // fairy lights over the terrace
    const a = P(0.14, 0.78, H + 9), b = P(0.86, 0.78, H + 13);
    c.strokeStyle = 'rgba(60,50,60,0.6)';
    c.lineWidth = 0.4;
    c.beginPath();
    c.moveTo(...a);
    c.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 4, ...b);
    c.stroke();
    for (let i = 0; i <= 8; i++) {
      const tt = i / 8;
      const x = a[0] + (b[0] - a[0]) * tt, y = a[1] + (b[1] - a[1]) * tt + Math.sin(tt * Math.PI) * 2;
      c.fillStyle = ['#ffd166', '#ff8fab', '#9be7ff'][i % 3];
      c.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
      lampGlow(env.L, x, y, 4, 0.8);
    }
  }
};
TOP.townhouse = 70;

ART.apartments = (c, tier, seed) => {
  pad(c, 0.05, 0.05, 0.95, 0.95, 'paving', seed);
  const floors = tier === 0 ? 4 : 6;
  const fh = 10.5;
  const H = floors * fh;
  const wall = tier === 0 ? M.brick : paint(pick([C.cream, '#e9d8c4', '#dcd6e8'], seed), 'stucco');
  groundShadow(c, 0.12, 0.15, 0.88, 0.85, 0.3);
  box(c, 0.12, 0.15, 0.88, 0.85, 0, H, wall, null, seed);
  door(c, 'L', 0.85, 0.42, 0.18, 10, '#3e4a6b', { awning: '#5f9a6b', lamp: true });
  for (let f = 0; f < floors; f++) {
    windowRow(c, 'L', 0.85, 0.12, 0.88, 2.5 + f * fh, f === 0 ? 0 : 4, 0.1, 6.2, { frame: '#fff' });
    windowRow(c, 'R', 0.88, 0.15, 0.85, 2.5 + f * fh, 4, 0.1, 6.2, { frame: '#fff' });
    if (f > 0 && tier >= 1) box(c, 0.16, 0.85, 0.36, 0.92, 1 + f * fh, 1.8 + f * fh, { col: '#e8e2d8' }, { col: '#f3efe8' });
  }
  flatRoof(c, 0.12, 0.15, 0.88, 0.85, H, { col: '#cfc6b6' });
  if (tier >= 1) {
    box(c, 0.62, 0.3, 0.8, 0.5, H + 2, H + 13, M.white, null, seed);
    hip(c, 0.62, 0.3, 0.8, 0.5, H + 13, 5, M.slate);
  }
  if (tier >= 2) {
    // glass sky lounge
    box(c, 0.22, 0.28, 0.58, 0.72, H + 2, H + 14, { col: '#9fd0e6', tex: 'glass' }, { col: '#e9eef2' });
    const [x, y] = P(0.4, 0.5, H + 14);
    lampGlow(env.L, x, y + 6, 20, 0.5, '160,220,255');
    flagPole(c, 0.7, 0.75, H + 2, 14, '#e8735a');
  }
};
TOP.apartments = 100;

ART.bakery = (c, tier, seed) => {
  pad(c, 0.06, 0.06, 0.94, 0.94, 'cobble', seed);
  const wall = paint(tier === 2 ? '#f7d9df' : '#f3e1c2', tier === 0 ? 'stucco' : 'stucco');
  groundShadow(c, 0.18, 0.2, 0.84, 0.78);
  const H = tier === 2 ? 22 : 14;
  box(c, 0.18, 0.2, 0.84, 0.78, 0, H, wall, null, seed);
  door(c, 'L', 0.78, 0.48, 0.15, 9, '#8a4f3a', { arch: true });
  windowOn(c, 'L', 0.78, 0.22, 2.5, 0.2, 7, { frame: '#fff4e0' });
  windowRow(c, 'R', 0.84, 0.2, 0.78, 3, 2, 0.15, 6.5);
  if (tier >= 1) {
    awning(c, 'L', 0.78, 0.2, 0.25, 11.5, '#e8735a');
    // café tables
    for (const [u, v] of [[0.3, 0.9], [0.62, 0.92]] as [number, number][]) {
      const [x, y] = P(u, v);
      c.fillStyle = '#3d3a46';
      c.fillRect(x - 0.4, y - 4, 0.8, 4);
      c.fillStyle = '#fbf3e4';
      c.beginPath();
      c.ellipse(x, y - 4, 3, 1.4, 0, 0, 7);
      c.fill();
    }
  }
  if (tier === 2) {
    windowRow(c, 'L', 0.78, 0.18, 0.84, 13, 3, 0.12, 6, { arch: true, box: '#ff8fab' });
    windowRow(c, 'R', 0.84, 0.2, 0.78, 13, 2, 0.12, 6, { arch: true });
  }
  // brick oven dome / chimney
  if (tier === 0) {
    gable(c, 0.18, 0.2, 0.84, 0.78, H, 10, 'u', M.tileTerra, wall, 0.08, seed);
    dome(c, 0.86, 0.32, 0.12, 0, M.brick);
  } else hip(c, 0.18, 0.2, 0.84, 0.78, H, tier === 2 ? 13 : 11, tier === 2 ? { col: '#d98aa0', tex: 'shingle' } : M.tileRed, 0.08, seed);
  chimney(c, 0.3, 0.35, H + 4, H + 15, '#b05a43');
  // sign: a pretzel/croissant board
  const [sx, sy] = P(0.84, 0.66, H - 2);
  c.fillStyle = '#6b4a33';
  c.fillRect(sx, sy - 4, 0.8, 4);
  c.fillStyle = '#f5d478';
  c.beginPath();
  c.ellipse(sx + 3.5, sy - 4, 3, 2, 0, 0, 7);
  c.fill();
  c.strokeStyle = '#8a5634';
  c.lineWidth = 0.6;
  c.stroke();
};
ANIM.bakery = (c, tier, t, k, seed) => {
  const H = tier === 2 ? 22 : 14;
  const [x, y] = P(0.3, 0.35, H + 16);
  smoke(c, x, y, t, 0.6 + k * 0.4, '#f6efe6', 5, 24, seed);
};
TOP.bakery = 60;

ART.cafe = (c, tier, seed) => {
  pad(c, 0.04, 0.04, 0.96, 0.96, 'paving', seed);
  const wall = paint(pick(['#3e6b5a', '#2f4f6b', '#7a3b3b'], seed), 'plank', 0.5);
  groundShadow(c, 0.22, 0.2, 0.84, 0.72);
  const H = tier >= 2 ? 24 : 14;
  box(c, 0.22, 0.2, 0.84, 0.72, 0, H, wall, null, seed);
  windowOn(c, 'L', 0.72, 0.26, 2, 0.22, 8, { frame: '#f6efe2' });
  door(c, 'L', 0.72, 0.58, 0.14, 10, '#f3e6cc');
  windowRow(c, 'R', 0.84, 0.2, 0.72, 2.5, 2, 0.16, 7.5);
  awning(c, 'L', 0.72, 0.24, 0.52, 12, '#f3e6cc', 0.18);
  if (tier >= 2) {
    windowRow(c, 'L', 0.72, 0.22, 0.84, 15, 3, 0.11, 6);
    flatRoof(c, 0.22, 0.2, 0.84, 0.72, H, { col: '#c9b9a0' });
    // rooftop umbrellas
    for (const [u, v, col] of [[0.38, 0.4, '#e8735a'], [0.66, 0.54, '#f5d478']] as [number, number, string][]) {
      const [x, y] = P(u, v, H + 2);
      c.strokeStyle = '#3d3a46';
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x, y - 8);
      c.stroke();
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(x, y - 8, 6, 2.5, 0, Math.PI, 0);
      c.fill();
    }
  } else flatRoof(c, 0.22, 0.2, 0.84, 0.72, H, { col: '#b9a88e' });
  // bikes leaning on the wall
  if (tier >= 1)
    for (let i = 0; i < (tier >= 2 ? 3 : 2); i++) {
      const [x, y] = P(0.88, 0.3 + i * 0.16);
      c.strokeStyle = ['#e8735a', '#5a7fa8', '#f5d478'][i];
      c.lineWidth = 0.8;
      c.beginPath();
      c.arc(x - 3, y - 2.5, 2.2, 0, 7);
      c.arc(x + 3, y - 0.5, 2.2, 0, 7);
      c.stroke();
      c.beginPath();
      c.moveTo(x - 3, y - 2.5);
      c.lineTo(x, y - 5);
      c.lineTo(x + 3, y - 0.5);
      c.stroke();
    }
  // tables
  for (const [u, v] of [[0.3, 0.86], [0.6, 0.88]] as [number, number][]) {
    const [x, y] = P(u, v);
    c.fillStyle = '#3d3a46';
    c.fillRect(x - 0.4, y - 3.5, 0.8, 3.5);
    c.fillStyle = '#fff';
    c.beginPath();
    c.ellipse(x, y - 3.5, 2.6, 1.2, 0, 0, 7);
    c.fill();
  }
};
ANIM.cafe = (c, tier, t, k) => {
  // steam from cups
  for (const [u, v] of [[0.3, 0.86], [0.6, 0.88]] as [number, number][]) {
    const [x, y] = P(u, v, 5);
    smoke(c, x, y, t * 1.4, 0.5, '#ffffff', 3, 6);
  }
  void tier;
  void k;
};
TOP.cafe = 60;

ART.park = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'grass', seed);
  // path
  const pts = [P(0.02, 0.45), P(0.98, 0.45), P(0.98, 0.58), P(0.02, 0.58)];
  poly(c, pts);
  c.fillStyle = env.season === 'winter' ? '#e6e9ee' : '#e3cfa6';
  c.fill();
  if (tier >= 1) {
    flowers(c, 0.1, 0.65, 0.45, 0.9, 12, ['#ff8fab', '#ffd166', '#ffffff', '#b38cff'], seed);
    flowers(c, 0.6, 0.1, 0.9, 0.38, 10, ['#ff6b6b', '#ffd166'], seed + 1);
    // benches
    for (const u of [0.3, 0.7]) {
      const a = P(u - 0.08, 0.62, 2.5), b = P(u + 0.08, 0.62, 2.5);
      c.strokeStyle = '#8a5634';
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(...a);
      c.lineTo(...b);
      c.stroke();
      c.lineWidth = 1;
      const a2 = P(u - 0.08, 0.6, 5), b2 = P(u + 0.08, 0.6, 5);
      c.beginPath();
      c.moveTo(...a2);
      c.lineTo(...b2);
      c.stroke();
    }
  }
  if (tier >= 2) {
    // pond
    const [x, y] = P(0.25, 0.25);
    c.fillStyle = env.season === 'winter' ? '#cfe4f2' : '#6fb7d8';
    c.beginPath();
    c.ellipse(x, y + 4, 12, 5.5, 0, 0, 7);
    c.fill();
    c.strokeStyle = '#b8a888';
    c.lineWidth = 1.2;
    c.stroke();
    // gazebo
    const g = { col: '#fbf6ec' };
    for (const [u, v] of [[0.62, 0.66], [0.84, 0.66], [0.62, 0.88], [0.84, 0.88]] as [number, number][]) box(c, u, v, u + 0.025, v + 0.025, 0, 11, g, null);
    hip(c, 0.6, 0.64, 0.88, 0.92, 11, 9, M.shingleGreen);
    streetLamp(c, 0.5, 0.42, 12);
  }
  tree(c, 0.78, 0.28, tier >= 1 ? 1.1 : 0.9, 'round', seed);
  if (tier >= 1) tree(c, 0.2, 0.84, 0.8, 'blossom', seed + 2);
  if (tier === 0) bush(c, 0.3, 0.8, 0.8);
};
ANIM.park = (c, tier, t) => {
  if (tier >= 2 && env.season !== 'winter') {
    const [x, y] = P(0.25, 0.25);
    // duck
    const dx = Math.sin(t * 0.4) * 6;
    c.fillStyle = '#fffaf0';
    c.beginPath();
    c.ellipse(x + dx, y + 3.5, 1.8, 1, 0, 0, 7);
    c.fill();
    c.fillStyle = '#4f9d55';
    c.beginPath();
    c.arc(x + dx + 1.5, y + 2.4, 0.8, 0, 7);
    c.fill();
  }
};
TOP.park = 50;

ART.fountain = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, tier >= 1 ? 'paving' : 'cobble', seed);
  const st = { col: '#d9d2c4', tex: 'stone' as const };
  cylinder(c, 0.5, 0.5, 0.36, 0, 4, st, env.season === 'winter' ? '#dfeef8' : '#79c3e3');
  if (tier >= 1) {
    cylinder(c, 0.5, 0.5, 0.06, 4, 13, st);
    cylinder(c, 0.5, 0.5, 0.18, 13, 15, st, '#79c3e3');
  }
  if (tier >= 2) {
    cylinder(c, 0.5, 0.5, 0.04, 15, 20, { col: C.brass });
    for (const [u, v] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]] as [number, number][]) streetLamp(c, u, v, 11);
  }
  for (const [u, v] of [[0.12, 0.5], [0.5, 0.88]] as [number, number][]) bush(c, u, v, 0.55, '#5ea85a', '#ff8fab');
};
ANIM.fountain = (c, tier, t, k) => {
  if (env.season === 'winter') return;
  const top = tier >= 2 ? 20 : tier >= 1 ? 15 : 4;
  const [x, y] = P(0.5, 0.5, top);
  waterSpray(c, x, y, t, tier >= 2 ? 6 + k * 10 : 6, tier >= 2 ? 0.6 + k : 0.7);
};
TOP.fountain = 50;

ART.market = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'cobble', seed);
  if (tier === 0) {
    const stalls: [number, number, string][] = [[0.15, 0.2, '#e8735a'], [0.55, 0.2, '#5a7fa8'], [0.15, 0.58, '#f5d478'], [0.55, 0.58, '#5f9a6b']];
    for (const [u, v, col] of stalls) {
      box(c, u, v, u + 0.3, v + 0.25, 0, 5, M.plank, { col: '#c9a27a' });
      // produce
      for (let i = 0; i < 5; i++) {
        const [x, y] = P(u + 0.05 + i * 0.05, v + 0.12, 6);
        c.fillStyle = ['#e5483f', '#ffd166', '#7bc96f', '#ff9f43', '#b38cff'][i];
        c.beginPath();
        c.arc(x, y, 1.2, 0, 7);
        c.fill();
      }
      for (const [du, dv] of [[0, 0], [0.3, 0], [0.3, 0.25], [0, 0.25]]) box(c, u + du - 0.01, v + dv - 0.01, u + du + 0.01, v + dv + 0.01, 0, 13, { col: '#8a5634' }, null);
      gable(c, u - 0.02, v - 0.02, u + 0.32, v + 0.27, 13, 4, 'u', { col, tex: 'vplank', k: 0.4 }, { col: '#fff' }, 0.02);
    }
  } else {
    const H = tier === 2 ? 18 : 14;
    groundShadow(c, 0.12, 0.15, 0.88, 0.85);
    box(c, 0.12, 0.15, 0.88, 0.85, 0, H, M.brick, null, seed);
    // arched openings
    for (let i = 0; i < 3; i++) door(c, 'L', 0.85, 0.18 + i * 0.24, 0.16, 10, '#5b3a2a', { arch: true });
    for (let i = 0; i < 3; i++) door(c, 'R', 0.88, 0.2 + i * 0.22, 0.14, 10, '#5b3a2a', { arch: true });
    gable(c, 0.12, 0.15, 0.88, 0.85, H, 13, 'u', M.slate, M.brick, 0.08, seed);
    // lantern roof vent
    box(c, 0.38, 0.42, 0.62, 0.58, H + 11, H + 15, { col: '#efe3cf' }, null);
    hip(c, 0.38, 0.42, 0.62, 0.58, H + 15, 4, M.slate);
    if (tier === 2) {
      // clock tower
      box(c, 0.72, 0.68, 0.92, 0.88, 0, H + 22, M.stone, null, seed);
      const [x, y] = P(0.92, 0.78, H + 16);
      c.fillStyle = '#fbf6ec';
      c.beginPath();
      c.ellipse(x - 1.5, y, 2.8, 3.4, 0, 0, 7);
      c.fill();
      c.strokeStyle = '#3d3a46';
      c.lineWidth = 0.6;
      c.stroke();
      c.beginPath();
      c.moveTo(x - 1.5, y);
      c.lineTo(x - 1.5, y - 2.4);
      c.moveTo(x - 1.5, y);
      c.lineTo(x, y + 0.6);
      c.stroke();
      hip(c, 0.72, 0.68, 0.92, 0.88, H + 22, 10, M.shingleGreen);
    }
  }
};
TOP.market = 70;

ART.school = (c, tier, seed) => {
  pad(c, 0.04, 0.04, 0.96, 0.96, tier >= 1 ? 'dirt' : 'grass', seed);
  const wall = tier === 2 ? M.brick : paint('#d9634f', 'plank', 0.6);
  groundShadow(c, 0.16, 0.18, 0.84, 0.66);
  box(c, 0.16, 0.18, 0.84, 0.66, 0, 15, wall, null, seed);
  door(c, 'L', 0.66, 0.44, 0.14, 10, '#f3e6cc');
  windowRow(c, 'L', 0.66, 0.16, 0.42, 4, 1, 0.14, 8, { frame: '#fff' });
  windowRow(c, 'L', 0.66, 0.6, 0.84, 4, 1, 0.14, 8, { frame: '#fff' });
  windowRow(c, 'R', 0.84, 0.18, 0.66, 4, 2, 0.14, 8, { frame: '#fff' });
  gable(c, 0.16, 0.18, 0.84, 0.66, 15, 12, 'u', M.slate, wall, 0.08, seed);
  if (tier >= 1) {
    // bell tower
    box(c, 0.44, 0.36, 0.56, 0.48, 24, 32, { col: '#f3e6cc' }, null);
    hip(c, 0.44, 0.36, 0.56, 0.48, 32, 8, M.tileRed);
    const [x, y] = P(0.5, 0.48, 28);
    c.fillStyle = C.brass;
    c.beginPath();
    c.arc(x, y, 1.6, 0, 7);
    c.fill();
    // playground: swing + slide
    const [sx, sy] = P(0.3, 0.86);
    c.strokeStyle = '#5a7fa8';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(sx - 4, sy);
    c.lineTo(sx - 2, sy - 9);
    c.lineTo(sx + 4, sy - 9);
    c.lineTo(sx + 6, sy);
    c.stroke();
    const [tx, ty] = P(0.75, 0.86);
    c.strokeStyle = '#e8735a';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(tx - 4, ty - 8);
    c.quadraticCurveTo(tx, ty - 2, tx + 5, ty);
    c.stroke();
  }
  if (tier === 2) {
    // science wing
    box(c, 0.6, 0.66, 0.9, 0.9, 0, 12, M.brick, null, seed + 1);
    windowRow(c, 'L', 0.9, 0.6, 0.9, 3, 2, 0.08, 6);
    flatRoof(c, 0.6, 0.66, 0.9, 0.9, 12, { col: '#cfc6b6' });
    dome(c, 0.75, 0.78, 0.09, 14, { col: '#c9cfd8' });
  }
};
ANIM.school = (c, tier, t) => {
  if (tier >= 1) {
    const [sx, sy] = P(0.3, 0.86);
    const a = Math.sin(t * 2.2) * 0.5;
    c.strokeStyle = '#3d3a46';
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(sx + 1, sy - 9);
    c.lineTo(sx + 1 + Math.sin(a) * 6, sy - 9 + Math.cos(a) * 6);
    c.stroke();
    c.fillStyle = '#f5d478';
    c.fillRect(sx + Math.sin(a) * 6, sy - 9 + Math.cos(a) * 6, 2, 1);
  }
};
TOP.school = 60;

ART.bikeshop = (c, tier, seed) => {
  pad(c, 0.04, 0.04, 0.96, 0.96, 'paving', seed);
  const wall = paint(tier === 2 ? '#2f3a4f' : '#e9b949', tier === 2 ? 'metal' : 'plank', 0.5);
  groundShadow(c, 0.2, 0.2, 0.82, 0.74);
  const H = tier === 2 ? 22 : 14;
  box(c, 0.2, 0.2, 0.82, 0.74, 0, H, wall, null, seed);
  windowOn(c, 'L', 0.74, 0.22, 2, 0.28, 9, { frame: '#fff' });
  door(c, 'L', 0.74, 0.58, 0.15, 10, '#3d3a46');
  windowRow(c, 'R', 0.82, 0.2, 0.74, 3, tier >= 1 ? 2 : 1, 0.16, 7);
  if (tier === 2) {
    windowRow(c, 'L', 0.74, 0.2, 0.82, 13, 2, 0.2, 6, { frame: '#cfd8e6' });
    flatRoof(c, 0.2, 0.2, 0.82, 0.74, H, { col: '#3d4658' });
  } else gable(c, 0.2, 0.2, 0.82, 0.74, H, 9, 'v', M.tileRed, wall, 0.06, seed);
  // big wheel sign
  const [x, y] = P(0.82, 0.5, H + (tier === 2 ? 8 : 4));
  c.strokeStyle = tier === 2 ? '#ffd166' : '#3d3a46';
  c.lineWidth = 1.2;
  c.beginPath();
  c.arc(x, y, 5, 0, 7);
  c.stroke();
  c.lineWidth = 0.4;
  for (let i = 0; i < 8; i++) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(i * 0.785) * 5, y + Math.sin(i * 0.785) * 5);
    c.stroke();
  }
  if (tier >= 1) {
    // repair stand with a bike
    const [bx, by] = P(0.4, 0.88);
    c.strokeStyle = '#e8735a';
    c.lineWidth = 0.9;
    c.beginPath();
    c.arc(bx - 3, by - 5, 2.5, 0, 7);
    c.arc(bx + 3, by - 5, 2.5, 0, 7);
    c.stroke();
    c.strokeStyle = '#5c5f6b';
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx, by - 7);
    c.stroke();
  }
};
ANIM.bikeshop = (c, tier, t, k) => {
  const H = tier === 2 ? 22 : 14;
  const [x, y] = P(0.82, 0.5, H + (tier === 2 ? 8 : 4));
  const a = t * (1 + k * 3);
  c.strokeStyle = tier === 2 ? '#ffd166' : '#3d3a46';
  c.lineWidth = 0.6;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a + i * 2.09) * 5, y + Math.sin(a + i * 2.09) * 5);
    c.stroke();
  }
  if (tier === 2) glow(c, x, y, 9, '255,210,100', 0.25 + k * 0.2);
};
TOP.bikeshop = 50;

ART.townhall = (c, tier, seed) => {
  pad(c, 0.0, 0.0, 1, 1, 'paving', seed);
  const wall = tier === 0 ? M.plank : M.stone;
  groundShadow(c, 0.12, 0.12, 0.88, 0.8, 0.25);
  const H = tier === 0 ? 16 : 22;
  box(c, 0.12, 0.12, 0.88, 0.8, 0, H, wall, null, seed);
  if (tier >= 1) {
    // portico with columns
    box(c, 0.32, 0.8, 0.68, 0.94, 0, 2, M.stone, { col: '#e6dfd2' });
    for (let i = 0; i < 4; i++) cylinder(c, 0.35 + i * 0.1, 0.92, 0.02, 2, H - 2, { col: '#f3efe6' });
    box(c, 0.3, 0.8, 0.7, 0.95, H - 2, H + 1, { col: '#efe8db' }, null);
    gable(c, 0.3, 0.8, 0.7, 0.95, H + 1, 6, 'u', { col: '#e6dfd2' }, { col: '#efe8db' }, 0.0);
  }
  door(c, 'L', 0.8, 0.44, 0.12, 11, '#5b3a2a', { arch: true });
  windowRow(c, 'L', 0.8, 0.12, 0.38, 5, 1, 0.1, 9, { arch: true });
  windowRow(c, 'L', 0.8, 0.62, 0.88, 5, 1, 0.1, 9, { arch: true });
  windowRow(c, 'R', 0.88, 0.12, 0.8, 5, 3, 0.1, 9, { arch: true });
  if (tier === 0) {
    gable(c, 0.12, 0.12, 0.88, 0.8, H, 12, 'u', M.shingleGreen, wall, 0.08, seed);
    flagPole(c, 0.5, 0.95, 0, 22, '#e8735a');
  } else {
    hip(c, 0.12, 0.12, 0.88, 0.8, H, 8, M.slate, 0.06, seed);
    // drum + dome
    cylinder(c, 0.5, 0.46, 0.2, H + 5, H + 13, { col: '#efe8db', tex: 'stone' });
    dome(c, 0.5, 0.46, 0.2, H + 13, tier === 2 ? { col: C.brass } : { col: C.copperV });
    cylinder(c, 0.5, 0.46, 0.03, H + 25, H + 31, { col: tier === 2 ? '#ffd166' : '#5fb3a0' });
    if (tier === 2) {
      const [x, y] = P(0.5, 0.66, H + 9);
      c.fillStyle = '#fbf6ec';
      c.beginPath();
      c.arc(x, y, 3, 0, 7);
      c.fill();
      c.strokeStyle = '#3d3a46';
      c.lineWidth = 0.6;
      c.stroke();
    }
  }
};
ANIM.townhall = (c, tier, t) => {
  if (tier >= 1) flag(c, 0.5, 0.46, (tier === 2 ? 22 : 22) + 31, t, '#e8735a', 7);
};
TOP.townhall = 90;

ART.bandstand = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'grass', seed);
  const deck = { col: tier === 0 ? C.wood : '#f3efe6', tex: tier === 0 ? ('plank' as const) : ('stone' as const) };
  // octagon approximated by cylinder
  cylinder(c, 0.5, 0.5, 0.36, 0, 4, deck, tier === 0 ? '#c9a27a' : '#efe3cf');
  const cols = tier >= 1 ? 8 : 4;
  for (let i = 0; i < cols; i++) {
    const a = (i / cols) * Math.PI * 2;
    const u = 0.5 + Math.cos(a) * 0.3, v = 0.5 + Math.sin(a) * 0.3;
    if (u + v < 0.95) cylinder(c, u, v, 0.02, 4, 18, { col: '#fbf6ec' });
  }
  if (tier === 2) {
    // concert shell
    const [x, y] = P(0.3, 0.3, 4);
    c.fillStyle = '#fbf3e4';
    c.beginPath();
    c.ellipse(x, y, 22, 26, -0.3, Math.PI * 1.05, Math.PI * 1.95);
    c.lineTo(x, y);
    c.fill();
    c.strokeStyle = 'rgba(58,47,61,0.5)';
    c.lineWidth = 0.8;
    c.stroke();
  }
  // musicians: little dots with instruments
  for (let i = 0; i < 3; i++) {
    const [x, y] = P(0.42 + i * 0.08, 0.5, 4);
    c.fillStyle = ['#e8735a', '#5a7fa8', '#5f9a6b'][i];
    c.fillRect(x - 1.2, y - 5, 2.4, 4);
    c.fillStyle = '#f2c9a5';
    c.beginPath();
    c.arc(x, y - 6, 1.3, 0, 7);
    c.fill();
    c.fillStyle = C.brass;
    c.fillRect(x + 1, y - 4, 2, 1);
  }
  for (let i = 0; i < cols; i++) {
    const a = (i / cols) * Math.PI * 2;
    const u = 0.5 + Math.cos(a) * 0.3, v = 0.5 + Math.sin(a) * 0.3;
    if (u + v >= 0.95) cylinder(c, u, v, 0.02, 4, 18, { col: '#fbf6ec' });
  }
  cone(c, 0.5, 0.5, 0.42, 18, 30, tier === 0 ? M.tileRed : { col: '#e98a8a', tex: 'shingle' });
  if (tier >= 1) {
    // bunting
    const pts = [P(0.1, 0.5, 17), P(0.5, 0.9, 17), P(0.9, 0.5, 17)];
    for (let s = 0; s < 2; s++) {
      const a = pts[s], b = pts[s + 1];
      for (let i = 0; i < 6; i++) {
        const tt = (i + 0.5) / 6;
        const x = a[0] + (b[0] - a[0]) * tt, y = a[1] + (b[1] - a[1]) * tt + Math.sin(tt * Math.PI) * 2;
        c.fillStyle = ['#e8735a', '#f5d478', '#5a7fa8', '#9fd8b4'][i % 4];
        c.beginPath();
        c.moveTo(x - 1.4, y);
        c.lineTo(x + 1.4, y);
        c.lineTo(x, y + 2.6);
        c.fill();
        if (tier === 2) lampGlow(env.L, x, y, 4, 0.7);
      }
    }
  }
};
ANIM.bandstand = (c, tier, t, k) => {
  // floating music notes
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.3 + i / 3) % 1;
    const [x, y] = P(0.5, 0.5, 22 + p * 20);
    c.fillStyle = `rgba(60,50,70,${(1 - p) * (0.5 + k * 0.4)})`;
    c.font = '6px serif';
    c.fillText(i % 2 ? '♪' : '♫', x + Math.sin(t * 2 + i) * 6, y);
  }
  void tier;
};
TOP.bandstand = 60;

// =============== MEADOW FARMS ===============
function cropRows(c: Ctx, tier: number, seed: number, col: string, ripe: string) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const v = 0.12 + (i / (n - 1)) * 0.76;
    for (let j = 0; j < 9; j++) {
      const u = 0.1 + (j / 8) * 0.8;
      const [x, y] = P(u, v);
      const h = env.season === 'winter' ? 1 : env.season === 'spring' ? 3 : 5 + tier;
      const cc = env.season === 'summer' || env.season === 'autumn' ? ripe : env.season === 'winter' ? '#e8edf2' : col;
      c.strokeStyle = shade(cc, 0.75 + hash(seed, i, j) * 0.4);
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + 0.5, y - h);
      c.stroke();
      if (env.season !== 'winter') {
        c.fillStyle = shade(cc, 1.15);
        c.beginPath();
        c.ellipse(x + 0.6, y - h - 1, 0.9, 1.6, 0.3, 0, 7);
        c.fill();
      }
    }
  }
}
ART.wheat = (c, tier, seed) => {
  pad(c, 0.04, 0.04, 0.96, 0.96, 'soil', seed);
  cropRows(c, tier, seed, '#9cc95a', '#e6c25a');
  if (tier >= 1) {
    fence(c, [[0.02, 0.02], [0.98, 0.02], [0.98, 0.98]], '#e9dcc3', 4);
    // scarecrow
    const [x, y] = P(0.5, 0.5);
    c.strokeStyle = '#6b4a33';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y - 14);
    c.moveTo(x - 5, y - 10);
    c.lineTo(x + 5, y - 10);
    c.stroke();
    c.fillStyle = '#5a7fa8';
    c.fillRect(x - 2, y - 11, 4, 5);
    c.fillStyle = '#f5d478';
    c.beginPath();
    c.arc(x, y - 13, 2, 0, 7);
    c.fill();
    c.fillStyle = '#8a5634';
    c.fillRect(x - 3, y - 15.5, 6, 1);
    c.fillRect(x - 1.5, y - 17, 3, 1.6);
  }
  if (tier >= 2) {
    // tractor
    const [x, y] = P(0.82, 0.78);
    c.fillStyle = '#d9483b';
    c.fillRect(x - 6, y - 7, 9, 4);
    c.fillRect(x - 1, y - 11, 4, 4);
    c.fillStyle = '#9fd0e6';
    c.fillRect(x - 0.4, y - 10.4, 2.6, 2.4);
    c.fillStyle = '#2b2a3a';
    c.beginPath();
    c.arc(x - 4, y - 2.5, 2.6, 0, 7);
    c.arc(x + 2.5, y - 2, 1.8, 0, 7);
    c.fill();
    // sprinkler pipe
    const a = P(0.1, 0.3, 6), b = P(0.9, 0.3, 6);
    c.strokeStyle = '#9aa3ad';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(...a);
    c.lineTo(...b);
    c.stroke();
  }
};
ANIM.wheat = (c, tier, t) => {
  if (tier >= 2 && env.season !== 'winter') {
    for (let i = 0; i < 6; i++) {
      const p = (t * 0.8 + i / 6) % 1;
      const [x, y] = P(0.1 + i * 0.15, 0.3, 6 - p * 6);
      c.fillStyle = `rgba(170,215,255,${1 - p})`;
      c.fillRect(x, y + p * 4, 0.8, 1.6);
    }
  }
};
TOP.wheat = 30;

ART.orchard = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'grass', seed);
  const spots: [number, number][] = [[0.25, 0.25], [0.7, 0.25], [0.25, 0.7], [0.7, 0.7], [0.48, 0.48]];
  for (const [u, v] of spots.slice(0, tier === 0 ? 5 : 4)) tree(c, u, v, tier === 0 ? 0.55 : 0.85, env.season === 'spring' ? 'blossom' : 'fruit', seed + u * 10);
  if (tier >= 1) {
    for (const [u, v] of [[0.88, 0.5], [0.5, 0.9]] as [number, number][]) box(c, u - 0.06, v - 0.05, u + 0.06, v + 0.05, 0, 4, M.plank, { col: '#e5483f' });
  }
  if (tier >= 2) {
    // cider press shed
    box(c, 0.38, 0.4, 0.62, 0.62, 0, 10, M.log, null, seed);
    gable(c, 0.38, 0.4, 0.62, 0.62, 10, 7, 'v', M.thatch, M.log, 0.05);
    cylinder(c, 0.66, 0.5, 0.07, 0, 7, M.plank, '#8a5634');
  }
};
TOP.orchard = 50;

ART.barn = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'dirt', seed);
  groundShadow(c, 0.14, 0.18, 0.66, 0.82);
  box(c, 0.14, 0.18, 0.66, 0.82, 0, 16, M.barn, null, seed);
  // big doors with X trim
  const fw = (a: number) => {
    const p = (s: number, z: number) => P(a + s, 0.82, z);
    c.fillStyle = '#9a3a30';
    poly(c, [p(0, 0), p(0.24, 0), p(0.24, 12), p(0, 12)]);
    c.fill();
    c.strokeStyle = '#fbf6ec';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(...p(0, 0));
    c.lineTo(...p(0.24, 12));
    c.moveTo(...p(0.24, 0));
    c.lineTo(...p(0, 12));
    c.stroke();
    poly(c, [p(0, 0), p(0.24, 0), p(0.24, 12), p(0, 12)]);
    c.stroke();
  };
  fw(0.28);
  windowOn(c, 'R', 0.66, 0.3, 8, 0.12, 5, { frame: '#fbf6ec' });
  gable(c, 0.14, 0.18, 0.66, 0.82, 16, 13, 'v', { col: '#5f6273', tex: 'metal' }, M.barn, 0.06, seed);
  // hay loft window
  const [hx, hy] = P(0.4, 0.82, 22);
  c.fillStyle = '#fbf6ec';
  c.fillRect(hx - 2.5, hy - 3, 5, 4);
  c.fillStyle = '#e6c25a';
  c.fillRect(hx - 2, hy - 2, 4, 2.6);
  if (tier >= 1) {
    cylinder(c, 0.82, 0.3, 0.12, 0, 30, { col: tier === 2 ? '#d9d2c4' : '#c0473b', tex: tier === 2 ? 'metal' : 'brick' });
    dome(c, 0.82, 0.3, 0.12, 30, { col: '#9aa3ad' });
    fence(c, [[0.7, 0.55], [0.98, 0.55], [0.98, 0.98], [0.7, 0.98]], '#f1e6d2', 3.5);
  }
  if (tier === 2) {
    cylinder(c, 0.82, 0.08, 0.1, 0, 26, { col: '#d9d2c4', tex: 'metal' });
    dome(c, 0.82, 0.08, 0.1, 26, { col: '#9aa3ad' });
  }
};
ANIM.barn = (c, tier, t) => {
  if (tier >= 1 && env.season !== 'winter') {
    // cows wandering in the paddock
    for (let i = 0; i < 2; i++) {
      const u = 0.78 + 0.08 * Math.sin(t * 0.15 + i * 3), v = 0.7 + 0.12 * Math.cos(t * 0.11 + i * 2);
      const [x, y] = P(u, v);
      c.fillStyle = '#fbf6ec';
      c.beginPath();
      c.ellipse(x, y - 2.5, 3, 1.8, 0, 0, 7);
      c.fill();
      c.fillStyle = '#2b2a3a';
      c.beginPath();
      c.arc(x - 1, y - 3, 0.9, 0, 7);
      c.arc(x + 2.6, y - 3.4, 1.1, 0, 7);
      c.fill();
    }
  }
};
TOP.barn = 60;

ART.windmill = (c, tier, seed) => {
  pad(c, 0.04, 0.04, 0.96, 0.96, 'grass', seed);
  if (tier === 0) {
    box(c, 0.36, 0.36, 0.64, 0.64, 0, 6, M.stone, null, seed);
    box(c, 0.38, 0.38, 0.62, 0.62, 6, 22, M.plank, null, seed);
    gable(c, 0.38, 0.38, 0.62, 0.62, 22, 7, 'u', M.tileRed, M.plank, 0.04);
  } else {
    cylinder(c, 0.5, 0.5, 0.24, 0, 30, tier === 2 ? paint('#e98a8a', 'stucco') : M.white);
    windowOn(c, 'L', 0.73, 0.44, 14, 0.1, 6, { frame: '#fff' });
    door(c, 'L', 0.74, 0.44, 0.12, 8, '#6b4a33');
    cone(c, 0.5, 0.5, 0.26, 30, 42, tier === 2 ? M.shingleBlue : M.thatch);
    if (tier === 2) {
      // bakery annex
      box(c, 0.66, 0.1, 0.92, 0.34, 0, 9, M.plaster, null, seed);
      gable(c, 0.66, 0.1, 0.92, 0.34, 9, 6, 'v', M.tileRed, M.plaster, 0.04);
      flowers(c, 0.1, 0.7, 0.4, 0.95, 10, ['#ff6b6b', '#ffd166', '#ffffff'], seed);
    }
  }
};
ANIM.windmill = (c, tier, t, k) => {
  const [x, y] = tier === 0 ? P(0.62, 0.5, 18) : P(0.72, 0.6, 34);
  const r = tier === 0 ? 14 : 19;
  blades(c, x, y, r, t * (0.5 + k * 1.6), 4, tier === 2 ? '#fbf6ec' : '#efe3cf', tier === 0 ? 3 : 4);
};
TOP.windmill = 75;

ART.beehive = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'grass', seed);
  flowers(c, 0.05, 0.05, 0.95, 0.95, tier >= 1 ? 26 : 10, ['#ff8fab', '#ffd166', '#b38cff', '#ffffff', '#ff6b6b'], seed);
  const hives = tier === 0 ? 3 : 5;
  for (let i = 0; i < hives; i++) {
    const u = 0.2 + (i % 3) * 0.28, v = 0.3 + Math.floor(i / 3) * 0.35;
    box(c, u - 0.07, v - 0.06, u + 0.07, v + 0.06, 0, 9, { col: ['#fbf6ec', '#f5d478', '#9fd8b4'][i % 3], tex: 'plank' }, null);
    box(c, u - 0.08, v - 0.07, u + 0.08, v + 0.07, 9, 10.5, { col: '#c9a27a' }, { col: '#c9a27a' });
  }
  if (tier === 2) {
    box(c, 0.62, 0.62, 0.92, 0.9, 0, 11, M.log, null, seed);
    gable(c, 0.62, 0.62, 0.92, 0.9, 11, 7, 'u', M.thatch, M.log, 0.04);
    const [x, y] = P(0.92, 0.76, 6);
    c.fillStyle = '#f1b52a';
    c.beginPath();
    c.ellipse(x, y, 2, 2.5, 0, 0, 7);
    c.fill();
  }
};
ANIM.beehive = (c, tier, t) => {
  if (env.season === 'winter') return;
  const n = 4 + tier * 3;
  for (let i = 0; i < n; i++) {
    const u = 0.5 + 0.38 * Math.sin(t * (0.6 + (i % 3) * 0.2) + i * 1.7), v = 0.5 + 0.36 * Math.cos(t * (0.5 + (i % 4) * 0.15) + i);
    const [x, y] = P(u, v, 8 + Math.sin(t * 4 + i) * 3);
    c.fillStyle = '#2b2a3a';
    c.fillRect(x - 0.7, y - 0.5, 1.4, 1);
    c.fillStyle = '#f1b52a';
    c.fillRect(x - 0.3, y - 0.5, 0.6, 1);
  }
};
TOP.beehive = 40;

ART.greenhouse = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'paving', seed);
  const gl = { col: '#bfe6dc', tex: 'glass' as const, k: 1 };
  groundShadow(c, 0.12, 0.15, 0.88, 0.85, 0.15, 0.12);
  if (tier === 0) {
    box(c, 0.2, 0.25, 0.8, 0.75, 0, 9, gl, null, seed);
    gable(c, 0.2, 0.25, 0.8, 0.75, 9, 7, 'u', gl, gl, 0.02);
  } else if (tier === 1) {
    box(c, 0.12, 0.15, 0.88, 0.85, 0, 8, gl, null, seed);
    // vaulted roof via cylinder-ish ribs
    gable(c, 0.12, 0.15, 0.88, 0.85, 8, 13, 'u', gl, gl, 0.02);
  } else {
    box(c, 0.1, 0.12, 0.9, 0.88, 0, 12, gl, null, seed);
    flatRoof(c, 0.1, 0.12, 0.9, 0.88, 12, { col: '#dfeee9' }, 1);
    dome(c, 0.5, 0.5, 0.32, 13, { col: '#c9ece4', tex: 'glass' });
    cylinder(c, 0.5, 0.5, 0.03, 30, 34, { col: '#f3efe6' });
  }
  // plants inside (seen through glass)
  for (let i = 0; i < 6; i++) {
    const [x, y] = P(0.25 + (i % 3) * 0.25, 0.4 + Math.floor(i / 3) * 0.25, 2);
    c.fillStyle = rgba(['#4f9d55', '#e5483f', '#ffd166'][i % 3], 0.55);
    c.beginPath();
    c.arc(x, y - 2, 2.4, 0, 7);
    c.fill();
  }
};
TOP.greenhouse = 55;

// =============== COPPERWORKS ===============
ART.workshop = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'dirt', seed);
  const wall = tier === 0 ? M.plank : tier === 1 ? M.brick : M.brick2;
  groundShadow(c, 0.14, 0.2, 0.74, 0.8);
  box(c, 0.14, 0.2, 0.74, 0.8, 0, tier === 2 ? 18 : 13, wall, null, seed);
  const H = tier === 2 ? 18 : 13;
  door(c, 'L', 0.8, 0.3, 0.26, 10, '#6b4a33');
  windowOn(c, 'R', 0.74, 0.35, 4, 0.16, 6);
  if (tier === 2) windowRow(c, 'L', 0.8, 0.14, 0.74, 12, 3, 0.1, 4.5);
  if (tier === 0) gable(c, 0.14, 0.2, 0.74, 0.8, H, 9, 'u', { col: '#7f6a5a', tex: 'plank' }, wall, 0.06, seed);
  else hip(c, 0.14, 0.2, 0.74, 0.8, H, 9, M.slate, 0.06, seed);
  // log pile / planks
  for (let i = 0; i < 4; i++) cylinder(c, 0.86, 0.3 + i * 0.07, 0.04, 0, 3 + (i % 2) * 2, { col: '#a87a52' }, '#e3c49a');
  if (tier >= 1) {
    // crane arm
    const [x, y] = P(0.86, 0.85);
    c.strokeStyle = '#d9a441';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y - 24);
    c.lineTo(x - 12, y - 18);
    c.stroke();
  }
  if (tier === 2) chimney(c, 0.3, 0.35, H + 4, H + 20, '#7f4a3a');
};
ANIM.workshop = (c, tier, t, k) => {
  if (tier === 2) {
    const [x, y] = P(0.3, 0.35, 39);
    smoke(c, x, y, t, 0.4 + k * 0.7, '#cfc9d2', 6, 30);
  }
  if (tier >= 1) {
    const [x, y] = P(0.86, 0.85);
    const sw = Math.sin(t * 0.8) * 2;
    c.strokeStyle = '#3d3a46';
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(x - 12, y - 18);
    c.lineTo(x - 12 + sw, y - 9);
    c.stroke();
    c.fillStyle = '#a87a52';
    c.fillRect(x - 15 + sw, y - 9, 6, 2);
  }
  // sawdust sparks
  if (k > 0.3) {
    const [x, y] = P(0.44, 0.8, 4);
    for (let i = 0; i < 4; i++) {
      const p = (t * 2 + i / 4) % 1;
      c.fillStyle = `rgba(255,220,140,${1 - p})`;
      c.fillRect(x + Math.cos(i * 1.7) * p * 5, y - p * 4, 0.8, 0.8);
    }
  }
};
TOP.workshop = 70;

ART.sawmill = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'dirt', seed);
  // millrace
  const pts = [P(0.0, 0.05), P(1, 0.05), P(1, 0.18), P(0, 0.18)];
  poly(c, pts);
  c.fillStyle = env.season === 'winter' ? '#cfe4f2' : '#6fb7d8';
  c.fill();
  groundShadow(c, 0.25, 0.25, 0.8, 0.7);
  box(c, 0.25, 0.25, 0.8, 0.7, 0, 15, tier === 2 ? M.brick : M.log, null, seed);
  door(c, 'L', 0.7, 0.4, 0.22, 11, '#6b4a33');
  windowOn(c, 'R', 0.8, 0.4, 5, 0.12, 5);
  gable(c, 0.25, 0.25, 0.8, 0.7, 15, 10, 'u', tier === 2 ? M.slate : { col: '#8e7a66', tex: 'plank' }, M.log, 0.06, seed);
  // log stacks
  for (let r = 0; r < (tier >= 1 ? 3 : 2); r++)
    for (let i = 0; i < 3 - r; i++) {
      const [x, y] = P(0.2 + i * 0.07 + r * 0.035, 0.86, r * 3.2);
      c.fillStyle = '#a87a52';
      c.beginPath();
      c.ellipse(x, y - 2, 2.4, 1.8, 0, 0, 7);
      c.fill();
      c.fillStyle = '#e3c49a';
      c.beginPath();
      c.ellipse(x - 0.6, y - 2, 1.4, 1.1, 0, 0, 7);
      c.fill();
    }
  if (tier >= 1) {
    // conveyor
    const a = P(0.82, 0.55, 6), b = P(0.98, 0.9, 1);
    c.strokeStyle = '#5c5f6b';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(...a);
    c.lineTo(...b);
    c.stroke();
  }
  if (tier === 2) chimney(c, 0.68, 0.36, 22, 40, '#5c5f6b');
};
ANIM.sawmill = (c, tier, t, k) => {
  // water wheel on the race side
  const [x, y] = P(0.52, 0.22, 8);
  const a = t * (0.6 + k * 2);
  c.strokeStyle = '#6b4a33';
  c.lineWidth = 1.2;
  c.beginPath();
  c.ellipse(x, y, 4, 8, 0, 0, 7);
  c.stroke();
  for (let i = 0; i < 6; i++) {
    const ang = a + i * 1.047;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang) * 4, y + Math.sin(ang) * 8);
    c.stroke();
  }
  if (tier === 2) {
    const [sx, sy] = P(0.68, 0.36, 41);
    smoke(c, sx, sy, t, 0.4 + k * 0.6, '#d6d1d8', 6, 30);
  }
  if (tier >= 1) {
    const p = (t * 0.25) % 1;
    const a2 = P(0.82, 0.55, 6), b2 = P(0.98, 0.9, 1);
    const xx = a2[0] + (b2[0] - a2[0]) * p, yy = a2[1] + (b2[1] - a2[1]) * p;
    c.fillStyle = '#e3c49a';
    c.fillRect(xx - 2, yy - 2, 4, 1.5);
  }
};
TOP.sawmill = 70;

ART.brickworks = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'dirt', seed);
  const kilns = tier === 0 ? [[0.5, 0.45]] : tier === 1 ? [[0.32, 0.4], [0.68, 0.4]] : [[0.5, 0.42]];
  if (tier === 2) {
    box(c, 0.12, 0.2, 0.88, 0.7, 0, 12, M.brick, null, seed);
    for (let i = 0; i < 5; i++) door(c, 'L', 0.7, 0.16 + i * 0.14, 0.08, 7, '#3d2a24', { arch: true });
    hip(c, 0.12, 0.2, 0.88, 0.7, 12, 6, M.slate);
    chimney(c, 0.5, 0.45, 18, 52, C.brick2);
  } else
    for (const [u, v] of kilns) {
      cylinder(c, u, v, 0.18, 0, 10, M.brick);
      // bottle neck
      const [x, y] = P(u, v, 10);
      c.fillStyle = shade(C.brick, 0.95);
      c.beginPath();
      c.moveTo(x - 10, y);
      c.quadraticCurveTo(x - 9, y - 12, x - 3, y - 18);
      c.lineTo(x + 3, y - 18);
      c.quadraticCurveTo(x + 9, y - 12, x + 10, y);
      c.closePath();
      const g = c.createLinearGradient(x - 10, 0, x + 10, 0);
      g.addColorStop(0, shade(C.brick, 1.05));
      g.addColorStop(1, shade(C.brick, 0.65));
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = 'rgba(58,47,61,0.5)';
      c.lineWidth = 0.9;
      c.stroke();
      const [dx, dy] = P(u, v + 0.18, 0);
      c.fillStyle = '#ff9a3c';
      c.fillRect(dx - 2, dy - 6, 4, 5);
      if (env.L) lampGlow(env.L, dx, dy - 3, 10, 0.8, '255,150,60');
    }
  // brick pallets
  for (let i = 0; i < 3; i++) box(c, 0.12 + i * 0.12, 0.8, 0.2 + i * 0.12, 0.92, 0, 3 + (i % 2) * 2, { col: C.brick, tex: 'brick' }, { col: shade(C.brick, 1.1) });
};
ANIM.brickworks = (c, tier, t, k) => {
  if (tier === 2) {
    const [x, y] = P(0.5, 0.45, 53);
    smoke(c, x, y, t, 0.4 + k * 0.7, '#cfc4c4', 6, 34);
  } else {
    const ks = tier === 0 ? [[0.5, 0.45]] : [[0.32, 0.4], [0.68, 0.4]];
    ks.forEach(([u, v], i) => {
      const [x, y] = P(u, v, 29);
      smoke(c, x, y, t + i, 0.4 + k * 0.6, '#d8cccc', 5, 26, i);
    });
  }
};
TOP.brickworks = 80;

ART.foundry = (c, tier, seed) => {
  pad(c, 0.0, 0.0, 1, 1, 'paving', seed);
  groundShadow(c, 0.1, 0.12, 0.7, 0.88);
  const H = tier === 0 ? 16 : 22;
  box(c, 0.1, 0.12, 0.7, 0.88, 0, H, tier === 2 ? M.metal : M.brick2, null, seed);
  door(c, 'L', 0.88, 0.25, 0.28, 13, '#2b2a3a');
  windowRow(c, 'R', 0.7, 0.12, 0.88, 8, 3, 0.12, 7, { lit: 1 });
  gable(c, 0.1, 0.12, 0.7, 0.88, H, 8, 'v', M.ironM, M.brick2, 0.04, seed);
  // furnace glow through the door
  const [x, y] = P(0.39, 0.88, 6);
  c.fillStyle = '#ff7a2a';
  c.fillRect(x - 6, y - 5, 10, 6);
  lampGlow(env.L, x, y - 2, 16, 0.9, '255,120,40');
  if (tier >= 1) {
    cylinder(c, 0.84, 0.3, 0.13, 0, 34, M.brick2);
    cylinder(c, 0.84, 0.3, 0.15, 34, 37, M.ironM, '#2b2a3a');
  } else chimney(c, 0.8, 0.3, 0, 30, C.brick2);
  if (tier === 2) {
    // electric arc electrodes on the roof
    for (let i = 0; i < 3; i++) cylinder(c, 0.3 + i * 0.12, 0.5, 0.025, H + 4, H + 14, { col: '#3d3a46' });
  }
  // molten crucible
  cylinder(c, 0.86, 0.75, 0.08, 0, 5, M.ironM, '#ff8a3a');
};
ANIM.foundry = (c, tier, t, k) => {
  const [x, y] = tier >= 1 ? P(0.84, 0.3, 38) : P(0.8, 0.3, 31);
  smoke(c, x, y, t, 0.5 + k * 0.6, '#b8b0b6', 6, 36);
  const [mx, my] = P(0.86, 0.75, 5);
  glow(c, mx, my, 8, '255,140,60', 0.35 + 0.2 * Math.sin(t * 6));
  if (tier === 2 && k > 0.2) {
    for (let i = 0; i < 2; i++) {
      const [ax, ay] = P(0.3 + i * 0.12, 0.5, 36);
      const [bx, by] = P(0.42 + i * 0.12, 0.5, 36);
      if (Math.sin(t * 9 + i * 2) > 0) arc(c, ax, ay, bx, by, t, '170,220,255', 0.8, i);
    }
  }
};
TOP.foundry = 80;

ART.factory = (c, tier, seed) => {
  // 2x2 footprint
  pad(c, 0.04, 0.04, 1.96, 1.96, 'paving', seed);
  groundShadow(c, 0.15, 0.2, 1.75, 1.6, 0.3);
  const H = tier === 0 ? 16 : 20;
  box(c, 0.15, 0.2, 1.75, 1.6, 0, H, tier === 2 ? paint('#c9824a', 'brick') : M.brick, null, seed);
  windowRow(c, 'L', 1.6, 0.15, 1.75, 5, 6, 0.14, 8);
  windowRow(c, 'R', 1.75, 0.2, 1.6, 5, 5, 0.14, 8);
  door(c, 'L', 1.6, 1.2, 0.34, 12, '#5c5f6b');
  // sawtooth roof along u
  const teeth = 5;
  for (let i = 0; i < teeth; i++) {
    const v0 = 0.2 + (i / teeth) * 1.4, v1 = v0 + 1.4 / teeth;
    const glassFace = [P(0.15, v0, H), P(1.75, v0, H), P(1.75, v0, H + 9), P(0.15, v0, H + 9)];
    poly(c, glassFace);
    c.fillStyle = '#9fc9dc';
    c.fill();
    if (env.L) {
      poly(env.L, glassFace);
      env.L.fillStyle = 'rgba(255,220,150,0.5)';
      env.L.fill();
    }
    const slope = [P(0.15, v0, H + 9), P(1.75, v0, H + 9), P(1.75, v1, H), P(0.15, v1, H)];
    poly(c, slope);
    c.fillStyle = shade(tier === 2 ? '#7f8a99' : '#6d7180', 1.0);
    c.fill();
    c.strokeStyle = 'rgba(58,47,61,0.5)';
    c.lineWidth = 0.8;
    c.stroke();
    // end triangle
    const tri = [P(1.75, v1, H), P(1.75, v0, H), P(1.75, v0, H + 9)];
    poly(c, tri);
    c.fillStyle = shade(C.brick, 0.74);
    c.fill();
    c.stroke();
  }
  // chimneys
  const stacks = tier === 0 ? 1 : 2;
  for (let i = 0; i < stacks; i++) cylinder(c, 0.4 + i * 0.35, 0.35, 0.09, H, H + 34 + i * 4, M.brick2, '#2b2a3a');
  if (tier >= 1) {
    // loading bay + crates
    box(c, 1.75, 0.6, 1.95, 1.2, 0, 4, M.plank, { col: '#c9a27a' });
    for (let i = 0; i < 3; i++) box(c, 1.78 + (i % 2) * 0.08, 0.7 + i * 0.15, 1.86 + (i % 2) * 0.08, 0.8 + i * 0.15, 4, 9, M.plank, { col: '#d9b58a' });
  }
  if (tier === 2) {
    // giant gear emblem
    const [x, y] = P(0.9, 1.6, 14);
    c.strokeStyle = C.brass;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x, y, 6, 0, 7);
    c.stroke();
  }
};
ANIM.factory = (c, tier, t, k) => {
  const H = tier === 0 ? 16 : 20;
  const stacks = tier === 0 ? 1 : 2;
  for (let i = 0; i < stacks; i++) {
    const [x, y] = P(0.4 + i * 0.35, 0.35, H + 35 + i * 4);
    smoke(c, x, y, t + i * 0.7, 0.5 + k * 0.7, '#cfc9d2', 7, 40, i);
  }
  if (tier === 2) {
    const [x, y] = P(0.9, 1.6, 14);
    c.save();
    c.translate(x, y);
    c.rotate(t * (0.5 + k));
    c.fillStyle = C.brass;
    for (let i = 0; i < 8; i++) {
      c.rotate(Math.PI / 4);
      c.fillRect(-1, -8, 2, 3);
    }
    c.restore();
  }
};
TOP.factory = 90;

ART.battery = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'paving', seed);
  fence(c, [[0.04, 0.04], [0.96, 0.04], [0.96, 0.96]], '#9aa3ad', 5);
  const cells = tier === 0 ? 4 : tier === 1 ? 6 : 3;
  if (tier < 2) {
    for (let i = 0; i < cells; i++) {
      const u = 0.18 + (i % 3) * 0.24, v = 0.25 + Math.floor(i / 3) * 0.32;
      box(c, u, v, u + 0.18, v + 0.22, 0, 10 + tier * 4, tier === 0 ? { col: '#5c5f6b', tex: 'metal' } : M.copper, null, seed + i);
      box(c, u + 0.03, v + 0.03, u + 0.06, v + 0.06, 10 + tier * 4, 12 + tier * 4, { col: '#e5483f' }, null);
      box(c, u + 0.12, v + 0.03, u + 0.15, v + 0.06, 10 + tier * 4, 12 + tier * 4, { col: '#2b2a3a' }, null);
    }
  } else {
    for (let i = 0; i < 2; i++) cylinder(c, 0.3 + i * 0.36, 0.38, 0.14, 0, 26, { col: '#e9eef2', tex: 'metal' }, '#cfd8e0');
    // glass tube with glowing electrolyte
    cylinder(c, 0.5, 0.72, 0.1, 0, 20, { col: '#9be7ff', tex: 'glass' }, '#d6f5ff');
    const [x, y] = P(0.5, 0.72, 10);
    lampGlow(env.L, x, y, 18, 0.7, '120,230,255');
  }
};
ANIM.battery = (c, tier, t, k) => {
  // charge indicator LEDs
  const n = tier < 2 ? (tier === 0 ? 4 : 6) : 0;
  for (let i = 0; i < n; i++) {
    const u = 0.18 + (i % 3) * 0.24, v = 0.25 + Math.floor(i / 3) * 0.32;
    const [x, y] = P(u + 0.09, v + 0.22, 6 + tier * 2);
    const on = (Math.floor(t * 2 + i) % 3) / 2 < 0.3 + k;
    c.fillStyle = on ? '#6ee78c' : '#2f4f3a';
    c.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
  }
  if (tier === 2) {
    const [x, y] = P(0.5, 0.72, 10);
    glow(c, x, y, 14, '120,230,255', 0.2 + 0.25 * k + 0.08 * Math.sin(t * 3));
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.4 + i / 4) % 1;
      c.fillStyle = `rgba(220,250,255,${1 - p})`;
      c.beginPath();
      c.arc(x + (i - 1.5) * 2, y + 8 - p * 18, 0.8, 0, 7);
      c.fill();
    }
  }
};
TOP.battery = 50;

ART.capacitor = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'paving', seed);
  box(c, 0.3, 0.3, 0.7, 0.7, 0, 8, M.stone, null, seed);
  const H = tier === 0 ? 38 : tier === 1 ? 52 : 64;
  // tapered lattice tower
  const [bx, by] = P(0.5, 0.5, 8);
  const top = by - (H - 8);
  c.strokeStyle = '#5c5f6b';
  c.lineWidth = 1.1;
  const w0 = 9, w1 = 2.5;
  c.beginPath();
  c.moveTo(bx - w0, by);
  c.lineTo(bx - w1, top);
  c.moveTo(bx + w0, by);
  c.lineTo(bx + w1, top);
  for (let i = 0; i < 8; i++) {
    const t0 = i / 8, t1 = (i + 1) / 8;
    const y0 = by + (top - by) * t0, y1 = by + (top - by) * t1;
    const ww0 = w0 + (w1 - w0) * t0, ww1 = w0 + (w1 - w0) * t1;
    c.moveTo(bx - ww0, y0);
    c.lineTo(bx + ww1, y1);
    c.moveTo(bx + ww0, y0);
    c.lineTo(bx - ww1, y1);
  }
  c.stroke();
  // coil rings
  const rings = tier === 0 ? 1 : 2;
  for (let i = 0; i < rings; i++) {
    const yy = top + 6 + i * 12;
    c.strokeStyle = C.copper;
    c.lineWidth = 2.2;
    c.beginPath();
    c.ellipse(bx, yy, 10 - i * 2, 3.5, 0, 0, 7);
    c.stroke();
  }
  // top sphere
  const g = c.createRadialGradient(bx - 2, top - 4, 1, bx, top - 2, 7);
  g.addColorStop(0, '#fff6d6');
  g.addColorStop(1, tier === 2 ? '#d9a441' : '#9aa3ad');
  c.fillStyle = g;
  c.beginPath();
  c.arc(bx, top - 3, tier === 2 ? 6 : 5, 0, 7);
  c.fill();
  c.strokeStyle = 'rgba(58,47,61,0.5)';
  c.lineWidth = 0.8;
  c.stroke();
};
ANIM.capacitor = (c, tier, t, k) => {
  const H = tier === 0 ? 38 : tier === 1 ? 52 : 64;
  const [bx, by] = P(0.5, 0.5, H);
  const top = by - 3;
  glow(c, bx, top, 16 + k * 14, '150,210,255', 0.2 + k * 0.45);
  if (k > 0.15) {
    const n = 1 + Math.floor(k * 3);
    for (let i = 0; i < n; i++) {
      const a = t * 3 + i * 2.2;
      if (Math.sin(t * 11 + i * 3) > 0.2 - k * 0.5) arc(c, bx, top, bx + Math.cos(a) * 14, top + 8 + Math.sin(a) * 10, t, '200,235,255', 0.9, i);
    }
  }
};
TOP.capacitor = 90;

ART.turbine = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'paving', seed);
  fence(c, [[0.04, 0.96], [0.04, 0.04], [0.96, 0.04]], '#9aa3ad', 5);
  if (tier === 0) {
    box(c, 0.35, 0.35, 0.65, 0.6, 0, 14, { col: '#7f8a99', tex: 'metal' }, null, seed);
    windowOn(c, 'L', 0.6, 0.4, 4, 0.18, 6, { frame: '#5c5f6b' });
  } else {
    // transformers
    const n = tier === 1 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const u = 0.2 + i * 0.25;
      box(c, u, 0.35, u + 0.18, 0.6, 0, 12, { col: '#8a9aa8', tex: 'metal' }, null, seed + i);
      for (let j = 0; j < 3; j++) cylinder(c, u + 0.04 + j * 0.05, 0.42, 0.012, 12, 18, { col: '#a8d0c4' });
    }
    // gantry
    const a = P(0.15, 0.75, 0), b = P(0.15, 0.75, 24), d = P(0.85, 0.75, 24), e = P(0.85, 0.75, 0);
    c.strokeStyle = '#5c5f6b';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(...a);
    c.lineTo(...b);
    c.lineTo(...d);
    c.lineTo(...e);
    c.stroke();
    if (tier === 2) {
      box(c, 0.66, 0.66, 0.92, 0.92, 0, 16, M.brick, null, seed);
      hip(c, 0.66, 0.66, 0.92, 0.92, 16, 6, M.slate);
    }
  }
};
ANIM.turbine = (c, tier, t, k) => {
  if (tier >= 1) {
    const a = P(0.15, 0.75, 24), d = P(0.85, 0.75, 24);
    const p = (t * (0.4 + k)) % 1;
    glow(c, a[0] + (d[0] - a[0]) * p, a[1] + (d[1] - a[1]) * p, 5, '255,220,120', 0.7);
  } else {
    const [x, y] = P(0.65, 0.48, 10);
    c.fillStyle = Math.sin(t * 6) > 0 ? '#6ee78c' : '#ffd166';
    c.fillRect(x - 1, y - 1, 2, 2);
  }
};
TOP.turbine = 50;
