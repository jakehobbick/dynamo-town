// Ride menu (event board, structured plans, free ride), glanceable ride HUD, overlays.
import { uiQuiet } from './ui';
import { emit, on } from '../core/bus';
import { G } from '../core/state';
import { markDirty } from '../core/save';
import { $, clamp, escapeHtml, fmtClock, fmtInt, fmtNum } from '../core/util';
import { EVENT, eventSeconds, workSeconds } from '../data/events';
import { batteryCap } from '../sim/economy';
import { availableEvents, featured, FEATURED_BONUS, planTimeline, timelineSecs } from '../ride/plan';
import { curEvent, curItem, endRide, eventScore, ride, shift, skipSegment, startRide, targetW, togglePause } from '../ride/session';
import { gearCenterW, rpmFor, sens, sim } from '../ride/sensors';
import { bluetoothAvailable, connectHR, connectTrainer, status } from '../ride/trainer';
import { closeSheet, sheet, toast } from './ui';
import { audioInit } from '../audio/audio';
import { ZONE_MULT, zoneOf, ZONE_NAMES } from '../ride/metrics';
import { DISTRICT } from '../data/districts';

// ---------------- pre-ride menu ----------------
export function openRideMenu() {
  audioInit();
  const feat = featured();
  const body = sheet('🚴 Ride', '', { id: 'ridemenu' });
  let tab: 'events' | 'plan' | 'free' = 'plan';
  const render = () => {
    const dev = `<div class="card" style="margin-bottom:12px"><div class="row">
      <span class="pill" style="background:${status.trainerOK ? '#dff3e4' : ''}">${status.trainerOK ? '🟢' : '⚪'} ${escapeHtml(status.trainerOK ? status.trainer : 'Trainer: simulated')}</span>
      <span class="pill">${status.hrOK ? '🟢 HR' : '⚪ HR'}</span>
      <span class="pill">FTP ${G.s.settings.ftp} W</span>
      <span class="spacer"></span>
      ${bluetoothAvailable() ? `<button class="btn sm focusable" id="rmPairT">${status.trainerOK ? 'Re-pair' : '🔗 Pair KICKR'}</button><button class="btn sec sm focusable" id="rmPairH">❤️ HR</button>` : `<span class="note">No Bluetooth here: open in Bluefy (iPad) or Chrome</span>`}
    </div></div>`;
    let html = dev + `<div class="tabs"><button class="tab focusable ${tab === 'plan' ? 'on' : ''}" data-t="plan">🗓️ Structured Plan</button><button class="tab focusable ${tab === 'events' ? 'on' : ''}" data-t="events">📋 Event Board</button><button class="tab focusable ${tab === 'free' ? 'on' : ''}" data-t="free">🌤️ Free Ride</button></div>`;
    if (tab === 'events') {
      html += `<p class="sub">Pick a grid emergency. Each one is a workout; the trainer holds the targets in ERG. Hit the ±5% band to earn full rewards. Starred events pay +${FEATURED_BONUS * 100}% today.</p><div class="grid">`;
      for (const e of availableEvents()) {
        const st = G.s.stats.events[e.id];
        html += `<button class="card focusable" data-ev="${e.id}">
          <div class="ttl">${e.icon} ${escapeHtml(e.name)} ${feat.includes(e.id) ? '⭐' : ''}</div>
          <div class="desc"><b>${e.workout}</b> · ${e.zone} · ${Math.round(eventSeconds(e) / 60)} min</div>
          <div class="desc">${escapeHtml(e.desc)}</div>
          <div class="desc">🎁 ⚡${e.reward.energy} · ✦${e.reward.sparks}${e.reward.materials ? ' · 🪵' + e.reward.materials : ''}${e.reward.food ? ' · 🍞' + e.reward.food : ''}${e.reward.gold ? ' · 🪙' + e.reward.gold : ''}${e.reward.research ? ' · 🧪' + e.reward.research : ''}</div>
          ${st ? `<div class="desc">Done ${st.full}× · best ${Math.round(st.best * 100)}%</div>` : ''}
          ${miniProfile(e.segments)}
        </button>`;
      }
      html += '</div>';
    } else if (tab === 'plan') {
      html += `<p class="sub">The town chains grid events into one workout, with a warm-up, recoveries and a cool-down. ERG changes the resistance for every block.</p><div class="grid">`;
      for (const m of [30, 45, 60, 90]) {
        const tl = planTimeline(m);
        html += `<button class="card focusable" data-plan="${m}"><div class="ttl">🗓️ ${m} minutes</div>
          <div class="desc">${tl.events.map((id) => EVENT[id].icon + ' ' + EVENT[id].name).join(' → ') || 'Steady endurance'}</div>
          <div class="desc">${Math.round(timelineSecs(tl.items) / 60)} min · ${tl.events.length} event${tl.events.length === 1 ? '' : 's'}</div>
          ${miniProfile(tl.items.map((i) => i.seg))}</button>`;
      }
      html += '</div>';
    } else {
      html += `<p class="sub">No targets, pure generation. Use your Zwift Ride buttons to shift the 24 virtual gears. Energy is multiplied by your power zone: Endurance ×1.05, Tempo ×1.1, Threshold ×1.15, VO2 ×1.2, harder ×1.25.</p>
      <button class="btn focusable" id="rmFree" style="font-size:20px;padding:14px 26px">🌤️ Start Free Ride</button>`;
    }
    body.innerHTML = html;
    body.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => {
      tab = (b as HTMLElement).dataset.t as any;
      render();
    }));
    body.querySelector('#rmPairT')?.addEventListener('click', async () => {
      await connectTrainer();
      render();
    });
    body.querySelector('#rmPairH')?.addEventListener('click', async () => {
      await connectHR();
      render();
    });
    body.querySelectorAll('[data-ev]').forEach((b) => b.addEventListener('click', () => begin('event', (b as HTMLElement).dataset.ev!)));
    body.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', () => begin('plan', +(b as HTMLElement).dataset.plan!)));
    body.querySelector('#rmFree')?.addEventListener('click', () => begin('free', 0));
  };
  render();
}

function begin(mode: 'event' | 'plan' | 'free', arg: string | number) {
  closeSheet('ridemenu');
  emit('ride:begin', mode, arg);
}

/** Tiny SVG workout profile. */
export function miniProfile(segs: { dur: number; pct: number; pctEnd?: number; kind: string; work?: boolean }[], h = 34) {
  const total = segs.reduce((a, s) => a + s.dur, 0) || 1;
  const W = 300;
  let x = 0;
  const bars = segs.map((s) => {
    const w = (s.dur / total) * W;
    const p0 = s.kind === 'sprint' ? 1.7 : s.kind === 'free' ? 0.62 : s.pct, p1 = s.kind === 'sprint' ? 1.7 : s.kind === 'free' ? 0.62 : s.pctEnd ?? s.pct;
    const y0 = h - clamp(p0 / 1.8, 0.05, 1) * h, y1 = h - clamp(p1 / 1.8, 0.05, 1) * h;
    const col = s.kind === 'free' ? '#b9d3e6' : s.kind === 'sprint' ? '#b45fd6' : p0 >= 1.05 ? '#e5534b' : p0 >= 0.9 ? '#f08a3c' : p0 >= 0.76 ? '#f5c451' : p0 >= 0.56 ? '#5fb36b' : '#9aa3ad';
    const r = `<path d="M${x.toFixed(1)} ${h} L${x.toFixed(1)} ${y0.toFixed(1)} L${(x + w).toFixed(1)} ${y1.toFixed(1)} L${(x + w).toFixed(1)} ${h}Z" fill="${col}"/>`;
    x += w;
    return r;
  });
  return `<svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" style="width:100%;height:${h}px;display:block;margin-top:6px;border-radius:6px;background:#f3ead8">${bars.join('')}</svg>`;
}

// ---------------- HUD ----------------
let hud: HTMLElement | null = null;
export function showRideHUD() {
  hud?.remove();
  hud = document.createElement('div');
  document.body.classList.add('riding');
  hud.className = 'hud';
  hud.innerHTML = `
    <div class="hudtop">
      <div class="metric big"><small>WATTS</small><b id="rW">0</b></div>
      <div class="metric"><small>CADENCE</small><b id="rC">0<u>rpm</u></b></div>
      <div class="metric" id="rHRbox"><small>HEART</small><b id="rHR">–</b></div>
      <div class="metric"><small id="rTL">TARGET</small><b id="rT">–</b></div>
    </div>
    <div class="ridestats">
      <div>⏱ <span id="rTime">0:00</span></div>
      <div>⚡ <span id="rKJ">0</span> kJ <small style="opacity:.7">(+<span id="rCred">0</span> stored)</small></div>
      <div class="bat"><i id="rBat"></i></div>
      <div style="font-size:12px;opacity:.85">🔋 <span id="rBatT"></span></div>
      <div style="font-size:12px;opacity:.85" id="rZone"></div>
    </div>
    <div class="hudside">
      <div class="gearbox" id="rGear"><button id="gUp" class="focusable">＋</button><b id="gN">12</b><small id="gW"></small><button id="gDn" class="focusable">－</button></div>
      <button class="hudbtn focusable" id="rPause">⏸ Pause</button>
      <button class="hudbtn focusable" id="rEnd">🏁 Finish</button>
      <button class="hudbtn focusable" id="rSkip" title="Skip segment">⏭ Skip</button>
    </div>
    <div class="eventpanel" id="rEv">
      <div class="head"><span id="evIcon">🌤️</span><span id="evName">Free ride</span><span class="cd" id="evCd"></span></div>
      <div class="seg" id="evSeg"></div>
      <div class="band" id="evBand"><div class="zone" id="evZone"></div><div class="needle" id="evNeedle"></div><span class="lbl" id="evLbl" style="left:8px"></span><span class="lbl" id="evComp" style="right:8px"></span></div>
      <div class="segbar" id="evBar"></div>
    </div>
    <div class="simpanel ${sens.src === 'sim' ? '' : 'hidden'}" id="rSim" style="bottom:auto;top:calc(250px + var(--safe-top))">
      <div class="row" style="justify-content:space-between"><span>🧪 Simulated trainer</span><label class="row"><input type="checkbox" id="sBot" ${sim.bot ? 'checked' : ''}> bot</label></div>
      <label class="f">Power / effort <input id="sW" type="range" min="0" max="1000" value="${sim.watts}"></label>
      <label class="f">Cadence <input id="sC" type="range" min="0" max="140" value="${sim.cad}"></label>
      <div class="row ${G.s.settings.debug ? '' : 'hidden'}"><span>Speed</span>${[1, 10, 60].map((v) => `<button class="btn sec sm" data-sp="${v}">${v}×</button>`).join('')}</div>
      <div class="note" style="margin-top:4px">↑/↓ watts · ←/→ cadence · Space sprint</div>
    </div>`;
  $('ui').appendChild(hud);
  $('gUp').onclick = () => shift(1);
  $('gDn').onclick = () => shift(-1);
  $('rPause').onclick = () => togglePause();
  $('rEnd').onclick = () => emit('ride:end');
  $('rSkip').onclick = () => skipSegment();
  ($('sW') as HTMLInputElement).oninput = (e) => (sim.watts = +(e.target as HTMLInputElement).value);
  ($('sC') as HTMLInputElement).oninput = (e) => (sim.cad = +(e.target as HTMLInputElement).value);
  ($('sBot') as HTMLInputElement).onchange = (e) => (sim.bot = (e.target as HTMLInputElement).checked);
  hud.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => {
    sim.speed = +(b as HTMLElement).dataset.sp!;
    sim.bot = true;
    ($('sBot') as HTMLInputElement).checked = true;
  }));
  buildSegBar();
}
export function hideRideHUD() {
  hud?.remove();
  hud = null;
  document.body.classList.remove('riding');
  overlay?.remove();
  overlay = null;
}

let barIdx = -1;
function buildSegBar() {
  const bar = $('evBar');
  if (!bar || !ride) return;
  const it = curItem();
  barIdx = -1;
  if (!it || !it.ev) {
    bar.innerHTML = '';
    return;
  }
  const items = ride.items.map((x, i) => ({ x, i })).filter(({ x }) => x.ev === it.ev && x.evIdx === it.evIdx);
  const total = items.reduce((a, { x }) => a + x.seg.dur, 0);
  bar.innerHTML = items.map(({ x, i }) => `<i data-i="${i}" class="${x.seg.work ? 'work' : ''}" style="flex:${(x.seg.dur / total).toFixed(4)}"></i>`).join('');
}

let lastSegIdx = -1;
export function updateRideHUD() {
  if (!hud || !ride) return;
  const ftp = G.s.settings.ftp;
  const it = curItem()!;
  const s = it.seg;
  $('rW').textContent = String(Math.round(sens.power3s));
  $('rC').innerHTML = `${Math.round(sens.cadSm)}<u>rpm</u>`;
  $('rHR').textContent = sens.hr > 0 ? String(Math.round(sens.hr)) : '–';
  $('rHRbox').classList.toggle('dim', !(sens.hr > 0));
  const isErg = s.kind === 'erg' || s.kind === 'cadence';
  if (isErg) {
    $('rTL').textContent = `ERG${ride.bias ? ' ' + (ride.bias > 0 ? '+' : '') + Math.round(ride.bias * 100) + '%' : ''}`;
    $('rT').innerHTML = `${targetW(s, ride.segT)}<u>W</u>`;
  } else if (s.kind === 'sprint') {
    $('rTL').textContent = 'SPRINT';
    $('rT').innerHTML = `${Math.round(ftp * 1.4)}+<u>W</u>`;
  } else {
    $('rTL').textContent = 'GEAR';
    $('rT').innerHTML = `${G.s.settings.gear}<u>/24</u>`;
  }
  $('rTime').textContent = fmtClock(ride.t);
  $('rKJ').textContent = fmtInt(ride.kj);
  $('rCred').textContent = fmtInt(ride.credited + ride.bonusEnergy);
  const cap = batteryCap();
  $('rBat').style.width = clamp((G.s.res.energy / cap) * 100, 0, 100) + '%';
  $('rBatT').textContent = `${fmtNum(G.s.res.energy)} / ${fmtNum(cap)} kJ`;
  const z = zoneOf(sens.power3s, ftp);
  $('rZone').textContent = `Z${z} ${ZONE_NAMES[z]}${s.kind === 'free' ? ` · ×${ZONE_MULT[z]} energy` : ''}`;
  // gear box: visible in gear modes (virtual) or always to adjust bias
  const gear = $('rGear');
  gear.style.opacity = isErg ? '0.75' : '1';
  $('gN').textContent = isErg && G.s.settings.gears === 'virtual' ? `${ride.bias >= 0 ? '+' : ''}${Math.round(ride.bias * 100)}%` : String(G.s.settings.gear);
  $('gW').textContent = isErg ? 'ERG bias' : G.s.settings.gears === 'virtual' ? `90rpm≈${Math.round(gearCenterW())}W` : 'real gears';
  $('rPause').textContent = ride.paused === 'user' ? '▶ Resume' : '⏸ Pause';
  // event panel
  const ev = curEvent();
  const remain = s.dur - ride.segT;
  const evDef = it.ev ? EVENT[it.ev] : null;
  $('evIcon').textContent = evDef ? evDef.icon : '🌤️';
  $('evName').textContent = evDef ? `${evDef.name} · ${evDef.workout}` : ride.mode === 'plan' ? 'Structured Plan' : 'Free ride';
  $('evCd').textContent = s.dur > 3000 ? '' : fmtClock(remain);
  $('evSeg').textContent = s.label + (s.kind === 'cadence' && s.rpm ? ` (cadence ${Math.round(sens.cadSm)}/${s.rpm})` : '');
  const band = $('evBand');
  if (isErg || s.kind === 'sprint') {
    band.style.display = '';
    const tw = s.kind === 'sprint' ? ftp * 1.4 : targetW(s, ride.segT);
    const max = Math.max(tw * 2, 100);
    const lo = s.kind === 'sprint' ? tw : tw * 0.95, hi = s.kind === 'sprint' ? max : tw * 1.05;
    $('evZone').style.left = (lo / max) * 100 + '%';
    $('evZone').style.width = ((hi - lo) / max) * 100 + '%';
    $('evNeedle').style.left = clamp((sens.power3s / max) * 100, 0, 100) + '%';
    const inb = sens.power3s >= lo && sens.power3s <= hi;
    $('evNeedle').style.background = inb ? '#6ee78c' : '#fff';
    $('evLbl').textContent = s.kind === 'sprint' ? `ALL OUT · ${Math.round(tw)}W+` : `${Math.round(lo)}–${Math.round(hi)} W`;
    $('evComp').textContent = ev ? `${s.work ? 'In band' : 'Score'} ${Math.round((s.work && ride.segCounted > 0 ? ride.segInBand / ride.segCounted : eventScore(ev)) * 100)}%` : '';
  } else {
    band.style.display = 'none';
  }
  if (ride.idx !== lastSegIdx) {
    lastSegIdx = ride.idx;
    buildSegBar();
  }
  const bar = $('evBar');
  if (bar && barIdx !== ride.idx) {
    barIdx = ride.idx;
    bar.querySelectorAll('i').forEach((x) => {
      const i = +(x as HTMLElement).dataset.i!;
      x.classList.toggle('done', i < ride!.idx);
      x.classList.toggle('cur', i === ride!.idx);
    });
  }
  $('rSim').classList.toggle('hidden', sens.src !== 'sim');
  ($('sBot') as HTMLInputElement).checked = sim.bot;
}

// ---------------- overlays & banners ----------------
let overlay: HTMLElement | null = null;
on('ride:paused', (why: string) => {
  overlay?.remove();
  overlay = document.createElement('div');
  overlay.className = 'reconnect';
  overlay.innerHTML = why === 'signal' ? `<div>📡 Trainer signal lost<small>Reconnecting automatically… keep pedalling gently to wake it.<br>The ride is paused and nothing is lost.</small></div>` : why === 'coast' ? `<div style="font-size:20px">⏸ Paused, pedal to resume</div>` : `<div>⏸ Paused<small>Press ${escapeHtml(G.s.settings.keys.pause)} or tap Resume</small></div>`;
  overlay.style.pointerEvents = why === 'coast' ? 'none' : 'auto';
  if (why === 'coast') overlay.style.background = 'rgba(15,20,32,0.25)';
  overlay.onclick = () => {
    if (why === 'user') togglePause();
  };
  $('ui').appendChild(overlay);
});
on('ride:resumed', () => {
  overlay?.remove();
  overlay = null;
});

const bannerQ: [string, string, number][] = [];
let bannerBusy = false;
/** Big centred announcement. Banners queue so two never overlap. */
export function banner(title: string, sub = '', ms = 3200) {
  if (uiQuiet.on) return;
  bannerQ.push([title, sub, ms]);
  if (bannerQ.length > 4) bannerQ.splice(0, bannerQ.length - 4);
  if (!bannerBusy) nextBanner();
}
function nextBanner() {
  const n = bannerQ.shift();
  if (!n) {
    bannerBusy = false;
    return;
  }
  bannerBusy = true;
  const [title, sub, ms] = n;
  const b = document.createElement('div');
  b.className = 'banner';
  b.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
  $('ui').appendChild(b);
  setTimeout(() => {
    b.remove();
    nextBanner();
  }, bannerQ.length ? Math.min(ms, 2600) : ms);
}

on('event:start', (ev: any) => {
  const d = EVENT[ev.id];
  banner(`${d.icon} ${d.name}`, `${d.workout} · ${Math.round(workSeconds(d) / 60)} min of work · ${DISTRICT[d.district].name}`, 4500);
});
on('event:done', (ev: any) => {
  const d = EVENT[ev.id];
  const pct = Math.round(ev.score * 100);
  banner(ev.full ? `✅ ${d.name} complete!` : `🟡 ${d.name}: partial`, `${pct}% in band · ⚡+${ev.rewards?.energy || 0} kJ${ev.rewards?.sparks ? ' · ✦' + ev.rewards.sparks : ''}`, 4500);
});
on('plan:complete', () => banner('🗓️ Plan complete!', 'Keep riding freely, or tap Finish', 4000));
on('toast', (m: string) => toast(m));
on('gear', (g: number, w: number) => toast(`⚙️ Gear ${g} · 90 rpm ≈ ${w} W (${Math.round(rpmFor(G.s.settings.ftp * 0.75))} rpm for Z2)`));

export function confirmEnd(onYes: () => void) {
  if (!ride) return;
  const remaining = ride.items.slice(ride.idx).some((i) => i.ev);
  const b = sheet('🏁 Finish ride?', `<p class="sub">${remaining ? 'An event is still running. You keep partial credit for what you did.' : 'Great work. Your energy is already in the battery.'}</p><div class="row"><button class="btn good focusable" id="feYes">🏁 Finish</button><button class="btn sec focusable" id="feNo">Keep riding</button></div>`, { center: true, id: 'finish' });
  b.querySelector('#feYes')!.addEventListener('click', () => {
    closeSheet('finish');
    onYes();
  });
  b.querySelector('#feNo')!.addEventListener('click', () => closeSheet('finish'));
}

export { startRide, endRide, markDirty };
