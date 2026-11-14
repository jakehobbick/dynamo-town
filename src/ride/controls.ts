// Controls: Zwift Ride buttons arrive as keyboard keys (BikeControl on the Pixel), plus a
// gamepad fallback and plain keyboard. Menus are navigable with next/prev/confirm/cancel.
import { emit } from '../core/bus';
import { G } from '../core/state';
import { clamp } from '../core/util';
import type { KeyAction } from '../core/types';
import { cam, zoomAt } from '../render/iso';
import { closeSheet, sheetOpen, topSheet } from '../ui/ui';
import { keyCapture } from '../ui/settings';
import { sim } from './sensors';
import { ride, shift, skipSegment, togglePause } from './session';

function focusables(): HTMLElement[] {
  const root: ParentNode = topSheet() || document.getElementById('ui')!;
  return [...root.querySelectorAll<HTMLElement>('.focusable, .card[data-b], .card[data-ev], .card[data-plan], button.btn')].filter((e) => e.offsetParent !== null && !(e as HTMLButtonElement).disabled);
}
let focusIdx = -1;
function moveFocus(d: number) {
  const f = focusables();
  if (!f.length) return;
  document.querySelectorAll('.kfocus').forEach((e) => e.classList.remove('kfocus'));
  const cur = f.findIndex((e) => e === document.activeElement);
  focusIdx = ((cur >= 0 ? cur : focusIdx) + d + f.length) % f.length;
  const el = f[focusIdx];
  el.classList.add('kfocus');
  el.focus({ preventScroll: false });
  el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
function confirm() {
  const a = document.activeElement as HTMLElement | null;
  if (a && a !== document.body && a.closest('#ui')) {
    a.click();
    return;
  }
  const f = focusables();
  const primary = f.find((e) => e.classList.contains('btn') && !e.classList.contains('sec'));
  if (sheetOpen() && primary) primary.click();
  else if (!sheetOpen() && !ride) emit('ui:ride');
}

export function action(a: KeyAction) {
  switch (a) {
    case 'shiftUp':
      if (ride && !sheetOpen()) shift(1);
      else moveFocus(-1);
      break;
    case 'shiftDown':
      if (ride && !sheetOpen()) shift(-1);
      else moveFocus(1);
      break;
    case 'next':
      moveFocus(1);
      break;
    case 'prev':
      moveFocus(-1);
      break;
    case 'confirm':
      confirm();
      break;
    case 'cancel':
      if (sheetOpen()) closeSheet();
      else emit('ui:cancel');
      break;
    case 'pause':
      if (ride) togglePause();
      else if (sheetOpen()) closeSheet();
      break;
    case 'skip':
      if (ride) skipSegment();
      break;
  }
}

export function initControls() {
  addEventListener('keydown', (e) => {
    const tgt = e.target as HTMLElement;
    if (keyCapture) {
      e.preventDefault();
      keyCapture(e.key);
      return;
    }
    if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA')) return;
    const K = G.s.settings.keys;
    const eq = (b: string) => b && e.key.toLowerCase() === b.toLowerCase();
    for (const a of Object.keys(K) as KeyAction[]) {
      if (eq(K[a])) {
        e.preventDefault();
        action(a);
        return;
      }
    }
    const st = e.shiftKey ? 25 : 10;
    switch (e.key) {
      case 'ArrowUp':
        sim.watts = clamp(sim.watts + st, 0, 1500);
        break;
      case 'ArrowDown':
        sim.watts = clamp(sim.watts - st, 0, 1500);
        break;
      case 'ArrowRight':
        sim.cad = clamp(sim.cad + 5, 0, 160);
        break;
      case 'ArrowLeft':
        sim.cad = clamp(sim.cad - 5, 0, 160);
        break;
      case ' ':
        sim.sprint = true;
        break;
      case '+':
      case '=':
        zoomAt(cam.W / 2, cam.H / 2, 1.2);
        break;
      case '-':
        zoomAt(cam.W / 2, cam.H / 2, 1 / 1.2);
        break;
      case 'w':
        cam.ty -= 40 / cam.zoom;
        break;
      case 's':
        cam.ty += 40 / cam.zoom;
        break;
      default:
        return;
    }
    e.preventDefault();
  });
  addEventListener('keyup', (e) => {
    if (e.key === ' ') sim.sprint = false;
  });
  pollGamepad();
}

// Gamepad: LB/RB shift, A confirm, B cancel, dpad navigates, Start pauses.
const prev: boolean[] = [];
function pollGamepad() {
  const pads = (navigator.getGamepads?.() || []) as (Gamepad | null)[];
  for (const gp of pads) {
    if (!gp) continue;
    const map: [number, KeyAction][] = [[5, 'shiftUp'], [4, 'shiftDown'], [0, 'confirm'], [1, 'cancel'], [15, 'next'], [14, 'prev'], [13, 'next'], [12, 'prev'], [9, 'pause']];
    for (const [i, a] of map) {
      const p = !!gp.buttons[i]?.pressed;
      if (p && !prev[i]) action(a);
      prev[i] = p;
    }
  }
  requestAnimationFrame(pollGamepad);
}
