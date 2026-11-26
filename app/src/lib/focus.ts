// Focus sessions: a timer tied to a task or habit, with social apps locked while it runs.
// Time is kept as timestamps, so it stays right if the app is closed or the phone sleeps.
import { getState, update, uid } from './store';
import { addDays, today, weekOf } from './dates';
import { play } from './sound';
import { haptic } from './native';
import { party } from './celebrate';
import { syncLock } from './lock';
import { completeHabit, feat } from './actions';
import { proofOf } from './proof';
import type { ActiveFocus, FocusRef, State } from './types';

export const elapsedMs = (a: ActiveFocus, now = Date.now()) => Math.max(0, (a.pausedAt ?? now) - a.start - a.pausedMs);
export const remainingMs = (a: ActiveFocus, now = Date.now()) => Math.max(0, a.planned * 60000 - elapsedMs(a, now));

export function startFocus(o: { planned: number; label: string; icon: string; ref?: FocusRef; lock: boolean }) {
  update(s => {
    s.focus.active = { start: Date.now(), planned: o.planned, label: o.label.trim() || 'Deep work', icon: o.icon, ref: o.ref, pausedMs: 0, lock: o.lock };
    s.focus.lastPlanned = o.planned;
    s.focus.lockApps = o.lock;
  });
  play('focusStart');
  haptic.heavy();
  syncLock();
}

export function pauseFocus() {
  update(s => { if (s.focus.active && !s.focus.active.pausedAt) s.focus.active.pausedAt = Date.now(); });
  play('toggle');
  syncLock();
}

export function resumeFocus() {
  update(s => {
    const a = s.focus.active;
    if (a?.pausedAt) { a.pausedMs += Date.now() - a.pausedAt; delete a.pausedAt; }
  });
  play('toggle');
  syncLock();
}

/** Minutes of focus per day this week, Monday first */
export function weekMinutes(s: State = getState()) {
  const mon = weekOf();
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  return days.map(d => ({ day: d, minutes: s.focus.sessions.filter(x => x.day === d).reduce((n, x) => n + x.minutes, 0) }));
}
/** Sessions given up this week (Monday to today) */
export const weekGiveUps = (s: State = getState()) => (s.focus.giveUps || []).filter(g => g.day >= weekOf()).length;
export const totalMinutes = (s: State = getState()) => s.focus.sessions.reduce((n, x) => n + x.minutes, 0);

export function endFocus(finished: boolean) {
  const s = getState(), a = s.focus.active;
  if (!a) return;
  const minutes = finished ? a.planned : Math.floor(elapsedMs(a) / 60000);
  update(d => {
    if (minutes >= 1) d.focus.sessions.push({ id: uid(), day: today(), start: a.start, minutes, planned: a.planned, label: a.label, icon: a.icon, ref: a.ref, finished });
    delete d.focus.active;
    // keep about a year of sessions
    if (d.focus.sessions.length > 3000) d.focus.sessions = d.focus.sessions.slice(-3000);
  });
  syncLock();
  // Giving up is counted, and you see it
  if (!finished) {
    update(d => { d.focus.giveUps = [...(d.focus.giveUps || []), { day: today(), minutes }].slice(-500); });
    party({ kind: 'gaveup', minutes, planned: a.planned, week: weekGiveUps() });
    return;
  }

  const week = weekMinutes().reduce((n, x) => n + x.minutes, 0);
  // A full session on a habit: tick-habits are ticked off; photo habits still need their photo
  const habit = finished && a.ref?.kind === 'habit' ? getState().habits.find(h => h.id === a.ref!.id) : undefined;
  const photo = habit && proofOf(habit.name).mode === 'photo' && !habit.history.includes(today());
  party({ kind: 'focus', minutes, label: a.label, icon: a.icon, weekMinutes: week, finished, taskId: finished && a.ref?.kind === 'task' ? a.ref.id : undefined, proveHabitId: photo ? habit!.id : undefined });
  if (habit && !photo) setTimeout(() => completeHabit(habit.id, { x: innerWidth / 2, y: innerHeight / 2 }), 300);

  // Milestones
  const all = getState();
  const total = totalMinutes(all);
  if (all.focus.sessions.length === 1) feat('focus-first', 'clock', 'First focus session', 'The first of many. Deep work is a superpower.');
  [1, 5, 10, 25, 50, 100, 250, 500].forEach(h => { if (total >= h * 60) feat(`focus-${h}h`, 'clock', `${h} ${h === 1 ? 'hour' : 'hours'} of deep work`, h >= 50 ? 'That’s serious, focused time. Respect.' : 'Every minute adds up.'); });
  if (finished && a.planned >= 90) feat('monk', 'lotus', 'Monk mode', '90 minutes without a single distraction.');
  if (all.focus.sessions.filter(x => x.day === today() && x.minutes >= 20).length >= 3) feat('triple', 'target', 'Triple focus', 'Three solid sessions in one day.');
}
