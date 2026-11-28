import { useEffect, useRef, useState } from 'react';
import { LockSimple, SquaresFour, Moon, SpeakerHigh, DownloadSimple, UploadSimple, User, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { useApp, update } from '../../lib/store';
import { habitLocked, lockStatus, openOverlay, openUsageAccess, syncLock, LOCK_APPS, type LockStatus } from '../../lib/lock';
import { isNative } from '../../lib/native';
import { saveBackup, restoreBackup } from '../../lib/backup';
import { lockedToast } from '../../lib/actions';
import { play, setSoundEnabled } from '../../lib/sound';
import { toast } from '../../lib/celebrate';
import { Page } from './Page';
import { TurnOffCoach } from '../../components/TurnOffCoach';
import { streakOf } from '../../lib/streak';
import { widgetStatus, pinWidget, type WidgetStatus } from '../../lib/widget';
import { MANUAL_STEPS } from '../../components/WidgetPrompt';

function Switch({ on }: { on: boolean }) { return <span className={'switch' + (on ? ' on' : '')}><i /></span>; }

export function Settings({ onBack }: { onBack: () => void }) {
  const s = useApp();
  const [st, setSt] = useState<LockStatus>({ usageAccess: false, overlay: false });
  const [name, setName] = useState(s.name);
  const file = useRef<HTMLInputElement>(null);
  const refresh = () => { if (isNative) lockStatus().then(setSt); };
  useEffect(() => { refresh(); const v = () => { if (!document.hidden) refresh(); }; document.addEventListener('visibilitychange', v); return () => document.removeEventListener('visibilitychange', v); }, []);

  const [coach, setCoach] = useState(false);
  const setLock = (on: boolean) => { update(d => { d.lock.enabled = on; }); syncLock(); };
  const toggleLock = () => {
    if (s.lock.enabled && habitLocked()) { lockedToast('Turning Habit Lock off'); return; }
    if (s.lock.enabled) { play('tap'); setCoach(true); return; }
    setLock(true);
    play('toggle');
    toast('Habit Lock on: social apps lock from 4 to 9 PM until your habits are done', 'lock');
  };
  const restore = async (f?: File) => {
    if (!f) return;
    if (habitLocked()) { lockedToast('Restoring a backup'); return; }
    try { await restoreBackup(f); } catch (e) { play('error'); toast((e as Error).message); }
  };

  return (
    <Page title="Settings" onBack={onBack}>
      <h2 className="section-title">You</h2>
      <div className="card set-row">
        <span className="set-ico blue"><User size={22} weight="fill" /></span>
        <input className="set-input" placeholder="Your name" value={name} maxLength={30} onChange={e => setName(e.target.value)} onBlur={() => update(d => { d.name = name.trim(); })} />
      </div>

      <h2 className="section-title">Habit Lock</h2>
      <div className="card set-group">
        <button type="button" className="set-row" onClick={toggleLock} disabled={!isNative}>
          <span className="set-ico orange"><LockSimple size={22} weight="fill" /></span>
          <span className="set-text"><b>Lock social apps until habits are done</b><small>{isNative ? `4 PM to 9 PM: ${LOCK_APPS.map(a => a.name).join(', ')}` : 'Works in the Android app'}</small></span>
          <Switch on={s.lock.enabled} />
        </button>
        {isNative && <>
          <PermRow ok={st.usageAccess} title="Usage access" text="Lets the lock see which app is open." onClick={() => openUsageAccess().catch(() => {})} />
          <PermRow ok={st.overlay} title="Display over other apps" text="Lets the lock screen cover a blocked app." onClick={() => openOverlay().catch(() => {})} />
        </>}
        <p className="fine left">While apps are locked you can’t turn this off, delete or rename habits, or restore a backup. Focus sessions use the same two permissions. Nothing about your app use is saved or sent.</p>
      </div>

      <h2 className="section-title">App</h2>
      <div className="card set-group">
        <button type="button" className="set-row" onClick={() => { update(d => { d.theme = d.theme === 'dark' ? 'light' : 'dark'; }); play('toggle'); }}>
          <span className="set-ico purple"><Moon size={22} weight="fill" /></span>
          <span className="set-text"><b>Dark mode</b></span>
          <Switch on={s.theme === 'dark'} />
        </button>
        {isNative && <WidgetRow />}
        <button type="button" className="set-row" onClick={() => { const on = !s.sound; setSoundEnabled(on); update(d => { d.sound = on; }); if (on) play('toggle'); }}>
          <span className="set-ico mint"><SpeakerHigh size={22} weight="fill" /></span>
          <span className="set-text"><b>Sound effects</b></span>
          <Switch on={s.sound} />
        </button>
      </div>

      <h2 className="section-title">Backup</h2>
      <div className="card set-group">
        <button type="button" className="set-row" onClick={async () => { play('tap'); try { toast(await saveBackup(), 'good'); } catch { toast('Couldn’t save the backup'); } }}>
          <span className="set-ico yellow"><DownloadSimple size={22} weight="bold" /></span>
          <span className="set-text"><b>Save a backup</b><small>{isNative ? 'To Documents › Ultradian. A copy is also saved there every day.' : 'Downloads a file with all your data.'}</small></span>
        </button>
        <button type="button" className="set-row" onClick={() => { play('tap'); file.current?.click(); }}>
          <span className="set-ico red"><UploadSimple size={22} weight="bold" /></span>
          <span className="set-text"><b>Restore from a backup</b><small>Replaces what’s on this phone. Old-app backups work too.</small></span>
        </button>
        <input ref={file} type="file" accept=".json,application/json" hidden onChange={e => restore(e.target.files?.[0])} />
      </div>
      <p className="fine">Ultradian · made by Anmol Jha</p>
      <TurnOffCoach open={coach} streak={streakOf(s)} onKeep={() => setCoach(false)} onOff={() => { setCoach(false); setLock(false); play('pop'); toast('Habit Lock is off'); }} />
    </Page>
  );
}

function PermRow({ ok, title, text, onClick }: { ok: boolean; title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" className="set-row" onClick={onClick} disabled={ok}>
      <span className={'set-ico ' + (ok ? 'mint' : 'red')}>{ok ? <CheckCircle size={22} weight="fill" /> : <WarningCircle size={22} weight="fill" />}</span>
      <span className="set-text"><b>{title}</b><small>{ok ? 'Allowed' : text}</small></span>
      {!ok && <span className="btn small-btn">Allow</span>}
    </button>
  );
}

/** Settings: add the home-screen widget (the launcher's own "Add" dialog, or how to do it by hand) */
function WidgetRow() {
  const [st, setSt] = useState<WidgetStatus | null>(null);
  useEffect(() => {
    const load = () => { widgetStatus().then(setSt); };
    load();
    const v = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', v);
    return () => document.removeEventListener('visibilitychange', v);
  }, []);
  const add = async () => {
    play('tap');
    if (st?.placed) { toast('Noto is already on your home screen. You can add another one too.'); }
    if (!(await pinWidget())) toast(MANUAL_STEPS);
  };
  return (
    <button type="button" className="set-row" onClick={add}>
      <span className="set-ico orange"><SquaresFour size={22} weight="fill" /></span>
      <span className="set-text"><b>Home-screen widget</b><small>{st?.placed ? 'Added. Tap to add another' : 'Tick habits right from your home screen'}</small></span>
    </button>
  );
}
