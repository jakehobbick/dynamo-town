// Post-ride screen, TCX export and the Strava share card.
import { G } from '../core/state';
import { escapeHtml, fmtClock, fmtInt, fmtNum, saveBlob } from '../core/util';
import { ACH } from '../data/achievements';
import { EVENT } from '../data/events';
import { TIERS } from '../data/tiers';
import { mods } from '../sim/economy';
import type { Ride } from '../ride/session';
import { ZONE_COLS, ZONE_NAMES, type summarize } from '../ride/metrics';
import { buildTCX, tcxName } from '../io/tcx';
import { snapshot } from '../render/renderer';
import { sheet, toast } from './ui';

export interface PostRide {
  ride: Ride;
  m: ReturnType<typeof summarize>;
  unlocked: string[]; // achievements
  tierUp: number[];
  built: string[];
}

export function exportTCX(r: Ride) {
  if (!r.samples.length || r.samples.length < 10) return toast('Ride too short to save');
  const title = rideTitle(r).title;
  const xml = buildTCX(r.samples, title);
  return saveBlob(new Blob([xml], { type: 'application/vnd.garmin.tcx+xml' }), tcxName(r.start), toast);
}

export function rideTitle(r: Ride) {
  const homes = Math.max(mods().housing, 1);
  const popN = Math.floor(G.s.pop);
  const pop = popN >= 5 ? fmtInt(popN) + ' ' : 'the ';
  const town = TIERS[G.s.tier].name.toLowerCase();
  const full = r.events.filter((e) => e.full);
  const m = r.samples;
  const kj = Math.round(r.kj);
  const np = Math.round(m.length ? r.samples.reduce((a, b) => a + b.p, 0) / m.length : 0);
  const T: Record<string, string> = {
    storm: `Powered ${fmtInt(homes)} homes through a blackout`,
    festival: `Kept ${fmtInt(homes)} homes glowing all Festival Night`,
    factory: `Finished a rush Factory Order for ${pop}townsfolk`,
    surge: `Caught lightning 3 times and charged the capacitor`,
    tide: `Pumped the harbor locks against the tide`,
    harvest: `Brought the harvest in for ${pop}hungry townsfolk`,
    crane: `Raised a new bridge, one threshold at a time`,
    heatwave: `Kept ${fmtInt(homes)} homes cool through a heat wave`,
    nightshift: `Spun the looms through the night shift`,
    commute: `Got the morning trams rolling`,
    lantern: `A slow lantern walk through a sleepy ${town}`,
    launch: `Lifted the first airship off the Sky Dock`,
    gecko: `Kept the gecko eggs warm until they hatched`,
  };
  let title: string;
  if (full.length >= 2) title = `${T[full[0].id]} (and ${full.length - 1} more job${full.length > 2 ? 's' : ''})`;
  else if (full.length === 1) title = T[full[0].id];
  else if (r.events.some((e) => e.started)) title = `Gave it everything for ${pop}townsfolk`;
  else title = `Generated ${fmtInt(kj)} kJ for a cozy little ${town}`;
  const lines = [
    `⚡ ${fmtInt(kj)} kJ generated · ${fmtClock(r.samples.length)} · avg ${np} W`,
    ...r.events.filter((e) => e.started).map((e) => `${EVENT[e.id].icon} ${EVENT[e.id].name} (${EVENT[e.id].workout}): ${Math.round(e.score * 100)}% in band${e.full ? ' ✅' : ''}`),
    `🏘️ ${TIERS[G.s.tier].name} · ${fmtInt(popN)} citizens · ${G.s.buildings.length} buildings`,
    'Dynamo Town: my legs power the town 🚴⚡',
  ];
  return { title: 'Dynamo Town · ' + title, desc: lines.join('\n') };
}

export function makeShareCard(pr: PostRide): HTMLCanvasElement {
  const r = pr.ride, m = pr.m;
  const CW = 1080, CH = 1350;
  const cv = document.createElement('canvas');
  cv.width = CW;
  cv.height = CH;
  const c = cv.getContext('2d')!;
  // town snapshot
  const snap = snapshot(CW, 820);
  c.drawImage(snap, 0, 0);
  // header gradient + logo
  const hg = c.createLinearGradient(0, 0, 0, 230);
  hg.addColorStop(0, 'rgba(29,42,58,0.9)');
  hg.addColorStop(1, 'rgba(29,42,58,0)');
  c.fillStyle = hg;
  c.fillRect(0, 0, CW, 260);
  c.textAlign = 'center';
  c.font = '700 84px Fredoka, sans-serif';
  const lg = c.createLinearGradient(0, 40, 0, 120);
  lg.addColorStop(0, '#fff3c4');
  lg.addColorStop(1, '#f39b2f');
  c.lineWidth = 8;
  c.strokeStyle = 'rgba(30,25,40,0.6)';
  c.strokeText('DYNAMO TOWN', CW / 2, 112);
  c.fillStyle = lg;
  c.fillText('DYNAMO TOWN', CW / 2, 112);
  const t = rideTitle(r).title.replace('Dynamo Town · ', '');
  c.font = '600 38px Fredoka, sans-serif';
  c.fillStyle = '#ffffff';
  wrap(c, t, CW / 2, 170, CW - 120, 44);
  // panel
  const py = 790;
  const pg = c.createLinearGradient(0, py - 50, 0, CH);
  pg.addColorStop(0, 'rgba(255,248,236,0)');
  pg.addColorStop(0.1, 'rgba(255,248,236,0.97)');
  pg.addColorStop(1, '#fff8ec');
  c.fillStyle = pg;
  c.fillRect(0, py - 50, CW, CH - py + 50);
  // power graph
  const S = r.samples, gx = 60, gw = CW - 120, gy = py + 10, gh = 120;
  if (S.length > 20) {
    const n = Math.min(S.length, 600), step = S.length / n;
    const pts: number[] = [];
    let mx = 1;
    for (let i = 0; i < n; i++) {
      let sum = 0, cnt = 0;
      for (let j = Math.floor(i * step); j < Math.floor((i + 1) * step); j++) {
        sum += S[j].p;
        cnt++;
      }
      const v = cnt ? sum / cnt : 0;
      pts.push(v);
      mx = Math.max(mx, v);
    }
    const ftp = G.s.settings.ftp;
    mx = Math.max(mx, ftp * 1.5);
    const X = (i: number) => gx + (i / (n - 1)) * gw, Y = (v: number) => gy + gh - (v / mx) * gh;
    const ag = c.createLinearGradient(0, gy, 0, gy + gh);
    ag.addColorStop(0, 'rgba(243,155,47,0.95)');
    ag.addColorStop(1, 'rgba(255,211,77,0.35)');
    c.fillStyle = ag;
    c.beginPath();
    c.moveTo(X(0), gy + gh);
    pts.forEach((v, i) => c.lineTo(X(i), Y(v)));
    c.lineTo(X(n - 1), gy + gh);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(43,42,58,0.4)';
    c.setLineDash([8, 8]);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(gx, Y(ftp));
    c.lineTo(gx + gw, Y(ftp));
    c.stroke();
    c.setLineDash([]);
    c.font = '700 20px Nunito, sans-serif';
    c.textAlign = 'left';
    c.fillStyle = 'rgba(43,42,58,0.6)';
    c.fillText('FTP', gx + 6, Y(ftp) - 6);
  }
  // tiles
  const tiles: [string, string][] = [
    ['ENERGY', fmtInt(r.kj) + ' kJ'],
    ['TIME', fmtClock(m.secs)],
    ['AVG / NP', `${Math.round(m.avg)} / ${Math.round(m.np)} W`],
    ['STORED', fmtInt(r.credited + r.bonusEnergy) + ' kJ'],
    m.avgHr ? ['AVG HR', Math.round(m.avgHr) + ' bpm'] : ['TSS', String(Math.round(m.tss))],
    ['TOWN', `${TIERS[G.s.tier].icon} ${TIERS[G.s.tier].name}`],
  ];
  const tw = (CW - 120 - 40) / 3, th = 96, ty = gy + gh + 30;
  tiles.forEach(([k, v], i) => {
    const x = 60 + (i % 3) * (tw + 20), y = ty + Math.floor(i / 3) * (th + 16);
    c.fillStyle = '#f5ead6';
    rr(c, x, y, tw, th, 18);
    c.fill();
    c.textAlign = 'left';
    c.font = '800 19px Nunito, sans-serif';
    c.fillStyle = '#5b5870';
    c.fillText(k, x + 20, y + 32);
    c.font = '600 38px Fredoka, sans-serif';
    c.fillStyle = '#2b2a3a';
    c.fillText(v, x + 20, y + 78);
  });
  // events
  let ey = ty + 2 * (th + 16) + 40;
  c.font = '700 28px Nunito, sans-serif';
  c.textAlign = 'left';
  for (const e of r.events.filter((x) => x.started).slice(0, 3)) {
    const d = EVENT[e.id];
    c.fillStyle = '#2b2a3a';
    c.fillText(`${d.icon} ${d.name} · ${Math.round(e.score * 100)}% ${e.full ? '✅' : ''}`, 60, ey);
    ey += 40;
  }
  c.textAlign = 'right';
  c.font = '700 22px Nunito, sans-serif';
  c.fillStyle = 'rgba(43,42,58,0.5)';
  c.fillText('jakehobbick.github.io/dynamo-town', CW - 60, CH - 30);
  return cv;
}

function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function wrap(c: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (c.measureText(test).width > maxW && line) {
      c.fillText(line, x, y);
      line = w;
      y += lh;
    } else line = test;
  }
  c.fillText(line, x, y);
}

async function copy(t: string, btn: HTMLElement) {
  try {
    await navigator.clipboard.writeText(t);
    btn.textContent = 'Copied ✓';
  } catch {
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      btn.textContent = 'Copied ✓';
    } catch {
      btn.textContent = 'Select & copy';
    }
    ta.remove();
  }
}

export function showPostRide(pr: PostRide, onDone: () => void) {
  const r = pr.ride, m = pr.m;
  const after = snapshot(640, 400).toDataURL('image/jpeg', 0.85);
  const tt = rideTitle(r);
  const zmax = Math.max(1, ...m.zones);
  const body = sheet('🏁 Ride complete', `
    <p class="sub"><b>${escapeHtml(tt.title.replace('Dynamo Town · ', ''))}</b></p>
    ${r.before ? `<div class="beforeafter"><div><small>Before</small><img src="${r.before}"></div><div><small>After</small><img src="${after}"></div></div>` : `<img class="shareimg" src="${after}">`}
    <div class="kv" style="margin-top:10px">
      <div><small>⚡ Energy generated</small><b>${fmtInt(r.kj)} kJ</b></div>
      <div><small>🔋 Stored (with bonuses)</small><b>${fmtInt(r.credited + r.bonusEnergy)} kJ</b></div>
      <div><small>⏱ Time</small><b>${fmtClock(m.secs)}</b></div>
      <div><small>Avg / NP</small><b>${Math.round(m.avg)} / ${Math.round(m.np)} W</b></div>
      <div><small>Max power</small><b>${Math.round(m.maxP)} W</b></div>
      <div><small>IF · TSS</small><b>${m.IF.toFixed(2)} · ${Math.round(m.tss)}</b></div>
      ${m.avgHr ? `<div><small>Avg HR</small><b>${Math.round(m.avgHr)} bpm</b></div>` : ''}
      ${r.overflowGold > 1 ? `<div><small>Overflow sold</small><b>🪙 ${fmtNum(r.overflowGold)}</b></div>` : ''}
    </div>
    ${r.events.some((e) => e.started) ? '<h3>⚡ Grid events</h3><div class="list">' + r.events.filter((e) => e.started).map((e) => `<div><span style="font-size:26px">${EVENT[e.id].icon}</span><div style="flex:1"><b>${EVENT[e.id].name}</b> <span class="pill">${EVENT[e.id].workout}</span> ${e.full ? '✅ Complete' : e.score >= 0.3 ? '🟡 Partial' : '⚪ Attempted'}<div class="bar" style="margin-top:4px"><i style="width:${Math.round(e.score * 100)}%"></i></div><div class="desc">${Math.round(e.score * 100)}% in the ±5% band · ${Object.entries(e.rewards || {}).filter(([, v]) => v).map(([k, v]) => `${({ energy: '⚡', sparks: '✦', gold: '🪙', food: '🍞', materials: '🪵', research: '🧪' } as any)[k]}${fmtNum(v as number)}`).join(' ')}${e.id === 'storm' ? ` · ${e.restored}/5 districts restored` : ''}</div></div></div>`).join('') + '</div>' : ''}
    <h3>📊 Time in zones</h3>
    <div>${m.zones.slice(1).map((z, i) => `<div class="row" style="flex-wrap:nowrap;gap:8px;margin:3px 0"><span style="width:118px;font-size:13px;font-weight:800">Z${i + 1} ${ZONE_NAMES[i + 1]}</span><div style="flex:1;height:12px;background:var(--paper2);border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:${(z / zmax) * 100}%;background:${ZONE_COLS[i + 1]}"></i></div><span style="width:52px;text-align:right;font-size:13px;font-weight:800">${fmtClock(z)}</span></div>`).join('')}</div>
    ${pr.built.length || pr.unlocked.length || pr.tierUp.length ? `<h3>✨ New in town</h3><div class="list">${pr.tierUp.map((t) => `<div>${TIERS[t].icon} <b>Town is now a ${TIERS[t].name}!</b> ${TIERS[t].blurb}</div>`).join('')}${pr.built.map((b) => `<div>🎁 A ${escapeHtml(b)} appeared in town</div>`).join('')}${pr.unlocked.map((a) => `<div>${ACH[a].icon} Achievement: <b>${escapeHtml(ACH[a].name)}</b></div>`).join('')}</div>` : ''}
    <h3>📤 Share</h3>
    <div class="row"><button class="btn focusable" id="prTcx">⬇ Save .tcx for Garmin</button><button class="btn sec focusable" id="prCard">📸 Share card</button><button class="btn sec sm focusable" id="prTitle">Copy title</button><button class="btn sec sm focusable" id="prDesc">Copy description</button></div>
    <p class="note">Upload the .tcx at connect.garmin.com → Import Data; it syncs on to Strava. Then add the share card and paste the title there.</p>
    <div id="prCardBox"></div>
    <div class="row" style="margin-top:14px"><button class="btn good focusable" id="prDone">🏘️ Back to town and spend energy</button></div>
  `, { id: 'postride', onClose: onDone });
  body.querySelector('#prTcx')!.addEventListener('click', () => exportTCX(r));
  body.querySelector('#prTitle')!.addEventListener('click', (e) => copy(tt.title, e.currentTarget as HTMLElement));
  body.querySelector('#prDesc')!.addEventListener('click', (e) => copy(tt.desc, e.currentTarget as HTMLElement));
  body.querySelector('#prCard')!.addEventListener('click', async () => {
    const cv = makeShareCard(pr);
    const box = body.querySelector('#prCardBox') as HTMLElement;
    box.innerHTML = `<img class="shareimg" style="margin-top:10px;-webkit-user-select:auto;user-select:auto" src="${cv.toDataURL('image/png')}"><p class="note">Long-press the image to save it, or use the share sheet.</p>`;
    const blob = await new Promise<Blob | null>((res) => cv.toBlob(res, 'image/png'));
    if (blob) saveBlob(blob, `dynamo-town-${new Date(r.start).toISOString().slice(0, 10)}.png`, toast);
  });
  body.querySelector('#prDone')!.addEventListener('click', () => {
    document.querySelector('[data-id="postride"]')?.remove();
    onDone();
  });
}
