// Photo proof: CLIP (an image-and-text AI) checks on the phone that a live photo shows the
// habit. The photo is never saved or sent. Same model and storage as before, so phones that
// already downloaded it don't download again.
import { useSyncExternalStore } from 'react';
import { classify, SCENES, type Proof } from './proofDictionary';

const MODEL = 'Xenova/clip-vit-base-patch32';
const LIB_VERSION = '3.8.1';
// Measured on real photos (Stanford 40 actions): 90% of genuine photos pass, 2.6% of cheats
const THRESHOLD = 0.45;
const MODEL_URL = (f: string) => `https://huggingface.co/${MODEL}/resolve/main/${f}`;
const VISION_FILES = ['config.json', 'preprocessor_config.json', 'onnx/vision_model_quantized.onnx'];
const TEXT_FILES = ['tokenizer.json', 'tokenizer_config.json', 'onnx/text_model_quantized.onnx'];
const ENGINE_URL = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${LIB_VERSION}/dist/ort-wasm-simd-threaded.jsep.wasm`;
const MODEL_CACHE = 'transformers-cache';
const ENGINE_CACHE = 'photo-proof-engine';

export const proofOf = (name: string): Proof => classify(name);
export const needsPhoto = (name: string) => proofOf(name).mode === 'photo';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Lib = any;
const st = { lib: null as Lib, vision: null as any, processor: null as any, text: null as any, tokenizer: null as any, fps: null as Record<string, Float32Array> | null, ready: false, loading: null as Promise<void> | null, progress: 0, error: null as unknown };
let snapshot = { ready: false, progress: 0, error: false, loading: false };
const subs = new Set<() => void>();
const emit = () => { snapshot = { ready: st.ready, progress: st.progress, error: !!st.error, loading: !!st.loading }; subs.forEach(f => f()); };
export const useProofEngine = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => snapshot);

async function cacheFile(cacheName: string, url: string, onBytes: (n: number) => void) {
  const cache = await caches.open(cacheName);
  if (await cache.match(url)) return;
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    onBytes(value.length);
  }
  await cache.put(url, new Response(new Blob(chunks), { headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream' } }));
}

/** Download (not load) the engine and model into storage app updates don't clear */
export async function prefetch(withText = false) {
  const files: [string, string, number][] = [[ENGINE_CACHE, ENGINE_URL, 21.6e6], ...VISION_FILES.map((f): [string, string, number] => [MODEL_CACHE, MODEL_URL(f), f.endsWith('.onnx') ? 89.1e6 : 2e3])];
  if (withText) files.push(...TEXT_FILES.map((f): [string, string, number] => [MODEL_CACHE, MODEL_URL(f), f.endsWith('.onnx') ? 64.5e6 : 2.3e6]));
  const total = files.reduce((s, f) => s + f[2], 0);
  let got = 0;
  for (const [cache, url, size] of files) {
    const c = await caches.open(cache);
    if (await c.match(url)) { got += size; continue; }
    await cacheFile(cache, url, n => { got += n; st.progress = Math.min(0.99, got / total); emit(); });
  }
  st.progress = 1; emit();
}

async function engineURL() {
  const c = await caches.open(ENGINE_CACHE);
  let res = await c.match(ENGINE_URL);
  if (!res) { await cacheFile(ENGINE_CACHE, ENGINE_URL, () => {}); res = await c.match(ENGINE_URL); }
  return URL.createObjectURL(await res!.blob());
}

async function fingerprints() {
  if (st.fps) return st.fps;
  const json = await (await fetch(new URL('habit-proof-text.json', location.href).href)).json();
  const fps: Record<string, Float32Array> = {};
  for (const [t, b64] of Object.entries(json.prompts as Record<string, string>)) {
    const bin = atob(b64), buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    fps[t] = new Float32Array(buf.buffer);
  }
  return (st.fps = fps);
}

async function loadLib() {
  if (st.lib) return st.lib;
  const lib = await import(/* @vite-ignore */ new URL('vendor/transformers.min.js', location.href).href);
  lib.env.allowLocalModels = false;
  lib.env.useBrowserCache = true;
  lib.env.backends.onnx.wasm.wasmPaths = { mjs: new URL('vendor/ort-wasm-simd-threaded.jsep.mjs', location.href).href, wasm: await engineURL() };
  lib.env.backends.onnx.wasm.numThreads = 1;
  return (st.lib = lib);
}

export function loadVision(): Promise<void> {
  if (st.ready) return Promise.resolve();
  if (st.loading) return st.loading;
  st.error = null;
  st.loading = (async () => {
    try {
      navigator.storage?.persist?.().catch(() => {});
      await prefetch(false);
      const lib = await loadLib();
      st.processor = await lib.AutoProcessor.from_pretrained(MODEL);
      st.vision = await lib.CLIPVisionModelWithProjection.from_pretrained(MODEL, { dtype: 'q8' });
      await fingerprints();
      st.ready = true;
    } catch (e) {
      st.error = e;
      console.warn('Photo check failed to load', e);
    } finally {
      st.loading = null;
      emit();
    }
  })();
  emit();
  return st.loading;
}

/** Free the memory once the camera closes */
export function unload() {
  try { st.vision?.dispose?.(); } catch { /* ignore */ }
  try { st.text?.dispose?.(); } catch { /* ignore */ }
  st.vision = st.text = null;
  st.ready = false;
  emit();
}

const normalize = (v: ArrayLike<number>) => { let s = 0; for (let i = 0; i < v.length; i++) s += v[i] * v[i]; s = Math.sqrt(s) || 1; return Float32Array.from(v as Float32Array, x => x / s); };
const dot = (a: Float32Array, b: Float32Array) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

export async function textFingerprint(prompt: string) {
  const fps = await fingerprints();
  if (fps[prompt]) return fps[prompt];
  const saved = JSON.parse(localStorage.getItem('photoProofText') || '{}');
  if (saved[prompt]) return (fps[prompt] = new Float32Array(saved[prompt]));
  const lib = await loadLib();
  await prefetch(true);
  st.tokenizer = st.tokenizer || await lib.AutoTokenizer.from_pretrained(MODEL);
  st.text = st.text || await lib.CLIPTextModelWithProjection.from_pretrained(MODEL, { dtype: 'q8' });
  const { text_embeds } = await st.text(st.tokenizer([prompt], { padding: 'max_length', truncation: true }));
  const v = normalize(text_embeds.data);
  saved[prompt] = Array.from(v, x => Math.round(x * 1e5) / 1e5);
  localStorage.setItem('photoProofText', JSON.stringify(saved));
  return (fps[prompt] = v);
}

export type CheckResult = { pass: boolean; confidence: number; looksLike: string | null };

export async function check(canvas: HTMLCanvasElement, habitName: string): Promise<CheckResult> {
  await loadVision();
  if (!st.ready) throw st.error || new Error('Photo check unavailable');
  const proof = proofOf(habitName);
  const image = await st.lib.RawImage.fromCanvas(canvas);
  const { image_embeds } = await st.vision(await st.processor(image));
  const img = normalize(image_embeds.data);
  // The habit scores its best of several descriptions; everyday scenes and cheats compete with it
  const own: number[] = [];
  for (const p of proof.prompts || [proof.show!]) own.push(100 * dot(img, await textFingerprint('a photo of ' + p)));
  const scenes = SCENES.filter(s => !(proof.exclude || []).includes(s));
  const logits: number[] = [Math.max(...own)];
  for (const s of scenes) logits.push(100 * dot(img, await textFingerprint('a photo of ' + s)));
  const max = Math.max(...logits), ex = logits.map(l => Math.exp(l - max)), sum = ex.reduce((a, b) => a + b, 0);
  const probs = ex.map(x => x / sum);
  const best = probs.indexOf(Math.max(...probs));
  return { pass: probs[0] >= THRESHOLD, confidence: probs[0], looksLike: best === 0 ? null : scenes[best - 1] };
}

/** Soon after launch: download the photo check in the background if any habit needs it */
export function backgroundDownload(names: string[]) {
  const photo = names.filter(needsPhoto); // only photo habits need the AI
  if (!photo.length || !('caches' in window)) return;
  const withText = photo.some(n => !proofOf(n).known);
  prefetch(withText).then(() => localStorage.setItem('photoProofDownloaded', '1')).catch(e => console.warn('Photo check download paused', e));
}
