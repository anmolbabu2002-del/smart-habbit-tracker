import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './styles/theme.css';
import './styles/app.css';
import { App } from './App';
import { restoreIfWiped, getState } from './lib/store';
import { migrateFromV1 } from './lib/migrate';
import { clearOldReminders, syncLock } from './lib/lock';
import { backgroundDownload } from './lib/proof';
import { afterHabitsChanged } from './lib/actions';
import { dailyBackup } from './lib/backup';

async function boot() {
  await restoreIfWiped(['ultradian.v2', 'journalEntries']);
  migrateFromV1();
  document.documentElement.dataset.theme = getState().theme;
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
  afterHabitsChanged();
  syncLock();
  clearOldReminders();
  setTimeout(dailyBackup, 8000);
  const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback || ((f: () => void) => setTimeout(f, 4000));
  idle(() => backgroundDownload(getState().habits.map(h => h.name)));
}
boot();
