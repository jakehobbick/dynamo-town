// Ride metrics: zones, normalized power, best efforts.
export interface Sample {
  t: number; // ms timestamp
  p: number;
  c: number;
  hr: number;
}

/** Coggan power zones by % FTP. Returns 1..7. */
export function zoneOf(p: number, ftp: number) {
  const r = p / ftp;
  if (r < 0.56) return 1;
  if (r < 0.76) return 2;
  if (r < 0.91) return 3;
  if (r < 1.06) return 4;
  if (r < 1.21) return 5;
  if (r < 1.51) return 6;
  return 7;
}
export const ZONE_NAMES = ['', 'Recovery', 'Endurance', 'Tempo', 'Threshold', 'VO2 max', 'Anaerobic', 'Sprint'];
export const ZONE_COLS = ['', '#9aa3ad', '#5a9fd6', '#5fb36b', '#f5c451', '#f08a3c', '#e5534b', '#b45fd6'];
/** Free-ride energy multiplier by zone. */
export const ZONE_MULT = [1, 1, 1.05, 1.1, 1.15, 1.2, 1.25, 1.25];

export function normalizedPower(ps: number[]) {
  if (ps.length < 30) return ps.reduce((a, b) => a + b, 0) / Math.max(1, ps.length);
  let sum = 0, acc = 0, n = 0;
  for (let i = 0; i < ps.length; i++) {
    sum += ps[i];
    if (i >= 30) sum -= ps[i - 30];
    if (i >= 29) {
      acc += Math.pow(sum / 30, 4);
      n++;
    }
  }
  return Math.pow(acc / n, 0.25);
}

/** Best average power over a window of `sec` samples (1 Hz). */
export function bestAvg(ps: number[], sec: number) {
  if (ps.length < sec) return 0;
  let sum = 0, best = 0;
  for (let i = 0; i < ps.length; i++) {
    sum += ps[i];
    if (i >= sec) sum -= ps[i - sec];
    if (i >= sec - 1) best = Math.max(best, sum / sec);
  }
  return best;
}

export function summarize(samples: Sample[], ftp: number) {
  const ps = samples.map((s) => s.p);
  const n = Math.max(1, ps.length);
  const avg = ps.reduce((a, b) => a + b, 0) / n;
  const np = normalizedPower(ps);
  const hrs = samples.filter((s) => s.hr > 0);
  const zones = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const p of ps) zones[zoneOf(p, ftp)]++;
  return {
    secs: ps.length,
    avg,
    np,
    maxP: ps.reduce((a, b) => Math.max(a, b), 0),
    kj: ps.reduce((a, b) => a + b, 0) / 1000,
    avgHr: hrs.length ? hrs.reduce((a, b) => a + b.hr, 0) / hrs.length : 0,
    maxHr: hrs.reduce((a, b) => Math.max(a, b.hr), 0),
    avgCad: (() => {
      const cs = samples.filter((s) => s.c > 0);
      return cs.length ? cs.reduce((a, b) => a + b.c, 0) / cs.length : 0;
    })(),
    IF: np / ftp,
    tss: ((ps.length * np * (np / ftp)) / (ftp * 3600)) * 100,
    zones,
    bests: { p5s: bestAvg(ps, 5), p1: bestAvg(ps, 60), p5: bestAvg(ps, 300), p20: bestAvg(ps, 1200), p60: bestAvg(ps, 3600) },
  };
}
