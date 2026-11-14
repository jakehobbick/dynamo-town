// The Dynamo: the town's heart. A giant bicycle wheel geared to a generator.
// The crank turns at your cadence, the coils glow with your watts, and the plaza pulses.
import { box, cylinder, env, pad, P, shade, streetLamp, hip, type Ctx } from './prims';
import { glow, arc } from './art/fx';

export const PAINT: Record<string, string> = { brass: '#d9a441', copper: '#c9824a', teal: '#4fa3a0', rose: '#d98aa0', gold: '#f2c14e' };

export interface DynamoState {
  crankAngle: number;
  wheelAngle: number;
  power: number; // smoothed watts
  ftp: number;
  grid: number; // 0..1.5 activity
  paint: string;
  crown: boolean;
  t: number;
  night: number;
}

/** Draw in local 2×2 tile space (caller sets translation/scale). */
export function drawDynamo(c: Ctx, st: DynamoState) {
  const metal = PAINT[st.paint] || PAINT.brass;
  const k = Math.min(1.6, st.power / Math.max(50, st.ftp));
  env.L = null;
  pad(c, 0.05, 0.05, 1.95, 1.95, 'cobble', 3);
  // ground pulse rings
  if (st.power > 5) {
    const [cx, cy] = P(1, 1, 0);
    for (let i = 0; i < 3; i++) {
      const p = (st.t * (0.35 + k * 0.6) + i / 3) % 1;
      c.strokeStyle = `rgba(255,214,110,${(1 - p) * 0.55 * Math.min(1, k + 0.2)})`;
      c.lineWidth = 1.6 * (1 - p) + 0.4;
      c.beginPath();
      c.ellipse(cx, cy, 20 + p * 46, (20 + p * 46) * 0.5, 0, 0, 7);
      c.stroke();
    }
  }
  // plinth
  box(c, 0.45, 0.45, 1.55, 1.55, 0, 8, { col: '#cfc6b6', tex: 'stone' }, { col: '#e3dccd' }, 9);
  const [hx, hy] = P(1, 1, 8 + 34); // hub
  // generator housing (behind, to the right)
  cylinder(c, 1.38, 0.62, 0.17, 8, 30, { col: shade(metal, 0.9), tex: 'metal', k: 0.5 }, shade(metal, 1.1));
  // coil bands
  const coilGlow = Math.min(1, k * 0.9 + 0.05);
  for (let i = 0; i < 4; i++) {
    const [x, y] = P(1.38, 0.62, 12 + i * 4.5);
    c.strokeStyle = `rgb(${200 + 55 * coilGlow},${120 + 90 * coilGlow},${60 + 60 * coilGlow})`;
    c.lineWidth = 2.2;
    c.beginPath();
    c.ellipse(x, y, 8.6, 4.3, 0, 0.05, Math.PI - 0.05);
    c.stroke();
  }
  // generator cap + insulators
  const [gx, gy] = P(1.38, 0.62, 30);
  for (let i = -1; i <= 1; i++) {
    c.fillStyle = '#e8f1f5';
    c.fillRect(gx + i * 4 - 1, gy - 6, 2, 5);
  }
  glow(c, gx, gy - 6, 10 + k * 16, '255,220,130', 0.15 + coilGlow * 0.5);
  // back support
  support(c, hx, hy, -1, metal);
  // big wheel (screen-facing)
  const R = 27;
  c.save();
  c.translate(hx, hy);
  // tyre
  c.strokeStyle = '#2f2c36';
  c.lineWidth = 4;
  c.beginPath();
  c.arc(0, 0, R, 0, 7);
  c.stroke();
  c.strokeStyle = shade(metal, 1.15);
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(0, 0, R - 3, 0, 7);
  c.stroke();
  // spokes
  c.rotate(st.wheelAngle);
  c.strokeStyle = 'rgba(230,230,240,0.85)';
  c.lineWidth = 0.6;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    c.beginPath();
    c.moveTo(Math.cos(a + (i % 2 ? 0.25 : -0.25)) * 3, Math.sin(a + (i % 2 ? 0.25 : -0.25)) * 3);
    c.lineTo(Math.cos(a) * (R - 3), Math.sin(a) * (R - 3));
    c.stroke();
  }
  // valve + reflector so rotation reads clearly
  c.fillStyle = '#ff6b4a';
  c.fillRect(R - 8, -1.5, 4, 3);
  c.fillStyle = '#ffd166';
  c.fillRect(-R + 4, -1, 3, 2);
  c.restore();
  // motion blur shimmer at high power
  if (k > 0.8) {
    c.strokeStyle = `rgba(255,240,200,${Math.min(0.35, (k - 0.8) * 0.5)})`;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(hx, hy, R - 10, 0, 7);
    c.stroke();
  }
  // belt from hub to generator pulley
  c.strokeStyle = '#3d3a46';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(hx + 3, hy - 3);
  c.lineTo(gx - 1, gy + 4);
  c.moveTo(hx + 3, hy + 3);
  c.lineTo(gx + 3, gy + 8);
  c.stroke();
  // chainring + crank (front)
  c.save();
  c.translate(hx, hy);
  c.fillStyle = shade(metal, 0.85);
  c.beginPath();
  const teeth = 24;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2 + st.crankAngle;
    const r = i % 2 ? 9 : 10.2;
    c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
  c.fillStyle = '#3d3a46';
  c.beginPath();
  c.arc(0, 0, 6, 0, 7);
  c.fill();
  c.fillStyle = shade(metal, 1.2);
  c.beginPath();
  c.arc(0, 0, 3, 0, 7);
  c.fill();
  // crank arms + pedals
  for (const s of [0, Math.PI]) {
    const a = st.crankAngle + s;
    const ex = Math.cos(a) * 14, ey = Math.sin(a) * 14;
    c.strokeStyle = '#4a4752';
    c.lineWidth = 2.6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(ex, ey);
    c.stroke();
    c.fillStyle = '#2f2c36';
    c.fillRect(ex - 4, ey - 1.2, 8, 2.4);
  }
  c.restore();
  // front support
  support(c, hx, hy, 1, metal);
  // crown
  if (st.crown) {
    const [x, y] = P(1.38, 0.62, 30);
    c.fillStyle = '#f2c14e';
    c.beginPath();
    c.moveTo(x - 7, y - 4);
    c.lineTo(x - 7, y - 11);
    c.lineTo(x - 3.5, y - 7);
    c.lineTo(x, y - 13);
    c.lineTo(x + 3.5, y - 7);
    c.lineTo(x + 7, y - 11);
    c.lineTo(x + 7, y - 4);
    c.closePath();
    c.fill();
    c.strokeStyle = '#8a5a1c';
    c.lineWidth = 0.8;
    c.stroke();
    c.fillStyle = '#e5483f';
    c.beginPath();
    c.arc(x, y - 6.5, 1.3, 0, 7);
    c.fill();
  }
  // sparks at high power
  if (k > 0.95) {
    const n = Math.min(3, Math.floor((k - 0.9) * 6));
    for (let i = 0; i < n; i++) if (Math.sin(st.t * 13 + i * 2.1) > 0.3) arc(c, gx, gy - 6, gx + Math.cos(st.t * 4 + i * 2) * 18, gy - 14 + Math.sin(st.t * 3 + i) * 8, st.t, '255,236,170', 0.9, i);
  }
  // plaza lamps
  for (const [u, v] of [[0.15, 0.15], [1.85, 0.15], [0.15, 1.85], [1.85, 1.85]] as [number, number][]) streetLamp(c, u, v, 15);
  // sign
  box(c, 0.62, 1.55, 1.38, 1.6, 2, 7, { col: '#5b3a2a', tex: 'plank' }, null);
}

function support(c: Ctx, hx: number, hy: number, side: -1 | 1, metal: string) {
  const [bx0, by0] = [hx - 16, hy + 34];
  const [bx1, by1] = [hx + 16, hy + 34];
  c.strokeStyle = shade('#5c5f6b', side < 0 ? 0.8 : 1);
  c.lineWidth = side < 0 ? 2.6 : 3.2;
  c.lineCap = 'round';
  const off = side < 0 ? -3 : 3;
  c.beginPath();
  c.moveTo(bx0 + off, by0 + off * 0.5);
  c.lineTo(hx + off, hy + off * 0.5);
  c.lineTo(bx1 + off, by1 + off * 0.5);
  c.stroke();
  c.fillStyle = metal;
  c.beginPath();
  c.arc(hx + off, hy + off * 0.5, 2.4, 0, 7);
  c.fill();
}

/** Night glow pass for the dynamo (additive). */
export function dynamoLights(c: Ctx, st: DynamoState) {
  const k = Math.min(1.6, st.power / Math.max(50, st.ftp));
  const lamp = 0.35 + Math.min(1, st.grid) * 0.65;
  for (const [u, v] of [[0.15, 0.15], [1.85, 0.15], [0.15, 1.85], [1.85, 1.85]] as [number, number][]) {
    const [x, y] = P(u, v, 17);
    glow(c, x, y, 26, '255,205,120', 0.75 * lamp);
  }
  const [gx, gy] = P(1.38, 0.62, 24);
  glow(c, gx, gy, 30 + k * 40, '255,210,120', 0.25 + 0.5 * Math.min(1, k));
  void hip;
}
