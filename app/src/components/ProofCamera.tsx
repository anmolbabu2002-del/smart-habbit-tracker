// Live-photo proof: the app's own camera (no gallery), checked on the phone, never saved.
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, CameraRotate, Timer, Ticket, ArrowClockwise, ShieldCheck } from '@phosphor-icons/react';
import { check, loadVision, proofOf, textFingerprint, unload, useProofEngine, type CheckResult } from '../lib/proof';
import { completeHabit, passLeft } from '../lib/actions';
import { play } from '../lib/sound';
import { haptic } from '../lib/native';
import { onBack } from '../lib/back';
import { HabitIcon } from './HabitIcon';
import type { Habit } from '../lib/types';

type Phase = 'camera' | 'checking' | 'pass' | 'fail' | 'error';
// A transparent poster: without one, Android shows a big "play" image until the camera starts
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export function ProofCamera({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [phase, setPhase] = useState<Phase>('camera');
  const phaseRef = useRef<Phase>('camera');
  phaseRef.current = phase;
  const [passOpen, setPassOpen] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [count, setCount] = useState(0);
  const [camError, setCamError] = useState('');
  const engine = useProofEngine();
  const proof = proofOf(habit.name);

  const stop = () => { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  const start = useCallback(async () => {
    stop();
    setCamError('');
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      stream.current = s;
      if (video.current) { video.current.srcObject = s; await video.current.play().catch(() => {}); }
    } catch (e) {
      setCamError((e as Error)?.name === 'NotAllowedError' ? 'Camera permission is off. Allow it for Ultradian in your phone’s settings.' : 'Couldn’t open the camera.');
    }
  }, [facing]);

  useEffect(() => { if (phase === 'camera') start(); return () => stop(); }, [start, phase]);
  // Once, when the camera opens (not on every re-render: that used to unload the photo check
  // and leave the shutter disabled until the camera was switched)
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    loadVision();
    if (!proof.known && proof.show) textFingerprint('a photo of ' + proof.show).catch(() => {});
    const off = onBack(() => { closeRef.current(); return true; });
    const vis = () => { if (document.hidden) stop(); else if (phaseRef.current === 'camera') start(); };
    document.addEventListener('visibilitychange', vis);
    return () => { off(); stop(); document.removeEventListener('visibilitychange', vis); setTimeout(unload, 300); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 10-second self-timer for workouts: prop the phone up and get into position
  useEffect(() => {
    if (!count) return;
    const t = setTimeout(() => {
      if (count === 1) { setCount(0); snap(); return; }
      play(count <= 4 ? 'tick' : 'tap');
      setCount(count - 1);
    }, 1000);
    return () => clearTimeout(t);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Three frames about half a second apart: a single blurry or awkward frame no longer fails you
  async function snap() {
    const v = video.current, c = canvas.current;
    if (!v || !c || !stream.current) return;
    play('shutter');
    haptic.medium();
    const w = v.videoWidth || 640, h = v.videoHeight || 480, k = Math.min(1, 640 / Math.max(w, h));
    const grab = () => { const f = document.createElement('canvas'); f.width = Math.round(w * k); f.height = Math.round(h * k); f.getContext('2d')!.drawImage(v, 0, 0, f.width, f.height); return f; };
    const frames = [grab()];
    for (let i = 0; i < 2; i++) { await new Promise(r => setTimeout(r, 450)); frames.push(grab()); }
    c.width = frames[1].width; c.height = frames[1].height;
    c.getContext('2d')!.drawImage(frames[1], 0, 0);
    stop();
    setPhase('checking');
    try {
      let best: CheckResult | null = null;
      for (const f of frames) {
        const r = await check(f, habit.name);
        if (!best || r.confidence > best.confidence) best = r;
        if (r.pass) break;
      }
      setResult(best);
      if (best?.pass) {
        setPhase('pass');
        play('habit');
        setTimeout(() => { onClose(); completeHabit(habit.id, { x: innerWidth / 2, y: innerHeight / 2 }); }, 1100);
      } else { setPhase('fail'); play('error'); haptic.error(); }
    } catch { setPhase('error'); play('error'); }
    // the photos only lived in these canvases: wipe them
    [c, ...frames].forEach(f => f.getContext('2d')!.clearRect(0, 0, f.width, f.height));
  }

  const usePass = () => { onClose(); completeHabit(habit.id, { x: innerWidth / 2, y: innerHeight / 2 }, true); };
  const ready = engine.ready;
  const status = camError || (engine.error ? (navigator.onLine === false ? 'The photo check needs internet once to download. Connect and try again.' : 'Couldn’t load the photo check. Close and try again.')
    : !ready ? (engine.progress > 0 && engine.progress < 1 ? `Getting the photo check ready (one-time download)… ${Math.round(engine.progress * 100)}%` : 'Starting the photo check…')
    : proof.timer ? 'Prop your phone up, tap the timer and get into position.' : `Show ${proof.show}.`);

  return (
    <motion.div className="cam" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 360, damping: 36 }}>
      <header className="cam-top">
        <button type="button" className="cam-x" onClick={() => { play('tap'); onClose(); }} aria-label="Close"><X size={22} weight="bold" /></button>
        <span className="cam-title"><HabitIcon icon={habit.icon} color={habit.color} size={30} /><b>{habit.name}</b></span>
        <span className="cam-private"><ShieldCheck size={16} weight="fill" /> Never saved</span>
      </header>

      <div className="cam-stage">
        <video ref={video} playsInline muted autoPlay poster={BLANK} hidden={phase !== 'camera'} style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined }} />
        <canvas ref={canvas} hidden={phase === 'camera'} />
        <AnimatePresence>
          {count > 0 && <motion.span key={count} className="cam-count" initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>{count}</motion.span>}
          {phase === 'checking' && <motion.div className="cam-over" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><span className="spinner" />Checking…</motion.div>}
          {phase === 'pass' && <motion.div className="cam-over ok" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><span className="cam-tick"><Check size={44} weight="bold" /></span>Looks like {habit.name}!</motion.div>}
        </AnimatePresence>
      </div>

      {phase === 'camera' && <>
        <p className="cam-status">{status}</p>
        <div className="cam-controls">
          <button type="button" className="cam-side" onClick={() => { play('toggle'); setFacing(f => f === 'user' ? 'environment' : 'user'); }} aria-label="Switch camera"><CameraRotate size={26} weight="bold" /></button>
          <button type="button" className="cam-shutter" disabled={!ready || !!camError} onClick={snap} aria-label="Take photo"><i /></button>
          <button type="button" className={'cam-side' + (proof.timer ? ' hint' : '')} disabled={!ready || !!camError} onClick={() => { play('tap'); setCount(10); }} aria-label="10-second timer"><Timer size={26} weight="bold" /><small>10s</small></button>
        </div>
      </>}

      {(phase === 'fail' || phase === 'error') && (
        <div className="cam-result">
          <b>{phase === 'error' ? 'The photo check didn’t load' : `This doesn’t look like ${habit.name}`}</b>
          <small>{phase === 'error' ? 'Check your internet once, then try again.' : `${result?.looksLike ? `It looks more like ${result.looksLike.replace(/^an? /, '')}. ` : ''}${proof.timer ? 'Prop the phone up with your whole body in view and use the timer.' : 'Try another angle with the activity clearly in the photo.'}`}</small>
          <button type="button" className="btn block" onClick={() => { play('tap'); setPhase('camera'); }}><ArrowClockwise size={20} weight="bold" /> Retake</button>
        </div>
      )}

      {phase !== 'pass' && phase !== 'checking' && (
        <div className="cam-pass-wrap">
          <button type="button" className={'cam-pass-ico' + (passOpen ? ' on' : '')} onClick={() => { play('tap'); setPassOpen(o => !o); }} aria-label="Free pass"><Ticket size={20} weight="fill" /></button>
          <AnimatePresence>
            {passOpen && (
              <motion.div className="cam-pass-pop" initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }}>
                <span>{passLeft() ? 'Forgot to take the photo? You get one free pass a week.' : 'You’ve used this week’s free pass. A new one comes on Monday.'}</span>
                {passLeft() && <button type="button" className="btn block" onClick={usePass}>Use free pass</button>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
