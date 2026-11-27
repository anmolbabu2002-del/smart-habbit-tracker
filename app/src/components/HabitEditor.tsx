// A small, friendly sheet: tap the icon to change it, type the name, done. Colour comes from
// the icon, so there's nothing else to decide.
import { useEffect, useState } from 'react';
import { Camera, CheckCircle, Trash } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { Sheet } from './Sheet';
import { HabitIcon, HABIT_ICONS, iconFor, colorFor } from './HabitIcon';
import { requestDeleteHabit, saveHabit } from '../lib/actions';
import { proofOf } from '../lib/proof';
import { play } from '../lib/sound';
import type { Habit, Schedule } from '../lib/types';
import { DAILY, MIN_PER_WEEK, normalise, sameSchedule, upcomingSchedule } from '../lib/schedule';
import { today } from '../lib/dates';

const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Every day / certain days (3+) / times a week (3–6). Kept to one compact block. */
function RepeatPicker({ value, onChange, changed }: { value: Schedule; onChange: (s: Schedule) => void; changed: boolean }) {
  const [warn, setWarn] = useState(0);
  const kind = value.kind;
  const pick = (k: Schedule['kind']) => {
    if (k === kind) return;
    play('toggle');
    onChange(k === 'days' ? { kind: 'days', days: [1, 2, 3, 4, 5] } : k === 'weekly' ? { kind: 'weekly', times: MIN_PER_WEEK } : DAILY);
  };
  const toggleDay = (d: number) => {
    if (value.kind !== 'days') return;
    const on = value.days.includes(d);
    if (on && value.days.length <= MIN_PER_WEEK) { play('locked'); setWarn(w => w + 1); return; }
    play('tap');
    const days = on ? value.days.filter(x => x !== d) : [...value.days, d];
    onChange(days.length >= 7 ? DAILY : { kind: 'days', days });
  };
  const times = value.kind === 'weekly' ? value.times : MIN_PER_WEEK;
  const step = (n: number) => {
    const t = times + n;
    if (t < MIN_PER_WEEK) { play('locked'); setWarn(w => w + 1); return; }
    if (t > 6) { play('toggle'); onChange(DAILY); return; } // 7 a week is every day
    play('tap');
    onChange({ kind: 'weekly', times: t });
  };
  return (
    <div className="repeat">
      <div className="seg three" role="radiogroup" aria-label="Repeat">
        {([['daily', 'Every day'], ['days', 'Certain days'], ['weekly', 'Times a week']] as const).map(([k, label]) => (
          <button key={k} type="button" role="radio" aria-checked={kind === k} className={kind === k ? 'on' : ''} onClick={() => pick(k)}>{label}</button>
        ))}
      </div>
      {value.kind === 'days' && (
        <motion.div key={'d' + warn} className="rp-days" animate={warn ? { x: [0, -6, 6, -4, 4, 0] } : undefined} transition={{ duration: 0.35 }}>
          {WEEK.map(d => (
            <button key={d} type="button" className={'rp-day' + (value.days.includes(d) ? ' on' : '')} aria-pressed={value.days.includes(d)} onClick={() => toggleDay(d)}>{LETTER[d]}</button>
          ))}
        </motion.div>
      )}
      {value.kind === 'weekly' && (
        <motion.div key={'w' + warn} className="rp-times" animate={warn ? { x: [0, -6, 6, -4, 4, 0] } : undefined} transition={{ duration: 0.35 }}>
          <button type="button" className="rp-step" aria-label="Fewer" onClick={() => step(-1)} disabled={times <= MIN_PER_WEEK}>−</button>
          <b>{times} times a week</b>
          <button type="button" className="rp-step" aria-label="More" onClick={() => step(1)}>+</button>
        </motion.div>
      )}
      <p className="rp-note">
        {value.kind === 'days' ? `At least ${MIN_PER_WEEK} days. It only shows up, and only counts, on these days.`
          : value.kind === 'weekly' ? `Do it on any ${times} days each week. If you fall behind, it’ll show “due today”.`
          : 'Shows up and counts every day.'}
        {changed && <b> Starts tomorrow.</b>}
      </p>
    </div>
  );
}

export function HabitEditor({ open, habit, onClose }: { open: boolean; habit?: Habit | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('star');
  const [picked, setPicked] = useState(false);
  const [icons, setIcons] = useState(false);
  const [sch, setSch] = useState<Schedule>(DAILY);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name || '');
    setIcon(habit?.icon || 'star');
    setPicked(!!habit);
    setIcons(false);
    setSch(habit ? upcomingSchedule(habit) : DAILY);
  }, [open, habit]);

  const onName = (v: string) => { setName(v); if (!picked) setIcon(v.trim() ? iconFor(v) : 'star'); };
  const save = () => { if (!name.trim()) return; saveHabit({ id: habit?.id, name, icon, color: colorFor(icon), schedule: sch }); onClose(); };
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
      <RepeatPicker value={sch} onChange={setSch} changed={!!habit && habit.createdAt !== today() && !sameSchedule(normalise(sch), upcomingSchedule(habit))} />
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
        {habit && <button type="button" className="rd-ic danger" onClick={() => { if (requestDeleteHabit(habit.id)) onClose(); }} aria-label="Delete habit"><Trash size={22} weight="bold" /></button>}
        <button type="button" className="btn block" disabled={!name.trim()} onClick={save}>{habit ? 'Save' : 'Add habit'}</button>
      </div>
    </Sheet>
  );
}
