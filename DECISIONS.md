# Decisions and assumptions

A running log of the calls I made while building Dynamo Town without check-ins. Newest entries are at the bottom of each section.

## Platform and tooling
- **TypeScript + Vite + Canvas2D, no framework.** The UI is plain DOM sheets over a full-screen canvas. PixiJS isn't needed for this style; Canvas2D with cached sprites is plenty on an iPad, and there's one less dependency to break in Bluefy.
- **Deploy = GitHub Actions → `gh-pages` branch.** The workflow builds, runs tests, and force-pushes `dist/` to `gh-pages`. I couldn't reach the GitHub Pages settings API from the build environment. A push to `gh-pages` from the Actions token didn't switch Pages on, but a normal push to that branch did. Pages is now enabled (source: `gh-pages` / root) and builds on every deploy.
- **`base: './'`** in Vite, so the build works under `/dynamo-town/` and from any static host.

## Saves
- The save is one JSON blob in IndexedDB (`dynamo-town` DB, `kv` store), mirrored to localStorage on every write. On load, the newer of the two wins (by `lastTick`).
- Daily rolling backups (3 slots) in IndexedDB, plus a localStorage "previous" copy. Loading falls back to these if the main save is unreadable.
- **Schema versioning:** `SCHEMA_VERSION` + an ordered `migrations` table, followed by a recursive *fill-missing-defaults* pass against a fresh template. New fields can never wipe progress, and saves from a newer build keep their unknown fields.
- `navigator.storage.persist()` is requested so Safari/Bluefy is less likely to evict the database.
- An in-progress ride is checkpointed separately (`activeRide`), so a crash or tab kill mid-ride can be recovered.

## Trainer and controls
- Ported from Crank Crypt: FTMS Indoor Bike Data (0x2AD2) with Cycling Power (0x2A63) fallback, Control Point (0x2AD9) with request-control + start, ERG via opcode 0x05, the KICKR name filter, and the accept-all fallback picker.
- **Virtual gearing** uses Crank Crypt's no-gears technique: the game computes watts from cadence with a cubic gear law and sends them as ERG targets. There are now 24 gears (Zwift Ride has 24) at 6.5% steps. Center gear at 90 rpm = 0.8 × FTP (the Crank Crypt "feel" default).
- **Events use true ERG** for their targets. The Zwift Ride shift buttons nudge ERG ±2% (the "bias") during ERG segments and change gear in free and sprint segments.
- Sprints switch to virtual-gear mode (ERG can't do "all-out"). The throttle on gear-power updates drops from 900 ms to 300 ms during sprints so the resistance follows your cadence quickly.
