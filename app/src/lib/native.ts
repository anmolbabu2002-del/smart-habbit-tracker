// Talking to the Android app (Capacitor) without bundling its JS: the native shell injects
// window.Capacitor, and every plugin call goes through it. On the website these calls just fail
// quietly and the features that need them stay hidden.

type Cap = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, Record<string, (o?: unknown) => Promise<unknown>>>;
  nativePromise?: (plugin: string, method: string, o?: unknown) => Promise<unknown>;
};
const cap = () => (window as unknown as { Capacitor?: Cap }).Capacitor;

export const isNative = (() => {
  try {
    const c = cap();
    if (c?.isNativePlatform) return c.isNativePlatform();
    if (c?.getPlatform) return c.getPlatform() !== 'web';
  } catch { /* website */ }
  return false;
})();

export function native<T = unknown>(plugin: string, method: string, options: object = {}): Promise<T> {
  const c = cap();
  if (!isNative || !c) return Promise.reject(new Error('Not running in the Android app'));
  const p = c.Plugins?.[plugin];
  if (p && typeof p[method] === 'function') return p[method](options) as Promise<T>;
  if (c.nativePromise) return c.nativePromise(plugin, method, options) as Promise<T>;
  return Promise.reject(new Error(plugin + ' is not available'));
}

// The AI chat, voices and book proxy live on the website, where the API keys stay hidden.
export const REMOTE = 'https://ultradiann.netlify.app';
export const api = (path: string) => (isNative ? REMOTE : '') + path;

// ── Haptics ──
type Impact = 'LIGHT' | 'MEDIUM' | 'HEAVY';
export const haptic = {
  tap: () => impact('LIGHT'),
  medium: () => impact('MEDIUM'),
  heavy: () => impact('HEAVY'),
  success: () => notify('SUCCESS'),
  warning: () => notify('WARNING'),
  error: () => notify('ERROR'),
  // a rolling buzz for big celebrations
  party: () => { notify('SUCCESS'); [180, 330, 470].forEach((ms, i) => setTimeout(() => impact(i === 2 ? 'HEAVY' : 'MEDIUM'), ms)); }
};
function impact(style: Impact) {
  if (isNative) native('Haptics', 'impact', { style }).catch(() => {});
  else navigator.vibrate?.(style === 'LIGHT' ? 8 : style === 'MEDIUM' ? 16 : 28);
}
function notify(type: 'SUCCESS' | 'WARNING' | 'ERROR') {
  if (isNative) native('Haptics', 'notification', { type }).catch(() => {});
  else navigator.vibrate?.(type === 'SUCCESS' ? [12, 60, 24] : [30, 40, 30]);
}

/** Big media files (meditation sounds) stream from the website instead of bloating the app */
export const media = (file: string) => (isNative ? `${REMOTE}/media/${file}` : `media/${file}`);

/** Listen to a native plugin event (Plugins proxy, or the bridge's callback API as a fallback) */
export function listenNative<T = unknown>(plugin: string, eventName: string, cb: (data: T) => void) {
  if (!isNative) return;
  const c = cap() as Cap & { nativeCallback?: (p: string, m: string, o: unknown, cb: (d: T) => void) => void };
  try {
    const p = c?.Plugins?.[plugin] as unknown as { addListener?: (e: string, f: (d: T) => void) => void } | undefined;
    if (p && typeof p.addListener === 'function') p.addListener(eventName, cb);
    else c?.nativeCallback?.(plugin, 'addListener', { eventName }, cb);
  } catch { /* plugin missing in an older build */ }
}
