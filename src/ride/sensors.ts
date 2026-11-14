// Unified live sensor state, fed either by Bluetooth (trainer.ts) or the simulated trainer.
import { clamp, lerp } from '../core/util';
import { G } from '../core/state';

export const sens = {
  power: 0,
  cad: 0,
  hr: 0,
  powerSm: 0, // ~1.4 s smoothing for display
  cadSm: 0,
  power3s: 0,
  src: 'sim' as 'sim' | 'ble',
  lastP: 0,
  lastC: 0,
  lastHR: 0,
  hrOK: false,
};

/** Simulated trainer (sliders, keyboard arrows, bot). */
export const sim = {
  watts: 150,
  cad: 88,
  hr: 0,
  sprint: false,
  bot: false,
  speed: 1, // ride time multiplier (debug only)
  noise: 0.04,
};

/** What the trainer is being asked to do right now. */
export type TrainerTarget =
  | { mode: 'erg'; w: number } // absolute watts
  | { mode: 'gear' } // free riding with virtual or real gears
  | { mode: 'idle' };

export const GEARS = 24;
const GEAR_STEP = 1.065;
export const gearRatio = (g = G.s.settings.gear) => Math.pow(GEAR_STEP, g - 12);
/** Watts at 90 rpm in a given virtual gear. */
export const gearCenterW = (g = G.s.settings.gear) => G.s.settings.gearFeel * gearRatio(g) * G.s.settings.ftp;
/** Virtual-gear power law: cubic in cadence like a real drivetrain at steady speed. */
export function gearWatts(cad: number, g = G.s.settings.gear) {
  return clamp(gearCenterW(g) * Math.pow(Math.max(0, cad) / 90, 3), 25, 2.8 * G.s.settings.ftp);
}
export const rpmFor = (w: number, g = G.s.settings.gear) => 90 * Math.cbrt(w / gearCenterW(g));

/** Bot behaviour: follow whatever the current target is, with a little noise. */
export const bot = {
  /** set by the ride session each frame: what a diligent rider would do */
  want: { w: 150, cad: 88, sprint: false },
};

let hrPhase = 0;
export function readSensors(dt: number, target: TrainerTarget) {
  const now = performance.now();
  if (sens.src === 'sim') {
    if (sim.bot) {
      const n = 1 + (Math.sin(now / 900) * 0.6 + (Math.random() - 0.5)) * sim.noise;
      sim.cad = lerp(sim.cad, bot.want.cad, Math.min(1, dt * 2));
      sim.sprint = bot.want.sprint;
      sim.watts = Math.max(0, bot.want.w * n);
    }
    let w = sim.watts;
    if (target.mode === 'erg') w = target.w * (sim.bot ? 1 + (Math.random() - 0.5) * sim.noise : 1);
    else if (target.mode === 'gear' && G.s.settings.gears === 'virtual' && !sim.bot) w = gearWatts(sim.cad + (sim.sprint ? 25 : 0));
    if (sim.sprint && !sim.bot) w = Math.max(w, G.s.settings.ftp * 1.75);
    sens.power = lerp(sens.power, w, Math.min(1, dt * 5));
    sens.cad = sens.power > 5 ? lerp(sens.cad, sim.cad + (sim.sprint ? 18 : 0), Math.min(1, dt * 4)) : 0;
    // fake heart rate that follows power slowly
    hrPhase += dt;
    const hrT = 62 + (sens.power / G.s.settings.ftp) * 95;
    sim.hr = lerp(sim.hr || 70, hrT, Math.min(1, dt / 25)) + Math.sin(hrPhase * 0.7) * 0.2;
    if (!sens.hrOK) sens.hr = Math.round(sim.hr);
  } else {
    if (now - sens.lastP > 3000) sens.power = 0;
    if (now - sens.lastC > 3000) sens.cad = 0;
  }
  if (sens.src === 'ble' && now - sens.lastHR > 5000 && !sens.hrOK) sens.hr = 0;
  sens.powerSm += (sens.power - sens.powerSm) * (1 - Math.exp(-dt / 1.4));
  sens.power3s += (sens.power - sens.power3s) * (1 - Math.exp(-dt / 2.2));
  sens.cadSm += (sens.cad - sens.cadSm) * (1 - Math.exp(-dt / 0.8));
}
