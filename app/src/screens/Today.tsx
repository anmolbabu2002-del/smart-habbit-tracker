import { useEffect, useState } from 'react';
import { LockSimple, Plus, ArrowRight, CaretDown } from '@phosphor-icons/react';
import { Mascot } from '../components/Mascot';
import { HabitRow } from '../components/Rows';
import { StreakFlame } from '../components/StreakFlame';
import { EmptyHabits } from '../components/EmptyHabits';
import { WhyLine } from '../components/Why';
import { HabitCalendar } from '../components/HabitCalendar';
import { HabitEditor } from '../components/HabitEditor';
import { StreakSheet } from '../components/StreakSheet';
import { useApp } from '../lib/store';
import { doneToday } from '../lib/actions';
import { requiredHabits, pendingHabits, shownHabits, LOCK_APPS, LOCK_FROM, LOCK_UNTIL, lockStatus, openUsageAccess, openOverlay, type LockStatus } from '../lib/lock';
import { isNative } from '../lib/native';
import { stageIndex, streakOf } from '../lib/streak';
import { longDay, today } from '../lib/dates';
import { journal, openReflection, reflectedToday } from '../lib/reflect';
import { play } from '../lib/sound';
import { readUsage, type Usage } from '../lib/usage';
import { bubbleFor } from '../lib/bubble';
import type { Habit } from '../lib/types';

export function Today({ onProve }: { onProve: (h: Habit) => void }) {
  const s = useApp();
  const entries = journal.use();
  const [editHabit, setEditHabit] = useState<Habit | null | undefined>(undefined); // undefined = closed, null = new
  const [streakOpen, setStreakOpen] = useState(false);
  const [calHabit, setCalHabit] = useState<Habit | null>(null);

  const day = today();
  const required = requiredHabits(s);
  const done = required.filter(h => doneToday(h)).length;
  const left = required.length - done;
  const allDone = required.length > 0 && (left === 0 || s.perfectDays.includes(day));
  const streak = streakOf(s);
  const shown = shownHabits(s);
  const offToday = s.habits.filter(h => !shown.includes(h));
  const [showOff, setShowOff] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [now, setNow] = useState(() => new Date());
  // screen time: on open, when coming back to the app, and every 2 minutes
  useEffect(() => {
    let alive = true;
    const load = () => { setNow(new Date()); readUsage().then(u => { if (alive) setUsage(u); }); };
    load();
    let n = 0;
    const t = setInterval(() => { if (++n % 2) setNow(new Date()); else load(); }, 60000); // clock every minute, screen time every 2
    const v = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', v);
    return () => { alive = false; clearInterval(t); document.removeEventListener('visibilitychange', v); };
  }, [done]);
  const lockOn = s.lock.enabled;


  const bubble = bubbleFor({
    habits: s.habits.length, dueToday: required.length, optional: shown.filter(h => !required.includes(h) && !doneToday(h)).map(h => h.name.trim()), hadHabits: !!s.hadHabits, bestStreak: s.bestStreak, left: pendingHabits(s).map(h => h.name.trim()), allDone, lockOn, lockFrom: LOCK_FROM, lockUntil: LOCK_UNTIL,
    lockApps: LOCK_APPS.length, now, streak, focusMinutes: s.focus.lastPlanned || 50, usage, reflected: reflectedToday(entries)
  });

  return (
    <main className="screen">
      <header className="today-head">
        <div>
          <small className="eyebrow">{longDay()}</small>
          <WhyLine />
        </div>
        <button type="button" className={'streak-pill' + (streak ? '' : ' cold')} onClick={() => { play('tap'); setStreakOpen(true); }} aria-label={`${streak} day streak`}>
          <StreakFlame stage={stageIndex(streak)} size={28} />
          <b>{streak}</b>
        </button>
      </header>

      {s.lock.enabled && <PermCard />}

      <section className={'card hero' + (allDone ? ' won' : '')}>
        <div className="hero-top">
          <Mascot size={58} mood={bubble?.mood || 'happy'} />
          {bubble?.reflect
            ? <button type="button" className="bubble tap" onClick={() => { play('tap'); openReflection(); }}><b>{bubble.title}</b><span>{bubble.line}</span></button>
            : <div className="bubble"><b>{bubble?.title}</b><span>{bubble?.line}</span></div>}
        </div>
        {required.length > 0 && (
          <div className="hero-progress">
            <div className="progress"><i style={{ width: `${(done / required.length) * 100}%` }} /></div>
            <b>{done}/{required.length}</b>
          </div>
        )}
      </section>

      <h2 className="section-title">Habits
        <button type="button" className="add-mini" onClick={() => { play('tap'); setEditHabit(null); }} aria-label="Add habit"><Plus size={18} weight="bold" /></button>
      </h2>
      {s.habits.length ? (
        <>
          <div className="stack">
            {shown.map(h => <HabitRow key={h.id} h={h} onOpen={() => setEditHabit(h)} onProve={() => onProve(h)} onView={() => setCalHabit(h)} />)}
          </div>
          {offToday.length > 0 && (
            <div className="not-today">
              <button type="button" className="not-today-head" onClick={() => { play('tap'); setShowOff(v => !v); }} aria-expanded={showOff}>
                <span>Not today <small>{offToday.length}</small></span>
                <CaretDown size={16} weight="bold" className={showOff ? 'up' : ''} />
              </button>
              {showOff && <div className="stack">
                {offToday.map(h => <HabitRow key={h.id} h={h} off onOpen={() => setEditHabit(h)} onProve={() => onProve(h)} onView={() => setCalHabit(h)} />)}
              </div>}
            </div>
          )}
        </>
      ) : (
        <EmptyHabits onCustom={() => setEditHabit(null)} />
      )}

      <HabitEditor open={editHabit !== undefined} habit={editHabit} onClose={() => setEditHabit(undefined)} />
      <StreakSheet open={streakOpen} onClose={() => setStreakOpen(false)} />
      <HabitCalendar habit={calHabit} onClose={() => setCalHabit(null)} />
    </main>
  );
}

/** Habit Lock (and Focus) need two Android permissions; nag gently until both are allowed */
function PermCard() {
  const [st, setSt] = useState<LockStatus | null>(null);
  useEffect(() => {
    if (!isNative) return;
    const check = () => lockStatus().then(setSt);
    check();
    const v = () => { if (!document.hidden) check(); };
    document.addEventListener('visibilitychange', v);
    return () => document.removeEventListener('visibilitychange', v);
  }, []);
  if (!st || (st.usageAccess && st.overlay)) return null;
  const missing = !st.usageAccess ? 'Usage access' : 'Display over other apps';
  return (
    <button type="button" className="card perm-card" onClick={() => { play('tap'); (!st.usageAccess ? openUsageAccess() : openOverlay()).catch(() => {}); }}>
      <span className="set-ico orange"><LockSimple size={20} weight="fill" /></span>
      <span><b>Habit Lock can’t lock apps yet</b><small>Tap to allow “{missing}” for Ultradian</small></span>
      <ArrowRight size={18} weight="bold" />
    </button>
  );
}
