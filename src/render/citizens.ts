// Little townsfolk who wander between buildings on free tiles (BFS paths).
import { G } from '../core/state';
import { hash } from '../core/util';
import { N, buildable, plotOf } from '../sim/map';
import { getWorld, occupancy } from '../sim/town';
import { RS } from './rstate';

export interface Walker {
  x: number;
  y: number;
  path: [number, number][];
  speed: number;
  seed: number;
  wait: number;
  dir: number;
}
export const walkers: Walker[] = [];

const SKIN = ['#f2c9a5', '#e0ac85', '#c68a62', '#8d5a3b', '#f6d7bd'];
const SHIRT = ['#e8735a', '#5a7fa8', '#5f9a6b', '#f5d478', '#b7a6dc', '#e98a8a', '#3e4a6b', '#9fd8b4'];
const HAIR = ['#3a2a24', '#6b4a33', '#d9a441', '#2b2a3a', '#a85a3a', '#e6e0d8'];

function walkable(x: number, y: number) {
  if (x < 0 || y < 0 || x >= N || y >= N) return false;
  if (!G.s.plots.includes(plotOf(x, y))) return false;
  if (!buildable(getWorld().terrain[y * N + x])) return false;
  return occupancy()[y * N + x] === 0;
}

function bfs(sx: number, sy: number, maxLen = 24): [number, number][] {
  // random walk target: BFS to a random reachable tile at distance 4..maxLen
  const prev = new Int32Array(N * N).fill(-1);
  const q: number[] = [sy * N + sx];
  prev[sy * N + sx] = sy * N + sx;
  const reach: number[] = [];
  let head = 0;
  const dist = new Int16Array(N * N);
  while (head < q.length && q.length < 600) {
    const i = q[head++];
    const x = i % N, y = (i / N) | 0;
    if (dist[i] >= 4) reach.push(i);
    if (dist[i] >= maxLen) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, ni = ny * N + nx;
      if (nx < 0 || ny < 0 || nx >= N || ny >= N || prev[ni] !== -1 || !walkable(nx, ny)) continue;
      prev[ni] = i;
      dist[ni] = dist[i] + 1;
      q.push(ni);
    }
  }
  if (!reach.length) return [];
  let cur = reach[Math.floor(Math.random() * reach.length)];
  const path: [number, number][] = [];
  while (cur !== sy * N + sx) {
    path.push([cur % N, (cur / N) | 0]);
    cur = prev[cur];
  }
  return path.reverse();
}

function spawnPoint(): [number, number] | null {
  for (let tries = 0; tries < 40; tries++) {
    const b = G.s.buildings[Math.floor(Math.random() * G.s.buildings.length)];
    const cx = b ? b.x : 19, cy = b ? b.y : 19;
    const x = cx + Math.floor(Math.random() * 5) - 2, y = cy + Math.floor(Math.random() * 5) - 2;
    if (walkable(x, y)) return [x, y];
  }
  return null;
}

export function updateWalkers(dt: number) {
  const pop = G.s.pop;
  const want = Math.min(RS.lowFx ? 14 : 34, Math.floor(pop / 4) + (pop > 0 ? 2 : 0)) * (RS.night > 0.6 ? 0.45 : 1);
  if (walkers.length < want && Math.random() < dt * 2) {
    const p = spawnPoint();
    if (p) walkers.push({ x: p[0] + 0.5, y: p[1] + 0.5, path: [], speed: 0.45 + Math.random() * 0.35, seed: Math.floor(Math.random() * 1e6), wait: Math.random() * 2, dir: 1 });
  } else if (walkers.length > want + 1) walkers.pop();
  for (const w of walkers) {
    if (w.wait > 0) {
      w.wait -= dt;
      continue;
    }
    if (!w.path.length) {
      w.path = bfs(Math.floor(w.x), Math.floor(w.y));
      if (!w.path.length) {
        w.wait = 2 + Math.random() * 3;
        continue;
      }
    }
    const [tx, ty] = w.path[0];
    const gx = tx + 0.5, gy = ty + 0.5;
    const dx = gx - w.x, dy = gy - w.y;
    const d = Math.hypot(dx, dy);
    const step = w.speed * dt * (RS.riding ? 1.25 : 1);
    if (d <= step) {
      w.x = gx;
      w.y = gy;
      w.path.shift();
      if (!w.path.length) w.wait = 1 + Math.random() * 4;
      else if (!walkable(w.path[0][0], w.path[0][1])) w.path = [];
    } else {
      w.x += (dx / d) * step;
      w.y += (dy / d) * step;
      w.dir = dx - dy >= 0 ? 1 : -1;
    }
  }
}

/** Draw one walker at screen position (sx, sy) = feet, scale z. */
export function drawWalker(c: CanvasRenderingContext2D, w: Walker, sx: number, sy: number, z: number, t: number) {
  const s = z * 0.95;
  const moving = w.path.length > 0 && w.wait <= 0;
  const ph = t * 9 * w.speed + w.seed;
  const bob = moving ? Math.abs(Math.sin(ph)) * 0.8 * s : 0;
  const skin = SKIN[w.seed % SKIN.length], shirt = SHIRT[(w.seed >> 3) % SHIRT.length], hair = HAIR[(w.seed >> 6) % HAIR.length];
  c.fillStyle = 'rgba(40,30,60,0.22)';
  c.beginPath();
  c.ellipse(sx, sy, 2.6 * s, 1.2 * s, 0, 0, 7);
  c.fill();
  // legs
  c.strokeStyle = '#3e4a6b';
  c.lineWidth = 1.1 * s;
  const sw = moving ? Math.sin(ph) * 1.4 * s : 0;
  c.beginPath();
  c.moveTo(sx - 0.7 * s, sy - 3.4 * s - bob);
  c.lineTo(sx - 0.7 * s + sw, sy);
  c.moveTo(sx + 0.7 * s, sy - 3.4 * s - bob);
  c.lineTo(sx + 0.7 * s - sw, sy);
  c.stroke();
  // body
  c.fillStyle = shirt;
  c.beginPath();
  c.ellipse(sx, sy - 5.2 * s - bob, 2 * s, 2.6 * s, 0, 0, 7);
  c.fill();
  // head
  c.fillStyle = skin;
  c.beginPath();
  c.arc(sx, sy - 9 * s - bob, 1.7 * s, 0, 7);
  c.fill();
  c.fillStyle = hair;
  c.beginPath();
  c.arc(sx, sy - 9.4 * s - bob, 1.75 * s, Math.PI, 0);
  c.fill();
  if ((RS.weather === 'rain' || RS.weather === 'storm') && RS.weatherK > 0.4) {
    c.fillStyle = ['#e8735a', '#5a7fa8', '#f5d478', '#5f9a6b'][w.seed % 4];
    c.beginPath();
    c.ellipse(sx, sy - 12 * s - bob, 4.2 * s, 1.8 * s, 0, Math.PI, 0);
    c.fill();
    c.strokeStyle = '#3d3a46';
    c.lineWidth = 0.5 * s;
    c.beginPath();
    c.moveTo(sx, sy - 12 * s - bob);
    c.lineTo(sx, sy - 7 * s - bob);
    c.stroke();
  } else if (RS.season === 'winter' && hash(w.seed) < 0.6) {
    c.fillStyle = ['#e5483f', '#5a7fa8', '#5f9a6b'][w.seed % 3];
    c.fillRect(sx - 1.8 * s, sy - 7.6 * s - bob, 3.6 * s, 0.9 * s);
  }
}
