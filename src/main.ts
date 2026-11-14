import './style.css';
import { G, newGame, now } from './core/state';
import { loadGame, saveNow, startAutosave, markDirty } from './core/save';
import { $, clamp } from './core/util';
import { on } from './core/bus';
import { sens, sim, readSensors } from './ride/sensors';
import { creditEnergy, tick } from './sim/economy';
import { ensureStartPlots } from './sim/town';
import { tierFor, TIERS } from './data/tiers';
import { initRenderer, frame } from './render/renderer';
import { initInput } from './render/input';
import { cam, focusTile } from './render/iso';
import { RS } from './render/rstate';
import { buildHUD, updateHUD } from './ui/townui';
import { openSettings } from './ui/settings';
import { toast } from './ui/ui';
import { audioInit, sfx } from './audio/audio';

const cv = $('cv') as HTMLCanvasElement;
let riding = false;

function checkTier() {
  const t = tierFor(G.s.lifetimeKJ);
  while (G.s.tier < t) {
    G.s.tier++;
    const T = TIERS[G.s.tier];
    G.s.res.sparks += T.reward.sparks;
    G.s.res.gold += T.reward.gold;
    toast(`${T.icon} Your town is now a <b>${T.name}</b>! ${T.blurb}`, true);
    sfx('tier');
    markDirty();
  }
}

let last = performance.now();
let uiT = 0;
function loop(tms: number) {
  const dt = Math.min(0.1, (tms - last) / 1000);
  last = tms;
  readSensors(dt, { mode: 'gear' });
  if (riding) {
    const kj = (sens.power * dt) / 1000;
    G.s.lifetimeKJ += kj;
    creditEnergy(kj);
  }
  tick(dt / 3600, riding);
  G.s.lastTick = now();
  RS.power = sens.powerSm;
  RS.cad = sens.cadSm;
  RS.ftp = G.s.settings.ftp;
  RS.riding = riding;
  RS.grid = riding ? 0.4 + clamp(sens.powerSm / G.s.settings.ftp, 0, 1.2) : G.s.res.energy > 1 ? 0.75 : 0.2;
  RS.crankAngle += ((sens.cadSm / 60) * Math.PI * 2) * dt;
  RS.wheelAngle += ((sens.cadSm / 60) * Math.PI * 2 * 0.55) * dt;
  frame(dt, tms / 1000);
  uiT += dt;
  if (uiT > 0.25) {
    uiT = 0;
    updateHUD();
    checkTier();
  }
  requestAnimationFrame(loop);
}

async function boot() {
  initRenderer(cv);
  initInput(cv);
  const loaded = await loadGame();
  G.s = loaded || newGame(Date.now());
  ensureStartPlots();
  startAutosave();
  await saveNow();
  buildHUD();
  focusTile(20, 20, 1.6, true);
  on('ui:settings', () => openSettings());
  on('ui:ride', () => {
    audioInit();
    riding = !riding;
    toast(riding ? '🚴 Riding (simulated). Use ↑/↓ for watts.' : 'Ride stopped');
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') sim.watts = clamp(sim.watts + 10, 0, 1500);
    if (e.key === 'ArrowDown') sim.watts = clamp(sim.watts - 10, 0, 1500);
  });
  addEventListener('pointerdown', () => audioInit(), { once: true });
  requestAnimationFrame(loop);
  (window as any).__dt = { G, sim, sens, saveNow, cam, RS };
}
boot();
