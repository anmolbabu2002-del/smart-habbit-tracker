// The home-screen widget (Android, .github/android/NotoWidget.java): ticks made there are kept
// natively until the app opens, then recorded here like a normal tick (streaks, celebration).
// The widget's camera button opens that habit's photo check.
import { native, isNative, listenNative } from './native';
import { getState, update } from './store';
import { completeHabit, afterHabitsChanged } from './actions';
import { requestProof } from './celebrate';
import { today } from './dates';

const PLUGIN = 'UltradianHabitLock';
type Tick = { id: string; day: string; at: number };

export async function takeWidgetTicks() {
  if (!isNative) return;
  const r = await native<{ ticks?: Tick[] }>(PLUGIN, 'takeWidgetTicks').catch(() => null);
  const ticks = r?.ticks || [];
  if (!ticks.length) return;
  const day = today();
  // ticked on an earlier day (e.g. 11:59 PM, app opened next morning): file under that day
  const past = ticks.filter(t => t.day < day);
  if (past.length) {
    update(s => {
      for (const t of past) {
        const h = s.habits.find(x => x.id === t.id);
        if (h && !h.history.includes(t.day)) h.history.push(t.day);
      }
      for (const d of new Set(past.map(t => t.day))) {
        const due = s.habits.filter(h => h.createdAt <= d);
        if (due.length && due.every(h => h.history.includes(d)) && !s.perfectDays.includes(d)) s.perfectDays.push(d);
      }
      s.perfectDays.sort();
    });
  }
  for (const t of ticks.filter(t => t.day === day)) {
    completeHabit(t.id);
    // the undo window counts from the real tick on the widget, not from now
    update(s => { const h = s.habits.find(x => x.id === t.id); if (h) h.doneAt = t.at; });
  }
  afterHabitsChanged();
}

/** Call once at start: the widget's camera button → that habit's photo check */
export function listenWidget() {
  listenNative<{ id?: string }>(PLUGIN, 'proveHabit', d => {
    if (d?.id && getState().habits.some(h => h.id === d.id)) requestProof(d.id);
  });
}
