import './style.css';
import { G, newGame, now } from './core/state';
import { loadGame, saveNow, startAutosave, markDirty, loadActiveRide, clearActiveRide, saveInfo } from './core/save';
import { $, clamp, escapeHtml, fmtInt } from './core/util';
import { emit, on } from './core/bus';
import type { DistrictId } from './core/types';
import { sens, sim, readSensors } from './ride/sensors';
import { applyTarget } from './ride/trainer';
import { tick, invalidate } from './sim/economy';
import { ensureStartPlots } from './sim/town';
import { checkAchievements, checkTier, citizenTick, ensureCharter, idleCatchUp, requestReady } from './sim/progression';
import { ACH } from './data/achievements';
import { TIERS } from './data/tiers';
import { EVENT } from './data/events';
import { PLOT, PLOTS, plotDistrict } from './sim/map';
import { initRenderer, frame, snapshot, resize } from './render/renderer';
import { clearTerrain } from './render/terrain';
import { clearSprites } from './render/sprites';
import { initInput, inputState } from './render/input';
import { cam, focusTile } from './render/iso';
import { RS } from './render/rstate';
import { buildHUD, setMode, setRequestReady, showTownHUD, updateHUD, mode } from './ui/townui';
import { openSettings } from './ui/settings';
import { openRideMenu, showRideHUD, hideRideHUD, updateRideHUD, confirmEnd, banner } from './ui/rideui';
import { openResearch, openTown, openDynamo, showAway } from './ui/panels';
import { openStats } from './ui/stats';
import { showPostRide, type PostRide } from './ui/postride';
import { closeSheet, sheet, toast } from './ui/ui';
import { audioInit, sfx } from './audio/audio';
import { curItem, endRide, ride, startRide, updateRide } from './ride/session';
import { initControls } from './ride/controls';
import { thumbURL } from './render/sprites';
import { runLongTest, simulateRide, autoSpend } from './sim/longtest';
import type { Sample } from './ride/metrics';

const cv = $('cv') as HTMLCanvasElement;
let fpsEl: HTMLElement | null = null;
const during: { unlocked: string[]; tierUp: number[] } = { unlocked: [], tierUp: [] };

// ------------- main loop -------------
let last = performance.now();
let uiT = 0, slowT = 0, frames = 0, fpsT = 0, slowSecs = 0;
function loop(tms: number) {
  const dt = Math.min(0.1, (tms - last) / 1000);
  last = tms;
  try {
    if (ride) {
      updateRide(dt);
      const speed = sim.bot && sens.src === 'sim' ? sim.speed : 1;
      if (ride && !ride.paused) tick((dt * speed) / 3600, true);
      followEvent();
    } else {
      readSensors(dt, { mode: 'idle' });
      tick(dt / 3600, false);
      RS.grid = G.s.res.energy > 1 ? 0.85 : 0.45;
    }
    G.s.lastTick = now();
    RS.power = sens.powerSm;
    RS.cad = sens.cadSm;
    RS.ftp = G.s.settings.ftp;
    RS.crankAngle += (sens.cadSm / 60) * Math.PI * 2 * dt;
    RS.wheelAngle += (sens.cadSm / 60) * Math.PI * 2 * 0.55 * dt;
    RS.lowFx = G.s.settings.quality === 'battery';
    const f0 = performance.now();
    frame(dt, tms / 1000);
    RS.frameMs = RS.frameMs * 0.95 + (performance.now() - f0) * 0.05;
  } catch (e) {
    console.error(e);
  }
  uiT += dt;
  slowT += dt;
  frames++;
  fpsT += dt;
  if (fpsT >= 1) {
    RS.fps = frames / fpsT;
    // adaptive quality: if High can't hold ~45 fps for a while, step down once
    if (G.s.settings.quality === 'high' && document.visibilityState === 'visible') {
      slowSecs = RS.fps < 45 ? slowSecs + 1 : 0;
      if (slowSecs >= 5) {
        G.s.settings.quality = 'balanced';
        resize();
        clearTerrain();
        clearSprites();
        markDirty();
        toast('Switched to Balanced quality for smoother frames (Settings → Display)');
      }
    }
    frames = 0;
    fpsT = 0;
    if (G.s.settings.showFps) {
      if (!fpsEl) {
        fpsEl = document.createElement('div');
        fpsEl.className = 'fps';
        document.body.appendChild(fpsEl);
      }
      fpsEl.textContent = `${Math.round(RS.fps)} fps · ${RS.frameMs.toFixed(1)} ms`;
    } else if (fpsEl) {
      fpsEl.remove();
      fpsEl = null;
    }
  }
  if (uiT > 0.1) {
    uiT = 0;
    if (ride) updateRideHUD();
    else updateHUD();
  }
  if (slowT > 1) {
    slowT = 0;
    checkTier();
    checkAchievements();
    citizenTick();
    ensureCharter();
  }
  requestAnimationFrame(loop);
}

function followEvent() {
  const it = curItem();
  if (!it || inputState.dragging || !cam.follow) return;
  const d = (it.ev ? EVENT[it.ev].district : 'residential') as DistrictId;
  const p = G.s.plots.find((x) => plotDistrict(x) === d);
  if (it.ev && p != null) focusTile((p % PLOTS) * PLOT + 4, Math.floor(p / PLOTS) * PLOT + 4, cam.tz);
  else focusTile(20, 21, cam.tz);
}

// ------------- ride flow -------------
function beginRide(m: 'event' | 'plan' | 'free', arg: string | number) {
  audioInit();
  setMode({ kind: 'town' });
  let before = '';
  try {
    before = snapshot(640, 400).toDataURL('image/jpeg', 0.8);
  } catch {}
  during.unlocked = [];
  during.tierUp = [];
  startRide(m, arg, before);
  showTownHUD(false);
  showRideHUD();
  cam.follow = true;
  try {
    (navigator as any).wakeLock?.request('screen');
  } catch {}
  markDirty();
}

function finishRide() {
  const r = endRide();
  hideRideHUD();
  showTownHUD(true);
  cam.follow = false;
  checkTier();
  checkAchievements();
  if (!r) return;
  if (r.ride.samples.length < 10) {
    toast('Ride too short to record');
    return;
  }
  const pr: PostRide = { ride: r.ride, m: r.m, unlocked: [...during.unlocked], tierUp: [...during.tierUp], built: r.ride.built };
  showPostRide(pr, () => {});
}

// ------------- bus wiring -------------
function wire() {
  on('ui:settings', () => openSettings());
  on('ui:ride', () => openRideMenu());
  on('ui:research', () => openResearch());
  on('ui:town', () => openTown());
  on('ui:stats', () => openStats());
  on('ui:tiers', () => openTown('tiers'));
  on('ui:dynamo', () => openDynamo());
  on('ui:cancel', () => {
    if (mode.kind !== 'town') setMode({ kind: 'town' });
  });
  on('ride:begin', (m: any, arg: any) => beginRide(m, arg));
  on('ride:end', () => confirmEnd(finishRide));
  on('tier', (t: number) => {
    const T = TIERS[t];
    during.tierUp.push(t);
    sfx('tier');
    if (ride) banner(`${T.icon} Your town is now a ${T.name}!`, T.blurb, 5000);
    else toast(`${T.icon} Your town is now a <b>${T.name}</b>! ${T.blurb}`, true);
  });
  on('achievements', (ids: string[]) => {
    during.unlocked.push(...ids);
    sfx('achievement');
    for (const id of ids.slice(0, 3)) toast(`🏆 ${ACH[id].icon} <b>${escapeHtml(ACH[id].name)}</b>`);
  });
  on('citizen', (c: any) => toast(`${c.emoji} <b>${escapeHtml(c.name)}</b> moved to town!`));
  on('charter:done', () => {
    sfx('success');
    toast('📜 Weekly Charter complete! Rewards granted.', true);
  });
  on('research', () => invalidate());
  on('trainer:connected', () => {
    toast('🔗 Trainer connected');
    if (!ride) applyTarget({ mode: 'idle' }, true);
  });
  on('trainer:lost', () => toast('📡 Trainer signal lost, reconnecting…'));
  on('trainer:back', () => toast('✅ Trainer reconnected'));
  on('debug:skip', (h: number) => {
    G.s.timeOffset += h * 3600000;
    const r = idleCatchUp();
    if (r) showAway(r);
    markDirty();
  });
  on('debug:bot', () => {
    closeSheet();
    sens.src = 'sim';
    sim.bot = true;
    sim.speed = 60;
    G.s.settings.debug = true;
    beginRide('plan', 45);
  });
  on('debug:longtest', async () => {
    closeSheet();
    const box = sheet('📆 Long-term test', '<p class="sub" id="ltLog">Running…</p>', { center: true, id: 'lt' });
    const log = await runLongTest(12, (m) => {
      const el = box.querySelector('#ltLog');
      if (el) el.innerHTML = m;
    });
    const el = box.querySelector('#ltLog');
    if (el) el.innerHTML = log;
  });
  setRequestReady(requestReady);
}

// ------------- boot -------------
async function recoverRide() {
  const r = await loadActiveRide();
  if (!r || !r.samples || r.samples.length < 30) {
    if (r) clearActiveRide();
    return;
  }
  const body = sheet('🩹 Unfinished ride found', `<p class="sub">A ride from ${new Date(r.start).toLocaleString()} (${Math.round(r.samples.length / 60)} min, ${fmtInt(r.kj)} kJ) didn't finish properly. Its energy is already in your battery. Save it as a ride so you can export it?</p><div class="row"><button class="btn good focusable" id="rcYes">Save the ride</button><button class="btn sec focusable" id="rcNo">Discard</button></div>`, { center: true, id: 'recover' });
  body.querySelector('#rcYes')!.addEventListener('click', () => {
    closeSheet('recover');
    // rebuild the ride and finalize it without crediting energy twice
    const rr = startRide('free', 0, '');
    rr.start = r.start;
    rr.samples = r.samples as Sample[];
    rr.t = r.samples.length;
    rr.kj = r.kj;
    rr.credited = r.credited;
    rr.mode = r.mode;
    showRideHUD();
    finishRide();
  });
  body.querySelector('#rcNo')!.addEventListener('click', () => {
    clearActiveRide();
    closeSheet('recover');
  });
}

async function boot() {
  initRenderer(cv);
  initInput(cv);
  const loaded = await loadGame();
  G.s = loaded || newGame(Date.now());
  ensureStartPlots();
  wire();
  initControls();
  buildHUD();
  focusTile(20, 21, innerWidth < 700 ? 1.2 : 1.6, true);
  const away = loaded ? idleCatchUp() : null;
  ensureCharter();
  citizenTick();
  startAutosave();
  await saveNow();
  requestAnimationFrame(loop);
  if (!loaded) welcome();
  else if (away && away.secs > 600) showAway(away);
  recoverRide();
  addEventListener('pointerdown', () => audioInit(), { once: true });
  addEventListener('keydown', () => audioInit(), { once: true });
  (window as any).__dt = { G, sim, sens, saveNow, cam, RS, emit, simulateRide, autoSpend, saveInfo, startRide, endRide, finishRide, thumbURL, bench: (n = 20, skip: Record<string, boolean> = {}) => { RS.skip = skip; frame(0.016, 1); const t0 = performance.now(); for (let i = 0; i < n; i++) frame(0.016, 1 + i * 0.016); RS.skip = {}; return +((performance.now() - t0) / n).toFixed(1); }, get ride() { return ride; } };
}

function welcome() {
  const b = sheet('⚡ Welcome to Dynamo Town', `
    <p class="sub">You are this town's power plant. Every watt you pedal spins the Dynamo, charges the battery and lights the windows.</p>
    <div class="list">
      <div>🚴 <b>Ride</b> to generate energy (kJ). Grid events turn the town's needs into workouts, with ERG holding your targets.</div>
      <div>🔨 <b>Build</b> with that energy between rides: homes, farms, workshops, and later a harbor, a campus, a gecko sanctuary and a sky dock.</div>
      <div>🌙 While you rest, the town hums along slowly on the battery. Rest days never hurt it.</div>
    </div>
    <div class="formgrid" style="margin-top:12px"><label class="f">Your FTP (watts)<input id="wFtp" type="number" min="80" max="600" value="${G.s.settings.ftp}"></label></div>
    <div class="row" style="margin-top:14px"><button class="btn good focusable" id="wGo">Let's build! 🏡</button></div>
    <p class="note">On iPad, open this page in Bluefy, then pair your KICKR from the Ride menu.</p>`, { center: true, id: 'welcome' });
  b.querySelector('#wGo')!.addEventListener('click', () => {
    G.s.settings.ftp = clamp(+(b.querySelector('#wFtp') as HTMLInputElement).value || 200, 80, 600);
    markDirty();
    closeSheet('welcome');
    audioInit();
    toast('Tip: tap 🔨 Build and place a Cottage next to the Dynamo');
  });
}

boot();
