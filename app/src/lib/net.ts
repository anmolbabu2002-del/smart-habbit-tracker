// Downloads for the library. In the Android app requests go through the phone's native HTTP
// (Capacitor's CapacitorHttp): no CORS limits, and sites like Gutenberg that block servers
// accept phones. On the website: a direct fetch, then our Netlify proxy as a fallback.
import { api, isNative, native } from './native';

type Kind = 'text' | 'json' | 'binary';
type NativeResp = { status: number; data: unknown };

function b64ToBuffer(b64: string) {
  const bin = atob(b64), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export async function get(url: string, kind: 'json'): Promise<unknown>;
export async function get(url: string, kind: 'text'): Promise<string>;
export async function get(url: string, kind: 'binary'): Promise<ArrayBuffer>;
export async function get(url: string, kind: Kind): Promise<unknown> {
  if (isNative) {
    const r = await native<NativeResp>('CapacitorHttp', 'get', { url, responseType: kind === 'binary' ? 'arraybuffer' : kind === 'json' ? 'json' : 'text', connectTimeout: 20000, readTimeout: 60000 });
    if (r.status >= 400) throw new Error(`Download failed (${r.status})`);
    if (kind === 'binary') return typeof r.data === 'string' ? b64ToBuffer(r.data) : r.data;
    if (kind === 'json' && typeof r.data === 'string') return JSON.parse(r.data);
    return r.data;
  }
  const read = (res: Response) => (kind === 'binary' ? res.arrayBuffer() : kind === 'json' ? res.json() : res.text());
  try {
    const res = await fetch(url);
    if (res.ok) return await read(res);
  } catch { /* CORS or network: try the proxy */ }
  const res = await fetch(api(`/.netlify/functions/book-proxy?url=${encodeURIComponent(url)}`));
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  return read(res);
}

/** Open a web page in the phone's browser */
export const openExternal = (url: string) => { window.open(url, '_blank', 'noopener'); };
