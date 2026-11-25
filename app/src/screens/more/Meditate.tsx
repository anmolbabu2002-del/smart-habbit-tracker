import { useEffect, useRef, useState } from 'react';
import { Play, Stop } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { media, haptic } from '../../lib/native';
import { play } from '../../lib/sound';
import { party } from '../../lib/celebrate';
import { onBack as onBackKey } from '../../lib/back';
import { Page } from './Page';

type Phase = { name: string; ms: number; scale: number };
const MODES: Record<string, { label: string; sub: string; phases: Phase[] }> = {
  calm: { label: 'Calm', sub: '4 · 2 · 6', phases: [{ name: 'Breathe in', ms: 4000, scale: 1 }, { name: 'Hold', ms: 2000, scale: 1 }, { name: 'Breathe out', ms: 6000, scale: 0.55 }] },
  relax: { label: 'Relax', sub: '4 · 7 · 8', phases: [{ name: 'Breathe in', ms: 4000, scale: 1 }, { name: 'Hold', ms: 7000, scale: 1 }, { name: 'Breathe out', ms: 8000, scale: 0.55 }] },
  focus: { label: 'Focus', sub: 'Box 4 · 4 · 4 · 4', phases: [{ name: 'Breathe in', ms: 4000, scale: 1 }, { name: 'Hold', ms: 4000, scale: 1 }, { name: 'Breathe out', ms: 4000, scale: 0.55 }, { name: 'Hold', ms: 4000, scale: 0.55 }] }
};
const SOUNDS = [{ id: 'none', label: 'Silence' }, { id: 'nature.mp3', label: 'Nature' }, { id: 'deepfocus.mp3', label: 'Deep focus' }, { id: 'peaceful.mp4', label: 'Peaceful' }, { id: 'spiritual.mp4', label: 'Spiritual' }];
const LENGTHS = [3, 5, 10, 15];

export function Meditate({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState(localStorage.getItem('medMode') || 'calm');
  const [mins, setMins] = useState(Number(localStorage.getItem('medMins')) || 5);
  const [sound, setSound] = useState(localStorage.getItem('medSound') || 'none');
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState(mins * 60);
  const audio = useRef<HTMLAudioElement | null>(null);
  const endAt = useRef(0);
  const m = MODES[mode];

  useEffect(() => { localStorage.setItem('medMode', mode); localStorage.setItem('medMins', String(mins)); localStorage.setItem('medSound', sound); if (!running) setLeft(mins * 60); }, [mode, mins, sound, running]);

  // breathing phases
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => { setPhase(p => (p + 1) % m.phases.length); haptic.tap(); }, m.phases[phase].ms);
    return () => clearTimeout(t);
  }, [running, phase, m]);
  // countdown
  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) finish(true);
    }, 500);
    return () => clearInterval(iv);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { audio.current?.pause(); }, []);
  useEffect(() => (running ? onBackKey(() => { finish(false); return true; }) : undefined), [running]); // eslint-disable-line react-hooks/exhaustive-deps

  function start() {
    play('focusStart');
    endAt.current = Date.now() + mins * 60000;
    setPhase(0);
    setLeft(mins * 60);
    setRunning(true);
    if (sound !== 'none') { audio.current = new Audio(media(sound)); audio.current.loop = true; audio.current.volume = 0.6; audio.current.play().catch(() => {}); }
  }
  function finish(done: boolean) {
    setRunning(false);
    audio.current?.pause();
    audio.current = null;
    if (done) party({ kind: 'feat', icon: 'lotus', title: `${mins} calm minutes`, text: 'Mind cleared. Carry this calm into your next task.', kicker: 'Session complete' });
    else play('pop');
  }

  const ph = m.phases[phase];
  return (
    <Page title="Meditate" onBack={onBack} className={'meditate' + (running ? ' running' : '')}>
      <div className="breath-stage">
        <motion.div className="breath-ring" animate={{ scale: running ? ph.scale : 0.75 }} transition={{ duration: running ? ph.ms / 1000 : 0.6, ease: 'easeInOut' }} />
        <motion.div className="breath-core" animate={{ scale: running ? ph.scale * 0.92 : 0.7 }} transition={{ duration: running ? ph.ms / 1000 : 0.6, ease: 'easeInOut' }} />
        <div className="breath-text">
          <b>{running ? ph.name : 'Ready'}</b>
          <span>{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}</span>
        </div>
      </div>

      {!running && <>
        <h2 className="section-title">Breathing</h2>
        <div className="durations">
          {Object.entries(MODES).map(([id, x]) => (
            <button key={id} type="button" className={'card dur' + (mode === id ? ' on' : '')} onClick={() => { play('toggle'); setMode(id); }}><b className="small">{x.label}</b><em>{x.sub}</em></button>
          ))}
        </div>
        <h2 className="section-title">Length</h2>
        <div className="chips wrap">{LENGTHS.map(l => <button key={l} type="button" className={'chip' + (mins === l ? ' on' : '')} onClick={() => { play('toggle'); setMins(l); }}>{l} min</button>)}</div>
        <h2 className="section-title">Sound</h2>
        <div className="chips wrap">{SOUNDS.map(s => <button key={s.id} type="button" className={'chip' + (sound === s.id ? ' on' : '')} onClick={() => { play('toggle'); setSound(s.id); }}>{s.label}</button>)}</div>
      </>}

      <button type="button" className={'btn big block start' + (running ? ' ghost' : ' mint')} onClick={() => (running ? finish(false) : start())}>
        {running ? <><Stop size={22} weight="fill" /> End session</> : <><Play size={22} weight="fill" /> Begin · {mins} min</>}
      </button>
    </Page>
  );
}
