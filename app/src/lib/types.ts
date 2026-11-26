export type Color = 'orange' | 'mint' | 'blue' | 'purple' | 'yellow' | 'red';
export const COLORS: Color[] = ['orange', 'mint', 'blue', 'purple', 'yellow', 'red'];

export interface Habit {
  id: string;
  name: string;
  icon: string;           // id from HabitIcon (our own drawings, no emoji)
  color: Color;
  createdAt: string;      // ymd
  history: string[];      // days it was done (ymd)
  passDays?: string[];    // days a free pass covered it
  doneAt?: number;        // when it was last ticked off (undo only shortly after)
}

export interface Task {
  id: string;
  title: string;
  note?: string;
  due?: string;           // ymd; none = "Anytime"
  repeat?: 'daily' | 'weekdays' | 'weekly' | 'monthly';
  doneAt?: string;        // ymd it was completed
  createdAt: number;
}

export type FocusRef = { kind: 'task' | 'habit'; id: string };

export interface FocusSession {
  id: string;
  day: string;            // ymd
  start: number;          // epoch ms
  minutes: number;        // minutes actually focused
  planned: number;
  label: string;
  icon: string;           // id from HabitIcon (our own drawings, no emoji)
  ref?: FocusRef;
  finished: boolean;      // ran to the end
}

export interface ActiveFocus {
  start: number;
  planned: number;        // minutes
  label: string;
  icon: string;           // id from HabitIcon (our own drawings, no emoji)
  ref?: FocusRef;
  pausedAt?: number;
  pausedMs: number;
  lock: boolean;
}

export interface State {
  v: 2;
  name: string;
  theme: 'light' | 'dark';
  sound: boolean;
  habits: Habit[];
  tasks: Task[];
  perfectDays: string[];  // days every habit was done
  bestStreak: number;
  celebratedDay: string;  // last day the "all done" party ran
  passes: Record<string, { habitId: string; day: string }>; // week (Monday ymd) → pass used
  focus: { sessions: FocusSession[]; lastPlanned: number; lockApps: boolean; active?: ActiveFocus; giveUps?: { day: string; minutes: number }[] };
  lock: { enabled: boolean };
  feats: string[];        // milestones already celebrated
  tasksDone: number;      // lifetime count, for milestones
  migrated: boolean;
  lockDefaulted?: boolean; // Habit Lock was switched on by default once
}
