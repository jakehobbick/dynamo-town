# Dynamo Town ⚡🏘️

A cozy, persistent town builder that runs on the energy you produce on a smart trainer. You are the town's power plant: every watt spins the Dynamo, charges the battery and lights the windows. Grid emergencies turn the town's needs into structured workouts with ERG targets.

**Play:** https://jakehobbick.github.io/dynamo-town/
(iPad: open the link in **Bluefy**, because Safari has no Web Bluetooth. Desktop Chrome works for testing.)

---

## Quick start

1. Open the link and enter your FTP on the welcome card (change it later in ⚙️ Settings → Rider).
2. Tap **🚴 Ride** → **🔗 Pair KICKR**, pick your trainer, then optionally **❤️ HR** for a heart-rate strap.
3. Choose a mode: **🗓️ Structured Plan** (30/45/60/90 min), **📋 Event Board** (one event), or **🌤️ Free Ride**.
4. Ride. The battery fills as you pedal. Afterwards, tap **Back to town and spend energy** and build with **🔨 Build**.

No trainer handy? With no Bluetooth (or before pairing), the game uses the **simulated trainer**: sliders on screen, arrows on the keyboard, and a **bot** checkbox that rides events for you.

## Pairing

| Device | How |
|---|---|
| **Wahoo KICKR** | FTMS over Web Bluetooth. Ride menu → Pair KICKR. The picker filters for KICKR/FTMS; if your trainer doesn't appear, the fallback picker shows all devices. Resistance control uses the FTMS Control Point (request control → start → set target power). If FTMS isn't available, it falls back to Cycling Power (read-only, no ERG). |
| **Heart rate** | Any BLE HR strap or watch that broadcasts HR (Heart Rate Service 0x180D). Optional. |
| **Zwift Ride** | Through **BikeControl** on the Pixel 10 Pro, exactly as in Crank Crypt: BikeControl turns the Zwift Ride buttons into Bluetooth keyboard keys on the iPad. The default keys match Crank Crypt, so your existing mapping works. |
| **Disconnects** | A dropped trainer pauses the ride with a "reconnecting" overlay and reconnects in the background with backoff (no tap needed). The ride resumes when power returns. |

## Controls

| Action | Zwift Ride (via BikeControl) | Keyboard |
|---|---|---|
| Shift up / harder (virtual gear, or ERG +2%) | right shift → `E` | `E` |
| Shift down / easier (virtual gear, or ERG −2%) | left shift → `Q` | `Q` |
| Confirm / start | → `Enter` | `Enter` |
| Cancel / back | → `Backspace` | `Backspace` |
| Next / previous option in menus | → `D` / `A` | `D` / `A` |
| Pause | → `Escape` | `Escape` |
| Skip segment | → `N` | `N` |

Remap any key in ⚙️ Settings → Controls (tap **Change**, then press the button). A gamepad's shoulder buttons also shift.

**Touch:** one finger pans, pinch zooms, and tapping a building opens its card (upgrade, move, info). To build: 🔨 Build → pick a building → tap a tile (a green ghost shows it fits) → tap again or press ✓.

## How riding works

- **Virtual gearing (Free Ride, sprints, free segments).** 24 gears, like the Zwift Ride. The game turns your cadence into a power target with a cubic gear law and sends it to the KICKR. Center gear at 90 rpm ≈ 80% FTP, about 6.5% per gear. This fixes Crank Crypt's fixed-gear problem of needing very high cadence for hard efforts.
- **ERG (event targets).** The trainer holds the target. The shift buttons nudge ERG ±2% per press (−20% to +10%). On easy segments only a negative bias carries over, so recoveries can be made easier but never harder.
- **Compliance.** Each counted second of a work segment is "in band" if your smoothed power is within **±5%** of target. The first 8 s of each segment are ignored (ERG ramp lag). Score = in-band seconds ÷ counted seconds. Sprints score average power vs. 140% FTP.
- **Rewards.** A score of 80% or more earns full rewards, spark crystals and a keepsake decoration placed in town. Below that, rewards scale with the score. Ending a ride mid-event still earns partial credit. **Nothing is ever destroyed or taken away.**
- **Energy.** Raw kJ (power × time) counts toward lifetime kJ and town tiers. The battery receives kJ plus research and building bonuses, plus event bonus energy. Overflow when the battery is full becomes gold.

### How events map to workouts

| Event | Workout | Structure (% FTP, ERG) |
|---|---|---|
| 🏭 Factory Order | Sweet spot | 10 min @ 90% |
| ⛈️ Storm Blackout | VO2 max | 5 × 3 min @ 115% / 3 min @ 50%; each interval relights a district |
| 🏮 Festival Night | Endurance | 45 min @ 68% (Z2) |
| ⚡ Lightning Surge | Sprints | 3 × 20 s all-out (virtual gears) |
| 🌊 Harbor Tide | Over-unders | 4 × (2 min @ 95% + 1 min @ 105%) |
| 🚜 Harvest Haul | Tempo | 2 × 12 min @ 80% |
| 🌉 Bridge Raising | Threshold | 2 × 8 min @ 100% |
| 🥵 Heat Wave | 30/30s | 10 × 30 s @ 130% / 30 s easy |
| 🌙 Night Shift | Cadence drills | high-cadence blocks at fixed power (needs rpm ≥ target − 3) |
| 🚋 Morning Commute | Progressive | steady ramp |
| 🕯️ Lantern Walk | Recovery | easy Z1 spin |
| 🎈 Airship Launch | Pyramid | stepped up and down |
| 🥚 Gecko Hatching | Tempo / sweet spot | 3 × 6 min @ 85% |

The board's 📋 cards show each event's full segment profile. Three events are ⭐ *featured* each day and pay +25%.

**Structured Plan** builds a warm-up, then chains events (featured first, never two hard ones back-to-back, 2-min recoveries between them), fills the remaining time with steady Z2, and ends with a cool-down. The plan is fixed for the day, so the preview matches the ride.

## The town

- **7 districts**, opened by town tier and land purchases: Old Town (residential), Meadow Farms, Copperworks (industry), Tidewater Harbor, Lumen Campus (research), Gecko Sanctuary, Sky Dock.
- **46 buildings plus 8 decorations**, each with 3 tiers that look different at each tier.
- **Resources:** ⚡ Energy (only from riding), 🍞 Food, 🪵 Materials, 🧪 Research, 🪙 Gold, plus rare ✦ Spark crystals from events, tiers and charters.
- **Citizens.** Population grows with housing and happiness. Named citizens arrive with small requests ("Mira wants a bakery") that act as soft quests.
- **Research:** 28 nodes (new buildings, efficiency, bigger batteries, cosmetics).
- **Progression:** 7 town tiers by lifetime kJ (Outpost → Hamlet 2.5k → Village 10k → Town 25k → Borough 50k → City 100k → Metropolis 200k), 49 achievements, and weekly Town Charters. Streaks count **rides per week**, so rest days never break them.
- **Day/night, seasons and weather** follow the real clock (or a debug override). Events bring their own weather: storms during Storm Blackout, lanterns during Festival Night.
- **Idle:** while you're away the town draws gently on the battery (capped so a full battery lasts about a week) and pauses production if it empties. It never decays. You get a "while you were away" summary when you come back.

## Post-ride, export and import

- **Post-ride screen:** energy, event results, time in zones, average/NP/IF/TSS, what was built or unlocked, and a before/after town image.
- **⬇ Save .tcx for Garmin:** 1 s trackpoints with power, cadence and HR (TCX v2 with the ActivityExtension `Watts`). Upload at connect.garmin.com → Import Data; it syncs on to Strava. Distance is a virtual flat-road speed computed from power.
- **📸 Share card:** a portrait image with a town snapshot, power trace, stats and a generated title ("Restored 3 districts through a blackout"). Copy title and Copy description buttons are next to it.
- **📈 Stats → Import rides:** past `.tcx` / `.fit` files (including outdoor rides) credit energy at a reduced rate (default 50%, adjustable). Each ride is credited only once, and rides you recorded in Dynamo Town are recognised and skipped.

## Saves

- Autosaves every 30 s, after every action, and whenever the app is hidden or closed. The save goes to IndexedDB, mirrored to localStorage, with 3 rolling daily backups.
- ⚙️ Settings → Save: **Export save (.json)** / **Import save**. Export now and then; it's your town.
- The save schema is versioned with migrations, and missing fields are filled from defaults, so updates never wipe a town.

## Debug and testing tools (⚙️ Settings → Debug)

- **Simulated trainer** with sliders and a **bot** that rides targets (±noise).
- **Time skip:** +1 h, +8 h, +1 day, +1 week or +30 days to test idle and away behavior.
- **Long-term test:** a bot rides N weeks of mixed plans, events and free rides, with rest days, while a scripted player spends. It reports tier, buildings, citizens and achievements.
- **Show FPS** and Display quality (High / Balanced / Battery saver).

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest: save migrations, economy, TCX/FIT round-trips
npm run build      # typecheck + production build in dist/
```

Pushing to `main` runs `.github/workflows/deploy.yml`: test → build → publish `dist/` to the `gh-pages` branch, which GitHub Pages serves.

### Project layout

```
src/
  data/       ← all content: buildings, events, research, achievements, tiers, districts, citizens, charters
  sim/        economy, town placement, progression, research, idle catch-up, long-term bot test
  ride/       trainer (FTMS/CPS/HR), sensors + simulator, session (segments, scoring), plan builder, controls
  render/     isometric renderer, sprite cache, terrain chunks, sky/weather, dynamo, citizens, art/*
  ui/         HUD, town UI, ride UI, post-ride, stats, settings
  io/tcx.ts   TCX export, TCX/FIT import
  core/       state, save (IndexedDB + migrations), bus, utils
```

### Adding content

- **A building:** append to `BUILDINGS` in `src/data/buildings.ts` with a district, idle upkeep and 3 tiers (`[label, cost, { housing | happiness | prod | battery | boost }]`). Give it an `art` key that exists in `src/render/art/town1.ts` / `town2.ts`, or reuse an existing art key. Add a draw function there for new art: buildings are procedural canvas drawings with per-tier detail, cached as sprites per zoom level.
- **An event:** append to `EVENTS` in `src/data/events.ts` using the `erg()`, `rec()`, `sprint()`, `cad()` helpers (percent of FTP). `work: false` segments are not scored. Set a `district`, `weather`, `reward` and keepsake `decor`. Plans and the board pick it up automatically.
- **Research:** append to `RESEARCH` in `src/data/research.ts` with `needs`, `cost` and `boost` / `battery` / `unlocks`.
- **Achievements:** append to `ACHIEVEMENTS` in `src/data/achievements.ts` with a `test(ctx)` function.
- **New save fields:** add them to `newGame()` in `src/core/state.ts`; existing saves gain them automatically. For renames or reshapes, bump `SCHEMA_VERSION` and add a `migrations[n]` entry in `src/core/save.ts`.

See `DECISIONS.md` for the assumptions and trade-offs behind all of this.
