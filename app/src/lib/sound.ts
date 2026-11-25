// Sound effects, synthesised live with Web Audio: no files to download, works offline,
// and every sound is our own. Short, bright and bouncy to match the cartoon look.

export type Sfx =
  | 'tap' | 'toggle' | 'add' | 'pop' | 'check' | 'habit' | 'combo' | 'allDone' | 'streak' | 'evolve'
  | 'focusStart' | 'focusEnd' | 'feat' | 'locked' | 'error' | 'shutter' | 'whoosh' | 'pass' | 'tick';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) { enabled = on; }

function audio(): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      // a gentle compressor keeps stacked sounds from clipping
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

// Browsers only allow sound after a touch: wake the engine on the first one.
if (typeof window !== 'undefined') {
  const wake = () => { audio(); window.removeEventListener('pointerdown', wake); };
  window.addEventListener('pointerdown', wake);
}

const NOTE = (n: number) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

type ToneOpts = { type?: OscillatorType; vol?: number; attack?: number; decay?: number; glideTo?: number; detune?: number; pan?: number };

function tone(c: AudioContext, freq: number, at: number, dur: number, o: ToneOpts = {}) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(freq, at);
  if (o.glideTo) osc.frequency.exponentialRampToValueAtTime(o.glideTo, at + dur);
  if (o.detune) osc.detune.value = o.detune;
  const vol = o.vol ?? 0.3, attack = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let out: AudioNode = g;
  if (o.pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = o.pan; g.connect(p); out = p; }
  osc.connect(g);
  out.connect(master!);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

// A bell: a sine plus a quieter overtone, for chimes
function bell(c: AudioContext, freq: number, at: number, dur = 0.5, vol = 0.22) {
  tone(c, freq, at, dur, { vol, type: 'sine' });
  tone(c, freq * 2, at, dur * 0.6, { vol: vol * 0.35, type: 'sine' });
  tone(c, freq * 3.01, at, dur * 0.3, { vol: vol * 0.12, type: 'sine' });
}

function noise(c: AudioContext, at: number, dur: number, o: { vol?: number; from?: number; to?: number; q?: number; type?: BiquadFilterType } = {}) {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = o.type || 'bandpass';
  f.Q.value = o.q ?? 1.2;
  f.frequency.setValueAtTime(o.from ?? 1200, at);
  if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, at + Math.min(0.03, dur / 3));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(at);
  src.stop(at + dur + 0.05);
}

// Sparkle: a quick shower of high random bell notes
function sparkle(c: AudioContext, at: number, count = 8, spread = 0.5, vol = 0.07) {
  const scale = [84, 86, 88, 91, 93, 96, 98];
  for (let i = 0; i < count; i++) {
    const n = scale[Math.floor(Math.random() * scale.length)];
    tone(c, NOTE(n), at + (i / count) * spread + Math.random() * 0.03, 0.18, { vol, pan: Math.random() * 1.6 - 0.8 });
  }
}

let comboLevel = 0, comboAt = 0;

export function play(name: Sfx) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  switch (name) {
    case 'tap':
      tone(c, 1250, t, 0.045, { vol: 0.08, type: 'triangle' });
      break;
    case 'tick':
      tone(c, 1800, t, 0.03, { vol: 0.05, type: 'square' });
      break;
    case 'toggle':
      tone(c, 700, t, 0.06, { vol: 0.12, type: 'triangle', glideTo: 1100 });
      break;
    case 'whoosh':
      noise(c, t, 0.22, { vol: 0.08, from: 500, to: 2800, q: 0.8 });
      break;
    case 'add': // a round "plop"
      tone(c, 320, t, 0.14, { vol: 0.3, glideTo: 880 });
      tone(c, 1320, t + 0.08, 0.12, { vol: 0.08, type: 'triangle' });
      break;
    case 'pop':
      tone(c, 520, t, 0.09, { vol: 0.28, glideTo: 1040, type: 'sine' });
      break;
    case 'check': // task done: snappy two-note ding
      tone(c, 420, t, 0.06, { vol: 0.2, glideTo: 900, type: 'triangle' });
      bell(c, NOTE(84), t + 0.05, 0.35, 0.16);
      bell(c, NOTE(91), t + 0.12, 0.45, 0.14);
      break;
    case 'habit': { // habit done: rising major chime, a step higher on quick combos
      const now = performance.now();
      comboLevel = now - comboAt < 6000 ? Math.min(comboLevel + 1, 5) : 0;
      comboAt = now;
      const base = 72 + comboLevel * 2;
      tone(c, 300, t, 0.08, { vol: 0.22, glideTo: 1200, type: 'triangle' });
      [0, 4, 7, 12].forEach((s, i) => bell(c, NOTE(base + s), t + 0.04 + i * 0.07, 0.5, 0.18));
      sparkle(c, t + 0.3, 5, 0.25, 0.05);
      break;
    }
    case 'combo':
      [0, 4, 7, 12, 16].forEach((s, i) => bell(c, NOTE(79 + s), t + i * 0.05, 0.3, 0.12));
      break;
    case 'allDone': { // fanfare: brass-ish arpeggio, a held chord and a sparkle shower
      const brass = (n: number, at: number, dur: number, vol = 0.12) => {
        tone(c, NOTE(n), at, dur, { type: 'sawtooth', vol, attack: 0.02 });
        tone(c, NOTE(n), at, dur, { type: 'square', vol: vol * 0.4, attack: 0.02, detune: 7 });
      };
      [60, 64, 67].forEach((n, i) => brass(n, t + i * 0.11, 0.16, 0.09));
      brass(72, t + 0.33, 0.25, 0.1);
      [60, 64, 67, 72].forEach(n => brass(n, t + 0.6, 1.1, 0.06));
      bell(c, NOTE(84), t + 0.6, 1.2, 0.16);
      tone(c, NOTE(36), t + 0.6, 0.9, { type: 'triangle', vol: 0.3 });
      noise(c, t + 0.58, 0.5, { vol: 0.06, from: 6000, to: 9000, q: 0.5, type: 'highpass' });
      sparkle(c, t + 0.7, 14, 1.0, 0.06);
      break;
    }
    case 'streak': // fire: a rising whoosh, crackle and a bright chord
      noise(c, t, 0.55, { vol: 0.16, from: 300, to: 3500, q: 0.7 });
      for (let i = 0; i < 7; i++) noise(c, t + 0.1 + Math.random() * 0.4, 0.03, { vol: 0.12, from: 2500 + Math.random() * 2500, q: 3 });
      [67, 71, 74, 79].forEach((n, i) => bell(c, NOTE(n), t + 0.45 + i * 0.04, 0.8, 0.12));
      break;
    case 'evolve': // magical: long rising glide, shimmering chord, then a bright reveal
      tone(c, 180, t, 1.4, { type: 'triangle', vol: 0.16, glideTo: 1400, attack: 0.3 });
      tone(c, 182, t, 1.4, { type: 'sine', vol: 0.12, glideTo: 1420, attack: 0.3 });
      noise(c, t, 1.4, { vol: 0.07, from: 400, to: 8000, q: 0.6 });
      sparkle(c, t + 0.4, 18, 1.0, 0.05);
      [72, 76, 79, 84, 88].forEach((n, i) => bell(c, NOTE(n), t + 1.45 + i * 0.06, 1.4, 0.15));
      tone(c, NOTE(48), t + 1.45, 1.2, { type: 'triangle', vol: 0.3 });
      noise(c, t + 1.42, 0.35, { vol: 0.12, from: 5000, q: 0.4, type: 'highpass' });
      break;
    case 'focusStart': // deep "whoom" then a rising ready-chime
      tone(c, 90, t, 0.5, { type: 'sine', vol: 0.4, glideTo: 55 });
      noise(c, t, 0.4, { vol: 0.08, from: 2000, to: 300, q: 0.7 });
      [67, 74, 79].forEach((n, i) => bell(c, NOTE(n), t + 0.25 + i * 0.09, 0.6, 0.14));
      break;
    case 'focusEnd':
      [72, 76, 79, 84].forEach((n, i) => bell(c, NOTE(n), t + i * 0.12, 0.9, 0.18));
      [60, 67, 72].forEach(n => tone(c, NOTE(n), t + 0.5, 1.2, { type: 'triangle', vol: 0.08, attack: 0.05 }));
      sparkle(c, t + 0.55, 12, 0.9, 0.06);
      break;
    case 'feat':
      tone(c, 260, t, 0.25, { type: 'triangle', vol: 0.2, glideTo: 1040 });
      [76, 79, 84, 88, 91].forEach((n, i) => bell(c, NOTE(n), t + 0.2 + i * 0.07, 0.7, 0.14));
      sparkle(c, t + 0.6, 10, 0.6, 0.05);
      break;
    case 'pass': // ticket stamp: thunk + cha-ching
      tone(c, 160, t, 0.12, { type: 'square', vol: 0.15, glideTo: 80 });
      bell(c, NOTE(88), t + 0.12, 0.25, 0.14);
      bell(c, NOTE(93), t + 0.2, 0.5, 0.14);
      break;
    case 'shutter':
      noise(c, t, 0.05, { vol: 0.3, from: 3000, q: 0.6, type: 'highpass' });
      noise(c, t + 0.07, 0.06, { vol: 0.2, from: 2000, q: 0.6, type: 'highpass' });
      break;
    case 'locked':
      tone(c, 220, t, 0.12, { type: 'square', vol: 0.09 });
      tone(c, 165, t + 0.14, 0.2, { type: 'square', vol: 0.09 });
      break;
    case 'error':
      tone(c, 300, t, 0.25, { type: 'triangle', vol: 0.2, glideTo: 150 });
      break;
  }
}
