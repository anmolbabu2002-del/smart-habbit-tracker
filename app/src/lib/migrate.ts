// First start of the new app: bring over everything from the old one (same phone storage).
// Habits keep their full history, so streaks carry over. Journal, books and AI chat keep
// their old storage keys and are read directly by those screens.
import { fresh, getState, setState, uid } from './store';
import { addDays, fromAnyDate, today, weekOf } from './dates';
import { iconFor } from '../components/HabitIcon';
import { COLORS, type Habit, type State, type Task } from './types';

const json = <T,>(key: string, fallback: T): T => {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) as T : fallback; } catch { return fallback; }
};

type OldHabit = { text?: string; completedToday?: boolean; lastCompletedDate?: string; history?: string[]; createdDate?: string };
type OldTask = { text?: string; completed?: boolean };

/** Days on which every habit that existed then was done */
export function computePerfectDays(habits: Habit[], until = today()): string[] {
  const candidates = new Set<string>();
  habits.forEach(h => h.history.forEach(d => { if (d <= until) candidates.add(d); }));
  const out: string[] = [];
  [...candidates].sort().forEach(day => {
    const older = habits.filter(h => h.createdAt < day);
    const required = older.length ? older : habits.filter(h => h.createdAt <= day);
    if (required.length && required.every(h => h.history.includes(day))) out.push(day);
  });
  return out;
}

export function longestRun(days: string[]) {
  const set = new Set(days);
  let best = 0;
  days.forEach(d => {
    if (set.has(addDays(d, -1))) return; // not the start of a run
    let n = 0, x = d;
    while (set.has(x)) { n++; x = addDays(x, 1); }
    best = Math.max(best, n);
  });
  return best;
}

export function migrateFromV1() {
  if (getState().migrated) return;
  const s: State = { ...fresh(), ...getState() };
  const day = today();

  const old = json<OldHabit[]>('userHabits', []).filter(h => h && h.text);
  if (old.length && !s.habits.length) {
    s.habits = old.map((h, i) => {
      const history = new Set((h.history || []).map(fromAnyDate).filter((d): d is string => !!d));
      const last = fromAnyDate(h.lastCompletedDate);
      if (h.completedToday && last === day) history.add(day);
      const sorted = [...history].sort();
      const created = fromAnyDate(h.createdDate) || sorted[0] || day;
      const name = String(h.text).trim();
      return { id: uid(), name, icon: iconFor(name), color: COLORS[i % COLORS.length], createdAt: created < (sorted[0] || created) ? created : (sorted[0] || created), history: sorted };
    });
    s.perfectDays = computePerfectDays(s.habits);
    s.bestStreak = longestRun(s.perfectDays);
    if (s.perfectDays.includes(day)) s.celebratedDay = day; // don't throw a party on first open
  }

  // Free passes used with photo proof
  const proof = json<{ passes?: Record<string, { habit: string; date: string }>; unverified?: Record<string, string[]> }>('photoProof', {});
  const idOf = (name: string) => s.habits.find(h => h.name === String(name).trim())?.id;
  Object.values(proof.passes || {}).forEach(p => {
    const d = fromAnyDate(p.date), id = idOf(p.habit);
    if (d && id) s.passes[weekOf(d)] = { habitId: id, day: d };
  });
  Object.entries(proof.unverified || {}).forEach(([date, names]) => {
    const d = fromAnyDate(date);
    if (!d) return;
    names.forEach(n => { const h = s.habits.find(x => x.id === idOf(n)); if (h) h.passDays = [...(h.passDays || []), d]; });
  });

  // Tasks (the old list had no due dates: they become "Anytime")
  const state = json<{ tasks?: OldTask[] }>('habitAppState', {});
  if (!s.tasks.length && Array.isArray(state.tasks)) {
    s.tasks = state.tasks.filter(t => t && t.text && String(t.text).trim()).map((t, i): Task => ({
      id: uid(), title: String(t.text).trim(), createdAt: Date.now() - i, doneAt: t.completed ? day : undefined
    }));
  }

  s.name = s.name || (localStorage.getItem('userName') || '').trim();
  const theme = localStorage.getItem('appTheme') || '';
  if (/dark|midnight|night|amoled|black/i.test(theme)) s.theme = 'dark';
  s.lock = { enabled: !!json<{ enabled?: boolean }>('habitLock', {}).enabled };
  s.migrated = true;
  setState(s);
}
