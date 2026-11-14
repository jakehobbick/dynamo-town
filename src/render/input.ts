// Touch + mouse camera controls. One finger drags, two fingers pinch, tap selects.
import { emit } from '../core/bus';
import { cam, toTile, zoomAt } from './iso';

interface Ptr {
  x: number;
  y: number;
  sx: number;
  sy: number;
  t: number;
}
const ptrs = new Map<number, Ptr>();
let pinch: { d: number; mx: number; my: number } | null = null;
let dragged = false;
let lastTap = 0;
export const inputState = { enabled: true, dragging: false };

export function initInput(cv: HTMLCanvasElement) {
  cv.addEventListener('pointerdown', (e) => {
    if (!inputState.enabled) return;
    cv.setPointerCapture?.(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now() });
    dragged = false;
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }
  });
  cv.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) {
      if (e.pointerType === 'mouse') {
        const t = toTile(e.clientX, e.clientY);
        emit('hover', Math.floor(t.x), Math.floor(t.y));
      }
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (Math.hypot(p.x - p.sx, p.y - p.sy) > 8) dragged = true;
    if (ptrs.size === 1 && dragged) {
      cam.x -= dx / cam.zoom;
      cam.y -= dy / cam.zoom;
      cam.tx = cam.x;
      cam.ty = cam.y;
      cam.follow = false;
      inputState.dragging = true;
    } else if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAt(mx, my, d / pinch.d);
      cam.x -= (mx - pinch.mx) / cam.zoom;
      cam.y -= (my - pinch.my) / cam.zoom;
      cam.tx = cam.x;
      cam.ty = cam.y;
      pinch = { d, mx, my };
      dragged = true;
    }
    if (e.pointerType === 'mouse') {
      const t = toTile(e.clientX, e.clientY);
      emit('hover', Math.floor(t.x), Math.floor(t.y));
    }
  });
  const up = (e: PointerEvent) => {
    const p = ptrs.get(e.pointerId);
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (!p) return;
    if (!dragged && ptrs.size === 0 && performance.now() - p.t < 600) {
      const t = toTile(e.clientX, e.clientY);
      const nowT = performance.now();
      emit('tap', Math.floor(t.x), Math.floor(t.y), { x: e.clientX, y: e.clientY, double: nowT - lastTap < 300 });
      lastTap = nowT;
    }
    if (ptrs.size === 0) inputState.dragging = false;
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', (e) => {
    ptrs.delete(e.pointerId);
    pinch = null;
  });
  cv.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );
  // iOS Safari gesture events would zoom the page; block them
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}
