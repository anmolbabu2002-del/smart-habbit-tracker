import { useEffect, useState } from 'react';
import { Trash } from '@phosphor-icons/react';
import { Sheet } from './Sheet';
import { addTask, deleteTask, editTask } from '../lib/actions';
import { addDays, today, weekOf, prettyDay } from '../lib/dates';
import { play } from '../lib/sound';
import type { Task } from '../lib/types';

export function DuePicker({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const t = today();
  const nextMon = addDays(weekOf(t), 7);
  const opts: [string, string | undefined][] = [['Today', t], ['Tomorrow', addDays(t, 1)], ['Next week', nextMon], ['No date', undefined]];
  const custom = value && !opts.some(o => o[1] === value);
  return (
    <div className="chips wrap">
      {opts.map(([label, v]) => (
        <button key={label} type="button" className={'chip' + (value === v ? ' on' : '')} onClick={() => { play('toggle'); onChange(v); }}>{label}</button>
      ))}
      <label className={'chip date' + (custom ? ' on' : '')}>
        {custom ? prettyDay(value!) : 'Pick a date'}
        <input type="date" min={t} value={value || ''} onChange={e => { play('toggle'); onChange(e.target.value || undefined); }} />
      </label>
    </div>
  );
}

export function TaskEditor({ open, task, defaultDue, onClose }: { open: boolean; task?: Task | null; defaultDue?: string; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [due, setDue] = useState<string | undefined>();
  useEffect(() => {
    if (!open) return;
    setTitle(task?.title || '');
    setNote(task?.note || '');
    setDue(task ? task.due : defaultDue);
  }, [open, task, defaultDue]);

  const save = () => {
    if (!title.trim()) return;
    if (task) { editTask(task.id, { title, note, due }); play('pop'); } else addTask({ title, note, due });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'}>
      <div className="editor">
        <input className="field big" autoFocus={!task} placeholder="What needs doing?" value={title} maxLength={120}
          onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} />
        <textarea className="field" rows={3} placeholder="Note (optional)" value={note} maxLength={500} onChange={e => setNote(e.target.value)} />
        <h3 className="field-label">Due</h3>
        <DuePicker value={due} onChange={setDue} />
        <button type="button" className="btn big block" disabled={!title.trim()} onClick={save}>{task ? 'Save' : 'Add task'}</button>
        {task && (
          <button type="button" className="btn block ghost danger" onClick={() => { deleteTask(task.id); onClose(); }}>
            <Trash size={20} weight="bold" /> Delete task
          </button>
        )}
      </div>
    </Sheet>
  );
}
