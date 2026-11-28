// What Noto says in the Today card. One message at a time, checked in order; the first match
// wins, so two situations can never fight over the bubble. Pure function: easy to test.
import { fmtTime, levelOf, MIN, type Usage } from './usage';

export type Mood = 'happy' | 'cheer' | 'focus' | 'sleepy';
export interface Bubble { title: string; line: string; mood: Mood; tappable: boolean; reflect?: boolean }

export interface BubbleCtx {
  habits: number;           // habits in total
  dueToday: number;         // habits that count today (0 = rest day)
  optional?: string[];      // weekly habits you could get ahead on today
  hadHabits: boolean;       // had habits before (all deleted) vs brand new
  bestStreak: number;
  left: string[];           // names of habits not done yet, in list order
  allDone: boolean;
  lockOn: boolean;
  lockFrom: number;         // minutes after midnight
  lockUntil: number;        // minutes after midnight
  lockApps: number;         // how many apps the lock covers
  now: Date;
  streak: number;
  focusMinutes: number;     // the user's usual focus length
  usage: Usage | null;
  reflected?: boolean;      // tonight's reflection is written
}

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** "Workout", "Workout and Read", "Workout, Read and 2 more" */
export function names(list: string[]) {
  if (list.length <= 1) return list[0] || '';
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list[0]}, ${list[1]} and ${list.length - 2} more`;
}

function clock(min: number) {
  const h = Math.floor(min / 60) % 24, m = min % 60, h12 = h % 12 || 12, ap = h < 12 ? 'AM' : 'PM';
  return m ? `${h12}:${String(m).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
}

/** Same pick for the whole hour, so the text doesn't change on every redraw */
function pick<T>(list: T[], now: Date) {
  const seed = now.getFullYear() * 1000 + now.getMonth() * 50 + now.getDate() * 24 + now.getHours();
  return list[seed % list.length];
}

const DONE_LINES = [
  'You kept your word to yourself today.',
  'Small wins, every day. That’s how it’s built.',
  'Discipline today, freedom tomorrow.',
  'This is what showing up looks like.',
  'The hard part’s done. Enjoy the rest of your day.',
  'Future you is going to thank you for this.',
  'Proof you can do hard things. Again.'
];

export function bubbleFor(c: BubbleCtx): Bubble | null {
  const nowMin = c.now.getHours() * 60 + c.now.getMinutes();
  const n = c.left.length;
  const first = c.left[0] || '';
  const u = c.usage;
  const level = levelOf(u, nowMin);
  const togo = `${plural(n, 'habit')} to go`;


  // Screen time phrasing: name the app when one clearly leads, else the total
  const top = u?.apps[0];
  const subject = u && top && top.today >= 0.6 * u.today ? `${top.name}: ${fmtTime(top.today)} today` : u ? `${fmtTime(u.today)} on social media today` : '';
  const tappable = !!u;

  // 1. No habits yet: invite the first one (the "No habits yet" screen sits below)
  if (!c.habits) {
    if (u && (level === 'veryHigh' || level === 'high')) return { title: `${subject}.`, line: 'Add one habit and win some of that time back.', mood: 'focus', tappable };
    if (c.hadHabits) return {
      title: 'A clean slate.',
      line: c.bestStreak > 2 ? `Your best run was ${c.bestStreak} days. Pick one habit and beat it.` : 'Pick one habit you’ll actually keep. Small beats perfect.',
      mood: 'happy', tappable
    };
    return {
      title: 'Let’s build your day!',
      line: c.lockOn ? `Add your first habit. ${c.lockApps} apps lock at ${clock(c.lockFrom)} until it’s done.` : 'Start with one small thing you’ll do every day.',
      mood: 'happy', tappable
    };
  }

  // 1a. After 9 PM: tonight's question is ready (tap opens Reflection)
  if (nowMin >= 21 * 60 && c.reflected === false) {
    if (c.allDone) return { title: 'All done for today!', line: 'Tonight’s question is ready. Tap to reflect.', mood: 'cheer', tappable: true, reflect: true };
    return { title: n ? `${togo}.` : 'Tonight’s question is ready.', line: n ? 'Tonight’s question is ready. Tap to reflect.' : 'Two minutes to look back on today. Tap to reflect.', mood: 'sleepy', tappable: true, reflect: true };
  }

  // 1b. Rest day: habits exist but none is due today (e.g. a Mon/Wed/Fri habit on a Tuesday)
  if (!c.dueToday && !c.allDone) {
    const opt = c.optional || [];
    const line = opt.length ? `Nothing due today. Want to get ahead on ${names(opt)}?` : c.streak > 0 ? `Nothing due today. Your ${c.streak}-day streak is safe.` : 'Nothing due today. Back at it tomorrow.';
    return { title: 'Rest day.', line, mood: 'happy', tappable };
  }

  // 2. All done: habits matter more than screen time, so no screen time here
  if (c.allDone) {
    const lines = c.streak > 1 ? [...DONE_LINES, `That’s ${c.streak} days in a row. Keep it going.`] : DONE_LINES;
    return { title: 'All done for today!', line: pick(lines, c.now), mood: 'cheer', tappable: false };
  }

  // 3. Apps are locked right now
  if (c.lockOn && nowMin >= c.lockFrom && nowMin < c.lockUntil) {
    const minsLeft = c.lockUntil - nowMin;
    let line = `Your ${c.lockApps} apps are locked until they’re done.`;
    if (u && (level === 'veryHigh' || level === 'high')) line = `Your ${c.lockApps} apps are locked, after ${fmtTime(u.today)} on them today.`;
    else if (minsLeft <= 60) line = `Your apps stay locked till ${clock(c.lockUntil)}, or until they’re done.`;
    return { title: `${togo}.`, line, mood: 'focus', tappable };
  }

  // 4. The lock starts within the hour
  const toLock = c.lockFrom - nowMin;
  if (c.lockOn && toLock > 0 && toLock <= 60) {
    return { title: `Apps lock in ${plural(toLock, 'min', 'min')}.`, line: `Left: ${names(c.left)}.`, mood: 'focus', tappable };
  }

  // 5. Screen time way above the usual
  if (u && level === 'veryHigh') {
    const options: string[] = [`Time to put it down. ${first} is waiting.`];
    if (u.avgDay && u.avgDay * 365 >= 24 * 60 * MIN) options.push(`At this pace, that’s ${Math.round((u.avgDay * 365) / (24 * 60 * MIN))} full days a year on your phone.`);
    const sessions = Math.floor(u.today / (Math.max(c.focusMinutes, 10) * MIN));
    if (sessions >= 2) options.push(`That’s ${sessions} focus sessions of ${c.focusMinutes} min. Start ${first} instead?`);
    if (u.usualByNow) options.push(`More than double your usual by now. ${first} is waiting.`);
    return { title: `${subject}.`, line: pick(options, c.now), mood: 'focus', tappable };
  }

  // 6. Screen time above the usual
  if (u && level === 'high') {
    const line = u.usualByNow ? `${fmtTime(u.today - u.usualByNow)} more than usual by now. ${first} is waiting.` : `Time to put it down. ${first} is waiting.`;
    return { title: `${subject}.`, line, mood: 'focus', tappable };
  }

  // 7. A fresh morning
  if (c.dueToday > 0 && n === c.dueToday && nowMin < 12 * 60) {
    return { title: 'Fresh start.', line: `Begin with ${first}.`, mood: 'happy', tappable };
  }

  // 8. Light day on the phone
  if (u && level === 'low') {
    return { title: `${togo}!`, line: `Only ${fmtTime(u.today)} on social media today. Keep it that way.`, mood: 'happy', tappable };
  }

  // 9. Everything else
  let line = 'You’ve got this.';
  if (c.lockOn && nowMin < c.lockFrom) line = `${c.lockApps} apps lock at ${clock(c.lockFrom)} if they’re not done.`;
  else if (c.now.getHours() >= 21) line = 'Still time before midnight.';
  return { title: `${togo}!`, line, mood: 'happy', tappable };
}
