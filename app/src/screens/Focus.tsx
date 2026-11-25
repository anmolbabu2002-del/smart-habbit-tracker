import { LockSimple, Pause, Stop } from '@phosphor-icons/react';
import { Mascot } from '../components/Mascot';

const WEEK = [35, 80, 50, 110, 75, 0, 0]; // minutes per day, Mon–Sun
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function FocusSetup() {
  const max = Math.max(...WEEK, 60);
  return (
    <main className="screen">
      <header className="page-head">
        <h1>Focus</h1>
        <p className="sub">Deep work. Apps locked. No excuses.</p>
      </header>

      <h2 className="section-title">Focus on</h2>
      <div className="pick-list">
        <button type="button" className="card pick on"><span>📘</span><b>Finish DSA assignment</b><small>Task · today</small></button>
        <button type="button" className="card pick"><span>🧠</span><b>Study 1 hour</b><small>Habit · counts as proof</small></button>
        <button type="button" className="card pick"><span>✍️</span><b>Something else…</b></button>
      </div>

      <h2 className="section-title">How long?</h2>
      <div className="durations">
        <button type="button" className="card dur"><b>25</b><small>min</small><em>Sprint</em></button>
        <button type="button" className="card dur on"><b>50</b><small>min</small><em>Deep</em></button>
        <button type="button" className="card dur"><b>90</b><small>min</small><em>Monk mode</em></button>
      </div>

      <div className="card lock-row">
        <span className="lock-ico"><LockSimple size={24} weight="fill" /></span>
        <span><b>Lock social apps</b><small>Instagram · YouTube · Facebook · Snapchat · TikTok</small></span>
        <span className="switch on"><i /></span>
      </div>

      <section className="card week">
        <div className="week-head"><b>This week</b><span>5h 50m deep work</span></div>
        <div className="bars">
          {WEEK.map((m, i) => (
            <div key={i} className={'bar' + (i === 2 ? ' today' : '')}>
              <i style={{ height: `${Math.max(6, (m / max) * 100)}%` }} />
              <small>{DAYS[i]}</small>
            </div>
          ))}
        </div>
      </section>

      <button type="button" className="btn big block start">Start focus · 50 min</button>
    </main>
  );
}

export function FocusRun() {
  const total = 50 * 60, left = 18 * 60 + 42, r = 120, c = 2 * Math.PI * r;
  return (
    <main className="focus-run">
      <div className="run-top">
        <span className="run-task">📘 Finish DSA assignment</span>
      </div>
      <div className="ring-wrap">
        <svg width="290" height="290" viewBox="0 0 290 290" className="ring">
          <circle cx="145" cy="145" r={r} className="ring-bg" />
          <circle cx="145" cy="145" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (left / total)} />
        </svg>
        <div className="ring-center">
          <Mascot size={78} mood="focus" />
          <b>18:42</b>
          <small>of 50 min</small>
        </div>
      </div>
      <p className="run-msg">You're in the zone. Keep going! 🔥</p>
      <div className="run-lock"><LockSimple size={18} weight="fill" /> 5 apps locked until the timer ends</div>
      <div className="run-actions">
        <button type="button" className="btn ghost-white"><Pause size={22} weight="fill" /> Pause</button>
        <button type="button" className="btn round ghost-white" aria-label="End session"><Stop size={22} weight="fill" /></button>
      </div>
    </main>
  );
}
