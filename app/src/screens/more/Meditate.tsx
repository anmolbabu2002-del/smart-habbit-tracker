// Meditation: a living space with a bloom of light that breathes with you. The screen is the
// point; the controls stay out of the way (Begin, and one line that opens three choices).
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, X } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { media, haptic, isNative, native } from '../../lib/native';
import { play } from '../../lib/sound';
import { getState } from '../../lib/store';
import { onBack as onBackKey } from '../../lib/back';

type Phase = { name: string; s: number; open: number };
type Style = { label: string; bg: [string, string, string]; petal: [string, string]; speck: string; phases?: Phase[] };
const STYLES: Record<string, Style> = {
  sit: { label: 'Just sit', bg: ['#0b0f2b', '#1b1446', '#0b2a3a'], petal: ['#d9d2ff', '#8f7cf0'], speck: '220,215,255' },
  calm: { label: 'Calm', bg: ['#04161f', '#0c3a44', '#0a2233'], petal: ['#c9fff2', '#3fd1b6'], speck: '190,255,235', phases: [{ name: 'Breathe in', s: 4, open: 1 }, { name: 'Hold', s: 2, open: 1 }, { name: 'Breathe out', s: 6, open: 0.15 }] },
  relax: { label: 'Relax', bg: ['#0a0820', '#2a1b52', '#16113a'], petal: ['#f0dcff', '#a36ff0'], speck: '230,210,255', phases: [{ name: 'Breathe in', s: 4, open: 1 }, { name: 'Hold', s: 7, open: 1 }, { name: 'Breathe out', s: 8, open: 0.15 }] },
  focus: { label: 'Focus', bg: ['#1a0f14', '#4a2230', '#2a1622'], petal: ['#ffe7c4', '#ff9f6b'], speck: '255,225,190', phases: [{ name: 'Breathe in', s: 4, open: 1 }, { name: 'Hold', s: 4, open: 1 }, { name: 'Breathe out', s: 4, open: 0.15 }, { name: 'Hold', s: 4, open: 0.15 }] },
  sleep: { label: 'Sleep', bg: ['#02040e', '#0c1a3c', '#060c22'], petal: ['#d4e4ff', '#5f8cff'], speck: '200,220,255', phases: [{ name: 'Breathe in', s: 4, open: 1 }, { name: 'Breathe out', s: 8, open: 0.15 }] }
};
const SOUNDS = [{ id: 'none', label: 'Silence' }, { id: 'nature.mp3', label: 'Nature' }, { id: 'deepfocus.mp3', label: 'Deep focus' }, { id: 'peaceful.mp4', label: 'Peaceful' }, { id: 'spiritual.mp4', label: 'Spiritual' }];
const LENGTHS = [3, 5, 10, 15, 20];
type Prefs = { mins: number; style: string; sound: string; bloom: boolean; vibrate: boolean };
const loadPrefs = (): Prefs => { try { return { mins: 10, style: 'sit', sound: 'none', bloom: true, vibrate: true, ...JSON.parse(localStorage.getItem('medPrefs') || '{}') }; } catch { return { mins: 10, style: 'sit', sound: 'none', bloom: true, vibrate: true }; } };
type Stats = { sessions: number; minutes: number };
const getStats = (): Stats => { try { return { sessions: 0, minutes: 0, ...JSON.parse(localStorage.getItem('medStats') || '{}') }; } catch { return { sessions: 0, minutes: 0 }; } };
const layersFor = (sessions: number) => Math.min(5, 1 + Math.floor(sessions / 3)); // the bloom grows a layer every 3 sessions
const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Still awake' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export function Meditate({ onBack }: { onBack: () => void }) {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [sheet, setSheet] = useState(false);
  const [phase, setPhase] = useState(0);
  const [left, setLeft] = useState(prefs.mins * 60);
  const [dim, setDim] = useState(false);
  const [stats, setStats] = useState(getStats);
  const [grew, setGrew] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const endAt = useRef(0);
  const dimTimer = useRef(0);
  const st = STYLES[prefs.style] || STYLES.sit;
  const ph = st.phases?.[phase % st.phases.length];

  useEffect(() => { localStorage.setItem('medPrefs', JSON.stringify(prefs)); if (state === 'idle') setLeft(prefs.mins * 60); }, [prefs, state]);
  useEffect(() => { play('breath'); }, []);
  useEffect(() => onBackKey(() => { if (sheet) { setSheet(false); return true; } if (state === 'running') { stop(); return true; } onBack(); return true; }), [state, sheet]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { audio.current?.pause(); clearTimeout(dimTimer.current); }, []);

  // clock
  useEffect(() => {
    if (state !== 'running') return;
    const iv = setInterval(() => {
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) finish();
    }, 500);
    return () => clearInterval(iv);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  // guided breathing: cues you can feel and hear with your eyes closed
  useEffect(() => {
    if (state !== 'running' || !ph) return;
    cue(ph);
    const t = setTimeout(() => setPhase(p => p + 1), ph.s * 1000);
    return () => clearTimeout(t);
  }, [state, phase]); // eslint-disable-line react-hooks/exhaustive-deps
  // keep the screen on while meditating
  useEffect(() => {
    if (state !== 'running') return;
    let l: { release: () => Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen').then(x => { l = x; }).catch(() => {});
    return () => { l?.release().catch(() => {}); };
  }, [state]);

  function cue(p: Phase) {
    const kind = p.name === 'Breathe in' ? 'in' : p.name === 'Breathe out' ? 'out' : 'hold';
    play(kind === 'in' ? 'chimeIn' : kind === 'out' ? 'chimeOut' : 'chimeHold');
    if (!prefs.vibrate) return;
    if (kind === 'in') { haptic.tap(); setTimeout(() => haptic.tap(), 160); }
    else if (kind === 'hold') haptic.tap();
    else if (isNative) native('Haptics', 'vibrate', { duration: 420 }).catch(() => {});
    else navigator.vibrate?.(420);
  }
  function scheduleDim() { clearTimeout(dimTimer.current); setDim(false); dimTimer.current = window.setTimeout(() => setDim(true), 20000); }

  function begin() {
    play('bowl');
    endAt.current = Date.now() + prefs.mins * 60000 + 800;
    setPhase(0); setLeft(prefs.mins * 60); setGrew(false); setSheet(false);
    setState('running');
    scheduleDim();
    if (prefs.sound !== 'none') {
      audio.current = new Audio(media(prefs.sound));
      audio.current.loop = true; audio.current.volume = 0;
      audio.current.play().then(() => { let v = 0; const iv = setInterval(() => { v = Math.min(0.5, v + 0.04); if (audio.current) audio.current.volume = v; if (v >= 0.5) clearInterval(iv); }, 220); }).catch(() => {});
    }
  }
  function fadeOut() {
    const a = audio.current; audio.current = null;
    if (!a) return;
    const iv = setInterval(() => { a.volume = Math.max(0, a.volume - 0.04); if (a.volume <= 0) { a.pause(); clearInterval(iv); } }, 120);
  }
  function finish() {
    fadeOut(); play('bowl'); if (prefs.vibrate) haptic.success();
    clearTimeout(dimTimer.current); setDim(false);
    const next = { sessions: stats.sessions + 1, minutes: stats.minutes + prefs.mins };
    setGrew(layersFor(next.sessions) > layersFor(stats.sessions));
    localStorage.setItem('medStats', JSON.stringify(next));
    setStats(next);
    setState('done');
  }
  function stop() { fadeOut(); clearTimeout(dimTimer.current); setDim(false); play('pop'); setState('idle'); }

  // how open the bloom is
  const open = state === 'done' ? 1 : state === 'running' ? (ph ? ph.open : 0.8) : 0.5;
  const dur = state === 'running' && ph ? ph.s : 2.5;
  const name = getState().name;
  const bg = { ['--b1' as string]: st.bg[0], ['--b2' as string]: st.bg[1], ['--b3' as string]: st.bg[2] };

  return (
    <motion.div className={'medi medi-' + state} style={bg} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
      onClick={() => { if (state === 'running') scheduleDim(); }}>
      <div className="medi-bg" />
      <Specks rgb={st.speck} rising={state === 'running' && ph?.name === 'Breathe in'} />

      <header className={'medi-top' + (state === 'running' ? ' quiet' : '')}>
        <button type="button" className="medi-ic" onClick={e => { e.stopPropagation(); play('tap'); if (state === 'running') stop(); else onBack(); }} aria-label={state === 'running' ? 'End session' : 'Back'}>
          {state === 'running' ? <X size={20} weight="bold" /> : <ArrowLeft size={20} weight="bold" />}
        </button>
      </header>

      <AnimatePresence>
        {state === 'idle' && (
          <motion.div className="medi-greet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.5, duration: 1.2 }}>
            <b>{greeting()}{name ? `, ${name}` : ''}</b>
            {stats.minutes > 0 && <span>{stats.minutes} mindful minutes so far</span>}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="medi-center">
        {prefs.bloom
          ? <Bloom layers={layersFor(stats.sessions + (state === 'done' && grew ? 0 : 0))} open={open} dur={dur} petal={st.petal} idle={state === 'idle'} still={state === 'running' && !ph} />
          : <div className={'medi-glow' + (state === 'idle' ? ' idle' : '')} style={{ transform: `scale(${0.7 + open * 0.45})`, transitionDuration: `${dur}s`, background: `radial-gradient(circle, ${st.petal[0]} 0%, ${st.petal[1]}55 45%, transparent 70%)` }} />}
        <AnimatePresence mode="wait">
          {state === 'running' && ph && <motion.span key={phase} className="medi-word" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.9 }}>{ph.name}</motion.span>}
        </AnimatePresence>
      </div>

      {state === 'running' && <span className="medi-time">{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}</span>}

      <AnimatePresence>
        {state === 'idle' && (
          <motion.div className="medi-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ delay: 0.9, duration: 0.9 }}>
            <button type="button" className="medi-begin" onClick={begin}>Begin</button>
            <button type="button" className="medi-line" onClick={() => { play('tap'); setSheet(true); }}>
              {prefs.mins} min · {st.label} · {SOUNDS.find(x => x.id === prefs.sound)?.label}
            </button>
          </motion.div>
        )}
        {state === 'done' && (
          <motion.div className="medi-actions done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.6, duration: 1 }}>
            <b>Well done</b>
            <span>{prefs.mins} calm minutes{grew ? ' · your bloom grew a new layer' : ''}</span>
            <button type="button" className="medi-begin" onClick={() => { play('tap'); setState('idle'); }}>Done</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={'medi-dim' + (dim ? ' on' : '')} />

      <AnimatePresence>
        {sheet && (
          <>
            <motion.div className="medi-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div className="medi-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 34 }}>
              <span className="sheet-handle" />
              <Row label="Length">{LENGTHS.map(l => <Chip key={l} on={prefs.mins === l} onClick={() => setPrefs({ ...prefs, mins: l })}>{l}</Chip>)}</Row>
              <Row label="Style">{Object.entries(STYLES).map(([id, x]) => <Chip key={id} on={prefs.style === id} onClick={() => setPrefs({ ...prefs, style: id })}>{x.label}</Chip>)}</Row>
              <Row label="Sound">{SOUNDS.map(x => <Chip key={x.id} on={prefs.sound === x.id} onClick={() => setPrefs({ ...prefs, sound: x.id })}>{x.label}</Chip>)}</Row>
              <div className="medi-switches">
                <button type="button" onClick={() => { play('toggle'); setPrefs({ ...prefs, bloom: !prefs.bloom }); }}>Bloom<span className={'switch' + (prefs.bloom ? ' on' : '')}><i /></span></button>
                <button type="button" onClick={() => { play('toggle'); setPrefs({ ...prefs, vibrate: !prefs.vibrate }); }}>Vibration<span className={'switch' + (prefs.vibrate ? ' on' : '')}><i /></span></button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="medi-row"><small>{label}</small><div>{children}</div></div>;
}
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className={'medi-chip' + (on ? ' on' : '')} onClick={() => { play('toggle'); onClick(); }}>{children}</button>;
}

/** A flower of light: layers of translucent petals that open as you breathe in */
function Bloom({ layers, open, dur, petal, idle, still }: { layers: number; open: number; dur: number; petal: [string, string]; idle: boolean; still: boolean }) {
  const rings = Array.from({ length: layers }, (_, k) => layers - 1 - k); // outer layers drawn first
  return (
    <svg className={'bloom' + (idle ? ' idle' : '') + (still ? ' still' : '')} viewBox="0 0 300 300" aria-hidden="true">
      <defs>
        <radialGradient id="bl-p" cx="50%" cy="100%" r="100%"><stop offset="0" stopColor={petal[0]} stopOpacity=".95" /><stop offset=".55" stopColor={petal[1]} stopOpacity=".7" /><stop offset="1" stopColor={petal[1]} stopOpacity=".05" /></radialGradient>
        <radialGradient id="bl-core"><stop offset="0" stopColor="#fff" /><stop offset=".4" stopColor={petal[0]} /><stop offset="1" stopColor={petal[1]} stopOpacity="0" /></radialGradient>
        <radialGradient id="bl-halo"><stop offset="0" stopColor={petal[1]} stopOpacity=".45" /><stop offset="1" stopColor={petal[1]} stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="150" cy="150" r="148" fill="url(#bl-halo)" className="bl-halo" style={{ opacity: 0.35 + open * 0.65, transition: `opacity ${dur}s ease-in-out` }} />
      {rings.map(k => {
        const n = 6 + 2 * k, L = 64 + k * 17, W = L * 0.44;
        const d = `M0 0 C ${W} ${-L * 0.35} ${W * 0.8} ${-L * 0.85} 0 ${-L} C ${-W * 0.8} ${-L * 0.85} ${-W} ${-L * 0.35} 0 0 Z`;
        const sc = 0.32 + 0.68 * open, rot = (1 - open) * (k % 2 ? -24 : 24);
        return (
          <g key={k} className="bl-layer" style={{ transform: `rotate(${rot}deg) scale(${sc})`, transition: `transform ${dur}s cubic-bezier(.45,0,.25,1), opacity ${dur}s`, opacity: 0.6 + 0.4 * open - k * 0.05, animationDelay: `${k * 0.4}s` }}>
            {Array.from({ length: n }, (_, i) => <path key={i} d={d} fill="url(#bl-p)" transform={`translate(150 150) rotate(${(i * 360) / n + (k % 2 ? 180 / n : 0)})`} />)}
          </g>
        );
      })}
      <circle cx="150" cy="150" r={14 + open * 8} fill="url(#bl-core)" style={{ transition: `r ${dur}s ease-in-out` }} />
    </svg>
  );
}

/** Soft specks of light drifting upward, a little faster as you breathe in */
function Specks({ rgb, rising }: { rgb: string; rising: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const speed = useRef(1);
  speed.current = rising ? 2.2 : 1;
  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext('2d')!;
    const dpr = Math.min(2, devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0, sp = 1;
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const dots = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, v: 0.00008 + Math.random() * 0.00025, p: Math.random() * 6 }));
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = (t: number) => {
      sp += (speed.current - sp) * 0.02;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        if (!still) { d.y -= d.v * sp * 16; d.x += Math.sin(t / 3000 + d.p) * 0.00015; if (d.y < -0.02) { d.y = 1.02; d.x = Math.random(); } }
        const a = 0.15 + 0.45 * (0.5 + 0.5 * Math.sin(t / 900 + d.p));
        ctx.fillStyle = `rgba(${rgb},${a})`;
        ctx.beginPath(); ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); };
  }, [rgb]);
  return <canvas ref={ref} className="medi-specks" aria-hidden="true" />;
}
