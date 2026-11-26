// A calm space: night sky with drifting aurora, twinkling stars and fireflies over a still
// lake. A glowing orb breathes with you; a singing bowl opens and closes the session.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Play } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { media, haptic } from '../../lib/native';
import { play } from '../../lib/sound';
import { onBack as onBackKey } from '../../lib/back';

type Phase = { name: string; s: number; scale: number };
const MODES: Record<string, { label: string; sub: string; hue: [string, string, string]; phases: Phase[] }> = {
  calm: { label: 'Calm', sub: '4 in · 2 hold · 6 out', hue: ['#b6f5ea', '#4fd6c3', '#2a8f9e'], phases: [{ name: 'Breathe in', s: 4, scale: 1 }, { name: 'Hold', s: 2, scale: 1 }, { name: 'Breathe out', s: 6, scale: 0.62 }] },
  relax: { label: 'Relax', sub: '4 in · 7 hold · 8 out', hue: ['#d9ccff', '#9b87f5', '#5b47c4'], phases: [{ name: 'Breathe in', s: 4, scale: 1 }, { name: 'Hold', s: 7, scale: 1 }, { name: 'Breathe out', s: 8, scale: 0.62 }] },
  focus: { label: 'Focus', sub: 'Box · 4 · 4 · 4 · 4', hue: ['#ffe6b0', '#ffb85c', '#e07b39'], phases: [{ name: 'Breathe in', s: 4, scale: 1 }, { name: 'Hold', s: 4, scale: 1 }, { name: 'Breathe out', s: 4, scale: 0.62 }, { name: 'Hold', s: 4, scale: 0.62 }] },
  sleep: { label: 'Sleep', sub: '4 in · 8 slow out', hue: ['#c4dcff', '#6f9bff', '#3a55b8'], phases: [{ name: 'Breathe in', s: 4, scale: 1 }, { name: 'Breathe out', s: 8, scale: 0.6 }] }
};
const SOUNDS = [{ id: 'none', label: 'Silence' }, { id: 'nature.mp3', label: 'Nature' }, { id: 'deepfocus.mp3', label: 'Deep focus' }, { id: 'peaceful.mp4', label: 'Peaceful' }, { id: 'spiritual.mp4', label: 'Spiritual' }];
const LENGTHS = [3, 5, 10, 15, 20];
const GUIDE = ['Let your shoulders drop.', 'Notice the air: cool in, warm out.', 'If your mind wanders, gently come back.', 'Soften your jaw and your forehead.', 'Nothing to fix. Just breathe.', 'Feel your feet, heavy and grounded.', 'Each breath a little slower.', 'You are here. That is enough.'];
type Stats = { sessions: number; minutes: number };
const getStats = (): Stats => { try { return { sessions: 0, minutes: 0, ...JSON.parse(localStorage.getItem('medStats') || '{}') }; } catch { return { sessions: 0, minutes: 0 }; } };

export function Meditate({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState(localStorage.getItem('medMode') || 'calm');
  const [mins, setMins] = useState(Number(localStorage.getItem('medMins')) || 5);
  const [sound, setSound] = useState(localStorage.getItem('medSound') || 'none');
  const [state, setState] = useState<'setup' | 'running' | 'done'>('setup');
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(0);
  const [left, setLeft] = useState(mins * 60);
  const [guide, setGuide] = useState(0);
  const [chrome, setChrome] = useState(false);
  const [stats, setStats] = useState(getStats);
  const audio = useRef<HTMLAudioElement | null>(null);
  const endAt = useRef(0);
  const m = MODES[mode] || MODES.calm;
  const ph = m.phases[phase % m.phases.length];

  useEffect(() => { localStorage.setItem('medMode', mode); localStorage.setItem('medMins', String(mins)); localStorage.setItem('medSound', sound); if (state === 'setup') setLeft(mins * 60); }, [mode, mins, sound, state]);

  // breathing: one tick a second through each phase
  useEffect(() => {
    if (state !== 'running') return;
    const t = setTimeout(() => {
      if (count + 1 >= ph.s) { setPhase(p => (p + 1) % m.phases.length); setCount(0); haptic.tap(); play('breath'); }
      else setCount(c => c + 1);
      const l = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) finish();
    }, 1000);
    return () => clearTimeout(t);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (state !== 'running') return;
    const iv = setInterval(() => setGuide(g => g + 1), 22000);
    return () => clearInterval(iv);
  }, [state]);
  useEffect(() => onBackKey(() => { if (state === 'running') { stop(); return true; } onBack(); return true; }), [state]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { audio.current?.pause(); }, []);
  // keep the screen on while meditating
  useEffect(() => {
    if (state !== 'running') return;
    let l: { release: () => Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen').then(x => { l = x; }).catch(() => {});
    return () => { l?.release().catch(() => {}); };
  }, [state]);

  function begin() {
    play('bowl');
    endAt.current = Date.now() + mins * 60000 + 1000;
    setPhase(0); setCount(0); setGuide(0); setLeft(mins * 60); setChrome(false);
    setState('running');
    if (sound !== 'none') {
      audio.current = new Audio(media(sound));
      audio.current.loop = true;
      audio.current.volume = 0;
      audio.current.play().then(() => { let v = 0; const iv = setInterval(() => { v = Math.min(0.55, v + 0.05); if (audio.current) audio.current.volume = v; if (v >= 0.55) clearInterval(iv); }, 200); }).catch(() => {});
    }
  }
  function fadeOut() {
    const a = audio.current; audio.current = null;
    if (!a) return;
    const iv = setInterval(() => { a.volume = Math.max(0, a.volume - 0.05); if (a.volume <= 0) { a.pause(); clearInterval(iv); } }, 120);
  }
  function finish() {
    fadeOut();
    play('bowl');
    haptic.success();
    const next = { sessions: stats.sessions + 1, minutes: stats.minutes + mins };
    localStorage.setItem('medStats', JSON.stringify(next));
    setStats(next);
    setState('done');
  }
  function stop() { fadeOut(); play('pop'); setState('setup'); }

  const style = { ['--h1' as string]: m.hue[0], ['--h2' as string]: m.hue[1], ['--h3' as string]: m.hue[2] };
  return (
    <motion.div className={'zen zen-' + state} style={style} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => { if (state === 'running') setChrome(c => !c); }}>
      <Sky />
      <div className="aurora"><i /><i /><i /></div>
      <Landscape />

      <header className={'zen-top' + (state === 'running' && !chrome ? ' hide' : '')}>
        <button type="button" className="zen-ic" onClick={e => { e.stopPropagation(); play('tap'); if (state === 'running') stop(); else onBack(); }} aria-label="Back"><ArrowLeft size={22} weight="bold" /></button>
        <span className="zen-stats">{stats.minutes} mindful min · {stats.sessions} sessions</span>
      </header>

      <div className="orb-wrap">
        <motion.div className="orb-ring r3" animate={{ scale: state === 'running' ? ph.scale * 1.18 : 0.9, opacity: state === 'running' ? 0.35 : 0.2 }} transition={{ duration: state === 'running' ? ph.s : 1.2, ease: 'easeInOut' }} />
        <motion.div className="orb-ring r2" animate={{ scale: state === 'running' ? ph.scale * 1.08 : 0.85 }} transition={{ duration: state === 'running' ? ph.s : 1.2, ease: 'easeInOut' }} />
        <motion.div className="orb" animate={{ scale: state === 'running' ? ph.scale : state === 'done' ? 1 : 0.78 }} transition={{ duration: state === 'running' ? ph.s : 1.2, ease: 'easeInOut' }}>
          <AnimatePresence mode="wait">
            <motion.div key={state === 'running' ? ph.name + phase : state} className="orb-text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.5 }}>
              {state === 'running' ? <><b>{ph.name}</b><span>{ph.s - count}</span></> : state === 'done' ? <><b>Well done</b><span>{mins} min</span></> : <><b>{m.label}</b><span>{m.sub}</span></>}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {state === 'running' && (
          <motion.p key={guide} className="zen-guide" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.6 }}>
            {GUIDE[guide % GUIDE.length]}
          </motion.p>
        )}
      </AnimatePresence>
      {state === 'running' && <span className={'zen-time' + (chrome ? '' : ' dim')}>{String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}{chrome && ' · tap ← to end'}</span>}

      <AnimatePresence>
        {state === 'setup' && (
          <motion.div className="glass" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 28 }} onClick={e => e.stopPropagation()}>
            <div className="glass-row modes">
              {Object.entries(MODES).map(([id, x]) => (
                <button key={id} type="button" className={'zen-mode' + (mode === id ? ' on' : '')} style={{ ['--mc' as string]: x.hue[1] }} onClick={() => { play('toggle'); setMode(id); }}>
                  <i /><b>{x.label}</b>
                </button>
              ))}
            </div>
            <div className="glass-row lengths">{LENGTHS.map(l => <button key={l} type="button" className={'zen-chip' + (mins === l ? ' on' : '')} onClick={() => { play('toggle'); setMins(l); }}>{l} min</button>)}</div>
            <div className="glass-row scroll">{SOUNDS.map(x => <button key={x.id} type="button" className={'zen-chip' + (sound === x.id ? ' on' : '')} onClick={() => { play('toggle'); setSound(x.id); }}>{x.label}</button>)}</div>
            <button type="button" className="zen-begin" onClick={begin}><Play size={20} weight="fill" /> Begin</button>
          </motion.div>
        )}
        {state === 'done' && (
          <motion.div className="glass done" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} onClick={e => e.stopPropagation()}>
            <b>{mins} calm minutes</b>
            <span>{stats.minutes} mindful minutes in total. Carry this calm into your next task.</span>
            <button type="button" className="zen-begin" onClick={() => { play('tap'); setState('setup'); }}>Done</button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Twinkling stars and slowly rising fireflies on one canvas */
function Sky() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext('2d')!;
    const dpr = Math.min(2, devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0;
    const size = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const stars = Array.from({ length: 130 }, () => ({ x: Math.random(), y: Math.random() * 0.62, r: Math.random() * 1.3 + 0.2, p: Math.random() * 6, s: 0.4 + Math.random() * 1.2 }));
    const flies = Array.from({ length: 22 }, () => ({ x: Math.random(), y: 0.55 + Math.random() * 0.45, vx: (Math.random() - 0.5) * 0.0003, vy: -0.0002 - Math.random() * 0.0004, p: Math.random() * 6 }));
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = (tm: number) => {
      ctx.clearRect(0, 0, w, h);
      const t = tm / 1000;
      for (const s of stars) {
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.s + s.p));
        ctx.globalAlpha = a; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2); ctx.fill();
      }
      for (const f of flies) {
        if (!still) { f.x += f.vx + Math.sin(t + f.p) * 0.0002; f.y += f.vy; if (f.y < 0.35) { f.y = 1.02; f.x = Math.random(); } }
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.7 + f.p));
        const g = ctx.createRadialGradient(f.x * w, f.y * h, 0, f.x * w, f.y * h, 7);
        g.addColorStop(0, `rgba(255,240,180,${a})`); g.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x * w, f.y * h, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    addEventListener('resize', size);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); };
  }, []);
  return <canvas ref={ref} className="zen-sky" aria-hidden="true" />;
}

/** Layered mountains reflected in a still lake */
function Landscape() {
  const far = 'M0 120 L40 92 L78 108 L120 70 L165 100 L205 80 L250 104 L300 76 L345 98 L400 84 L400 160 L0 160Z';
  const near = 'M0 132 L55 112 L95 124 L150 100 L200 122 L240 110 L290 126 L340 108 L400 124 L400 160 L0 160Z';
  return (
    <svg className="zen-land" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="zl-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1b2a55" /><stop offset="1" stopColor="#070b1c" /></linearGradient>
        <linearGradient id="zl-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".6" /></linearGradient>
      </defs>
      <path d={far} fill="#1c2452" />
      <path d={near} fill="#121939" />
      <rect x="0" y="160" width="400" height="140" fill="url(#zl-water)" />
      <g transform="translate(0 320) scale(1 -1)" opacity=".28"><path d={far} fill="#2a3470" /><path d={near} fill="#1a2250" /></g>
      {[176, 190, 207, 226, 248].map((y, i) => <rect key={y} className="ripple" x={60 + i * 25} y={y} width={120 - i * 12} height="1.2" rx=".6" fill="#fff" opacity={0.12 - i * 0.015} style={{ animationDelay: `${i * 0.8}s` }} />)}
      <rect x="0" y="160" width="400" height="140" fill="url(#zl-fade)" />
    </svg>
  );
}
