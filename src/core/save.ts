// Persistence: IndexedDB first, localStorage as a fallback, everything in try/catch.
// The save is versioned. On load we (1) run explicit migrations for every version step
// and (2) deep-fill any missing fields from a fresh template, so new features never wipe a town.

import { G, SCHEMA_VERSION, newGame, now } from './state';
import type { GameState } from './types';

const DB_NAME = 'dynamo-town';
const STORE = 'kv';
const KEY = 'save';
const LS_KEY = 'dt_save';
const LS_BACKUP = 'dt_save_prev';

type Migration = (s: any) => any;

/**
 * migrations[n] upgrades a save from version n to n+1.
 * Rules: never delete player progress; rename/convert instead.
 */
export const migrations: Record<number, Migration> = {
  // Example for future use:
  // 1: (s) => { s.newThing = s.oldThing ?? 0; delete s.oldThing; return s; },
};

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Add any keys present in tpl but missing in obj (recursively for plain objects). Never overwrites. */
export function fillDefaults(obj: any, tpl: any): any {
  if (!isObj(obj) || !isObj(tpl)) return obj;
  for (const k of Object.keys(tpl)) {
    if (!(k in obj) || obj[k] === undefined) obj[k] = structuredCloneSafe(tpl[k]);
    else if (isObj(obj[k]) && isObj(tpl[k])) fillDefaults(obj[k], tpl[k]);
  }
  return obj;
}

function structuredCloneSafe<T>(v: T): T {
  return v === undefined ? v : JSON.parse(JSON.stringify(v));
}

export function migrate(raw: any): GameState {
  if (!isObj(raw)) throw new Error('Save is not an object');
  let s: any = raw;
  let v = typeof s.v === 'number' ? s.v : 1;
  if (v > SCHEMA_VERSION) {
    // A save from a newer build: keep everything, just don't downgrade data.
    console.warn('Save is from a newer version', v);
  }
  while (v < SCHEMA_VERSION) {
    const m = migrations[v];
    if (m) s = m(s) ?? s;
    v++;
    s.v = v;
  }
  fillDefaults(s, newGame(Date.now()));
  // sanity
  for (const k of Object.keys(s.res)) if (!Number.isFinite(s.res[k])) s.res[k] = 0;
  if (!Array.isArray(s.buildings)) s.buildings = [];
  s.v = Math.max(s.v, SCHEMA_VERSION);
  return s as GameState;
}

// ---------- IndexedDB ----------
let dbp: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      if (!('indexedDB' in globalThis)) return res(null);
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
      r.onblocked = () => res(null);
      setTimeout(() => res(null), 4000);
    } catch {
      res(null);
    }
  });
  return dbp;
}

export async function idbGet(key: string): Promise<any> {
  const d = await db();
  if (!d) return undefined;
  return new Promise((res) => {
    try {
      const tx = d.transaction(STORE, 'readonly');
      const q = tx.objectStore(STORE).get(key);
      q.onsuccess = () => res(q.result);
      q.onerror = () => res(undefined);
    } catch {
      res(undefined);
    }
  });
}

export async function idbSet(key: string, val: any): Promise<boolean> {
  const d = await db();
  if (!d) return false;
  return new Promise((res) => {
    try {
      const tx = d.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => res(true);
      tx.onerror = () => res(false);
      tx.onabort = () => res(false);
    } catch {
      res(false);
    }
  });
}

export async function idbDel(key: string) {
  const d = await db();
  if (!d) return;
  try {
    d.transaction(STORE, 'readwrite').objectStore(STORE).delete(key);
  } catch {}
}

function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch {
    return false;
  }
}

// ---------- public API ----------
let dirty = false;
let saving = false;
let lastSaveAt = 0;
export const saveInfo = { backend: 'none' as 'idb' | 'ls' | 'none', lastSaveAt: 0, error: '' };

export function markDirty() {
  dirty = true;
}

/** Save now. Writes IDB and mirrors to localStorage (both best-effort). */
export async function saveNow(): Promise<void> {
  if (saving) {
    dirty = true;
    return;
  }
  saving = true;
  dirty = false;
  try {
    const s = G.s;
    const json = JSON.stringify(s);
    const ok = await idbSet(KEY, json);
    // localStorage mirror (may hit quota on huge saves; that's fine)
    const prev = lsGet(LS_KEY);
    if (prev && Date.now() - lastSaveAt > 10 * 60 * 1000) lsSet(LS_BACKUP, prev);
    const lsOk = lsSet(LS_KEY, json);
    saveInfo.backend = ok ? 'idb' : lsOk ? 'ls' : 'none';
    saveInfo.error = ok || lsOk ? '' : 'Storage unavailable';
    lastSaveAt = Date.now();
    saveInfo.lastSaveAt = lastSaveAt;
    // daily rolling backup in IDB
    if (ok) {
      const d = new Date().toISOString().slice(0, 10);
      const bk = (await idbGet('backup_day')) as string | undefined;
      if (bk !== d) {
        await idbSet('backup_' + (new Date().getDay() % 3), json);
        await idbSet('backup_day', d);
      }
    }
  } catch (e: any) {
    saveInfo.error = String(e?.message || e);
  } finally {
    saving = false;
  }
}

/** Load the newest available save (IDB vs localStorage by lastTick). */
export async function loadGame(): Promise<GameState | null> {
  const cands: any[] = [];
  try {
    const a = await idbGet(KEY);
    if (a) cands.push(typeof a === 'string' ? JSON.parse(a) : a);
  } catch (e) {
    console.warn('IDB save unreadable', e);
  }
  try {
    const b = lsGet(LS_KEY);
    if (b) cands.push(JSON.parse(b));
  } catch (e) {
    console.warn('LS save unreadable', e);
  }
  if (!cands.length) {
    // try backups
    for (const k of ['backup_0', 'backup_1', 'backup_2']) {
      try {
        const x = await idbGet(k);
        if (x) cands.push(JSON.parse(x));
      } catch {}
    }
    try {
      const c = lsGet(LS_BACKUP);
      if (c) cands.push(JSON.parse(c));
    } catch {}
  }
  if (!cands.length) return null;
  cands.sort((x, y) => (y.lastTick || 0) - (x.lastTick || 0));
  for (const c of cands) {
    try {
      return migrate(c);
    } catch (e) {
      console.warn('migration failed', e);
    }
  }
  return null;
}

let timer: number | undefined;
/** Autosave every 30 s, plus whenever dirty (debounced) and when the page hides. */
export function startAutosave() {
  if (timer) return;
  timer = window.setInterval(() => saveNow(), 30000);
  window.setInterval(() => {
    if (dirty) saveNow();
  }, 1500);
  const flush = () => {
    G.s.lastTick = Math.max(G.s.lastTick, now());
    saveNow();
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
  try {
    (navigator as any).storage?.persist?.();
  } catch {}
}

// ---------- export / import ----------
export function exportJSON(): Blob {
  const payload = { app: 'dynamo-town', exportedAt: new Date().toISOString(), save: G.s };
  return new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' });
}

export function parseImport(text: string): GameState {
  const o = JSON.parse(text);
  const s = o && o.app === 'dynamo-town' ? o.save : o;
  if (!s || typeof s !== 'object' || !('res' in s) || !('buildings' in s)) throw new Error('This file is not a Dynamo Town save');
  return migrate(s);
}

// ---------- in-progress ride recovery ----------
export async function saveActiveRide(r: unknown) {
  const ok = await idbSet('activeRide', JSON.stringify(r));
  if (!ok) lsSet('dt_activeRide', JSON.stringify(r));
}
export async function loadActiveRide(): Promise<any> {
  try {
    const a = await idbGet('activeRide');
    if (a) return JSON.parse(a);
  } catch {}
  try {
    const b = lsGet('dt_activeRide');
    if (b) return JSON.parse(b);
  } catch {}
  return null;
}
export async function clearActiveRide() {
  await idbDel('activeRide');
  try {
    localStorage.removeItem('dt_activeRide');
  } catch {}
}
