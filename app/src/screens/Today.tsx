import { LockSimple, Lightning } from '@phosphor-icons/react';
import { Mascot } from '../components/Mascot';
import { HabitRow, TaskRow, type Habit, type Task } from '../components/Rows';

const HABITS: Habit[] = [
  { id: '1', name: 'Workout', emoji: '💪', color: 'orange', proof: 'photo', done: false },
  { id: '2', name: 'Read 10 pages', emoji: '📖', color: 'blue', proof: 'photo', done: true },
  { id: '3', name: 'Meditate', emoji: '🧘', color: 'purple', proof: 'photo', done: false },
  { id: '4', name: 'No sugar', emoji: '🍬', color: 'red', proof: 'tick', done: true },
  { id: '5', name: 'Study 1 hour', emoji: '🧠', color: 'mint', proof: 'photo', done: false }
];
const TASKS: Task[] = [
  { id: 'a', title: 'Finish DSA assignment', note: 'Graphs — Q3 to Q6', due: 'today' },
  { id: 'b', title: 'Call the electrician', due: 'overdue' },
  { id: 'c', title: 'Submit internship form', due: 'today', done: true }
];

export function Today() {
  const done = HABITS.filter(h => h.done).length;
  const left = HABITS.length - done;
  return (
    <main className="screen">
      <header className="today-head">
        <div>
          <small className="eyebrow">Wednesday · 26 Nov</small>
          <h1>Hey Anmol! 👋</h1>
        </div>
        <span className="streak-pill" title="Focused today"><Lightning size={20} weight="fill" /> 1h 15m<small>focus</small></span>
      </header>

      <section className="card hero">
        <div className="hero-top">
          <Mascot size={86} mood="cheer" className="bob" />
          <div className="bubble">
            <b>{left} habits to go!</b>
            <span>Finish them to unlock your apps.</span>
          </div>
        </div>
        <div className="hero-progress">
          <div className="progress"><i style={{ width: `${(done / HABITS.length) * 100}%` }} /></div>
          <b>{done}/{HABITS.length}</b>
        </div>
        <div className="lock-pill">
          <LockSimple size={18} weight="fill" />
          5 apps locked until habits are done
        </div>
      </section>

      <h2 className="section-title">Habits <small>{done} of {HABITS.length}</small></h2>
      <div className="stack">{HABITS.map(h => <HabitRow key={h.id} h={h} />)}</div>

      <h2 className="section-title">Due today <small>{TASKS.filter(t => !t.done).length} left</small></h2>
      <div className="card list">{TASKS.map(t => <TaskRow key={t.id} t={t} />)}</div>

      <section className="card focus-cta">
        <div>
          <b>Ready for deep work?</b>
          <span>50 minutes, apps locked, zero distractions.</span>
        </div>
        <button type="button" className="btn big block">Start focus</button>
      </section>
    </main>
  );
}
