// Everything that changes data goes through here, so the sounds, haptics, celebrations,
// streak and Habit Lock always stay in step.
import { getState, update, uid } from './store';
import { today, weekOf, dueInfo, addDays } from './dates';
import { nextDue } from './parseTask';
import { proofOf } from './proof';
import { play } from './sound';
import { haptic } from './native';
import { burst, party, praise, randomPraise, toast } from './celebrate';
import { freeDayOf, habitStreak as habitStreakFree, streakOf, stageIndex } from './streak';
import { syncLock, habitLocked, requiredHabits } from './lock';
import { identityOf } from './identity';
import { DAILY, isShown, normalise, sameSchedule, upcomingSchedule } from './schedule';
import type { Color, Habit, Schedule, State, Task } from './types';

type At = { x: number; y: number };
const BRAND = ['#ff8c42', '#ffc800', '#12c79b', '#1cb0f6', '#a560e8', '#ff4b4b'];

// ── Habits ──
export const doneToday = (h: Habit, day = today()) => h.history.includes(day);
/** Days in a row this one habit was done (ending today, or yesterday if not done yet) */
export const habitStreak = (h: Habit, day = today()) => habitStreakFree(getState(), h, day).n;
/** This week's free pass: not used on a photo, and no missed day used it up */
export const passLeft = (s: State = getState()) => !s.passes[weekOf()] && !freeDayOf(s, weekOf());

export function completeHabit(id: string, at?: At, viaPass = false) {
  const day = today();
  const h = getState().habits.find(x => x.id === id);
  if (!h || doneToday(h) || !isShown(h, day)) return; // not on today's list (e.g. a Mon/Wed/Fri habit on Tuesday)
  update(s => {
    const x = s.habits.find(y => y.id === id)!;
    x.history.push(day);
    x.doneAt = Date.now();
    if (viaPass) {
      x.passDays = [...(x.passDays || []), day];
      s.passes[weekOf()] = { habitId: id, day };
    }
  });
  play(viaPass ? 'pass' : 'habit');
  haptic.success();
  if (at) {
    burst({ ...at, count: 34, power: 1.1 });
    praise(at.x, at.y - 30, randomPraise());
  }
  if (!viaPass) toast(`+1 vote for being ${identityOf(h)}`, 'good'); // every tick is a vote for who you're becoming
  afterHabitsChanged();
}

/** A tick can be undone only right after it (a mistaken tap), never later in the day */
export const UNDO_MS = 15000;
export function undoHabit(id: string) {
  const day = today();
  const h0 = getState().habits.find(h => h.id === id);
  if (!h0?.doneAt || Date.now() - h0.doneAt > UNDO_MS) {
    play('locked');
    haptic.warning();
    toast('Done is done. Habits can only be undone right after ticking them.', 'lock');
    return;
  }
  update(s => {
    const x = s.habits.find(y => y.id === id);
    if (!x) return;
    x.history = x.history.filter(d => d !== day);
    if (x.passDays?.includes(day)) {
      x.passDays = x.passDays.filter(d => d !== day);
      if (s.passes[weekOf()]?.habitId === id) delete s.passes[weekOf()]; // give the pass back
    }
  });
  play('pop');
  haptic.tap();
  afterHabitsChanged(true);
}

/** Recompute today's "all done" state and throw the party once a day.
 *  undo: a habit was un-ticked, so an earned day can be lost. Otherwise (e.g. a habit was
 *  added after everything was done) an earned day stays earned. */
export function afterHabitsChanged(undo = false) {
  const s = getState(), day = today();
  const req = requiredHabits(s, day);
  const perfect = req.length > 0 && req.every(h => doneToday(h, day));
  const had = s.perfectDays.includes(day);
  if (perfect && !had) {
    const prev = streakOf(s);
    update(d => { d.perfectDays.push(day); });
    const streak = streakOf(getState());
    const best = streak > s.bestStreak;
    const first = getState().celebratedDay !== day;
    update(d => { d.bestStreak = Math.max(d.bestStreak, streak); d.celebratedDay = day; });
    if (first) {
      const evolvedTo = stageIndex(streak) > stageIndex(prev) ? stageIndex(streak) : undefined;
      setTimeout(() => {
        party({ kind: 'allDone', streak, prev, best: best && streak > 1, evolvedTo });
        const h = new Date().getHours();
        if (h >= 4 && h < 12) feat('early-bird', 'sun', 'Early bird', 'Every habit done before noon.'); // queued after the party
      }, 650);
    }
  } else if (!perfect && had && undo) {
    update(d => { d.perfectDays = d.perfectDays.filter(x => x !== day); });
  }
  syncLock();
}

export function saveHabit(input: { id?: string; name: string; icon: string; color: Color; schedule?: Schedule }) {
  const name = input.name.trim();
  if (!name) return;
  if (input.id) {
    const old = getState().habits.find(h => h.id === input.id);
    if (old && old.name !== name) {
      if (habitLocked()) { lockedToast('Renaming habits'); return; }
      // No renaming a finished habit into another one, or a photo habit into an easy tick
      if (doneToday(old)) { play('locked'); haptic.warning(); toast('It’s done for today. You can rename it tomorrow.', 'lock'); return; }
      if (proofOf(old.name).mode === 'photo' && proofOf(name).mode !== 'photo') {
        play('locked'); haptic.warning(); toast('A rename can’t turn a photo habit into a tick. Delete it and add a new one instead.', 'lock'); return;
      }
    }
    // a new schedule starts tomorrow, so it can't be used to dodge today
    const next = input.schedule ? normalise(input.schedule) : null;
    if (old && next && !sameSchedule(next, upcomingSchedule(old)) && habitLocked()) { lockedToast('Changing a habit’s days'); return; }
    update(s => {
      const h = s.habits.find(x => x.id === input.id);
      if (!h) return;
      Object.assign(h, { name, icon: input.icon, color: input.color });
      if (next && !sameSchedule(next, upcomingSchedule(h))) {
        const from = h.createdAt === today() ? today() : addDays(today(), 1); // added today: nothing to dodge yet
        h.schedules = [...(h.schedules || []).filter(e => e.from < from), { from, s: next }];
      }
    });
    play('pop');
  } else {
    const sch = input.schedule ? normalise(input.schedule) : DAILY;
    update(s => { s.habits.push({ id: uid(), name, icon: input.icon, color: input.color, createdAt: today(), history: [], ...(sch.kind === 'daily' ? {} : { schedules: [{ from: today(), s: sch }] }) }); s.hadHabits = true; });
    play('add');
    haptic.medium();
  }
  afterHabitsChanged();
}

/** The habit's identity in the user's own words ('' = back to the one from its icon) */
export function setIdentity(id: string, text: string) {
  update(s => { const h = s.habits.find(x => x.id === id); if (h) h.identity = text.trim().replace(/\s+/g, ' ').slice(0, 60) || undefined; });
}

export function deleteHabit(id: string) {
  if (habitLocked()) { lockedToast('Deleting habits'); return false; }
  update(s => { s.habits = s.habits.filter(h => h.id !== id); });
  play('whoosh');
  afterHabitsChanged();
  return true;
}

/**
 * Delete from the long-press menu or the editor. A habit with done days asks first (in
 * DeleteHabitConfirm), so a long streak is never lost by a slip of the finger.
 * Returns false only when deleting is blocked.
 */
export function requestDeleteHabit(id: string) {
  if (habitLocked()) { lockedToast('Deleting habits'); return false; }
  const h = getState().habits.find(x => x.id === id);
  if (h && h.history.length) window.dispatchEvent(new CustomEvent('ask-delete-habit', { detail: id }));
  else deleteHabit(id);
  return true;
}

export function lockedToast(what: string) {
  play('locked');
  haptic.warning();
  toast(`${what} is off until today’s habits are done`, 'lock');
}

// ── Tasks ──
export function addTask(t: { title: string; note?: string; due?: string; repeat?: Task['repeat'] }) {
  const title = t.title.trim();
  if (!title) return;
  update(s => { s.tasks.unshift({ id: uid(), title, note: t.note?.trim() || undefined, due: t.due || (t.repeat ? today() : undefined), repeat: t.repeat, createdAt: Date.now() }); });
  play('add');
  haptic.tap();
}

export function editTask(id: string, patch: Partial<Pick<Task, 'title' | 'note' | 'due' | 'repeat'>>) {
  update(s => {
    const t = s.tasks.find(x => x.id === id);
    if (!t) return;
    if (patch.title !== undefined) t.title = patch.title.trim() || t.title;
    if ('note' in patch) t.note = patch.note?.trim() || undefined;
    if ('due' in patch) t.due = patch.due || undefined;
    if ('repeat' in patch) { t.repeat = patch.repeat || undefined; if (t.repeat && !t.due) t.due = today(); }
  });
}

export function toggleTask(id: string, at?: At) {
  const t = getState().tasks.find(x => x.id === id);
  if (!t) return;
  if (t.doneAt) {
    update(s => { const x = s.tasks.find(y => y.id === id)!; delete x.doneAt; s.tasksDone = Math.max(0, s.tasksDone - 1); });
    play('pop');
    return;
  }
  update(s => {
    const x = s.tasks.find(y => y.id === id)!;
    x.doneAt = today();
    s.tasksDone += 1;
    // A repeating task comes back on its next date
    if (x.repeat && x.due) {
      const nextDate = nextDue(x.due, x.repeat);
      s.tasks.unshift({ id: uid(), title: x.title, note: x.note, due: nextDate, repeat: x.repeat, createdAt: Date.now() });
      delete x.repeat;
    }
  });
  play('check');
  haptic.tap();
  if (at) burst({ ...at, count: 16, power: 0.7, colors: ['#12c79b', '#ffc800', '#1cb0f6'] });
  // Cleared everything due today?
  const s = getState();
  const dueNow = s.tasks.filter(x => { const g = dueInfo(x.due).group; return g === 'today' || g === 'overdue'; });
  if (t.due && dueNow.length > 1 && dueNow.every(x => x.doneAt)) {
    setTimeout(() => { play('combo'); haptic.success(); toast('Everything due today is done!', 'good'); }, 350);
  }
  const n = s.tasksDone;
  if ([10, 25, 50, 100, 250, 500, 1000].includes(n)) feat(`tasks-${n}`, 'checklist', `${n} tasks done`, n >= 100 ? 'You get things done. Seriously.' : 'Tick, tick, tick. Keep it rolling!');
}

export function deleteTask(id: string) {
  update(s => { s.tasks = s.tasks.filter(t => t.id !== id); });
  play('whoosh');
}

/** Overdue tasks: move them all to today in one tap */
export function moveOverdueToToday() {
  const t0 = today();
  const n = getState().tasks.filter(t => !t.doneAt && t.due && t.due < t0).length;
  update(s => { s.tasks.forEach(t => { if (!t.doneAt && t.due && t.due < t0) t.due = t0; }); });
  play('whoosh');
  toast(`Moved ${n} ${n === 1 ? 'task' : 'tasks'} to today`, 'good');
}

export function clearDone() {
  update(s => { s.tasks = s.tasks.filter(t => !t.doneAt); });
  play('whoosh');
}

// ── Milestones ("feats"): each celebrated once ──
export function feat(id: string, icon: string, title: string, text: string) {
  if (getState().feats.includes(id)) return;
  update(s => { s.feats.push(id); });
  setTimeout(() => party({ kind: 'feat', icon, title, text }), 400);
}

export const confettiColors = BRAND;
