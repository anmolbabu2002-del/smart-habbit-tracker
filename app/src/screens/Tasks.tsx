import { useState } from 'react';
import { Plus, CalendarBlank, Sparkle, X, ArrowsClockwise } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { TaskRow } from '../components/Rows';
import { TaskEditor, DuePicker } from '../components/TaskEditor';
import { Mascot } from '../components/Mascot';
import { useApp } from '../lib/store';
import { addTask, clearDone, moveOverdueToToday } from '../lib/actions';
import { parseTask, REPEAT_LABEL } from '../lib/parseTask';
import { addDays, dueInfo, prettyDay, today, type DueGroup } from '../lib/dates';
import { play } from '../lib/sound';
import type { Task } from '../lib/types';

type View = 'today' | 'upcoming' | 'done';
const TITLES: Record<DueGroup, string> = { overdue: 'Overdue', today: 'Today', anytime: 'Anytime', tomorrow: 'Tomorrow', week: 'This week', later: 'Later' };

export function Tasks() {
  const s = useApp();
  const [view, setView] = useState<View>('today');
  const [text, setText] = useState('');
  const [due, setDue] = useState<string | undefined>(today());
  const [pickDue, setPickDue] = useState(false);
  const [ignoreParse, setIgnoreParse] = useState(false);
  const parsed = ignoreParse ? { title: text } as ReturnType<typeof parseTask> : parseTask(text);
  const [edit, setEdit] = useState<Task | null | undefined>(undefined);

  const open = s.tasks.filter(t => !t.doneAt);
  const inToday = (t: Task) => ['overdue', 'today', 'anytime'].includes(dueInfo(t.due).group);
  const todayList = open.filter(inToday);
  const upcoming = open.filter(t => !inToday(t)).sort((a, b) => (a.due || '').localeCompare(b.due || ''));
  const done = s.tasks.filter(t => t.doneAt).sort((a, b) => (b.doneAt || '').localeCompare(a.doneAt || ''));

  const switchView = (v: View) => { play('toggle'); setView(v); setDue(v === 'upcoming' ? addDays(today(), 1) : today()); };
  const submit = () => {
    if (!text.trim()) return;
    addTask({ title: parsed.title, due: parsed.due || due, repeat: parsed.repeat });
    setText(''); setIgnoreParse(false);
  };

  const groups: [string, Task[]][] = [];
  const list = view === 'today' ? todayList : view === 'upcoming' ? upcoming : done;
  if (view === 'done') groups.push(['Completed', done]);
  else {
    const order: DueGroup[] = view === 'today' ? ['overdue', 'today', 'anytime'] : ['tomorrow', 'week', 'later'];
    order.forEach(g => { const ts = list.filter(t => dueInfo(t.due).group === g); if (ts.length) groups.push([TITLES[g], ts]); });
  }

  return (
    <main className="screen">
      <header className="page-head">
        <h1>Tasks</h1>
        <div className="chips">
          <button type="button" className={'chip' + (view === 'today' ? ' on' : '')} onClick={() => switchView('today')}>Today{todayList.length ? ` · ${todayList.length}` : ''}</button>
          <button type="button" className={'chip' + (view === 'upcoming' ? ' on' : '')} onClick={() => switchView('upcoming')}>Upcoming{upcoming.length ? ` · ${upcoming.length}` : ''}</button>
          <button type="button" className={'chip' + (view === 'done' ? ' on' : '')} onClick={() => switchView('done')}>Done</button>
        </div>
      </header>

      {view !== 'done' && <>
        <div className="add-row">
          <input className="add-input" placeholder="Try “Call mom friday”" value={text} maxLength={120} onChange={e => { setText(e.target.value); if (!e.target.value) setIgnoreParse(false); }} onKeyDown={e => { if (e.key === 'Enter') submit(); }} />
          <button type="button" className={'btn round ghost due-btn' + (pickDue ? ' on' : '')} aria-label="Due date" onClick={() => { play('tap'); setPickDue(p => !p); }}>
            <CalendarBlank size={20} weight="bold" />
          </button>
          <button type="button" className="btn round" aria-label="Add task" onClick={submit}><Plus size={22} weight="bold" /></button>
        </div>
        <AnimatePresence initial={false}>
          {(pickDue || text) && (
            <motion.div className="quick-due" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              {pickDue ? <DuePicker value={due} onChange={v => { setDue(v); setIgnoreParse(true); setPickDue(false); }} />
                : parsed.matched ? (
                  <span className="parsed-chip"><Sparkle size={14} weight="fill" />
                    {parsed.due && <b>{dueInfo(parsed.due).label === 'Today' ? 'Today' : prettyDay(parsed.due)}</b>}
                    {parsed.repeat && <><ArrowsClockwise size={13} weight="bold" /> {REPEAT_LABEL[parsed.repeat]}</>}
                    <button type="button" onClick={() => setIgnoreParse(true)} aria-label="Ignore the date"><X size={12} weight="bold" /></button>
                  </span>
                ) : <span className="due-hint" onClick={() => setPickDue(true)}>Due: <b>{due ? (dueInfo(due).label === 'Today' ? 'Today' : prettyDay(due)) : 'Anytime'}</b> · change</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </>}

      {groups.length ? groups.map(([title, ts]) => (
        <section key={title}>
          <h2 className="section-title">{title}
            {view === 'done' ? <button type="button" className="link" onClick={clearDone}>Clear</button>
              : title === 'Overdue' ? <button type="button" className="link" onClick={moveOverdueToToday}>Move all to today</button>
              : <small>{ts.length}</small>}
          </h2>
          <motion.div layout className="card list">
            <AnimatePresence initial={false}>{ts.map(t => <TaskRow key={t.id} t={t} onOpen={() => setEdit(t)} />)}</AnimatePresence>
          </motion.div>
        </section>
      )) : (
        <div className="empty-state">
          <Mascot size={96} mood={view === 'done' ? 'sleepy' : 'cheer'} className="bob" />
          <b>{view === 'today' ? 'All clear!' : view === 'upcoming' ? 'Nothing coming up' : 'Nothing done yet'}</b>
          <span>{view === 'today' ? 'Add a task above, or enjoy the free time.' : view === 'upcoming' ? 'Tasks with a future date show up here.' : 'Completed tasks land here.'}</span>
        </div>
      )}

      <TaskEditor open={edit !== undefined} task={edit} onClose={() => setEdit(undefined)} />
    </main>
  );
}
