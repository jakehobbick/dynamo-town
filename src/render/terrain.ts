// Terrain: each 8×8 plot is pre-rendered into a cached canvas (per zoom bucket and season).
import { hash } from '../core/util';
import type { Terrain } from '../core/types';
import { N, PLOT, PLOTS, districtAt } from '../sim/map';
import { getWorld } from '../sim/town';
import { TH, TW } from './iso';
import { mix, rgba, shade } from './prims';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

const GRASS: Record<Season, string> = { spring: '#94d36e', summer: '#8cc965', autumn: '#b5bf62', winter: '#e9eff5' };
const DISTRICT_TINT: Record<string, [string, number]> = {
  residential: ['#9fd36a', 0],
  farms: ['#c9cf5e', 0.25],
  industry: ['#a8b08a', 0.35],
  harbor: ['#9cd27a', 0.1],
  campus: ['#7fcf7a', 0.25],
  gecko: ['#4f9f5a', 0.55],
  sky: ['#ffffff', 0],
};

const CLIFF = 12;
interface Chunk {
  cv: HTMLCanvasElement;
  ox: number; // iso px of canvas origin
  oy: number;
  s: number;
  key: string;
}
const cache = new Map<number, Chunk>();
export function clearTerrain() {
  cache.clear();
}

const isLand = (t: Terrain) => t !== 'water' && t !== 'void';
function tAt(x: number, y: number): Terrain {
  if (x < 0 || y < 0 || x >= N || y >= N) return 'water';
  return getWorld().terrain[y * N + x];
}

function tileColor(t: Terrain, x: number, y: number, season: Season) {
  const w = getWorld();
  const sh = w.shade[y * N + x];
  const d = districtAt(x, y);
  if (t === 'sand') return shade(season === 'winter' ? '#e8e4dc' : '#ecd9a6', 0.95 + sh * 0.1);
  if (t === 'cloud') return shade('#f6f9ff', 0.97 + sh * 0.05);
  let g = GRASS[season];
  if (t === 'jungle') g = season === 'winter' ? '#7fa58a' : '#4f9f5a';
  else {
    const [tc, k] = DISTRICT_TINT[d] || ['#9fd36a', 0];
    if (season !== 'winter') g = mix(g, tc, k);
  }
  const n = w.height[y * N + x];
  return shade(g, 0.92 + sh * 0.06 + n * 0.1);
}

function diamond(c: CanvasRenderingContext2D, x: number, y: number) {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + TW / 2, y + TH / 2);
  c.lineTo(x, y + TH);
  c.lineTo(x - TW / 2, y + TH / 2);
  c.closePath();
}

function renderChunk(p: number, s: number, season: Season): Chunk {
  const px = p % PLOTS, py = Math.floor(p / PLOTS);
  const x0 = px * PLOT, y0 = py * PLOT;
  // iso bbox of the plot
  const ox = (x0 - (y0 + PLOT)) * (TW / 2);
  const oy = (x0 + y0) * (TH / 2);
  const w = PLOT * TW, h = PLOT * TH + CLIFF + 6;
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w * s);
  cv.height = Math.ceil(h * s);
  const c = cv.getContext('2d')!;
  c.setTransform(s, 0, 0, s, -ox * s, -oy * s);
  // painter's order within chunk
  for (let sum = 0; sum < PLOT * 2 - 1; sum++)
    for (let dx = 0; dx < PLOT; dx++) {
      const dy = sum - dx;
      if (dy < 0 || dy >= PLOT) continue;
      const x = x0 + dx, y = y0 + dy;
      drawTile(c, x, y, season);
    }
  return { cv, ox, oy, s, key: '' };
}

function drawTile(c: CanvasRenderingContext2D, x: number, y: number, season: Season) {
  const t = tAt(x, y);
  const sx = (x - y) * (TW / 2), sy = (x + y) * (TH / 2);
  if (!isLand(t)) {
    // shoreline foam on water next to land
    if (t === 'water') {
      const nb = [tAt(x - 1, y), tAt(x, y - 1)];
      if (isLand(nb[0]) || isLand(nb[1])) {
        c.strokeStyle = 'rgba(255,255,255,0.55)';
        c.lineWidth = 1.4;
        c.beginPath();
        if (isLand(nb[0]) && tAt(x - 1, y) !== 'cloud') {
          c.moveTo(sx - TW / 2 + 2, sy + TH / 2 + CLIFF + 1);
          c.lineTo(sx + 2, sy + CLIFF + 1);
        }
        if (isLand(nb[1]) && tAt(x, y - 1) !== 'cloud') {
          c.moveTo(sx - 2, sy + CLIFF + 1);
          c.lineTo(sx + TW / 2 - 2, sy + TH / 2 + CLIFF + 1);
        }
        c.stroke();
      }
    }
    return;
  }
  const col = tileColor(t, x, y, season);
  if (t === 'cloud') {
    // puffy cloud tile with soft underside
    c.fillStyle = 'rgba(70,110,160,0.18)';
    c.beginPath();
    c.ellipse(sx + 6, sy + TH / 2 + 14, TW * 0.42, TH * 0.4, 0, 0, 7);
    c.fill();
    const g = c.createLinearGradient(0, sy, 0, sy + TH + 8);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#d9e6f6');
    c.fillStyle = g;
    diamond(c, sx, sy);
    c.fill();
    for (let i = 0; i < 4; i++) {
      const a = hash(x, y, i) * Math.PI * 2;
      c.beginPath();
      c.arc(sx + Math.cos(a) * 14, sy + TH / 2 + Math.sin(a) * 6 + 3, 7 + hash(x, y, i + 5) * 5, 0, 7);
      c.fillStyle = i % 2 ? '#ffffff' : '#eef4fc';
      c.fill();
    }
    return;
  }
  // cliff faces where the neighbour in front is water/void
  const right = tAt(x + 1, y), left = tAt(x, y + 1);
  const dirt = season === 'winter' ? '#b9a48e' : '#b0835a';
  if (!isLand(right) || right === 'cloud') {
    c.beginPath();
    c.moveTo(sx + TW / 2, sy + TH / 2);
    c.lineTo(sx, sy + TH);
    c.lineTo(sx, sy + TH + CLIFF);
    c.lineTo(sx + TW / 2, sy + TH / 2 + CLIFF);
    c.closePath();
    c.fillStyle = shade(dirt, 0.72);
    c.fill();
    c.strokeStyle = rgba('#5a3d29', 0.25);
    c.lineWidth = 0.6;
    for (let i = 1; i < 3; i++) {
      c.beginPath();
      c.moveTo(sx + TW / 2, sy + TH / 2 + i * 4);
      c.lineTo(sx, sy + TH + i * 4);
      c.stroke();
    }
  }
  if (!isLand(left) || left === 'cloud') {
    c.beginPath();
    c.moveTo(sx - TW / 2, sy + TH / 2);
    c.lineTo(sx, sy + TH);
    c.lineTo(sx, sy + TH + CLIFF);
    c.lineTo(sx - TW / 2, sy + TH / 2 + CLIFF);
    c.closePath();
    c.fillStyle = shade(dirt, 0.9);
    c.fill();
    c.strokeStyle = rgba('#5a3d29', 0.25);
    c.lineWidth = 0.6;
    for (let i = 1; i < 3; i++) {
      c.beginPath();
      c.moveTo(sx - TW / 2, sy + TH / 2 + i * 4);
      c.lineTo(sx, sy + TH + i * 4);
      c.stroke();
    }
  }
  diamond(c, sx, sy);
  const g = c.createLinearGradient(sx - TW / 2, sy, sx + TW / 2, sy + TH);
  g.addColorStop(0, shade(col, 1.04));
  g.addColorStop(1, shade(col, 0.96));
  c.fillStyle = g;
  c.fill();
  // subtle tile seam for the cozy grid look
  c.strokeStyle = rgba(shade(col, 0.7), 0.12);
  c.lineWidth = 0.6;
  c.stroke();
  // details
  const R = (i: number) => hash(x, y, i, 77);
  if (t === 'grass' || t === 'jungle') {
    const n = t === 'jungle' ? 7 : 5;
    for (let i = 0; i < n; i++) {
      const u = R(i), v = R(i + 10);
      const px = sx + (u - v) * (TW / 2) * 0.9, py = sy + (u + v) * (TH / 2) * 0.9 + 1;
      c.strokeStyle = rgba(shade(col, season === 'winter' ? 0.85 : 0.72), 0.7);
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(px, py);
      c.lineTo(px - 1, py - 2.4);
      c.moveTo(px + 1.2, py);
      c.lineTo(px + 1.8, py - 2);
      c.stroke();
    }
    if (season !== 'winter' && t === 'grass' && R(40) < 0.35) {
      const cols = season === 'autumn' ? ['#d9652e', '#e8b23c', '#c9824a'] : ['#ffffff', '#ffd166', '#ff8fab', '#b38cff'];
      for (let i = 0; i < 3; i++) {
        const u = R(i + 20), v = R(i + 30);
        c.fillStyle = cols[i % cols.length];
        c.beginPath();
        c.arc(sx + (u - v) * (TW / 2) * 0.85, sy + (u + v) * (TH / 2) * 0.85 + 1, 1, 0, 7);
        c.fill();
      }
    }
    if (t === 'jungle' && R(50) < 0.5) {
      c.fillStyle = rgba('#2f6f3e', 0.6);
      c.beginPath();
      c.ellipse(sx + (R(51) - 0.5) * 30, sy + TH / 2 + (R(52) - 0.5) * 12, 5, 2.4, 0, 0, 7);
      c.fill();
    }
    if (season === 'winter' && R(60) < 0.4) {
      c.fillStyle = 'rgba(255,255,255,0.8)';
      c.beginPath();
      c.ellipse(sx + (R(61) - 0.5) * 30, sy + TH / 2 + (R(62) - 0.5) * 12, 6, 2.2, 0, 0, 7);
      c.fill();
    }
  } else if (t === 'sand') {
    for (let i = 0; i < 6; i++) {
      const u = R(i), v = R(i + 10);
      c.fillStyle = rgba(i % 2 ? '#ffffff' : '#b99a6e', 0.5);
      c.fillRect(sx + (u - v) * (TW / 2) * 0.9, sy + (u + v) * (TH / 2) * 0.9, 1, 1);
    }
    if (R(70) < 0.08) {
      // shell
      c.fillStyle = '#ffd9c9';
      c.beginPath();
      c.arc(sx + 4, sy + TH / 2, 1.4, 0, 7);
      c.fill();
    }
  }
}

/** Get (or render) the chunk canvas for a plot. */
export function chunk(p: number, s: number, season: Season): Chunk {
  const key = `${s}|${season}`;
  const c = cache.get(p);
  if (c && c.key === key) return c;
  const nc = renderChunk(p, s, season);
  nc.key = key;
  cache.set(p, nc);
  return nc;
}
