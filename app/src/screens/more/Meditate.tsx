// A calm space: night sky with drifting aurora, twinkling stars and fireflies over a still
// lake. A glowing orb breathes with you; a singing bowl opens and closes the session.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Play } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { media, haptic } from '../../lib/native';
import { play } from '../../lib/sound';
import { onBack as onBackKey } from '../../lib/back';

type Phase = { name: string; s: number; scale: number };
type Sky = { top: string; mid: string; low: string; far: string; near: string; trees: string; water: string; dawn?: boolean };
const SKIES: Record<string, Sky> = {
  calm: { top: '#04121f', mid: '#0d3346', low: '#1f5a63', far: '#163c4d', near: '#0d2a37', trees: '#071a23', water: '#0b2633' },
  relax: { top: '#070818', mid: '#1d1a4a', low: '#3a2c6e', far: '#241f55', near: '#171540', trees: '#0c0b26', water: '#120f33' },
  focus: { top: '#24304f', mid: '#a0607a', low: '#f4a868', far: '#6b4a6e', near: '#45334f', trees: '#2a2035', water: '#3b2f4a', dawn: true },
  sleep: { top: '#02040c', mid: '#0b1636', low: '#1b2c5c', far: '#121f45', near: '#0b1633', trees: '#050b1e', water: '#08122a' }
};
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
  const [arrived, setArrived] = useState(false);
  useEffect(() => { play('breath'); const t = setTimeout(() => setArrived(true), 1800); return () => clearTimeout(t); }, []);
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

  const sky = SKIES[mode] || SKIES.calm;
  const style = { ['--h1' as string]: m.hue[0], ['--h2' as string]: m.hue[1], ['--h3' as string]: m.hue[2], background: `linear-gradient(180deg, ${sky.top} 0%, ${sky.mid} 48%, ${sky.low} 70%, ${sky.water} 100%)` };
  return (
    <motion.div className={'zen zen-' + state} style={style} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={() => { if (state === 'running') setChrome(c => !c); }}>
      <Sky />
      {!sky.dawn && <div className="aurora"><i /><i /><i /></div>}
      {[0, 1, 2].map(i => <i key={i} className={'shoot s' + i} />)}
      <Landscape sky={sky} />
      <AnimatePresence>
        {!arrived && (
          <motion.div className="zen-arrive" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4 }}>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 1 }}>Welcome. Let the day go.</motion.p>
          </motion.div>
        )}
      </AnimatePresence>

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
        {state === 'setup' && arrived && (
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

/** A row of pine trees along a ridge */
function pines(y: number, count: number, h: number, seed: number) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = (i / count) * 420 - 10 + ((seed * (i + 3)) % 9);
    const hh = h * (0.7 + (((seed + i) * 37) % 30) / 100);
    out += `M${x} ${y} L${x + hh * 0.22} ${y - hh * 0.45} L${x + hh * 0.12} ${y - hh * 0.45} L${x + hh * 0.3} ${y - hh * 0.75} L${x + hh * 0.2} ${y - hh * 0.75} L${x + hh * 0.35} ${y - hh} L${x + hh * 0.5} ${y - hh * 0.75} L${x + hh * 0.4} ${y - hh * 0.75} L${x + hh * 0.58} ${y - hh * 0.45} L${x + hh * 0.48} ${y - hh * 0.45} L${x + hh * 0.7} ${y}Z `;
  }
  return out;
}

/** Three mountain ranges with drifting mist, pine forests and a lake reflecting the sky */
function Landscape({ sky }: { sky: Sky }) {
  const far = 'M0 112 L35 86 L70 100 L112 62 L160 96 L205 72 L250 98 L300 66 L348 94 L400 78 L400 150 L0 150Z';
  const mid = 'M0 126 L48 104 L92 118 L146 94 L196 116 L238 102 L290 120 L338 100 L400 116 L400 150 L0 150Z';
  const near = 'M0 140 C60 128 110 136 170 132 C230 128 290 138 400 130 L400 152 L0 152Z';
  return (
    <svg className="zen-land" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="zl-w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky.water} /><stop offset="1" stopColor="#02040a" /></linearGradient>
        <linearGradient id="zl-moon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky.dawn ? '#ffc890' : '#fff6d8'} stopOpacity=".55" /><stop offset="1" stopColor={sky.dawn ? '#ffc890' : '#fff6d8'} stopOpacity="0" /></linearGradient>
        <filter id="zl-blur"><feGaussianBlur stdDeviation="6" /></filter>
      </defs>
      <path d={far} fill={sky.far} />
      <ellipse className="mist m1" cx="200" cy="104" rx="240" ry="10" fill="#fff" opacity=".08" filter="url(#zl-blur)" />
      <path d={mid} fill={sky.near} />
      <ellipse className="mist m2" cx="160" cy="124" rx="200" ry="8" fill="#fff" opacity=".07" filter="url(#zl-blur)" />
      <path d={pines(136, 26, 26, 7)} fill={sky.trees} />
      <path d={near} fill={sky.trees} />
      <rect x="0" y="150" width="400" height="150" fill="url(#zl-w)" />
      <g transform="translate(0 300) scale(1 -1)" opacity=".22"><path d={pines(150, 26, 26, 7)} fill={sky.near} /></g>
      {[175, 205, 240].map((y, i) => <rect key={'w' + y} className="ripple" x={40 + i * 60} y={y} width={70} height="1" rx=".5" fill="#fff" opacity=".06" style={{ animationDelay: `${i * 1.3}s` }} />)}
    </svg>
  );
}
