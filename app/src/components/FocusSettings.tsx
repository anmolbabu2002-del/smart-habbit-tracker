// Focus settings (the gear on Focus): lock the whole phone or only social apps, silence
// notifications, silence calls. Silencing needs Android's "Do Not Disturb access": asked for
// only when switched on, in one step, and switched on by itself once allowed.
import { useEffect, useState } from 'react';
import { BellSlash, DeviceMobile, PhoneSlash, ArrowSquareOut } from '@phosphor-icons/react';
import { Sheet } from './Sheet';
import { update, useApp } from '../lib/store';
import { lockStatus, openDndAccess, syncLock } from '../lib/lock';
import { isNative } from '../lib/native';
import { play } from '../lib/sound';
import { toast } from '../lib/celebrate';

const Switch = ({ on }: { on: boolean }) => <span className={'switch' + (on ? ' on' : '')}><i /></span>;

export function FocusSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useApp();
  const [dnd, setDnd] = useState(true);
  const [asking, setAsking] = useState(false);
  const whole = s.focus.wholePhone !== false, silence = !!s.focus.silence, calls = !!s.focus.blockCalls;
  const set = (patch: Partial<typeof s.focus>) => { update(d => { Object.assign(d.focus, patch); }); syncLock(); };

  // check the permission when the sheet opens, and again on coming back from Android's settings
  useEffect(() => {
    if (!open || !isNative) return;
    const check = () => lockStatus().then(st => {
      const ok = !!st.dnd;
      setDnd(ok);
      if (ok && asking) { setAsking(false); set({ silence: true }); play('toggle'); toast('Done. Notifications stay quiet while you focus.', 'good'); }
    });
    check();
    const vis = () => { if (!document.hidden) check(); };
    document.addEventListener('visibilitychange', vis);
    return () => document.removeEventListener('visibilitychange', vis);
  }, [open, asking]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSilence = () => {
    if (silence) { play('toggle'); set({ silence: false }); return; }
    if (!dnd) { play('tap'); setAsking(true); return; }
    play('toggle'); set({ silence: true });
  };

  return (
    <Sheet open={open} onClose={() => { setAsking(false); onClose(); }} title="Focus settings">
      <div className="card set-group">
        <button type="button" className="set-row" disabled={!isNative} onClick={() => { play('toggle'); set({ wholePhone: !whole }); }}>
          <span className="set-ico orange"><DeviceMobile size={22} weight="fill" /></span>
          <span className="set-text"><b>Lock the whole phone</b><small>{whole ? 'Every app locks until the timer ends' : 'Only social apps lock'}</small></span>
          <Switch on={whole} />
        </button>
        <button type="button" className="set-row" disabled={!isNative} onClick={toggleSilence}>
          <span className="set-ico purple"><BellSlash size={22} weight="fill" /></span>
          <span className="set-text"><b>Silence notifications</b><small>{silence && !dnd ? 'Needs Do Not Disturb access. Tap to allow.' : 'No banners or sounds while you focus. Alarms still ring.'}</small></span>
          <Switch on={silence && dnd} />
        </button>
        {silence && dnd && (
          <button type="button" className="set-row" onClick={() => { play('toggle'); set({ blockCalls: !calls }); }}>
            <span className="set-ico red"><PhoneSlash size={22} weight="fill" /></span>
            <span className="set-text"><b>Silence calls too</b><small>Someone calling twice within 15 minutes still gets through</small></span>
            <Switch on={calls} />
          </button>
        )}
      </div>

      {asking && (
        <div className="card fs-ask">
          <b>One quick step</b>
          <ol>
            <li>Tap <b>Allow</b> below.</li>
            <li>Find <b>Ultradian</b> in the list and switch it on.</li>
            <li>Come back here. It turns on by itself.</li>
          </ol>
          <button type="button" className="btn block" onClick={() => { play('tap'); openDndAccess().catch(() => toast('Couldn’t open the settings')); }}>Allow <ArrowSquareOut size={18} weight="bold" /></button>
        </div>
      )}

      <p className="fine">{isNative ? 'Your own Do Not Disturb settings come back the moment the session ends.' : 'These work in the Android app.'}</p>
    </Sheet>
  );
}
