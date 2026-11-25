// Celebrations: big full-screen moments go into a queue (one at a time); small bursts of
// confetti and praise fire instantly where your finger is.
import { useSyncExternalStore } from 'react';

export type Party =
  | { kind: 'allDone'; streak: number; prev: number; best: boolean; evolvedTo?: number }
  | { kind: 'focus'; minutes: number; label: string; icon: string; weekMinutes: number; finished: boolean; taskId?: string }
  | { kind: 'feat'; icon: string; title: string; text: string; kicker?: string }
  | { kind: 'evolve'; from: number; to: number };

let queue: Party[] = [];
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());

export function party(p: Party) { queue = [...queue, p]; emit(); }
export function nextParty() { queue = queue.slice(1); emit(); }
export const useParty = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => queue[0]);

// ── Small effects ──
export type BurstOpts = { x: number; y: number; count?: number; colors?: string[]; power?: number; shapes?: ('rect' | 'circle' | 'star')[] };
type Fx = { burst: (o: BurstOpts) => void; rain: (ms?: number) => void; praise: (x: number, y: number, text: string, color?: string) => void };
let fx: Fx | null = null;
export const registerFx = (f: Fx | null) => { fx = f; };
export const burst = (o: BurstOpts) => fx?.burst(o);
export const rain = (ms?: number) => fx?.rain(ms);
export const praise = (x: number, y: number, text: string, color?: string) => fx?.praise(x, y, text, color);

/** Centre of an element (for bursts from a button) */
export function centerOf(el: Element | null | undefined) {
  if (!el) return { x: innerWidth / 2, y: innerHeight / 2 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

const PRAISE = ['Nice!', 'Boom!', 'Crushed it!', 'Yes!', 'Awesome!', 'On fire!', 'Let’s go!', 'Smashed it!', 'Legend!', 'Unstoppable!'];
export const randomPraise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];

// ── Toasts ──
export type Toast = { id: number; text: string; tone?: 'default' | 'lock' | 'good' };
let toasts: Toast[] = [];
const tsubs = new Set<() => void>();
export function toast(text: string, tone: Toast['tone'] = 'default') {
  const t = { id: Date.now() + Math.random(), text, tone };
  toasts = [...toasts.slice(-2), t];
  tsubs.forEach(f => f());
  setTimeout(() => { toasts = toasts.filter(x => x.id !== t.id); tsubs.forEach(f => f()); }, 2800);
}
export const useToasts = () => useSyncExternalStore(f => { tsubs.add(f); return () => tsubs.delete(f); }, () => toasts);
