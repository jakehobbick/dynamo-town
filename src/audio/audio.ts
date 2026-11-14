// Synthesised audio: sound effects, ambience (birds, crickets, sea, wind, rain) and calm
// generative music that builds during grid events. No audio files.
import { G } from '../core/state';
import { RS } from '../render/rstate';

let ac: AudioContext | null = null;
let master: GainNode, musicBus: GainNode, ambBus: GainNode, sfxBus: GainNode;
let noiseBuf: AudioBuffer | null = null;
const amb: Record<string, { src: AudioBufferSourceNode; gain: GainNode; filt: BiquadFilterNode } | null> = { sea: null, wind: null, rain: null };

export const music = { intensity: 0, target: 0, enabled: true };

export function audioInit() {
  try {
    if (!ac) {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ac = new AC() as AudioContext;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 3;
      master = ac.createGain();
      master.connect(comp).connect(ac.destination);
      musicBus = ac.createGain();
      ambBus = ac.createGain();
      sfxBus = ac.createGain();
      for (const b of [musicBus, ambBus, sfxBus]) b.connect(master);
      noiseBuf = makeNoise(ac);
      startAmbience();
      startMusic();
      applyVolumes();
    }
    if (ac.state === 'suspended') ac.resume();
  } catch (e) {
    console.warn('audio init failed', e);
  }
}

export function applyVolumes() {
  if (!ac) return;
  const v = G.s.settings.vol;
  const m = G.s.settings.muted ? 0 : v.master;
  master.gain.setTargetAtTime(m, ac.currentTime, 0.05);
  musicBus.gain.setTargetAtTime(v.music * 0.55, ac.currentTime, 0.05);
  ambBus.gain.setTargetAtTime(v.amb * 0.6, ac.currentTime, 0.05);
  sfxBus.gain.setTargetAtTime(v.sfx * 0.8, ac.currentTime, 0.05);
}

function makeNoise(a: AudioContext) {
  const len = a.sampleRate * 3;
  const b = a.createBuffer(1, len, a.sampleRate);
  const d = b.getChannelData(0);
  // pink-ish noise
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
  }
  return b;
}

function tone(f: number, dur = 0.15, vol = 0.2, type: OscillatorType = 'sine', delay = 0, bus?: GainNode, attack = 0.005) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus || sfxBus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noiseBurst(dur: number, vol: number, freq: number, q = 1, delay = 0, bus?: GainNode) {
  if (!ac || !noiseBuf) return;
  const t = ac.currentTime + delay;
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(bus || sfxBus);
  s.start(t, Math.random() * 2);
  s.stop(t + dur + 0.05);
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

export type Sfx = 'click' | 'build' | 'upgrade' | 'coin' | 'unlock' | 'shift' | 'event' | 'segment' | 'success' | 'partial' | 'beep' | 'go' | 'warn' | 'achievement' | 'tier';
export function sfx(name: Sfx) {
  if (!ac) return;
  switch (name) {
    case 'click':
      tone(880, 0.06, 0.08, 'triangle');
      break;
    case 'build':
      noiseBurst(0.25, 0.4, 300, 0.8);
      tone(196, 0.25, 0.25, 'sine');
      [523, 659, 784].forEach((f, i) => tone(f, 0.3, 0.12, 'triangle', 0.12 + i * 0.07));
      break;
    case 'upgrade':
      [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, 0.11, 'triangle', i * 0.06));
      break;
    case 'coin':
      tone(1319, 0.08, 0.1, 'square');
      tone(1760, 0.18, 0.08, 'square', 0.06);
      break;
    case 'unlock':
    case 'achievement':
      [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.45, 0.12, 'triangle', i * 0.09));
      tone(330, 0.8, 0.1, 'sine', 0.05);
      break;
    case 'tier':
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.9, 0.12, 'triangle', i * 0.12));
      [196, 262].forEach((f, i) => tone(f, 1.6, 0.12, 'sine', i * 0.2));
      break;
    case 'shift':
      tone(1500, 0.03, 0.06, 'square');
      break;
    case 'event':
      tone(98, 1.6, 0.3, 'sine');
      tone(196, 1.2, 0.12, 'triangle');
      tone(294, 1.0, 0.08, 'triangle', 0.05);
      break;
    case 'segment':
      tone(988, 0.5, 0.12, 'sine');
      tone(1319, 0.6, 0.08, 'sine', 0.05);
      break;
    case 'success':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.7, 0.13, 'triangle', i * 0.08));
      break;
    case 'partial':
      [523, 659, 784].forEach((f, i) => tone(f, 0.5, 0.1, 'triangle', i * 0.1));
      break;
    case 'beep':
      tone(880, 0.12, 0.12, 'sine');
      break;
    case 'go':
      tone(1320, 0.3, 0.15, 'sine');
      break;
    case 'warn':
      tone(440, 0.15, 0.1, 'triangle');
      tone(330, 0.2, 0.1, 'triangle', 0.15);
      break;
  }
}

// ---------------- ambience ----------------
function loopNoise(type: BiquadFilterType, freq: number, q: number) {
  if (!ac || !noiseBuf) return null;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const filt = ac.createBiquadFilter();
  filt.type = type;
  filt.frequency.value = freq;
  filt.Q.value = q;
  const gain = ac.createGain();
  gain.gain.value = 0;
  src.connect(filt).connect(gain).connect(ambBus);
  src.start();
  return { src, gain, filt };
}

function startAmbience() {
  amb.sea = loopNoise('lowpass', 420, 0.6);
  amb.wind = loopNoise('bandpass', 700, 0.5);
  amb.rain = loopNoise('highpass', 2500, 0.3);
  setInterval(ambTick, 250);
}

let ambT = 0;
function ambTick() {
  if (!ac) return;
  ambT += 0.25;
  const t = ac.currentTime;
  const w = RS.weather, k = RS.weatherK;
  // sea swells
  if (amb.sea) amb.sea.gain.gain.setTargetAtTime(0.25 + 0.15 * Math.sin(ambT * 0.6), t, 0.4);
  if (amb.wind) {
    const wk = (w === 'wind' ? 0.6 : w === 'storm' ? 0.7 : w === 'snow' ? 0.25 : 0.06) * k + 0.03;
    amb.wind.gain.gain.setTargetAtTime(wk, t, 0.6);
    amb.wind.filt.frequency.setTargetAtTime(500 + 400 * Math.sin(ambT * 0.3), t, 0.5);
  }
  if (amb.rain) amb.rain.gain.gain.setTargetAtTime((w === 'rain' ? 0.35 : w === 'storm' ? 0.55 : 0) * k, t, 0.6);
  // thunder
  if (RS.flash > 0.9) {
    noiseBurst(2.2, 0.5, 80, 0.7, 0.3 + Math.random() * 0.6, ambBus);
  }
  // birds by day, crickets by night
  if (RS.night < 0.4 && w !== 'rain' && w !== 'storm' && Math.random() < 0.18) {
    const base = 2200 + Math.random() * 1600;
    const n = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) chirp(base * (1 + (Math.random() - 0.5) * 0.15), i * 0.11);
  }
  if (RS.night > 0.6 && RS.season !== 'winter' && Math.random() < 0.5) {
    for (let i = 0; i < 3; i++) tone(4200 + Math.random() * 300, 0.04, 0.015, 'sine', i * 0.06, ambBus);
  }
  // seagulls near harbor-ish random
  if (Math.random() < 0.02 && RS.night < 0.5) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(1400, t);
    o.frequency.exponentialRampToValueAtTime(900, t + 0.35);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.02, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1200;
    o.connect(f).connect(g).connect(ambBus);
    o.start(t);
    o.stop(t + 0.45);
  }
}

function chirp(f: number, delay: number) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 1.35, t + 0.05);
  o.frequency.exponentialRampToValueAtTime(f * 0.9, t + 0.09);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.035, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g).connect(ambBus);
  o.start(t);
  o.stop(t + 0.12);
}

// ---------------- music ----------------
// A gentle generative piece in C major pentatonic: pad chords, plucked arpeggios,
// and (with intensity) a bass line and soft percussion. Intensity follows grid events.
const PROG = [
  [48, 55, 60, 64], // C
  [45, 52, 57, 60], // Am
  [41, 48, 53, 57], // F
  [43, 50, 55, 59], // G
];
const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79];
let nextBeat = 0;
let beat = 0;

function startMusic() {
  setInterval(schedule, 60);
}

function schedule() {
  if (!ac || !music.enabled) return;
  music.intensity += (music.target - music.intensity) * 0.02;
  const bpm = 74 + music.intensity * 22;
  const spb = 60 / bpm / 2; // eighth notes
  if (nextBeat < ac.currentTime) nextBeat = ac.currentTime + 0.05;
  while (nextBeat < ac.currentTime + 0.25) {
    playBeat(beat, nextBeat, spb);
    nextBeat += spb;
    beat++;
  }
}

function playBeat(b: number, t: number, spb: number) {
  if (!ac) return;
  const bar = Math.floor(b / 8);
  const chord = PROG[bar % 4];
  const step = b % 8;
  const I = music.intensity;
  const night = RS.night > 0.5;
  // pad on each bar
  if (step === 0) for (const n of chord) pad(NOTE(n + (night ? -12 : 0) + 12), spb * 8, 0.035, t);
  // arpeggio: sparse when calm, denser with intensity
  const density = 0.35 + I * 0.5;
  if (Math.random() < density && (step % 2 === 0 || I > 0.4)) {
    const n = PENTA[(step + bar * 3 + Math.floor(Math.random() * 3)) % PENTA.length] + (night ? -12 : 0);
    pluck(NOTE(n), 0.6, 0.05 + I * 0.02, t);
  }
  // bass + percussion with intensity
  if (I > 0.25 && step % 4 === 0) pluck(NOTE(chord[0] - 12), spb * 3, 0.08 * I, t, 'triangle');
  if (I > 0.45) {
    if (step % 4 === 0) kick(t, 0.25 * I);
    if (step % 2 === 1) hat(t, 0.05 * I);
  }
}

function pad(f: number, dur: number, vol: number, t: number) {
  if (!ac) return;
  const g = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 900 + music.intensity * 1200;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.linearRampToValueAtTime(0.0001, t + dur * 1.05);
  lp.connect(g).connect(musicBus);
  for (const d of [-6, 6]) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.detune.value = d;
    o.connect(lp);
    o.start(t);
    o.stop(t + dur * 1.1);
  }
}

function pluck(f: number, dur: number, vol: number, t: number, type: OscillatorType = 'triangle') {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicBus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function kick(t: number, vol: number) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  o.connect(g).connect(musicBus);
  o.start(t);
  o.stop(t + 0.3);
}

function hat(t: number, vol: number) {
  if (!ac || !noiseBuf) return;
  const s = ac.createBufferSource();
  s.buffer = noiseBuf;
  const f = ac.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7000;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  s.connect(f).connect(g).connect(musicBus);
  s.start(t, Math.random());
  s.stop(t + 0.06);
}

export const audioReady = () => !!ac;
