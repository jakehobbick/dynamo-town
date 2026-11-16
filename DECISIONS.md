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

## Content and progression (M5–M6)
- 46 buildings + 8 keepsake/decor items, all with 3 tiers; each tier has its own label and visible art change. 7 districts (spec asked ≥ 6): both whimsical options were built (Gecko Sanctuary *and* Sky Dock).
- 28 research nodes, 49 achievements, 7 town tiers (Outpost → Metropolis). City at 100k kJ is roughly 9–12 months of 4 rides/week at ~200 W; Metropolis is the long-term stretch goal.
- Streaks are counted in **rides per week** (≥ 2 rides = a streak week). Rest days can never break anything.
- Citizens arrive every ~12 population and bring one soft request at a time (build X, complete event Y, ride Z kJ). Requests never expire.

## Art, audio, feel (M7)
- All buildings are procedural Canvas2D drawings (faces with gradients, textures, roof shingles, window frames), rendered once per tier/season/zoom bucket into cached sprites, with separate "night" and "lights" layers composited by time of day. Animated parts (smoke, turbines, windmills, water, walkers) draw live on top.
- **Fonts are bundled** (@fontsource Fredoka/Nunito) instead of loaded from Google Fonts, so the UI looks right offline or on a flaky connection mid-ride. Every font stack has system fallbacks.
- Cloud shadows are soft feathered sprites (the hard ellipses looked like rendering glitches).
- Audio is fully synthesized WebAudio: ambience per weather/time, event music that builds with intensity, SFX. Master/music/ambience/SFX sliders and mute are in Settings.

## Performance and QA (M8)
- Profiling a 370-building town showed JavaScript at < 2% of frame time; the rest is pixel compositing, which iPad GPUs do in hardware. Culling is per 8×8 plot chunk, terrain is pre-rendered chunks, glows and the vignette are cached sprites, and animations have a per-frame budget.
- **Adaptive quality:** if High can't hold 45 fps *and* render time is really the bottleneck (> 11 ms/frame) for 8 s, the game steps down to Balanced once and says so. **I couldn't measure on a real iPad here**: headless Chrome renders on the CPU, so its numbers aren't representative.
- **Save bug found and fixed:** `saveNow()` returned without saving if a save was already running, and the localStorage mirror was written only *after* the async IndexedDB write, so a close mid-save could lose recent changes. localStorage is now written synchronously first (and again on `pagehide`), and overlapping saves queue a follow-up save.
- **Suspension bug found and fixed:** when iPad suspends the tab (app switch) and you return without a reload, the main loop used to silently drop the gap. Any gap > 5 s now runs the idle catch-up, and gaps > 10 min show "While you were away".
- **Idle draw is capped** at 0.6% of battery capacity per hour and tapers as the battery empties. Uncapped, a 150-building town drained a whole ride's energy overnight, leaving nothing to spend between rides.
- Bot/time-skip runs are "quiet" (no toasts or banners), and banners queue instead of overlapping. During rides, toasts sit below the HUD metrics.

## Export, import, share (M9)
- TCX: 1 s trackpoints, `Watts` via the Garmin ActivityExtension v2 (`ns3:TPX`), lap totals, and a `Creator` with the schema-required `Version` (Crank Crypt's TCX omitted it). The TCX is checked as well-formed and round-tripped through the importer in tests. Garmin's XSD host wasn't reachable from the build environment, so I didn't run a formal XSD validation; Crank Crypt's near-identical TCX already uploads to Garmin for you.
- Distance in the TCX is a virtual flat-road speed from power (75 kg, CdA 0.32, Crr 0.004), so Garmin/Strava show a plausible distance and speed.
- Imports credit 50% of energy by default (adjustable in Settings). Power files use mechanical kJ; files without power use calories × 0.25 ≈ mechanical kJ (gross efficiency ~24%). Dedupe: an import key per start minute, plus a fuzzy match (start within 5 min, duration within 15%) against existing rides, including ones recorded in-game.
- The share card is a 1080×1350 portrait PNG (Strava's photo aspect ratio), with a generated title chosen from the ride's most notable event result.

## Not done / blocked
- No service worker / offline install: Bluefy's WKWebView support for service workers is uncertain, and a stale cached build is worse than none for a game that updates often. Everything except the first page load already works offline (bundled fonts, no external requests).
- Real-hardware checks (KICKR pairing, BikeControl keys, Bluefy storage persistence, 60 fps on the iPad) can only be done on your devices. Everything is exercised with the simulator and headless Chrome.
