// Everything that changes data goes through here, so the sounds, haptics, celebrations,
// streak and Habit Lock always stay in step.
import { getState, update, uid } from './store';
import { today, weekOf, dueInfo } from './dates';
import { play } from './sound';
import { haptic } from './native';
import { burst, party, praise, randomPraise, toast } from './celebrate';
import { streakOf, stageIndex } from './streak';
import { syncLock, habitLocked } from './lock';
import type { Color, Habit, State, Task } from './types';

type At = { x: number; y: number };
const BRAND = ['#ff8c42', '#ffc800', '#12c79b', '#1cb0f6', '#a560e8', '#ff4b4b'];

// ── Habits ──
export const doneToday = (h: Habit, day = today()) => h.history.includes(day);
export const passLeft = (s: State = getState()) => !s.passes[weekOf()];

export function completeHabit(id: string, at?: At, viaPass = false) {
  const day = today();
  const h = getState().habits.find(x => x.id === id);
  if (!h || doneToday(h)) return;
  update(s => {
    const x = s.habits.find(y => y.id === id)!;
    x.history.push(day);
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
  afterHabitsChanged();
}

export function undoHabit(id: string) {
  const day = today();
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
  afterHabitsChanged();
}

/** Recompute today's "all done" state and throw the party once a day */
export function afterHabitsChanged() {
  const s = getState(), day = today();
  const perfect = s.habits.length > 0 && s.habits.every(h => doneToday(h, day));
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
      setTimeout(() => party({ kind: 'allDone', streak, prev, best: best && streak > 1, evolvedTo }), 650);
      if (new Date().getHours() < 12) feat('early-bird', '🌅', 'Early bird', 'Every habit done before noon.');
    }
  } else if (!perfect && had) {
    update(d => { d.perfectDays = d.perfectDays.filter(x => x !== day); });
  }
  syncLock();
}

export function saveHabit(input: { id?: string; name: string; emoji: string; color: Color }) {
  const name = input.name.trim();
  if (!name) return;
  if (input.id) {
    const old = getState().habits.find(h => h.id === input.id);
    if (old && old.name !== name && habitLocked()) { lockedToast('Renaming habits'); return; }
    update(s => { const h = s.habits.find(x => x.id === input.id); if (h) Object.assign(h, { name, emoji: input.emoji, color: input.color }); });
    play('pop');
  } else {
    update(s => { s.habits.push({ id: uid(), name, emoji: input.emoji, color: input.color, createdAt: today(), history: [] }); });
    play('add');
    haptic.medium();
  }
  afterHabitsChanged();
}

export function deleteHabit(id: string) {
  if (habitLocked()) { lockedToast('Deleting habits'); return false; }
  update(s => { s.habits = s.habits.filter(h => h.id !== id); });
  play('whoosh');
  afterHabitsChanged();
  return true;
}

export function lockedToast(what: string) {
  play('locked');
  haptic.warning();
  toast(`🔒 ${what} is off until today’s habits are done`, 'lock');
}

// ── Tasks ──
export function addTask(t: { title: string; note?: string; due?: string }) {
  const title = t.title.trim();
  if (!title) return;
  update(s => { s.tasks.unshift({ id: uid(), title, note: t.note?.trim() || undefined, due: t.due || undefined, createdAt: Date.now() }); });
  play('add');
  haptic.tap();
}

export function editTask(id: string, patch: Partial<Pick<Task, 'title' | 'note' | 'due'>>) {
  update(s => {
    const t = s.tasks.find(x => x.id === id);
    if (!t) return;
    if (patch.title !== undefined) t.title = patch.title.trim() || t.title;
    if ('note' in patch) t.note = patch.note?.trim() || undefined;
    if ('due' in patch) t.due = patch.due || undefined;
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
  update(s => { const x = s.tasks.find(y => y.id === id)!; x.doneAt = today(); s.tasksDone += 1; });
  play('check');
  haptic.tap();
  if (at) burst({ ...at, count: 16, power: 0.7, colors: ['#12c79b', '#ffc800', '#1cb0f6'] });
  // Cleared everything due today?
  const s = getState();
  const dueNow = s.tasks.filter(x => { const g = dueInfo(x.due).group; return g === 'today' || g === 'overdue'; });
  if (t.due && dueNow.length > 1 && dueNow.every(x => x.doneAt)) {
    setTimeout(() => { play('combo'); haptic.success(); toast('✨ Everything due today is done!', 'good'); }, 350);
  }
  const n = s.tasksDone;
  if ([10, 25, 50, 100, 250, 500, 1000].includes(n)) feat(`tasks-${n}`, '✅', `${n} tasks done`, n >= 100 ? 'You get things done. Seriously.' : 'Tick, tick, tick. Keep it rolling!');
}

export function deleteTask(id: string) {
  update(s => { s.tasks = s.tasks.filter(t => t.id !== id); });
  play('whoosh');
}

export function clearDone() {
  update(s => { s.tasks = s.tasks.filter(t => !t.doneAt); });
  play('whoosh');
}

// ── Milestones ("feats"): each celebrated once ──
export function feat(id: string, emoji: string, title: string, text: string) {
  if (getState().feats.includes(id)) return;
  update(s => { s.feats.push(id); });
  setTimeout(() => party({ kind: 'feat', emoji, title, text }), 400);
}

export const confettiColors = BRAND;
