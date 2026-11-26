// Understands dates and repeats typed into a task: "Call mom friday", "Gym every monday",
// "Pay rent on 1 dec", "Submit form in 3 days", "Revise notes tmrw". Returns the clean title.
import { addDays, parseYmd, today, ymd } from './dates';

export type Repeat = 'daily' | 'weekdays' | 'weekly' | 'monthly';
export type Parsed = { title: string; due?: string; repeat?: Repeat; matched?: string };

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_RE = '(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)(?:day|nesday|rsday|urday|sday)?';
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const dayIndex = (w: string) => DAYS.findIndex(d => d.startsWith(w.slice(0, 3).toLowerCase()));

/** The coming weekday (today if it's that day); nextWeek: that weekday in next Mon–Sun week */
function nextWeekday(from: string, wd: number, nextWeek = false) {
  const d = parseYmd(from);
  if (nextWeek) {
    const monday = addDays(from, 7 - ((d.getDay() + 6) % 7));
    return addDays(monday, (wd + 6) % 7);
  }
  return addDays(from, (wd - d.getDay() + 7) % 7);
}

export function parseTask(input: string, now = today()): Parsed {
  let text = ` ${input} `;
  let due: string | undefined, repeat: Repeat | undefined;
  const found: string[] = [];
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = text.match(re);
    if (!m) return false;
    fn(m);
    found.push(m[0].trim());
    text = text.replace(m[0], ' ');
    return true;
  };

  // Repeats first ("every monday" also sets the first date)
  take(new RegExp(`\\s(every|each)\\s+${DAY_RE}\\b`, 'i'), m => { repeat = 'weekly'; due = nextWeekday(now, dayIndex(m[2])); })
    || take(/\s(every ?day|daily|each day)\b/i, () => { repeat = 'daily'; due = due || now; })
    || take(/\s(every weekday|weekdays|on weekdays)\b/i, () => { repeat = 'weekdays'; due = due || now; })
    || take(/\s(every week|weekly)\b/i, () => { repeat = 'weekly'; due = due || now; })
    || take(/\s(every month|monthly)\b/i, () => { repeat = 'monthly'; due = due || now; });

  // Dates
  take(/\s(today|tonight|this evening)\b/i, () => { due = now; })
    || take(/\s(tomorrow|tmrw|tmr|tomorow)\b/i, () => { due = addDays(now, 1); })
    || take(/\s(day after tomorrow)\b/i, () => { due = addDays(now, 2); })
    || take(/\s(next week)\b/i, () => { due = nextWeekday(now, 1, true); })
    || take(/\sin\s+(\d{1,2}|a|an|one|two|three|four|five|six|seven)\s+(day|days|week|weeks)\b/i, m => {
      const words: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
      const n = Number(m[1]) || words[m[1].toLowerCase()] || 1;
      due = addDays(now, /week/i.test(m[2]) ? n * 7 : n);
    })
    || take(new RegExp(`\\s(next)\\s+${DAY_RE}\\b`, 'i'), m => { due = nextWeekday(now, dayIndex(m[2]), true); })
    || take(new RegExp(`\\s(?:on\\s+|this\\s+)?${DAY_RE}\\b`, 'i'), m => { due = nextWeekday(now, dayIndex(m[1])); })
    || take(/\s(?:on\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i, m => { due = dateFor(now, Number(m[1]), MONTHS.indexOf(m[2].slice(0, 3).toLowerCase())); })
    || take(/\s(?:on\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/i, m => { due = dateFor(now, Number(m[2]), MONTHS.indexOf(m[1].slice(0, 3).toLowerCase())); })
    || take(/\s(?:on\s+)?(\d{1,2})\/(\d{1,2})\b/, m => { due = dateFor(now, Number(m[1]), Number(m[2]) - 1); });

  const title = text.replace(/\s+(on|by|at|this)\s*$/i, ' ').replace(/\s+/g, ' ').trim();
  return { title: title || input.trim(), due, repeat, matched: found.join(' · ') || undefined };
}

function dateFor(now: string, day: number, month: number) {
  if (month < 0 || month > 11 || day < 1 || day > 31) return undefined;
  const n = parseYmd(now);
  let d = new Date(n.getFullYear(), month, day);
  if (ymd(d) < now) d = new Date(n.getFullYear() + 1, month, day);
  return ymd(d);
}

/** The next date for a repeating task after it's done */
export function nextDue(due: string, repeat: Repeat, now = today()) {
  const base = due > now ? due : now;
  if (repeat === 'daily') return addDays(base, 1);
  if (repeat === 'weekly') { let d = addDays(due, 7); while (d <= now) d = addDays(d, 7); return d; }
  if (repeat === 'weekdays') { let d = addDays(base, 1); while ([0, 6].includes(parseYmd(d).getDay())) d = addDays(d, 1); return d; }
  // Same day next month, or the month's last day (31 Jan → 28 Feb)
  const p = parseYmd(due), want = p.getDate();
  const inMonth = (y: number, m: number) => new Date(y, m, Math.min(want, new Date(y, m + 1, 0).getDate()));
  let d = inMonth(p.getFullYear(), p.getMonth() + 1);
  while (ymd(d) <= now) d = inMonth(d.getFullYear(), d.getMonth() + 1);
  return ymd(d);
}

export const REPEAT_LABEL: Record<Repeat, string> = { daily: 'Every day', weekdays: 'Weekdays', weekly: 'Every week', monthly: 'Every month' };
