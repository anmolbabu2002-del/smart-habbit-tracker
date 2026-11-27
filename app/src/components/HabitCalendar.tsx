// A habit's calendar: satisfying ticks for done days, shameful crosses for missed ones,
// and insights read from its real history.
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CaretLeft, CaretRight, Check, X, Ticket, TrendUp, TrendDown, Warning, Trophy, IdentificationBadge, PencilSimple } from '@phosphor-icons/react';
import { Sheet } from './Sheet';
import { HabitIcon } from './HabitIcon';
import { addDays, daysBetween, parseYmd, today, weekOf, ymd } from '../lib/dates';
import { identityOf, autoIdentity, votesOf } from '../lib/identity';
import { setIdentity } from '../lib/actions';
import { useApp } from '../lib/store';
import { describe, doneThisWeek, habitStreakOf, isRequired, scheduleOn, upcomingSchedule } from '../lib/schedule';
import { play } from '../lib/sound';
import type { Habit } from '../lib/types';

const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type Cell = { day: string; kind: 'done' | 'pass' | 'missed' | 'off' | 'today' | 'future' | 'before' };

function analyse(h: Habit) {
  const t = today(), done = new Set(h.history), pass = new Set(h.passDays || []);
  const start = h.createdAt < t ? h.createdAt : t;
  const days: string[] = [];
  // finished days it was due (or done anyway); days off don't count as missed
  for (let d = start; d < t; d = addDays(d, 1)) if (isRequired(h, d) || done.has(d)) days.push(d);
  const did = (d: string) => done.has(d);
  // runs
  let best = 0, run = 0;
  for (const d of [...days, t]) { if (did(d)) { run++; best = Math.max(best, run); } else if (d !== t && isRequired(h, d)) run = 0; }
  // weekdays
  const byWd = Array.from({ length: 7 }, () => ({ n: 0, ok: 0 }));
  days.forEach(d => { const w = parseYmd(d).getDay(); byWd[w].n++; if (did(d)) byWd[w].ok++; });
  const rated = byWd.map((x, i) => ({ i, rate: x.n >= 2 ? x.ok / x.n : null })).filter(x => x.rate !== null) as { i: number; rate: number }[];
  const worst = rated.length ? rated.reduce((a, b) => (b.rate < a.rate ? b : a)) : null;
  const bestWd = rated.length ? rated.reduce((a, b) => (b.rate > a.rate ? b : a)) : null;
  // this week vs last week
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(t, -1 - i)).filter(d => days.includes(d));
  const prev7 = Array.from({ length: 7 }, (_, i) => addDays(t, -8 - i)).filter(d => days.includes(d));
  const pct = (list: string[]) => (list.length ? list.filter(did).length / list.length : 0);
  // two misses in a row
  let doubleMiss = 0;
  for (let i = 1; i < days.length; i++) if (!did(days[i]) && !did(days[i - 1])) doubleMiss++;
  const missed = days.filter(d => !did(d)).length;
  return { total: h.history.length, rate: days.length ? (days.length - missed) / days.length : did(t) ? 1 : 0, missed, best, current: run, worst, bestWd, week: pct(last7), prevWeek: pct(prev7), hasPrev: prev7.length >= 3, doubleMiss, pass: pass.size, days: days.length };
}

/** Times-a-week habits are judged by the week: hit the target or not */
function analyseWeeks(h: Habit) {
  const t = today(), thisWeek = weekOf(t);
  const weeks: { start: string; count: number; target: number; met: boolean }[] = [];
  for (let w = weekOf(h.createdAt); w < thisWeek; w = addDays(w, 7)) {
    const s = scheduleOn(h, addDays(w, 6));
    const target = s.kind === 'weekly' ? s.times : 7;
    const end = addDays(w, 6), from = w < h.createdAt ? h.createdAt : w;
    const count = h.history.filter(d => d >= w && d <= end).length;
    const avail = Math.min(target, daysBetween(from, end) + 1); // the first week may be short
    weeks.push({ start: w, count, target, met: count >= avail });
  }
  let best = 0, run = 0;
  for (const w of weeks) { if (w.met) { run++; best = Math.max(best, run); } else run = 0; }
  const st = habitStreakOf(h);
  const s = scheduleOn(h);
  const target = s.kind === 'weekly' ? s.times : 7;
  const now = doneThisWeek(h);
  return { current: st.n, best: Math.max(best, st.n), rate: weeks.length ? weeks.filter(w => w.met).length / weeks.length : now >= target ? 1 : 0,
    missedWeeks: weeks.filter(w => !w.met).length, target, now, last: weeks.at(-1) };
}

export function HabitCalendar({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const a = useMemo(() => (habit ? analyse(habit) : null), [habit]);
  const wk = useMemo(() => (habit && scheduleOn(habit).kind === 'weekly' ? analyseWeeks(habit) : null), [habit]);
  if (!habit || !a) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const t = today(), done = new Set(habit.history), pass = new Set(habit.passDays || []);
  const first = ymd(month), lead = (month.getDay() + 6) % 7, daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Cell | null)[] = [...Array(lead).fill(null)];
  for (let i = 0; i < daysIn; i++) {
    const d = addDays(first, i);
    const kind: Cell['kind'] = d > t ? 'future' : d < habit.createdAt ? 'before' : pass.has(d) ? 'pass' : done.has(d) ? 'done' : d === t ? 'today' : !wk && isRequired(habit, d) ? 'missed' : 'off';
    cells.push({ day: d, kind });
  }
  const mDone = cells.filter(c => c && (c.kind === 'done' || c.kind === 'pass')).length;
  const mMissed = cells.filter(c => c?.kind === 'missed').length;
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= new Date();
  const go = (n: number) => { play('tap'); setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1)); };

  // the most useful things to say, in order
  const insights: { icon: React.ReactNode; text: string; tone: 'good' | 'bad' | 'meh' }[] = [];
  if (wk) {
    const left = wk.target - wk.now;
    insights.push(left > 0
      ? { icon: <Warning size={18} weight="fill" />, text: `${left} more this week to hit your ${wk.target}.`, tone: 'meh' }
      : { icon: <Check size={18} weight="bold" />, text: `This week’s ${wk.target} are done.`, tone: 'good' });
    if (wk.current >= 2 && wk.current >= wk.best) insights.push({ icon: <Trophy size={18} weight="fill" />, text: `${wk.current} weeks in a row. Your best ever.`, tone: 'good' });
    else if (wk.best > wk.current) insights.push({ icon: <Trophy size={18} weight="fill" />, text: `Your best is ${wk.best} weeks in a row.`, tone: 'good' });
    if (wk.last && !wk.last.met) insights.push({ icon: <X size={18} weight="bold" />, text: `Last week: ${wk.last.count} of ${wk.last.target}. Don’t miss two weeks in a row.`, tone: 'bad' });
  }
  if (!wk && a.worst && a.worst.rate < 0.75) insights.push({ icon: <Warning size={18} weight="fill" />, text: `${WD[a.worst.i]}s are your weak spot: done only ${Math.round(a.worst.rate * 100)}% of the time.`, tone: 'bad' });
  if (!wk && a.hasPrev && a.week !== a.prevWeek) insights.push(a.week > a.prevWeek
    ? { icon: <TrendUp size={18} weight="bold" />, text: `Better than last week: ${Math.round(a.week * 100)}% vs ${Math.round(a.prevWeek * 100)}%.`, tone: 'good' }
    : { icon: <TrendDown size={18} weight="bold" />, text: `Slipping: ${Math.round(a.week * 100)}% this week vs ${Math.round(a.prevWeek * 100)}% last week.`, tone: 'bad' });
  if (!wk && a.current > 0 && a.best > a.current && a.best - a.current <= 5) insights.push({ icon: <Trophy size={18} weight="fill" />, text: `${a.best - a.current} more ${a.best - a.current === 1 ? 'day' : 'days'} to beat your best run of ${a.best}.`, tone: 'good' });
  if (!wk && a.current > 0 && a.current >= a.best && a.best >= 3) insights.push({ icon: <Trophy size={18} weight="fill" />, text: `This is your best run ever. Don’t break it now.`, tone: 'good' });
  if (!wk && a.doubleMiss > 0) insights.push({ icon: <X size={18} weight="bold" />, text: `You missed two days in a row ${a.doubleMiss} ${a.doubleMiss === 1 ? 'time' : 'times'}. Never miss twice.`, tone: 'bad' });
  if (!wk && a.bestWd && a.bestWd.rate >= 0.9 && a.worst && a.bestWd.i !== a.worst.i) insights.push({ icon: <Check size={18} weight="bold" />, text: `${WD[a.bestWd.i]}s are your strongest day.`, tone: 'good' });

  return (
    <Sheet open={!!habit} onClose={onClose} className="cal-sheet">
      <div className="cal-head">
        <span className="habit-tile" style={{ background: `var(--${habit.color}-soft)` }}><HabitIcon icon={habit.icon} color={habit.color} size={30} /></span>
        <span className="cal-title"><b>{habit.name}</b><small>{describe(upcomingSchedule(habit))}</small></span>
      </div>

      {wk ? (
        <div className="cal-stats">
          <div><b style={{ color: `var(--${habit.color})` }}>{wk.now}/{wk.target}</b><small>this week</small></div>
          <div><b>{wk.current}</b><small>{wk.current === 1 ? 'week' : 'weeks'} in a row</small></div>
          <div><b>{Math.round(wk.rate * 100)}%</b><small>weeks hit</small></div>
          <div className={wk.missedWeeks ? 'shame' : ''}><b>{wk.missedWeeks}</b><small>{wk.missedWeeks === 1 ? 'week' : 'weeks'} missed</small></div>
        </div>
      ) : (
        <div className="cal-stats">
          <div><b style={{ color: `var(--${habit.color})` }}>{a.current}</b><small>current run</small></div>
          <div><b>{a.best}</b><small>best run</small></div>
          <div><b>{Math.round(a.rate * 100)}%</b><small>all-time</small></div>
          <div className={a.missed ? 'shame' : ''}><b>{a.missed}</b><small>days missed</small></div>
        </div>
      )}

      <Votes habit={habit} />

      {insights.length > 0 && (
        <div className="cal-insights">
          {insights.slice(0, 3).map((x, i) => <p key={i} className={'ins ' + x.tone}>{x.icon}{x.text}</p>)}
        </div>
      )}

      <div className="cal-month">
        <button type="button" className="rd-ic" onClick={() => go(-1)} aria-label="Previous month"><CaretLeft size={20} weight="bold" /></button>
        <b>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</b>
        <button type="button" className="rd-ic" onClick={() => go(1)} disabled={!canNext} aria-label="Next month"><CaretRight size={20} weight="bold" /></button>
      </div>
      <div className={'cal-grid' + (wk ? ' weeks' : '')}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={'h' + i} className="cal-wd">{d}</span>)}
        {wk && <span className="cal-wd">Week</span>}
        {(wk ? withWeekScores(cells, habit) : cells).map((c, i) => c && 'score' in c ? <WeekScore key={'s' + c.start} {...c} /> : !c ? <span key={'e' + i} /> : (
          <motion.span key={c.day} className={'cal-day ' + c.kind} style={c.kind === 'done' ? { ['--hc' as string]: `var(--${habit.color})`, ['--he' as string]: `var(--${habit.color}-edge)` } : undefined}
            initial={c.kind === 'done' || c.kind === 'pass' ? { scale: 0.3, opacity: 0 } : c.kind === 'missed' ? { opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 16, delay: i * 0.012 }}>
            {c.kind === 'done' ? <Check size={16} weight="bold" /> : c.kind === 'pass' ? <Ticket size={15} weight="fill" /> : c.kind === 'missed' ? <X size={14} weight="bold" /> : <i>{parseYmd(c.day).getDate()}</i>}
          </motion.span>
        ))}
      </div>
      <p className="cal-foot">
        <span className="good">{mDone} done</span>
        {wk ? (() => { const n = withWeekScores(cells, habit).filter(c => c && 'score' in c && c.state === 'missed').length; return n > 0 && <span className="bad">{n} {n === 1 ? 'week' : 'weeks'} missed</span>; })()
          : mMissed > 0 && <span className="bad">{mMissed} missed</span>}
        {a.pass > 0 && <span>{a.pass} free {a.pass === 1 ? 'pass' : 'passes'} used</span>}
      </p>
    </Sheet>
  );
}

type Score = { score: true; start: string; count: number; target: number; state: 'met' | 'missed' | 'now' | 'future' };
/** After every 7 cells, the week's score: 2/3 (missed), 3/3 (met), or this week's progress */
function withWeekScores(cells: (Cell | null)[], h: Habit): (Cell | Score | null)[] {
  const out: (Cell | Score | null)[] = [];
  const padded = [...cells];
  while (padded.length % 7) padded.push(null);
  const t = today(), thisWeek = weekOf(t);
  for (let r = 0; r < padded.length; r += 7) {
    const row = padded.slice(r, r + 7);
    out.push(...row);
    const real = row.find(Boolean) as Cell | undefined;
    if (!real) { out.push(null); continue; }
    const start = weekOf(real.day), end = addDays(start, 6);
    const s = scheduleOn(h, end);
    const target = s.kind === 'weekly' ? s.times : 7;
    const count = h.history.filter(d => d >= start && d <= end).length;
    const from = start < h.createdAt ? h.createdAt : start;
    const need = Math.min(target, Math.max(0, daysBetween(from, end) + 1));
    const state = start > thisWeek || end < h.createdAt ? 'future' : start === thisWeek ? (count >= target ? 'met' : 'now') : count >= need ? 'met' : 'missed';
    out.push({ score: true, start, count, target, state });
  }
  return out;
}

function WeekScore({ count, target, state }: Score) {
  if (state === 'future') return <span />;
  return <span className={'cal-score ' + state}>{state === 'met' ? <Check size={13} weight="bold" /> : null}{count}/{target}</span>;
}

/** "47 votes for being a reader": tap to say it in your own words */
function Votes({ habit: opened }: { habit: Habit }) {
  const habit = useApp().habits.find(h => h.id === opened.id) || opened; // live, so an edit shows at once
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState('');
  const votes = votesOf(habit);
  const who = identityOf(habit);
  const save = () => { setIdentity(habit.id, text); play('pop'); setEdit(false); };
  if (edit) return (
    <div className="votes editing">
      <span className="votes-lead">Every tick is a vote for being…</span>
      <input className="field" autoFocus maxLength={60} placeholder={autoIdentity(habit.icon)} value={text}
        onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} />
      <div className="votes-actions">
        <button type="button" className="btn ghost" onClick={() => { play('tap'); setEdit(false); }}>Cancel</button>
        <button type="button" className="btn" onClick={save}>Save</button>
      </div>
    </div>
  );
  return (
    <button type="button" className="votes" style={{ ['--hc' as string]: `var(--${habit.color})`, ['--hs' as string]: `var(--${habit.color}-soft)` }}
      onClick={() => { play('tap'); setText(habit.identity || ''); setEdit(true); }} aria-label="Change who this habit makes you">
      <span className="votes-ico"><IdentificationBadge size={26} weight="fill" /></span>
      <span className="votes-text"><b>{votes} {votes === 1 ? 'vote' : 'votes'}</b><small>for being {who}</small></span>
      <PencilSimple size={16} weight="bold" className="votes-pen" />
    </button>
  );
}
