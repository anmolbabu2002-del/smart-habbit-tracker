import { WidgetPrompt } from './components/WidgetPrompt';
import { takeWidgetTicks, listenWidget } from './lib/widget';
import { DeleteHabitConfirm } from './components/DeleteHabitConfirm';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TabBar, type Tab } from './components/TabBar';
import { FxLayer } from './components/FxLayer';
import { CelebrationHost } from './components/Celebration';
import { Toasts } from './components/Toasts';
import { ProofCamera } from './components/ProofCamera';
import { Today } from './screens/Today';
import { Tasks } from './screens/Tasks';
import { FocusSetup, FocusRun } from './screens/Focus';
import { More, type MorePage } from './screens/More';
const Library = lazy(() => import('./screens/more/Library').then(m => ({ default: m.Library })));
const Journal = lazy(() => import('./screens/more/Journal').then(m => ({ default: m.Journal })));
const Chat = lazy(() => import('./screens/more/Chat').then(m => ({ default: m.Chat })));
const Meditate = lazy(() => import('./screens/more/Meditate').then(m => ({ default: m.Meditate })));
const Settings = lazy(() => import('./screens/more/Settings').then(m => ({ default: m.Settings })));
import { useApp, getState } from './lib/store';
import { setSoundEnabled, play } from './lib/sound';
import { onBack } from './lib/back';
import { onOpenHabits, syncLock } from './lib/lock';
import { afterHabitsChanged } from './lib/actions';
import { today } from './lib/dates';
import type { Habit } from './lib/types';

export function App() {
  const s = useApp();
  const q = new URLSearchParams(location.search);
  const [tab, setTab] = useState<Tab>((q.get('tab') as Tab) || (q.get('page') ? 'more' : 'today'));
  const [proving, setProving] = useState<Habit | null>(null);
  const [page, setPage] = useState<MorePage | null>((q.get('page') as MorePage) || null);
  const closePage = useCallback(() => setPage(null), []);
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
    // Something asked for a habit's photo proof (e.g. after a focus session)
    const prove = (e: Event) => { const h = getState().habits.find(x => x.id === (e as CustomEvent).detail); if (h) setProving(h); };
    window.addEventListener('ultradian:prove', prove);
    // A new day: refresh everything and tell Habit Lock
    let last = today();
    const tick = () => { const d = today(); if (d !== last) { last = d; setDay(d); afterHabitsChanged(); } else syncLock(); };
    const iv = setInterval(tick, 30000);
    const vis = () => { if (!document.hidden) { takeWidgetTicks().finally(tick); } };
    takeWidgetTicks();
    listenWidget();
    document.addEventListener('visibilitychange', vis);
    return () => { off(); clearInterval(iv); document.removeEventListener('visibilitychange', vis); window.removeEventListener('ultradian:prove', prove); };
  }, []);

  const go = (t: Tab) => { if (t !== tab) { play('tap'); setTab(t); window.scrollTo({ top: 0 }); } };


  return (
    <div className="app">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
          {tab === 'today' && <Today onProve={setProving} onFocus={() => go('focus')} />}
          {tab === 'tasks' && <Tasks />}
          {tab === 'focus' && <FocusSetup />}
          {tab === 'more' && <More open={setPage} />}
        </motion.div>
      </AnimatePresence>
      <TabBar active={tab} onChange={go} />
      <Suspense fallback={null}><AnimatePresence>
        {page === 'library' && <Library key="library" onBack={closePage} />}
        {page === 'journal' && <Journal key="journal" onBack={closePage} />}
        {page === 'chat' && <Chat key="chat" onBack={closePage} />}
        {page === 'meditate' && <Meditate key="meditate" onBack={closePage} />}
        {page === 'settings' && <Settings key="settings" onBack={closePage} />}
      </AnimatePresence></Suspense>
      <AnimatePresence>{proving && <ProofCamera key={proving.id} habit={proving} onClose={() => setProving(null)} />}</AnimatePresence>
      <AnimatePresence>{s.focus.active && <FocusRun key="run" a={s.focus.active} />}</AnimatePresence>
      <DeleteHabitConfirm />
      <WidgetPrompt />
      <Toasts />
      <CelebrationHost />
      <FxLayer />
    </div>
  );
}
