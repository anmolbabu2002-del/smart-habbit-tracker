import { Plus } from '@phosphor-icons/react';
import { TaskRow, type Task } from '../components/Rows';

const GROUPS: { title: string; tasks: Task[] }[] = [
  { title: 'Today', tasks: [
    { id: 'b', title: 'Call the electrician', due: 'overdue' },
    { id: 'a', title: 'Finish DSA assignment', note: 'Graphs — Q3 to Q6', due: 'today' },
    { id: 'd', title: 'Buy notebook & pens', due: 'today' }
  ] },
  { title: 'Tomorrow', tasks: [
    { id: 'e', title: 'Prepare slides for Friday', note: '10 slides max', due: 'tomorrow' },
    { id: 'f', title: 'Book gym trial', due: 'tomorrow' }
  ] },
  { title: 'Later', tasks: [
    { id: 'g', title: "Mom's birthday gift", due: 'Sat 29 Nov' }
  ] }
];

export function Tasks() {
  return (
    <main className="screen">
      <header className="page-head">
        <h1>Tasks</h1>
        <div className="chips">
          <button type="button" className="chip on">Today · 3</button>
          <button type="button" className="chip">Upcoming · 3</button>
          <button type="button" className="chip">Done</button>
        </div>
      </header>

      <div className="add-row">
        <input className="add-input" placeholder="Add a task…" />
        <button type="button" className="btn round" aria-label="Add task"><Plus size={26} weight="bold" /></button>
      </div>

      {GROUPS.map(g => (
        <section key={g.title}>
          <h2 className="section-title">{g.title} <small>{g.tasks.length}</small></h2>
          <div className="card list">{g.tasks.map(t => <TaskRow key={t.id} t={t} />)}</div>
        </section>
      ))}
    </main>
  );
}
