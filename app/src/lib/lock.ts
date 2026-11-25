// Habit Lock (Android app only): from 4 PM until every habit of the day is done, the social apps
// below are covered by a lock screen. During a focus session with "Lock social apps" on, they are
// locked until the timer ends. The blocking itself is native (.github/android/HabitLock*.java).
import { native, isNative } from './native';
import { getState } from './store';
import { today } from './dates';
import type { State } from './types';

export const LOCK_FROM = 16 * 60; // 4:00 PM
export const LOCK_APPS = [
  { name: 'Instagram', pkgs: ['com.instagram.android', 'com.instagram.lite'] },
  { name: 'YouTube', pkgs: ['com.google.android.youtube'] },
  { name: 'Facebook', pkgs: ['com.facebook.katana', 'com.facebook.lite'] },
  { name: 'Snapchat', pkgs: ['com.snapchat.android'] },
  { name: 'TikTok', pkgs: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill', 'com.zhiliaoapp.musically.go'] }
];
const PLUGIN = 'UltradianHabitLock';

const minutesNow = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
/** Habits that count today: ones added before today (a habit added today starts counting
 *  tomorrow, so adding one late never breaks the streak or re-locks apps). On the very first
 *  day, when every habit is new, they all count. */
export function requiredHabits(s: State = getState(), day = today()) {
  const old = s.habits.filter(h => h.createdAt < day);
  return old.length ? old : s.habits;
}
export const pendingHabits = (s: State = getState()) => requiredHabits(s).filter(h => !h.history.includes(today()));
const label = (h: { name: string }) => h.name.trim();

/** Habits are holding the apps locked right now */
export function habitLocked(s: State = getState()) {
  return isNative && s.lock.enabled && s.habits.length > 0 && minutesNow() >= LOCK_FROM && pendingHabits(s).length > 0;
}

/** The end of a focus session that locks apps (epoch ms), or 0 */
export function focusLockUntil(s: State = getState()) {
  const a = s.focus.active;
  if (!a || !a.lock) return 0;
  const end = a.start + a.pausedMs + a.planned * 60000;
  // Pausing doesn't unlock apps: keep pushing the end back while paused (re-sent every 30 s)
  return a.pausedAt ? end + (Date.now() - a.pausedAt) + 15 * 60000 : end;
}

let timer = 0;
export function syncLock() {
  if (!isNative) return;
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    const s = getState(), left = pendingHabits(s), a = s.focus.active;
    native(PLUGIN, 'update', {
      enabled: s.lock.enabled,
      lockFrom: LOCK_FROM,
      today: today(),
      habitCount: requiredHabits(s).length,
      done: s.habits.length > 0 && left.length === 0,
      pending: left.map(label),
      allHabits: requiredHabits(s).map(label),
      blocked: LOCK_APPS.flatMap(x => x.pkgs),
      focusUntil: focusLockUntil(s),
      focusLabel: a ? a.label : ''
    }).catch(e => console.warn('Habit Lock: update failed', e));
  }, 250);
}

export type LockStatus = { usageAccess: boolean; overlay: boolean };
export const lockStatus = () => native<LockStatus>(PLUGIN, 'getStatus').catch(() => ({ usageAccess: false, overlay: false }));
export const openUsageAccess = () => native(PLUGIN, 'openUsageAccessSettings');
export const openOverlay = () => native(PLUGIN, 'openOverlaySettings');

/** The lock screen's "Do it now" button opens the app on Today */
export function onOpenHabits(cb: (app?: string) => void) {
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, { addListener?: (e: string, f: (d: { app?: string }) => void) => void }> } }).Capacitor;
  try { cap?.Plugins?.[PLUGIN]?.addListener?.('openHabits', d => cb(d?.app)); } catch { /* older build */ }
}

// Notifications from the removed reminders feature: cancel any still scheduled, once.
export function clearOldReminders() {
  if (!isNative || localStorage.getItem('habitRemindersCleared') === '1') return;
  const ids = Array.from({ length: 441 }, (_, i) => ({ id: 7099 + i }));
  native('LocalNotifications', 'cancel', { notifications: ids })
    .then(() => native('LocalNotifications', 'removeDeliveredNotifications', { notifications: ids }))
    .then(() => localStorage.setItem('habitRemindersCleared', '1'))
    .catch(() => {});
}
