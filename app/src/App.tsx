import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TabBar, type Tab } from './components/TabBar';
import { FxLayer } from './components/FxLayer';
import { CelebrationHost } from './components/Celebration';
import { Toasts } from './components/Toasts';
import { ProofCamera } from './components/ProofCamera';
import { Today } from './screens/Today';
import { Tasks } from './screens/Tasks';
import { FocusSetup, FocusRun } from './screens/Focus';
import { IconGallery } from './screens/IconGallery';
import { useApp } from './lib/store';
import { setSoundEnabled, play } from './lib/sound';
import { onBack } from './lib/back';
import { onOpenHabits, syncLock } from './lib/lock';
import { afterHabitsChanged } from './lib/actions';
import { today } from './lib/dates';
import type { Habit } from './lib/types';

export function App() {
  const s = useApp();
  const q = new URLSearchParams(location.search);
  const [tab, setTab] = useState<Tab>((q.get('tab') as Tab) || 'today');
  const [proving, setProving] = useState<Habit | null>(null);
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const [, setDay] = useState(today());

  useEffect(() => { document.documentElement.dataset.theme = s.theme; }, [s.theme]);
  useEffect(() => { setSoundEnabled(s.sound); }, [s.sound]);

  useEffect(() => {
    // Back: other tabs go to Today first
    const off = onBack(() => { if (tabRef.current !== 'today') { setTab('today'); return true; } return false; });
    // The lock screen's "Do it now" opens Today
    onOpenHabits(() => setTab('today'));
    // A new day: refresh everything and tell Habit Lock
    let last = today();
    const tick = () => { const d = today(); if (d !== last) { last = d; setDay(d); afterHabitsChanged(); } else syncLock(); };
    const iv = setInterval(tick, 30000);
    const vis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', vis);
    return () => { off(); clearInterval(iv); document.removeEventListener('visibilitychange', vis); };
  }, []);

  const go = (t: Tab) => { if (t !== tab) { play('tap'); setTab(t); window.scrollTo({ top: 0 }); } };

  if (q.get('screen') === 'icons') return <IconGallery />;
  if (q.get('screen') === 'run') return <FocusRun />;

  return (
    <div className="app">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
          {tab === 'today' && <Today onProve={setProving} onFocus={() => go('focus')} />}
          {tab === 'tasks' && <Tasks />}
          {(tab === 'focus' || tab === 'more') && <FocusSetup />}
        </motion.div>
      </AnimatePresence>
      <TabBar active={tab} onChange={go} />
      <AnimatePresence>{proving && <ProofCamera key={proving.id} habit={proving} onClose={() => setProving(null)} />}</AnimatePresence>
      <Toasts />
      <CelebrationHost />
      <FxLayer />
    </div>
  );
}
