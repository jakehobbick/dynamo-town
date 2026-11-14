// Bluetooth trainer + heart-rate connection.
// Ported from Crank Crypt (FTMS indoor bike data, cycling power fallback, control point writes),
// extended with automatic reconnect after a drop-out.
import { emit } from '../core/bus';
import { G } from '../core/state';
import { clamp, sleep } from '../core/util';
import { sens, gearWatts, type TrainerTarget } from './sensors';

const U = (n: number) => '0000' + n.toString(16).padStart(4, '0') + '-0000-1000-8000-00805f9b34fb';
const errMsg = (e: any) => (e && (e.message || e.name)) || (typeof e === 'string' ? e : JSON.stringify(e)) || 'unknown error';

export const status = {
  trainer: 'Not connected',
  trainerOK: false,
  control: false,
  hr: 'Not connected',
  hrOK: false,
  reconnecting: false,
  name: '',
  log: [] as string[],
};

const ble: {
  dev: any;
  cp: any;
  q: Promise<any>;
  mode: string | null;
  ergW: number | null;
  grade: number | null;
  lastSend: number;
  wantConnected: boolean;
  hrDev: any;
} = { dev: null, cp: null, q: Promise.resolve(), mode: null, ergW: null, grade: null, lastSend: 0, wantConnected: false, hrDev: null };

const crankPrev = { revs: null as number | null, time: 0, lastChange: 0 };

function blog(m: string) {
  status.log.push(new Date().toLocaleTimeString() + ' ' + m);
  if (status.log.length > 60) status.log.shift();
  emit('ble:status');
}

export const bluetoothAvailable = () => typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;

function cpWrite(bytes: number[]) {
  ble.q = ble.q
    .then(() => {
      const c = ble.cp;
      if (!c) return;
      const d = new Uint8Array(bytes);
      return c.writeValueWithResponse ? c.writeValueWithResponse(d) : c.writeValue(d);
    })
    .catch((e: any) => blog('control write failed: ' + errMsg(e)));
  return ble.q;
}

function parseIBD(dv: DataView) {
  try {
    const f = dv.getUint16(0, true);
    let o = 2;
    const L = dv.byteLength;
    if (!(f & 1)) o += 2; // instantaneous speed present when bit0 == 0
    if (f & 2) o += 2; // avg speed
    if (f & 4) {
      if (o + 2 <= L) {
        sens.cad = dv.getUint16(o, true) / 2;
        sens.lastC = performance.now();
      }
      o += 2;
    }
    if (f & 8) o += 2; // avg cadence
    if (f & 16) o += 3; // total distance
    if (f & 32) o += 2; // resistance level
    if (f & 64) {
      if (o + 2 <= L) {
        sens.power = Math.max(0, dv.getInt16(o, true));
        sens.lastP = performance.now();
      }
      o += 2;
    }
    if (f & 128) o += 2; // avg power
    if (f & 256) o += 5; // expended energy
    if (f & 512) {
      if (o + 1 <= L && !sens.hrOK) {
        const h = dv.getUint8(o);
        if (h > 0) {
          sens.hr = h;
          sens.lastHR = performance.now();
        }
      }
      o += 1;
    }
  } catch {}
}

function parseCPS(dv: DataView) {
  try {
    const f = dv.getUint16(0, true);
    sens.power = Math.max(0, dv.getInt16(2, true));
    sens.lastP = performance.now();
    let o = 4;
    if (f & 1) o += 1;
    if (f & 4) o += 2;
    if (f & 16) o += 6;
    if (f & 32 && o + 4 <= dv.byteLength) {
      const revs = dv.getUint16(o, true), t = dv.getUint16(o + 2, true);
      if (crankPrev.revs != null) {
        const dr = (revs - crankPrev.revs + 65536) % 65536, dtt = ((t - crankPrev.time + 65536) % 65536) / 1024;
        if (dr > 0 && dtt > 0) {
          sens.cad = clamp((dr / dtt) * 60, 0, 200);
          sens.lastC = performance.now();
          crankPrev.lastChange = performance.now();
        } else if (performance.now() - crankPrev.lastChange > 2500) sens.cad = 0;
      }
      crankPrev.revs = revs;
      crankPrev.time = t;
    }
  } catch {}
}

/** Subscribe to data + take control. Used for first connect and for reconnects. */
async function setupTrainer(dev: any) {
  let srv: any = null;
  for (let i = 1; i <= 3 && !srv; i++) {
    try {
      srv = await dev.gatt.connect();
    } catch (e) {
      blog('connect attempt ' + i + ' failed: ' + errMsg(e));
      if (i === 3) throw e;
      await sleep(800);
    }
  }
  await sleep(300);
  let ftms: any = null;
  try {
    ftms = await srv.getPrimaryService(U(0x1826));
  } catch (e) {
    blog('no FTMS service: ' + errMsg(e));
  }
  let gotData = false;
  ble.cp = null;
  status.control = false;
  if (ftms) {
    try {
      const ibd = await ftms.getCharacteristic(U(0x2ad2));
      ibd.addEventListener('characteristicvaluechanged', (e: any) => parseIBD(e.target.value));
      await ibd.startNotifications();
      gotData = true;
    } catch (e) {
      blog('trainer data failed: ' + errMsg(e));
    }
    try {
      const cp = await ftms.getCharacteristic(U(0x2ad9));
      cp.addEventListener('characteristicvaluechanged', () => {});
      await cp.startNotifications();
      ble.cp = cp;
      const d = new Uint8Array([0x00]); // request control
      await (cp.writeValueWithResponse ? cp.writeValueWithResponse(d) : cp.writeValue(d));
      await sleep(200);
      await cpWrite([0x07]); // start / resume
      status.control = true;
    } catch (e) {
      ble.cp = null;
      status.control = false;
      blog('control failed: ' + errMsg(e));
    }
  }
  if (!gotData) {
    const cps = await srv.getPrimaryService(U(0x1818));
    const m = await cps.getCharacteristic(U(0x2a63));
    m.addEventListener('characteristicvaluechanged', (e: any) => parseCPS(e.target.value));
    await m.startNotifications();
  }
  sens.src = 'ble';
  sens.lastP = performance.now();
  status.trainerOK = true;
  status.trainer = (dev.name || 'Trainer') + (status.control ? ' · ERG control ✓' : ' · power only');
  ble.mode = null;
  blog('connected, control=' + status.control);
}

export async function connectTrainer() {
  if (!bluetoothAvailable()) {
    status.trainer = 'Bluetooth not available in this browser';
    emit('ble:status');
    return false;
  }
  const nav = navigator as any;
  try {
    status.trainer = 'Choosing device…';
    emit('ble:status');
    const opt = [U(0x1826), U(0x1818), U(0x180d), U(0x180a)];
    let dev: any;
    try {
      dev = await nav.bluetooth.requestDevice({
        filters: [{ services: [U(0x1826)] }, { services: [U(0x1818)] }, { namePrefix: 'KICKR' }],
        optionalServices: opt,
      });
    } catch (e: any) {
      if (e && e.name === 'NotFoundError') throw e;
      blog('filtered picker failed: ' + errMsg(e) + ', trying all devices');
      dev = await nav.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: opt });
    }
    blog('picked ' + (dev.name || dev.id));
    status.name = dev.name || 'Trainer';
    ble.dev = dev;
    ble.wantConnected = true;
    dev.addEventListener('gattserverdisconnected', onTrainerLost);
    status.trainer = 'Connecting…';
    emit('ble:status');
    await setupTrainer(dev);
    emit('trainer:connected');
    emit('ble:status');
    return true;
  } catch (e: any) {
    if (e && e.name === 'NotFoundError') {
      status.trainer = 'Not connected';
      blog('picker cancelled');
    } else {
      status.trainer = 'Failed: ' + errMsg(e);
      blog('FAILED: ' + errMsg(e));
    }
    emit('ble:status');
    return false;
  }
}

function onTrainerLost() {
  status.trainerOK = false;
  status.control = false;
  ble.cp = null;
  blog('trainer disconnected');
  if (!ble.wantConnected) return;
  status.trainer = 'Signal lost, reconnecting…';
  emit('trainer:lost');
  emit('ble:status');
  reconnectLoop();
}

async function reconnectLoop() {
  if (status.reconnecting) return;
  status.reconnecting = true;
  let delay = 1000;
  for (let i = 1; ble.wantConnected && !status.trainerOK; i++) {
    await sleep(delay);
    if (!ble.wantConnected) break;
    try {
      blog('reconnect attempt ' + i);
      await setupTrainer(ble.dev);
      emit('trainer:back');
      break;
    } catch (e) {
      blog('reconnect failed: ' + errMsg(e));
      delay = Math.min(8000, delay * 1.6);
      if (i === 4) status.trainer = 'Still reconnecting… (wake the trainer by pedalling)';
      emit('ble:status');
    }
  }
  status.reconnecting = false;
  emit('ble:status');
}

export function disconnectTrainer() {
  ble.wantConnected = false;
  try {
    ble.dev?.gatt?.disconnect();
  } catch {}
  sens.src = 'sim';
  status.trainerOK = false;
  status.trainer = 'Not connected';
  emit('ble:status');
}

export async function connectHR() {
  if (!bluetoothAvailable()) return false;
  const nav = navigator as any;
  try {
    const dev = await nav.bluetooth.requestDevice({ filters: [{ services: [U(0x180d)] }] });
    ble.hrDev = dev;
    const setup = async () => {
      const srv = await dev.gatt.connect();
      const s = await srv.getPrimaryService(U(0x180d));
      const c = await s.getCharacteristic(U(0x2a37));
      c.addEventListener('characteristicvaluechanged', (e: any) => {
        const v: DataView = e.target.value;
        const f = v.getUint8(0);
        sens.hr = f & 1 ? v.getUint16(1, true) : v.getUint8(1);
        sens.lastHR = performance.now();
        sens.hrOK = true;
      });
      await c.startNotifications();
      status.hrOK = true;
      status.hr = dev.name || 'Heart rate ✓';
      emit('ble:status');
    };
    dev.addEventListener('gattserverdisconnected', async () => {
      status.hrOK = false;
      sens.hrOK = false;
      status.hr = 'Reconnecting…';
      emit('ble:status');
      for (let i = 0; i < 20 && !status.hrOK; i++) {
        await sleep(1500 + i * 500);
        try {
          await setup();
        } catch {}
      }
      if (!status.hrOK) status.hr = 'Disconnected';
      emit('ble:status');
    });
    await setup();
    return true;
  } catch (e: any) {
    if (!(e && e.name === 'NotFoundError')) status.hr = 'Failed: ' + errMsg(e);
    emit('ble:status');
    return false;
  }
}

/**
 * Push the current target to the trainer. Called every frame; it throttles itself.
 * ERG: absolute watts. Gear mode with virtual gears: ERG watts from cadence (cubic gear law),
 * exactly like Crank Crypt's no-gears mode. Gear mode with real gears: flat SIM grade.
 */
export function applyTarget(t: TrainerTarget, force = false, fast = false) {
  if (!status.control || !ble.cp) return;
  const now = performance.now();
  if (t.mode === 'erg') {
    const w = Math.round(clamp(t.w, 0, 2000));
    if (force || ble.mode !== 'erg' || ble.ergW !== w) {
      cpWrite([0x05, w & 255, (w >> 8) & 255]);
      ble.mode = 'erg';
      ble.ergW = w;
      ble.lastSend = now;
    }
  } else if (t.mode === 'gear') {
    if (G.s.settings.gears === 'virtual') {
      const w = Math.round(gearWatts(sens.cadSm || 0));
      const gap = fast ? 300 : 900;
      if (force || ble.mode !== 'vg' || (Math.abs((ble.ergW ?? -99) - w) >= 4 && now - ble.lastSend > gap)) {
        cpWrite([0x05, w & 255, (w >> 8) & 255]);
        ble.mode = 'vg';
        ble.ergW = w;
        ble.lastSend = now;
      }
    } else {
      const g = 0;
      if (force || ble.mode !== 'sim') {
        const gv = Math.round(g * 100);
        cpWrite([0x11, 0, 0, gv & 255, (gv >> 8) & 255, 40, 51]);
        ble.mode = 'sim';
        ble.grade = g;
        ble.lastSend = now;
      }
    }
  } else if (t.mode === 'idle') {
    if (force || ble.mode !== 'idle') {
      const w = Math.round(G.s.settings.ftp * 0.45);
      cpWrite([0x05, w & 255, (w >> 8) & 255]);
      ble.mode = 'idle';
      ble.ergW = w;
    }
  }
}

export const trainerMode = () => ble.mode;
export const trainerErgW = () => ble.ergW;
