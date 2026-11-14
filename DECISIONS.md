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

## Ride and events
- **Three ride modes.** *Event Ride*: 5 min free warm-up → the event → free riding until you tap Finish. *Structured Plan*: warm-up → events chained greedily to fill 30/45/60/90 min (with 2-min recoveries, no two hard events back-to-back, a featured event first) → steady Z2 filler → cool-down. Plans are deterministic per day, so the preview matches the ride. *Free Ride*: virtual gears, energy × zone multiplier (Z2 ×1.05 … Z6+ ×1.25).
- **Compliance scoring.** Each second of a *work* segment counts, except the first 8 s (ERG ramp lag). The second is "in band" if 3 s-ish power is within ±5% of target. Cadence drills also need ≥ target rpm − 3. Sprints score `avg / (1.4 × FTP)`, capped at 1. Event score = in-band seconds / counted seconds.
- **Rewards.** ≥ 80% = full rewards + spark crystals + a keepsake decoration placed in town. Below that, rewards scale with the score (sparks floored). Ending a ride mid-event gives partial credit. Nothing is ever taken away.
- **12 events** (spec asked ≥ 8): Factory Order (sweet spot), Storm Blackout (VO2 5×3'), Festival Night (45' Z2), Lightning Surge (3×20 s sprints), Harbor Tide (over-unders), Harvest Haul (2×12' tempo), Bridge Raising (2×8' threshold), Heat Wave (10×30/30), Night Shift (cadence drills), Morning Commute (ramp), Lantern Walk (recovery), Airship Launch (pyramid), plus Gecko Hatching (3×6' at 85%). Three "featured" events per day pay +25%.
- **Storm Blackout visual:** up to five owned districts go dark (windows, animations, power-line pulses) and each completed VO2 interval restores one.
- **ERG bias:** shift buttons nudge ERG ±2% per press (−20% … +10%). The bias applies fully to work segments; on easy segments only a negative bias carries over, so you can make recoveries easier but not harder.
- **Auto-pause** after 6 s with no power or cadence; pedalling resumes the ride. A Bluetooth drop pauses with a "reconnecting" overlay while the trainer reconnects in the background (exponential backoff, no extra tap needed because `gatt.connect()` on a known device doesn't need a user gesture).
- **Energy accounting.** Raw rider kJ (power × time) counts toward *lifetime kJ* and town tiers. The battery receives kJ × (1 + ride-energy bonuses) × free-ride zone multiplier, plus event bonus energy. When the battery is full, the overflow is sold for gold (0.2 gold/kJ), so effort is never wasted.
- The base battery is 1,200 kJ, so a first 45-minute ride fits without overflowing.

## Economy
- Resources: Energy (kJ), Food, Materials, Research, Gold, plus rare **Spark crystals** from events, tiers and charters (used for top-tier upgrades and special research).
- While riding, the grid is "fully powered": production ×2.5 and no battery drain. At rest, buildings draw a small idle load (≈0.1–1.6 kJ/h each). If the battery empties, production *pauses*; nothing decays and the population never shrinks.
- Population grows toward `homes × (0.55 + happiness/220)` while there is food. Happiness = amenities per capita + a temporary festive glow from events (fades over ~2 days).
