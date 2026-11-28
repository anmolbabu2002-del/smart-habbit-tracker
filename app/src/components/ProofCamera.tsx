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

type Phase = 'camera' | 'scanning' | 'checking' | 'pass' | 'fail' | 'error';
// The live check: watch for a few seconds and pass once 2 of any 3 frames in a row show the habit.
// In a row matters: a real activity matches continuously, while sweeping the camera around until
// two random views happen to match would otherwise get many more chances.
const NEED = 2, WINDOW = 3;
const WATCH_MS = 6000, WATCH_ACTIVE_MS = 12000;
// Active habits must move between frames (a still photo or a screen showing someone exercising fails)
const MOTION_MIN = 4;
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
  const [scan, setScan] = useState({ seen: 0, total: 0, still: false });
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

  // the camera keeps running while it watches (camera → scanning), and stops once a result shows
  const live = phase === 'camera' || phase === 'scanning';
  useEffect(() => { if (live) start(); return () => stop(); }, [start, live]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Live check: instead of one snapshot, watch for a few seconds (12 after the timer for active
  // habits), checking a frame about every half second, and pass as soon as 2 frames show the habit.
  // So the bad moment of a sit-up, a blurry frame or someone walking past no longer fails you.
  async function snap() {
    const v = video.current, c = canvas.current;
    if (!v || !c || !stream.current) return;
    play('shutter');
    haptic.medium();
    const active = !!proof.timer;
    const w = v.videoWidth || 640, h = v.videoHeight || 480, k = Math.min(1, 640 / Math.max(w, h));
    const grab = () => { const f = document.createElement('canvas'); f.width = Math.round(w * k); f.height = Math.round(h * k); f.getContext('2d', { willReadFrequently: true })!.drawImage(v, 0, 0, f.width, f.height); return f; };
    // a tiny grey version of each frame, to see whether anything moved
    const tiny = (f: HTMLCanvasElement) => { const t = document.createElement('canvas'); t.width = t.height = 24; const x = t.getContext('2d', { willReadFrequently: true })!; x.drawImage(f, 0, 0, 24, 24); const d = x.getImageData(0, 0, 24, 24).data; const g = new Float32Array(576); for (let i = 0; i < 576; i++) g[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3; return g; };
    setScan({ seen: 0, total: 0, still: false });
    phaseRef.current = 'scanning'; // at once: the loop below reads it before the screen re-renders
    setPhase('scanning');
    const t0 = Date.now(), limit = active ? WATCH_ACTIVE_MS : WATCH_MS;
    let passes = 0, recent: boolean[] = [], best: CheckResult | null = null, prev: Float32Array | null = null, motion = 0, n = 0, last: HTMLCanvasElement | null = null;
    try {
      while (Date.now() - t0 < limit) {
        if (phaseRef.current !== 'scanning' || !stream.current) return; // closed meanwhile
        const f = grab();
        const g = tiny(f);
        if (prev) { let d = 0; for (let i = 0; i < 576; i++) d += Math.abs(g[i] - prev[i]); motion = Math.max(motion, d / 576); }
        prev = g;
        const r = await check(f, habit.name);
        n++;
        if (!best || r.confidence > best.confidence) best = r;
        recent = [...recent, r.pass].slice(-WINDOW);
        passes = recent.filter(Boolean).length;
        if (last) last.getContext('2d')!.clearRect(0, 0, last.width, last.height);
        last = f;
        setScan({ seen: Math.min(passes, NEED), total: n, still: active && passes >= NEED && motion < MOTION_MIN });
        if (passes >= NEED && (!active || motion >= MOTION_MIN)) break;
        await new Promise(r => setTimeout(r, 250));
      }
    } catch { stop(); setPhase('error'); play('error'); return; }
    const ok = passes >= NEED && (!active || motion >= MOTION_MIN);
    if ((window as unknown as { __proofDebug?: boolean }).__proofDebug) console.log(`[proof] ${ok ? 'PASS' : 'FAIL'} after ${n} frames, ${Date.now() - t0}ms, motion ${motion.toFixed(1)}`);
    // freeze the last frame behind the result, then wipe everything (photos are never kept)
    if (last) { c.width = last.width; c.height = last.height; c.getContext('2d')!.drawImage(last, 0, 0); last.getContext('2d')!.clearRect(0, 0, last.width, last.height); }
    stop();
    setResult(ok ? best : { pass: false, confidence: best?.confidence || 0, looksLike: passes >= NEED ? null : best?.looksLike || null, still: passes >= NEED } as CheckResult);
    if (ok) {
      setPhase('pass');
      play('habit');
      setTimeout(() => { onClose(); completeHabit(habit.id, { x: innerWidth / 2, y: innerHeight / 2 }); c.getContext('2d')!.clearRect(0, 0, c.width, c.height); }, 1100);
    } else {
      setPhase('fail'); play('error'); haptic.error();
      setTimeout(() => c.getContext('2d')!.clearRect(0, 0, c.width, c.height), 4000);
    }
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
        <video ref={video} playsInline muted autoPlay poster={BLANK} hidden={!live} style={{ transform: facing === 'user' ? 'scaleX(-1)' : undefined }} />
        <canvas ref={canvas} hidden={live} />
        <AnimatePresence>
          {count > 0 && <motion.span key={count} className="cam-count" initial={{ scale: 1.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>{count}</motion.span>}
          {phase === 'checking' && <motion.div className="cam-over" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><span className="spinner" />Checking…</motion.div>}
          {phase === 'scanning' && (
            <motion.div key="scan" className="cam-scan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <span className="cam-scan-dots">{Array.from({ length: NEED }, (_, i) => <i key={i} className={i < scan.seen ? 'on' : ''} />)}</span>
              {scan.still ? 'Keep moving so it can see you doing it' : proof.timer ? 'Keep going…' : 'Hold it in view…'}
            </motion.div>
          )}
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
          <small>{phase === 'error' ? 'Check your internet once, then try again.' : (result as { still?: boolean } | null)?.still ? 'It saw the activity but nothing moving. Do it for real in front of the camera, not a photo or screen.' : `${result?.looksLike ? `It looks more like ${result.looksLike.replace(/^an? /, '')}. ` : ''}${proof.timer ? 'Prop the phone up with your whole body in view and use the timer.' : 'Try another angle with the activity clearly in the photo.'}`}</small>
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
