// When a habit is due. Three kinds, kept simple:
//   daily  – every day (the default)
//   days   – chosen weekdays, at least 3
//   weekly – a number of times a week, at least 3, on any days (weeks start on Monday)
//
// "Shown" = it appears on Today. "Required" = it counts for the streak and Habit Lock that day.
// A weekly habit is shown every day until its target is met, but only becomes required on the
// days you can no longer skip it (e.g. 3 to go with 3 days left). A day with nothing required is
// a rest day: it never breaks the streak (and doesn't add to it).
//
// Changes take effect the next day (no dodging today), so a habit keeps a list of schedules
// with the day each one starts.
import { addDays, daysBetween, parseYmd, today, weekOf } from './dates';
import type { Habit, Schedule } from './types';

export const MIN_PER_WEEK = 3;
export const DAILY: Schedule = { kind: 'daily' };
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The schedule in force on a day */
export function scheduleOn(h: Habit, day = today()): Schedule {
  let s: Schedule = DAILY;
  for (const e of h.schedules || []) if (e.from <= day) s = e.s;
  return s;
}

/** The schedule that will apply from tomorrow (what the editor shows and edits) */
export const upcomingSchedule = (h: Habit) => scheduleOn(h, addDays(today(), 1));

export const sameSchedule = (a: Schedule, b: Schedule) =>
  a.kind === b.kind && (a.kind !== 'days' || [...a.days].sort().join() === [...(b as typeof a).days].sort().join())
  && (a.kind !== 'weekly' || a.times === (b as typeof a).times);

/** Every day, or a valid days/weekly schedule (7 days = every day, minimums enforced) */
export function normalise(s: Schedule): Schedule {
  if (s.kind === 'days') {
    const days = [...new Set(s.days)].filter(d => d >= 0 && d <= 6).sort();
    if (days.length >= 7) return DAILY;
    return days.length >= MIN_PER_WEEK ? { kind: 'days', days } : DAILY;
  }
  if (s.kind === 'weekly') {
    const times = Math.round(s.times);
    if (times >= 7) return DAILY;
    return { kind: 'weekly', times: Math.max(MIN_PER_WEEK, times) };
  }
  return DAILY;
}

const weekday = (day: string) => parseYmd(day).getDay();
const exists = (h: Habit, day: string) => h.createdAt <= day;

/** Times done this week before the given day */
export function doneBefore(h: Habit, day: string) {
  const start = weekOf(day);
  return h.history.filter(d => d >= start && d < day).length;
}
/** Times done this week up to and including the given day */
export const doneThisWeek = (h: Habit, day = today()) => doneBefore(h, day) + (h.history.includes(day) ? 1 : 0);
/** Days left in the week, counting the given day (Monday = 7, Sunday = 1) */
const daysLeftInWeek = (day: string) => 7 - ((weekday(day) + 6) % 7);

/**
 * This week's real target for a times-a-week habit. Normally the full number; fewer when the
 * habit (or its times-a-week schedule) started mid-week, since only the days left can count:
 * e.g. 5 a week, started on Thursday = 4 this week. Days done earlier that week still count.
 */
export function weekTarget(h: Habit, day = today()): number {
  const s = scheduleOn(h, day);
  if (s.kind !== 'weekly') return 0;
  const w = weekOf(day), end = addDays(w, 6);
  let from = h.createdAt;
  for (const e of h.schedules || []) if (e.from <= day && e.from > from) from = e.from;
  const start = from > w ? from : w;
  if (start === w) return s.times;
  const doneEarlier = h.history.filter(d => d >= w && d < start).length;
  return Math.min(s.times, doneEarlier + daysBetween(start, end) + 1);
}

/** What a whole week (Monday ymd) asks of a habit: its times-a-week target, or every day it existed */
export function weekNeed(h: Habit, weekStart: string): number {
  const end = addDays(weekStart, 6);
  if (scheduleOn(h, end).kind === 'weekly') return weekTarget(h, end);
  const from = weekStart < h.createdAt ? h.createdAt : weekStart;
  return Math.max(0, daysBetween(from, end) + 1);
}

/** Appears on Today */
export function isShown(h: Habit, day = today()) {
  if (!exists(h, day)) return false;
  const s = scheduleOn(h, day);
  if (s.kind === 'days') return s.days.includes(weekday(day));
  if (s.kind === 'weekly') return doneBefore(h, day) < weekTarget(h, day) || h.history.includes(day);
  return true;
}

/** Counts for the streak and Habit Lock on that day */
export function isRequired(h: Habit, day = today()) {
  if (!exists(h, day)) return false;
  const s = scheduleOn(h, day);
  if (s.kind === 'days') return s.days.includes(weekday(day));
  if (s.kind === 'weekly') {
    const remaining = weekTarget(h, day) - doneBefore(h, day);
    return remaining > 0 && remaining >= daysLeftInWeek(day);
  }
  return true;
}

/** Habits existed but none was required: the streak passes over this day */
export function isRestDay(habits: Habit[], day: string) {
  return habits.some(h => exists(h, day)) && !habits.some(h => isRequired(h, day));
}

/** "Every day", "Mon, Wed, Fri", "Weekdays", "3 times a week" */
export function describe(s: Schedule) {
  if (s.kind === 'days') {
    const d = [...s.days].sort();
    if (d.join() === '1,2,3,4,5') return 'Weekdays';
    return [...d.filter(x => x !== 0), ...d.filter(x => x === 0)].map(x => DAY_SHORT[x]).join(', ');
  }
  if (s.kind === 'weekly') return `${s.times} times a week`;
  return 'Every day';
}

/**
 * Per-habit streak. Daily and chosen-days habits count due days in a row (days off are skipped);
 * weekly habits count weeks in a row that hit the target (this week counts once it's hit).
 * `free`: the week's free day (see freeDayOf in streak.ts), forgiven like a day off.
 */
export function habitStreakOf(h: Habit, day = today(), free?: (d: string) => boolean): { n: number; unit: 'day' | 'week' } {
  const done = new Set(h.history);
  const s = scheduleOn(h, day);
  if (s.kind === 'weekly') {
    let n = 0, w = weekOf(day);
    const firstWeek = weekOf(h.createdAt);
    // this week counts only once the target is met
    if (doneThisWeek(h, day) >= weekTarget(h, day)) n++;
    w = addDays(w, -7);
    for (let i = 0; i < 520 && w >= firstWeek; i++, w = addDays(w, -7)) {
      const end = addDays(w, 6);
      const count = h.history.filter(d => d >= w && d <= end).length;
      if (count >= weekNeed(h, w)) n++; else break; // a short first week needs only the days that were left
    }
    return { n, unit: 'week' };
  }
  let d = done.has(day) ? day : addDays(day, -1), n = 0;
  for (let i = 0; i < 3660 && d >= h.createdAt; i++, d = addDays(d, -1)) {
    if (done.has(d)) n++;
    else if (isRequired(h, d) && !free?.(d)) break; // the week's free day doesn't break it
  }
  return { n, unit: 'day' };
}
