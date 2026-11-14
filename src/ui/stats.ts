// Stats screen (lifetime chart, rides, events, bests) and ride-file import (TCX/FIT).
import { G } from '../core/state';
import { markDirty } from '../core/save';
import { dayKey, escapeHtml, fmtDur, fmtInt, prevWeekKey, weekKey } from '../core/util';
import { EVENTS } from '../data/events';
import { creditEnergy, mods } from '../sim/economy';
import { checkAchievements, checkTier, charterProgress, streaks } from '../sim/progression';
import { lastRide } from '../ride/session';
import { parseFIT, parseTCX, type ImportedRide } from '../io/tcx';
import { pickFile, sheet, toast } from './ui';
import { exportTCX } from './postride';
import { now } from '../core/state';

export function openStats() {
  const s = G.s;
  const st = s.stats;
  const evRows = EVENTS.map((e) => {
    const x = st.events[e.id];
    const tries = x?.tries || 0;
    return `<tr><td>${e.icon} ${e.name}</td><td>${e.workout}</td><td>${tries}</td><td>${x?.full || 0}</td><td>${tries ? Math.round(((x!.full) / tries) * 100) + '%' : '–'}</td><td>${x ? Math.round(x.best * 100) + '%' : '–'}</td></tr>`;
  }).join('');
  const sk = streaks();
  const body = sheet('📈 Stats', `
    <div class="kv">
      <div><small>Lifetime energy</small><b>${fmtInt(s.lifetimeKJ)} kJ</b></div>
      <div><small>Rides</small><b>${st.rides}</b></div>
      <div><small>Time ridden</small><b>${fmtDur(st.rideSecs)}</b></div>
      <div><small>Biggest ride</small><b>${fmtInt(st.maxRideKJ)} kJ</b></div>
      <div><small>Weekly streak</small><b>${sk.cur} (best ${sk.best})</b></div>
      <div><small>Imported rides</small><b>${st.imports} · ${fmtInt(st.importKJ)} kJ</b></div>
    </div>
    <h3>⚡ Lifetime energy</h3><canvas class="chart" id="stChart"></canvas>
    <h3>📅 Last 12 weeks</h3><canvas class="chart" id="stWeeks" style="height:140px"></canvas>
    <h3>💪 In-game power bests</h3>
    <div class="kv"><div><small>5 s</small><b>${st.bests.p5s} W</b></div><div><small>1 min</small><b>${st.bests.p1} W</b></div><div><small>5 min</small><b>${st.bests.p5} W</b></div><div><small>20 min</small><b>${st.bests.p20} W</b></div><div><small>60 min</small><b>${st.bests.p60 || '–'}${st.bests.p60 ? ' W' : ''}</b></div></div>
    <h3>⛈️ Event completion</h3>
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px" class="evtable"><tr style="text-align:left"><th>Event</th><th>Workout</th><th>Tries</th><th>Full</th><th>Rate</th><th>Best</th></tr>${evRows}</table></div>
    <h3>🗂️ Recent rides</h3>
    <div class="list">${s.rides.slice(0, 15).map((r) => `<div><span>${r.mode === 'import' ? '🏞️' : r.mode === 'plan' ? '🗓️' : r.mode === 'event' ? '📋' : '🌤️'}</span><div style="flex:1"><b>${new Date(r.start).toLocaleDateString()} ${new Date(r.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b><div class="desc">${fmtDur(r.secs)} · ${fmtInt(r.kj)} kJ${r.avg ? ' · ' + Math.round(r.avg) + ' W avg' : ''} · +${fmtInt(r.credited)} stored${r.events.length ? ' · ' + r.events.map((e) => (EVENTS.find((x) => x.id === e.id)?.icon || '') + Math.round(e.score * 100) + '%').join(' ') : ''}</div></div></div>`).join('') || '<p class="note">No rides yet.</p>'}</div>
    <div class="row" style="margin-top:10px">${lastRide ? '<button class="btn sec focusable" id="stTcx">⬇ Re-export last ride (.tcx)</button>' : ''}<button class="btn focusable" id="stImp">🏞️ Import .tcx / .fit rides</button></div>
    <p class="note">Imports credit ${Math.round((G.s.settings.importRate + mods().boost.importRate) * 100)}% of the ride's energy (kJ from power, or calories if there's no power meter). A ride is only ever credited once, and rides you recorded here are recognised and skipped.</p>
    <style>.evtable td,.evtable th{padding:5px 6px;border-bottom:1.5px dashed var(--line)}</style>
  `, { id: 'stats' });
  body.querySelector('#stTcx')?.addEventListener('click', () => lastRide && exportTCX(lastRide));
  body.querySelector('#stImp')!.addEventListener('click', () => importRides());
  requestAnimationFrame(() => {
    drawLifetime(body.querySelector('#stChart') as HTMLCanvasElement);
    drawWeeks(body.querySelector('#stWeeks') as HTMLCanvasElement);
  });
}

function prepCanvas(cv: HTMLCanvasElement) {
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * dpr;
  cv.height = h * dpr;
  const c = cv.getContext('2d')!;
  c.scale(dpr, dpr);
  return { c, w, h };
}

function drawLifetime(cv: HTMLCanvasElement) {
  const { c, w, h } = prepCanvas(cv);
  const days = Object.keys(G.s.stats.daily).sort();
  c.font = '700 12px Nunito, sans-serif';
  if (!days.length) {
    c.fillStyle = '#5b5870';
    c.fillText('Ride to start the chart', 14, 24);
    return;
  }
  // cumulative, spaced by actual date
  const t0 = Date.parse(days[0]), t1 = Math.max(Date.parse(days[days.length - 1]), t0 + 86400000 * 6);
  let cum = 0;
  const pts = days.map((d) => {
    cum += G.s.stats.daily[d];
    return [Date.parse(d), cum] as [number, number];
  });
  const max = Math.max(1000, cum * 1.1);
  const pad = 34;
  const X = (t: number) => pad + ((t - t0) / (t1 - t0)) * (w - pad - 12), Y = (v: number) => h - 22 - (v / max) * (h - 34);
  c.strokeStyle = '#eadfc8';
  c.fillStyle = '#5b5870';
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4;
    c.beginPath();
    c.moveTo(pad, Y(v));
    c.lineTo(w - 10, Y(v));
    c.stroke();
    c.fillText(v >= 1000 ? Math.round(v / 1000) + 'k' : String(Math.round(v)), 4, Y(v) + 4);
  }
  const g = c.createLinearGradient(0, 10, 0, h);
  g.addColorStop(0, 'rgba(243,155,47,0.55)');
  g.addColorStop(1, 'rgba(255,211,77,0.08)');
  c.beginPath();
  c.moveTo(X(t0), Y(0));
  for (const [t, v] of pts) c.lineTo(X(t), Y(v));
  c.lineTo(X(pts[pts.length - 1][0]), Y(0));
  c.closePath();
  c.fillStyle = g;
  c.fill();
  c.beginPath();
  pts.forEach(([t, v], i) => (i ? c.lineTo(X(t), Y(v)) : c.moveTo(X(t), Y(v))));
  c.strokeStyle = '#e0782f';
  c.lineWidth = 2.5;
  c.stroke();
  c.fillStyle = '#5b5870';
  c.fillText(new Date(t0).toLocaleDateString(), pad, h - 6);
  c.textAlign = 'right';
  c.fillText(new Date(t1).toLocaleDateString(), w - 10, h - 6);
}

function drawWeeks(cv: HTMLCanvasElement) {
  const { c, w, h } = prepCanvas(cv);
  const ks: string[] = [];
  let k = weekKey(now());
  for (let i = 0; i < 12; i++) {
    ks.unshift(k);
    k = prevWeekKey(k);
  }
  const vals = ks.map((x) => G.s.stats.weeks[x]?.kj || 0);
  const rides = ks.map((x) => G.s.stats.weeks[x]?.rides || 0);
  const max = Math.max(500, ...vals) * 1.1;
  const bw = (w - 20) / 12;
  c.font = '700 11px Nunito, sans-serif';
  c.textAlign = 'center';
  vals.forEach((v, i) => {
    const bh = (v / max) * (h - 34);
    const met = rides[i] >= G.s.settings.weeklyRides;
    c.fillStyle = met ? '#f39b2f' : '#e6d7ba';
    c.fillRect(10 + i * bw + 4, h - 18 - bh, bw - 8, bh);
    c.fillStyle = '#5b5870';
    c.fillText(ks[i].split('-W')[1], 10 + i * bw + bw / 2, h - 5);
    if (v) c.fillText(v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v)), 10 + i * bw + bw / 2, h - 22 - bh);
  });
}

// ---------------- import ----------------
export function rideKey(start: number) {
  return 'm' + Math.round(start / 60000);
}

export function alreadyCredited(r: ImportedRide): string | null {
  const s = G.s;
  if (s.imported.includes(rideKey(r.start))) return 'already imported';
  for (const x of s.rides) {
    if (Math.abs(x.start - r.start) < 5 * 60000 && Math.abs(x.secs - r.secs) < Math.max(300, x.secs * 0.15)) return x.source === 'game' || !x.source ? 'recorded in Dynamo Town' : 'already imported';
  }
  return null;
}

export function creditImport(r: ImportedRide) {
  const s = G.s;
  const rate = s.settings.importRate + mods().boost.importRate;
  const credit = r.kj * rate;
  creditEnergy(credit);
  s.lifetimeKJ += credit;
  s.imported.push(rideKey(r.start));
  s.stats.imports++;
  s.stats.importKJ += credit;
  const dk = dayKey(r.start);
  s.stats.daily[dk] = (s.stats.daily[dk] || 0) + credit;
  const wk = weekKey(r.start);
  const w = (s.stats.weeks[wk] ||= { rides: 0, kj: 0, events: 0, minutes: 0 });
  if (r.secs >= 600) w.rides++;
  w.kj += credit;
  w.minutes += r.secs / 60;
  s.rides.push({ id: 'i' + r.start, start: r.start, secs: Math.round(r.secs), kj: r.kj, credited: credit, avg: r.hasPower && r.secs ? (r.kj * 1000) / r.secs : 0, np: 0, maxP: 0, avgHr: 0, mode: 'import', events: [], source: r.source });
  s.rides.sort((a, b) => b.start - a.start);
  if (weekKey(r.start) === weekKey(now())) {
    charterProgress('kj', credit);
    if (r.secs >= 600) charterProgress('rides', 1);
  }
  markDirty();
  return credit;
}

export async function importRides() {
  const files = await pickFile('.tcx,.fit,.TCX,.FIT,application/vnd.garmin.tcx+xml,application/octet-stream', true);
  if (!files.length) return;
  const lines: string[] = [];
  let total = 0;
  for (const f of files) {
    try {
      const r = f.name.toLowerCase().endsWith('.fit') ? parseFIT(await f.arrayBuffer()) : parseTCX(await f.text());
      if (!/bik|cycl/i.test(r.sport) && r.sport !== 'Other') {
        lines.push(`⏭ ${escapeHtml(f.name)}: ${escapeHtml(r.sport)} isn't a ride`);
        continue;
      }
      const dup = alreadyCredited(r);
      if (dup) {
        lines.push(`⏭ ${escapeHtml(f.name)}: ${dup}`);
        continue;
      }
      if (r.kj < 5) {
        lines.push(`⏭ ${escapeHtml(f.name)}: no power or calories found`);
        continue;
      }
      const c = creditImport(r);
      total += c;
      lines.push(`✅ ${escapeHtml(f.name)}: ${new Date(r.start).toLocaleDateString()} · ${fmtDur(r.secs)} · ${fmtInt(r.kj)} kJ ${r.hasPower ? '' : '(from calories)'} → +${fmtInt(c)} kJ`);
    } catch (e: any) {
      lines.push(`⚠️ ${escapeHtml(f.name)}: ${escapeHtml(e.message || String(e))}`);
    }
  }
  checkTier();
  checkAchievements();
  sheet('🏞️ Import results', `<div class="list">${lines.map((l) => `<div>${l}</div>`).join('')}</div><p class="sub">Credited ${fmtInt(total)} kJ to the town.</p>`, { center: true, id: 'impres' });
  if (total) toast(`🏞️ +${fmtInt(total)} kJ from outdoor rides`, true);
}
