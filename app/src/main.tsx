import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './styles/theme.css';
import './styles/app.css';
import { App } from './App';
import { restoreIfWiped, getState, update } from './lib/store';
import { migrateFromV1 } from './lib/migrate';
import { clearOldReminders, syncLock } from './lib/lock';
import { importOldQuote } from './lib/why';
import { backgroundDownload, needsPhoto, release, warmUp } from './lib/proof';
import { shownHabits } from './lib/lock';
import { today } from './lib/dates';
import { afterHabitsChanged } from './lib/actions';
import { dailyBackup } from './lib/backup';
import { initSystemBars } from './lib/systemBars';
import { isNative } from './lib/native';

function serviceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // The app's files are on the phone already; an old worker from the previous app isn't needed
  if (isNative) { navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {}); return; }
  if (import.meta.env.PROD) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

async function boot() {
  initSystemBars();
  serviceWorker();
  await restoreIfWiped(['ultradian.v2', 'journalEntries']);
  migrateFromV1();
  // Habit Lock is on by default (switched on once for people who had it off)
  // remember that habits existed, so an empty list later reads as a clean slate
  { const g = getState(); if (!g.hadHabits && (g.habits.length || g.perfectDays.length || g.bestStreak > 0)) update(d => { d.hadHabits = true; }); }
  if (!getState().lockDefaulted) update(d => { d.lock.enabled = true; d.lockDefaulted = true; });
  document.documentElement.dataset.theme = getState().theme;
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
  afterHabitsChanged();
  importOldQuote().finally(syncLock);
  clearOldReminders();
  setTimeout(dailyBackup, 8000);
  const idle = (window as unknown as { requestIdleCallback?: (f: () => void) => void }).requestIdleCallback || ((f: () => void) => setTimeout(f, 4000));
  idle(() => backgroundDownload(getState().habits.map(h => h.name)));
  // a photo habit is waiting today: have the photo check ready before the camera opens
  const photoWaiting = () => shownHabits().some(h => !h.history.includes(today()) && needsPhoto(h.name));
  setTimeout(() => { if (photoWaiting()) warmUp(); }, 2500);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) release(60_000); // in the background: free the memory after a minute
    else if (photoWaiting()) warmUp();
  });
}
boot();
