import { Camera, Check, Ticket, Trash, PencilSimple, IdentificationBadge } from '@phosphor-icons/react';
import { Swipe } from './Swipe';
import { motion } from 'motion/react';
import { centerOf } from '../lib/celebrate';
import { completeHabit, requestDeleteHabit, doneToday, undoHabit } from '../lib/actions';
import { describe, doneThisWeek, isRequired, sameSchedule, scheduleOn, upcomingSchedule, weekTarget } from '../lib/schedule';
import { proofOf } from '../lib/proof';
import { today } from '../lib/dates';
import { play } from '../lib/sound';
import { HabitIcon } from './HabitIcon';
import { votesOf } from '../lib/identity';
import { WeekStrip } from './WeekStrip';
import type { Habit } from '../lib/types';

export function HabitRow({ h, onOpen, onProve, onView, off }: { h: Habit; onOpen: () => void; onProve: () => void; onView?: () => void; off?: boolean }) {
  const done = doneToday(h);
  const mode = proofOf(h.name).mode;
  const photo = mode === 'photo';
  const viaPass = done && h.passDays?.includes(today());
  const votes = votesOf(h); // the fire is the app's one streak; a habit shows its votes
  const sch = scheduleOn(h);
  // a schedule change starts tomorrow; show it now so it doesn't look unsaved
  const next = upcomingSchedule(h);
  const changing = !off && !sameSchedule(sch, next);
  const week = sch.kind === 'weekly' ? `${doneThisWeek(h)} of ${weekTarget(h)} this week` : '';
  const sub = off ? describe(next)
    : changing ? `${describe(next)} · starts tomorrow`
    : done ? (viaPass ? 'Free pass used' : week || 'Done today')
    : week ? (isRequired(h) ? `${week} · due today` : week)
    : photo ? 'Prove it with a photo' : 'Tap when done';

  return (
    <Swipe holdOnly actions={[
      { label: 'Edit', icon: <PencilSimple size={20} weight="bold" />, tone: 'blue', run: onOpen },
      { label: 'Delete', icon: <Trash size={20} weight="bold" />, tone: 'red', run: () => requestDeleteHabit(h.id) }
    ]}>
    <motion.div layout className={'card habit' + (done ? ' done' : '') + (off ? ' off' : '')} style={{ ['--hc' as string]: `var(--${h.color})`, ['--hs' as string]: `var(--${h.color}-soft)` }}>
      <div className="habit-main" role="button" tabIndex={0} onClick={() => { if (onView) { play('tap'); onView(); } }}>
        <span className="habit-tile" style={{ background: `var(--${h.color}-soft)` }}><HabitIcon icon={h.icon} color={h.color} size={30} /></span>
        <span className="habit-text">
          <b>{h.name}</b>
          <small>
            {viaPass && <Ticket size={14} weight="fill" />}
            {sch.kind === 'days' || next.kind === 'days' ? <WeekStrip h={h} /> : <>
              {!done && !off && !changing && photo && <Camera size={14} weight="fill" />}
              {sub}
            </>}
            {votes > 0 && !off && <span className="mini-votes" aria-label={`${votes} ${votes === 1 ? 'vote' : 'votes'}`}><IdentificationBadge size={15} weight="fill" />{votes}</span>}
          </small>
        </span>
      </div>
      {off ? null : done ? (
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
