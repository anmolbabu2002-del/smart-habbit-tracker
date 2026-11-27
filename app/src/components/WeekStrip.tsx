// A habit's week at a glance (Mon–Sun) for "certain days" habits:
// mint = done, solid orange = due today, light orange = due later, red = missed, grey = not due.
import { addDays, parseYmd, today, weekOf } from '../lib/dates';
import { isRequired } from '../lib/schedule';
import type { Habit } from '../lib/types';

const L = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function WeekStrip({ h }: { h: Habit }) {
  const t = today(), mon = weekOf(t), done = new Set(h.history);
  return (
    <span className="wstrip" aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => {
        const d = addDays(mon, i);
        const due = isRequired(h, d);
        const kind = done.has(d) ? 'done' : !due ? 'off' : d === t ? 'today' : d > t ? 'up' : 'miss';
        return <i key={d} className={kind}>{L[parseYmd(d).getDay()]}</i>;
      })}
    </span>
  );
}
