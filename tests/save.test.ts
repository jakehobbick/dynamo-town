import { describe, expect, it } from 'vitest';
import { fillDefaults, migrate, migrations, parseImport } from '../src/core/save';
import { newGame, SCHEMA_VERSION } from '../src/core/state';

describe('save migrations', () => {
  it('fills missing fields without overwriting progress', () => {
    const old: any = { v: 1, res: { energy: 999, food: 5 }, buildings: [{ id: 1, type: 'cottage', x: 3, y: 4, tier: 2, builtAt: 0 }], lifetimeKJ: 12345 };
    const s = migrate(old);
    expect(s.res.energy).toBe(999);
    expect(s.res.gold).toBe(newGame(0).res.gold);
    expect(s.buildings[0].tier).toBe(2);
    expect(s.lifetimeKJ).toBe(12345);
    expect(s.stats.bests.p20).toBe(0);
    expect(s.settings.keys.shiftUp).toBe('e');
    expect(s.v).toBe(SCHEMA_VERSION);
  });

  it('runs registered migrations in order', () => {
    const saved = { ...migrations };
    try {
      (migrations as any)[0] = (s: any) => ({ ...s, renamed: s.oldName });
      const s: any = migrate({ v: 0, oldName: 7, res: {}, buildings: [] });
      expect(s.renamed).toBe(7);
    } finally {
      delete (migrations as any)[0];
      Object.assign(migrations, saved);
    }
  });

  it('keeps unknown fields from newer saves', () => {
    const s: any = migrate({ v: 99, futureThing: { a: 1 }, res: {}, buildings: [] });
    expect(s.futureThing.a).toBe(1);
  });

  it('imports an exported file and rejects junk', () => {
    const g = newGame(1);
    g.lifetimeKJ = 42;
    const s = parseImport(JSON.stringify({ app: 'dynamo-town', save: g }));
    expect(s.lifetimeKJ).toBe(42);
    expect(() => parseImport('{"hello":1}')).toThrow();
  });

  it('fillDefaults is recursive', () => {
    const o: any = { a: { b: 1 } };
    fillDefaults(o, { a: { b: 2, c: 3 }, d: [1] });
    expect(o).toEqual({ a: { b: 1, c: 3 }, d: [1] });
  });
});
