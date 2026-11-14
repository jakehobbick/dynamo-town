// Building art, part 2: Harbor, Campus, Gecko Sanctuary, Sky Dock and decor.
import { hash } from '../../core/util';
import {
  P, box, bush, cone, cylinder, dome, door, env, fence, flagPole, flatRoof, flowers, gable, groundShadow, hip, lampGlow, mix, pad, poly, rgba, shade, streetLamp, tree, windowOn, windowRow, type Ctx,
} from '../prims';
import { C, M, paint } from './palette';
import { arc, bob, flag, glow, smoke } from './fx';
import { ANIM, ART, TOP } from './town1';

function boat(c: Ctx, x: number, y: number, s: number, col: string, sail = false, t = 0) {
  const rock = Math.sin(t * 1.4) * 0.06;
  c.save();
  c.translate(x, y + bob(t, x, 0.8));
  c.rotate(rock);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(-9 * s, -2 * s);
  c.lineTo(9 * s, -2 * s);
  c.lineTo(6 * s, 2.5 * s);
  c.lineTo(-7 * s, 2.5 * s);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(58,47,61,0.55)';
  c.lineWidth = 0.7;
  c.stroke();
  c.fillStyle = '#fbf6ec';
  c.fillRect(-8 * s, -2.6 * s, 16 * s, 0.9 * s);
  if (sail) {
    c.strokeStyle = '#6b4a33';
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(0, -2 * s);
    c.lineTo(0, -18 * s);
    c.stroke();
    c.fillStyle = '#fbf6ec';
    c.beginPath();
    c.moveTo(0.5, -17 * s);
    c.quadraticCurveTo(8 * s, -10 * s, 0.5, -3 * s);
    c.fill();
  } else {
    c.fillStyle = '#fbf6ec';
    c.fillRect(-2 * s, -7 * s, 6 * s, 5 * s);
    c.fillStyle = '#3e4a6b';
    c.fillRect(-1 * s, -6 * s, 1.6 * s, 1.6 * s);
  }
  c.restore();
}

function waterPatch(c: Ctx, u0: number, v0: number, u1: number, v1: number) {
  const pts = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
  poly(c, pts);
  c.fillStyle = env.season === 'winter' ? '#bcd8ea' : '#5fa8cf';
  c.fill();
}

// =============== HARBOR ===============
ART.fishdock = (c, tier, seed) => {
  waterPatch(c, 0.45, 0.0, 1, 1);
  pad(c, 0.0, 0.0, 0.45, 1, 'grass', seed);
  // jetty
  pad(c, 0.4, 0.38, 1.0, 0.62, 'plank', seed);
  for (const u of [0.55, 0.75, 0.95]) for (const v of [0.38, 0.62]) box(c, u - 0.02, v - 0.02, u + 0.02, v + 0.02, -4, 3, { col: '#6b4a33' }, null);
  // hut
  box(c, 0.06, 0.25, 0.36, 0.6, 0, 11, tier === 2 ? M.brick : paint('#5a7fa8', 'plank', 0.6), null, seed);
  door(c, 'L', 0.6, 0.12, 0.1, 8, '#6b4a33');
  gable(c, 0.06, 0.25, 0.36, 0.6, 11, 7, 'u', M.tileRed, M.plank, 0.04);
  // nets and barrels
  cylinder(c, 0.2, 0.8, 0.05, 0, 5, M.plank, '#8a5634');
  cylinder(c, 0.3, 0.86, 0.05, 0, 5, M.plank, '#8a5634');
  if (tier === 2) {
    // smokehouse
    box(c, 0.06, 0.64, 0.3, 0.94, 0, 9, M.log, null, seed);
    gable(c, 0.06, 0.64, 0.3, 0.94, 9, 6, 'u', M.slate, M.log, 0.03);
  }
};
ANIM.fishdock = (c, tier, t, k) => {
  const [x, y] = P(0.8, 0.85);
  boat(c, x, y, tier === 0 ? 0.6 : 0.85, tier === 0 ? '#e8735a' : '#3e6b5a', false, t);
  if (tier === 2) {
    const [x2, y2] = P(0.85, 0.18);
    boat(c, x2, y2, 0.75, '#5a7fa8', true, t + 2);
    const [sx, sy] = P(0.18, 0.79, 12);
    smoke(c, sx, sy, t, 0.4 + k * 0.4, '#d8d2da', 4, 18);
  }
  // gull
  const gx = Math.sin(t * 0.3) * 20, gy = Math.cos(t * 0.5) * 4;
  const [bx, by] = P(0.5, 0.5, 34);
  c.strokeStyle = '#fbf6ec';
  c.lineWidth = 0.9;
  c.beginPath();
  const w = Math.sin(t * 6) * 2;
  c.moveTo(bx + gx - 3, by + gy - w);
  c.quadraticCurveTo(bx + gx - 1, by + gy - 2, bx + gx, by + gy);
  c.quadraticCurveTo(bx + gx + 1, by + gy - 2, bx + gx + 3, by + gy - w);
  c.stroke();
};
TOP.fishdock = 50;

ART.lighthouse = (c, tier, seed) => {
  pad(c, 0.04, 0.04, 0.96, 0.96, 'dirt', seed);
  // rocks
  for (let i = 0; i < 6; i++) {
    const [x, y] = P(0.2 + hash(seed, i) * 0.6, 0.2 + hash(seed, i, 2) * 0.6);
    c.fillStyle = shade('#9a948c', 0.85 + hash(i) * 0.3);
    c.beginPath();
    c.ellipse(x, y, 4, 2.5, 0, 0, 7);
    c.fill();
  }
  box(c, 0.6, 0.6, 0.9, 0.9, 0, 9, M.white, null, seed);
  gable(c, 0.6, 0.6, 0.9, 0.9, 9, 6, 'u', M.tileRed, M.white, 0.03);
  const H = tier === 0 ? 36 : tier === 1 ? 52 : 62;
  const r0 = 0.2, r1 = 0.13;
  // tapered tower drawn as stacked cylinders with stripes
  const segs = 6;
  for (let i = 0; i < segs; i++) {
    const h0 = (i / segs) * H, h1 = ((i + 1) / segs) * H;
    const r = r0 + (r1 - r0) * (i / segs);
    const col = tier === 0 ? C.stone : i % 2 ? '#d9483b' : '#fbf6ec';
    cylinder(c, 0.42, 0.42, r, h0, h1, { col, tex: tier === 0 ? 'stone' : 'none' });
  }
  // gallery + lamp room
  cylinder(c, 0.42, 0.42, r1 + 0.05, H, H + 2, M.ironM, '#5c5f6b');
  cylinder(c, 0.42, 0.42, r1 - 0.01, H + 2, H + 10, { col: '#fff3c4', tex: 'glass' });
  const [x, y] = P(0.42, 0.42, H + 6);
  lampGlow(env.L, x, y, tier === 2 ? 30 : 20, 0.95, '255,230,150');
  cone(c, 0.42, 0.42, r1 + 0.03, H + 10, H + 17, { col: '#3d3a46' });
};
ANIM.lighthouse = (c, tier, t) => {
  const H = tier === 0 ? 36 : tier === 1 ? 52 : 62;
  const [x, y] = P(0.42, 0.42, H + 6);
  glow(c, x, y, 10, '255,235,170', 0.5 + 0.2 * Math.sin(t * 2));
  // sweeping beam (dim by day; brighter at night via the light pass in renderer)
  const a = t * 0.9;
  const len = tier === 2 ? 140 : 90;
  const dx = Math.cos(a) * len, dy = Math.sin(a) * len * 0.5;
  const g = c.createLinearGradient(x, y, x + dx, y + dy);
  g.addColorStop(0, 'rgba(255,240,180,0.35)');
  g.addColorStop(1, 'rgba(255,240,180,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + dx - dy * 0.12, y + dy + dx * 0.12);
  c.lineTo(x + dx + dy * 0.12, y + dy - dx * 0.12);
  c.closePath();
  c.fill();
};
TOP.lighthouse = 95;

ART.shipyard = (c, tier, seed) => {
  waterPatch(c, 0.55, 0, 1, 1);
  pad(c, 0, 0, 0.55, 1, 'dirt', seed);
  // slipway
  pad(c, 0.25, 0.3, 0.95, 0.7, 'plank', seed);
  // hull under construction
  const [x, y] = P(0.55, 0.5, 3);
  c.fillStyle = tier === 0 ? '#c9a27a' : '#8a5634';
  c.beginPath();
  c.moveTo(x - 18, y - 6);
  c.quadraticCurveTo(x - 4, y + 6, x + 16, y + 2);
  c.lineTo(x + 18, y - 8);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(58,47,61,0.6)';
  c.lineWidth = 0.8;
  c.stroke();
  if (tier === 0) {
    c.strokeStyle = '#8a5634';
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      c.moveTo(x - 14 + i * 5, y - 6);
      c.lineTo(x - 14 + i * 5, y + 1);
      c.stroke();
    }
  }
  if (tier >= 1) {
    box(c, 0.05, 0.05, 0.3, 0.95, 0, 20, paint('#7f8a99', 'metal'), null, seed);
    gable(c, 0.05, 0.05, 0.3, 0.95, 20, 8, 'v', M.ironM, paint('#7f8a99', 'metal'), 0.03);
  }
  if (tier === 2) {
    // gantry crane
    const a = P(0.3, 0.2, 0), b = P(0.3, 0.2, 44), d = P(0.95, 0.2, 44), e = P(0.3, 0.8, 0), f = P(0.3, 0.8, 44);
    c.strokeStyle = '#d9a441';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(...a);
    c.lineTo(...b);
    c.lineTo(...d);
    c.moveTo(...e);
    c.lineTo(...f);
    c.lineTo(...b);
    c.stroke();
  }
};
ANIM.shipyard = (c, tier, t, k) => {
  // welding sparks
  const [x, y] = P(0.55, 0.5, 6);
  if (Math.sin(t * 7) > 0.3 - k * 0.5)
    for (let i = 0; i < 5; i++) {
      const p = (t * 3 + i / 5) % 1;
      c.fillStyle = `rgba(255,${200 + i * 10},120,${1 - p})`;
      c.fillRect(x + 6 + Math.cos(i * 1.3) * p * 6, y - 4 + p * 5 - 3, 0.9, 0.9);
    }
  if (tier === 2) {
    const p = Math.sin(t * 0.3) * 0.5 + 0.5;
    const [hx, hy] = P(0.35 + p * 0.55, 0.2, 44);
    c.strokeStyle = '#3d3a46';
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(hx, hy);
    c.lineTo(hx, hy + 22);
    c.stroke();
    c.fillStyle = '#e8735a';
    c.fillRect(hx - 3, hy + 22, 6, 4);
  }
};
TOP.shipyard = 75;

ART.tradeport = (c, tier, seed) => {
  waterPatch(c, 0.6, 0, 1, 1);
  pad(c, 0, 0, 0.62, 1, 'cobble', seed);
  pad(c, 0.58, 0.05, 0.72, 0.95, 'paving', seed + 1);
  const H = tier === 0 ? 14 : 18;
  box(c, 0.06, 0.12, 0.48, 0.88, 0, H, tier === 2 ? M.stone : M.brick, null, seed);
  for (let i = 0; i < 3; i++) door(c, 'R', 0.48, 0.18 + i * 0.24, 0.14, 10, '#5b3a2a');
  windowRow(c, 'L', 0.88, 0.06, 0.48, 4, 2, 0.1, 6);
  gable(c, 0.06, 0.12, 0.48, 0.88, H, 10, 'v', M.slate, M.brick, 0.04, seed);
  if (tier >= 1) {
    flagPole(c, 0.3, 0.5, H + 10, 14, '#5a7fa8');
    // crane
    const a = P(0.66, 0.5, 0), b = P(0.66, 0.5, 34), d = P(0.86, 0.6, 30);
    c.strokeStyle = '#c0473b';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(...a);
    c.lineTo(...b);
    c.lineTo(...d);
    c.stroke();
  }
  // containers / crates
  for (let i = 0; i < 3; i++) box(c, 0.52, 0.12 + i * 0.12, 0.6, 0.22 + i * 0.12, 0, 5, { col: ['#e8735a', '#5a7fa8', '#5f9a6b'][i], tex: 'metal' }, null);
};
ANIM.tradeport = (c, tier, t) => {
  const [x, y] = P(0.85, 0.5);
  if (tier === 2) {
    // steamship
    c.save();
    c.translate(x, y + bob(t, 3, 0.6));
    c.fillStyle = '#3e4a6b';
    c.beginPath();
    c.moveTo(-14, -2);
    c.lineTo(14, -2);
    c.lineTo(10, 4);
    c.lineTo(-12, 4);
    c.closePath();
    c.fill();
    c.fillStyle = '#fbf6ec';
    c.fillRect(-8, -7, 14, 5);
    c.fillStyle = '#d9483b';
    c.fillRect(-2, -13, 4, 6);
    c.restore();
    smoke(c, x, y - 14, t, 0.7, '#e8e4ea', 5, 22);
  } else boat(c, x, y, 0.9, '#e8735a', tier === 0, t);
};
TOP.tradeport = 60;

ART.fishmarket = (c, tier, seed) => {
  pad(c, 0.02, 0.02, 0.98, 0.98, 'paving', seed);
  const wall = tier === 0 ? paint('#9fd0e6', 'plank', 0.5) : paint('#f3efe6', 'stucco');
  groundShadow(c, 0.16, 0.2, 0.84, 0.76);
  box(c, 0.16, 0.2, 0.84, 0.76, 0, 12, wall, null, seed);
  if (tier >= 1) {
    // tiled band
    box(c, 0.16, 0.76, 0.84, 0.77, 0, 4, { col: '#5a9fc0', tex: 'tile' }, null);
  }
  door(c, 'L', 0.76, 0.42, 0.18, 9, '#3e6b8a');
  windowRow(c, 'R', 0.84, 0.2, 0.76, 3, 2, 0.14, 6);
  if (tier === 2) {
    // restaurant terrace on stilts
    box(c, 0.84, 0.25, 1.0, 0.75, 0, 3, M.plank, { col: '#c9a27a' });
    for (const v of [0.35, 0.65]) {
      const [x, y] = P(0.93, v, 3);
      c.fillStyle = '#fff';
      c.beginPath();
      c.ellipse(x, y - 3, 2.4, 1.1, 0, 0, 7);
      c.fill();
      lampGlow(env.L, x, y - 6, 8, 0.6);
    }
  }
  hip(c, 0.16, 0.2, 0.84, 0.76, 12, 8, tier === 0 ? M.tileTerra : M.shingleBlue, 0.07, seed);
  // fish sign
  const [x, y] = P(0.5, 0.76, 15);
  c.fillStyle = '#5fa8cf';
  c.beginPath();
  c.ellipse(x, y, 4.5, 2, 0, 0, 7);
  c.moveTo(x + 4, y);
  c.lineTo(x + 7, y - 2);
  c.lineTo(x + 7, y + 2);
  c.fill();
  // ice boxes with fish
  for (let i = 0; i < 2; i++) {
    box(c, 0.2 + i * 0.25, 0.82, 0.38 + i * 0.25, 0.94, 0, 4, M.plank, { col: '#dff1fa' });
    const [fx, fy] = P(0.29 + i * 0.25, 0.88, 4.5);
    c.fillStyle = '#9fb7c9';
    c.fillRect(fx - 3, fy - 0.5, 6, 1);
  }
};
ANIM.fishmarket = (c, tier, t) => {
  // seagull hopping
  const p = (Math.sin(t * 0.7) + 1) / 2;
  const [x, y] = P(0.2 + p * 0.5, 0.95, Math.abs(Math.sin(t * 5)) * 2);
  c.fillStyle = '#fbf6ec';
  c.beginPath();
  c.ellipse(x, y - 2, 2, 1.3, 0, 0, 7);
  c.fill();
  c.fillStyle = '#f5b13a';
  c.fillRect(x + 1.6, y - 2.6, 1.2, 0.6);
  void tier;
};
TOP.fishmarket = 50;

// =============== CAMPUS ===============
ART.library = (c, tier, seed) => {
  pad(c, 0, 0, 1, 1, 'paving', seed);
  groundShadow(c, 0.12, 0.15, 0.88, 0.8);
  const H = tier === 0 ? 14 : 20;
  box(c, 0.12, 0.15, 0.88, 0.8, 0, H, tier === 2 ? M.white : M.stone, null, seed);
  door(c, 'L', 0.8, 0.44, 0.13, 11, '#5b3a2a', { arch: true, lamp: true });
  windowRow(c, 'L', 0.8, 0.12, 0.42, 4, 1, 0.12, 10, { arch: true });
  windowRow(c, 'L', 0.8, 0.6, 0.88, 4, 1, 0.12, 10, { arch: true });
  windowRow(c, 'R', 0.88, 0.15, 0.8, 4, 3, 0.1, 10, { arch: true });
  if (tier === 0) gable(c, 0.12, 0.15, 0.88, 0.8, H, 10, 'u', M.slate, M.stone, 0.06, seed);
  else {
    flatRoof(c, 0.12, 0.15, 0.88, 0.8, H, { col: '#d8d0c4' });
    dome(c, 0.5, 0.48, tier === 2 ? 0.3 : 0.22, H + 2, tier === 2 ? { col: '#bfe6f2', tex: 'glass' } : { col: C.copperV });
    if (tier === 2) {
      const [x, y] = P(0.5, 0.48, H + 10);
      lampGlow(env.L, x, y, 26, 0.55);
    }
  }
  // book stack statue
  const [x, y] = P(0.94, 0.94);
  for (let i = 0; i < 3; i++) {
    c.fillStyle = ['#c0473b', '#5a7fa8', '#5f9a6b'][i];
    c.fillRect(x - 3 + i * 0.4, y - 2 - i * 1.6, 6, 1.5);
  }
};
TOP.library = 60;

ART.lab = (c, tier, seed) => {
  pad(c, 0, 0, 1, 1, 'paving', seed);
  groundShadow(c, 0.15, 0.2, 0.8, 0.85);
  const H = tier === 0 ? 14 : 18;
  box(c, 0.15, 0.2, 0.8, 0.85, 0, H, tier === 2 ? paint('#dcd6e8', 'stucco') : M.brick, null, seed);
  door(c, 'L', 0.85, 0.3, 0.14, 10, '#3e4a6b');
  windowRow(c, 'L', 0.85, 0.15, 0.8, 4, 3, 0.1, 7, { lit: 1 });
  windowRow(c, 'R', 0.8, 0.2, 0.85, 4, 3, 0.1, 7);
  flatRoof(c, 0.15, 0.2, 0.8, 0.85, H, { col: '#cfc6b6' });
  if (tier >= 1) {
    cylinder(c, 0.35, 0.4, 0.07, H, H + 26, M.metal, '#3d3a46');
  }
  if (tier === 2) {
    // particle loop ring on the lawn
    const [x, y] = P(0.92, 0.5);
    c.strokeStyle = '#9aa3ad';
    c.lineWidth = 2.4;
    c.beginPath();
    c.ellipse(x - 6, y - 4, 13, 6, 0, 0, 7);
    c.stroke();
  }
  // tesla ball on the roof
  cylinder(c, 0.62, 0.6, 0.02, H + 2, H + 8, { col: '#5c5f6b' });
  const [bx, by] = P(0.62, 0.6, H + 10);
  c.fillStyle = '#c9cfd8';
  c.beginPath();
  c.arc(bx, by, 2.4, 0, 7);
  c.fill();
};
ANIM.lab = (c, tier, t, k) => {
  const H = tier === 0 ? 14 : 18;
  const [bx, by] = P(0.62, 0.6, H + 10);
  if (Math.sin(t * 5) > 0.4 - k * 0.6) arc(c, bx, by, bx + Math.sin(t * 3) * 8, by - 6, t, '190,160,255', 0.8, 3);
  if (tier >= 1) {
    const [x, y] = P(0.35, 0.4, H + 27);
    smoke(c, x, y, t, 0.6, '#c9f0d0', 5, 22);
  }
  if (tier === 2) {
    const [x, y] = P(0.92, 0.5);
    const a = t * (1.5 + k * 3);
    glow(c, x - 6 + Math.cos(a) * 13, y - 4 + Math.sin(a) * 6, 5, '190,160,255', 0.9);
  }
};
TOP.lab = 60;

ART.observatory = (c, tier, seed) => {
  pad(c, 0, 0, 1, 1, 'paving', seed);
  const domes = tier === 2 ? [[0.35, 0.4, 0.22], [0.72, 0.7, 0.16]] : [[0.5, 0.5, tier === 0 ? 0.22 : 0.27]];
  for (const [u, v, r] of domes) {
    cylinder(c, u, v, r, 0, 14, M.white);
    windowOn(c, 'L', v + r * 0.7, u - 0.06, 5, 0.1, 5);
    dome(c, u, v, r, 14, { col: '#c9cfd8', tex: 'metal' });
  }
  if (tier === 2) {
    box(c, 0.6, 0.15, 0.9, 0.42, 0, 10, M.stone, null, seed);
    flatRoof(c, 0.6, 0.15, 0.9, 0.42, 10, { col: '#cfc6b6' });
  }
};
ANIM.observatory = (c, tier, t) => {
  const domes = tier === 2 ? [[0.35, 0.4, 0.22], [0.72, 0.7, 0.16]] : [[0.5, 0.5, tier === 0 ? 0.22 : 0.27]];
  domes.forEach(([u, v, r], i) => {
    const [x, y] = P(u, v, 14);
    const rr = r * 32;
    const a = Math.sin(t * 0.15 + i) * 0.8;
    // slit + telescope
    c.save();
    c.translate(x, y - rr * 0.6);
    c.rotate(a * 0.4);
    c.fillStyle = '#2b2a3a';
    c.fillRect(-1.6, -rr * 0.45, 3.2, rr * 0.8);
    c.fillStyle = C.brass;
    c.fillRect(-1, -rr * 0.6, 2, 8);
    c.restore();
  });
};
TOP.observatory = 60;

ART.university = (c, tier, seed) => {
  // 2x2 quad
  pad(c, 0, 0, 2, 2, 'grass', seed);
  const paths = [P(0.9, 0), P(1.1, 0), P(1.1, 2), P(0.9, 2)];
  poly(c, paths);
  c.fillStyle = '#e3cfa6';
  c.fill();
  groundShadow(c, 0.1, 0.1, 1.9, 0.6, 0.2);
  const H = tier === 0 ? 18 : 22;
  const wall = M.stone;
  box(c, 0.1, 0.1, 1.9, 0.6, 0, H, wall, null, seed);
  windowRow(c, 'L', 0.6, 0.1, 1.9, 5, 8, 0.1, 9, { arch: true });
  windowRow(c, 'R', 1.9, 0.1, 0.6, 5, 2, 0.1, 9, { arch: true });
  gable(c, 0.1, 0.1, 1.9, 0.6, H, 11, 'u', M.slate, wall, 0.05, seed);
  // side wing
  box(c, 0.1, 0.6, 0.6, 1.9, 0, H - 4, wall, null, seed + 1);
  windowRow(c, 'L', 1.9, 0.1, 0.6, 5, 2, 0.1, 8, { arch: true });
  windowRow(c, 'R', 0.6, 0.6, 1.9, 5, 5, 0.1, 8, { arch: true });
  gable(c, 0.1, 0.6, 0.6, 1.9, H - 4, 10, 'v', M.slate, wall, 0.05, seed);
  tree(c, 1.4, 1.2, 1.1, 'round', seed);
  tree(c, 1.6, 1.7, 0.9, 'round', seed + 1);
  if (tier >= 1) {
    // spires
    for (const [u, v] of [[0.35, 0.35], [1.65, 0.35]] as [number, number][]) {
      box(c, u - 0.1, v - 0.1, u + 0.1, v + 0.1, H, H + 16, wall, null);
      cone(c, u, v, 0.14, H + 16, H + 34, M.slate);
    }
  }
  if (tier === 2) {
    // clock spire centre
    box(c, 0.88, 0.22, 1.12, 0.46, H, H + 30, wall, null);
    const [x, y] = P(1.12, 0.34, H + 24);
    c.fillStyle = '#fbf6ec';
    c.beginPath();
    c.ellipse(x - 2, y, 3.2, 4, 0, 0, 7);
    c.fill();
    c.strokeStyle = '#3d3a46';
    c.lineWidth = 0.6;
    c.stroke();
    cone(c, 1.0, 0.34, 0.17, H + 30, H + 54, { col: C.copperV, tex: 'shingle' });
  }
};
TOP.university = 110;

ART.aerolab = (c, tier, seed) => {
  pad(c, 0, 0, 1, 1, 'paving', seed);
  // tunnel tube along u
  const r = tier === 0 ? 0.16 : 0.2;
  for (let i = 0; i < 5; i++) {
    const u = 0.15 + i * 0.16;
    cylinder(c, u, 0.5, r, 0, 2, M.ironM);
  }
  // long tube as boxes w/ round caps
  box(c, 0.12, 0.38, 0.88, 0.62, 2, 16, tier === 2 ? { col: '#dfe6ee', tex: 'metal' } : M.metal, null, seed);
  cylinder(c, 0.88, 0.5, 0.17, 2, 16, { col: '#9aa3ad', tex: 'metal' }, '#3d3a46');
  if (tier >= 1) {
    box(c, 0.2, 0.7, 0.55, 0.95, 0, 12, M.white, null, seed);
    windowRow(c, 'L', 0.95, 0.2, 0.55, 4, 2, 0.1, 6);
    flatRoof(c, 0.2, 0.7, 0.55, 0.95, 12, { col: '#cfc6b6' });
  }
  if (tier === 2) {
    cylinder(c, 0.5, 0.2, 0.08, 0, 30, M.white);
    dome(c, 0.5, 0.2, 0.08, 30, { col: '#e8735a' });
  }
};
ANIM.aerolab = (c, tier, t, k) => {
  // fan
  const [x, y] = P(0.88, 0.5, 9);
  const a = t * (3 + k * 10);
  c.strokeStyle = '#2b2a3a';
  c.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a + i * 1.57) * 4, y + Math.sin(a + i * 1.57) * 6);
    c.stroke();
  }
  // smoke wand streamlines exiting the far end
  for (let i = 0; i < 4; i++) {
    const p = (t * 0.6 + i / 4) % 1;
    const [sx, sy] = P(0.12 - p * 0.3, 0.45 + i * 0.03, 8 + Math.sin(p * 6 + i) * 2);
    c.fillStyle = `rgba(255,255,255,${(1 - p) * 0.6})`;
    c.fillRect(sx, sy, 3, 0.8);
  }
  void tier;
};
TOP.aerolab = 60;

// =============== GECKO SANCTUARY ===============
function gecko(c: Ctx, x: number, y: number, s: number, col = '#e0913a', a = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(0, 0, 3.4 * s, 1.5 * s, 0, 0, 7);
  c.fill();
  c.beginPath();
  c.ellipse(3.8 * s, -0.2 * s, 1.6 * s, 1.2 * s, 0, 0, 7);
  c.fill();
  c.strokeStyle = col;
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(-3 * s, 0);
  c.quadraticCurveTo(-6 * s, 2 * s, -7 * s, -1 * s);
  c.moveTo(-1.5 * s, 0);
  c.lineTo(-2.5 * s, 2 * s);
  c.moveTo(1.5 * s, 0);
  c.lineTo(2.5 * s, 2 * s);
  c.moveTo(-1.5 * s, 0);
  c.lineTo(-2.5 * s, -2 * s);
  c.moveTo(1.5 * s, 0);
  c.lineTo(2.5 * s, -2 * s);
  c.stroke();
  // crest
  c.fillStyle = shade(col, 1.25);
  for (let i = 0; i < 4; i++) c.fillRect(-2 * s + i * 1.6 * s, -1.8 * s, 0.6 * s, 0.6 * s);
  c.fillStyle = '#2b2a3a';
  c.beginPath();
  c.arc(4.4 * s, -0.6 * s, 0.4 * s, 0, 7);
  c.fill();
  c.restore();
}

ART.terrarium = (c, tier, seed) => {
  // 2x2
  pad(c, 0, 0, 2, 2, 'grass', seed);
  for (let i = 0; i < 6; i++) tree(c, 0.15 + hash(seed, i) * 1.7, 1.7 + hash(seed, i, 1) * 0.25, 0.7, 'fern', seed + i);
  cylinder(c, 1, 1, 0.75, 0, 4, M.stone, '#6a5a48');
  // plants inside
  for (let i = 0; i < 7; i++) tree(c, 0.6 + hash(seed, i, 3) * 0.8, 0.6 + hash(seed, i, 4) * 0.8, 0.8, i % 2 ? 'fern' : 'palm', seed + i);
  dome(c, 1, 1, 0.74, 4, { col: tier === 2 ? '#b8f0e0' : '#cdeef0', tex: 'glass' }, tier === 0 ? 0.75 : 1);
  if (tier >= 1) {
    // vines
    const [x, y] = P(1, 1, 4);
    c.strokeStyle = '#4f9d55';
    c.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(x - 30 + i * 14, y + 4);
      c.quadraticCurveTo(x - 26 + i * 14, y - 18, x - 18 + i * 10, y - 30);
      c.stroke();
    }
  }
  if (tier === 2) {
    const [x, y] = P(1, 1, 30);
    lampGlow(env.L, x, y, 40, 0.5, '120,255,200');
  }
  door(c, 'L', 1.74, 0.9, 0.16, 9, '#5f9a6b', { arch: true });
};
ANIM.terrarium = (c, tier, t) => {
  for (let i = 0; i < 3 + tier; i++) {
    const a = t * 0.2 + i * 2;
    const [x, y] = P(1 + Math.cos(a) * 0.35, 1 + Math.sin(a) * 0.35, 10 + i * 4);
    gecko(c, x, y, 0.9, ['#e0913a', '#c9824a', '#f2c46d', '#8a5634'][i % 4], a + 1.6);
  }
  // mist
  const [mx, my] = P(1, 1, 8);
  for (let i = 0; i < 6; i++) {
    const p = (t * 0.1 + i / 6) % 1;
    c.fillStyle = `rgba(255,255,255,${0.18 * Math.sin(p * Math.PI)})`;
    c.beginPath();
    c.ellipse(mx + (i - 3) * 9, my - p * 20, 9, 4, 0, 0, 7);
    c.fill();
  }
  if (tier === 2) for (let i = 0; i < 8; i++) {
    const [fx, fy] = P(0.6 + hash(i) * 0.8, 0.6 + hash(i, 2) * 0.8, 10 + hash(i, 3) * 30);
    glow(c, fx, fy + Math.sin(t + i) * 2, 3, '160,255,200', 0.6 + 0.4 * Math.sin(t * 2 + i));
  }
};
TOP.terrarium = 100;

ART.nursery = (c, tier, seed) => {
  pad(c, 0, 0, 1, 1, 'grass', seed);
  for (let i = 0; i < 3; i++) tree(c, 0.1 + i * 0.4, 0.92, 0.6, 'fern', seed + i);
  const H = tier === 2 ? 18 : 12;
  box(c, 0.18, 0.2, 0.82, 0.74, 0, H, tier === 0 ? M.log : paint('#9fd8b4', 'plank', 0.5), null, seed);
  windowOn(c, 'L', 0.74, 0.25, 2.5, 0.28, 7, { frame: '#fff' });
  door(c, 'L', 0.74, 0.62, 0.12, 9, '#5f9a6b');
  windowRow(c, 'R', 0.82, 0.2, 0.74, 3, 2, 0.16, 6);
  if (tier === 2) windowRow(c, 'L', 0.74, 0.18, 0.82, 11, 3, 0.12, 5);
  gable(c, 0.18, 0.2, 0.82, 0.74, H, 10, 'u', M.thatch, M.log, 0.06, seed);
  // egg sign
  const [x, y] = P(0.5, 0.74, H + 5);
  c.fillStyle = '#fff6e0';
  c.beginPath();
  c.ellipse(x, y, 3, 4, 0, 0, 7);
  c.fill();
  c.strokeStyle = '#c9824a';
  c.lineWidth = 0.7;
  c.stroke();
};
ANIM.nursery = (c, tier, t) => {
  const [x, y] = P(0.4, 0.76, 4.5);
  for (let i = 0; i < 1 + tier; i++) gecko(c, x + i * 5 + Math.sin(t * 0.5 + i) * 2, y + i, 0.55, '#f2c46d', Math.sin(t + i) * 0.3);
};
TOP.nursery = 45;

ART.ferngarden = (c, tier, seed) => {
  pad(c, 0, 0, 1, 1, 'grass', seed);
  if (tier >= 1) {
    for (let i = 0; i < 6; i++) {
      const [x, y] = P(0.15 + i * 0.14, 0.2 + i * 0.13);
      c.fillStyle = '#b8b2a6';
      c.beginPath();
      c.ellipse(x, y, 4, 2, 0, 0, 7);
      c.fill();
      c.fillStyle = '#7fae6a';
      c.beginPath();
      c.ellipse(x - 1, y - 0.6, 2.4, 1, 0, 0, 7);
      c.fill();
    }
  }
  const n = tier === 0 ? 5 : 8;
  for (let i = 0; i < n; i++) tree(c, 0.12 + hash(seed, i) * 0.76, 0.12 + hash(seed, i, 1) * 0.76, 0.8 + hash(seed, i, 2) * 0.5, 'fern', seed + i);
  tree(c, 0.78, 0.25, 1.1, 'palm', seed);
};
ANIM.ferngarden = (c, tier, t) => {
  if (tier === 2)
    for (let i = 0; i < 10; i++) {
      const [x, y] = P(0.1 + hash(i, 7) * 0.8, 0.1 + hash(i, 8) * 0.8, 3 + hash(i, 9) * 14);
      glow(c, x + Math.sin(t * 0.7 + i) * 3, y + Math.cos(t * 0.5 + i) * 2, 3, '170,255,140', 0.5 + 0.5 * Math.sin(t * 2 + i * 1.7));
    }
};
TOP.ferngarden = 45;

ART.grotto = (c, tier, seed) => {
  pad(c, 0, 0, 1, 1, 'grass', seed);
  // cliff rock
  const rock = { col: '#8f8a80', tex: 'stone' as const };
  const H = tier === 0 ? 10 : tier === 1 ? 26 : 34;
  box(c, 0.1, 0.1, 0.45, 0.9, 0, H, rock, { col: '#6fae6a' }, seed);
  // pool
  const [x, y] = P(0.68, 0.55);
  c.fillStyle = env.season === 'winter' ? '#d2e8f4' : '#4fa3c9';
  c.beginPath();
  c.ellipse(x, y, 16, 7.5, 0, 0, 7);
  c.fill();
  c.strokeStyle = '#8f8a80';
  c.lineWidth = 2;
  c.stroke();
  for (let i = 0; i < 4; i++) tree(c, 0.85 + (i % 2) * 0.1, 0.15 + i * 0.22, 0.7, 'fern', seed + i);
  tree(c, 0.2, 0.92, 0.9, 'palm', seed);
};
ANIM.grotto = (c, tier, t) => {
  if (tier === 0 || env.season === 'winter') return;
  const H = tier === 1 ? 26 : 34;
  const [x0, y0] = P(0.45, 0.5, H);
  const [, y1] = P(0.55, 0.55, 0);
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, 'rgba(200,240,255,0.95)');
  g.addColorStop(1, 'rgba(160,220,255,0.6)');
  c.fillStyle = g;
  c.fillRect(x0 - 3, y0, 6, y1 - y0);
  c.strokeStyle = 'rgba(255,255,255,0.8)';
  c.lineWidth = 0.6;
  for (let i = 0; i < 3; i++) {
    const p = (t * 1.5 + i / 3) % 1;
    c.beginPath();
    c.moveTo(x0 - 2 + i * 2, y0 + p * (y1 - y0));
    c.lineTo(x0 - 2 + i * 2, y0 + p * (y1 - y0) + 4);
    c.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const p = (t + i / 6) % 1;
    c.fillStyle = `rgba(255,255,255,${1 - p})`;
    c.beginPath();
    c.arc(x0 + Math.cos(i) * p * 7, y1 - p * 4, 1, 0, 7);
    c.fill();
  }
  if (tier === 2) {
    c.save();
    c.globalAlpha = 0.35;
    const cols = ['#ff6b6b', '#ffd166', '#6ee78c', '#4fd1e8', '#b38cff'];
    cols.forEach((col, i) => {
      c.strokeStyle = col;
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(x0 + 6, y1 + 2, 14 - i * 1.3, Math.PI * 1.1, Math.PI * 1.9);
      c.stroke();
    });
    c.restore();
  }
};
TOP.grotto = 60;

ART.cricketfarm = (c, tier, seed) => {
  pad(c, 0, 0, 1, 1, 'dirt', seed);
  const n = tier === 0 ? 4 : 6;
  for (let i = 0; i < n; i++) {
    const u = 0.15 + (i % 3) * 0.26, v = 0.2 + Math.floor(i / 3) * 0.3;
    box(c, u, v, u + 0.2, v + 0.2, 0, 6, M.plank, { col: '#c9a27a' });
    c.fillStyle = 'rgba(40,30,30,0.5)';
    const [x, y] = P(u + 0.1, v + 0.2, 3);
    c.fillRect(x - 3, y - 1, 6, 0.6);
  }
  if (tier >= 1) {
    box(c, 0.55, 0.7, 0.92, 0.95, 0, 11, tier === 2 ? paint('#f2c46d', 'stucco') : M.log, null, seed);
    windowOn(c, 'L', 0.95, 0.62, 3, 0.12, 5);
    gable(c, 0.55, 0.7, 0.92, 0.95, 11, 6, 'u', M.tileRed, M.log, 0.04);
    if (tier === 2) {
      const [x, y] = P(0.73, 0.95, 16);
      c.fillStyle = '#e0913a';
      c.font = 'bold 5px sans-serif';
      c.fillText('🦎', x - 3, y);
    }
  }
};
ANIM.cricketfarm = (c, tier, t) => {
  for (let i = 0; i < 6; i++) {
    const hop = Math.max(0, Math.sin(t * 3 + i * 1.3));
    const [x, y] = P(0.1 + hash(i, 1) * 0.8, 0.85 + hash(i, 2) * 0.1, hop * 4);
    c.fillStyle = '#5a4a2a';
    c.fillRect(x, y, 1.6, 0.8);
  }
  void tier;
};
TOP.cricketfarm = 40;

// =============== SKY DOCK ===============
function cloudBase(c: Ctx, u0: number, v0: number, u1: number, v1: number) {
  const [x, y] = P((u0 + u1) / 2, (v0 + v1) / 2);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const g = c.createRadialGradient(x + Math.cos(a) * 14, y + Math.sin(a) * 6 + 2, 1, x + Math.cos(a) * 14, y + Math.sin(a) * 6 + 2, 12);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, 'rgba(225,235,250,0.0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(x + Math.cos(a) * 14, y + Math.sin(a) * 6 + 2, 12, 0, 7);
    c.fill();
  }
}

ART.mooring = (c, tier, seed) => {
  cloudBase(c, 0, 0, 1, 1);
  pad(c, 0.2, 0.2, 0.8, 0.8, 'plank', seed);
  const H = tier === 0 ? 46 : 58;
  const [bx, by] = P(0.5, 0.5, 0);
  const top = by - H;
  c.strokeStyle = '#5c5f6b';
  c.lineWidth = 1;
  c.beginPath();
  for (const s of [-1, 1]) {
    c.moveTo(bx + s * 8, by);
    c.lineTo(bx + s * 2, top);
  }
  for (let i = 0; i < 10; i++) {
    const t0 = i / 10, t1 = (i + 1) / 10;
    const y0 = by + (top - by) * t0, y1 = by + (top - by) * t1;
    const w0 = 8 + (2 - 8) * t0, w1 = 8 + (2 - 8) * t1;
    c.moveTo(bx - w0, y0);
    c.lineTo(bx + w1, y1);
  }
  c.stroke();
  cylinder(c, 0.5, 0.5, 0.06, H, H + 4, { col: C.brass }, '#d9a441');
  if (tier === 2) {
    const [x2] = P(0.2, 0.8);
    c.strokeStyle = '#5c5f6b';
    c.beginPath();
    c.moveTo(x2, by + 8);
    c.lineTo(x2, by - 40);
    c.stroke();
  }
};
function blimp(c: Ctx, x: number, y: number, s: number, col: string) {
  const g = c.createLinearGradient(0, y - 8 * s, 0, y + 8 * s);
  g.addColorStop(0, shade(col, 1.2));
  g.addColorStop(1, shade(col, 0.7));
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(x, y, 20 * s, 7 * s, 0, 0, 7);
  c.fill();
  c.strokeStyle = 'rgba(58,47,61,0.5)';
  c.lineWidth = 0.8;
  c.stroke();
  c.fillStyle = shade(col, 0.8);
  c.beginPath();
  c.moveTo(x + 16 * s, y);
  c.lineTo(x + 24 * s, y - 6 * s);
  c.lineTo(x + 24 * s, y + 6 * s);
  c.fill();
  c.fillStyle = '#6b4a33';
  c.fillRect(x - 5 * s, y + 7 * s, 10 * s, 3 * s);
}
ANIM.mooring = (c, tier, t) => {
  if (tier >= 1) {
    const H = 58;
    const [x, y] = P(0.5, 0.5, H - 4);
    blimp(c, x - 22 + Math.sin(t * 0.3) * 2, y + bob(t, 1, 1.5), 0.9, '#e8735a');
  }
  if (tier === 2) {
    const [x, y] = P(0.2, 0.8, 44);
    blimp(c, x - 18, y + bob(t, 4, 1.5), 0.7, '#5a7fa8');
  }
};
TOP.mooring = 90;

ART.hangar = (c, tier, seed) => {
  cloudBase(c, 0, 0, 2, 2);
  cloudBase(c, 0.6, 0.6, 1.4, 1.4);
  pad(c, 0.1, 0.1, 1.9, 1.9, 'plank', seed);
  const H = 26;
  box(c, 0.25, 0.3, 1.75, 1.5, 0, 10, paint('#e9eef2', 'metal'), null, seed);
  // barrel vault approximated with stacked boxes
  for (let i = 0; i < 6; i++) {
    const t0 = i / 6, t1 = (i + 1) / 6;
    const w0 = Math.cos((t0 * Math.PI) / 2) * 0.6;
    box(c, 0.25, 0.9 - w0, 1.75, 0.9 + w0, 10 + t0 * (H - 10), 10 + t1 * (H - 10), { col: shade('#c9d3dc', 1 - i * 0.02), tex: 'metal' }, i === 5 ? undefined : null);
  }
  // big doors face
  const [dx, dy] = P(1.75, 0.9, 0);
  c.fillStyle = '#3d4658';
  c.beginPath();
  c.ellipse(dx, dy - 10, 16, 18, 0, Math.PI, 0);
  c.fill();
  if (tier >= 1) {
    const a = P(0.2, 1.7, 0), b = P(0.2, 1.7, 40), d = P(0.9, 1.7, 40);
    c.strokeStyle = '#d9a441';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(...a);
    c.lineTo(...b);
    c.lineTo(...d);
    c.stroke();
  }
  if (tier === 2) {
    for (let i = 0; i < 3; i++) cylinder(c, 0.4 + i * 0.25, 1.75, 0.07, 0, 16, M.copper, '#3d3a46');
  }
};
ANIM.hangar = (c, tier, t, k) => {
  const [x, y] = P(2.2, 1.2, 40);
  blimp(c, x + Math.sin(t * 0.25) * 6, y + bob(t, 2, 2), 1.1, tier === 2 ? '#d9a441' : '#9fd8b4');
  if (tier === 2)
    for (let i = 0; i < 3; i++) {
      const [sx, sy] = P(0.4 + i * 0.25, 1.75, 17);
      smoke(c, sx, sy, t + i, 0.4 + k * 0.5, '#ffffff', 4, 20, i);
    }
};
TOP.hangar = 90;

ART.cloudgarden = (c, tier, seed) => {
  cloudBase(c, 0, 0, 1, 1);
  const beds = tier === 0 ? 3 : 5;
  for (let i = 0; i < beds; i++) {
    const u = 0.25 + (i % 3) * 0.25, v = 0.3 + Math.floor(i / 3) * 0.35;
    const lift = tier >= 1 ? (i % 2) * 8 : 0;
    cylinder(c, u, v, 0.1, lift, lift + 4, { col: '#e9dcc3' }, '#7a5a3a');
    flowers(c, u - 0.07, v - 0.07, u + 0.07, v + 0.07, 6, ['#ff8fab', '#ffd166', '#b38cff', '#9be7ff'], seed + i);
  }
  if (tier === 2) {
    const [x, y] = P(0.5, 0.5, 6);
    c.save();
    c.globalAlpha = 0.55;
    ['#ff6b6b', '#ffd166', '#6ee78c', '#4fd1e8', '#b38cff'].forEach((col, i) => {
      c.strokeStyle = col;
      c.lineWidth = 1.6;
      c.beginPath();
      c.arc(x, y + 6, 24 - i * 1.8, Math.PI * 1.08, Math.PI * 1.92);
      c.stroke();
    });
    c.restore();
  }
};
TOP.cloudgarden = 50;

ART.lanterntower = (c, tier, seed) => {
  cloudBase(c, 0, 0, 1, 1);
  if (tier === 0) {
    cylinder(c, 0.5, 0.5, 0.04, 0, 30, { col: '#8a3b2e' });
  } else {
    const floors = tier === 1 ? 3 : 5;
    for (let i = 0; i < floors; i++) {
      const r = 0.32 - i * 0.04;
      const h0 = i * 13;
      box(c, 0.5 - r * 0.7, 0.5 - r * 0.7, 0.5 + r * 0.7, 0.5 + r * 0.7, h0, h0 + 9, paint('#c0473b', 'plank', 0.4), null, seed + i);
      hip(c, 0.5 - r, 0.5 - r, 0.5 + r, 0.5 + r, h0 + 9, 4, { col: '#2f4f4a', tex: 'tile' });
    }
  }
  const H = tier === 0 ? 30 : (tier === 1 ? 3 : 5) * 13;
  // hanging lanterns
  for (let i = 0; i < (tier + 1) * 4; i++) {
    const a = (i / ((tier + 1) * 4)) * Math.PI * 2;
    const [x, y] = P(0.5 + Math.cos(a) * 0.3, 0.5 + Math.sin(a) * 0.3, 8 + (i % 4) * (H / 5));
    c.fillStyle = '#e8735a';
    c.beginPath();
    c.ellipse(x, y, 1.6, 2.2, 0, 0, 7);
    c.fill();
    lampGlow(env.L, x, y, 7, 0.9, '255,150,90');
  }
};
ANIM.lanterntower = (c, tier, t, k) => {
  const H = tier === 0 ? 30 : (tier === 1 ? 3 : 5) * 13;
  const n = 2 + tier * 2 + Math.round(k * 3);
  for (let i = 0; i < n; i++) {
    const p = (t * 0.06 + i / n) % 1;
    const [x, y] = P(0.5, 0.5, H + p * 120);
    const xx = x + Math.sin(t * 0.5 + i * 2) * (8 + p * 20);
    c.fillStyle = `rgba(255,170,90,${(1 - p) * 0.95})`;
    c.beginPath();
    c.ellipse(xx, y, 1.8, 2.4, 0, 0, 7);
    c.fill();
    glow(c, xx, y, 6, '255,170,90', (1 - p) * 0.5);
  }
};
TOP.lanterntower = 90;

ART.balloonport = (c, tier, seed) => {
  cloudBase(c, 0, 0, 1, 1);
  pad(c, 0.15, 0.15, 0.85, 0.85, 'grass', seed);
  box(c, 0.65, 0.65, 0.9, 0.9, 0, 9, M.plank, null, seed);
  gable(c, 0.65, 0.65, 0.9, 0.9, 9, 5, 'u', { col: '#e8735a', tex: 'vplank' }, M.plank, 0.03);
};
ANIM.balloonport = (c, tier, t) => {
  const n = tier + 1;
  const cols = [['#e8735a', '#f5d478'], ['#5a7fa8', '#fbf6ec'], ['#5f9a6b', '#f5d478']];
  for (let i = 0; i < n; i++) {
    const u = 0.3 + i * 0.2, v = 0.4 + (i % 2) * 0.2;
    const lift = 18 + i * 10 + Math.sin(t * 0.4 + i * 2) * 4;
    const [x, y] = P(u, v, lift);
    const [gx, gy] = P(u, v, 0);
    c.strokeStyle = 'rgba(80,60,50,0.5)';
    c.lineWidth = 0.4;
    c.beginPath();
    c.moveTo(gx, gy);
    c.lineTo(x, y + 10);
    c.stroke();
    // envelope with stripes
    const [a, b] = cols[i % 3];
    for (let s = 0; s < 6; s++) {
      c.fillStyle = s % 2 ? a : b;
      c.beginPath();
      c.moveTo(x, y + 6);
      c.ellipse(x, y - 2, 8 - Math.abs(s - 2.5) * 0.1, 9, 0, Math.PI + (s / 6) * Math.PI, Math.PI + ((s + 1) / 6) * Math.PI);
      c.closePath();
      c.fill();
    }
    c.fillStyle = a;
    c.beginPath();
    c.ellipse(x, y - 2, 8, 9, 0, 0, Math.PI);
    c.lineTo(x + 2, y + 6);
    c.lineTo(x - 2, y + 6);
    c.fill();
    c.fillStyle = '#8a5634';
    c.fillRect(x - 2, y + 8, 4, 3);
    glow(c, x, y + 7, 4, '255,180,90', 0.5 + 0.3 * Math.sin(t * 8 + i));
  }
};
TOP.balloonport = 60;

// =============== DECOR ===============
ART.lamppost = (c, tier) => {
  streetLamp(c, 0.5, 0.5, 14);
  if (tier >= 1) streetLamp(c, 0.62, 0.38, 14);
  if (tier >= 2) {
    const [x, y] = P(0.5, 0.5, 9);
    c.fillStyle = '#7a5a3a';
    c.fillRect(x - 3, y - 1, 6, 2.5);
    c.fillStyle = '#ff8fab';
    c.beginPath();
    c.arc(x - 1.5, y - 1.2, 1.2, 0, 7);
    c.arc(x + 1.5, y - 1.2, 1.2, 0, 7);
    c.fill();
  }
};
TOP.lamppost = 30;

ART.statue = (c, tier) => {
  box(c, 0.3, 0.3, 0.7, 0.7, 0, 8, M.stone, null);
  if (tier === 0) return;
  const col = tier === 2 ? '#e8b84a' : '#9a6b3c';
  const [x, y] = P(0.5, 0.5, 8);
  // bike
  c.strokeStyle = shade(col, 0.8);
  c.lineWidth = 1.1;
  c.beginPath();
  c.arc(x - 5, y - 3, 3.2, 0, 7);
  c.arc(x + 5, y - 3, 3.2, 0, 7);
  c.moveTo(x - 5, y - 3);
  c.lineTo(x - 1, y - 9);
  c.lineTo(x + 5, y - 3);
  c.moveTo(x - 1, y - 9);
  c.lineTo(x + 4, y - 9);
  c.stroke();
  // rider
  c.fillStyle = col;
  c.beginPath();
  c.ellipse(x + 0.5, y - 12, 4.5, 2.2, -0.5, 0, 7);
  c.fill();
  c.beginPath();
  c.arc(x + 4.5, y - 15, 1.8, 0, 7);
  c.fill();
  if (tier === 2) {
    c.strokeStyle = '#5f9a6b';
    c.lineWidth = 0.8;
    c.beginPath();
    c.arc(x + 4.5, y - 15, 2.6, Math.PI, 0);
    c.stroke();
  }
};
TOP.statue = 40;

ART.flowerbed = (c, tier, seed) => {
  const cols = env.season === 'spring' ? ['#ff8fab', '#ffffff', '#ffd166'] : env.season === 'autumn' ? ['#e0913a', '#d9483b', '#f5d478'] : ['#ff6b6b', '#ffd166', '#b38cff'];
  if (tier >= 1) box(c, 0.2, 0.2, 0.8, 0.8, 0, 3, M.plank, { col: '#7a5a3a' });
  flowers(c, 0.25, 0.25, 0.75, 0.75, 14 + tier * 6, cols, seed);
  if (tier >= 2) {
    bush(c, 0.3, 0.3, 0.7, '#4f9d55');
    bush(c, 0.7, 0.7, 0.7, '#4f9d55');
  }
};
TOP.flowerbed = 30;

ART.lightningrod = (c, tier) => {
  box(c, 0.4, 0.4, 0.6, 0.6, 0, 3, M.stone, null);
  const H = 18 + tier * 8;
  cylinder(c, 0.5, 0.5, 0.02, 3, H, M.copper);
  const [x, y] = P(0.5, 0.5, H);
  c.fillStyle = C.copper;
  c.beginPath();
  c.moveTo(x, y - 5);
  c.lineTo(x - 1.5, y);
  c.lineTo(x + 1.5, y);
  c.fill();
  if (tier >= 1) {
    c.strokeStyle = C.copper;
    c.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.ellipse(x, y + 4 + i * 2, 2.5, 0.8, 0, 0, 7);
      c.stroke();
    }
  }
};
ANIM.lightningrod = (c, tier, t, k) => {
  const H = 18 + tier * 8;
  const [x, y] = P(0.5, 0.5, H);
  glow(c, x, y - 4, 6 + k * 6, '170,220,255', 0.15 + k * 0.3);
};
TOP.lightningrod = 50;

ART.arch = (c, tier) => {
  const col = '#c9a27a';
  for (const u of [0.15, 0.85]) cylinder(c, u, 0.5, 0.03, 0, 20, { col: '#fbf6ec' });
  const a = P(0.15, 0.5, 20), b = P(0.85, 0.5, 20);
  c.strokeStyle = col;
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(...a);
  c.quadraticCurveTo((a[0] + b[0]) / 2, a[1] - 10, ...b);
  c.stroke();
  for (let i = 0; i < 9; i++) {
    const tt = (i + 0.5) / 9;
    const x = a[0] + (b[0] - a[0]) * tt, y = a[1] + (b[1] - a[1]) * tt - Math.sin(tt * Math.PI) * 5;
    c.fillStyle = ['#e8735a', '#f5d478', '#5a7fa8', '#9fd8b4'][i % 4];
    if (tier === 0) {
      c.beginPath();
      c.moveTo(x - 1.5, y);
      c.lineTo(x + 1.5, y);
      c.lineTo(x, y + 3);
      c.fill();
    } else {
      c.beginPath();
      c.ellipse(x, y + 2, 1.4, 1.9, 0, 0, 7);
      c.fill();
      lampGlow(env.L, x, y + 2, 6, 0.85, '255,170,90');
    }
  }
};
ANIM.arch = (c, tier, t) => {
  if (tier >= 2 && Math.sin(t * 0.7) > 0.6) {
    const [x, y] = P(0.5, 0.5, 40 + ((t * 30) % 20));
    for (let i = 0; i < 8; i++) {
      c.fillStyle = ['#ffd166', '#ff6b6b', '#9be7ff'][i % 3];
      c.fillRect(x + Math.cos(i * 0.785) * 6, y + Math.sin(i * 0.785) * 6, 1.2, 1.2);
    }
  }
};
TOP.arch = 40;

ART.tree = (c, tier, seed) => {
  const kind = hash(seed) < 0.3 ? 'pine' : 'round';
  tree(c, 0.5, 0.55, 0.6 + tier * 0.35, kind as any, seed);
  if (tier === 2) bush(c, 0.2, 0.75, 0.5);
};
TOP.tree = 50;

ART.crane = (c, tier) => {
  box(c, 0.35, 0.35, 0.65, 0.65, 0, 4, M.stone, null);
  const col = tier === 0 ? '#8a5634' : tier === 1 ? '#c0473b' : '#d9a441';
  const [x, y] = P(0.5, 0.5, 4);
  c.strokeStyle = col;
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x, y - 26);
  c.lineTo(x - 16, y - 18);
  c.stroke();
  if (tier === 2) {
    box(c, 0.38, 0.38, 0.62, 0.62, 4, 10, M.ironM, null);
  }
};
ANIM.crane = (c, tier, t) => {
  const [x, y] = P(0.5, 0.5, 4);
  const sw = Math.sin(t * 0.6) * 2;
  c.strokeStyle = '#3d3a46';
  c.lineWidth = 0.5;
  c.beginPath();
  c.moveTo(x - 16, y - 18);
  c.lineTo(x - 16 + sw, y - 8);
  c.stroke();
  c.fillStyle = '#5a7fa8';
  c.fillRect(x - 19 + sw, y - 8, 6, 4);
  void tier;
};
TOP.crane = 40;

ART.geckostatue = (c, tier) => {
  const hedge = env.season === 'autumn' ? '#7f9a4a' : '#4f8f4c';
  const [x, y] = P(0.5, 0.5);
  c.fillStyle = 'rgba(40,30,60,0.18)';
  c.beginPath();
  c.ellipse(x + 2, y, 12, 4, 0, 0, 7);
  c.fill();
  const s = 1.6 + tier * 0.5;
  c.save();
  c.translate(x, y - 6 * s * 0.6);
  for (const [dx, dy, r] of [[0, 0, 3.5], [4.5, -0.6, 2.4], [-5, 1, 2], [-8, -1, 1.4]] as [number, number, number][]) {
    const g = c.createRadialGradient((dx - r * 0.3) * s, (dy - r * 0.4) * s, 0.3, dx * s, dy * s, r * s * 1.1);
    g.addColorStop(0, shade(hedge, 1.25));
    g.addColorStop(1, shade(hedge, 0.75));
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(dx * s, dy * s, r * s, r * s * 0.8, 0, 0, 7);
    c.fill();
  }
  c.fillStyle = '#2b2a3a';
  c.beginPath();
  c.arc(5.4 * s, -1.2 * s, 0.4 * s, 0, 7);
  c.fill();
  c.restore();
  if (tier === 2)
    for (let i = 0; i < 6; i++) {
      const lx = x - 10 + i * 4, ly = y - 8 - Math.sin(i) * 3;
      c.fillStyle = '#fff3c4';
      c.fillRect(lx, ly, 1, 1);
      lampGlow(env.L, lx, ly, 4, 0.9);
    }
};
TOP.geckostatue = 40;

export { gecko, boat, blimp, mix, rgba, flatRoof, windowOn, flagPole, fence };
