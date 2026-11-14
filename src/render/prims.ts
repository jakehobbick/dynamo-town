// Isometric drawing primitives for procedural, hand-crafted-looking buildings.
// Local space: u, v in tiles (0..size), h in iso pixels up. P(u,v,h) -> local pixel.
// Every face gets a base colour, directional shading, a material texture, soft occlusion and an ink outline.
import { hash } from '../core/util';

export type Ctx = CanvasRenderingContext2D;
export type Pt = [number, number];
export const P = (u: number, v: number, h = 0): Pt => [(u - v) * 32, (u + v) * 16 - h];

// ---------- colour ----------
const rgbCache = new Map<string, [number, number, number]>();
export function rgb(hex: string): [number, number, number] {
  let c = rgbCache.get(hex);
  if (!c) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, c);
  }
  return c;
}
const toHex = (r: number, g: number, b: number) => '#' + [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
/** Multiply brightness (f<1 darker, f>1 lighter, lighter mixes toward white). */
export function shade(hex: string, f: number) {
  const [r, g, b] = rgb(hex);
  if (f <= 1) return toHex(r * f, g * f, b * f);
  const t = f - 1;
  return toHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}
export function mix(a: string, b: string, t: number) {
  const A = rgb(a), B = rgb(b);
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export const rgba = (hex: string, a: number) => {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};

// ---------- render context (season, snow, emissive) ----------
export interface ArtEnv {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  seed: number;
  /** emissive layer context: windows/lamps are also drawn here (glow only) */
  L: Ctx | null;
}
export const env: ArtEnv = { season: 'summer', seed: 1, L: null };
const snowy = () => env.season === 'winter';

export const INK = '#3a2f3d';
const OUTLINE_A = 0.55;

export function poly(c: Ctx, pts: Pt[]) {
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
  c.closePath();
}

function outline(c: Ctx, pts: Pt[], col = INK, a = OUTLINE_A, w = 0.9) {
  poly(c, pts);
  c.strokeStyle = rgba(col, a);
  c.lineWidth = w;
  c.lineJoin = 'round';
  c.stroke();
}

// ---------- materials & textures ----------
export type Tex = 'none' | 'brick' | 'plank' | 'vplank' | 'stone' | 'stucco' | 'shingle' | 'tile' | 'metal' | 'glass' | 'thatch' | 'slate' | 'log';
export interface Mat {
  col: string;
  tex?: Tex;
  /** texture contrast 0..1 */
  k?: number;
}

/**
 * A general parallelogram face: point(s,t) = O + A*s + B*t, s,t in [0,1].
 * `along` = length of A in tiles (for texture density), `tall` = |B| in px.
 */
interface Face {
  O: Pt;
  A: Pt;
  B: Pt;
  along: number;
  tall: number;
}
const fp = (f: Face, s: number, t: number): Pt => [f.O[0] + f.A[0] * s + f.B[0] * t, f.O[1] + f.A[1] * s + f.B[1] * t];

function texture(c: Ctx, f: Face, m: Mat, base: string, seed: number, roof = false) {
  const tex = m.tex || 'none';
  if (tex === 'none') return;
  const k = m.k ?? 1;
  const dark = rgba(shade(base, 0.6), 0.32 * k);
  const lite = rgba(shade(base, 1.25), 0.35 * k);
  c.lineWidth = 0.55;
  const line = (s0: number, t0: number, s1: number, t1: number, col: string) => {
    const a = fp(f, s0, t0), b = fp(f, s1, t1);
    c.strokeStyle = col;
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  };
  const rows = (px: number) => Math.max(1, Math.round(f.tall / px));
  const cols = (px: number) => Math.max(1, Math.round((f.along * 32 * 1.12) / px));
  const R = (i: number, j = 0) => hash(seed, i, j, tex);
  switch (tex) {
    case 'brick': {
      const nr = rows(3.2), nc = cols(6);
      for (let i = 1; i < nr; i++) line(0, i / nr, 1, i / nr, dark);
      for (let i = 0; i < nr; i++)
        for (let j = 0; j <= nc; j++) {
          const s = (j + (i % 2 ? 0.5 : 0)) / nc;
          if (s > 0 && s < 1) line(s, i / nr, s, (i + 1) / nr, dark);
          if (R(i, j) < 0.12) {
            // a few tinted bricks
            const a = fp(f, Math.min(1, s), i / nr), b = fp(f, Math.min(1, s + 1 / nc), (i + 1) / nr);
            c.fillStyle = R(i, j + 9) < 0.5 ? lite : dark;
            c.globalAlpha = 0.6;
            poly(c, [a, fp(f, Math.min(1, s + 1 / nc), i / nr), b, fp(f, Math.min(1, s), (i + 1) / nr)]);
            c.fill();
            c.globalAlpha = 1;
          }
        }
      break;
    }
    case 'stone': {
      const nr = rows(5);
      for (let i = 1; i < nr; i++) line(0, i / nr, 1, i / nr, dark);
      for (let i = 0; i < nr; i++) {
        let s = R(i) * 0.25;
        while (s < 1) {
          line(s, i / nr, s, (i + 1) / nr, dark);
          const w = 0.14 + R(i, Math.floor(s * 100)) * 0.22;
          if (R(i, Math.floor(s * 50) + 3) < 0.35) {
            c.fillStyle = R(i, 7) < 0.5 ? lite : dark;
            c.globalAlpha = 0.45;
            const s2 = Math.min(1, s + w);
            poly(c, [fp(f, s, i / nr), fp(f, s2, i / nr), fp(f, s2, (i + 1) / nr), fp(f, s, (i + 1) / nr)]);
            c.fill();
            c.globalAlpha = 1;
          }
          s += w;
        }
      }
      break;
    }
    case 'plank':
    case 'log': {
      const nr = rows(tex === 'log' ? 3.6 : 2.6);
      for (let i = 1; i < nr; i++) line(0, i / nr, 1, i / nr, dark);
      for (let i = 0; i < nr; i++) if (R(i) < 0.4) line(R(i, 1), (i + 0.5) / nr, Math.min(1, R(i, 1) + 0.2), (i + 0.5) / nr, lite);
      if (tex === 'log') for (let i = 0; i < nr; i++) line(0, (i + 0.15) / nr, 1, (i + 0.15) / nr, lite);
      break;
    }
    case 'vplank':
    case 'metal': {
      const nc = cols(tex === 'metal' ? 2.6 : 4);
      for (let j = 1; j < nc; j++) line(j / nc, 0, j / nc, 1, dark);
      if (tex === 'metal') for (let j = 0; j < nc; j++) line((j + 0.35) / nc, 0, (j + 0.35) / nc, 1, lite);
      break;
    }
    case 'stucco': {
      const n = Math.round(f.along * f.tall * 0.35);
      for (let i = 0; i < n; i++) {
        const p = fp(f, R(i), R(i, 1));
        c.fillStyle = R(i, 2) < 0.5 ? dark : lite;
        c.fillRect(p[0], p[1], 0.8, 0.8);
      }
      break;
    }
    case 'glass': {
      const nc = cols(7), nr = rows(5);
      for (let j = 1; j < nc; j++) line(j / nc, 0, j / nc, 1, rgba('#ffffff', 0.35 * k));
      for (let i = 1; i < nr; i++) line(0, i / nr, 1, i / nr, rgba('#ffffff', 0.25 * k));
      c.globalAlpha = 0.18 * k;
      c.fillStyle = '#ffffff';
      poly(c, [fp(f, 0.1, 0), fp(f, 0.3, 0), fp(f, 0.55, 1), fp(f, 0.35, 1)]);
      c.fill();
      c.globalAlpha = 1;
      break;
    }
    case 'shingle':
    case 'tile':
    case 'slate': {
      // rows run along A, B goes up the slope
      const nr = rows(tex === 'tile' ? 3 : 2.6), nc = cols(tex === 'tile' ? 3.2 : 4.2);
      for (let i = 1; i < nr; i++) line(0, i / nr, 1, i / nr, dark);
      for (let i = 0; i < nr; i++)
        for (let j = 1; j < nc; j++) {
          const s = (j + (i % 2 ? 0.5 : 0)) / nc;
          if (s < 1) line(s, i / nr, s, (i + 0.55) / nr, dark);
        }
      for (let i = 0; i < nr; i += 1) line(0, (i + 0.85) / nr, 1, (i + 0.85) / nr, lite);
      if (tex === 'slate')
        for (let i = 0; i < nr * nc * 0.1; i++) {
          const p = fp(f, R(i, 4), R(i, 5));
          c.fillStyle = lite;
          c.fillRect(p[0], p[1], 1.4, 0.7);
        }
      break;
    }
    case 'thatch': {
      const n = Math.round(f.along * 26);
      for (let i = 0; i < n; i++) {
        const s = R(i);
        line(s, R(i, 1) * 0.3, s + 0.01, 0.4 + R(i, 2) * 0.6, i % 2 ? dark : lite);
      }
      line(0, 0.98, 1, 0.98, dark);
      break;
    }
  }
  void roof;
}

/** Fill a face with shading, texture, AO and outline. shadeF: directional light factor. */
function drawFace(c: Ctx, f: Face, m: Mat, shadeF: number, seed: number, opts: { ao?: boolean; grad?: boolean; roof?: boolean } = {}) {
  const pts = [fp(f, 0, 0), fp(f, 1, 0), fp(f, 1, 1), fp(f, 0, 1)];
  const base = shade(m.col, shadeF);
  c.save();
  poly(c, pts);
  if (opts.grad !== false) {
    // gentle vertical gradient: lighter at top
    const a = fp(f, 0.5, 0), b = fp(f, 0.5, 1);
    const g = c.createLinearGradient(a[0], a[1], b[0], b[1]);
    g.addColorStop(0, shade(base, opts.roof ? 1.0 : 0.94));
    g.addColorStop(1, shade(base, 1.06));
    c.fillStyle = g;
  } else c.fillStyle = base;
  c.fill();
  c.clip();
  texture(c, f, m, base, seed, opts.roof);
  if (opts.ao) {
    const a = fp(f, 0.5, 0), b = fp(f, 0.5, Math.min(1, 7 / Math.max(1, f.tall)));
    const g = c.createLinearGradient(a[0], a[1], b[0], b[1]);
    g.addColorStop(0, 'rgba(30,20,40,0.28)');
    g.addColorStop(1, 'rgba(30,20,40,0)');
    c.fillStyle = g;
    c.fillRect(-200, -400, 400, 600);
  }
  c.restore();
  outline(c, pts);
}

// Light model: top 1.06, left-facing (+v) 0.92, right-facing (+u) 0.74
export const LIT = { top: 1.06, left: 0.93, right: 0.74 };

/** Axis-aligned box. Draws the two visible walls and the top. */
export function box(c: Ctx, u0: number, v0: number, u1: number, v1: number, h0: number, h1: number, wall: Mat, top?: Mat | null, seed = 1) {
  const hh = h1 - h0;
  // left face: v = v1, s along u
  drawFace(c, { O: P(u0, v1, h0), A: sub(P(u1, v1, h0), P(u0, v1, h0)), B: [0, -hh], along: u1 - u0, tall: hh }, wall, LIT.left, seed, { ao: h0 === 0 });
  // right face: u = u1, s along v (from v1 back to v0 reads left->right on screen)
  drawFace(c, { O: P(u1, v1, h0), A: sub(P(u1, v0, h0), P(u1, v1, h0)), B: [0, -hh], along: v1 - v0, tall: hh }, wall, LIT.right, seed + 7, { ao: h0 === 0 });
  if (top !== null) {
    const t = top || { col: shade(wall.col, 1.05) };
    const pts = [P(u0, v0, h1), P(u1, v0, h1), P(u1, v1, h1), P(u0, v1, h1)];
    poly(c, pts);
    c.fillStyle = shade(snowy() && !top ? '#f4f7fb' : t.col, LIT.top);
    c.fill();
    outline(c, pts);
  }
}

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];

/** Soft contact shadow on the ground under a footprint. */
export function groundShadow(c: Ctx, u0: number, v0: number, u1: number, v1: number, spread = 0.18, a = 0.22) {
  c.save();
  const pts = [P(u0 - 0.02, v0 - 0.02), P(u1 + spread, v0 - 0.02), P(u1 + spread, v1 + spread * 0.6), P(u0 - 0.02, v1 + spread * 0.6)];
  poly(c, pts);
  c.fillStyle = `rgba(40,30,60,${a})`;
  c.filter = 'blur(1.5px)';
  c.fill();
  c.filter = 'none';
  c.restore();
}

function roofCol(m: Mat): Mat {
  return snowy() ? { col: mix(m.col, '#f3f6fb', 0.82), tex: m.tex, k: 0.35 } : m;
}

/** Gable roof. axis = direction of the ridge. Draws gable-end triangle in wall material. */
export function gable(c: Ctx, u0: number, v0: number, u1: number, v1: number, h: number, rise: number, axis: 'u' | 'v', roof: Mat, wall: Mat, o = 0.08, seed = 3) {
  const rm = roofCol(roof);
  if (axis === 'u') {
    const vm = (v0 + v1) / 2;
    // back slope
    drawFace(c, { O: P(u0 - o, v0 - o, h - 1), A: sub(P(u1 + o, v0 - o, h - 1), P(u0 - o, v0 - o, h - 1)), B: sub(P(u0 - o, vm, h + rise), P(u0 - o, v0 - o, h - 1)), along: u1 - u0, tall: rise + 8 }, rm, 0.8, seed, { roof: true });
    // gable end at u1
    const tri: Pt[] = [P(u1, v1, h), P(u1, v0, h), P(u1, vm, h + rise)];
    poly(c, tri);
    c.fillStyle = shade(wall.col, LIT.right);
    c.fill();
    c.save();
    c.clip();
    texture(c, { O: P(u1, v1, h), A: sub(P(u1, v0, h), P(u1, v1, h)), B: [0, -rise], along: v1 - v0, tall: rise }, wall, shade(wall.col, LIT.right), seed + 2);
    c.restore();
    outline(c, tri);
    // front slope
    drawFace(c, { O: P(u0 - o, v1 + o, h - 1), A: sub(P(u1 + o, v1 + o, h - 1), P(u0 - o, v1 + o, h - 1)), B: sub(P(u0 - o, vm, h + rise), P(u0 - o, v1 + o, h - 1)), along: u1 - u0, tall: rise + 8 }, rm, 1.0, seed + 1, { roof: true });
    // barge board
    const bb: Pt[] = [P(u1 + o, v1 + o, h - 1), P(u1 + o, vm, h + rise), P(u1 + o, v0 - o, h - 1)];
    c.beginPath();
    c.moveTo(...bb[0]);
    c.lineTo(...bb[1]);
    c.lineTo(...bb[2]);
    c.strokeStyle = shade(roof.col, 0.55);
    c.lineWidth = 1.6;
    c.stroke();
    ridgeLine(c, P(u0 - o, vm, h + rise), P(u1 + o, vm, h + rise), roof);
  } else {
    const um = (u0 + u1) / 2;
    drawFace(c, { O: P(u0 - o, v1 + o, h - 1), A: sub(P(u0 - o, v0 - o, h - 1), P(u0 - o, v1 + o, h - 1)), B: sub(P(um, v1 + o, h + rise), P(u0 - o, v1 + o, h - 1)), along: v1 - v0, tall: rise + 8 }, rm, 0.85, seed, { roof: true });
    const tri: Pt[] = [P(u0, v1, h), P(u1, v1, h), P(um, v1, h + rise)];
    poly(c, tri);
    c.fillStyle = shade(wall.col, LIT.left);
    c.fill();
    c.save();
    c.clip();
    texture(c, { O: P(u0, v1, h), A: sub(P(u1, v1, h), P(u0, v1, h)), B: [0, -rise], along: u1 - u0, tall: rise }, wall, shade(wall.col, LIT.left), seed + 2);
    c.restore();
    outline(c, tri);
    drawFace(c, { O: P(u1 + o, v1 + o, h - 1), A: sub(P(u1 + o, v0 - o, h - 1), P(u1 + o, v1 + o, h - 1)), B: sub(P(um, v1 + o, h + rise), P(u1 + o, v1 + o, h - 1)), along: v1 - v0, tall: rise + 8 }, rm, 0.78, seed + 1, { roof: true });
    const bb: Pt[] = [P(u0 - o, v1 + o, h - 1), P(um, v1 + o, h + rise), P(u1 + o, v1 + o, h - 1)];
    c.beginPath();
    c.moveTo(...bb[0]);
    c.lineTo(...bb[1]);
    c.lineTo(...bb[2]);
    c.strokeStyle = shade(roof.col, 0.55);
    c.lineWidth = 1.6;
    c.stroke();
    ridgeLine(c, P(um, v1 + o, h + rise), P(um, v0 - o, h + rise), roof);
  }
}

function ridgeLine(c: Ctx, a: Pt, b: Pt, roof: Mat) {
  c.beginPath();
  c.moveTo(...a);
  c.lineTo(...b);
  c.strokeStyle = snowy() ? '#ffffff' : shade(roof.col, 1.25);
  c.lineWidth = 1.3;
  c.stroke();
}

/** Hip / pyramid roof. If the footprint is square, rise to a point. */
export function hip(c: Ctx, u0: number, v0: number, u1: number, v1: number, h: number, rise: number, roof: Mat, o = 0.08, seed = 5) {
  const rm = roofCol(roof);
  const du = u1 - u0, dv = v1 - v0;
  const um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
  let ra: Pt, rb: Pt; // ridge ends
  if (Math.abs(du - dv) < 0.05) {
    ra = rb = P(um, vm, h + rise);
  } else if (du > dv) {
    const d = dv / 2;
    ra = P(u0 + d, vm, h + rise);
    rb = P(u1 - d, vm, h + rise);
  } else {
    const d = du / 2;
    ra = P(um, v0 + d, h + rise);
    rb = P(um, v1 - d, h + rise);
  }
  const A = P(u0 - o, v0 - o, h - 1), B = P(u1 + o, v0 - o, h - 1), C = P(u1 + o, v1 + o, h - 1), D = P(u0 - o, v1 + o, h - 1);
  const faces: [Pt[], number][] = du >= dv
    ? [[[A, B, rb, ra], 0.82], [[A, ra, D], 0.9], [[B, C, rb], 0.76], [[D, C, rb, ra], 1.0]]
    : [[[A, B, ra], 0.82], [[A, ra, rb, D], 0.9], [[B, C, rb, ra], 0.76], [[D, C, rb], 1.0]];
  for (const [pts, f] of faces) {
    poly(c, pts);
    const base = shade(rm.col, f);
    c.fillStyle = base;
    c.fill();
    c.save();
    c.clip();
    // texture rows parallel to eave
    const e0 = pts[0], e1 = pts[1];
    const top = pts.length === 4 ? pts[3] : pts[2];
    const tall = Math.hypot(top[0] - e0[0], top[1] - e0[1]);
    texture(c, { O: e0, A: sub(e1, e0), B: sub(top, e0), along: Math.hypot(e1[0] - e0[0], e1[1] - e0[1]) / 32, tall }, rm, base, seed + f * 10, true);
    c.restore();
    outline(c, pts);
  }
  if (ra !== rb) ridgeLine(c, ra, rb, roof);
}

/** Simple flat roof with a parapet lip. */
export function flatRoof(c: Ctx, u0: number, v0: number, u1: number, v1: number, h: number, m: Mat, lip = 2) {
  const top = snowy() ? { col: '#eef3f9' } : m;
  box(c, u0, v0, u1, v1, h, h + lip, { col: shade(m.col, 1.05) }, { col: shade(top.col, 0.9) });
  const inset = 0.06;
  const pts = [P(u0 + inset, v0 + inset, h + lip), P(u1 - inset, v0 + inset, h + lip), P(u1 - inset, v1 - inset, h + lip), P(u0 + inset, v1 - inset, h + lip)];
  poly(c, pts);
  c.fillStyle = shade(top.col, 0.82);
  c.fill();
}

/** Window on a wall. face 'L' = v=const (left wall), 'R' = u=const (right wall). */
export function windowOn(c: Ctx, face: 'L' | 'R', fixed: number, a: number, h: number, w = 0.16, hh = 7, opts: { lit?: number; arch?: boolean; shutters?: string; frame?: string; box?: string } = {}) {
  const pt = (s: number, z: number) => (face === 'L' ? P(a + s, fixed, h + z) : P(fixed, a + s, h + z));
  const sh = face === 'L' ? LIT.left : LIT.right;
  const frame = opts.frame || '#f6efe2';
  // frame
  const f0 = [pt(-0.02, -0.8), pt(w + 0.02, -0.8), pt(w + 0.02, hh + 0.8), pt(-0.02, hh + 0.8)];
  poly(c, f0);
  c.fillStyle = shade(frame, sh);
  c.fill();
  // glass
  const g = [pt(0.015, 0), pt(w - 0.015, 0), pt(w - 0.015, hh), pt(0.015, hh)];
  if (opts.arch) {
    g[2] = pt(w - 0.015, hh - 1.5);
    g.splice(3, 0, pt(w / 2, hh + 1.2));
    g[4] = pt(0.015, hh - 1.5);
  }
  poly(c, g);
  const gg = c.createLinearGradient(g[0][0], g[3][1], g[1][0], g[0][1]);
  gg.addColorStop(0, shade('#5f7d9c', sh));
  gg.addColorStop(1, shade('#2e4058', sh));
  c.fillStyle = gg;
  c.fill();
  // reflection + mullion
  c.strokeStyle = rgba('#ffffff', 0.45);
  c.lineWidth = 0.6;
  c.beginPath();
  const m1 = pt(w / 2, 0), m2 = pt(w / 2, hh);
  c.moveTo(...m1);
  c.lineTo(...m2);
  const m3 = pt(0.01, hh * 0.55), m4 = pt(w - 0.01, hh * 0.55);
  c.moveTo(...m3);
  c.lineTo(...m4);
  c.stroke();
  if (opts.shutters) {
    for (const s of [-0.06, w]) {
      const q = [pt(s, 0), pt(s + 0.055, 0), pt(s + 0.055, hh), pt(s, hh)];
      poly(c, q);
      c.fillStyle = shade(opts.shutters, sh);
      c.fill();
    }
  }
  if (opts.box) {
    // flower box
    const q = [pt(-0.03, -2.6), pt(w + 0.03, -2.6), pt(w + 0.03, -0.6), pt(-0.03, -0.6)];
    poly(c, q);
    c.fillStyle = shade('#8a5a3c', sh);
    c.fill();
    for (let i = 0; i < 4; i++) {
      const p = pt(0.01 + (i / 3) * (w - 0.02), -0.2);
      c.fillStyle = [opts.box, '#ffd166', '#ff8fab', '#7bc96f'][i % 4];
      c.beginPath();
      c.arc(p[0], p[1], 0.9, 0, 7);
      c.fill();
    }
  }
  // emissive
  const L = env.L;
  if (L && (opts.lit ?? 1) > 0) {
    const lit = opts.lit ?? 1;
    poly(L, g);
    L.fillStyle = `rgba(255,${190 + Math.round(hash(fixed, a, h) * 40)},110,${0.95 * lit})`;
    L.fill();
    const cpt = pt(w / 2, hh / 2);
    const rg = L.createRadialGradient(cpt[0], cpt[1], 0, cpt[0], cpt[1], 9);
    rg.addColorStop(0, `rgba(255,190,90,${0.35 * lit})`);
    rg.addColorStop(1, 'rgba(255,170,80,0)');
    L.fillStyle = rg;
    L.fillRect(cpt[0] - 10, cpt[1] - 10, 20, 20);
  }
}

/** A row of windows along a wall. */
export function windowRow(c: Ctx, face: 'L' | 'R', fixed: number, from: number, to: number, h: number, n: number, w = 0.16, hh = 7, opts: Parameters<typeof windowOn>[7] = {}) {
  if (n <= 0) return;
  const gap = (to - from - n * w) / (n + 1);
  for (let i = 0; i < n; i++) windowOn(c, face, fixed, from + gap + i * (w + gap), h, w, hh, { ...opts, lit: (opts.lit ?? 1) * (hash(fixed, from, h, i) < 0.82 ? 1 : 0.15) });
}

export function door(c: Ctx, face: 'L' | 'R', fixed: number, a: number, w = 0.18, hh = 10, col = '#7b4a2e', opts: { arch?: boolean; lamp?: boolean; awning?: string } = {}) {
  const pt = (s: number, z: number) => (face === 'L' ? P(a + s, fixed, z) : P(fixed, a + s, z));
  const sh = face === 'L' ? LIT.left : LIT.right;
  const fr = [pt(-0.025, 0), pt(w + 0.025, 0), pt(w + 0.025, hh + 1.2), pt(-0.025, hh + 1.2)];
  poly(c, fr);
  c.fillStyle = shade('#efe3cf', sh);
  c.fill();
  const d = [pt(0, 0), pt(w, 0), pt(w, hh), pt(0, hh)];
  if (opts.arch) d.splice(3, 0, pt(w / 2, hh + 2));
  poly(c, d);
  c.fillStyle = shade(col, sh);
  c.fill();
  c.strokeStyle = rgba(shade(col, 0.5), 0.7);
  c.lineWidth = 0.5;
  c.beginPath();
  const a1 = pt(w / 2, 0), a2 = pt(w / 2, hh);
  c.moveTo(...a1);
  c.lineTo(...a2);
  c.stroke();
  const k = pt(w * 0.8, hh * 0.45);
  c.fillStyle = '#ffd36b';
  c.fillRect(k[0] - 0.5, k[1] - 0.5, 1, 1);
  // step
  const st = [pt(-0.05, 0), pt(w + 0.05, 0), pt(w + 0.05, -1.2), pt(-0.05, -1.2)];
  poly(c, st);
  c.fillStyle = shade('#c9bba5', sh);
  c.fill();
  if (opts.awning) awning(c, face, fixed, a - 0.04, w + 0.08, hh + 2.5, opts.awning);
  if (opts.lamp && env.L) {
    const lp = pt(w + 0.06, hh + 1);
    c.fillStyle = '#ffe29a';
    c.beginPath();
    c.arc(lp[0], lp[1], 1, 0, 7);
    c.fill();
    const rg = env.L.createRadialGradient(lp[0], lp[1], 0, lp[0], lp[1], 12);
    rg.addColorStop(0, 'rgba(255,210,120,0.7)');
    rg.addColorStop(1, 'rgba(255,190,90,0)');
    env.L.fillStyle = rg;
    env.L.fillRect(lp[0] - 12, lp[1] - 12, 24, 24);
  }
}

/** Striped awning sticking out of a wall. */
export function awning(c: Ctx, face: 'L' | 'R', fixed: number, a: number, w: number, h: number, col: string, depth = 0.14) {
  const out = face === 'L' ? (s: number, z: number, d: number) => P(a + s, fixed + d, h + z) : (s: number, z: number, d: number) => P(fixed + d, a + s, h + z);
  const n = Math.max(3, Math.round(w / 0.06));
  for (let i = 0; i < n; i++) {
    const s0 = (i / n) * w, s1 = ((i + 1) / n) * w;
    const q = [out(s0, 0, 0), out(s1, 0, 0), out(s1, -4, depth), out(s0, -4, depth)];
    poly(c, q);
    c.fillStyle = i % 2 ? '#fbf3e4' : col;
    c.fill();
  }
  // scalloped edge
  c.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const p = out(((i + 0.5) / n) * w, -4, depth);
    c.beginPath();
    c.arc(p[0], p[1], 1.1, 0, Math.PI);
    c.fill();
  }
  outline(c, [out(0, 0, 0), out(w, 0, 0), out(w, -4, depth), out(0, -4, depth)], INK, 0.35, 0.6);
}

export function chimney(c: Ctx, u: number, v: number, h0: number, h1: number, col = '#9a5a45') {
  box(c, u - 0.05, v - 0.05, u + 0.05, v + 0.05, h0, h1, { col, tex: 'brick', k: 0.6 }, { col: '#3a3036' });
  return P(u, v, h1 + 1);
}

// ---------- round things ----------
const RX = 32 * Math.SQRT2, RY = 16 * Math.SQRT2;
export function ellipseAt(c: Ctx, u: number, v: number, h: number, r: number) {
  const [x, y] = P(u, v, h);
  c.beginPath();
  c.ellipse(x, y, r * RX * 0.72, r * RY * 0.72, 0, 0, Math.PI * 2);
}

export function cylinder(c: Ctx, u: number, v: number, r: number, h0: number, h1: number, m: Mat, topCol?: string) {
  const [x, y0] = P(u, v, h0);
  const y1 = y0 - (h1 - h0);
  const rx = r * RX * 0.72, ry = r * RY * 0.72;
  const g = c.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, shade(m.col, 0.98));
  g.addColorStop(0.35, shade(m.col, 1.12));
  g.addColorStop(1, shade(m.col, 0.62));
  c.beginPath();
  c.ellipse(x, y0, rx, ry, 0, 0, Math.PI);
  c.lineTo(x - rx, y1);
  c.ellipse(x, y1, rx, ry, 0, Math.PI, 0, true);
  c.closePath();
  c.fillStyle = g;
  c.fill();
  if (m.tex && m.tex !== 'none') {
    c.save();
    c.clip();
    c.strokeStyle = rgba(shade(m.col, 0.5), 0.3 * (m.k ?? 1));
    c.lineWidth = 0.55;
    if (m.tex === 'metal' || m.tex === 'vplank') {
      for (let i = 1; i < 10; i++) {
        const xx = x - rx + (Math.sin((i / 10) * Math.PI - Math.PI / 2) * 0.5 + 0.5) * 2 * rx;
        c.beginPath();
        c.moveTo(xx, y1);
        c.lineTo(xx, y0 + ry);
        c.stroke();
      }
    } else {
      const step = m.tex === 'brick' ? 3.2 : m.tex === 'stone' ? 5 : 3;
      for (let yy = y0 - step; yy > y1; yy -= step) {
        c.beginPath();
        c.ellipse(x, yy, rx, ry, 0, 0, Math.PI);
        c.stroke();
      }
    }
    c.restore();
  }
  c.beginPath();
  c.ellipse(x, y0, rx, ry, 0, 0, Math.PI);
  c.lineTo(x - rx, y1);
  c.ellipse(x, y1, rx, ry, 0, Math.PI, 0, true);
  c.closePath();
  c.strokeStyle = rgba(INK, OUTLINE_A);
  c.lineWidth = 0.9;
  c.stroke();
  if (topCol !== undefined) {
    c.beginPath();
    c.ellipse(x, y1, rx, ry, 0, 0, Math.PI * 2);
    c.fillStyle = snowy() ? '#f2f6fb' : topCol;
    c.fill();
    c.strokeStyle = rgba(INK, OUTLINE_A);
    c.stroke();
  }
  return { x, y: y1, rx, ry };
}

export function cone(c: Ctx, u: number, v: number, r: number, h0: number, h1: number, m: Mat) {
  const [x, y0] = P(u, v, h0);
  const rx = r * RX * 0.72, ry = r * RY * 0.72;
  const col = snowy() ? mix(m.col, '#f3f6fb', 0.75) : m.col;
  const g = c.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, shade(col, 1.0));
  g.addColorStop(0.4, shade(col, 1.12));
  g.addColorStop(1, shade(col, 0.66));
  c.beginPath();
  c.ellipse(x, y0, rx, ry, 0, 0, Math.PI);
  c.lineTo(x, y0 - (h1 - h0));
  c.closePath();
  c.fillStyle = g;
  c.fill();
  c.save();
  c.clip();
  c.strokeStyle = rgba(shade(col, 0.5), 0.28);
  c.lineWidth = 0.5;
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    c.beginPath();
    c.ellipse(x, y0 - (h1 - h0) * t, rx * (1 - t), ry * (1 - t), 0, 0, Math.PI);
    c.stroke();
  }
  c.restore();
  c.beginPath();
  c.ellipse(x, y0, rx, ry, 0, 0, Math.PI);
  c.lineTo(x, y0 - (h1 - h0));
  c.closePath();
  c.strokeStyle = rgba(INK, OUTLINE_A);
  c.lineWidth = 0.9;
  c.stroke();
}

export function dome(c: Ctx, u: number, v: number, r: number, h0: number, m: Mat, k = 1) {
  const [x, y0] = P(u, v, h0);
  const rx = r * RX * 0.72, ry = r * RY * 0.72;
  const hh = rx * 0.95 * k;
  const col = snowy() ? mix(m.col, '#f3f6fb', 0.6) : m.col;
  const g = c.createRadialGradient(x - rx * 0.35, y0 - hh * 0.65, 1, x, y0 - hh * 0.3, rx * 1.3);
  g.addColorStop(0, shade(col, 1.3));
  g.addColorStop(0.5, col);
  g.addColorStop(1, shade(col, 0.6));
  c.beginPath();
  c.ellipse(x, y0, rx, ry, 0, 0, Math.PI);
  c.ellipse(x, y0, rx, hh, 0, Math.PI, 0);
  c.closePath();
  c.fillStyle = g;
  c.fill();
  if (m.tex === 'glass') {
    c.save();
    c.clip();
    c.strokeStyle = 'rgba(255,255,255,0.45)';
    c.lineWidth = 0.6;
    for (let i = 1; i < 6; i++) {
      c.beginPath();
      c.ellipse(x, y0, rx * (i / 6), hh, 0, Math.PI, 0);
      c.stroke();
    }
    for (let i = 1; i < 4; i++) {
      c.beginPath();
      c.ellipse(x, y0 - hh * (i / 4) * 0.9, rx * Math.sqrt(1 - (i / 4) ** 2), ry * Math.sqrt(1 - (i / 4) ** 2), 0, 0, Math.PI);
      c.stroke();
    }
    c.restore();
  }
  c.beginPath();
  c.ellipse(x, y0, rx, ry, 0, 0, Math.PI);
  c.ellipse(x, y0, rx, hh, 0, Math.PI, 0);
  c.strokeStyle = rgba(INK, OUTLINE_A);
  c.lineWidth = 0.9;
  c.stroke();
  return { x, y: y0 - hh };
}

// ---------- nature ----------
export function seasonLeaf(base = '#6cb85a') {
  switch (env.season) {
    case 'spring':
      return mix(base, '#9be07a', 0.35);
    case 'autumn':
      return '#e0913a';
    case 'winter':
      return '#7d9a86';
    default:
      return base;
  }
}

export function blob(c: Ctx, x: number, y: number, r: number, col: string) {
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, shade(col, 1.22));
  g.addColorStop(0.65, col);
  g.addColorStop(1, shade(col, 0.68));
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = g;
  c.fill();
}

/** Deciduous / pine / palm / fern / blossom tree at (u,v). s = size multiplier. */
export function tree(c: Ctx, u: number, v: number, s = 1, kind: 'round' | 'pine' | 'palm' | 'fern' | 'fruit' | 'blossom' = 'round', seed = 0) {
  const [x, y] = P(u, v);
  const R = (i: number) => hash(seed, u * 13, v * 7, i);
  // shadow
  c.fillStyle = 'rgba(40,30,60,0.18)';
  c.beginPath();
  c.ellipse(x + 3 * s, y + 1, 8 * s, 3.6 * s, 0, 0, 7);
  c.fill();
  if (kind === 'pine') {
    c.fillStyle = '#6b4a33';
    c.fillRect(x - 1.2 * s, y - 6 * s, 2.4 * s, 6 * s);
    const col = env.season === 'winter' ? '#4f7a63' : '#3f8f5a';
    for (let i = 0; i < 3; i++) {
      const yy = y - 5 * s - i * 6 * s, w = (9 - i * 2.2) * s;
      c.beginPath();
      c.moveTo(x - w, yy);
      c.lineTo(x, yy - 11 * s);
      c.lineTo(x + w, yy);
      c.closePath();
      const g = c.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, shade(col, 1.15));
      g.addColorStop(1, shade(col, 0.7));
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = rgba(INK, 0.4);
      c.lineWidth = 0.6;
      c.stroke();
      if (snowy()) {
        c.beginPath();
        c.moveTo(x - w * 0.55, yy - 5 * s);
        c.lineTo(x, yy - 11 * s);
        c.lineTo(x + w * 0.4, yy - 5.5 * s);
        c.quadraticCurveTo(x, yy - 7 * s, x - w * 0.55, yy - 5 * s);
        c.fillStyle = '#f5f8fc';
        c.fill();
      }
    }
    return;
  }
  if (kind === 'palm' || kind === 'fern') {
    if (kind === 'palm') {
      c.strokeStyle = '#8a6a48';
      c.lineWidth = 2.2 * s;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + 3 * s, y - 12 * s, x + 1 * s, y - 22 * s);
      c.stroke();
    }
    const cx = kind === 'palm' ? x + s : x, cy = kind === 'palm' ? y - 22 * s : y - 2 * s;
    const n = kind === 'palm' ? 7 : 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R(i) * 0.4;
      const len = (kind === 'palm' ? 11 : 9) * s * (0.8 + R(i + 9) * 0.4);
      const ex = cx + Math.cos(a) * len, ey = cy + Math.sin(a) * len * 0.5 + (kind === 'palm' ? 4 * s : -3 * s);
      c.strokeStyle = shade(kind === 'palm' ? '#4f9d55' : '#3f8a4c', 0.85 + R(i + 3) * 0.35);
      c.lineWidth = 2.2 * s;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(cx, cy);
      c.quadraticCurveTo((cx + ex) / 2, Math.min(cy, ey) - 4 * s, ex, ey);
      c.stroke();
    }
    return;
  }
  // round / fruit / blossom
  const trunkH = 7 * s;
  c.fillStyle = '#7a5236';
  c.beginPath();
  c.moveTo(x - 1.6 * s, y);
  c.lineTo(x - 1 * s, y - trunkH);
  c.lineTo(x + 1 * s, y - trunkH);
  c.lineTo(x + 1.6 * s, y);
  c.fill();
  if (env.season === 'winter' && kind !== 'fruit') {
    c.strokeStyle = '#7a5236';
    c.lineWidth = 0.9 * s;
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (R(i) - 0.5) * 2;
      c.beginPath();
      c.moveTo(x, y - trunkH);
      c.lineTo(x + Math.cos(a) * 9 * s, y - trunkH + Math.sin(a) * 9 * s);
      c.stroke();
    }
    blob(c, x - 2 * s, y - trunkH - 6 * s, 2.5 * s, '#f3f7fb');
    return;
  }
  let col = seasonLeaf(kind === 'fruit' ? '#5aa452' : '#6cb85a');
  if (env.season === 'autumn') col = ['#e0913a', '#d9652e', '#e8b23c'][Math.floor(R(1) * 3)];
  if (kind === 'blossom' && env.season === 'spring') col = '#f4a7c4';
  const blobs: [number, number, number][] = [
    [-4, -2, 6.4], [4, -1, 6], [0, -7, 7], [-1, 1, 5.5],
  ];
  for (const [dx, dy, r] of blobs) blob(c, x + dx * s, y - trunkH - 3 * s + dy * s, r * s, shade(col, 0.92 + R(dx + 20) * 0.16));
  if (kind === 'fruit' && env.season !== 'winter') {
    for (let i = 0; i < 6; i++) {
      c.fillStyle = env.season === 'spring' ? '#ffffff' : '#e5483f';
      c.beginPath();
      c.arc(x + (R(i + 30) - 0.5) * 12 * s, y - trunkH - 4 * s + (R(i + 40) - 0.5) * 9 * s, 1.1 * s, 0, 7);
      c.fill();
    }
  }
  if (snowy()) blob(c, x, y - trunkH - 10 * s, 4 * s, '#f3f7fb');
}

export function bush(c: Ctx, u: number, v: number, s = 1, col = '#5ea85a', flowers?: string) {
  const [x, y] = P(u, v);
  const cc = env.season === 'autumn' ? '#b98a3a' : seasonLeaf(col);
  blob(c, x - 2.5 * s, y - 2 * s, 3.4 * s, cc);
  blob(c, x + 2.5 * s, y - 2 * s, 3 * s, shade(cc, 0.9));
  blob(c, x, y - 4 * s, 3.4 * s, shade(cc, 1.05));
  if (flowers && env.season !== 'winter') {
    for (let i = 0; i < 5; i++) {
      c.fillStyle = flowers;
      c.beginPath();
      c.arc(x + (hash(u, v, i) - 0.5) * 9 * s, y - 2 - hash(u, v, i + 5) * 5 * s, 0.9 * s, 0, 7);
      c.fill();
    }
  }
  if (snowy()) blob(c, x, y - 6 * s, 2.4 * s, '#f3f7fb');
}

export function flowers(c: Ctx, u0: number, v0: number, u1: number, v1: number, n: number, cols: string[], seed = 1) {
  if (env.season === 'winter') return;
  for (let i = 0; i < n; i++) {
    const u = u0 + hash(seed, i) * (u1 - u0), v = v0 + hash(seed, i, 3) * (v1 - v0);
    const [x, y] = P(u, v);
    c.strokeStyle = '#4c8a46';
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y - 2.5);
    c.stroke();
    c.fillStyle = cols[i % cols.length];
    c.beginPath();
    c.arc(x, y - 2.8, 1.1, 0, 7);
    c.fill();
  }
}

/** Ground pad (cobbles, paving, soil) under a building. */
export function pad(c: Ctx, u0: number, v0: number, u1: number, v1: number, kind: 'cobble' | 'paving' | 'soil' | 'grass' | 'plank' | 'dirt', seed = 1) {
  const pts = [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
  const base = { cobble: '#c9bfae', paving: '#d8d0c4', soil: '#8a6446', grass: '#8ccf6a', plank: '#b98a5a', dirt: '#b99a6e' }[kind];
  poly(c, pts);
  c.fillStyle = snowy() && kind !== 'plank' ? mix(base, '#eef3f8', 0.6) : base;
  c.fill();
  c.save();
  c.clip();
  if (kind === 'cobble' || kind === 'paving') {
    const n = kind === 'cobble' ? 7 : 4;
    c.strokeStyle = rgba(shade(base, 0.6), 0.45);
    c.lineWidth = 0.5;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let a = P(u0 + (u1 - u0) * t, v0), b = P(u0 + (u1 - u0) * t, v1);
      c.beginPath();
      c.moveTo(...a);
      c.lineTo(...b);
      a = P(u0, v0 + (v1 - v0) * t);
      b = P(u1, v0 + (v1 - v0) * t);
      c.moveTo(...a);
      c.lineTo(...b);
      c.stroke();
    }
    if (kind === 'cobble')
      for (let i = 0; i < 30; i++) {
        const p = P(u0 + hash(seed, i) * (u1 - u0), v0 + hash(seed, i, 1) * (v1 - v0));
        c.fillStyle = rgba(hash(seed, i, 2) < 0.5 ? '#ffffff' : '#6d6255', 0.25);
        c.fillRect(p[0], p[1], 1.6, 0.8);
      }
  } else if (kind === 'soil') {
    c.strokeStyle = rgba('#5a3d29', 0.5);
    c.lineWidth = 0.8;
    for (let i = 1; i < 8; i++) {
      const t = i / 8;
      const a = P(u0 + (u1 - u0) * t, v0), b = P(u0 + (u1 - u0) * t, v1);
      c.beginPath();
      c.moveTo(...a);
      c.lineTo(...b);
      c.stroke();
    }
  } else if (kind === 'plank') {
    c.strokeStyle = rgba('#6e4a2c', 0.55);
    c.lineWidth = 0.6;
    for (let i = 1; i < 9; i++) {
      const t = i / 9;
      const a = P(u0, v0 + (v1 - v0) * t), b = P(u1, v0 + (v1 - v0) * t);
      c.beginPath();
      c.moveTo(...a);
      c.lineTo(...b);
      c.stroke();
    }
  }
  c.restore();
  outline(c, pts, INK, 0.2, 0.6);
}

export function fence(c: Ctx, pts: [number, number][], col = '#f1e6d2', h = 4) {
  c.strokeStyle = shade(col, 0.8);
  c.lineWidth = 0.8;
  for (let i = 0; i < pts.length - 1; i++) {
    const [u0, v0] = pts[i], [u1, v1] = pts[i + 1];
    const n = Math.max(2, Math.round(Math.hypot(u1 - u0, v1 - v0) * 6));
    for (let j = 0; j <= n; j++) {
      const t = j / n;
      const a = P(u0 + (u1 - u0) * t, v0 + (v1 - v0) * t);
      c.beginPath();
      c.moveTo(a[0], a[1]);
      c.lineTo(a[0], a[1] - h);
      c.strokeStyle = shade(col, 0.75);
      c.stroke();
    }
    for (const z of [h * 0.45, h * 0.9]) {
      const a = P(u0, v0, z), b = P(u1, v1, z);
      c.beginPath();
      c.moveTo(...a);
      c.lineTo(...b);
      c.strokeStyle = col;
      c.stroke();
    }
  }
}

/** Little flag on a pole. phase animates in anim layer; static here. */
export function flagPole(c: Ctx, u: number, v: number, h0: number, h: number, col: string) {
  const [x, y] = P(u, v, h0);
  c.strokeStyle = '#6b6470';
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x, y - h);
  c.stroke();
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x, y - h);
  c.lineTo(x + 7, y - h + 2);
  c.lineTo(x, y - h + 4.5);
  c.fill();
}

export function lampGlow(L: Ctx | null, x: number, y: number, r = 14, a = 0.7, col = '255,205,120') {
  if (!L) return;
  const rg = L.createRadialGradient(x, y, 0, x, y, r);
  rg.addColorStop(0, `rgba(${col},${a})`);
  rg.addColorStop(1, `rgba(${col},0)`);
  L.fillStyle = rg;
  L.fillRect(x - r, y - r, r * 2, r * 2);
}

export function streetLamp(c: Ctx, u: number, v: number, h = 13) {
  const [x, y] = P(u, v);
  c.strokeStyle = '#3d3a46';
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x, y - h);
  c.stroke();
  c.fillStyle = '#3d3a46';
  c.fillRect(x - 1.8, y - h - 1, 3.6, 1.2);
  c.fillStyle = '#ffe7a3';
  c.beginPath();
  c.moveTo(x - 1.5, y - h - 1);
  c.lineTo(x + 1.5, y - h - 1);
  c.lineTo(x + 1, y - h - 4);
  c.lineTo(x - 1, y - h - 4);
  c.fill();
  lampGlow(env.L, x, y - h - 2.5, 16, 0.85);
}
