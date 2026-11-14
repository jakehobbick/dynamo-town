// Ride timelines. A timeline is a flat list of segments, each optionally tagged with the
// grid event it belongs to. Structured Plans chain events into a 30/45/60/90-minute workout.
import { G, now } from '../core/state';
import type { EventDef, Segment } from '../core/types';
import { dayKey, hash, rng } from '../core/util';
import { EVENT, EVENTS, eventSeconds } from '../data/events';

export interface TItem {
  seg: Segment;
  ev: string | null; // event id
  evIdx: number; // index into Ride.events, -1 for none
}

export const availableEvents = (): EventDef[] => EVENTS.filter((e) => (e.minTier ?? 0) <= G.s.tier);

/** Today's featured events (+25% rewards). Stable for the day. */
export function featured(): string[] {
  const d = dayKey(now());
  if (G.s.board && G.s.board.day === d) return G.s.board.ids;
  const av = availableEvents().map((e) => e.id);
  const r = rng(Math.floor(hash(d, G.s.seed) * 1e9));
  const ids: string[] = [];
  while (ids.length < Math.min(3, av.length)) {
    const id = av[Math.floor(r() * av.length)];
    if (!ids.includes(id)) ids.push(id);
  }
  G.s.board = { day: d, ids };
  return ids;
}
export const FEATURED_BONUS = 0.25;

const warm = (min: number): Segment => ({ kind: 'erg', dur: Math.round(min * 60), pct: 0.5, pctEnd: 0.68, label: 'Warm up the dynamo', work: false });
const cool = (min: number): Segment => ({ kind: 'erg', dur: Math.round(min * 60), pct: 0.6, pctEnd: 0.45, label: 'Cool down', work: false });
const easy = (min: number, label = 'Recover', pct = 0.55): Segment => ({ kind: 'erg', dur: Math.round(min * 60), pct, label, work: false });
const free = (min: number, label: string): Segment => ({ kind: 'free', dur: Math.round(min * 60), pct: 0.65, label, work: false });

export function eventTimeline(id: string): { items: TItem[]; events: string[] } {
  const e = EVENT[id];
  const items: TItem[] = [{ seg: free(5, 'Free warm-up: spin up the dynamo'), ev: null, evIdx: -1 }];
  for (const s of e.segments) items.push({ seg: s, ev: id, evIdx: 0 });
  items.push({ seg: free(600, 'Free ride: keep generating, end whenever you like'), ev: null, evIdx: -1 });
  return { items, events: [id] };
}

export function freeTimeline(): { items: TItem[]; events: string[] } {
  return { items: [{ seg: free(600, 'Free ride: pure generation, scaled by power zone'), ev: null, evIdx: -1 }], events: [] };
}

/** Chain events to fill `minutes`. Deterministic per day and length, so the preview matches the ride. */
export function planTimeline(minutes: number): { items: TItem[]; events: string[]; filler: number } {
  const total = minutes * 60;
  const wu = minutes >= 60 ? 8 : 6, cd = minutes >= 60 ? 5 : 4;
  let left = total - (wu + cd) * 60;
  const r = rng(Math.floor(hash(dayKey(now()), minutes, G.s.seed) * 1e9));
  const pool = availableEvents().filter((e) => e.id !== 'lantern' && e.id !== 'commute');
  const feat = featured();
  const chosen: EventDef[] = [];
  const gap = 120;
  // Prefer one featured, then a mix of intensities
  for (let guard = 0; guard < 50; guard++) {
    const fits = pool.filter((e) => eventSeconds(e) + (chosen.length ? gap : 0) <= left && !chosen.includes(e));
    if (!fits.length) break;
    // avoid two hard ones back to back
    const lastHard = chosen.length && ['storm', 'surge', 'heatwave', 'launch', 'crane', 'tide'].includes(chosen[chosen.length - 1].id);
    let cand = fits.filter((e) => !(lastHard && ['storm', 'heatwave', 'launch', 'crane', 'tide'].includes(e.id)));
    if (!cand.length) cand = fits;
    const f = cand.filter((e) => feat.includes(e.id));
    const pickFrom = !chosen.length && f.length ? f : cand;
    const e = pickFrom[Math.floor(r() * pickFrom.length)];
    left -= eventSeconds(e) + (chosen.length ? gap : 0);
    chosen.push(e);
  }
  const items: TItem[] = [{ seg: warm(wu), ev: null, evIdx: -1 }];
  chosen.forEach((e, i) => {
    if (i) items.push({ seg: easy(gap / 60, 'Between jobs: spin easy'), ev: null, evIdx: -1 });
    for (const s of e.segments) items.push({ seg: s, ev: e.id, evIdx: i });
  });
  if (left >= 60) items.push({ seg: { kind: 'erg', dur: left, pct: 0.66, label: 'Grid maintenance: steady Zone 2', work: false }, ev: null, evIdx: -1 });
  items.push({ seg: cool(cd), ev: null, evIdx: -1 });
  return { items, events: chosen.map((e) => e.id), filler: Math.max(0, left) };
}

export const timelineSecs = (items: TItem[]) => items.reduce((a, i) => a + i.seg.dur, 0);
