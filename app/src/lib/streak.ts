// The streak: days in a row on which every habit was done. It's shown as "Blip", a little fire
// spirit that evolves into a new form at each milestone, and falls back to an ember if the
// streak breaks.
import { addDays, today } from './dates';
import type { State } from './types';
import { isRestDay } from './schedule';

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
 * due, e.g. a Mon/Wed/Fri habit on a Tuesday) are passed over: they don't break it or add to it.
 */
export function streakOf(s: State, now = today()) {
  const days = new Set(s.perfectDays);
  let d = days.has(now) || isRestDay(s.habits, now) ? now : addDays(now, -1);
  let n = 0;
  for (let i = 0; i < 4000; i++, d = addDays(d, -1)) {
    if (days.has(d)) n++;
    else if (!isRestDay(s.habits, d)) break;
  }
  return n;
}

/** Last 7 days, oldest first: done / missed / today-pending */
export function lastWeek(s: State, now = today()) {
  const days = new Set(s.perfectDays);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(now, i - 6);
    return { day: d, done: days.has(d), rest: !days.has(d) && isRestDay(s.habits, d), isToday: d === now };
  });
}
