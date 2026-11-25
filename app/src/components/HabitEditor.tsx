import { useEffect, useState } from 'react';
import { Camera, CheckCircle, Trash } from '@phosphor-icons/react';
import { Sheet } from './Sheet';
import { HabitIcon, ICON_IDS, iconFor } from './HabitIcon';
import { deleteHabit, saveHabit } from '../lib/actions';
import { needsPhoto } from '../lib/proof';
import { play } from '../lib/sound';
import { COLORS, type Color, type Habit } from '../lib/types';

const PICKABLE = ICON_IDS.filter(i => !['flag', 'chat', 'gear'].includes(i));

export function HabitEditor({ open, habit, onClose }: { open: boolean; habit?: Habit | null; onClose: () => void }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('star');
  const [picked, setPicked] = useState(false); // user chose an icon themselves
  const [color, setColor] = useState<Color>('orange');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name || '');
    setIcon(habit?.icon || 'star');
    setPicked(!!habit);
    setColor(habit?.color || COLORS[Math.floor(Math.random() * COLORS.length)]);
    setConfirmDelete(false);
  }, [open, habit]);

  const onName = (v: string) => { setName(v); if (!picked) setIcon(v.trim() ? iconFor(v) : 'star'); };
  const save = () => { if (!name.trim()) return; saveHabit({ id: habit?.id, name, icon, color }); onClose(); };
  const photo = name.trim() ? needsPhoto(name) : null;

  return (
    <Sheet open={open} onClose={onClose} title={habit ? 'Edit habit' : 'New habit'}>
      <div className="editor">
        <div className="editor-preview" style={{ background: `var(--${color}-soft)` }}><HabitIcon icon={icon} color={color} size={64} /></div>
        <input className="field big" autoFocus={!habit} placeholder="e.g. Read 10 pages" value={name} maxLength={60}
          onChange={e => onName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} />
        {photo !== null && (
          <p className={'proof-note ' + (photo ? 'photo' : 'tick')}>
            {photo ? <><Camera size={18} weight="fill" /> You’ll prove this one with a live photo</> : <><CheckCircle size={18} weight="fill" /> A photo can’t show this, so it’s a simple tick</>}
          </p>
        )}

        <h3 className="field-label">Colour</h3>
        <div className="swatches">
          {COLORS.map(c => (
            <button key={c} type="button" className={'swatch' + (c === color ? ' on' : '')} style={{ background: `var(--${c})` }} aria-label={c}
              onClick={() => { play('toggle'); setColor(c); }} />
          ))}
        </div>

        <h3 className="field-label">Icon</h3>
        <div className="icon-grid">
          {PICKABLE.map(id => (
            <button key={id} type="button" className={'icon-pick' + (id === icon ? ' on' : '')} aria-label={id}
              onClick={() => { play('toggle'); setIcon(id); setPicked(true); }}>
              <HabitIcon icon={id} color={color} size={34} />
            </button>
          ))}
        </div>

        <button type="button" className="btn big block" disabled={!name.trim()} onClick={save}>{habit ? 'Save' : 'Add habit'}</button>
        {habit && (
          <button type="button" className={'btn block ghost danger' + (confirmDelete ? ' armed' : '')}
            onClick={() => { if (!confirmDelete) { play('tap'); setConfirmDelete(true); return; } if (deleteHabit(habit.id)) onClose(); }}>
            <Trash size={20} weight="bold" /> {confirmDelete ? 'Tap again to delete' : 'Delete habit'}
          </button>
        )}
      </div>
    </Sheet>
  );
}
