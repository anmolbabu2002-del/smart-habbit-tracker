// Backups: everything in one JSON file (same format as the old app, so old backups restore).
// In the Android app a copy is also written to Documents/Ultradian once a day, which survives
// uninstalling the app. Book files are not included (they can be big); re-add them if needed.
import { isNative, native } from './native';
import { blobGet, blobSet, mirror } from './store';
import { today } from './dates';

const SKIP = /^(customBookBinary_|bookCache_|bookCacheIndex$|seeded$)/;
const DIR = 'Ultradian';

export async function backupJson() {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && !SKIP.test(k)) data[k] = localStorage.getItem(k)!;
  }
  const chats = await blobGet('aiChats');
  if (chats) data['ultradian.aiChats'] = JSON.stringify(chats);
  return JSON.stringify({ app: 'ultradian', version: 3, exportedAt: new Date().toISOString(), data });
}

/** Save a backup file: Documents/Ultradian on the phone, a download on the website */
export async function saveBackup(): Promise<string> {
  const json = await backupJson();
  const name = `ultradian-backup-${today()}.json`;
  if (isNative) {
    try {
      await native('Filesystem', 'writeFile', { path: `${DIR}/${name}`, data: json, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true });
      return 'Saved to Documents › Ultradian';
    } catch {
      const tmp = await native<{ uri: string }>('Filesystem', 'writeFile', { path: name, data: json, directory: 'CACHE', encoding: 'utf8' });
      await native('Share', 'share', { title: 'Ultradian backup', files: [tmp.uri] });
      return 'Backup ready to share';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'Backup downloaded';
}

/** Once a day in the Android app, quietly */
export function dailyBackup() {
  if (!isNative || localStorage.getItem('lastAutoBackup') === today()) return;
  backupJson().then(json => native('Filesystem', 'writeFile', { path: `${DIR}/ultradian-backup-${today()}.json`, data: json, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true }))
    .then(() => localStorage.setItem('lastAutoBackup', today()))
    .catch(() => {});
}

/** Replace everything with a backup file, then reload */
export async function restoreBackup(file: File) {
  const parsed = JSON.parse(await file.text());
  const data: Record<string, unknown> = parsed?.app === 'ultradian' && parsed.data ? parsed.data : parsed;
  const entries = Object.entries(data || {}).filter(([, v]) => typeof v === 'string') as [string, string][];
  if (!entries.some(([k]) => /^(ultradian\.v2|userHabits|habitAppState|journalEntries|userName)$/.test(k))) throw new Error('That file isn’t an Ultradian backup.');
  localStorage.clear();
  for (const [k, v] of entries) {
    if (k === 'ultradian.aiChats') { await blobSet('aiChats', JSON.parse(v)); continue; }
    localStorage.setItem(k, v);
    await mirror(k, v);
  }
  // An old-app backup: let the new app migrate it on the next start
  if (!entries.some(([k]) => k === 'ultradian.v2')) await mirror('ultradian.v2', null);
  location.reload();
}
