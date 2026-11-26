// Voice proof for speaking habits (practise English, public speaking, singing…): talk for a
// minute and the habit is done. Only loudness is measured, on the phone, to tell real speech
// (syllables with little pauses) from a constant hum like a fan or TV. Nothing is recorded.
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Microphone, ShieldCheck, Ticket, ArrowClockwise } from '@phosphor-icons/react';
import { completeHabit, passLeft } from '../lib/actions';
import { play } from '../lib/sound';
import { haptic } from '../lib/native';
import { onBack } from '../lib/back';
import { HabitIcon } from './HabitIcon';
import type { Habit } from '../lib/types';

const GOAL = 60;          // seconds of real speech
const LIMIT = 4 * 60;     // to be done within four minutes
const TICK = 50;          // ms between level checks

export function VoiceProof({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const [phase, setPhase] = useState<'ready' | 'listening' | 'pass' | 'fail' | 'error'>('ready');
  const [spoken, setSpoken] = useState(0);
  const [level, setLevel] = useState(0);
  const [hint, setHint] = useState('');
  const [passOpen, setPassOpen] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const closeRef = useRef(onClose); closeRef.current = onClose;

  useEffect(() => {
    const off = onBack(() => { closeRef.current(); return true; });
    return () => { off(); stopRef.current(); };
  }, []);

  async function start() {
    play('tap');
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { setPhase('error'); return; }
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 250;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
    const an = ctx.createAnalyser(); an.fftSize = 1024;
    src.connect(hp).connect(lp).connect(an);
    const buf = new Float32Array(an.fftSize);
    const history: number[] = [];   // recent loudness, to learn the room's noise floor
    const window: boolean[] = [];   // the last second: voiced or not
    let secs = 0, elapsed = 0, quiet = 0;
    setPhase('listening'); setSpoken(0); setHint('');
    const iv = setInterval(() => {
      an.getFloatTimeDomainData(buf);
      let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      history.push(rms); if (history.length > 80) history.shift();
      const sorted = [...history].sort((a, b) => a - b);
      const floor = sorted[Math.floor(sorted.length * 0.2)] || 0;
      const voiced = rms > Math.max(floor * 2.5, 0.01);
      window.push(voiced); if (window.length > 20) window.shift();
      // speech has syllables: on/off changes several times a second, and isn't on all the time
      let flips = 0; for (let i = 1; i < window.length; i++) if (window[i] !== window[i - 1]) flips++;
      const ratio = window.filter(Boolean).length / window.length;
      const speechy = voiced && ratio > 0.2 && ratio < 0.97 && flips >= 2;
      if (speechy) { secs += TICK / 1000; quiet = 0; } else quiet += TICK / 1000;
      elapsed += TICK / 1000;
      setLevel(Math.min(1, rms * 12));
      setSpoken(secs);
      setHint(quiet > 4 ? (ratio >= 0.97 ? 'That sounds like steady noise, not talking.' : 'I can’t hear you. Speak up a little.') : '');
      if (secs >= GOAL) { done(true); }
      else if (elapsed >= LIMIT) { done(false); }
    }, TICK);
    const stop = () => { clearInterval(iv); stream.getTracks().forEach(t => t.stop()); ctx.close().catch(() => {}); };
    stopRef.current = stop;
    function done(ok: boolean) {
      stop();
      if (ok) {
        setPhase('pass'); play('habit'); haptic.success();
        setTimeout(() => { closeRef.current(); completeHabit(habit.id, { x: innerWidth / 2, y: innerHeight / 2 }); }, 1100);
      } else { setPhase('fail'); play('error'); haptic.error(); }
    }
  }

  const usePass = () => { stopRef.current(); onClose(); completeHabit(habit.id, { x: innerWidth / 2, y: innerHeight / 2 }, true); };
  const pct = Math.min(1, spoken / GOAL), r = 104, c = 2 * Math.PI * r;

  return (
    <motion.div className="cam voice" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 36 }}>
      <header className="cam-top">
        <button type="button" className="cam-x" onClick={() => { play('tap'); onClose(); }} aria-label="Close"><X size={22} weight="bold" /></button>
        <span className="cam-title"><HabitIcon icon={habit.icon} color={habit.color} size={30} /><b>{habit.name}</b></span>
        <span className="cam-private"><ShieldCheck size={16} weight="fill" /> Never recorded</span>
      </header>

      <div className="voice-stage">
        <svg width="250" height="250" viewBox="0 0 250 250" className="voice-ring">
          <circle cx="125" cy="125" r={r} className="vr-bg" />
          <circle cx="125" cy="125" r={r} className="vr-fg" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
        </svg>
        <motion.div className="voice-pulse" animate={{ scale: 1 + level * 0.6, opacity: 0.25 + level * 0.5 }} transition={{ duration: 0.08 }} />
        <button type="button" className={'voice-mic' + (phase === 'listening' ? ' on' : '')} onClick={() => { if (phase === 'ready' || phase === 'fail' || phase === 'error') start(); }} aria-label="Start">
          {phase === 'pass' ? <Check size={56} weight="bold" /> : <Microphone size={52} weight="fill" />}
        </button>
      </div>

      <div className="voice-text">
        {phase === 'ready' && <><b>Talk for one minute</b><span>Practise out loud: describe your day, read a page, or have a conversation. Tap the mic to start.</span></>}
        {phase === 'listening' && <><b>{Math.floor(spoken)} s <small>of {GOAL} s</small></b><span>{hint || (spoken < 5 ? 'Listening… start talking!' : spoken < 45 ? 'Great, keep going!' : 'Almost there!')}</span></>}
        {phase === 'pass' && <><b>Nice talking!</b><span>{habit.name} is done.</span></>}
        {phase === 'fail' && <><b>Not quite a minute</b><span>Only talking counts, not background noise. Try again somewhere quieter.</span><button type="button" className="btn block" onClick={start}><ArrowClockwise size={18} weight="bold" /> Try again</button></>}
        {phase === 'error' && <><b>Microphone is off</b><span>Allow the microphone for Ultradian in your phone’s settings, then try again.</span></>}
      </div>

      {phase !== 'pass' && (
        <div className="cam-pass-wrap">
          <button type="button" className={'cam-pass-ico' + (passOpen ? ' on' : '')} onClick={() => { play('tap'); setPassOpen(o => !o); }} aria-label="Free pass"><Ticket size={20} weight="fill" /></button>
          <AnimatePresence>
            {passOpen && (
              <motion.div className="cam-pass-pop" initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}>
                <span>{passLeft() ? 'Did it but couldn’t prove it? You get one free pass a week.' : 'You’ve used this week’s free pass. A new one comes on Monday.'}</span>
                {passLeft() && <button type="button" className="btn block" onClick={usePass}>Use free pass</button>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
