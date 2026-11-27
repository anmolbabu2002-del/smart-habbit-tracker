// A habit's calendar: satisfying ticks for done days, shameful crosses for missed ones,
// and insights read from its real history.
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CaretLeft, CaretRight, Check, X, Ticket, TrendUp, TrendDown, Warning, Trophy } from '@phosphor-icons/react';
import { Sheet } from './Sheet';
import { HabitIcon } from './HabitIcon';
import { addDays, parseYmd, today, ymd } from '../lib/dates';
import { isRequired } from '../lib/schedule';
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

export function HabitCalendar({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const a = useMemo(() => (habit ? analyse(habit) : null), [habit]);
  if (!habit || !a) return <Sheet open={false} onClose={onClose}>{null}</Sheet>;

  const t = today(), done = new Set(habit.history), pass = new Set(habit.passDays || []);
  const first = ymd(month), lead = (month.getDay() + 6) % 7, daysIn = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Cell | null)[] = [...Array(lead).fill(null)];
  for (let i = 0; i < daysIn; i++) {
    const d = addDays(first, i);
    const kind: Cell['kind'] = d > t ? 'future' : d < habit.createdAt ? 'before' : pass.has(d) ? 'pass' : done.has(d) ? 'done' : d === t ? 'today' : isRequired(habit, d) ? 'missed' : 'off';
    cells.push({ day: d, kind });
  }
  const mDone = cells.filter(c => c && (c.kind === 'done' || c.kind === 'pass')).length;
  const mMissed = cells.filter(c => c?.kind === 'missed').length;
  const canNext = new Date(month.getFullYear(), month.getMonth() + 1, 1) <= new Date();
  const go = (n: number) => { play('tap'); setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1)); };

  // the most useful things to say, in order
  const insights: { icon: React.ReactNode; text: string; tone: 'good' | 'bad' | 'meh' }[] = [];
  if (a.worst && a.worst.rate < 0.75) insights.push({ icon: <Warning size={18} weight="fill" />, text: `${WD[a.worst.i]}s are your weak spot: done only ${Math.round(a.worst.rate * 100)}% of the time.`, tone: 'bad' });
  if (a.hasPrev && a.week !== a.prevWeek) insights.push(a.week > a.prevWeek
    ? { icon: <TrendUp size={18} weight="bold" />, text: `Better than last week: ${Math.round(a.week * 100)}% vs ${Math.round(a.prevWeek * 100)}%.`, tone: 'good' }
    : { icon: <TrendDown size={18} weight="bold" />, text: `Slipping: ${Math.round(a.week * 100)}% this week vs ${Math.round(a.prevWeek * 100)}% last week.`, tone: 'bad' });
  if (a.current > 0 && a.best > a.current && a.best - a.current <= 5) insights.push({ icon: <Trophy size={18} weight="fill" />, text: `${a.best - a.current} more ${a.best - a.current === 1 ? 'day' : 'days'} to beat your best run of ${a.best}.`, tone: 'good' });
  if (a.current > 0 && a.current >= a.best && a.best >= 3) insights.push({ icon: <Trophy size={18} weight="fill" />, text: `This is your best run ever. Don’t break it now.`, tone: 'good' });
  if (a.doubleMiss > 0) insights.push({ icon: <X size={18} weight="bold" />, text: `You missed two days in a row ${a.doubleMiss} ${a.doubleMiss === 1 ? 'time' : 'times'}. Never miss twice.`, tone: 'bad' });
  if (a.bestWd && a.bestWd.rate >= 0.9 && a.worst && a.bestWd.i !== a.worst.i) insights.push({ icon: <Check size={18} weight="bold" />, text: `${WD[a.bestWd.i]}s are your strongest day.`, tone: 'good' });

  return (
    <Sheet open={!!habit} onClose={onClose} className="cal-sheet">
      <div className="cal-head">
        <span className="habit-tile" style={{ background: `var(--${habit.color}-soft)` }}><HabitIcon icon={habit.icon} color={habit.color} size={30} /></span>
        <b>{habit.name}</b>
      </div>

      <div className="cal-stats">
        <div><b style={{ color: `var(--${habit.color})` }}>{a.current}</b><small>current run</small></div>
        <div><b>{a.best}</b><small>best run</small></div>
        <div><b>{Math.round(a.rate * 100)}%</b><small>all-time</small></div>
        <div className={a.missed ? 'shame' : ''}><b>{a.missed}</b><small>days missed</small></div>
      </div>

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
      <div className="cal-grid">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={'h' + i} className="cal-wd">{d}</span>)}
        {cells.map((c, i) => !c ? <span key={'e' + i} /> : (
          <motion.span key={c.day} className={'cal-day ' + c.kind} style={c.kind === 'done' ? { ['--hc' as string]: `var(--${habit.color})`, ['--he' as string]: `var(--${habit.color}-edge)` } : undefined}
            initial={c.kind === 'done' || c.kind === 'pass' ? { scale: 0.3, opacity: 0 } : c.kind === 'missed' ? { opacity: 0 } : false}
            animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 520, damping: 16, delay: i * 0.012 }}>
            {c.kind === 'done' ? <Check size={16} weight="bold" /> : c.kind === 'pass' ? <Ticket size={15} weight="fill" /> : c.kind === 'missed' ? <X size={14} weight="bold" /> : <i>{parseYmd(c.day).getDate()}</i>}
          </motion.span>
        ))}
      </div>
      <p className="cal-foot">
        <span className="good">{mDone} done</span>
        {mMissed > 0 && <span className="bad">{mMissed} missed</span>}
        {a.pass > 0 && <span>{a.pass} free {a.pass === 1 ? 'pass' : 'passes'} used</span>}
      </p>
    </Sheet>
  );
}
