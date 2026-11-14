// Time of day, seasons, ocean, clouds and weather effects.
import { G, now } from '../core/state';
import { clamp, hash, lerp } from '../core/util';
import type { WeatherKind } from '../core/types';
import { RS } from './rstate';
import type { Season } from './terrain';
import { cam } from './iso';

const SEASONS: Season[] = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];

export function seasonNow(): Season {
  const m = G.s.settings.seasonMode;
  if (m === 'spring' || m === 'summer' || m === 'autumn' || m === 'winter') return m;
  const t = now();
  if (m === 'fast') {
    // one season per in-game week
    const wk = Math.floor(t / (7 * 86400000));
    return (['spring', 'summer', 'autumn', 'winter'] as Season[])[wk % 4];
  }
  return SEASONS[new Date(t).getMonth()];
}

export function hourNow(): number {
  const m = G.s.settings.timeMode;
  if (m === 'day') return 13;
  if (m === 'night') return 23;
  const d = new Date(now());
  const h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  if (m === 'fast') return ((performance.now() / 1000 / 600) * 24) % 24; // a 10-minute day
  return h;
}

/** Night factor and dusk tint from the hour, with season-dependent day length. */
export function lightFor(hour: number, season: Season) {
  const rise = season === 'summer' ? 5.8 : season === 'winter' ? 7.0 : 6.4;
  const set = season === 'summer' ? 20.2 : season === 'winter' ? 17.0 : 18.6;
  let night: number;
  if (hour < rise - 0.6 || hour > set + 0.9) night = 1;
  else if (hour < rise + 0.6) night = clamp(1 - (hour - (rise - 0.6)) / 1.2, 0, 1);
  else if (hour > set - 0.4) night = clamp((hour - (set - 0.4)) / 1.3, 0, 1);
  else night = 0;
  const dusk = Math.max(0, 1 - Math.min(Math.abs(hour - rise), Math.abs(hour - set)) / 1.1);
  return { night: night * 0.85, dusk: clamp(dusk, 0, 1) * 0.7 };
}

// ---------- weather ----------
let baseWeather: WeatherKind = 'clear';
let baseDay = '';
let override: WeatherKind | null = null;
export function setWeatherOverride(w: WeatherKind | null) {
  override = w;
}
function dailyWeather(season: Season): WeatherKind {
  const d = new Date(now());
  const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${Math.floor(d.getHours() / 6)}`;
  if (key === baseDay) return baseWeather;
  baseDay = key;
  const r = hash(key, G.s.seed);
  const table: Record<Season, [WeatherKind, number][]> = {
    spring: [['clear', 0.45], ['cloudy', 0.25], ['rain', 0.25], ['wind', 0.05]],
    summer: [['clear', 0.65], ['cloudy', 0.15], ['heat', 0.1], ['rain', 0.1]],
    autumn: [['clear', 0.35], ['cloudy', 0.25], ['rain', 0.2], ['wind', 0.1], ['fog', 0.1]],
    winter: [['clear', 0.3], ['cloudy', 0.25], ['snow', 0.35], ['fog', 0.1]],
  };
  let acc = 0;
  for (const [w, p] of table[season]) {
    acc += p;
    if (r < acc) return (baseWeather = w);
  }
  return (baseWeather = 'clear');
}

export function updateSky(dt: number) {
  RS.season = seasonNow();
  RS.hour = hourNow();
  const l = lightFor(RS.hour, RS.season);
  // storms darken the day
  const target = override || dailyWeather(RS.season);
  if (target !== RS.weather) {
    RS.weatherK -= dt * 0.6;
    if (RS.weatherK <= 0) {
      RS.weather = target;
      RS.weatherK = 0;
    }
  } else RS.weatherK = Math.min(1, RS.weatherK + dt * 0.4);
  const stormDark = RS.weather === 'storm' ? 0.45 * RS.weatherK : RS.weather === 'rain' || RS.weather === 'fog' ? 0.12 * RS.weatherK : 0;
  RS.night = lerp(RS.night, clamp(l.night + stormDark, 0, 0.92), Math.min(1, dt * 2));
  RS.dusk = l.dusk * (1 - stormDark);
  if (RS.flash > 0) RS.flash = Math.max(0, RS.flash - dt * 3);
  if (RS.weather === 'storm' && RS.weatherK > 0.5 && Math.random() < dt * 0.25) RS.flash = 1;
  if (RS.fireworks > 0) RS.fireworks -= dt;
}

// ---------- drawing ----------
let wavePat: CanvasPattern | null = null;
function waves(c: CanvasRenderingContext2D) {
  if (wavePat) return wavePat;
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 128;
  const g = cv.getContext('2d')!;
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = 1.2;
  for (let i = 0; i < 26; i++) {
    const x = hash(i, 1) * 256, y = hash(i, 2) * 128, w = 6 + hash(i, 3) * 10;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + w / 2, y - 2, x + w, y);
    g.stroke();
  }
  wavePat = c.createPattern(cv, 'repeat');
  return wavePat;
}

export function drawOcean(c: CanvasRenderingContext2D, W: number, H: number, t: number) {
  const n = RS.night;
  const top = RS.season === 'winter' ? '#7fb3cf' : '#6cc0dd';
  const bot = RS.season === 'winter' ? '#5f97b8' : '#4aa4c8';
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bot);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  const p = waves(c);
  if (p) {
    const ox = (-cam.x * cam.zoom * 0.9 + t * 6) % 256, oy = (-cam.y * cam.zoom * 0.9 + t * 3) % 128;
    c.save();
    c.translate(ox, oy);
    c.globalAlpha = 0.9 - n * 0.5;
    c.fillStyle = p;
    c.fillRect(-ox - 256, -oy - 128, W + 512, H + 256);
    c.restore();
  }
}

/** Global tint over ground (called before objects). */
export function tintGround(c: CanvasRenderingContext2D, W: number, H: number) {
  if (RS.night > 0.01) {
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha = RS.night;
    c.fillStyle = '#4a5590';
    c.fillRect(0, 0, W, H);
    c.restore();
  }
}

/** Atmosphere over everything: dusk glow, fog, storm flash, rain, snow, heat haze. */
export function drawAtmosphere(c: CanvasRenderingContext2D, W: number, H: number, t: number) {
  if (RS.dusk > 0.02) {
    c.save();
    c.globalCompositeOperation = 'soft-light';
    c.globalAlpha = RS.dusk * 0.7;
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#ff9a5a');
    g.addColorStop(1, '#ff5a8a');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  const k = RS.weatherK;
  const w = RS.weather;
  const lowFx = RS.lowFx;
  if ((w === 'rain' || w === 'storm') && k > 0) {
    const n = Math.round((w === 'storm' ? 240 : 140) * k * (lowFx ? 0.4 : 1));
    c.strokeStyle = `rgba(210,230,255,${0.45 * k})`;
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (hash(i, 1) * W * 1.2 + t * 160 * (0.8 + hash(i, 2) * 0.4)) % (W * 1.2) - W * 0.1;
      const y = (hash(i, 3) * H + t * 700 * (0.8 + hash(i, 4) * 0.4)) % H;
      c.moveTo(x, y);
      c.lineTo(x - 4, y + 14);
    }
    c.stroke();
  }
  if (w === 'snow' && k > 0) {
    const n = Math.round(160 * k * (lowFx ? 0.4 : 1));
    c.fillStyle = `rgba(255,255,255,${0.85 * k})`;
    for (let i = 0; i < n; i++) {
      const sp = 0.5 + hash(i, 5);
      const x = (hash(i, 1) * W + Math.sin(t * 0.8 + i) * 20 + t * 12) % W;
      const y = (hash(i, 3) * H + t * 40 * sp) % H;
      c.beginPath();
      c.arc(x, y, 1 + sp, 0, 7);
      c.fill();
    }
  }
  if (w === 'wind' && k > 0) {
    c.fillStyle = RS.season === 'autumn' ? 'rgba(220,130,60,0.8)' : 'rgba(140,200,110,0.8)';
    for (let i = 0; i < 30 * k; i++) {
      const x = (hash(i, 1) * W + t * 140 * (0.6 + hash(i, 2))) % W;
      const y = (hash(i, 3) * H + Math.sin(t * 2 + i) * 30) % H;
      c.save();
      c.translate(x, y);
      c.rotate(t * 3 + i);
      c.fillRect(-2, -1, 4, 2);
      c.restore();
    }
  }
  if (w === 'fog' && k > 0) {
    c.save();
    for (let i = 0; i < 5; i++) {
      const y = (hash(i, 9) * H + t * 4) % (H + 200) - 100;
      const g = c.createLinearGradient(0, y - 80, 0, y + 80);
      g.addColorStop(0, 'rgba(235,240,245,0)');
      g.addColorStop(0.5, `rgba(235,240,245,${0.22 * k})`);
      g.addColorStop(1, 'rgba(235,240,245,0)');
      c.fillStyle = g;
      c.fillRect(0, y - 80, W, 160);
    }
    c.restore();
  }
  if (w === 'heat' && k > 0) {
    c.save();
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = `rgba(255,170,80,${0.35 * k})`;
    c.fillRect(0, 0, W, H);
    c.restore();
  }
  if (w === 'cloudy' || w === 'rain' || w === 'storm' || w === 'clear' || w === 'wind') drawCloudShadows(c, W, H, t, w === 'clear' ? 0.35 : 1);
  if (RS.flash > 0) {
    c.fillStyle = `rgba(235,240,255,${RS.flash * 0.55})`;
    c.fillRect(0, 0, W, H);
  }
  if (RS.night > 0.5 && (w === 'clear' || w === 'festival')) {
    // fireflies / stars reflected as twinkles
    c.fillStyle = `rgba(255,250,220,${(RS.night - 0.5) * 1.2})`;
    for (let i = 0; i < 40; i++) {
      const x = hash(i, 11) * W, y = hash(i, 12) * H;
      const tw = 0.5 + 0.5 * Math.sin(t * 2 + i);
      c.fillRect(x, y, 1.2 * tw, 1.2 * tw);
    }
  }
}

function drawCloudShadows(c: CanvasRenderingContext2D, W: number, H: number, t: number, a: number) {
  c.save();
  c.globalAlpha = a * (0.12 + (RS.weather === 'storm' ? 0.08 : 0)) * (1 - RS.night * 0.8);
  c.fillStyle = '#2a3550';
  for (let i = 0; i < 5; i++) {
    const x = ((hash(i, 21) * 2 * W + t * (10 + i * 3) - cam.x * cam.zoom * 0.5) % (W * 2) + W * 2) % (W * 2) - W * 0.5;
    const y = ((hash(i, 22) * H - cam.y * cam.zoom * 0.5) % H + H) % H;
    const r = 120 + hash(i, 23) * 160;
    c.beginPath();
    c.ellipse(x, y, r * cam.zoom, r * 0.5 * cam.zoom, 0, 0, 7);
    c.fill();
  }
  c.restore();
}

// ---------- fireworks ----------
const shells: { x: number; y: number; t0: number; col: string }[] = [];
export function launchFireworks(sec = 6) {
  RS.fireworks = Math.max(RS.fireworks, sec);
}
export function drawFireworks(c: CanvasRenderingContext2D, W: number, H: number, t: number) {
  if (RS.fireworks > 0 && Math.random() < 0.06) shells.push({ x: W * (0.2 + Math.random() * 0.6), y: H * (0.12 + Math.random() * 0.3), t0: t, col: ['255,120,120', '255,220,120', '140,220,255', '200,150,255', '140,255,170'][Math.floor(Math.random() * 5)] });
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i];
    const age = t - s.t0;
    if (age > 1.8) {
      shells.splice(i, 1);
      continue;
    }
    const n = 22;
    for (let j = 0; j < n; j++) {
      const a = (j / n) * Math.PI * 2;
      const r = age * 60 * (1 - age * 0.2);
      const x = s.x + Math.cos(a) * r, y = s.y + Math.sin(a) * r + age * age * 18;
      c.fillStyle = `rgba(${s.col},${Math.max(0, 1 - age / 1.8)})`;
      c.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
    }
  }
}
