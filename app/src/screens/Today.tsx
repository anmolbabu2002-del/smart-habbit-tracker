import { useState } from 'react';
import { LockSimple, LockSimpleOpen, Plus, ArrowRight } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { Mascot } from '../components/Mascot';
import { HabitRow, TaskRow } from '../components/Rows';
import { StreakFlame } from '../components/StreakFlame';
import { HabitIcon } from '../components/HabitIcon';
import { HabitEditor } from '../components/HabitEditor';
import { TaskEditor } from '../components/TaskEditor';
import { StreakSheet } from '../components/StreakSheet';
import { useApp } from '../lib/store';
import { doneToday } from '../lib/actions';
import { requiredHabits, LOCK_FROM } from '../lib/lock';
import { stageIndex, streakOf } from '../lib/streak';
import { dueInfo, longDay, today } from '../lib/dates';
import { play } from '../lib/sound';
import type { Habit, Task } from '../lib/types';

export function Today({ onProve, onFocus }: { onProve: (h: Habit) => void; onFocus: () => void }) {
  const s = useApp();
  const [editHabit, setEditHabit] = useState<Habit | null | undefined>(undefined); // undefined = closed, null = new
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined);
  const [streakOpen, setStreakOpen] = useState(false);

  const day = today();
  const required = requiredHabits(s);
  const done = required.filter(h => doneToday(h)).length;
  const left = required.length - done;
  const allDone = required.length > 0 && left === 0;
  const streak = streakOf(s);
  const hasOld = s.habits.some(h => h.createdAt < day);
  const afterFour = new Date().getHours() * 60 + new Date().getMinutes() >= LOCK_FROM;
  const lockOn = s.lock.enabled;

  const due = s.tasks.filter(t => { const g = dueInfo(t.due).group; return (g === 'today' || g === 'overdue') && (!t.doneAt || t.doneAt === day); })
    .sort((a, b) => Number(!!a.doneAt) - Number(!!b.doneAt) || (a.due || '').localeCompare(b.due || ''));
  const dueLeft = due.filter(t => !t.doneAt).length;

  let title = `${left} ${left === 1 ? 'habit' : 'habits'} to go!`;
  let line = lockOn ? (afterFour ? 'Your apps are locked until they’re done.' : 'Apps lock at 4 PM if they’re not done.') : 'You’ve got this.';
  if (!s.habits.length) { title = 'Let’s build your day!'; line = 'Add a habit you want to do every day.'; }
  else if (allDone) { title = 'All done for today!'; line = streak > 1 ? `That’s ${streak} days in a row.` : 'Come back tomorrow to start a streak.'; }
  else if (done === 0 && left > 2) title = `${left} habits today`;

  return (
    <main className="screen">
      <header className="today-head">
        <div>
          <small className="eyebrow">{longDay()}</small>
          <h1>Hey {s.name || 'there'}!</h1>
        </div>
        <button type="button" className={'streak-pill' + (streak ? '' : ' cold')} onClick={() => { play('tap'); setStreakOpen(true); }} aria-label={`${streak} day streak`}>
          <StreakFlame stage={stageIndex(streak)} size={28} />
          <b>{streak}</b>
        </button>
      </header>

      <section className={'card hero' + (allDone ? ' won' : '')}>
        <div className="hero-top">
          <Mascot size={58} mood={allDone ? 'cheer' : afterFour && left ? 'focus' : 'happy'} className="bob" />
          <div className="bubble"><b>{title}</b><span>{line}</span></div>
        </div>
        {required.length > 0 && (
          <div className="hero-progress">
            <div className="progress"><i style={{ width: `${(done / required.length) * 100}%` }} /></div>
            <b>{done}/{required.length}</b>
          </div>
        )}
        {lockOn && s.habits.length > 0 && (
          <div className={'lock-pill' + (allDone ? ' open' : '')}>
            {allDone ? <LockSimpleOpen size={18} weight="fill" /> : <LockSimple size={18} weight="fill" />}
            {allDone ? 'Apps unlocked for today' : afterFour ? '5 apps locked until habits are done' : '5 apps lock at 4 PM'}
          </div>
        )}
      </section>

      <h2 className="section-title">Habits
        <button type="button" className="add-mini" onClick={() => { play('tap'); setEditHabit(null); }} aria-label="Add habit"><Plus size={18} weight="bold" /></button>
      </h2>
      {s.habits.length ? (
        <div className="stack">
          {s.habits.map(h => <HabitRow key={h.id} h={h} isNew={hasOld && h.createdAt === day && !doneToday(h)} onOpen={() => setEditHabit(h)} onProve={() => onProve(h)} />)}
        </div>
      ) : (
        <button type="button" className="card empty" onClick={() => { play('tap'); setEditHabit(null); }}>
          <Plus size={22} weight="bold" /> Add your first habit
        </button>
      )}

      <h2 className="section-title">Due today
        {dueLeft > 0 ? <small>{dueLeft} left</small> : <button type="button" className="add-mini" onClick={() => { play('tap'); setEditTask(null); }} aria-label="Add task"><Plus size={20} weight="bold" /></button>}
      </h2>
      {due.length ? (
        <motion.div layout className="card list">{due.map(t => <TaskRow key={t.id} t={t} onOpen={() => setEditTask(t)} />)}</motion.div>
      ) : (
        <button type="button" className="card empty soft" onClick={() => { play('tap'); setEditTask(null); }}>Nothing due today. Add a task</button>
      )}

      <button type="button" className="card focus-cta" onClick={() => { play('tap'); onFocus(); }}>
        <span className="tile"><HabitIcon icon="clock" color="purple" size={30} /></span>
        <span><b>Start a focus session</b><small>Pick a task, lock the distractions, go.</small></span>
        <span className="go"><ArrowRight size={20} weight="bold" /></span>
      </button>

      <HabitEditor open={editHabit !== undefined} habit={editHabit} onClose={() => setEditHabit(undefined)} />
      <TaskEditor open={editTask !== undefined} task={editTask} defaultDue={day} onClose={() => setEditTask(undefined)} />
      <StreakSheet open={streakOpen} onClose={() => setStreakOpen(false)} />
    </main>
  );
}
