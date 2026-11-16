// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { buildTCX, parseTCX } from '../src/io/tcx';

describe('TCX export', () => {
  const t0 = Date.UTC(2026, 10, 15, 17, 0, 0);
  const S = Array.from({ length: 3600 }, (_, i) => ({ t: t0 + i * 1000, p: 200 + (i % 60), c: 90, hr: i < 10 ? 0 : 130 }));
  const x = buildTCX(S, 'Powered 340 homes <through> a blackout & more');
  it('is 1 s resolution with watts, cadence and HR', () => {
    expect((x.match(/<Trackpoint>/g) || []).length).toBe(3600);
    expect(x).toContain('<ns3:Watts>');
    expect(x).toContain('<Cadence>90</Cadence>');
    expect(x).toContain('<HeartRateBpm><Value>130</Value>');
    expect(x).toContain('<VersionMajor>1</VersionMajor>');
    expect(x).not.toMatch(/<through>/);
    writeFileSync('/tmp/dt-test.tcx', x);
  });
  it('round-trips through the importer', () => {
    const r = parseTCX(x);
    expect(r.start).toBe(t0);
    expect(Math.round(r.secs)).toBeGreaterThanOrEqual(3599);
    expect(r.hasPower).toBe(true);
    const kj = S.reduce((a, s) => a + s.p, 0) / 1000;
    expect(Math.abs(r.kj - kj)).toBeLessThan(kj * 0.02);
  });
});

import { readFileSync } from 'node:fs';
import { parseFIT } from '../src/io/tcx';
describe('FIT import', () => {
  it('reads power, duration and start from a Garmin-style FIT activity', () => {
    const b = readFileSync('tests/fixtures/ride.fit');
    const r = parseFIT(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    expect(r.start).toBe(Date.UTC(2026, 10, 1, 15, 0, 0));
    expect(r.hasPower).toBe(true);
    expect(Math.round(r.secs / 60)).toBe(30);
    expect(Math.round(r.kj)).toBeGreaterThan(330);
    expect(Math.round(r.kj)).toBeLessThan(360);
  });
});
