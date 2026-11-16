// DOM helpers: toasts, bottom sheets, cost formatting.
import { G } from '../core/state';
import type { Cost, ResKey } from '../core/types';
import { $, escapeHtml, fmtNum } from '../core/util';

export const RES_ICON: Record<ResKey, string> = { energy: '⚡', food: '🍞', materials: '🪵', research: '🧪', gold: '🪙', sparks: '✦' };
export const RES_NAME: Record<ResKey, string> = { energy: 'Energy (kJ)', food: 'Food', materials: 'Materials', research: 'Research', gold: 'Gold', sparks: 'Spark crystals' };

/** Set while the bot or time-skip tools run, so simulated rides don't flood the screen. */
export const uiQuiet = { on: false };
export function toast(msg: string, big = false) {
  if (uiQuiet.on) return;
  const box = $('toast');
  const d = document.createElement('div');
  d.className = 'toast' + (big ? ' big' : '');
  d.innerHTML = msg;
  box.appendChild(d);
  while (box.children.length > 3) box.firstElementChild!.remove();
  setTimeout(() => d.remove(), 3300);
}

export function costHTML(c: Cost, check = true) {
  return (
    '<div class="cost">' +
    Object.entries(c)
      .filter(([, v]) => v)
      .map(([k, v]) => {
        const no = check && (G.s.res[k as ResKey] || 0) + 1e-6 < (v || 0);
        return `<span class="${no ? 'no' : ''}">${RES_ICON[k as ResKey]} ${fmtNum(v || 0)}</span>`;
      })
      .join('') +
    '</div>'
  );
}

let sheetStack: HTMLElement[] = [];
export interface SheetOpts {
  center?: boolean;
  onClose?: () => void;
  noClose?: boolean;
  id?: string;
}

/** Open a bottom sheet. Returns the content element. */
export function sheet(title: string, body: string, opts: SheetOpts = {}) {
  if (opts.id) closeSheet(opts.id);
  const scrim = document.createElement('div');
  scrim.className = 'scrim' + (opts.center ? ' center' : '');
  if (opts.id) scrim.dataset.id = opts.id;
  scrim.innerHTML = `<div class="sheet" role="dialog"><div class="sheethead"><h2>${title}</h2>${opts.noClose ? '' : '<button class="x" data-close aria-label="Close">✕</button>'}</div><div class="sheetbody">${body}</div></div>`;
  $('ui').appendChild(scrim);
  sheetStack.push(scrim);
  const close = () => closeEl(scrim, opts.onClose);
  scrim.addEventListener('pointerdown', (e) => {
    if (e.target === scrim && !opts.noClose) close();
  });
  scrim.querySelector('[data-close]')?.addEventListener('click', close);
  (scrim as any)._close = close;
  return scrim.querySelector('.sheetbody') as HTMLElement;
}

function closeEl(el: HTMLElement, cb?: () => void) {
  if (!el.isConnected) return;
  el.remove();
  sheetStack = sheetStack.filter((x) => x !== el);
  cb?.();
}

export function closeSheet(id?: string) {
  if (id) {
    const el = sheetStack.find((x) => x.dataset.id === id);
    if (el) (el as any)._close();
    return;
  }
  const top = sheetStack[sheetStack.length - 1];
  if (top) (top as any)._close();
}
export const sheetOpen = () => sheetStack.length > 0;
export const topSheet = () => sheetStack[sheetStack.length - 1] || null;

export function confirmSheet(title: string, text: string, yes: string, onYes: () => void, danger = false) {
  const body = sheet(title, `<p class="sub">${text}</p><div class="row"><button class="btn ${danger ? 'danger' : ''} focusable" data-yes>${escapeHtml(yes)}</button><button class="btn sec focusable" data-no>Cancel</button></div>`, { center: true, id: 'confirm' });
  body.querySelector('[data-yes]')!.addEventListener('click', () => {
    closeSheet('confirm');
    onYes();
  });
  body.querySelector('[data-no]')!.addEventListener('click', () => closeSheet('confirm'));
}

/** Pick a file from disk (JSON save, TCX, FIT). */
export function pickFile(accept: string, multiple = false): Promise<File[]> {
  return new Promise((res) => {
    const i = document.createElement('input');
    i.type = 'file';
    i.accept = accept;
    i.multiple = multiple;
    i.style.display = 'none';
    document.body.appendChild(i);
    i.onchange = () => {
      res([...(i.files || [])]);
      i.remove();
    };
    i.click();
  });
}
