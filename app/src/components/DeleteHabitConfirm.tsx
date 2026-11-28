// "Delete Workout? Its 23-day streak goes with it." Shown before deleting a habit that has
// done days. Keeping it is the big button; deleting is the small red one.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../lib/store';
import { deleteHabit } from '../lib/actions';
import { habitStreak } from '../lib/streak';
import { onBack } from '../lib/back';
import { play } from '../lib/sound';
import { HabitIcon } from './HabitIcon';

export function DeleteHabitConfirm() {
  const s = useApp();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const ask = (e: Event) => { play('pop'); setId((e as CustomEvent<string>).detail); };
    addEventListener('ask-delete-habit', ask);
    return () => removeEventListener('ask-delete-habit', ask);
  }, []);
  useEffect(() => (id ? onBack(() => { setId(null); return true; }) : undefined), [id]);

  const h = id ? s.habits.find(x => x.id === id) : undefined;
  const st = h ? habitStreak(s, h) : { n: 0, unit: 'day' as const };
  const streak = st.n;
  const days = h ? h.history.length : 0;
  const what = streak > 1
    ? `Its ${streak}-${st.unit} streak and all ${days} done days go with it.`
    : `All ${days} done ${days === 1 ? 'day goes' : 'days go'} with it.`;

  return (
    <AnimatePresence>
      {h && (
        <motion.div className="confirm coach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setId(null)}>
          <motion.div className="confirm-card" onClick={e => e.stopPropagation()}
            initial={{ y: 40, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
            <span className="del-ico" style={{ background: `var(--${h.color}-soft)` }}><HabitIcon icon={h.icon} color={h.color} size={34} /></span>
            <b>Delete “{h.name}”?</b>
            <span>{what} This can’t be undone.</span>
            <button type="button" className="btn big block mint" onClick={() => { play('tap'); setId(null); }}>Keep it</button>
            <button type="button" className="coach-no danger" onClick={() => { deleteHabit(h.id); setId(null); }}>Delete</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
