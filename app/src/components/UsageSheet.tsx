// Tap Noto's bubble: today's time on each locked app, and the last 7 days.
import { useState } from 'react';
import { Sheet } from './Sheet';
import { fmtTime, MIN, type Usage } from '../lib/usage';
import { play } from '../lib/sound';

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function UsageSheet({ open, usage, onClose, onFocus }: { open: boolean; usage: Usage | null; onClose: () => void; onFocus?: () => void }) {
  const [sel, setSel] = useState<number | null>(null);
  if (!usage) return <Sheet open={open} onClose={onClose} title="Screen time"><p className="us-note">Screen time needs Usage access.</p></Sheet>;
  const u = usage;
  const maxApp = Math.max(...u.apps.map(a => a.today), MIN);
  // oldest first, today last
  const week = [...u.days.slice(0, 6).reverse(), u.today];
  const labels = week.map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return i === 6 ? 'Today' : DAY[d.getDay()]; });
  const maxDay = Math.max(...week, MIN);
  const diff = u.usualByNow !== null ? u.today - u.usualByNow : null;
  const shown = sel ?? 6;

  return (
    <Sheet open={open} onClose={() => { setSel(null); onClose(); }} title="Screen time">
      <div className="us">
        <div className="us-hero">
          <b>{fmtTime(u.today)}</b>
          <span>on social media today</span>
          {diff !== null && Math.abs(diff) >= 5 * MIN && (
            <small className={diff > 0 ? 'up' : 'down'}>{fmtTime(Math.abs(diff))} {diff > 0 ? 'more' : 'less'} than usual by now</small>
          )}
        </div>

        <div className="us-apps">
          {u.apps.map(a => (
            <div key={a.name} className={'us-app' + (a.today ? '' : ' none')}>
              <span className="us-name">{a.name}</span>
              <span className="us-bar"><i style={{ width: `${(a.today / maxApp) * 100}%` }} /></span>
              <span className="us-val">{a.today ? fmtTime(a.today) : '0 m'}</span>
              <small className="us-y">Yesterday {a.full[0] ? fmtTime(a.full[0]) : '0 m'}</small>
            </div>
          ))}
        </div>

        <h3 className="field-label">Last 7 days</h3>
        <div className="us-week" role="img" aria-label={`Last 7 days: ${week.map((v, i) => `${labels[i]} ${fmtTime(v)}`).join(', ')}`}>
          <div className="us-readout"><b>{labels[shown]}</b> {fmtTime(week[shown])}</div>
          <div className="us-cols">
            {week.map((v, i) => (
              <button key={i} type="button" className={'us-col' + (i === 6 ? ' today' : '') + (i === shown ? ' on' : '')}
                onClick={() => { play('tap'); setSel(i); }} aria-label={`${labels[i]}: ${fmtTime(v)}`}>
                <span className="us-track"><i style={{ height: `${Math.max(v ? 4 : 0, (v / maxDay) * 100)}%` }} /></span>
                <small>{labels[i] === 'Today' ? 'Today' : labels[i].slice(0, 2)}</small>
              </button>
            ))}
          </div>
        </div>
        {u.avgDay !== null && <p className="us-note">Your usual day: {fmtTime(u.avgDay)}. That’s {Math.round((u.avgDay * 365) / (24 * 60 * MIN))} full days a year.</p>}
        {onFocus && <button type="button" className="btn big block" onClick={() => { onClose(); onFocus(); }}>Start a focus session</button>}
      </div>
    </Sheet>
  );
}
