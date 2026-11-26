// A small, friendly sheet: tap the icon to change it, type the name, done. Colour comes from
// the icon, so there's nothing else to decide.
import { useEffect, useState } from 'react';
import { Camera, CheckCircle, Trash } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { Sheet } from './Sheet';
import { HabitIcon, HABIT_ICONS, iconFor, colorFor } from './HabitIcon';
import { deleteHabit, saveHabit } from '../lib/actions';
import { proofOf } from '../lib/proof';
import { play } from '../lib/sound';
import type { Habit } from '../lib/types';

export function HabitEditor({ open, habit, onClose }: { open: boolean; habit?: Habit | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('star');
  const [picked, setPicked] = useState(false);
  const [icons, setIcons] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name || '');
    setIcon(habit?.icon || 'star');
    setPicked(!!habit);
    setIcons(false);
  }, [open, habit]);

  const onName = (v: string) => { setName(v); if (!picked) setIcon(v.trim() ? iconFor(v) : 'star'); };
  const save = () => { if (!name.trim()) return; saveHabit({ id: habit?.id, name, icon, color: colorFor(icon) }); onClose(); };
  const proof = name.trim() ? proofOf(name) : null;
  const color = colorFor(icon);

  return (
    <Sheet open={open} onClose={onClose} title={habit ? 'Edit habit' : 'New habit'} className="habit-sheet">
      <div className="hs-row">
        <button type="button" className={'hs-icon' + (icons ? ' on' : '')} style={{ background: `var(--${color}-soft)` }} onClick={() => { play('tap'); setIcons(i => !i); }} aria-label="Change icon">
          <HabitIcon icon={icon} color={color} size={34} />
        </button>
        <input className="field" autoFocus={!habit} placeholder="e.g. Read 10 pages" value={name} maxLength={50}
          onChange={e => onName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} />
      </div>
      {proof && (
        <p className={'proof-note ' + proof.mode}>
          {proof.mode === 'photo' ? <><Camera size={16} weight="fill" /> Proved with a live photo</> : <><CheckCircle size={16} weight="fill" /> A simple tick</>}
        </p>
      )}
      <AnimatePresence initial={false}>
        {icons && (
          <motion.div className="icon-grid" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            {HABIT_ICONS.map(id => (
              <button key={id} type="button" className={'icon-pick' + (id === icon ? ' on' : '')} aria-label={id}
                onClick={() => { play('toggle'); setIcon(id); setPicked(true); setIcons(false); }}>
                <HabitIcon icon={id} color={colorFor(id)} size={26} />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="hs-actions">
        {habit && <button type="button" className="rd-ic danger" onClick={() => { if (deleteHabit(habit.id)) onClose(); }} aria-label="Delete habit"><Trash size={22} weight="bold" /></button>}
        <button type="button" className="btn block" disabled={!name.trim()} onClick={save}>{habit ? 'Save' : 'Add habit'}</button>
      </div>
    </Sheet>
  );
}
