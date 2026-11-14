// Isometric projection and camera.
// World tile (x, y) maps to screen via a 2:1 diamond. Tile top corner of (x,y) is at
// iso pixel ((x - y) * TW/2, (x + y) * TH/2). The camera holds the iso pixel at screen centre.
import { clamp } from '../core/util';
import { N } from '../sim/map';

export const TW = 64;
export const TH = 32;

export const cam = {
  x: 0, // iso px at screen center
  y: (N * TH) / 2,
  zoom: 1,
  tx: 0, // targets for smooth moves
  ty: (N * TH) / 2,
  tz: 1,
  follow: false,
  W: 800,
  H: 600,
  minZ: 0.45,
  maxZ: 3,
};

export const isoX = (x: number, y: number) => ((x - y) * TW) / 2;
export const isoY = (x: number, y: number) => ((x + y) * TH) / 2;

/** Tile -> screen (top corner of tile). h is height in iso px (up). */
export function toScreen(x: number, y: number, h = 0) {
  return {
    x: (isoX(x, y) - cam.x) * cam.zoom + cam.W / 2,
    y: (isoY(x, y) - h - cam.y) * cam.zoom + cam.H / 2,
  };
}

/** Screen -> fractional tile coords. */
export function toTile(sx: number, sy: number) {
  const ix = (sx - cam.W / 2) / cam.zoom + cam.x;
  const iy = (sy - cam.H / 2) / cam.zoom + cam.y;
  // invert: ix = (x-y)*TW/2, iy = (x+y)*TH/2
  const a = ix / (TW / 2), b = iy / (TH / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

export function focusTile(x: number, y: number, zoom?: number, instant = false) {
  cam.tx = isoX(x, y);
  cam.ty = isoY(x, y) + TH / 2;
  if (zoom) cam.tz = clamp(zoom, cam.minZ, cam.maxZ);
  if (instant) {
    cam.x = cam.tx;
    cam.y = cam.ty;
    if (zoom) cam.zoom = cam.tz;
  }
}

export function clampCam() {
  const lim = N * TW * 0.55;
  cam.tx = clamp(cam.tx, -lim, lim);
  cam.ty = clamp(cam.ty, -40, N * TH + 40);
  cam.x = clamp(cam.x, -lim, lim);
  cam.y = clamp(cam.y, -40, N * TH + 40);
}

export function updateCam(dt: number) {
  const k = 1 - Math.exp(-dt * 7);
  cam.x += (cam.tx - cam.x) * k;
  cam.y += (cam.ty - cam.y) * k;
  // zoom around screen centre
  cam.zoom += (cam.tz - cam.zoom) * k;
}

/** Zoom keeping a screen point fixed. */
export function zoomAt(sx: number, sy: number, factor: number) {
  const before = toTile(sx, sy);
  cam.zoom = clamp(cam.zoom * factor, cam.minZ, cam.maxZ);
  cam.tz = cam.zoom;
  const after = toTile(sx, sy);
  const dx = isoX(before.x, before.y) - isoX(after.x, after.y);
  const dy = isoY(before.x, before.y) - isoY(after.x, after.y);
  cam.x += dx;
  cam.y += dy;
  cam.tx = cam.x;
  cam.ty = cam.y;
}
