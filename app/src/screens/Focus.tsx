import { isShown } from '../lib/schedule';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LockSimple, CaretDown, Check, PencilSimple, Phone } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { Mascot } from '../components/Mascot';
import { HabitIcon } from '../components/HabitIcon';
import { Sheet } from '../components/Sheet';
import { useApp } from '../lib/store';
import { doneToday } from '../lib/actions';
import { fmtMinutes, today } from '../lib/dates';
import { endFocus, remainingMs, startFocus, weekMinutes, elapsedMs, weekGiveUps } from '../lib/focus';
import { needsPhoto } from '../lib/proof';
import { isNative, haptic } from '../lib/native';
import { onBack } from '../lib/back';
import { WhyQuote } from '../components/Why';
import { play } from '../lib/sound';
import type { ActiveFocus, Color, FocusRef } from '../lib/types';

type Pick = { key: string; label: string; icon: string; color: Color; kind: string; ref?: FocusRef };
const DURATIONS = [{ min: 25, name: 'Sprint' }, { min: 50, name: 'Deep' }, { min: 90, name: 'Monk' }];
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const QUIT_PRESSES = 10;

export function FocusSetup() {
  const s = useApp();
  const picks: Pick[] = useMemo(() => [
    ...s.habits.filter(h => isShown(h) && !doneToday(h))
      .map((h): Pick => ({ key: 'h' + h.id, label: h.name, icon: h.icon, color: h.color, kind: needsPhoto(h.name) ? 'Habit · prove with a photo after' : 'Habit · ticked off when you finish', ref: { kind: 'habit', id: h.id } }))
  ], [s.habits]);
  const [sel, setSel] = useState<string>(picks[0]?.key || 'other');
  const [other, setOther] = useState('');
  const [mins, setMins] = useState(s.focus.lastPlanned || 50);
  const [picker, setPicker] = useState(false);
  const chosen = picks.find(p => p.key === sel);
  const week = weekMinutes(s);
  const weekTotal = week.reduce((n, d) => n + d.minutes, 0);
  const max = Math.max(60, ...week.map(d => d.minutes));
  const todayIdx = week.findIndex(d => d.day === today());

  const start = () => {
    if (chosen) startFocus({ planned: mins, label: chosen.label, icon: chosen.icon, ref: chosen.ref, lock: true });
    else startFocus({ planned: mins, label: other.trim() || 'Deep work', icon: 'bulb', lock: true });
  };

  return (
    <main className="screen">
      <header className="page-head"><h1>Focus</h1></header>

      <section className="card focus-hero">
        <div className="fh-time"><b>{mins}</b><span>min</span></div>
        <div className="seg">
          {DURATIONS.map(d => (
            <button key={d.min} type="button" className={mins === d.min ? 'on' : ''} onClick={() => { play('toggle'); setMins(d.min); }}>{d.min}<small>{d.name}</small></button>
          ))}
        </div>
        <button type="button" className="fh-pick" onClick={() => { play('tap'); setPicker(true); }}>
          <span className="fh-pick-ico" style={{ background: `var(--${chosen?.color || 'yellow'}-soft)` }}><HabitIcon icon={chosen?.icon || 'bulb'} color={chosen?.color || 'yellow'} size={24} /></span>
          <span><small>Focus on</small><b>{chosen ? chosen.label : other || 'Something else…'}</b></span>
          <CaretDown size={18} weight="bold" />
        </button>
        <button type="button" className="btn big block" onClick={start}>Start focus</button>
        <p className="fh-note"><LockSimple size={14} weight="fill" /> {isNative ? 'Your whole phone locks until the timer ends. Calls still work.' : 'In the Android app, your whole phone locks until the timer ends.'}</p>
      </section>

      <section className="card week">
        <div className="week-head"><b>This week</b><span>{fmtMinutes(weekTotal)} deep work</span></div>
        {weekGiveUps(s) > 0 && <p className="giveups">Gave up {weekGiveUps(s)} {weekGiveUps(s) === 1 ? 'time' : 'times'} this week</p>}
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

      <Sheet open={picker} onClose={() => setPicker(false)} title="Focus on">
        <div className="pick-list">
          {picks.map(p => (
            <button key={p.key} type="button" className={'card pick' + (sel === p.key ? ' on' : '')} onClick={() => { play('toggle'); setSel(p.key); setPicker(false); }}>
              <span style={{ background: `var(--${p.color}-soft)` }}><HabitIcon icon={p.icon} color={p.color} size={26} /></span>
              <b>{p.label}</b><small>{p.kind}</small>
              {sel === p.key && <Check className="pick-check" size={20} weight="bold" />}
            </button>
          ))}
          <div className={'card pick other' + (sel === 'other' ? ' on' : '')} onClick={() => { if (sel !== 'other') { play('toggle'); setSel('other'); } }}>
            <span style={{ background: 'var(--yellow-soft)' }}><HabitIcon icon="bulb" color="yellow" size={26} /></span>
            {sel === 'other'
              ? <input className="pick-input" autoFocus placeholder="What will you work on?" value={other} maxLength={60} onChange={e => setOther(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setPicker(false); }} />
              : <b>Something else…</b>}
            {sel !== 'other' && <small><PencilSimple size={12} weight="bold" /> Type your own</small>}
          </div>
        </div>
      </Sheet>
    </main>
  );
}

const MESSAGES: [number, string][] = [[0, 'Settling in. Breathe and begin.'], [0.15, 'You’re in the zone. Keep going!'], [0.5, 'Halfway there!'], [0.8, 'Final stretch. Finish strong!'], [0.97, 'Almost done…']];

export function FocusRun({ a }: { a: ActiveFocus }) {
  const [, setTick] = useState(0);
  const [presses, setPresses] = useState(0);
  const halfPlayed = useRef(false);
  const ended = useRef(false);
  const resetTimer = useRef(0);
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
      if (progress < 0.55) { play('combo'); haptic.success(); }
    }
  });

  // The only way out: press Back ten times in a row
  useEffect(() => {
    const press = () => {
      clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setPresses(0), 4000);
      setPresses(n => {
        const next = n + 1;
        if (next >= QUIT_PRESSES && !ended.current) { ended.current = true; endFocus(false); }
        else { play('locked'); haptic.warning(); }
        return next;
      });
      return true;
    };
    const off = onBack(press);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') press(); };
    addEventListener('keydown', esc);
    // keep the screen on
    let lock: { release: () => Promise<void> } | null = null;
    const req = () => (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});
    req();
    const vis = () => { if (!document.hidden) req(); };
    document.addEventListener('visibilitychange', vis);
    return () => { off(); removeEventListener('keydown', esc); lock?.release().catch(() => {}); document.removeEventListener('visibilitychange', vis); clearTimeout(resetTimer.current); };
  }, []);

  const quitLeft = QUIT_PRESSES - presses;
  return (
    <motion.main className="focus-run" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
      <div className="run-top">
        <span className="run-task"><HabitIcon icon={a.icon} color="orange" size={24} />{a.label}</span>
      </div>
      <div className="ring-wrap">
        <svg width="280" height="280" viewBox="0 0 290 290" className="ring">
          <circle cx="145" cy="145" r={r} className="ring-bg" />
          <circle cx="145" cy="145" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} />
        </svg>
        <div className="ring-center">
          <Mascot size={70} mood="focus" />
          <b>{String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}</b>
          <small>of {a.planned} min</small>
        </div>
      </div>
      <p className="run-msg">{msg}</p>
      <div className="run-lock"><LockSimple size={16} weight="fill" /> {isNative ? 'Phone locked until the timer ends' : 'Phone lock works in the Android app'}</div>
      <div className="run-calls"><Phone size={14} weight="fill" /> Calls still work</div>
      <AnimatePresence>
        {presses > 0 && quitLeft > 0 && (
          <motion.div className="run-quit" key="quit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <WhyQuote className="on-dark" />
            Press back {quitLeft} more {quitLeft === 1 ? 'time' : 'times'} to give up · {fmtMinutes(Math.floor(elapsedMs(a) / 60000))} focused so far
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
