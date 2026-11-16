// Town mode UI: resource bar, dock, build menu, building info, plot buying, placement.
import { emit, on } from '../core/bus';
import { G } from '../core/state';
import { markDirty } from '../core/save';
import type { Building, BuildingDef } from '../core/types';
import { $, clamp, escapeHtml, fmtInt, fmtNum } from '../core/util';
import { BUILDING, BUILDINGS } from '../data/buildings';
import { DISTRICTS, DISTRICT } from '../data/districts';
import { TIERS } from '../data/tiers';
import { batteryCap, canAfford, happiness, mods, popTarget, rates } from '../sim/economy';
import { PLOT, PLOTS, districtAt, plotOf } from '../sim/map';
import { buildingAt, buyPlot, canPlaceAt, demolish, districtUnlocked, isDynamoTile, move, place, plotBuyable, plotCost, typeAvailable, upgrade, upgradeCost } from '../sim/town';
import { cam, focusTile } from '../render/iso';
import { RS } from '../render/rstate';
import { thumbURL } from '../render/sprites';
import { tierFx } from './describe';
import { closeSheet, confirmSheet, costHTML, RES_ICON, sheet, sheetOpen, toast } from './ui';
import { sfx } from '../audio/audio';

type Mode = { kind: 'town' } | { kind: 'place'; type: string } | { kind: 'move'; id: number } | { kind: 'plots' };
export let mode: Mode = { kind: 'town' };
let hudBuilt = false;

export function buildHUD() {
  const ui = $('ui');
  ui.querySelector('.townhud')?.remove();
  const el = document.createElement('div');
  el.className = 'townhud';
  el.innerHTML = `
  <div class="topbar">
    <div class="chip energy" title="Battery"><span class="ic">⚡</span><div class="battery"><i id="hBat"></i><b id="hBatT"></b></div></div>
    <div class="chip" title="Food"><span class="ic">🍞</span><span id="hFood"></span></div>
    <div class="chip" title="Materials"><span class="ic">🪵</span><span id="hMat"></span></div>
    <div class="chip" title="Research"><span class="ic">🧪</span><span id="hRes"></span></div>
    <div class="chip" title="Gold"><span class="ic">🪙</span><span id="hGold"></span></div>
    <div class="chip" title="Spark crystals"><span class="ic">✦</span><span id="hSpark"></span></div>
    <div class="spacer"></div>
    <div class="chip" title="Citizens and happiness" id="hPopChip"><span class="ic">👥</span><span id="hPop"></span><small id="hHappy"></small></div>
    <button class="chip tierchip" id="hTier" title="Town tier"><span class="ic" id="hTierIc"></span><span id="hTierN"></span><small id="hTierP"></small></button>
  </div>
  <div class="leftdock">
    <button class="fab focusable" id="dSettings" title="Settings">⚙️</button>
    <button class="fab focusable" id="dStats" title="Stats">📈</button>
    <button class="fab focusable" id="dTown" title="Town: citizens, charter, achievements">📜<span class="badge hidden" id="dTownBadge"></span></button>
  </div>
  <div class="dock">
    <div class="dockrow">
      <button class="fab focusable" id="dPlots" title="Expand">🗺️<small>Land</small></button>
      <button class="fab focusable" id="dResearch" title="Research">🔬<small>Research</small></button>
      <button class="fab focusable" id="dBuild" title="Build">🔨<small>Build</small></button>
    </div>
    <button class="fab ridebtn focusable" id="dRide">🚴 Ride</button>
  </div>`;
  ui.prepend(el);
  $('dBuild').onclick = () => openBuild();
  $('dPlots').onclick = () => setMode(mode.kind === 'plots' ? { kind: 'town' } : { kind: 'plots' });
  $('dRide').onclick = () => emit('ui:ride');
  $('dResearch').onclick = () => emit('ui:research');
  $('dTown').onclick = () => emit('ui:town');
  $('dStats').onclick = () => emit('ui:stats');
  $('dSettings').onclick = () => emit('ui:settings');
  $('hTier').onclick = () => emit('ui:tiers');
  $('hPopChip').onclick = () => emit('ui:town');
  hudBuilt = true;
  updateHUD();
}

export function showTownHUD(on: boolean) {
  const el = document.querySelector('.townhud') as HTMLElement | null;
  if (el) el.classList.toggle('hidden', !on);
}

let lastE = -1;
export function updateHUD() {
  if (!hudBuilt) return;
  const s = G.s;
  const cap = batteryCap();
  $('hBat').style.width = clamp((s.res.energy / cap) * 100, 0, 100) + '%';
  $('hBatT').textContent = `${fmtNum(s.res.energy)} / ${fmtNum(cap)} kJ`;
  $('hFood').textContent = fmtNum(s.res.food);
  $('hMat').textContent = fmtNum(s.res.materials);
  $('hRes').textContent = fmtNum(s.res.research);
  $('hGold').textContent = fmtNum(s.res.gold);
  $('hSpark').textContent = fmtNum(s.res.sparks);
  $('hPop').textContent = fmtInt(Math.floor(s.pop));
  $('hHappy').textContent = ` 😊${Math.round(happiness())}`;
  const T = TIERS[s.tier];
  const nx = TIERS[s.tier + 1];
  $('hTierIc').textContent = T.icon;
  $('hTierN').textContent = T.name;
  $('hTierP').textContent = nx ? ` ${Math.floor(((s.lifetimeKJ - T.kj) / (nx.kj - T.kj)) * 100)}%` : '';
  if (Math.floor(s.res.energy) > lastE + 5 && lastE >= 0) {
    const chip = document.querySelector('.chip.energy');
    chip?.classList.remove('bump');
    void (chip as HTMLElement)?.offsetWidth;
    chip?.classList.add('bump');
  }
  lastE = Math.floor(s.res.energy);
  const n = s.citizens.filter((c) => c.request && requestReady(c.request)).length;
  const b = $('dTownBadge');
  b.classList.toggle('hidden', !n);
  b.textContent = String(n);
}
let requestReady: (r: any) => boolean = () => false;
export function setRequestReady(f: (r: any) => boolean) {
  requestReady = f;
}

// ---------------- modes ----------------
let placeBar: HTMLElement | null = null;
export function setMode(m: Mode) {
  mode = m;
  RS.ghost = null;
  RS.moveId = 0;
  RS.showPlots = m.kind === 'plots';
  placeBar?.remove();
  placeBar = null;
  if (m.kind === 'place' || m.kind === 'move') {
    const type = m.kind === 'place' ? m.type : G.s.buildings.find((b) => b.id === m.id)!.type;
    const d = BUILDING[type];
    if (m.kind === 'move') RS.moveId = m.id;
    placeBar = document.createElement('div');
    placeBar.className = 'placebar';
    placeBar.innerHTML = `<img src="${thumbURL(type, 0, RS.season, 40)}" width="40" height="40"><div><div class="what">${m.kind === 'move' ? 'Move' : 'Place'} ${escapeHtml(d.name)}</div><div class="why" id="pbWhy">Tap a tile in ${DISTRICT[d.district].name}</div></div><button class="btn good focusable" id="pbOk" disabled>✓ ${m.kind === 'move' ? 'Move' : 'Build'}</button><button class="btn sec focusable" id="pbX">✕</button>`;
    $('ui').appendChild(placeBar);
    $('pbX').onclick = () => setMode({ kind: 'town' });
    $('pbOk').onclick = () => confirmPlace();
    // start the ghost at a sensible free spot near the screen centre
    focusDistrict(d.district);
  } else if (m.kind === 'plots') {
    placeBar = document.createElement('div');
    placeBar.className = 'placebar';
    const c = plotCost();
    placeBar.innerHTML = `<div><div class="what">🗺️ Buy land</div><div class="note">Tap a glowing plot. Next plot costs ${costHTML(c)}</div></div><button class="btn sec focusable" id="pbX">Done</button>`;
    $('ui').appendChild(placeBar);
    $('pbX').onclick = () => setMode({ kind: 'town' });
    cam.tz = Math.min(cam.tz, 0.7);
  }
  emit('mode', m.kind);
}

function focusDistrict(d: string) {
  // centre of first owned plot of that district
  for (const p of G.s.plots) {
    const px = p % PLOTS, py = Math.floor(p / PLOTS);
    if (districtAt(px * PLOT, py * PLOT) === d) {
      focusTile(px * PLOT + 4, py * PLOT + 4, Math.max(cam.tz, 1));
      return;
    }
  }
}

function setGhost(x: number, y: number) {
  if (mode.kind !== 'place' && mode.kind !== 'move') return;
  const type = mode.kind === 'place' ? mode.type : G.s.buildings.find((b) => b.id === (mode as any).id)!.type;
  const d = BUILDING[type];
  const chk = canPlaceAt(d, x, y, mode.kind === 'move' ? mode.id : 0);
  const afford = mode.kind === 'move' || canAfford(d.tiers[0].cost);
  RS.ghost = { type, x, y, ok: chk.ok && afford };
  const why = $('pbWhy');
  if (why) {
    why.textContent = chk.ok ? (afford ? 'Looks good! Tap ✓ to confirm.' : 'Not enough resources') : chk.why;
    why.style.color = chk.ok && afford ? 'var(--good)' : 'var(--bad)';
  }
  const ok = $('pbOk') as HTMLButtonElement;
  if (ok) ok.disabled = !RS.ghost.ok;
}

function confirmPlace() {
  const g = RS.ghost;
  if (!g || !g.ok) return;
  if (mode.kind === 'place') {
    const b = place(mode.type, g.x, g.y);
    if (b) {
      sfx('build');
      markDirty();
      toast(`${BUILDING[b.type].icon} ${BUILDING[b.type].name} built!`);
      emit('built', b);
      // stay in placement mode while affordable
      if (!canAfford(BUILDING[b.type].tiers[0].cost) || !typeAvailable(BUILDING[b.type]).ok) setMode({ kind: 'town' });
      else {
        RS.ghost = null;
        const why = $('pbWhy');
        if (why) {
          why.textContent = 'Tap another tile to build one more';
          why.style.color = '';
        }
        const ok = $('pbOk') as HTMLButtonElement | null;
        if (ok) ok.disabled = true;
      }
    }
  } else if (mode.kind === 'move') {
    const b = G.s.buildings.find((x) => x.id === (mode as any).id)!;
    if (move(b, g.x, g.y)) {
      sfx('click');
      markDirty();
      setMode({ kind: 'town' });
    }
  }
}

on('hover', (x: number, y: number) => {
  if (mode.kind === 'place' || mode.kind === 'move') setGhost(x, y);
});

on('tap', (x: number, y: number, info: { double: boolean }) => {
  if (sheetOpen()) return;
  if (mode.kind === 'place' || mode.kind === 'move') {
    const g = RS.ghost;
    if (g && g.x === x && g.y === y && g.ok) confirmPlace();
    else setGhost(x, y);
    return;
  }
  if (mode.kind === 'plots') {
    const p = plotOf(clamp(x, 0, 39), clamp(y, 0, 39));
    if (x < 0 || y < 0 || x >= 40 || y >= 40) return;
    if (G.s.plots.includes(p)) return;
    const chk = plotBuyable(p);
    if (!chk.ok) return toast(chk.why);
    const c = plotCost();
    confirmSheet(`Buy this plot?`, `A new ${DISTRICT[districtAt(x, y)].name} plot (8×8 tiles). ${costHTML(c)}`, 'Buy plot', () => {
      if (buyPlot(p)) {
        sfx('build');
        markDirty();
        toast('🗺️ New land!');
        setMode({ kind: 'plots' });
      } else toast('Not enough resources');
    });
    return;
  }
  if (isDynamoTile(x, y)) {
    emit('ui:dynamo');
    return;
  }
  const b = buildingAt(x, y);
  if (b) {
    RS.selected = b.id;
    buildingInfo(b);
    void info;
  } else RS.selected = 0;
});

// ---------------- build menu ----------------
let buildTab = 'residential';
export function openBuild(tab?: string) {
  if (tab) buildTab = tab;
  if (!districtUnlocked(buildTab)) buildTab = 'residential';
  const render = () => {
    const tabs = DISTRICTS.map((d) => `<button class="tab focusable ${d.id === buildTab ? 'on' : ''}" data-tab="${d.id}">${d.icon} ${d.name}${districtUnlocked(d.id) ? '' : ' 🔒'}</button>`).join('') + `<button class="tab focusable ${buildTab === 'decor' ? 'on' : ''}" data-tab="decor">🌷 Decor</button>`;
    const list = BUILDINGS.filter((d) => (buildTab === 'decor' ? d.decor : !d.decor && d.district === buildTab));
    const dd = DISTRICT[buildTab];
    const cards = list
      .map((d) => {
        const av = typeAvailable(d);
        const t0 = d.tiers[0];
        const count = mods().counts[d.id] || 0;
        return `<button class="card focusable ${av.ok ? '' : 'locked'}" data-b="${d.id}">
          <img src="${thumbURL(d.id, 0, RS.season, 64)}" width="96" height="96" style="display:block;margin:0 auto">
          <div class="ttl">${d.icon} ${escapeHtml(d.name)}${count ? ` <span class="pill">×${count}</span>` : ''}</div>
          <div class="desc">${escapeHtml(d.desc)}</div>
          <div class="desc">${tierFx(t0).join(' · ')}</div>
          ${av.ok ? costHTML(t0.cost) : `<div class="desc" style="color:var(--bad);font-weight:800">🔒 ${escapeHtml(av.why)}</div>`}
        </button>`;
      })
      .join('');
    body.innerHTML = `<div class="tabs">${tabs}</div>${dd && !districtUnlocked(buildTab) ? `<p class="sub">${dd.icon} ${dd.name} opens when the town reaches <b>${TIERS[dd.tier].name}</b> (${fmtInt(TIERS[dd.tier].kj)} lifetime kJ).</p>` : dd ? `<p class="sub">${dd.blurb}</p>` : '<p class="sub">Little things that make the town yours. Some are earned from grid events.</p>'}<div class="grid">${cards}</div>`;
    body.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      buildTab = (b as HTMLElement).dataset.tab!;
      render();
    }));
    body.querySelectorAll('[data-b]').forEach((b) => b.addEventListener('click', () => {
      const d = BUILDING[(b as HTMLElement).dataset.b!];
      const av = typeAvailable(d);
      if (!av.ok) return toast(av.why);
      if (!canAfford(d.tiers[0].cost)) return toast('Not enough resources yet. Ride to charge the battery!');
      closeSheet('build');
      setMode({ kind: 'place', type: d.id });
    }));
  };
  const body = sheet('🔨 Build', '', { id: 'build' });
  render();
}

// ---------------- building info ----------------
export function buildingInfo(b: Building) {
  const d = BUILDING[b.type];
  const render = () => {
    const t = d.tiers[b.tier];
    const nx = d.tiers[b.tier + 1];
    const uc = upgradeCost(b);
    body.innerHTML = `
      <div class="row" style="align-items:flex-start;flex-wrap:nowrap">
        <img src="${thumbURL(b.type, b.tier, RS.season, 80)}" width="120" height="120" style="flex:none">
        <div>
          <div class="pill">${DISTRICT[d.district].icon} ${DISTRICT[d.district].name} · Tier ${['I', 'II', 'III'][b.tier]}</div>
          <p class="sub" style="margin-top:6px">${escapeHtml(d.desc)}<br><b>${escapeHtml(t.label)}</b></p>
          <div class="desc">${tierFx(t).join(' · ') || 'Decoration'}</div>
          <div class="note">Idle draw ${fmtNum(d.upkeep * (1 + b.tier * 0.6))} kJ/h</div>
        </div>
      </div>
      ${nx ? `<h3>Next: ${escapeHtml(nx.label)}</h3><div class="desc">${tierFx(nx).join(' · ')}</div>${costHTML(uc!)}` : '<h3>✨ Fully upgraded</h3>'}
      <div class="row" style="margin-top:12px">
        ${nx ? `<button class="btn focusable" id="biUp" ${canAfford(uc!) ? '' : 'disabled'}>⬆ Upgrade</button>` : ''}
        <button class="btn sec focusable" id="biMove">✥ Move</button>
        <button class="btn danger sm focusable" id="biDel">Demolish</button>
      </div>`;
    body.querySelector('#biUp')?.addEventListener('click', () => {
      if (upgrade(b)) {
        sfx('upgrade');
        markDirty();
        toast(`⬆ ${d.name}: ${d.tiers[b.tier].label}`);
        emit('upgraded', b);
        render();
      }
    });
    body.querySelector('#biMove')!.addEventListener('click', () => {
      closeSheet('binfo');
      setMode({ kind: 'move', id: b.id });
      RS.ghost = { type: b.type, x: b.x, y: b.y, ok: true };
    });
    body.querySelector('#biDel')!.addEventListener('click', () =>
      confirmSheet(`Demolish ${d.name}?`, 'You get half of what you spent back. This is the only way anything in town is ever removed.', 'Demolish', () => {
        const r = demolish(b);
        markDirty();
        closeSheet('binfo');
        toast('Refunded ' + Object.entries(r).map(([k, v]) => `${RES_ICON[k as keyof typeof RES_ICON]} ${fmtNum(v)}`).join(' '));
      }, true),
    );
  };
  const body = sheet(`${d.icon} ${escapeHtml(d.name)}`, '', { id: 'binfo', onClose: () => (RS.selected = 0) });
  render();
}

export function economySummary() {
  const r = rates();
  const m = mods();
  return `<div class="kv">
    <div><small>🍞 Food</small><b>${r.food - r.foodUse >= 0 ? '+' : ''}${fmtNum(r.food - r.foodUse)}/h</b></div>
    <div><small>🪵 Materials</small><b>+${fmtNum(r.materials)}/h</b></div>
    <div><small>🧪 Research</small><b>+${fmtNum(r.research)}/h</b></div>
    <div><small>🪙 Gold</small><b>+${fmtNum(r.gold)}/h</b></div>
    <div><small>⚡ Idle draw</small><b>${fmtNum(r.upkeep)} kJ/h</b></div>
    <div><small>🏠 Homes</small><b>${fmtInt(m.housing)}</b></div>
    <div><small>👥 Growing to</small><b>${fmtInt(popTarget())}</b></div>
  </div><p class="note">While you ride, the grid is fully powered: production ×2.5 and no battery drain.</p>`;
}

export function placeableDefs(): BuildingDef[] {
  return BUILDINGS.filter((d) => typeAvailable(d).ok);
}
