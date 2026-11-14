// Main town renderer: ocean -> terrain chunks -> night tint -> depth-sorted objects -> overlays.
import { G, now } from '../core/state';
import { clamp, hash } from '../core/util';
import { BUILDING } from '../data/buildings';
import { DISTRICT } from '../data/districts';
import { DYNAMO, N, PLOT, PLOTS, districtAt, plotDistrict } from '../sim/map';
import { plotBuyable } from '../sim/town';
import { cam, isoX, isoY, TH, TW, toScreen, updateCam, clampCam } from './iso';
import { chunk } from './terrain';
import { getSprite, darkOf, newFrame, type Sprite } from './sprites';
import { ANIM } from './art/town1';
import { drawDynamo, dynamoLights } from './dynamo';
import { RS } from './rstate';
import { drawAtmosphere, drawFireworks, drawOcean, tintGround, updateSky } from './sky';
import { drawWalker, updateWalkers, walkers } from './citizens';
import { env } from './prims';

let cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D;
let W = 0, H = 0, DPR = 1;

export function initRenderer(canvas: HTMLCanvasElement) {
  cv = canvas;
  ctx = cv.getContext('2d', { alpha: false })!;
  resize();
  addEventListener('resize', resize);
}
export function resize() {
  const q = G.s?.settings.quality || 'high';
  DPR = Math.min(window.devicePixelRatio || 1, q === 'battery' ? 1 : q === 'balanced' ? 1.5 : 2);
  W = innerWidth;
  H = innerHeight;
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  cam.W = W;
  cam.H = H;
}
export const viewSize = () => ({ W, H, DPR });

function bucket(z: number) {
  const b = z < 0.7 ? 0.5 : z < 1.4 ? 1 : 2;
  return Math.min(b * DPR, 3);
}

interface Obj {
  key: number;
  draw: () => void;
}

export function frame(dt: number, t: number) {
  RS.time = t;
  newFrame();
  updateCam(dt);
  clampCam();
  updateSky(dt);
  updateWalkers(dt);
  const c = ctx;
  c.setTransform(DPR, 0, 0, DPR, 0, 0);
  c.imageSmoothingEnabled = true;
  drawOcean(c, W, H, t);
  const z = cam.zoom;
  const sc = bucket(z);
  // ---------- terrain ----------
  const order = [...Array(PLOTS * PLOTS).keys()].sort((a, b) => (a % PLOTS) + Math.floor(a / PLOTS) - ((b % PLOTS) + Math.floor(b / PLOTS)));
  for (const p of order) {
    const px = p % PLOTS, py = Math.floor(p / PLOTS);
    const x0 = px * PLOT, y0 = py * PLOT;
    const ox = (x0 - (y0 + PLOT)) * (TW / 2), oy = (x0 + y0) * (TH / 2);
    const sx = (ox - cam.x) * z + W / 2, sy = (oy - cam.y) * z + H / 2;
    const w = PLOT * TW * z, h = (PLOT * TH + 18) * z;
    if (sx > W || sy > H || sx + w < 0 || sy + h < 0) continue;
    const ch = chunk(p, sc, RS.season);
    c.drawImage(ch.cv, sx, sy, ch.cv.width / sc * z, ch.cv.height / sc * z);
  }
  // locked plot haze (before night tint so it darkens with the land)
  for (let p = 0; p < PLOTS * PLOTS; p++) {
    if (G.s.plots.includes(p)) continue;
    plotOverlay(c, p, RS.showPlots);
  }
  tintGround(c, W, H);
  // ---------- objects ----------
  const objs: Obj[] = [];
  const nightA = RS.night;
  const tnow = now();
  for (const b of G.s.buildings) {
    if (RS.moveId === b.id) continue;
    const def = BUILDING[b.type];
    if (!def) continue;
    const size = def.size || 1;
    const p = toScreen(b.x, b.y);
    // cull (sprites extend up to ~120px above)
    if (p.x < -size * 40 * z - 20 || p.x > W + size * 40 * z + 20 || p.y > H + 10 || p.y + size * 32 * z < -140 * z) continue;
    objs.push({
      key: b.x + b.y + (size - 1) * 2 + 1,
      draw: () => drawBuilding(b.type, b.tier, b.id, b.x, b.y, z, sc, t, nightA, (tnow - b.builtAt) / 1000, b.id === RS.selected),
    });
  }
  // dynamo
  {
    const p = toScreen(DYNAMO.x, DYNAMO.y);
    if (p.x > -120 * z && p.x < W + 120 * z && p.y < H + 20 && p.y > -160 * z)
      objs.push({ key: DYNAMO.x + DYNAMO.y + 3, draw: () => drawDyn(p.x, p.y, z, t) });
  }
  // walkers
  for (const w of walkers) {
    const p = toScreen(w.x - 0.5, w.y - 0.5);
    const sx = p.x, sy = p.y + (TH / 2) * z;
    if (sx < -20 || sx > W + 20 || sy < -20 || sy > H + 20) continue;
    objs.push({ key: w.x + w.y - 0.01, draw: () => drawWalker(c, w, sx, sy, z, t) });
  }
  objs.sort((a, b) => a.key - b.key);
  for (const o of objs) o.draw();
  // ---------- overlays ----------
  powerLines(c, z, t);
  if (RS.ghost) drawGhost(c, z, sc, t);
  drawFireworks(c, W, H, t);
  drawAtmosphere(c, W, H, t);
  vignette(c);
}

function drawBuilding(type: string, tier: number, id: number, x: number, y: number, z: number, sc: number, t: number, nightA: number, age: number, selected: boolean, alpha = 1) {
  const c = ctx;
  const variant = id % 4;
  const sp = getSprite(type, tier, variant, RS.season, sc);
  if (!sp) return;
  const p = toScreen(x, y);
  const k = z / sp.s;
  const dx = p.x - sp.ax * k, dy = p.y - sp.ay * k, dw = sp.w * k, dh = sp.h * k;
  const def = BUILDING[type];
  const size = def?.size || 1;
  if (selected) {
    // pulsing footprint under the selection
    c.save();
    c.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5);
    c.fillStyle = '#ffe28a';
    diamondPath(c, p.x, p.y, size, z);
    c.fill();
    c.restore();
  }
  // construction animation
  const building = age >= 0 && age < 1.6;
  c.save();
  if (alpha < 1) c.globalAlpha = alpha;
  if (building) {
    const pr = clamp(age / 1.2, 0, 1);
    if (tier === 0) {
      // rise from the ground
      const clipY = p.y + size * 32 * z - (size * 32 * z + sp.ay * k) * easeOut(pr);
      c.beginPath();
      c.rect(dx - 10, clipY, dw + 20, dh + 10);
      c.clip();
    }
    const bounce = pr >= 1 ? 1 + Math.sin(clamp((age - 1.2) / 0.4, 0, 1) * Math.PI) * 0.06 : 1;
    c.translate(p.x, p.y + size * 16 * z);
    c.scale(1 / bounce, bounce);
    c.translate(-p.x, -(p.y + size * 16 * z));
  }
  c.drawImage(sp.day, dx, dy, dw, dh);
  if (nightA > 0.02) {
    c.globalAlpha = nightA * (alpha < 1 ? alpha : 1);
    c.drawImage(darkOf(sp), dx, dy, dw, dh);
  }
  const lk = lightLevel(x, y) * (0.25 + nightA * 0.95);
  if (lk > 0.02 && sp.hasLights) {
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(1, lk) * (alpha < 1 ? alpha : 1);
    c.drawImage(sp.lights, dx, dy, dw, dh);
    c.globalCompositeOperation = 'source-over';
  }
  c.globalAlpha = alpha;
  // animated bits
  const an = ANIM[def?.art || type];
  if (an && !(RS.lowFx && z < 0.6)) {
    c.setTransform(DPR * z, 0, 0, DPR * z, DPR * p.x, DPR * p.y);
    env.season = RS.season;
    try {
      an(c, tier, t + hash(id) * 10, RS.grid * (RS.blackout.has(districtAt(x, y)) ? 0.1 : 1), id);
    } catch {}
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  c.restore();
  if (building) dust(c, p.x, p.y + size * 16 * z, z, age, size);
}

const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);

function lightLevel(x: number, y: number) {
  if (RS.blackout.has(districtAt(x, y))) return 0.05;
  return clamp(RS.grid, 0, 1.2);
}

function dust(c: CanvasRenderingContext2D, x: number, y: number, z: number, age: number, size: number) {
  const pr = age / 1.6;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const r = (10 + pr * 30) * z * size;
    c.fillStyle = `rgba(235,225,205,${(1 - pr) * 0.7})`;
    c.beginPath();
    c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5 - pr * 6 * z, (3 + pr * 5) * z, 0, 7);
    c.fill();
  }
  if (age < 1.2) {
    // scaffold
    c.strokeStyle = 'rgba(150,110,70,0.8)';
    c.lineWidth = 1.2 * z;
    const h = 40 * z * size;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(x + s * 24 * z * size, y);
      c.lineTo(x + s * 24 * z * size, y - h);
      c.stroke();
    }
    for (let i = 1; i < 4; i++) {
      c.beginPath();
      c.moveTo(x - 24 * z * size, y - (h * i) / 4);
      c.lineTo(x + 24 * z * size, y - (h * i) / 4);
      c.stroke();
    }
  }
  // sparkles for upgrades
  for (let i = 0; i < 6; i++) {
    const p = (pr * 1.5 + i / 6) % 1;
    c.fillStyle = `rgba(255,230,140,${1 - p})`;
    const xx = x + Math.cos(i * 1.9) * 26 * z * size, yy = y - p * 50 * z;
    c.fillRect(xx - 1.5 * z, yy - 1.5 * z, 3 * z, 3 * z);
  }
}

function diamondPath(c: CanvasRenderingContext2D, x: number, y: number, size: number, z: number) {
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + 32 * size * z, y + 16 * size * z);
  c.lineTo(x, y + 32 * size * z);
  c.lineTo(x - 32 * size * z, y + 16 * size * z);
  c.closePath();
}

const dyn = { crankAngle: 0, wheelAngle: 0 };
function drawDyn(x: number, y: number, z: number, t: number) {
  const c = ctx;
  c.save();
  c.setTransform(DPR * z, 0, 0, DPR * z, DPR * x, DPR * y);
  const crown = G.s.tier >= 6 || G.s.research.includes('goldcrown');
  const st = { crankAngle: RS.crankAngle, wheelAngle: RS.wheelAngle, power: RS.power, ftp: RS.ftp, grid: RS.grid, paint: crown && G.s.research.includes('goldcrown') ? 'gold' : G.s.cosmetics.dynamo, crown, t, night: RS.night };
  drawDynamo(c, st);
  if (RS.night > 0.05 || RS.power > 20) {
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = Math.min(1, RS.night * 1.2 + RS.power / Math.max(1, RS.ftp) * 0.4);
    dynamoLights(c, st);
  }
  c.restore();
  void dyn;
}

// ---------- power lines from the dynamo to each owned plot ----------
function plotCenter(p: number) {
  return { x: (p % PLOTS) * PLOT + PLOT / 2, y: Math.floor(p / PLOTS) * PLOT + PLOT / 2 };
}
function powerLines(c: CanvasRenderingContext2D, z: number, t: number) {
  const hub = toScreen(DYNAMO.x + 1.38, DYNAMO.y + 0.62, 36);
  const k = RS.riding ? clamp(RS.power / Math.max(50, RS.ftp), 0, 1.6) : RS.grid * 0.35;
  for (const p of G.s.plots) {
    const ctr = plotCenter(p);
    if (ctr.x === DYNAMO.x + 1 && ctr.y === DYNAMO.y + 1) continue;
    const e = toScreen(ctr.x, ctr.y, 30);
    const off = RS.blackout.has(plotDistrict(p));
    // sagging wire
    const mx = (hub.x + e.x) / 2, my = (hub.y + e.y) / 2 + 26 * z;
    c.strokeStyle = 'rgba(50,45,60,0.55)';
    c.lineWidth = 1 * z;
    c.beginPath();
    c.moveTo(hub.x, hub.y);
    c.quadraticCurveTo(mx, my, e.x, e.y);
    c.stroke();
    // pylon at the plot end
    c.strokeStyle = 'rgba(80,70,80,0.9)';
    c.lineWidth = 1.6 * z;
    c.beginPath();
    c.moveTo(e.x, e.y);
    c.lineTo(e.x, e.y + 30 * z);
    c.moveTo(e.x - 4 * z, e.y + 2 * z);
    c.lineTo(e.x + 4 * z, e.y + 2 * z);
    c.stroke();
    if (off || k < 0.03) continue;
    // energy pulses travel outward at a speed proportional to power
    const n = 2 + Math.round(k * 3);
    for (let i = 0; i < n; i++) {
      const s = ((t * (0.25 + k * 0.7) + i / n + hash(p) ) % 1);
      const x = (1 - s) * (1 - s) * hub.x + 2 * (1 - s) * s * mx + s * s * e.x;
      const y = (1 - s) * (1 - s) * hub.y + 2 * (1 - s) * s * my + s * s * e.y;
      const g = c.createRadialGradient(x, y, 0, x, y, 6 * z);
      g.addColorStop(0, `rgba(255,236,150,${0.9 * Math.min(1, k + 0.2)})`);
      g.addColorStop(1, 'rgba(255,200,90,0)');
      c.fillStyle = g;
      c.fillRect(x - 6 * z, y - 6 * z, 12 * z, 12 * z);
    }
  }
}

function plotOverlay(c: CanvasRenderingContext2D, p: number, detail: boolean) {
  const px = p % PLOTS, py = Math.floor(p / PLOTS);
  const x0 = px * PLOT, y0 = py * PLOT;
  const a = toScreen(x0, y0), b = toScreen(x0 + PLOT, y0), d = toScreen(x0 + PLOT, y0 + PLOT), e = toScreen(x0, y0 + PLOT);
  if (Math.max(a.x, b.x, d.x, e.x) < 0 || Math.min(a.x, b.x, d.x, e.x) > W || Math.max(a.y, d.y) < 0 || a.y > H) return;
  c.save();
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.lineTo(d.x, d.y);
  c.lineTo(e.x, e.y);
  c.closePath();
  const can = plotBuyable(p);
  c.fillStyle = detail ? (can.ok ? 'rgba(255,248,230,0.28)' : 'rgba(230,236,245,0.5)') : 'rgba(235,240,248,0.42)';
  c.fill();
  if (detail) {
    c.setLineDash([6, 6]);
    c.strokeStyle = can.ok ? 'rgba(240,162,59,0.95)' : 'rgba(120,130,150,0.6)';
    c.lineWidth = 2;
    c.stroke();
    c.setLineDash([]);
    const ctr = toScreen(x0 + PLOT / 2, y0 + PLOT / 2);
    const d0 = DISTRICT[plotDistrict(p)];
    c.font = `600 ${Math.round(clamp(14 * cam.zoom, 10, 22))}px Fredoka, sans-serif`;
    c.textAlign = 'center';
    c.fillStyle = 'rgba(40,40,60,0.85)';
    c.fillText(`${can.ok ? '🪧' : '🔒'} ${d0.name}`, ctr.x, ctr.y + TH / 2 * cam.zoom);
  }
  c.restore();
}

function drawGhost(c: CanvasRenderingContext2D, z: number, sc: number, t: number) {
  const g = RS.ghost!;
  const def = BUILDING[g.type];
  const size = def?.size || 1;
  const p = toScreen(g.x, g.y);
  c.save();
  diamondPath(c, p.x, p.y, size, z);
  c.fillStyle = g.ok ? 'rgba(110,231,140,0.45)' : 'rgba(229,72,77,0.4)';
  c.fill();
  c.strokeStyle = g.ok ? '#3b8d55' : '#c0392b';
  c.lineWidth = 2;
  c.stroke();
  c.restore();
  drawBuilding(g.type, 0, 1, g.x, g.y, z, sc, t, 0, 99, false, g.ok ? 0.8 : 0.45);
}

function vignette(c: CanvasRenderingContext2D) {
  const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.8);
  g.addColorStop(0, 'rgba(20,20,40,0)');
  g.addColorStop(1, `rgba(20,20,40,${0.18 + RS.night * 0.25})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

/** Render the town into an offscreen canvas for snapshots (share card, before/after). */
export function snapshot(w: number, h: number, zoom?: number): HTMLCanvasElement {
  const save = { W, H, DPR, cv, ctx, cx: cam.x, cy: cam.y, z: cam.zoom, tx: cam.tx, ty: cam.ty, tz: cam.tz, cw: cam.W, ch: cam.H };
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  try {
    cv = off;
    ctx = off.getContext('2d')!;
    W = w;
    H = h;
    DPR = 1;
    cam.W = w;
    cam.H = h;
    // frame the owned land
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const p of G.s.plots) {
      const x0 = (p % PLOTS) * PLOT, y0 = Math.floor(p / PLOTS) * PLOT;
      for (const [x, y] of [[x0, y0], [x0 + PLOT, y0], [x0, y0 + PLOT], [x0 + PLOT, y0 + PLOT]]) {
        minX = Math.min(minX, isoX(x, y));
        maxX = Math.max(maxX, isoX(x, y));
        minY = Math.min(minY, isoY(x, y));
        maxY = Math.max(maxY, isoY(x, y));
      }
    }
    cam.x = cam.tx = (minX + maxX) / 2;
    cam.y = cam.ty = (minY + maxY) / 2 - 20;
    cam.zoom = cam.tz = zoom || clamp(Math.min(w / (maxX - minX + 80), h / (maxY - minY + 160)), 0.3, 2.5);
    frame(0, RS.time);
  } finally {
    W = save.W;
    H = save.H;
    DPR = save.DPR;
    cv = save.cv;
    ctx = save.ctx;
    cam.x = save.cx;
    cam.y = save.cy;
    cam.zoom = save.z;
    cam.tx = save.tx;
    cam.ty = save.ty;
    cam.tz = save.tz;
    cam.W = save.cw;
    cam.H = save.ch;
  }
  return off;
}

export { N };
