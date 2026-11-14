// Minimal typed-ish event bus used to decouple sim, ride, render and UI.
type Fn = (...a: any[]) => void;
const subs = new Map<string, Set<Fn>>();

export function on(ev: string, fn: Fn) {
  if (!subs.has(ev)) subs.set(ev, new Set());
  subs.get(ev)!.add(fn);
  return () => subs.get(ev)!.delete(fn);
}

export function emit(ev: string, ...a: any[]) {
  const s = subs.get(ev);
  if (!s) return;
  for (const f of [...s]) {
    try {
      f(...a);
    } catch (e) {
      console.error('bus handler failed', ev, e);
    }
  }
}
