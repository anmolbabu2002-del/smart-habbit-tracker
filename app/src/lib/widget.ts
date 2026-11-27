// The home-screen widget (Android, .github/android/NotoWidget.java): ticks made there are kept
// natively until the app opens, then recorded here like a normal tick (streaks, celebration).
// The widget's camera button opens that habit's photo check.
import { native, isNative, listenNative } from './native';
import { getState, update } from './store';
import { completeHabit, afterHabitsChanged } from './actions';
import { requestProof } from './celebrate';
import { today } from './dates';
import { isRequired } from './schedule';

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
        const due = s.habits.filter(h => isRequired(h, d));
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

// ── Adding the widget from the app ──
export type WidgetStatus = { supported: boolean; placed: boolean };
export const widgetStatus = (): Promise<WidgetStatus> =>
  isNative ? native<WidgetStatus>(PLUGIN, 'widgetStatus').catch(() => ({ supported: false, placed: false })) : Promise.resolve({ supported: false, placed: false });
/** Ask the launcher to add it (Android shows its own "Add" dialog). False = do it by hand. */
export const pinWidget = () => native<{ asked: boolean }>(PLUGIN, 'pinWidget').then(r => !!r?.asked).catch(() => false);

const DAY_MS = 86400000;
/** Time for the occasional prompt? Never on day one, at most every 4 days, and never after 3 "Not now"s. */
export async function shouldAskWidget() {
  const s = getState(), a = s.widgetAsk || { no: 0, last: 0 };
  if (!isNative || a.no >= 3 || Date.now() - a.last < 4 * DAY_MS) return false;
  if (!s.habits.some(h => h.createdAt < today())) return false;
  const st = await widgetStatus();
  return st.supported && !st.placed;
}
export const markWidgetAsked = (declined: boolean) =>
  update(s => { const a = s.widgetAsk || { no: 0, last: 0 }; s.widgetAsk = { no: a.no + (declined ? 1 : 0), last: Date.now() }; });
