// Full-screen celebrations, one at a time from the queue in lib/celebrate.ts.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { nextParty, rain, burst, useParty, type Party } from '../lib/celebrate';
import { play } from '../lib/sound';
import { haptic } from '../lib/native';
import { STAGES, stageIndex, lastWeek, nextStage } from '../lib/streak';
import { getState } from '../lib/store';
import { toggleTask } from '../lib/actions';
import { fmtMinutes } from '../lib/dates';
import { StreakFlame } from './StreakFlame';
import { HabitIcon } from './HabitIcon';
import { Mascot } from './Mascot';

export function CelebrationHost() {
  const p = useParty();
  return (
    <AnimatePresence>
      {p && (
        <motion.div key={JSON.stringify(p)} className={'party party-' + p.kind}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
          {p.kind === 'allDone' && <AllDone p={p} />}
          {p.kind === 'focus' && <FocusDone p={p} />}
          {p.kind === 'feat' && <Feat p={p} />}
          {p.kind === 'evolve' && <Evolve from={p.from} to={p.to} onDone={nextParty} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const pop = { initial: { scale: 0.4, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring' as const, stiffness: 320, damping: 16 } };
const rise = (delay: number) => ({ initial: { y: 24, opacity: 0 }, animate: { y: 0, opacity: 1 }, transition: { delay, type: 'spring' as const, stiffness: 260, damping: 22 } });

function useCountUp(from: number, to: number, start: number, ms = 700) {
  const [n, setN] = useState(from);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + start;
    const step = (now: number) => {
      const k = Math.max(0, Math.min(1, (now - t0) / ms));
      setN(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to, start, ms]);
  return n;
}

function AllDone({ p }: { p: Extract<Party, { kind: 'allDone' }> }) {
  const [phase, setPhase] = useState<'count' | 'evolve'>('count');
  const n = useCountUp(p.prev, p.streak, 700);
  const stage = stageIndex(p.streak);
  const week = lastWeek(getState());
  const nxt = nextStage(p.streak);
  const lockOn = getState().lock.enabled;

  useEffect(() => {
    play('allDone');
    haptic.party();
    rain(2200);
    const t = setTimeout(() => { play('streak'); haptic.heavy(); burst({ x: innerWidth / 2, y: innerHeight * 0.3, count: 40, colors: ['#ff8c42', '#ffc800', '#ff4b4b'] }); }, 900);
    return () => clearTimeout(t);
  }, []);

  if (phase === 'evolve' && p.evolvedTo !== undefined) return <Evolve from={stageIndex(p.prev)} to={p.evolvedTo} onDone={nextParty} />;

  return (
    <div className="party-body">
      <motion.div {...rise(0)}><Mascot size={74} mood="cheer" className="party-mascot" /></motion.div>
      <motion.h1 {...rise(0.1)}>All habits done!</motion.h1>
      <motion.div className="party-flame" {...pop} transition={{ ...pop.transition, delay: 0.5 }}>
        <StreakFlame stage={stageIndex(p.prev)} size={150} />
      </motion.div>
      <motion.div className="party-count" {...rise(0.6)}>
        <b>{n}</b><span>day streak</span>
      </motion.div>
      {p.best && <motion.div className="party-badge" {...pop} transition={{ ...pop.transition, delay: 1.5 }}>New best streak!</motion.div>}
      <motion.div className="party-week" {...rise(1.1)}>
        {week.map(d => <span key={d.day} className={'wd' + (d.done ? ' done' : '') + (d.isToday ? ' today' : '')}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][new Date(d.day + 'T12:00').getDay()]}<i /></span>)}
      </motion.div>
      <motion.p className="party-sub" {...rise(1.25)}>
        {lockOn ? 'Your apps are unlocked. ' : ''}{p.evolvedTo !== undefined ? 'Wait… something is happening to your flame!' : nxt ? `${nxt.min - p.streak} more ${nxt.min - p.streak === 1 ? 'day' : 'days'} until ${nxt.name}.` : 'You reached the final form.'}
      </motion.p>
      <motion.button type="button" className="btn big block white" {...rise(1.4)}
        onClick={() => { play('tap'); if (p.evolvedTo !== undefined) setPhase('evolve'); else nextParty(); }}>
        {p.evolvedTo !== undefined ? 'See what happens' : 'Continue'}
      </motion.button>
      <span className="sr-only">{stage}</span>
    </div>
  );
}

function Evolve({ from, to, onDone }: { from: number; to: number; onDone: () => void }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    play('evolve');
    haptic.medium();
    const a = setTimeout(() => haptic.medium(), 500);
    const b = setTimeout(() => haptic.heavy(), 1000);
    const c = setTimeout(() => {
      setShown(true);
      haptic.party();
      rain(1600);
      burst({ x: innerWidth / 2, y: innerHeight * 0.4, count: 70, power: 1.4, shapes: ['star', 'circle'] });
    }, 1450);
    return () => [a, b, c].forEach(clearTimeout);
  }, []);
  const st = STAGES[to];
  return (
    <div className="party-body evolve">
      <motion.p className="evolve-kicker" {...rise(0)}>{shown ? 'Your flame evolved into' : 'Your flame is evolving…'}</motion.p>
      <div className="evolve-stage">
        {!shown ? (
          <motion.div className="evolve-old" animate={{ scale: [1, 1.08, 0.96, 1.12, 0.9, 1.2], rotate: [0, -6, 6, -8, 8, 0], filter: ['brightness(1)', 'brightness(1.6)', 'brightness(1.2)', 'brightness(2.2)', 'brightness(1.5)', 'brightness(4)'] }}
            transition={{ duration: 1.4, ease: 'easeIn' }}>
            <StreakFlame stage={from} size={180} />
          </motion.div>
        ) : (
          <motion.div initial={{ scale: 0.2, opacity: 0, filter: 'brightness(4)' }} animate={{ scale: 1, opacity: 1, filter: 'brightness(1)' }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}>
            <StreakFlame stage={to} size={200} />
          </motion.div>
        )}
        {!shown && <motion.div className="evolve-flash" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1] }} transition={{ duration: 1.45, times: [0, 0.8, 1] }} />}
      </div>
      {shown && <>
        <motion.h1 {...pop}>{st.name}!</motion.h1>
        <motion.p className="party-sub" {...rise(0.2)}>{st.blurb}</motion.p>
        <motion.button type="button" className="btn big block white" {...rise(0.4)} onClick={() => { play('tap'); onDone(); }}>Awesome</motion.button>
      </>}
    </div>
  );
}

function FocusDone({ p }: { p: Extract<Party, { kind: 'focus' }> }) {
  const n = useCountUp(0, p.minutes, 450, 900);
  useEffect(() => {
    play('focusEnd');
    haptic.party();
    if (p.finished) rain(1600);
  }, [p.finished]);
  return (
    <div className="party-body">
      <motion.div {...pop}><HabitIcon icon={p.icon} color="purple" size={86} /></motion.div>
      <motion.h1 {...rise(0.15)}>{p.finished ? 'Session complete!' : 'Nice effort!'}</motion.h1>
      <motion.p className="party-sub" {...rise(0.25)}>{p.label}</motion.p>
      <motion.div className="party-count" {...rise(0.35)}><b>+{n}</b><span>min deep work</span></motion.div>
      <motion.div className="party-badge" {...rise(0.6)}>{fmtMinutes(p.weekMinutes)} this week</motion.div>
      {p.taskId ? <>
        <motion.p className="party-sub" {...rise(0.75)}>Did you finish the task?</motion.p>
        <motion.button type="button" className="btn big block white" {...rise(0.8)} onClick={() => { nextParty(); toggleTask(p.taskId!, { x: innerWidth / 2, y: innerHeight / 2 }); }}>Yes, it’s done!</motion.button>
        <motion.button type="button" className="btn block ghost-white" {...rise(0.9)} onClick={() => { play('tap'); nextParty(); }}>Not yet</motion.button>
      </> : <motion.button type="button" className="btn big block white" {...rise(0.8)} onClick={() => { play('tap'); nextParty(); }}>Continue</motion.button>}
    </div>
  );
}

function Feat({ p }: { p: Extract<Party, { kind: 'feat' }> }) {
  useEffect(() => {
    play('feat');
    haptic.success();
    const t = setTimeout(() => burst({ x: innerWidth / 2, y: innerHeight * 0.36, count: 60, power: 1.3, shapes: ['star', 'rect'] }), 350);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="party-body">
      <motion.p className="evolve-kicker" {...rise(0)}>{p.kicker || 'Milestone unlocked'}</motion.p>
      <motion.div className="medal" initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 13, delay: 0.15 }}>
        <span className="medal-ribbon" />
        <span className="medal-disc"><HabitIcon icon={p.icon} color="orange" size={70} /></span>
      </motion.div>
      <motion.h1 {...rise(0.3)}>{p.title}</motion.h1>
      <motion.p className="party-sub" {...rise(0.4)}>{p.text}</motion.p>
      <motion.button type="button" className="btn big block white" {...rise(0.55)} onClick={() => { play('tap'); nextParty(); }}>Continue</motion.button>
    </div>
  );
}
