// The ride session: drives the trainer, scores grid events, credits energy, records 1 Hz samples.
import { emit } from '../core/bus';
import { G, now } from '../core/state';
import { clearActiveRide, markDirty, saveActiveRide, saveNow } from '../core/save';
import type { DistrictId, RideSummary, Segment } from '../core/types';
import { clamp, dayKey, weekKey } from '../core/util';
import { EVENT, segPct } from '../data/events';
import { BUILDING } from '../data/buildings';
import { creditEnergy, grant, mods } from '../sim/economy';
import { freeTileFor, place } from '../sim/town';
import { plotDistrict } from '../sim/map';
import { bot, gearCenterW, readSensors, sens, sim, type TrainerTarget } from './sensors';
import { applyTarget, status } from './trainer';
import { eventTimeline, FEATURED_BONUS, featured, freeTimeline, planTimeline, type TItem } from './plan';
import { summarize, zoneOf, ZONE_MULT, type Sample } from './metrics';
import { RS } from '../render/rstate';
import { setWeatherOverride, launchFireworks } from '../render/sky';
import { music, sfx } from '../audio/audio';

export interface EvRun {
  id: string;
  inBand: number; // seconds in band (or sprint credit)
  counted: number; // scored seconds
  sprintPeak: number;
  started: boolean;
  done: boolean;
  score: number;
  restored: number; // storm districts restored
  rewards?: Record<string, number>;
  full?: boolean;
}

export interface Ride {
  id: string;
  start: number;
  mode: 'event' | 'plan' | 'free';
  planMin: number;
  items: TItem[];
  events: EvRun[];
  idx: number; // current item
  segT: number; // seconds into current item
  t: number; // active seconds
  samples: Sample[];
  acc: { p: number; c: number; hr: number; n: number; t: number };
  kj: number;
  credited: number;
  bonusEnergy: number;
  overflowGold: number;
  paused: false | 'user' | 'signal' | 'coast';
  zoneSecs: number[];
  bias: number;
  before: string;
  built: string[];
  segInBand: number;
  segCounted: number;
  coast: number;
  finished: boolean;
  sprints: number;
  z2: number;
}

export let ride: Ride | null = null;

export function startRide(mode: Ride['mode'], arg: string | number = 0, before = '') {
  let tl: { items: TItem[]; events: string[] };
  if (mode === 'event') tl = eventTimeline(String(arg));
  else if (mode === 'plan') tl = planTimeline(Number(arg));
  else tl = freeTimeline();
  ride = {
    id: 'r' + now(),
    start: now(),
    mode,
    planMin: mode === 'plan' ? Number(arg) : 0,
    items: tl.items,
    events: tl.events.map((id) => ({ id, inBand: 0, counted: 0, sprintPeak: 0, started: false, done: false, score: 0, restored: 0 })),
    idx: 0,
    segT: 0,
    t: 0,
    samples: [],
    acc: { p: 0, c: 0, hr: 0, n: 0, t: 0 },
    kj: 0,
    credited: 0,
    bonusEnergy: 0,
    overflowGold: 0,
    paused: false,
    zoneSecs: [0, 0, 0, 0, 0, 0, 0, 0],
    bias: 0,
    before,
    built: [],
    segInBand: 0,
    segCounted: 0,
    coast: 0,
    finished: false,
    sprints: 0,
    z2: 0,
  };
  RS.riding = true;
  enterItem();
  emit('ride:start', ride);
  sfx('go');
  return ride;
}

export const curItem = () => (ride ? ride.items[Math.min(ride.idx, ride.items.length - 1)] : null);
export const curEvent = () => {
  const it = curItem();
  return it && it.ev ? ride!.events[it.evIdx] : null;
};

/** Current trainer target for the active item. */
export function target(): TrainerTarget {
  const it = curItem();
  if (!ride || !it) return { mode: 'idle' };
  if (ride.paused === 'user') return { mode: 'erg', w: G.s.settings.ftp * 0.4 };
  const s = it.seg;
  if (s.kind === 'erg' || s.kind === 'cadence') return { mode: 'erg', w: targetW(s, ride.segT) };
  return { mode: 'gear' };
}
export function targetW(s: Segment, t: number) {
  const bias = ride ? ride.bias : 0;
  const workBias = s.work ? bias : Math.min(0, bias);
  return Math.round(segPct(s, t) * G.s.settings.ftp * (1 + workBias));
}

function enterItem() {
  if (!ride) return;
  const it = curItem()!;
  ride.segT = 0;
  ride.segInBand = 0;
  ride.segCounted = 0;
  if (it.ev) {
    const ev = ride.events[it.evIdx];
    if (!ev.started) {
      ev.started = true;
      const d = EVENT[ev.id];
      setWeatherOverride(d.weather);
      RS.festival = d.weather === 'festival';
      if (ev.id === 'storm') {
        // the storm knocks out up to 5 districts; each work interval restores one
        const ds = [...new Set(G.s.plots.map(plotDistrict))] as DistrictId[];
        RS.blackout = new Set(ds.slice(0, 5));
      }
      emit('event:start', ev);
      sfx('event');
    } else sfx('segment');
  } else {
    setWeatherOverride(null);
    RS.festival = false;
    if (ride.idx > 0) sfx('segment');
  }
  music.target = it.seg.work ? 0.85 : it.ev ? 0.45 : 0.2;
  applyTarget(target(), true, it.seg.kind === 'sprint');
  emit('ride:segment', it);
}

function finishItem() {
  if (!ride) return;
  const it = curItem()!;
  if (it.ev) {
    const ev = ride.events[it.evIdx];
    if (it.seg.work && ev.id === 'storm' && RS.blackout.size) {
      const first = [...RS.blackout][0];
      RS.blackout.delete(first);
      ev.restored++;
      emit('toast', `💡 District restored!`);
    }
    const nextIt = ride.items[ride.idx + 1];
    if (!nextIt || nextIt.evIdx !== it.evIdx || nextIt.ev !== it.ev) completeEvent(ev);
  }
  ride.idx++;
  if (ride.idx >= ride.items.length) {
    // timeline exhausted: keep free riding
    ride.items.push({ seg: { kind: 'free', dur: 3600, pct: 0.65, label: 'Free ride: end whenever you like', work: false }, ev: null, evIdx: -1 });
    if (ride.mode === 'plan') emit('plan:complete');
  }
  enterItem();
}

export function eventScore(ev: EvRun) {
  return ev.counted > 0 ? clamp(ev.inBand / ev.counted, 0, 1) : 0;
}

function completeEvent(ev: EvRun) {
  if (ev.done || !ride) return;
  ev.done = true;
  ev.score = eventScore(ev);
  const d = EVENT[ev.id];
  const m = mods();
  const full = ev.score >= 0.8;
  ev.full = full;
  const feat = featured().includes(ev.id) ? FEATURED_BONUS : 0;
  const k = (full ? 1 : ev.score) * (1 + m.boost.eventReward + feat);
  const rw: Record<string, number> = {};
  for (const [key, v] of Object.entries(d.reward)) {
    if (key === 'happiness') continue;
    if (key === 'sparks') rw.sparks = full ? (v as number) : Math.floor((v as number) * ev.score);
    else rw[key] = Math.round((v as number) * k);
  }
  ev.rewards = rw;
  grant(rw as any);
  ride.bonusEnergy += rw.energy || 0;
  G.s.festive = Math.min(15, G.s.festive + d.reward.happiness * (full ? 1 : ev.score));
  const st = (G.s.stats.events[ev.id] ||= { tries: 0, full: 0, partial: 0, best: 0 });
  st.tries++;
  if (full) st.full++;
  else if (ev.score >= 0.3) st.partial++;
  st.best = Math.max(st.best, ev.score);
  // a decoration lands in town as a keepsake for a full completion
  if (full && d.decor && BUILDING[d.decor]) {
    const spot = freeTileFor(d.decor, d.district);
    if (spot) {
      const b = place(d.decor, spot.x, spot.y, true);
      if (b) ride.built.push(BUILDING[d.decor].name);
    }
  }
  if (ev.id === 'storm') RS.blackout.clear();
  if (full && (G.s.research.includes('fireworks') || ev.id === 'festival')) launchFireworks(8);
  if (ev.id === 'surge') RS.surge = 1;
  sfx(full ? 'success' : 'partial');
  emit('event:done', ev);
  markDirty();
}

let checkpointT = 0;
/** Advance the ride by dt real seconds. */
export function updateRide(dtReal: number) {
  if (!ride) return;
  const dt = dtReal * (sim.bot && sens.src === 'sim' ? sim.speed : 1);
  const t = target();
  // bot intent
  const it = curItem()!;
  const ftp = G.s.settings.ftp;
  if (it.seg.kind === 'sprint') bot.want = { w: ftp * 1.75, cad: 112, sprint: true };
  else if (it.seg.kind === 'free') bot.want = { w: ftp * 0.7, cad: 88, sprint: false };
  else bot.want = { w: targetW(it.seg, ride.segT), cad: it.seg.rpm ? it.seg.rpm + 4 : 90, sprint: false };
  readSensors(dtReal, t);
  // trainer resistance follows the target (and virtual gearing follows cadence)
  applyTarget(t, false, it.seg.kind === 'sprint');
  // pause on signal loss
  if (sens.src === 'ble' && !status.trainerOK) {
    if (ride.paused !== 'signal') {
      ride.paused = 'signal';
      emit('ride:paused', 'signal');
    }
  } else if (ride.paused === 'signal') {
    ride.paused = false;
    emit('ride:resumed');
    applyTarget(target(), true);
  }
  // auto-pause when coasting for 6 s; resume as soon as you pedal
  const p = sens.power;
  if (ride.paused !== 'user' && ride.paused !== 'signal') {
    if (p < 5 && sens.cad < 5) {
      ride.coast += dtReal;
      if (ride.coast > 6 && ride.paused !== 'coast') {
        ride.paused = 'coast';
        emit('ride:paused', 'coast');
      }
    } else {
      ride.coast = 0;
      if (ride.paused === 'coast') {
        ride.paused = false;
        emit('ride:resumed');
      }
    }
  }
  if (ride.paused) {
    music.target = 0.1;
    return;
  }
  // ---- energy ----
  const kj = (p * dt) / 1000;
  const zone = zoneOf(p, ftp);
  const zm = it.seg.kind === 'free' ? ZONE_MULT[zone] : 1;
  const credit = kj * (1 + mods().boost.rideEnergy) * zm;
  ride.kj += kj;
  ride.credited += credit;
  G.s.lifetimeKJ += kj;
  ride.overflowGold += creditEnergy(credit);
  // ---- scoring ----
  const s = it.seg;
  if (s.work && it.ev) {
    const ev = ride.events[it.evIdx];
    if (s.kind === 'sprint') {
      ev.sprintPeak = Math.max(ev.sprintPeak, sens.power3s);
      const k = clamp(p / (ftp * 1.4), 0, 1);
      ev.inBand += k * dt;
      ev.counted += dt;
      ride.segInBand += k * dt;
      ride.segCounted += dt;
    } else if (ride.segT > 8) {
      // ignore the first 8 s while ERG ramps
      const tw = targetW(s, ride.segT);
      let ok = Math.abs(p - tw) <= tw * 0.05;
      if (s.kind === 'cadence' && s.rpm) ok = ok && sens.cad >= s.rpm - 3;
      if (ok) {
        ev.inBand += dt;
        ride.segInBand += dt;
      }
      ev.counted += dt;
      ride.segCounted += dt;
    }
  }
  // ---- samples (1 Hz) ----
  const a = ride.acc;
  a.p += p * dt;
  a.c += sens.cad * dt;
  a.hr += sens.hr * dt;
  a.n += dt;
  while (a.n >= 1) {
    const sp: Sample = { t: ride.start + Math.round((ride.t + 1) * 1000), p: Math.round(a.p / a.n), c: Math.round(a.c / a.n), hr: Math.round(a.hr / a.n) };
    // with time acceleration (bot) a frame can span several seconds: replicate the average
    ride.samples.push(sp);
    ride.zoneSecs[zoneOf(sp.p, ftp)]++;
    if (zoneOf(sp.p, ftp) === 2) ride.z2++;
    ride.t += 1;
    a.p -= sp.p;
    a.c -= sp.c;
    a.hr -= sp.hr;
    a.n -= 1;
    if (a.n < 1) {
      a.p = Math.max(0, a.p);
      a.c = Math.max(0, a.c);
      a.hr = Math.max(0, a.hr);
    }
  }
  // ---- timeline ----
  ride.segT += dt;
  while (ride.segT >= curItem()!.seg.dur) {
    const over = ride.segT - curItem()!.seg.dur;
    finishItem();
    ride.segT = over;
  }
  // grid activity & visuals
  RS.grid = 0.4 + clamp(sens.powerSm / ftp, 0, 1.2);
  if (RS.surge > 0) RS.surge = Math.max(0, RS.surge - dtReal * 0.2);
  // checkpoint
  checkpointT += dtReal;
  if (checkpointT > 30) {
    checkpointT = 0;
    saveActiveRide(liteRide());
    markDirty();
  }
}

export function liteRide() {
  if (!ride) return null;
  return { id: ride.id, start: ride.start, mode: ride.mode, planMin: ride.planMin, samples: ride.samples, kj: ride.kj, credited: ride.credited, events: ride.events, zoneSecs: ride.zoneSecs, bonusEnergy: ride.bonusEnergy, built: ride.built, sprints: ride.sprints, z2: ride.z2 };
}

export function shift(d: number) {
  if (!ride) return;
  const it = curItem()!;
  if ((it.seg.kind === 'erg' || it.seg.kind === 'cadence') && G.s.settings.gears === 'virtual') {
    ride.bias = clamp(ride.bias + d * 0.02, -0.2, 0.1);
    emit('toast', `ERG ${ride.bias >= 0 ? '+' : ''}${Math.round(ride.bias * 100)}% → ${targetW(it.seg, ride.segT)} W`);
  } else {
    G.s.settings.gear = clamp(G.s.settings.gear + d, 1, 24);
    emit('gear', G.s.settings.gear, Math.round(gearCenterW()));
  }
  applyTarget(target(), true, it.seg.kind === 'sprint');
  sfx('shift');
}

export function togglePause() {
  if (!ride) return;
  if (ride.paused === 'user') {
    ride.paused = false;
    emit('ride:resumed');
  } else {
    ride.paused = 'user';
    emit('ride:paused', 'user');
  }
  applyTarget(target(), true);
}

export function skipSegment() {
  if (!ride) return;
  ride.segT = curItem()!.seg.dur;
}

/** End the ride: finalize events, stats and the ride log. Returns the summary for the post-ride screen. */
export function endRide(): { summary: RideSummary; ride: Ride; m: ReturnType<typeof summarize> } | null {
  if (!ride || ride.finished) return null;
  const r = ride;
  r.finished = true;
  // an event in progress gets partial credit for what you did
  for (const ev of r.events) if (ev.started && !ev.done) completeEvent(ev);
  setWeatherOverride(null);
  RS.blackout.clear();
  RS.festival = false;
  RS.riding = false;
  music.target = 0;
  applyTarget({ mode: 'idle' }, true);
  const m = summarize(r.samples, G.s.settings.ftp);
  const st = G.s.stats;
  const minutes = r.samples.length / 60;
  if (r.samples.length >= 60) {
    st.rides++;
    if (r.mode === 'plan') {
      if (r.t >= r.planMin * 60 * 0.95) st.plans[String(r.planMin)] = (st.plans[String(r.planMin)] || 0) + 1;
    }
  }
  st.rideSecs += r.samples.length;
  st.maxRideKJ = Math.max(st.maxRideKJ, r.kj);
  st.z2min += r.z2 / 60;
  const sprints = r.samples.length ? countSprints(r.samples.map((s) => s.p), G.s.settings.ftp) : 0;
  st.sprints += sprints;
  for (const k of Object.keys(m.bests) as (keyof typeof m.bests)[]) st.bests[k] = Math.max(st.bests[k], Math.round(m.bests[k]));
  const dk = dayKey(r.start);
  st.daily[dk] = (st.daily[dk] || 0) + r.kj;
  const wk = weekKey(r.start);
  const w = (st.weeks[wk] ||= { rides: 0, kj: 0, events: 0, minutes: 0 });
  if (r.samples.length >= 60) w.rides++;
  w.kj += r.kj;
  w.minutes += minutes;
  w.events += r.events.filter((e) => e.full).length;
  const summary: RideSummary = {
    id: r.id,
    start: r.start,
    secs: r.samples.length,
    kj: r.kj,
    credited: r.credited + r.bonusEnergy,
    avg: m.avg,
    np: m.np,
    maxP: m.maxP,
    avgHr: m.avgHr,
    mode: r.mode,
    events: r.events.filter((e) => e.started).map((e) => ({ id: e.id, score: e.score })),
    source: 'game',
    bests: { p1: Math.round(m.bests.p1), p5: Math.round(m.bests.p5), p20: Math.round(m.bests.p20) },
  };
  if (r.samples.length >= 30) {
    G.s.rides.unshift(summary);
    if (G.s.rides.length > 400) G.s.rides.length = 400;
  }
  emit('ride:finished', { summary, ride: r, m, sprints, minutes });
  // keep the samples for TCX export of the last ride
  lastRide = r;
  ride = null;
  clearActiveRide();
  saveNow();
  return { summary, ride: r, m };
}

export let lastRide: Ride | null = null;

export function countSprints(ps: number[], ftp: number) {
  let n = 0, run = 0;
  for (const p of ps) {
    if (p >= ftp * 1.5) run++;
    else {
      if (run >= 5) n++;
      run = 0;
    }
  }
  if (run >= 5) n++;
  return n;
}
