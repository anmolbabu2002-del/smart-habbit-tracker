import { Camera, Check, Ticket, Trash, PencilSimple, ArrowsClockwise } from '@phosphor-icons/react';
import { Swipe } from './Swipe';
import { motion } from 'motion/react';
import { centerOf } from '../lib/celebrate';
import { completeHabit, deleteHabit, deleteTask, doneToday, habitStreak, toggleTask, undoHabit } from '../lib/actions';
import { proofOf } from '../lib/proof';
import { dueInfo, today } from '../lib/dates';
import { play } from '../lib/sound';
import { HabitIcon } from './HabitIcon';
import { StreakFlame } from './StreakFlame';
import type { Habit, Task } from '../lib/types';

export function HabitRow({ h, onOpen, onProve, onView }: { h: Habit; onOpen: () => void; onProve: () => void; onView?: () => void }) {
  const done = doneToday(h);
  const mode = proofOf(h.name).mode;
  const photo = mode === 'photo';
  const viaPass = done && h.passDays?.includes(today());
  const streak = habitStreak(h);
  const sub = done ? (viaPass ? 'Free pass used' : 'Done today') : photo ? 'Prove it with a photo' : 'Tap when done';

  return (
    <Swipe holdOnly actions={[
      { label: 'Edit', icon: <PencilSimple size={20} weight="bold" />, tone: 'blue', run: onOpen },
      { label: 'Delete', icon: <Trash size={20} weight="bold" />, tone: 'red', run: () => deleteHabit(h.id) }
    ]}>
    <motion.div layout className={'card habit' + (done ? ' done' : '')} style={{ ['--hc' as string]: `var(--${h.color})` }}>
      <div className="habit-main" role="button" tabIndex={0} onClick={() => { if (onView) { play('tap'); onView(); } }}>
        <span className="habit-tile" style={{ background: `var(--${h.color}-soft)` }}><HabitIcon icon={h.icon} color={h.color} size={30} /></span>
        <span className="habit-text">
          <b>{h.name}</b>
          <small>
            {viaPass && <Ticket size={14} weight="fill" />}
            {!done && photo && <Camera size={14} weight="fill" />}
            {sub}
            {streak > 0 && <span className="mini-streak"><StreakFlame stage={2} size={16} still />{streak}</span>}
          </small>
        </span>
      </div>
      {done ? (
        <motion.button key="done" type="button" className="check-done" aria-label={`Undo ${h.name}`}
          initial={{ scale: 0.3, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 14 }}
          onClick={() => undoHabit(h.id)}>
          <Check size={22} weight="bold" />
        </motion.button>
      ) : photo ? (
        <button type="button" className="btn round" aria-label={`Prove ${h.name}`} onClick={() => { play('tap'); onProve(); }}><Camera size={22} weight="fill" /></button>
      ) : (
        <button type="button" className="btn round ghost" aria-label={`Mark ${h.name} done`} onClick={e => completeHabit(h.id, centerOf(e.currentTarget))}><Check size={22} weight="bold" /></button>
      )}
    </motion.div>
    </Swipe>
  );
}

export function TaskRow({ t, onOpen }: { t: Task; onOpen: () => void }) {
  const due = dueInfo(t.due);
  return (
    <Swipe actions={[{ label: 'Delete', icon: <Trash size={20} weight="bold" />, tone: 'red', run: () => deleteTask(t.id) }]}
      onSwipeRight={() => toggleTask(t.id, { x: 60, y: innerHeight / 2 })}>
    <motion.div layout className={'task' + (t.doneAt ? ' done' : '')} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }}>
      <button type="button" className={'task-check' + (t.doneAt ? ' on' : '')} aria-label={t.doneAt ? `Mark ${t.title} not done` : `Complete ${t.title}`}
        onClick={e => toggleTask(t.id, centerOf(e.currentTarget))}>
        {t.doneAt && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }}><Check size={16} weight="bold" /></motion.span>}
      </button>
      <button type="button" className="task-text" onClick={() => { play('tap'); onOpen(); }}>
        <b>{t.title}</b>
        {t.note && <small>{t.note}</small>}
      </button>
      {due.label && !t.doneAt && <span className={'due ' + due.tone}>{t.repeat && <ArrowsClockwise size={11} weight="bold" />}{due.label}</span>}
    </motion.div>
    </Swipe>
  );
}
