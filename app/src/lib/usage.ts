// Screen time of the 5 locked apps (Android only, needs Usage access). The phone counts it from
// its own open/close events; see .github/android/UsageReport.java. Nothing leaves the phone.
import { native, isNative } from './native';
import { LOCK_APPS } from './lock';

export const MIN = 60000;

export interface AppUsage { name: string; today: number; full: number[]; same: number[] }
export interface Usage {
  apps: AppUsage[];          // all 5, most used today first
  today: number;             // ms on all 5 today
  days: number[];            // full-day totals, [0] = yesterday … [6] = 7 days ago
  history: number;           // past days that have any data (new phones / installs have fewer)
  usualByNow: number | null; // average of earlier days up to this clock time (null under 3 days)
  avgDay: number | null;     // average full day (null under 3 days)
}

type Raw = { access: boolean; apps?: Record<string, { today: number; full: number[]; same: number[] }> };

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

export function summarise(raw: Raw): Usage | null {
  if (!raw?.access || !raw.apps) return null;
  const apps: AppUsage[] = LOCK_APPS.map(a => {
    const parts = a.pkgs.map(p => raw.apps![p]).filter(Boolean);
    return {
      name: a.name,
      today: sum(parts.map(p => p.today || 0)),
      full: [0, 1, 2, 3, 4, 5, 6].map(i => sum(parts.map(p => p.full?.[i] || 0))),
      same: [0, 1, 2, 3, 4, 5, 6].map(i => sum(parts.map(p => p.same?.[i] || 0)))
    };
  }).sort((x, y) => y.today - x.today);
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => sum(apps.map(a => a.full[i])));
  const same = [0, 1, 2, 3, 4, 5, 6].map(i => sum(apps.map(a => a.same[i])));
  const withData = days.map((d, i) => (d > 0 ? i : -1)).filter(i => i >= 0);
  const history = withData.length;
  const avg = (a: number[]) => (withData.length ? sum(withData.map(i => a[i])) / withData.length : 0);
  return {
    apps,
    today: sum(apps.map(a => a.today)),
    days,
    history,
    usualByNow: history >= 3 ? avg(same) : null,
    avgDay: history >= 3 ? avg(days) : null
  };
}

/** Today's screen time, or null (website, no Usage access, or the phone refused) */
export async function readUsage(): Promise<Usage | null> {
  const fake = (window as unknown as { __fakeUsage?: Raw }).__fakeUsage; // browser tests
  if (fake) return summarise(fake);
  if (!isNative) return null;
  try {
    const raw = await native<Raw>('UltradianHabitLock', 'usage', { pkgs: LOCK_APPS.flatMap(a => a.pkgs) });
    return summarise(raw);
  } catch {
    return null;
  }
}

/** "2 h 14 m", "45 m", "1 m" */
export function fmtTime(ms: number) {
  const m = Math.max(1, Math.round(ms / MIN));
  if (m < 60) return `${m} m`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} m` : `${h} h`;
}

export type Level = 'veryHigh' | 'high' | 'normal' | 'low';

/**
 * Compared with the user's own earlier days up to this time of day. Absolute floors keep a
 * light user from being told off for 20 minutes; the first 3 days use fixed limits.
 */
export function levelOf(u: Usage | null, minutesNow: number): Level | null {
  if (!u) return null;
  const t = u.today;
  if (u.usualByNow === null) return t >= 120 * MIN ? 'veryHigh' : t >= 60 * MIN ? 'high' : 'normal';
  const usual = Math.max(u.usualByNow, MIN);
  if (t >= 60 * MIN && t >= 2 * usual) return 'veryHigh';
  if (t >= 30 * MIN && t >= 1.5 * usual) return 'high';
  if (minutesNow >= 12 * 60 && u.usualByNow >= 10 * MIN && t < 0.5 * u.usualByNow) return 'low';
  return 'normal';
}
