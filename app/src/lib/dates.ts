const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day as "2026-11-25" */
export const ymd = (d: Date = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const today = () => ymd();
/** Monday of the week the day falls in */
export const weekOf = (s: string = today()) => { const d = parseYmd(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
export const daysBetween = (a: string, b: string) => Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000);
export const fromAnyDate = (v: unknown): string | null => {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : ymd(d);
};

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type DueGroup = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'anytime';

export function dueInfo(due: string | undefined, now = today()): { group: DueGroup; label: string; tone: 'red' | 'orange' | 'blue' | 'purple' | 'grey' } {
  if (!due) return { group: 'anytime', label: '', tone: 'grey' };
  const diff = daysBetween(now, due);
  const d = parseYmd(due);
  if (diff < 0) return { group: 'overdue', label: diff === -1 ? 'Yesterday' : `${-diff} days late`, tone: 'red' };
  if (diff === 0) return { group: 'today', label: 'Today', tone: 'orange' };
  if (diff === 1) return { group: 'tomorrow', label: 'Tomorrow', tone: 'blue' };
  if (diff < 7) return { group: 'week', label: WEEKDAY[d.getDay()], tone: 'purple' };
  return { group: 'later', label: `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`, tone: 'purple' };
}

export const prettyDay = (s: string) => { const d = parseYmd(s); return `${WEEKDAY[d.getDay()]} · ${d.getDate()} ${MONTH[d.getMonth()]}`; };
export const longDay = (d = new Date()) => d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });

export function fmtMinutes(min: number) {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}
