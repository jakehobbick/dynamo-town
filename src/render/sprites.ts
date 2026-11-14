// Building sprite cache. Each (type, tier, variant, season, scale) is drawn once into three layers:
// day (normal), dark (night-tinted copy) and lights (emissive windows/lamps, drawn additively).
import { BUILDING } from '../data/buildings';
import { env } from './prims';
import { ANIM, ART, TOP } from './art/town1';
import './art/town2';
import type { Season } from './terrain';

export interface Sprite {
  day: HTMLCanvasElement;
  dark: HTMLCanvasElement | null;
  lights: HTMLCanvasElement;
  hasLights: boolean;
  ax: number; // anchor (tile top corner) in sprite px
  ay: number;
  s: number;
  w: number;
  h: number;
}

const cache = new Map<string, Sprite>();
export const spriteStats = { made: 0, budgetMs: 0 };
export function clearSprites() {
  cache.clear();
}

const PAD = 14;
export function spriteKey(type: string, tier: number, variant: number, season: Season, s: number) {
  return `${type}|${tier}|${variant}|${season}|${s}`;
}

let frameSpent = 0;
export function newFrame() {
  frameSpent = 0;
}

/** Get a sprite; may return null if over this frame's generation budget (it will appear next frame). */
export function getSprite(type: string, tier: number, variant: number, season: Season, s: number, force = false): Sprite | null {
  const key = spriteKey(type, tier, variant, season, s);
  let sp = cache.get(key);
  if (sp) return sp;
  if (!force && frameSpent > 10) return null;
  const t0 = performance.now();
  sp = makeSprite(type, tier, variant, season, s);
  frameSpent += performance.now() - t0;
  spriteStats.made++;
  cache.set(key, sp);
  if (cache.size > 260) {
    // evict oldest
    const k = cache.keys().next().value;
    if (k) cache.delete(k);
  }
  return sp;
}

function makeSprite(type: string, tier: number, variant: number, season: Season, s: number): Sprite {
  const def = BUILDING[type];
  const size = def?.size || 1;
  const top = (TOP[type] ?? 70) + 10;
  const w = size * 64 + PAD * 2;
  const h = top + size * 32 + PAD;
  const day = document.createElement('canvas');
  day.width = Math.ceil(w * s);
  day.height = Math.ceil(h * s);
  const lights = document.createElement('canvas');
  lights.width = day.width;
  lights.height = day.height;
  const c = day.getContext('2d')!;
  const L = lights.getContext('2d')!;
  const ax = size * 32 + PAD, ay = top;
  c.setTransform(s, 0, 0, s, ax * s, ay * s);
  L.setTransform(s, 0, 0, s, ax * s, ay * s);
  env.season = season;
  env.seed = variant;
  env.L = L;
  try {
    const art = ART[def?.art || type];
    if (art) art(c, tier, variant * 7919 + 13);
    else fallback(c);
  } catch (e) {
    console.error('art failed', type, e);
    fallback(c);
  }
  env.L = null;
  // detect whether the lights layer has anything (cheap probe on a few pixels is unreliable; track via flag)
  return { day, dark: null, lights, hasLights: true, ax: ax * s, ay: ay * s, s, w: day.width, h: day.height };
}

function fallback(c: CanvasRenderingContext2D) {
  c.fillStyle = '#e8a87c';
  c.beginPath();
  c.moveTo(0, 4);
  c.lineTo(28, 18);
  c.lineTo(0, 32);
  c.lineTo(-28, 18);
  c.fill();
}

/** Night-tinted copy, built lazily the first time it is needed. */
export function darkOf(sp: Sprite): HTMLCanvasElement {
  if (sp.dark) return sp.dark;
  const d = document.createElement('canvas');
  d.width = sp.day.width;
  d.height = sp.day.height;
  const c = d.getContext('2d')!;
  c.drawImage(sp.day, 0, 0);
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = '#4a5590';
  c.fillRect(0, 0, d.width, d.height);
  c.globalCompositeOperation = 'destination-in';
  c.drawImage(sp.day, 0, 0);
  sp.dark = d;
  return d;
}

/** Thumbnail for menus. */
const thumbs = new Map<string, string>();
export function thumbURL(type: string, tier: number, season: Season, px = 96): string {
  const key = `${type}|${tier}|${season}|${px}`;
  const u = thumbs.get(key);
  if (u) return u;
  const sp0 = getSprite(type, tier, 1, season, 2, true)!;
  // composite the animated parts at a nice moment so thumbnails show balloons, boats, sails...
  const comp = document.createElement('canvas');
  comp.width = sp0.w;
  comp.height = sp0.h;
  const cc = comp.getContext('2d')!;
  cc.drawImage(sp0.day, 0, 0);
  const an = ANIM[BUILDING[type]?.art || type];
  if (an) {
    cc.setTransform(sp0.s, 0, 0, sp0.s, sp0.ax, sp0.ay);
    env.season = season;
    try {
      an(cc, tier, 2.3, 0.8, 1);
    } catch {}
    cc.setTransform(1, 0, 0, 1, 0, 0);
  }
  const sp = { ...sp0, day: comp };
  // crop to the opaque bounding box so thumbnails fill their card
  let bx0 = 0, by0 = 0, bx1 = sp.w, by1 = sp.h;
  try {
    const d = sp.day.getContext('2d')!.getImageData(0, 0, sp.w, sp.h).data;
    bx0 = sp.w; by0 = sp.h; bx1 = 0; by1 = 0;
    for (let y = 0; y < sp.h; y += 2)
      for (let x = 0; x < sp.w; x += 2)
        if (d[(y * sp.w + x) * 4 + 3] > 20) {
          if (x < bx0) bx0 = x;
          if (x > bx1) bx1 = x;
          if (y < by0) by0 = y;
          if (y > by1) by1 = y;
        }
    if (bx1 <= bx0) { bx0 = 0; by0 = 0; bx1 = sp.w; by1 = sp.h; }
  } catch {}
  const cw = bx1 - bx0 + 4, chh = by1 - by0 + 4;
  const cv = document.createElement('canvas');
  cv.width = px * 2;
  cv.height = px * 2;
  const c = cv.getContext('2d')!;
  const sc = Math.min((px * 2) / cw, (px * 2) / chh) * 0.94;
  c.drawImage(sp.day, bx0 - 2, by0 - 2, cw, chh, (px * 2 - cw * sc) / 2, (px * 2 - chh * sc) / 2, cw * sc, chh * sc);
  const url = cv.toDataURL('image/png');
  thumbs.set(key, url);
  return url;
}
export function clearThumbs() {
  thumbs.clear();
}
