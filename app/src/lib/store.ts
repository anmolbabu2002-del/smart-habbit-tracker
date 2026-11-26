// The app's whole state in one object: saved to localStorage on every change (fast, synchronous)
// and mirrored to IndexedDB, which Android doesn't clear with the WebView cache. If localStorage
// is ever wiped, the mirror brings everything back on the next start.
import { useSyncExternalStore } from 'react';
import type { State } from './types';

const KEY = 'ultradian.v2';

export const fresh = (): State => ({
  v: 2, name: '', theme: 'light', sound: true,
  habits: [], tasks: [], perfectDays: [], bestStreak: 0, celebratedDay: '', passes: {},
  focus: { sessions: [], lastPlanned: 50, lockApps: true },
  lock: { enabled: true }, feats: [], tasksDone: 0, migrated: false, lockDefaulted: true
});

function read(): State | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...fresh(), ...JSON.parse(raw) } : null;
  } catch { return null; }
}

let state: State = read() || fresh();
const subs = new Set<() => void>();

export const getState = () => state;
export const subscribe = (fn: () => void) => { subs.add(fn); return () => subs.delete(fn); };
export const useApp = () => useSyncExternalStore(subscribe, getState);

export function setState(next: State) {
  state = next;
  const json = JSON.stringify(state);
  try { localStorage.setItem(KEY, json); } catch (e) { console.warn('Save failed', e); }
  mirror(KEY, json);
  subs.forEach(fn => fn());
}

/** Change the state through a draft copy */
export function update(fn: (draft: State) => void) {
  const draft = structuredClone(state);
  fn(draft);
  setState(draft);
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ── IndexedDB mirror ──
let dbp: Promise<IDBDatabase> | null = null;
function db() {
  if (!dbp) dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open('ultradian-v2', 2);
    req.onupgradeneeded = () => {
      const names = req.result.objectStoreNames;
      if (!names.contains('kv')) req.result.createObjectStore('kv');
      if (!names.contains('blobs')) req.result.createObjectStore('blobs'); // book files, chats
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}
export async function mirror(key: string, value: string | null) {
  try {
    const d = await db();
    const tx = d.transaction('kv', 'readwrite');
    if (value === null) tx.objectStore('kv').delete(key); else tx.objectStore('kv').put(value, key);
  } catch { /* private mode etc. */ }
}
export async function fromMirror(key: string): Promise<string | null> {
  try {
    const d = await db();
    return await new Promise((resolve) => {
      const req = d.transaction('kv').objectStore('kv').get(key);
      req.onsuccess = () => resolve(typeof req.result === 'string' ? req.result : null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

/** On start: if localStorage lost our data, restore it from the mirror */
export async function restoreIfWiped(keys: string[]) {
  let restored = false;
  for (const k of keys) {
    if (localStorage.getItem(k) !== null) continue;
    const v = await fromMirror(k);
    if (v !== null) { try { localStorage.setItem(k, v); restored = true; } catch { /* full */ } }
  }
  if (restored) { const s = read(); if (s) setState(s); }
}

/** A separately saved value (journal, chat…) that is too big to rewrite on every change */
export function makeSlice<T>(key: string, initial: T) {
  let value: T = (() => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : initial; } catch { return initial; } })();
  const ls = new Set<() => void>();
  return {
    key,
    get: () => value,
    set(next: T) {
      value = next;
      const json = JSON.stringify(next);
      try { localStorage.setItem(key, json); } catch (e) { console.warn('Save failed', e); }
      mirror(key, json);
      ls.forEach(f => f());
    },
    reload() { try { const r = localStorage.getItem(key); value = r ? JSON.parse(r) as T : initial; } catch { value = initial; } ls.forEach(f => f()); },
    use(): T { return useSyncExternalStore((f) => { ls.add(f); return () => ls.delete(f); }, () => value); }
  };
}

/** Binary or structured values (book files, chat history) in the new app's IndexedDB */
export async function blobGet<T = unknown>(key: string): Promise<T | null> {
  try {
    const d = await db();
    return await new Promise(resolve => {
      const req = d.transaction('blobs').objectStore('blobs').get(key);
      req.onsuccess = () => resolve((req.result ?? null) as T | null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}
export async function blobSet(key: string, value: unknown) {
  const d = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction('blobs', 'readwrite');
    if (value === null) tx.objectStore('blobs').delete(key); else tx.objectStore('blobs').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Read a value the old app saved with localforage (IndexedDB "UltradianApp" / "appData") */
export async function legacyGet<T = unknown>(key: string): Promise<T | null> {
  try {
    const d = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('UltradianApp');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!d.objectStoreNames.contains('appData')) { d.close(); return null; }
    return await new Promise(resolve => {
      const req = d.transaction('appData').objectStore('appData').get(key);
      req.onsuccess = () => { resolve((req.result ?? null) as T | null); d.close(); };
      req.onerror = () => { resolve(null); d.close(); };
    });
  } catch { return null; }
}
