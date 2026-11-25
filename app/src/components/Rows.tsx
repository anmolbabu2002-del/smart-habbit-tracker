import { Camera, Check, Ticket } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { centerOf } from '../lib/celebrate';
import { completeHabit, doneToday, habitStreak, toggleTask, undoHabit } from '../lib/actions';
import { needsPhoto } from '../lib/proof';
import { dueInfo, today } from '../lib/dates';
import { play } from '../lib/sound';
import { HabitIcon } from './HabitIcon';
import { StreakFlame } from './StreakFlame';
import type { Habit, Task } from '../lib/types';

export function HabitRow({ h, isNew, onOpen, onProve }: { h: Habit; isNew?: boolean; onOpen: () => void; onProve: () => void }) {
  const done = doneToday(h);
  const photo = needsPhoto(h.name);
  const viaPass = done && h.passDays?.includes(today());
  const streak = habitStreak(h);
  const sub = done ? (viaPass ? 'Free pass used' : 'Done today') : isNew ? 'New · counts from tomorrow' : photo ? 'Prove it with a photo' : 'Tap when done';

  return (
    <motion.div layout className={'card habit' + (done ? ' done' : '')} style={{ ['--hc' as string]: `var(--${h.color})` }}>
      <button type="button" className="habit-main" onClick={() => { play('tap'); onOpen(); }}>
        <span className="habit-tile" style={{ background: `var(--${h.color}-soft)` }}><HabitIcon icon={h.icon} color={h.color} size={38} /></span>
        <span className="habit-text">
          <b>{h.name}</b>
          <small>
            {viaPass && <Ticket size={14} weight="fill" />}
            {!done && photo && !isNew && <Camera size={14} weight="fill" />}
            {sub}
            {streak > 0 && <span className="mini-streak"><StreakFlame stage={2} size={16} still />{streak}</span>}
          </small>
        </span>
      </button>
      {done ? (
        <motion.button key="done" type="button" className="check-done" aria-label={`Undo ${h.name}`}
          initial={{ scale: 0.3, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          onClick={() => undoHabit(h.id)}>
          <Check size={28} weight="bold" />
        </motion.button>
      ) : photo ? (
        <button type="button" className="btn round" aria-label={`Prove ${h.name} with a photo`} onClick={() => { play('tap'); onProve(); }}><Camera size={26} weight="fill" /></button>
      ) : (
        <button type="button" className="btn round ghost" aria-label={`Mark ${h.name} done`} onClick={e => completeHabit(h.id, centerOf(e.currentTarget))}><Check size={26} weight="bold" /></button>
      )}
    </motion.div>
  );
}

export function TaskRow({ t, onOpen }: { t: Task; onOpen: () => void }) {
  const due = dueInfo(t.due);
  return (
    <motion.div layout className={'task' + (t.doneAt ? ' done' : '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}>
      <button type="button" className={'task-check' + (t.doneAt ? ' on' : '')} aria-label={t.doneAt ? `Mark ${t.title} not done` : `Complete ${t.title}`}
        onClick={e => toggleTask(t.id, centerOf(e.currentTarget))}>
        {t.doneAt && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }}><Check size={18} weight="bold" /></motion.span>}
      </button>
      <button type="button" className="task-text" onClick={() => { play('tap'); onOpen(); }}>
        <b>{t.title}</b>
        {t.note && <small>{t.note}</small>}
      </button>
      {due.label && !t.doneAt && <span className={'due ' + due.tone}>{due.label}</span>}
    </motion.div>
  );
}
