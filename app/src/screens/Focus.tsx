import { useEffect, useMemo, useRef, useState } from 'react';
import { LockSimple, Pause, Play, Stop, PencilSimple } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { Mascot } from '../components/Mascot';
import { HabitIcon } from '../components/HabitIcon';
import { useApp } from '../lib/store';
import { doneToday } from '../lib/actions';
import { dueInfo, fmtMinutes, today } from '../lib/dates';
import { endFocus, pauseFocus, remainingMs, resumeFocus, startFocus, weekMinutes, elapsedMs } from '../lib/focus';
import { isNative, haptic } from '../lib/native';
import { onBack } from '../lib/back';
import { play } from '../lib/sound';
import type { ActiveFocus, Color, FocusRef } from '../lib/types';

type Pick = { key: string; label: string; icon: string; color: Color; kind: string; ref?: FocusRef };
const DURATIONS = [{ min: 25, name: 'Sprint' }, { min: 50, name: 'Deep' }, { min: 90, name: 'Monk mode' }];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function FocusSetup() {
  const s = useApp();
  const tasks = s.tasks.filter(t => !t.doneAt && ['overdue', 'today', 'anytime'].includes(dueInfo(t.due).group)).slice(0, 3);
  const habits = s.habits.filter(h => !doneToday(h)).slice(0, 2);
  const picks: Pick[] = useMemo(() => [
    ...tasks.map((t): Pick => ({ key: 't' + t.id, label: t.title, icon: 'checklist', color: 'blue', kind: dueInfo(t.due).label ? `Task · ${dueInfo(t.due).label.toLowerCase()}` : 'Task', ref: { kind: 'task', id: t.id } })),
    ...habits.map((h): Pick => ({ key: 'h' + h.id, label: h.name, icon: h.icon, color: h.color, kind: 'Habit · a full session ticks it off', ref: { kind: 'habit', id: h.id } }))
  ], [tasks, habits]);
  const [sel, setSel] = useState<string>(picks[0]?.key || 'other');
  const [other, setOther] = useState('');
  const [mins, setMins] = useState(s.focus.lastPlanned || 50);
  const [lock, setLock] = useState(s.focus.lockApps);
  const week = weekMinutes(s);
  const weekTotal = week.reduce((n, d) => n + d.minutes, 0);
  const max = Math.max(60, ...week.map(d => d.minutes));
  const todayIdx = week.findIndex(d => d.day === today());
  const chosen = picks.find(p => p.key === sel);

  const start = () => {
    if (chosen) startFocus({ planned: mins, label: chosen.label, icon: chosen.icon, ref: chosen.ref, lock });
    else startFocus({ planned: mins, label: other || 'Deep work', icon: 'bulb', lock });
  };

  return (
    <main className="screen">
      <header className="page-head">
        <h1>Focus</h1>
        <p className="sub">Deep work. Apps locked. No excuses.</p>
      </header>

      <h2 className="section-title">Focus on</h2>
      <div className="pick-list">
        {picks.map(p => (
          <button key={p.key} type="button" className={'card pick' + (sel === p.key ? ' on' : '')} onClick={() => { play('toggle'); setSel(p.key); }}>
            <span style={{ background: `var(--${p.color}-soft)` }}><HabitIcon icon={p.icon} color={p.color} size={28} /></span>
            <b>{p.label}</b><small>{p.kind}</small>
          </button>
        ))}
        <div className={'card pick other' + (sel === 'other' ? ' on' : '')} onClick={() => { if (sel !== 'other') { play('toggle'); setSel('other'); } }}>
          <span style={{ background: 'var(--yellow-soft)' }}><HabitIcon icon="bulb" color="yellow" size={28} /></span>
          {sel === 'other'
            ? <input className="pick-input" autoFocus placeholder="What will you work on?" value={other} maxLength={60} onChange={e => setOther(e.target.value)} />
            : <b>Something else…</b>}
          {sel !== 'other' && <small><PencilSimple size={12} weight="bold" /> Type your own</small>}
        </div>
      </div>

      <h2 className="section-title">How long?</h2>
      <div className="durations">
        {DURATIONS.map(d => (
          <button key={d.min} type="button" className={'card dur' + (mins === d.min ? ' on' : '')} onClick={() => { play('toggle'); setMins(d.min); }}>
            <b>{d.min}</b><small>min</small><em>{d.name}</em>
          </button>
        ))}
      </div>

      <button type="button" className="card lock-row" onClick={() => { play('toggle'); setLock(l => !l); }} aria-pressed={lock}>
        <span className="lock-ico"><LockSimple size={24} weight="fill" /></span>
        <span><b>Lock social apps</b><small>{isNative ? 'Instagram · YouTube · Facebook · Snapchat · TikTok' : 'Works in the Android app'}</small></span>
        <span className={'switch' + (lock ? ' on' : '')}><i /></span>
      </button>

      <section className="card week">
        <div className="week-head"><b>This week</b><span>{fmtMinutes(weekTotal)} deep work</span></div>
        <div className="bars">
          {week.map((d, i) => (
            <div key={d.day} className={'bar' + (i === todayIdx ? ' today' : '')}>
              {d.minutes > 0 && <em>{d.minutes >= 60 ? fmtMinutes(d.minutes) : d.minutes}</em>}
              <i style={{ height: `${Math.max(6, (d.minutes / max) * 100)}%` }} />
              <small>{DAYS[i]}</small>
            </div>
          ))}
        </div>
      </section>

      <button type="button" className="btn big block start" disabled={!chosen && sel !== 'other'} onClick={start}>Start focus · {mins} min</button>
    </main>
  );
}

const MESSAGES: [number, string][] = [[0, 'Settling in. Breathe and begin.'], [0.15, 'You’re in the zone. Keep going!'], [0.5, 'Halfway there!'], [0.8, 'Final stretch. Finish strong!'], [0.97, 'Almost done…']];

export function FocusRun({ a }: { a: ActiveFocus }) {
  const [, setTick] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const halfPlayed = useRef(false);
  const ended = useRef(false);
  const left = remainingMs(a);
  const total = a.planned * 60000;
  const progress = 1 - left / total;
  const r = 120, c = 2 * Math.PI * r;
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  const msg = [...MESSAGES].reverse().find(([k]) => progress >= k)![1];

  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(iv);
  }, []);
  useEffect(() => {
    if (left <= 0 && !ended.current) { ended.current = true; endFocus(true); }
    if (progress >= 0.5 && !halfPlayed.current) {
      halfPlayed.current = true;
      if (progress < 0.55) { play('combo'); haptic.success(); } // only when you're there to hear it
    }
  });
  // keep the screen on while focusing
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const req = () => (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});
    req();
    const vis = () => { if (!document.hidden) req(); };
    document.addEventListener('visibilitychange', vis);
    const off = onBack(() => { setConfirm(true); return true; });
    return () => { lock?.release().catch(() => {}); document.removeEventListener('visibilitychange', vis); off(); };
  }, []);

  return (
    <motion.main className={'focus-run' + (a.pausedAt ? ' paused' : '')} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
      <div className="run-top">
        <span className="run-task"><HabitIcon icon={a.icon} color="orange" size={26} />{a.label}</span>
      </div>
      <div className="ring-wrap">
        <svg width="290" height="290" viewBox="0 0 290 290" className="ring">
          <circle cx="145" cy="145" r={r} className="ring-bg" />
          <circle cx="145" cy="145" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
        </svg>
        <div className="ring-center">
          <Mascot size={78} mood={a.pausedAt ? 'sleepy' : 'focus'} />
          <b>{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</b>
          <small>{a.pausedAt ? 'Paused' : `of ${a.planned} min`}</small>
        </div>
      </div>
      <p className="run-msg">{a.pausedAt ? 'Take a breath. Apps stay locked.' : msg}</p>
      {a.lock && <div className="run-lock"><LockSimple size={18} weight="fill" /> {isNative ? '5 apps locked until the timer ends' : 'Apps lock in the Android app'}</div>}
      <div className="run-actions">
        {a.pausedAt
          ? <button type="button" className="btn ghost-white" onClick={resumeFocus}><Play size={22} weight="fill" /> Resume</button>
          : <button type="button" className="btn ghost-white" onClick={pauseFocus}><Pause size={22} weight="fill" /> Pause</button>}
        <button type="button" className="btn round ghost-white" aria-label="End session" onClick={() => { play('tap'); setConfirm(true); }}><Stop size={22} weight="fill" /></button>
      </div>

      <AnimatePresence>
        {confirm && (
          <motion.div className="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="confirm-card" initial={{ y: 40, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40 }}>
              <Mascot size={70} mood="sleepy" />
              <b>End the session early?</b>
              <span>You’ve focused {fmtMinutes(Math.floor(elapsedMs(a) / 60000))}. That still counts{a.ref?.kind === 'habit' ? ', but the habit won’t be ticked off' : ''}.</span>
              <button type="button" className="btn big block" onClick={() => { play('tap'); setConfirm(false); }}>Keep going</button>
              <button type="button" className="btn block ghost danger" onClick={() => { setConfirm(false); endFocus(false); }}>End now</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
