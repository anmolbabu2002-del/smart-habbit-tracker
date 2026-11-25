// Read aloud: the phone's own voices in the Android app (text-to-speech plugin, since the
// WebView has no speechSynthesis), the browser's voices on the website. Works offline.
import { isNative, native } from './native';

export type Voice = { id: string; name: string; lang: string };
const KEEP = /^(en-(US|GB|IN|AU)|hi|ne|bn|ta|te|mr|gu|kn|ml|ur|pa|es|fr|de|it|pt|ru|ja|ko|zh|ar|tr)/i;
const LANG_NAME: Record<string, string> = { en: 'English', hi: 'Hindi', ne: 'Nepali', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam', ur: 'Urdu', pa: 'Punjabi', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic', tr: 'Turkish' };
const REGION: Record<string, string> = { US: 'US', GB: 'UK', IN: 'India', AU: 'Australia' };
const label = (lang: string, n: number) => { const [l, r] = lang.replace('_', '-').split('-'); return `${LANG_NAME[l.toLowerCase()] || l}${r && REGION[r.toUpperCase()] ? ` (${REGION[r.toUpperCase()]})` : ''} · Voice ${n}`; };

let cache: Voice[] | null = null;
let webVoices: SpeechSynthesisVoice[] = [];

export async function voices(): Promise<Voice[]> {
  if (cache) return cache;
  const per: Record<string, number> = {};
  if (isNative) {
    const r = await native<{ voices: { lang?: string; name?: string; voiceURI?: string }[] }>('TextToSpeech', 'getSupportedVoices').catch(() => ({ voices: [] }));
    const seen = new Set<string>();
    cache = r.voices.map((v, i) => ({ v, i })).filter(({ v }) => v.lang && KEEP.test(v.lang.replace('_', '-')))
      .filter(({ v, i }) => { const k = String(v.voiceURI || v.name || i).replace(/-(local|network)$/i, ''); if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => a.v.lang!.localeCompare(b.v.lang!))
      .map(({ v, i }) => { const lang = v.lang!.replace('_', '-'); per[lang] = (per[lang] || 0) + 1; return { id: String(i), name: label(lang, per[lang]), lang }; });
    return cache;
  }
  if (!('speechSynthesis' in window)) return (cache = []);
  webVoices = speechSynthesis.getVoices();
  if (!webVoices.length) await new Promise(r => { speechSynthesis.addEventListener('voiceschanged', r, { once: true }); setTimeout(r, 1500); });
  webVoices = speechSynthesis.getVoices();
  cache = webVoices.filter(v => KEEP.test(v.lang)).map(v => ({ id: v.voiceURI, name: `${v.name}`, lang: v.lang }));
  return cache;
}

let token = 0;
/** Speak one piece of text; resolves when it ends (or is stopped) */
export async function speak(text: string, o: { voice?: Voice | null; rate?: number } = {}): Promise<boolean> {
  const my = ++token;
  if (isNative) {
    try {
      await native('TextToSpeech', 'speak', { text, lang: o.voice?.lang || 'en-US', rate: o.rate || 1, pitch: 1, volume: 1, ...(o.voice ? { voice: Number(o.voice.id) } : {}) });
      return my === token;
    } catch { return false; }
  }
  if (!('speechSynthesis' in window)) return false;
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    const v = webVoices.find(x => x.voiceURI === o.voice?.id);
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = o.rate || 1;
    u.onend = () => resolve(my === token);
    u.onerror = () => resolve(false);
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  token++;
  if (isNative) native('TextToSpeech', 'stop').catch(() => {});
  else if ('speechSynthesis' in window) speechSynthesis.cancel();
}

/** Split text into sentence-sized pieces the engines handle well */
export function sentences(text: string) {
  const parts = text.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]+["’”')\]]*\s*|[^.!?…]+$/g) || [];
  const out: string[] = [];
  parts.forEach(p => {
    const s = p.trim();
    if (!s) return;
    if (out.length && out[out.length - 1].length < 40) out[out.length - 1] += ' ' + s; else out.push(s);
  });
  return out;
}
