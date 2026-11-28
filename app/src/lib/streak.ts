// The streak: days in a row on which every habit was done. It's shown as "Blip", a little fire
// spirit that evolves into a new form at each milestone, and falls back to an ember if the
// streak breaks.
import { addDays, today, weekOf } from './dates';
import type { Habit, State } from './types';
import { habitStreakOf, isRestDay } from './schedule';

export type StageId = 'ember' | 'spark' | 'flame' | 'blaze' | 'wildfire' | 'azure' | 'phoenix' | 'solar' | 'nova' | 'eternal';

export const STAGES: { id: StageId; min: number; name: string; blurb: string }[] = [
  { id: 'ember', min: 0, name: 'Ember', blurb: 'A sleepy little coal. Finish everything due today to wake it up.' },
  { id: 'spark', min: 1, name: 'Spark', blurb: 'It woke up! Keep feeding it every day.' },
  { id: 'flame', min: 3, name: 'Flame', blurb: 'Three days strong. It’s starting to dance.' },
  { id: 'blaze', min: 7, name: 'Blaze', blurb: 'A full week! It grew two new flames.' },
  { id: 'wildfire', min: 14, name: 'Wildfire', blurb: 'Two weeks. Nothing can stop it now.' },
  { id: 'azure', min: 30, name: 'Azure', blurb: 'A whole month. It burns so hot it turned blue.' },
  { id: 'phoenix', min: 60, name: 'Phoenix', blurb: 'Sixty days. It grew wings.' },
  { id: 'solar', min: 100, name: 'Solar', blurb: '100 days. It shines like a small sun.' },
  { id: 'nova', min: 200, name: 'Supernova', blurb: '200 days of showing up. Blinding.' },
  { id: 'eternal', min: 365, name: 'Eternal', blurb: 'A full year. A galaxy of habits.' }
];

export function stageIndex(days: number) {
  let i = 0;
  STAGES.forEach((s, k) => { if (days >= s.min) i = k; });
  return i;
}
export const stageFor = (days: number) => STAGES[stageIndex(days)];
export const nextStage = (days: number) => STAGES[stageIndex(days) + 1];

/**
 * Perfect days in a row ending today (if today is done) or yesterday. Rest days (nothing was
 * due, e.g. a Mon/Wed/Fri habit on a Tuesday) are passed over: they don't break it, and add to it
 * only if a habit was done anyway (so a times-a-week habit grows the streak on the days it's done).
 */
export function streakOf(s: State, now = today()) {
  const days = new Set(s.perfectDays), free = freeDays(s, now);
  let d = days.has(now) || isRestDay(s.habits, now) ? now : addDays(now, -1);
  let n = 0;
  for (let i = 0; i < 4000; i++, d = addDays(d, -1)) {
    if (days.has(d)) n++;
    else if (isRestDay(s.habits, d)) { if (didAny(s, d)) n++; } // nothing was due, but a habit was done anyway (e.g. a times-a-week one)
    else if (!free(d)) break;
  }
  return n;
}

/**
 * One free day a week (Mon–Sun): the first day that week that something due was missed is
 * forgiven, for the streak and for each habit's own streak. It's the same pass that can skip a
 * photo, so if it was used for a photo that week, no missed day is forgiven.
 */
export function freeDayOf(s: State, week: string, now = today()): string | null {
  if (s.passes[week]) return null;
  const done = new Set(s.perfectDays);
  for (let i = 0; i < 7; i++) {
    const d = addDays(week, i);
    if (d >= now) break; // today isn't missed yet
    if (!s.habits.some(h => h.createdAt <= d) || done.has(d) || isRestDay(s.habits, d)) continue;
    return d;
  }
  return null;
}

/** Is this day a week's free day? (cached per week) */
export function freeDays(s: State, now = today()) {
  const byWeek = new Map<string, string | null>();
  return (d: string) => {
    const w = weekOf(d);
    if (!byWeek.has(w)) byWeek.set(w, freeDayOf(s, w, now));
    return byWeek.get(w) === d;
  };
}

/** A habit's own streak, with the weekly free day */
export const habitStreak = (s: State, h: Habit, now = today()) => habitStreakOf(h, now, freeDays(s, now));

const didAny = (s: State, d: string) => s.habits.some(h => h.history.includes(d));

/** Last 7 days, oldest first: done / missed / today-pending */
export function lastWeek(s: State, now = today()) {
  const days = new Set(s.perfectDays), free = freeDays(s, now);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i - 6);
    const rest = !days.has(d) && isRestDay(s.habits, d);
    return { day: d, done: days.has(d) || (rest && didAny(s, d)), rest: rest && !didAny(s, d), free: free(d), isToday: d === now };
  });
}
