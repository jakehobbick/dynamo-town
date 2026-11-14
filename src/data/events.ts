// Grid demand events: each is a workout. Percentages are of FTP.
// ERG segments are held by the trainer; the compliance band is ±5% of target.
// Segments with work:false (warm-ups, recoveries) do not affect the score.
import type { EventDef, Segment } from '../core/types';

const erg = (min: number, pct: number, label: string, work = true, pctEnd?: number): Segment => ({ kind: 'erg', dur: Math.round(min * 60), pct, label, work, pctEnd });
const rec = (min: number, pct = 0.5, label = 'Recover'): Segment => erg(min, pct, label, false);
const sprint = (sec: number, label = 'SPRINT!'): Segment => ({ kind: 'sprint', dur: sec, pct: 1.5, label, work: true });
const cad = (min: number, pct: number, rpm: number, label: string): Segment => ({ kind: 'cadence', dur: Math.round(min * 60), pct, rpm, label, work: true });

function reps<T>(n: number, f: (i: number) => T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(...f(i));
  return out;
}

export const EVENTS: EventDef[] = [
  {
    id: 'factory', name: 'Factory Order', icon: '🏭', workout: 'Sweet spot', zone: 'Z3–Z4',
    desc: 'The Copperworks has a rush order. Hold 90% FTP for 10 minutes to finish the production run.',
    district: 'industry', weather: 'cloudy',
    segments: [rec(2, 0.6, 'Spin up the line'), erg(10, 0.9, 'Production run'), rec(2, 0.55, 'Cool the presses')],
    reward: { energy: 120, sparks: 1, happiness: 4, materials: 120 }, decor: 'lamppost',
  },
  {
    id: 'storm', name: 'Storm Blackout', icon: '⛈️', workout: 'VO2 max', zone: 'Z5',
    desc: 'Lightning knocked out the grid. Each 3-minute push at 115% restores one district.',
    district: 'residential', weather: 'storm',
    segments: [rec(3, 0.6, 'Batten down'), ...reps(5, (i) => [erg(3, 1.15, `Restore district ${i + 1}/5`), ...(i < 4 ? [rec(3, 0.5, 'Reroute power')] : [])]), rec(2, 0.5, 'Lights back on')],
    reward: { energy: 220, sparks: 2, happiness: 8, gold: 80 }, decor: 'lightningrod',
  },
  {
    id: 'festival', name: 'Festival Night', icon: '🏮', workout: 'Endurance', zone: 'Z2',
    desc: 'Steady Zone 2 for 45 minutes keeps every lantern lit for the festival.',
    district: 'residential', weather: 'festival',
    segments: [erg(5, 0.55, 'Light the lanterns', false, 0.65), erg(45, 0.68, 'Keep the festival lit'), rec(3, 0.5, 'Last dance')],
    reward: { energy: 260, sparks: 1, happiness: 12, food: 80, gold: 60 }, decor: 'arch',
  },
  {
    id: 'surge', name: 'Lightning Surge', icon: '⚡', workout: 'Sprints', zone: 'Z7',
    desc: 'A surge is coming. Three 20-second all-out sprints charge the capacitor tower.',
    district: 'industry', weather: 'storm',
    segments: [rec(3, 0.6, 'Prime the coils'), ...reps(3, (i) => [sprint(20, `SURGE ${i + 1}/3 · ALL OUT`), rec(3, 0.45, 'Capacitor settling')])],
    reward: { energy: 100, sparks: 2, happiness: 4, materials: 60 }, decor: 'lightningrod',
  },
  {
    id: 'tide', name: 'Harbor Tide', icon: '🌊', workout: 'Over-unders', zone: 'Z4',
    desc: 'Pump the locks against the tide: 2 min at 95%, then 1 min surge at 105%, four times.',
    district: 'harbor', weather: 'fog', minTier: 2,
    segments: [rec(3, 0.6, 'Open the sluices'), ...reps(4, (i) => [erg(2, 0.95, `Hold the lock ${i + 1}/4`), erg(1, 1.05, 'Over the tide!'), ...(i < 3 ? [rec(2, 0.5, 'Slack water')] : [])]), rec(2, 0.5, 'Boats home')],
    reward: { energy: 180, sparks: 2, happiness: 6, gold: 120 }, decor: 'crane',
  },
  {
    id: 'harvest', name: 'Harvest Haul', icon: '🚜', workout: 'Tempo', zone: 'Z3',
    desc: 'Power the threshers for two 12-minute tempo blocks at 80% to bring the harvest in.',
    district: 'farms', weather: 'clear',
    segments: [rec(3, 0.6, 'Fuel the tractors'), erg(12, 0.8, 'First field'), rec(3, 0.55, 'Load the carts'), erg(12, 0.8, 'Second field'), rec(2, 0.5, 'Barn doors shut')],
    reward: { energy: 200, sparks: 1, happiness: 6, food: 180 }, decor: 'tree',
  },
  {
    id: 'crane', name: 'Bridge Raising', icon: '🌉', workout: 'Threshold', zone: 'Z4',
    desc: 'Lift the new bridge span: two 8-minute holds at 100% FTP.',
    district: 'harbor', weather: 'wind', minTier: 1,
    segments: [rec(4, 0.6, 'Tension the cables', ), erg(8, 1.0, 'Lift span one'), rec(4, 0.5, 'Bolt it down'), erg(8, 1.0, 'Lift span two'), rec(3, 0.5, 'Ribbon cutting')],
    reward: { energy: 220, sparks: 2, happiness: 6, materials: 160 }, decor: 'statue',
  },
  {
    id: 'heatwave', name: 'Heat Wave', icon: '🥵', workout: '30/30s', zone: 'Z5–Z6',
    desc: 'Every air conditioner in town just switched on. Ten 30-second bursts at 130%.',
    district: 'residential', weather: 'heat',
    segments: [rec(3, 0.6, 'Open the windows'), ...reps(10, (i) => [erg(0.5, 1.3, `Cooling burst ${i + 1}/10`), erg(0.5, 0.5, 'Breathe', false)]), rec(3, 0.5, 'Evening breeze')],
    reward: { energy: 150, sparks: 2, happiness: 5, gold: 60 },
  },
  {
    id: 'nightshift', name: 'Night Shift', icon: '🌙', workout: 'Cadence drills', zone: 'Z2–Z3',
    desc: 'Spin the looms fast and light: six 1-minute spin-ups at 105+ rpm, steady watts.',
    district: 'industry', weather: 'clear',
    segments: [rec(3, 0.6, 'Clock in'), ...reps(6, (i) => [cad(1, 0.72, 105, `Spin-up ${i + 1}/6 · 105+ rpm`), erg(1, 0.62, 'Easy', false)]), rec(2, 0.5, 'Clock out')],
    reward: { energy: 110, sparks: 1, happiness: 4, materials: 80 },
  },
  {
    id: 'commute', name: 'Morning Commute', icon: '🚋', workout: 'Progressive warm-up', zone: 'Z1–Z3',
    desc: 'Wake the town gently: a 12-minute ramp from 50% to 80% as the trams start rolling.',
    district: 'residential', weather: 'clear',
    segments: [erg(12, 0.5, 'Trams rolling out', true, 0.8), rec(2, 0.55, 'Everyone at work')],
    reward: { energy: 60, sparks: 0, happiness: 3, gold: 30 },
  },
  {
    id: 'lantern', name: 'Lantern Walk', icon: '🕯️', workout: 'Recovery', zone: 'Z1',
    desc: 'A slow evening stroll through town at 50%. Perfect for tired legs.',
    district: 'residential', weather: 'cloudy',
    segments: [erg(20, 0.5, 'Stroll with the lanterns')],
    reward: { energy: 70, sparks: 0, happiness: 6, food: 30 },
  },
  {
    id: 'launch', name: 'Airship Launch', icon: '🎈', workout: 'Pyramid', zone: 'Z5',
    desc: 'Fill the envelope: a 1-2-3-2-1 minute pyramid at 110% to lift the first airship.',
    district: 'sky', weather: 'wind', minTier: 3,
    segments: [rec(3, 0.6, 'Unfurl the envelope'), erg(1, 1.1, 'Lift 1 min'), rec(1), erg(2, 1.1, 'Lift 2 min'), rec(2), erg(3, 1.1, 'Lift 3 min'), rec(2), erg(2, 1.1, 'Lift 2 min'), rec(1), erg(1, 1.1, 'Lift 1 min'), rec(2, 0.5, 'Bon voyage')],
    reward: { energy: 200, sparks: 3, happiness: 8, gold: 100 },
  },
  {
    id: 'gecko', name: 'Gecko Hatching', icon: '🥚', workout: 'Tempo-sweet spot', zone: 'Z3',
    desc: 'Keep the incubators warm: 3×6 minutes at 85% with 2 minutes easy between.',
    district: 'gecko', weather: 'fog', minTier: 2,
    segments: [rec(3, 0.6, 'Warm the eggs'), ...reps(3, (i) => [erg(6, 0.85, `Incubate ${i + 1}/3`), ...(i < 2 ? [rec(2, 0.55, 'Mist the ferns')] : [])]), rec(2, 0.5, 'Hatchlings!')],
    reward: { energy: 180, sparks: 2, happiness: 10, research: 40 }, decor: 'geckostatue',
  },
];

export const EVENT: Record<string, EventDef> = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

export const eventSeconds = (e: EventDef) => e.segments.reduce((a, s) => a + s.dur, 0);
export const workSeconds = (e: EventDef) => e.segments.filter((s) => s.work).reduce((a, s) => a + s.dur, 0);

/** Target watts (as fraction of FTP) at time t within a segment. */
export const segPct = (s: Segment, t: number) => (s.pctEnd == null ? s.pct : s.pct + (s.pctEnd - s.pct) * Math.min(1, Math.max(0, t / s.dur)));
