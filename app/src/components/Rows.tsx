import { Camera, Check } from '@phosphor-icons/react';

export type Habit = { id: string; name: string; emoji: string; color: string; proof: 'photo' | 'tick'; done: boolean; streak?: number };
export type Task = { id: string; title: string; note?: string; due?: 'overdue' | 'today' | 'tomorrow' | string; done?: boolean };

export function HabitRow({ h }: { h: Habit }) {
  return (
    <div className={'card habit' + (h.done ? ' done' : '')}>
      <span className="habit-tile" style={{ background: `var(--${h.color}-soft)` }}>{h.emoji}</span>
      <span className="habit-text">
        <b>{h.name}</b>
        <small>{h.done ? 'Done today' : h.proof === 'photo' ? '📷 Show it with a photo' : 'Tap when done'}</small>
      </span>
      {h.done ? (
        <span className="check-done" aria-label="Done"><Check size={26} weight="bold" /></span>
      ) : h.proof === 'photo' ? (
        <button type="button" className="btn round" aria-label={`Prove ${h.name}`}><Camera size={26} weight="fill" /></button>
      ) : (
        <button type="button" className="btn round ghost" aria-label={`Mark ${h.name} done`}><Check size={24} weight="bold" /></button>
      )}
    </div>
  );
}

const DUE: Record<string, { label: string; cls: string }> = {
  overdue: { label: 'Yesterday', cls: 'red' },
  today: { label: 'Today', cls: 'orange' },
  tomorrow: { label: 'Tomorrow', cls: 'blue' }
};

export function TaskRow({ t }: { t: Task }) {
  const due = t.due ? DUE[t.due] || { label: t.due, cls: 'purple' } : null;
  return (
    <div className={'task' + (t.done ? ' done' : '')}>
      <button type="button" className={'task-check' + (t.done ? ' on' : '')} aria-label={t.done ? 'Completed' : 'Complete task'}>
        {t.done && <Check size={18} weight="bold" />}
      </button>
      <span className="task-text">
        <b>{t.title}</b>
        {t.note && <small>{t.note}</small>}
      </span>
      {due && !t.done && <span className={'due ' + due.cls}>{due.label}</span>}
    </div>
  );
}
