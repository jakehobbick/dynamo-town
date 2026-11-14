// Cheap, stateless animation helpers (all a function of time, no particle bookkeeping).
import { hash } from '../../core/util';
import { P, rgba, type Ctx } from '../prims';

/** Rising smoke puffs from (x,y). k scales density (grid activity). */
export function smoke(c: Ctx, x: number, y: number, t: number, k = 1, col = '#ece8ee', n = 5, rise = 26, seed = 0) {
  if (k <= 0.02) return;
  for (let i = 0; i < n; i++) {
    const p = (t * 0.28 + i / n + hash(seed, i) * 0.1) % 1;
    const r = 1.6 + p * 4.5;
    const xx = x + p * 9 + Math.sin(t * 1.3 + i * 2) * 1.5;
    const yy = y - p * rise;
    c.fillStyle = rgba(col, (1 - p) * 0.55 * Math.min(1, k));
    c.beginPath();
    c.arc(xx, yy, r, 0, Math.PI * 2);
    c.fill();
  }
}

/** Rotating blades (windmill sails / turbine) around (x,y). */
export function blades(c: Ctx, x: number, y: number, r: number, a: number, n: number, col: string, w = 2.4, sail = true) {
  c.save();
  c.translate(x, y);
  for (let i = 0; i < n; i++) {
    const ang = a + (i / n) * Math.PI * 2;
    const ex = Math.cos(ang) * r, ey = Math.sin(ang) * r * 0.92;
    c.strokeStyle = '#6b4a33';
    c.lineWidth = 0.9;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(ex, ey);
    c.stroke();
    if (sail) {
      const nx = -Math.sin(ang) * w, ny = Math.cos(ang) * w;
      c.fillStyle = col;
      c.beginPath();
      c.moveTo(ex * 0.25, ey * 0.25);
      c.lineTo(ex, ey);
      c.lineTo(ex + nx, ey + ny);
      c.lineTo(ex * 0.25 + nx, ey * 0.25 + ny);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(80,60,50,0.5)';
      c.lineWidth = 0.4;
      c.stroke();
    }
  }
  c.fillStyle = '#5a4a3a';
  c.beginPath();
  c.arc(0, 0, 1.6, 0, 7);
  c.fill();
  c.restore();
}

export function waterSpray(c: Ctx, x: number, y: number, t: number, h: number, k = 1) {
  c.strokeStyle = `rgba(200,235,255,${0.75})`;
  c.lineWidth = 0.9;
  const jets = 6;
  for (let i = 0; i < jets; i++) {
    const a = (i / jets) * Math.PI * 2;
    const hh = h * (0.75 + 0.25 * Math.sin(t * 3 + i)) * (0.6 + 0.5 * k);
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + Math.cos(a) * 3, y - hh, x + Math.cos(a) * 7, y - 1 + Math.sin(a) * 2.5);
    c.stroke();
  }
  for (let i = 0; i < 6; i++) {
    const p = (t * 0.9 + i / 6) % 1;
    c.fillStyle = `rgba(220,245,255,${1 - p})`;
    c.fillRect(x + Math.cos(i * 2.1) * 6 * p, y - h * 0.9 * (1 - p) * k, 1, 1);
  }
}

/** Sparkle/electric arc between two points. */
export function arc(c: Ctx, x0: number, y0: number, x1: number, y1: number, t: number, col = '180,230,255', w = 1.2, seed = 0) {
  const n = 7;
  c.strokeStyle = `rgba(${col},0.95)`;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x0, y0);
  for (let i = 1; i < n; i++) {
    const tt = i / n;
    const j = (hash(seed, i, Math.floor(t * 18)) - 0.5) * 6;
    c.lineTo(x0 + (x1 - x0) * tt + j, y0 + (y1 - y0) * tt + j * 0.5);
  }
  c.lineTo(x1, y1);
  c.stroke();
}

export function glow(c: Ctx, x: number, y: number, r: number, col: string, a: number) {
  if (a <= 0.01) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`);
  g.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

export function bob(t: number, seed = 0, amp = 1) {
  return Math.sin(t * 1.6 + seed * 3) * amp;
}

/** A tiny animated flag at a pole top (local coords). */
export function flag(c: Ctx, u: number, v: number, h: number, t: number, col: string, len = 8) {
  const [x, y] = P(u, v, h);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y);
  for (let i = 0; i <= 6; i++) {
    const s = i / 6;
    c.lineTo(x + s * len, y + Math.sin(t * 5 + s * 4) * 1.2 * s + 0.4 * s);
  }
  for (let i = 6; i >= 0; i--) {
    const s = i / 6;
    c.lineTo(x + s * len, y + 4.5 + Math.sin(t * 5 + s * 4) * 1.2 * s - 0.6 * s);
  }
  c.closePath();
  c.fill();
}
