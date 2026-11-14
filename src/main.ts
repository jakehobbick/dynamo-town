import './style.css';
import { G, newGame, now } from './core/state';
import { loadGame, saveNow, startAutosave, markDirty, exportJSON, parseImport, saveInfo } from './core/save';
import { $, clamp, fmtNum, saveBlob } from './core/util';
import { sens, sim, readSensors } from './ride/sensors';
import { batteryCap, creditEnergy, tick } from './sim/economy';
import { ensureStartPlots } from './sim/town';
import { sheet, toast, pickFile, confirmSheet } from './ui/ui';

const cv = $('cv') as HTMLCanvasElement;
const ctx = cv.getContext('2d')!;
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = innerWidth;
  H = innerHeight;
  cv.width = W * DPR;
  cv.height = H * DPR;
}
addEventListener('resize', resize);

let riding = false;
let rideKJ = 0;
let angle = 0;

function topbar() {
  const cap = batteryCap();
  $('ui').innerHTML = `
  <div class="topbar">
    <div class="chip energy"><span class="ic">⚡</span><span id="en">${fmtNum(G.s.res.energy)}</span><div class="battery"><i id="bat" style="width:${(G.s.res.energy / cap) * 100}%"></i><b id="batT">${fmtNum(G.s.res.energy)} / ${fmtNum(cap)} kJ</b></div></div>
    <div class="chip"><span class="ic">🍞</span>${fmtNum(G.s.res.food)}</div>
    <div class="chip"><span class="ic">🪵</span>${fmtNum(G.s.res.materials)}</div>
    <div class="chip"><span class="ic">🪙</span>${fmtNum(G.s.res.gold)}</div>
    <div class="spacer"></div>
    <div class="chip"><small>Lifetime</small> ${fmtNum(G.s.lifetimeKJ)} kJ</div>
  </div>
  <div class="dock"><button class="fab" id="bSet">⚙️</button><button class="fab ridebtn" id="bRide">${riding ? '⏹ Stop' : '🚴 Ride'}</button></div>
  <div class="simpanel" id="simp">
    <div>Simulated trainer</div>
    <label class="f">Power <span id="wv">${Math.round(sim.watts)} W</span><input id="w" type="range" min="0" max="900" value="${sim.watts}"></label>
    <label class="f">Cadence <span id="cvv">${Math.round(sim.cad)} rpm</span><input id="c" type="range" min="0" max="140" value="${sim.cad}"></label>
    <div id="live">0 W · 0 kJ this ride</div>
  </div>`;
  $('w').oninput = (e) => { sim.watts = +(e.target as HTMLInputElement).value; $('wv').textContent = sim.watts + ' W'; };
  $('c').oninput = (e) => { sim.cad = +(e.target as HTMLInputElement).value; $('cvv').textContent = sim.cad + ' rpm'; };
  $('bRide').onclick = () => {
    riding = !riding;
    if (!riding) toast(`Ride finished: ${Math.round(rideKJ)} kJ stored`, true);
    rideKJ = 0;
    topbar();
  };
  $('bSet').onclick = settingsSheet;
}

function settingsSheet() {
  const b = sheet('⚙️ Settings', `
    <div class="formgrid"><label class="f">FTP (W)<input id="ftp" type="number" min="80" max="600" value="${G.s.settings.ftp}"></label></div>
    <h3>Save</h3>
    <p class="note">Saved to ${saveInfo.backend === 'idb' ? 'IndexedDB (plus a localStorage copy)' : saveInfo.backend === 'ls' ? 'localStorage' : 'nowhere yet'}. Autosaves every 30 s and after every action.</p>
    <div class="row"><button class="btn sec" id="exp">⬇ Export save (.json)</button><button class="btn sec" id="imp">⬆ Import save</button><button class="btn danger" id="reset">Start over</button></div>`);
  (b.querySelector('#ftp') as HTMLInputElement).onchange = (e) => {
    G.s.settings.ftp = clamp(+(e.target as HTMLInputElement).value || 200, 80, 600);
    markDirty();
  };
  b.querySelector('#exp')!.addEventListener('click', () => saveBlob(exportJSON(), `dynamo-town-${new Date().toISOString().slice(0, 10)}.json`, toast));
  b.querySelector('#imp')!.addEventListener('click', async () => {
    const [f] = await pickFile('.json,application/json');
    if (!f) return;
    try {
      const s = parseImport(await f.text());
      confirmSheet('Import save?', 'This replaces your current town with the one in the file.', 'Import', async () => {
        G.s = s;
        await saveNow();
        location.reload();
      }, true);
    } catch (e: any) {
      toast('Import failed: ' + e.message);
    }
  });
  b.querySelector('#reset')!.addEventListener('click', () =>
    confirmSheet('Start a new town?', 'Your current town will be replaced. Export a save first if you want to keep it.', 'Start over', async () => {
      G.s = newGame(Date.now());
      ensureStartPlots();
      await saveNow();
      location.reload();
    }, true),
  );
}

let last = performance.now();
let uiT = 0;
function loop(t: number) {
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  readSensors(dt, { mode: 'gear' });
  if (riding) {
    const kj = (sens.power * dt) / 1000;
    rideKJ += kj;
    G.s.lifetimeKJ += kj;
    creditEnergy(kj);
  }
  tick(dt / 3600, riding);
  G.s.lastTick = now();
  angle += (sens.cadSm / 60) * Math.PI * 2 * dt;
  draw();
  uiT += dt;
  if (uiT > 0.25) {
    uiT = 0;
    const cap = batteryCap();
    const en = $('en');
    if (en) {
      en.textContent = fmtNum(G.s.res.energy);
      $('bat').style.width = (G.s.res.energy / cap) * 100 + '%';
      $('batT').textContent = `${fmtNum(G.s.res.energy)} / ${fmtNum(cap)} kJ`;
      $('live').textContent = `${Math.round(sens.power)} W · ${Math.round(sens.cad)} rpm · ${rideKJ.toFixed(1)} kJ this ride`;
    }
    if (riding) markDirty();
  }
  requestAnimationFrame(loop);
}

function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#9fd3f5');
  g.addColorStop(1, '#e9f6d9');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.18;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = '#e0a33a';
  ctx.strokeStyle = '#7a4a1c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 7);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r, 0);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#2b2a3a';
  ctx.font = '600 28px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Dynamo Town', cx, cy + r + 50);
}

async function boot() {
  resize();
  const loaded = await loadGame();
  G.s = loaded || newGame(Date.now());
  ensureStartPlots();
  startAutosave();
  await saveNow();
  topbar();
  requestAnimationFrame(loop);
  (window as any).__dt = { G, sim, sens, saveNow };
}
boot();
