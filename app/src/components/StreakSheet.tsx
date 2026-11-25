import { Ticket, Trophy } from '@phosphor-icons/react';
import { Sheet } from './Sheet';
import { StreakFlame } from './StreakFlame';
import { STAGES, lastWeek, nextStage, stageIndex, streakOf } from '../lib/streak';
import { passLeft } from '../lib/actions';
import { useApp } from '../lib/store';
import { parseYmd } from '../lib/dates';

export function StreakSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useApp();
  const streak = streakOf(s);
  const idx = stageIndex(streak);
  const st = STAGES[idx];
  const nxt = nextStage(streak);
  const pct = nxt ? ((streak - st.min) / (nxt.min - st.min)) * 100 : 100;
  return (
    <Sheet open={open} onClose={onClose} className="streak-sheet">
      <div className="streak-hero">
        <StreakFlame stage={idx} size={150} />
        <b className="streak-num">{streak}</b>
        <span className="streak-label">day streak · {st.name}</span>
        <p>{st.blurb}</p>
      </div>
      {nxt && (
        <div className="evo-progress">
          <div className="progress orange"><i style={{ width: `${Math.max(6, pct)}%` }} /></div>
          <span>{nxt.min - streak} {nxt.min - streak === 1 ? 'day' : 'days'} to <b>{nxt.name}</b></span>
        </div>
      )}
      <div className="week-dots">
        {lastWeek(s).map(d => (
          <span key={d.day} className={'wd' + (d.done ? ' done' : '') + (d.isToday ? ' today' : '')}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'][parseYmd(d.day).getDay()]}<i />
          </span>
        ))}
      </div>
      <div className="streak-facts">
        <div className="card"><Trophy size={26} weight="fill" color="var(--yellow)" /><b>{Math.max(s.bestStreak, streak)}</b><small>Best streak</small></div>
        <div className="card"><Ticket size={26} weight="fill" color="var(--purple)" /><b>{passLeft(s) ? '1' : '0'}</b><small>Free pass this week</small></div>
      </div>
      <h3 className="field-label">Evolutions</h3>
      <div className="evo-path">
        {STAGES.map((x, i) => (
          <div key={x.id} className={'evo' + (i <= idx ? ' got' : '') + (i === idx ? ' now' : '')}>
            <StreakFlame stage={i} size={46} still locked={i > idx} />
            <b>{i <= idx ? x.name : '???'}</b>
            <small>{x.min} {x.min === 1 ? 'day' : 'days'}</small>
          </div>
        ))}
      </div>
      <p className="fine">A day counts when every habit is done. The free pass covers one forgotten photo a week.</p>
    </Sheet>
  );
}
