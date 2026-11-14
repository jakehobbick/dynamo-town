// Research tree, Town (citizens, charter, achievements, tiers), Dynamo, and "while you were away".
import { G } from '../core/state';
import { markDirty } from '../core/save';
import { escapeHtml, fmtDur, fmtInt, fmtNum } from '../core/util';
import { ACHIEVEMENTS } from '../data/achievements';
import { DISTRICT, DISTRICTS } from '../data/districts';
import { RESEARCH } from '../data/research';
import { TIERS } from '../data/tiers';
import { CHARTER_REWARD } from '../data/charters';
import { canAfford, happiness, mods } from '../sim/economy';
import { canResearch, doResearch } from '../sim/research';
import { ensureCharter, fulfil, requestReady, streaks, type AwayReport } from '../sim/progression';
import { PAINT } from '../render/dynamo';
import { costHTML, RES_ICON, sheet, toast } from './ui';
import { economySummary, updateHUD } from './townui';
import { sfx } from '../audio/audio';
import type { Res } from '../core/types';

const BRANCH: Record<string, string> = { power: '⚡ Power', growth: '🌱 Growth', industry: '⚙️ Industry', science: '🔭 Science', whimsy: '🎨 Whimsy' };

export function openResearch() {
  const body = sheet('🔬 Research', '', { id: 'research' });
  const render = () => {
    let html = `<p class="sub">Research costs 🧪 from libraries and schools, plus stored energy. ${G.s.research.length}/${RESEARCH.length} done.</p>`;
    for (const br of Object.keys(BRANCH)) {
      html += `<h3>${BRANCH[br]}</h3><div class="tree">`;
      for (const r of RESEARCH.filter((x) => x.branch === br)) {
        const done = G.s.research.includes(r.id);
        const can = canResearch(r);
        const afford = canAfford(r.cost);
        html += `<div class="card ${done ? '' : can.ok ? '' : 'locked'}" style="${done ? 'background:linear-gradient(#f0fae9,#e2f4d6);border-color:#a9d79a' : ''}">
          <div class="ttl">${r.icon} ${escapeHtml(r.name)} ${done ? '✅' : ''}</div>
          <div class="desc">${escapeHtml(r.desc)}</div>
          ${done ? '' : can.ok ? costHTML(r.cost) + `<button class="btn sm focusable" style="margin-top:6px" data-r="${r.id}" ${afford ? '' : 'disabled'}>Research</button>` : `<div class="desc" style="color:var(--bad);font-weight:800">🔒 ${escapeHtml(can.why || '')}</div>`}
        </div>`;
      }
      html += '</div>';
    }
    body.innerHTML = html;
    body.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => {
      const id = (b as HTMLElement).dataset.r!;
      if (doResearch(id)) {
        sfx('unlock');
        markDirty();
        toast(`🔬 ${RESEARCH.find((x) => x.id === id)!.name} researched!`);
        render();
        updateHUD();
      }
    }));
  };
  render();
}

export function openTown(tab = 'citizens') {
  const body = sheet('📜 Town Hall', '', { id: 'town' });
  const render = () => {
    const tabs = [['citizens', '💌 Citizens'], ['charter', '📜 Weekly Charter'], ['ach', '🏆 Achievements'], ['tiers', '🏘️ Town Tiers'], ['economy', '📊 Economy']];
    let html = `<div class="tabs">${tabs.map(([id, n]) => `<button class="tab focusable ${id === tab ? 'on' : ''}" data-tab="${id}">${n}</button>`).join('')}</div>`;
    if (tab === 'citizens') {
      const s = G.s;
      html += `<p class="sub">👥 ${fmtInt(Math.floor(s.pop))} citizens · 😊 ${Math.round(happiness())}% happy. A named citizen moves in for every ${12} residents. Their requests never expire.</p>`;
      if (!s.citizens.length) html += `<p class="note">Build some cottages and your first citizens will move in.</p>`;
      html += '<div class="list">';
      for (const c of [...s.citizens].sort((a, b) => Number(!!(b.request && requestReady(b.request))) - Number(!!(a.request && requestReady(a.request))))) {
        const r = c.request;
        const ready = r && requestReady(r);
        const rw = r ? Object.entries(r.reward).filter(([k, v]) => v && k !== 'happiness').map(([k, v]) => `${RES_ICON[k as keyof Res]}${fmtNum(v as number)}`).join(' ') + (r.reward.happiness ? ` 😊+${r.reward.happiness}` : '') : '';
        html += `<div class="citizenreq"><div class="av">${c.emoji}</div><div style="flex:1"><b>${escapeHtml(c.name)}</b> <span class="pill">${c.done} helped</span><div class="desc">${r ? escapeHtml(r.text) : 'Content for now.'}</div>${r ? `<div class="desc">🎁 ${rw}</div>` : ''}</div>${ready ? `<button class="btn good sm focusable" data-c="${c.id}">🎁 Thank</button>` : r ? '<span class="pill">in progress</span>' : ''}</div>`;
      }
      html += '</div>';
    } else if (tab === 'charter') {
      const c = ensureCharter();
      const st = streaks();
      const rw = CHARTER_REWARD(G.s.tier);
      html += `<p class="sub">Three goals for week ${c.week.split('-W')[1]}. Finish all three for ⚡${rw.energy} · 🪙${rw.gold} · ✦${rw.sparks}. ${c.claimed ? '<b>✅ Completed! New charter on Monday.</b>' : ''}</p>`;
      html += '<div class="list">' + c.goals.map((g) => `<div><span style="font-size:22px">${g.progress >= g.target ? '✅' : '⬜'}</span><div style="flex:1"><b>${escapeHtml(g.text)}</b><div class="bar" style="margin-top:4px"><i style="width:${Math.min(100, (g.progress / g.target) * 100)}%"></i></div></div><span class="pill">${fmtNum(g.progress)}/${fmtNum(g.target)}</span></div>`).join('') + '</div>';
      html += `<h3>🔥 Weekly streak</h3><p class="sub">Ride ${G.s.settings.weeklyRides}× in a week to keep the streak. Rest days never break it. Current: <b>${st.cur} week${st.cur === 1 ? '' : 's'}</b> · best ${st.best}. This week: ${(G.s.stats.weeks[c.week]?.rides || 0)}/${G.s.settings.weeklyRides} rides.</p>`;
    } else if (tab === 'ach') {
      const n = Object.keys(G.s.achievements).length;
      html += `<p class="sub">${n}/${ACHIEVEMENTS.length} unlocked</p>`;
      for (const cat of ['Riding', 'Streaks', 'Events', 'Power', 'Town']) {
        html += `<h3>${cat}</h3><div class="achgrid">` + ACHIEVEMENTS.filter((a) => a.cat === cat).map((a) => `<div class="ach ${G.s.achievements[a.id] ? 'on' : ''}"><div class="i">${a.icon}</div><div><b>${escapeHtml(a.name)}</b><span>${escapeHtml(a.desc)}${G.s.achievements[a.id] ? ' · ' + new Date(G.s.achievements[a.id]).toLocaleDateString() : ''}</span></div></div>`).join('') + '</div>';
      }
    } else if (tab === 'tiers') {
      html += `<p class="sub">Your town grows with the lifetime energy you generate: <b>${fmtInt(G.s.lifetimeKJ)} kJ</b> so far.</p><div class="list">`;
      TIERS.forEach((t, i) => {
        const reached = G.s.tier >= i;
        const nxt = i === G.s.tier + 1;
        const ds = DISTRICTS.filter((d) => d.tier === i);
        html += `<div style="${reached ? '' : 'opacity:.6'}"><span style="font-size:28px">${t.icon}</span><div style="flex:1"><b>${t.name}</b> <span class="pill">${fmtInt(t.kj)} kJ</span> ${reached ? '✅' : ''}<div class="desc">${escapeHtml(t.blurb)}${ds.length ? ' Unlocks: ' + ds.map((d) => d.icon + ' ' + d.name).join(', ') : ''}</div>${nxt ? `<div class="bar" style="margin-top:4px"><i style="width:${Math.min(100, ((G.s.lifetimeKJ - TIERS[i - 1].kj) / (t.kj - TIERS[i - 1].kj)) * 100)}%"></i></div><div class="note">${fmtInt(t.kj - G.s.lifetimeKJ)} kJ to go ≈ ${Math.ceil((t.kj - G.s.lifetimeKJ) / 540)} rides of 45 min at 200 W</div>` : ''}</div></div>`;
      });
      html += '</div>';
    } else if (tab === 'economy') {
      html += economySummary();
      html += `<h3>Districts</h3><div class="list">${DISTRICTS.map((d) => `<div><span style="font-size:22px">${d.icon}</span><div style="flex:1"><b>${d.name}</b><div class="desc">${d.blurb}</div></div>${G.s.tier >= d.tier ? '✅' : '🔒 ' + TIERS[d.tier].name}</div>`).join('')}</div>`;
    }
    body.innerHTML = html;
    body.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      tab = (b as HTMLElement).dataset.tab!;
      render();
    }));
    body.querySelectorAll('[data-c]').forEach((b) => b.addEventListener('click', () => {
      const c = G.s.citizens.find((x) => x.id === (b as HTMLElement).dataset.c);
      if (c && fulfil(c)) {
        sfx('coin');
        toast(`💌 ${c.emoji} ${escapeHtml(c.name)} says thank you!`);
        render();
        updateHUD();
      }
    }));
  };
  render();
}

export function openDynamo() {
  const body = sheet('⚙️ The Dynamo', '', { id: 'dynamo' });
  const render = () => {
    const s = G.s;
    const painted = s.research.includes('paint');
    html();
    function html() {
      body.innerHTML = `<p class="sub">The heart of town. You're its power plant: the crank turns at your cadence, the coils glow with your watts, and every kilojoule you make lands in the battery.</p>
      <div class="kv"><div><small>Lifetime energy</small><b>${fmtInt(s.lifetimeKJ)} kJ</b></div><div><small>Rides</small><b>${s.stats.rides}</b></div><div><small>Ride time</small><b>${fmtDur(s.stats.rideSecs)}</b></div><div><small>Ride energy bonus</small><b>+${Math.round(mods().boost.rideEnergy * 100)}%</b></div></div>
      <h3>🎨 Paint</h3>${painted ? `<div class="row">${Object.entries(PAINT).filter(([k]) => k !== 'gold' || s.research.includes('goldcrown')).map(([k, c]) => `<button class="btn sec focusable" data-p="${k}" style="background:${c};color:#2b2a3a;${s.cosmetics.dynamo === k ? 'outline:3px solid #2b2a3a' : ''}">${k}</button>`).join('')}</div>` : '<p class="note">Research 🎨 Dynamo Paint (Whimsy) to repaint it.</p>'}`;
      body.querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => {
        s.cosmetics.dynamo = (b as HTMLElement).dataset.p!;
        markDirty();
        render();
      }));
    }
  };
  render();
}

export function showAway(r: AwayReport) {
  const prod = Object.entries(r.produced).filter(([, v]) => Math.abs(v || 0) >= 1);
  sheet('🌙 While you were away', `
    <p class="sub">You were gone ${fmtDur(r.secs)}. The town kept humming along on the battery.</p>
    <div class="kv">${prod.map(([k, v]) => `<div><small>${RES_ICON[k as keyof Res]} ${k}</small><b>${(v || 0) >= 0 ? '+' : ''}${fmtNum(v || 0)}</b></div>`).join('')}
      <div><small>⚡ Battery used</small><b>${fmtNum(r.drained)} kJ</b></div>
      <div><small>👥 New residents</small><b>+${r.popGained}</b></div></div>
    ${r.pausedHours > 0.5 ? `<p class="note">🔋 The battery ran dry, so production paused for about ${fmtDur(r.pausedHours * 3600)}. Nothing was lost; a ride powers everything back up.</p>` : ''}
    ${r.citizens.length ? `<p class="sub">New faces in town: ${r.citizens.map(escapeHtml).join(', ')}</p>` : ''}
    <p class="note">Rest days never hurt your town.</p>`, { center: true, id: 'away' });
}

export { DISTRICT };
