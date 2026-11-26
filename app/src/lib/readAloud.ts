// Read-aloud engine for the reader. In the Android app it's the native ReadAloudService
// (keeps reading in the background, media notification, word-by-word progress). On the
// website it's the browser's speech, sentence by sentence, with word boundaries.
import { isNative, native, listenNative } from './native';
import { sentences } from './speech';

export type RVoice = { id: string; lang: string; label: string; natural: boolean; online: boolean };
type Progress = (offset: number, wordStart: number, wordEnd: number) => void;
type State = (playing: boolean, ended: boolean) => void;

let onProgress: Progress = () => {};
let onState: State = () => {};
export function onReadEvents(p: Progress, s: State) { onProgress = p; onState = s; }

if (isNative) {
  listenNative<{ offset: number; start: number; end: number }>('UltradianReadAloud', 'progress', d => onProgress(d.offset, d.start, d.end));
  listenNative<{ playing: boolean; ended: boolean }>('UltradianReadAloud', 'state', d => onState(d.playing, d.ended));
}

const LANGS: Record<string, string> = { en: 'English', hi: 'Hindi', ne: 'Nepali', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', ur: 'Urdu', pa: 'Punjabi', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic' };
const REGIONS: Record<string, string> = { US: 'US', GB: 'UK', IN: 'India', AU: 'Australia', CA: 'Canada', NP: 'Nepal' };
export const langName = (tag: string) => { const [l, r] = tag.replace('_', '-').split('-'); return `${LANGS[l.toLowerCase()] || l}${r && REGIONS[r.toUpperCase()] ? ` (${REGIONS[r.toUpperCase()]})` : ''}`; };

let cache: RVoice[] | null = null;
export async function readVoices(): Promise<RVoice[]> {
  if (cache) return cache;
  let raw: { id: string; lang: string; natural: boolean; online: boolean }[] = [];
  if (isNative) {
    const r = await native<{ voices: { name: string; lang: string; quality: number; network: boolean }[] }>('UltradianReadAloud', 'getVoices').catch(() => ({ voices: [] }));
    raw = r.voices.map(v => ({ id: v.name, lang: v.lang, natural: v.quality >= 400, online: v.network }));
  } else if ('speechSynthesis' in window) {
    let vs = speechSynthesis.getVoices();
    if (!vs.length) { await new Promise(r => { speechSynthesis.addEventListener('voiceschanged', r, { once: true }); setTimeout(r, 1500); }); vs = speechSynthesis.getVoices(); }
    raw = vs.map(v => ({ id: v.voiceURI, lang: v.lang, natural: /natural|neural|google/i.test(v.name), online: !v.localService }));
  }
  raw = raw.filter(v => LANGS[v.lang.split(/[-_]/)[0].toLowerCase()]);
  // Number the voices per language: "Voice 1", "Voice 2"… (best ones first)
  raw.sort((a, b) => a.lang.localeCompare(b.lang) || Number(b.natural) - Number(a.natural) || Number(a.online) - Number(b.online));
  const n: Record<string, number> = {};
  cache = raw.map(v => { n[v.lang] = (n[v.lang] || 0) + 1; return { ...v, label: `Voice ${n[v.lang]}` }; });
  return cache;
}

export function previewVoice(v: RVoice, rate: number) {
  const text = 'Hi! This is how I sound when I read your book.';
  if (isNative) { native('UltradianReadAloud', 'preview', { voice: v.id, text, rate }).catch(() => {}); return; }
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const wv = speechSynthesis.getVoices().find(x => x.voiceURI === v.id);
  if (wv) { try { u.voice = wv; } catch { /* ignore */ } u.lang = wv.lang; }
  u.rate = rate;
  speechSynthesis.speak(u);
}

// ── Web engine ──
let webToken = 0;
async function webSpeak(text: string, from: number, voiceId: string | undefined, rate: number) {
  const my = ++webToken;
  const wv = speechSynthesis.getVoices().find(x => x.voiceURI === voiceId) || speechSynthesis.getVoices().find(x => /^en/i.test(x.lang));
  // sentences with their offsets
  const parts: [number, string][] = [];
  let pos = from;
  for (const s of sentences(text.slice(from))) {
    const at = text.indexOf(s.slice(0, 20), pos);
    const start = at >= 0 ? at : pos;
    parts.push([start, s]);
    pos = start + s.length;
  }
  onState(true, false);
  for (const [start, s] of parts) {
    if (my !== webToken) return;
    onProgress(start, start, start);
    await new Promise<void>(resolve => {
      const u = new SpeechSynthesisUtterance(s);
      if (wv) { try { u.voice = wv; } catch { /* not a real voice object */ } u.lang = wv.lang; }
      u.rate = rate;
      u.onboundary = e => { if (e.name === 'word' && my === webToken) onProgress(start, start + e.charIndex, start + e.charIndex + (e.charLength || 1)); };
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }
  if (my === webToken) onState(false, true);
}

export function readFrom(o: { text: string; from: number; title: string; voice?: RVoice | null; rate: number }) {
  if (isNative) {
    native('LocalNotifications', 'requestPermissions').catch(() => {}); // Android 13+: allow the player notification
    return native('UltradianReadAloud', 'start', { text: o.text, from: o.from, title: o.title, rate: o.rate, voice: o.voice?.id, lang: o.voice?.lang || 'en-US' });
  }
  if (!('speechSynthesis' in window)) return Promise.reject(new Error('No speech on this device'));
  speechSynthesis.cancel();
  webSpeak(o.text, o.from, o.voice?.id, o.rate);
  return Promise.resolve();
}
export function pauseReading() {
  if (isNative) return native('UltradianReadAloud', 'pause').catch(() => {});
  webToken++; speechSynthesis?.cancel(); onState(false, false);
}
export function stopReading() {
  if (isNative) return native('UltradianReadAloud', 'stop').catch(() => {});
  webToken++; if ('speechSynthesis' in window) speechSynthesis.cancel(); onState(false, false);
}
export const setReadRate = (rate: number) => { if (isNative) native('UltradianReadAloud', 'setRate', { rate }).catch(() => {}); };
export const readState = () => isNative ? native<{ playing: boolean; running: boolean; offset: number; title: string }>('UltradianReadAloud', 'getState').catch(() => null) : Promise.resolve(null);
