// Settings sheet: rider, trainer, controls, audio, display, save management, debug.
import { G, newGame } from '../core/state';
import { exportJSON, markDirty, parseImport, saveInfo, saveNow } from '../core/save';
import { clamp, escapeHtml, saveBlob } from '../core/util';
import { applyVolumes, audioInit } from '../audio/audio';
import { status, connectHR, connectTrainer, bluetoothAvailable } from '../ride/trainer';
import { emit, on } from '../core/bus';
import { confirmSheet, pickFile, sheet, toast } from './ui';
import { resize } from '../render/renderer';
import { clearTerrain } from '../render/terrain';
import { clearSprites, clearThumbs } from '../render/sprites';
import { DEFAULT_KEYS } from '../core/state';
import type { KeyAction } from '../core/types';

const KEYLBL: Record<KeyAction, string> = {
  shiftUp: 'Shift up / ERG +2%',
  shiftDown: 'Shift down / ERG −2%',
  confirm: 'Confirm / select',
  cancel: 'Cancel / back',
  next: 'Next option',
  prev: 'Previous option',
  pause: 'Pause ride',
  skip: 'Skip segment (free ride)',
};

export let keyCapture: ((k: string) => void) | null = null;

export function openSettings(tab = 'rider') {
  const s = G.s.settings;
  const tabs = [['rider', '🚴 Rider & trainer'], ['controls', '🎮 Controls'], ['audio', '🔊 Audio'], ['display', '🖥️ Display'], ['save', '💾 Save'], ['debug', '🧪 Debug']];
  const body = sheet('⚙️ Settings', '', { id: 'settings' });
  const render = () => {
    let html = `<div class="tabs">${tabs.map(([id, n]) => `<button class="tab focusable ${id === tab ? 'on' : ''}" data-tab="${id}">${n}</button>`).join('')}</div>`;
    if (tab === 'rider') {
      html += `<div class="formgrid">
        <label class="f">FTP (watts)<input id="sFtp" type="number" min="80" max="600" value="${s.ftp}"></label>
        <label class="f">Weight (kg)<input id="sWt" type="number" min="35" max="160" value="${s.weightKg}"></label>
        <label class="f">Gears<select id="sGears"><option value="virtual" ${s.gears === 'virtual' ? 'selected' : ''}>Virtual gears (Zwift Cog / Ride)</option><option value="real" ${s.gears === 'real' ? 'selected' : ''}>Real gears (cassette)</option></select></label>
        <label class="f">Gear feel (power at 90 rpm, gear 12)<select id="sFeel">${[0.6, 0.7, 0.8, 0.9, 1.0].map((v) => `<option value="${v}" ${s.gearFeel === v ? 'selected' : ''}>${Math.round(v * 100)}% FTP</option>`).join('')}</select></label>
        <label class="f">Weekly ride target (streaks)<select id="sWk">${[1, 2, 3, 4, 5].map((v) => `<option ${s.weeklyRides === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      </div>
      <h3>Devices</h3>
      <p class="note">${bluetoothAvailable() ? 'Pair before you ride. On iPad use Bluefy.' : 'Bluetooth isn\'t available in this browser. On iPad, open this page in <b>Bluefy</b>; on a computer use Chrome. The simulated trainer works everywhere.'}</p>
      <div class="row"><button class="btn focusable" id="sPairT">🔗 Pair trainer</button><span class="note">${escapeHtml(status.trainer)}</span></div>
      <div class="row" style="margin-top:8px"><button class="btn sec focusable" id="sPairH">❤️ Pair heart rate</button><span class="note">${escapeHtml(status.hr)}</span></div>
      <details style="margin-top:10px"><summary class="note">Bluetooth log</summary><pre style="font-size:11px;white-space:pre-wrap">${escapeHtml(status.log.join('\n'))}</pre></details>`;
    } else if (tab === 'controls') {
      html += `<p class="sub">Zwift Ride buttons reach the game as keyboard keys through BikeControl on your Pixel. In BikeControl, map each button to the key shown. Tap <b>Change</b>, then press the button.</p>
      ${(Object.keys(KEYLBL) as KeyAction[]).map((a) => `<div class="list"><div><span style="flex:1">${KEYLBL[a]}</span><kbd>${s.keys[a] === ' ' ? 'Space' : escapeHtml(s.keys[a])}</kbd><button class="btn sec sm focusable" data-k="${a}">Change</button></div></div>`).join('')}
      <div class="row" style="margin-top:10px"><button class="btn sec sm focusable" id="kReset">Reset defaults</button></div>
      <p class="note">Keyboard fallback: arrows change simulated watts/cadence, Space sprints, +/− zooms, WASD pans. A gamepad's shoulder buttons also shift.</p>`;
    } else if (tab === 'audio') {
      const sl = (id: string, v: number, lbl: string) => `<label class="f">${lbl} <input type="range" min="0" max="1" step="0.05" id="${id}" value="${v}"></label>`;
      html += `<div class="row"><label class="row" style="font-weight:800"><input type="checkbox" id="aMute" ${s.muted ? 'checked' : ''}> Mute everything</label></div>
      <div class="formgrid" style="margin-top:8px">${sl('aMaster', s.vol.master, 'Master')}${sl('aMusic', s.vol.music, 'Music')}${sl('aAmb', s.vol.amb, 'Town & weather')}${sl('aSfx', s.vol.sfx, 'Effects')}</div>`;
    } else if (tab === 'display') {
      html += `<div class="formgrid">
        <label class="f">Quality<select id="dQ"><option value="high" ${s.quality === 'high' ? 'selected' : ''}>High (Retina)</option><option value="balanced" ${s.quality === 'balanced' ? 'selected' : ''}>Balanced</option><option value="battery" ${s.quality === 'battery' ? 'selected' : ''}>Battery saver</option></select></label>
        <label class="f">Time of day<select id="dTime">${[['real', 'Real clock'], ['day', 'Always day'], ['night', 'Always night'], ['fast', 'Fast cycle (10 min)']].map(([v, n]) => `<option value="${v}" ${s.timeMode === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="f">Seasons<select id="dSeason">${[['real', 'Real calendar'], ['fast', 'One per week'], ['spring', 'Always spring'], ['summer', 'Always summer'], ['autumn', 'Always autumn'], ['winter', 'Always winter']].map(([v, n]) => `<option value="${v}" ${s.seasonMode === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </div><div class="row" style="margin-top:10px"><label class="row" style="font-weight:800"><input type="checkbox" id="dFps" ${s.showFps ? 'checked' : ''}> Show FPS</label></div>`;
    } else if (tab === 'save') {
      html += `<p class="note">Your town saves to this device (${saveInfo.backend === 'idb' ? 'IndexedDB, plus a localStorage copy' : saveInfo.backend === 'ls' ? 'localStorage' : 'not saved yet'}) every 30 seconds and after every action. ${saveInfo.lastSaveAt ? 'Last saved ' + new Date(saveInfo.lastSaveAt).toLocaleTimeString() + '.' : ''} ${saveInfo.error ? '<b style="color:var(--bad)">' + escapeHtml(saveInfo.error) + '</b>' : ''}</p>
      <p class="note">Export a backup now and then. Saves carry a version number, and newer builds upgrade old saves in place, so updates never wipe your town.</p>
      <div class="row"><button class="btn focusable" id="svExp">⬇ Export save (.json)</button><button class="btn sec focusable" id="svImp">⬆ Import save</button></div>
      <h3>Danger zone</h3><button class="btn danger focusable" id="svReset">Start a brand-new town</button>`;
    } else if (tab === 'debug') {
      html += `<p class="note">Testing tools: simulated trainer, scripted bot and time-skip. They work on your real save, so export it first if you care.</p>
      <div class="row"><label class="row" style="font-weight:800"><input type="checkbox" id="dbg" ${s.debug ? 'checked' : ''}> Show debug panel during rides</label></div>
      <div class="row" style="margin-top:8px"><button class="btn sec sm focusable" data-skip="1">⏩ +1 hour</button><button class="btn sec sm focusable" data-skip="8">+8 hours</button><button class="btn sec sm focusable" data-skip="24">+1 day</button><button class="btn sec sm focusable" data-skip="168">+1 week</button><button class="btn sec sm focusable" data-skip="720">+30 days</button></div>
      <div class="row" style="margin-top:8px"><button class="btn sec sm focusable" id="dbBot">🤖 Bot plays a 45-min plan at 60×</button><button class="btn sec sm focusable" id="dbLong">📆 Simulate 12 weeks of riding</button><button class="btn sec sm focusable" id="dbRich">💰 Grant 5,000 of everything</button></div>
      <p class="note">Time offset: ${(G.s.timeOffset / 3600000).toFixed(1)} h</p>`;
    }
    body.innerHTML = html;
    body.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      tab = (b as HTMLElement).dataset.tab!;
      render();
    }));
    const bind = (id: string, f: (el: HTMLInputElement) => void, ev = 'change') => {
      const el = body.querySelector('#' + id) as HTMLInputElement | null;
      if (el) el.addEventListener(ev, () => {
        f(el);
        markDirty();
      });
    };
    bind('sFtp', (e) => {
      s.ftp = clamp(+e.value || 200, 80, 600);
      e.value = String(s.ftp);
    });
    bind('sWt', (e) => (s.weightKg = clamp(+e.value || 75, 35, 160)));
    bind('sGears', (e) => (s.gears = e.value as any));
    bind('sFeel', (e) => (s.gearFeel = +e.value));
    bind('sWk', (e) => (s.weeklyRides = +e.value));
    body.querySelector('#sPairT')?.addEventListener('click', async () => {
      audioInit();
      await connectTrainer();
      render();
    });
    body.querySelector('#sPairH')?.addEventListener('click', async () => {
      await connectHR();
      render();
    });
    body.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
      (b as HTMLElement).textContent = 'Press a key…';
      keyCapture = (k) => {
        keyCapture = null;
        s.keys[(b as HTMLElement).dataset.k as KeyAction] = k;
        markDirty();
        render();
      };
    }));
    body.querySelector('#kReset')?.addEventListener('click', () => {
      s.keys = { ...DEFAULT_KEYS };
      markDirty();
      render();
    });
    const vol = (id: string, k: keyof typeof s.vol) => bind(id, (e) => {
      s.vol[k] = +e.value;
      audioInit();
      applyVolumes();
    }, 'input');
    vol('aMaster', 'master');
    vol('aMusic', 'music');
    vol('aAmb', 'amb');
    vol('aSfx', 'sfx');
    bind('aMute', (e) => {
      s.muted = e.checked;
      applyVolumes();
    });
    bind('dQ', (e) => {
      s.quality = e.value as any;
      resize();
      clearTerrain();
      clearSprites();
    });
    bind('dTime', (e) => (s.timeMode = e.value as any));
    bind('dSeason', (e) => {
      s.seasonMode = e.value as any;
      clearThumbs();
    });
    bind('dFps', (e) => (s.showFps = e.checked));
    bind('dbg', (e) => (s.debug = e.checked));
    body.querySelector('#svExp')?.addEventListener('click', () => saveBlob(exportJSON(), `dynamo-town-${new Date().toISOString().slice(0, 10)}.json`, toast));
    body.querySelector('#svImp')?.addEventListener('click', async () => {
      const [f] = await pickFile('.json,application/json');
      if (!f) return;
      try {
        const ns = parseImport(await f.text());
        confirmSheet('Import this save?', `It replaces the current town (${G.s.buildings.length} buildings) with the one in the file (${ns.buildings.length} buildings, ${Math.round(ns.lifetimeKJ).toLocaleString()} lifetime kJ).`, 'Import', async () => {
          G.s = ns;
          await saveNow();
          location.reload();
        }, true);
      } catch (e: any) {
        toast('Import failed: ' + escapeHtml(e.message));
      }
    });
    body.querySelector('#svReset')?.addEventListener('click', () =>
      confirmSheet('Start a brand-new town?', 'Your current town will be replaced. Export a save first if you want to keep it.', 'Start over', async () => {
        G.s = newGame(Date.now());
        await saveNow();
        location.reload();
      }, true),
    );
    body.querySelectorAll('[data-skip]').forEach((b) => b.addEventListener('click', () => {
      emit('debug:skip', +(b as HTMLElement).dataset.skip!);
      render();
    }));
    body.querySelector('#dbBot')?.addEventListener('click', () => emit('debug:bot'));
    body.querySelector('#dbLong')?.addEventListener('click', () => emit('debug:longtest'));
    body.querySelector('#dbRich')?.addEventListener('click', () => {
      for (const k of ['energy', 'food', 'materials', 'research', 'gold'] as const) G.s.res[k] += 5000;
      G.s.res.sparks += 50;
      markDirty();
      toast('Granted');
    });
  };
  render();
}

on('ble:status', () => {
  /* settings sheet re-renders on its own actions */
});
