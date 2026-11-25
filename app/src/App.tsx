import { useState } from 'react';
import { TabBar, type Tab } from './components/TabBar';
import { Today } from './screens/Today';
import { Tasks } from './screens/Tasks';
import { FocusSetup, FocusRun } from './screens/Focus';

// Design preview: ?screen=today|tasks|focus|run and ?theme=dark
export function App() {
  const q = new URLSearchParams(location.search);
  const [tab, setTab] = useState<Tab>((q.get('screen') as Tab) || 'today');
  if (q.get('theme') === 'dark') document.documentElement.dataset.theme = 'dark';
  if (q.get('screen') === 'run') return <FocusRun />;
  return (
    <div className="app">
      {tab === 'today' && <Today />}
      {tab === 'tasks' && <Tasks />}
      {(tab === 'focus' || tab === 'more') && <FocusSetup />}
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
