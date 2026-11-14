// TCX export (ported from Crank Crypt) and TCX/FIT import parsing.
import type { Sample } from '../ride/metrics';

/** Virtual speed from power (flat road, 75 kg), so Garmin shows a plausible distance. */
export function rideSpeed(P: number) {
  let v = 8;
  for (let i = 0; i < 20; i++) {
    const f = 0.5 * 1.2 * 0.32 * v * v * v + 75 * 9.81 * 0.004 * v - Math.max(0, P);
    const d = 1.5 * 1.2 * 0.32 * v * v + 75 * 9.81 * 0.004;
    v = Math.max(0, v - f / d);
  }
  return v;
}

export function buildTCX(S: Sample[], notes = 'Dynamo Town ride') {
  const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
  let dist = 0, maxV = 0, hrS = 0, hrN = 0, hrMax = 0, cadS = 0, cadN = 0, kj = 0;
  const tp = S.map((x) => {
    const v = x.p > 0 ? rideSpeed(x.p) : 0;
    dist += v;
    maxV = Math.max(maxV, v);
    kj += x.p / 1000;
    if (x.hr > 0) {
      hrS += x.hr;
      hrN++;
      hrMax = Math.max(hrMax, x.hr);
    }
    if (x.c > 0) {
      cadS += x.c;
      cadN++;
    }
    return `<Trackpoint><Time>${iso(x.t)}</Time><DistanceMeters>${dist.toFixed(1)}</DistanceMeters>${x.hr > 0 ? `<HeartRateBpm><Value>${Math.round(x.hr)}</Value></HeartRateBpm>` : ''}<Cadence>${Math.min(254, Math.round(x.c))}</Cadence><Extensions><ns3:TPX><ns3:Speed>${v.toFixed(2)}</ns3:Speed><ns3:Watts>${Math.round(x.p)}</ns3:Watts></ns3:TPX></Extensions></Trackpoint>`;
  }).join('\n');
  const t0 = S[0].t;
  const dur = (S[S.length - 1].t - t0) / 1000 + 1;
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<Activities><Activity Sport="Biking"><Id>${iso(t0)}</Id><Lap StartTime="${iso(t0)}"><TotalTimeSeconds>${Math.round(dur)}</TotalTimeSeconds><DistanceMeters>${dist.toFixed(1)}</DistanceMeters><MaximumSpeed>${maxV.toFixed(2)}</MaximumSpeed><Calories>${Math.round(kj)}</Calories>${hrN ? `<AverageHeartRateBpm><Value>${Math.round(hrS / hrN)}</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>${hrMax}</Value></MaximumHeartRateBpm>` : ''}<Intensity>Active</Intensity>${cadN ? `<Cadence>${Math.round(cadS / cadN)}</Cadence>` : ''}<TriggerMethod>Manual</TriggerMethod><Track>
${tp}
</Track></Lap><Notes>${notes.replace(/[<&>]/g, '')}</Notes><Creator xsi:type="Device_t"><Name>Dynamo Town</Name><UnitId>0</UnitId><ProductID>0</ProductID></Creator></Activity></Activities></TrainingCenterDatabase>`;
}

export function tcxName(start: number) {
  const d = new Date(start);
  const p = (n: number) => String(n).padStart(2, '0');
  return `dynamo-town-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.tcx`;
}

// ---------------- import ----------------
export interface ImportedRide {
  start: number;
  secs: number;
  kj: number; // mechanical work if power present, else estimated
  hasPower: boolean;
  sport: string;
  source: 'tcx' | 'fit';
  samples: Sample[];
  calories: number;
}

export function parseTCX(text: string): ImportedRide {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Not a valid TCX file');
  const act = doc.getElementsByTagName('Activity')[0];
  if (!act) throw new Error('No activity in this TCX file');
  const sport = act.getAttribute('Sport') || 'Other';
  const tps = [...doc.getElementsByTagName('Trackpoint')];
  const samples: Sample[] = [];
  const val = (el: Element, tag: string) => {
    const x = el.getElementsByTagName(tag)[0] || el.getElementsByTagNameNS('*', tag.replace(/^.*:/, ''))[0];
    return x ? parseFloat(x.textContent || '') : NaN;
  };
  for (const tp of tps) {
    const t = Date.parse(tp.getElementsByTagName('Time')[0]?.textContent || '');
    if (!Number.isFinite(t)) continue;
    let w = val(tp, 'ns3:Watts');
    if (!Number.isFinite(w)) w = val(tp, 'Watts');
    const hrEl = tp.getElementsByTagName('HeartRateBpm')[0];
    const hr = hrEl ? val(hrEl, 'Value') : NaN;
    const c = val(tp, 'Cadence');
    samples.push({ t, p: Number.isFinite(w) ? w : -1, c: Number.isFinite(c) ? c : 0, hr: Number.isFinite(hr) ? hr : 0 });
  }
  let calories = 0, secs = 0;
  for (const lap of [...doc.getElementsByTagName('Lap')]) {
    calories += val(lap, 'Calories') || 0;
    secs += val(lap, 'TotalTimeSeconds') || 0;
  }
  const start = samples[0]?.t || Date.parse(act.getElementsByTagName('Id')[0]?.textContent || '') || 0;
  return finishImport(samples, start, secs, calories, sport, 'tcx');
}

function finishImport(samples: Sample[], start: number, secs: number, calories: number, sport: string, source: 'tcx' | 'fit'): ImportedRide {
  const withP = samples.filter((s) => s.p >= 0);
  const hasPower = withP.length > samples.length * 0.5 && withP.some((s) => s.p > 0);
  let kj = 0;
  if (hasPower) {
    // integrate power over time (handles 1 s or smart recording)
    for (let i = 1; i < samples.length; i++) {
      const dt = Math.min(10, (samples[i].t - samples[i - 1].t) / 1000);
      if (dt > 0 && samples[i].p >= 0) kj += (samples[i].p * dt) / 1000;
    }
  } else {
    // no power meter: kilocalories burned ≈ mechanical kJ (gross efficiency ~24% × 4.184)
    kj = calories;
  }
  if (!secs && samples.length > 1) secs = (samples[samples.length - 1].t - samples[0].t) / 1000;
  return { start, secs, kj, hasPower, sport, source, samples: samples.map((s) => ({ ...s, p: Math.max(0, s.p) })), calories };
}

/** Minimal FIT decoder: reads record (power/cadence/hr/timestamp), session (calories, sport). */
export function parseFIT(buf: ArrayBuffer): ImportedRide {
  const dv = new DataView(buf);
  const hdr = dv.getUint8(0);
  if (buf.byteLength < 14 || String.fromCharCode(dv.getUint8(8), dv.getUint8(9), dv.getUint8(10), dv.getUint8(11)) !== '.FIT') throw new Error('Not a FIT file');
  const dataSize = dv.getUint32(4, true);
  let o = hdr;
  const end = Math.min(buf.byteLength - 2, hdr + dataSize);
  const defs: Record<number, { gmn: number; le: boolean; fields: [number, number, number][]; dev: number }> = {};
  const FIT_EPOCH = 631065600000;
  const samples: Sample[] = [];
  let calories = 0, sport = 'Biking', secs = 0, lastTs = 0;
  while (o < end) {
    const h = dv.getUint8(o++);
    if (h & 0x80) {
      // compressed timestamp header
      const local = (h >> 5) & 3;
      const d = defs[local];
      if (!d) throw new Error('Bad FIT');
      const r = readMsg(dv, o, d);
      o = r.o;
      const off = h & 31;
      const ts = (lastTs & ~31) + off + (off < (lastTs & 31) ? 32 : 0);
      handle(d.gmn, r.v, ts);
      continue;
    }
    const local = h & 15;
    if (h & 0x40) {
      // definition
      o++; // reserved
      const le = dv.getUint8(o++) === 0;
      const gmn = dv.getUint16(o, le);
      o += 2;
      const nf = dv.getUint8(o++);
      const fields: [number, number, number][] = [];
      for (let i = 0; i < nf; i++) {
        fields.push([dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2)]);
        o += 3;
      }
      let dev = 0;
      if (h & 0x20) {
        const nd = dv.getUint8(o++);
        for (let i = 0; i < nd; i++) {
          dev += dv.getUint8(o + 1);
          o += 3;
        }
      }
      defs[local] = { gmn, le, fields, dev };
    } else {
      const d = defs[local];
      if (!d) throw new Error('Bad FIT data');
      const r = readMsg(dv, o, d);
      o = r.o;
      handle(d.gmn, r.v, r.v[253]);
    }
  }
  function handle(gmn: number, v: Record<number, number>, ts?: number) {
    if (ts != null && Number.isFinite(ts)) lastTs = ts;
    if (gmn === 20) {
      // record
      const t = FIT_EPOCH + (v[253] ?? lastTs) * 1000;
      samples.push({ t, p: v[7] != null && v[7] !== 0xffff ? v[7] : -1, c: v[4] != null && v[4] !== 0xff ? v[4] : 0, hr: v[3] != null && v[3] !== 0xff ? v[3] : 0 });
    } else if (gmn === 18) {
      // session
      if (v[11] != null && v[11] !== 0xffff) calories += v[11];
      if (v[7] != null && v[7] !== 0xffffffff) secs += v[7] / 1000;
      if (v[5] != null) sport = v[5] === 2 ? 'Biking' : v[5] === 1 ? 'Running' : 'Other';
    }
  }
  const start = samples[0]?.t || 0;
  return finishImport(samples, start, secs, calories, sport, 'fit');
}

function readMsg(dv: DataView, o: number, d: { le: boolean; fields: [number, number, number][]; dev: number }) {
  const v: Record<number, number> = {};
  for (const [num, size, base] of d.fields) {
    const bt = base & 0x1f;
    let x = NaN;
    try {
      if (size === 1) x = bt === 1 ? dv.getInt8(o) : dv.getUint8(o);
      else if (size === 2) x = bt === 3 ? dv.getInt16(o, d.le) : dv.getUint16(o, d.le);
      else if (size === 4) x = bt === 5 ? dv.getInt32(o, d.le) : bt === 8 ? dv.getFloat32(o, d.le) : dv.getUint32(o, d.le);
    } catch {}
    v[num] = x;
    o += size;
  }
  o += d.dev;
  return { v, o };
}
