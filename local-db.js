// local-db.js — keeps your data safe outside Chrome
// Everything a website stores (localStorage, IndexedDB) is deleted when Chrome's
// "cookies and site data" are cleared. So the app also keeps your data as a file on
// the device itself:
//   • Folder mode (browsers with the File System Access API): pick a folder once and
//     every change is saved there automatically, uploaded books included.
//   • Daily backup mode (e.g. Chrome on Android without folder access): once a day the
//     app saves a backup file to Downloads.
// After Chrome is cleared, "Restore from backup" brings everything back.

(function () {
    const PREFS_KEY = 'localDbPrefs';
    const DATA_FILE = 'ultradian-data.json';
    const supportsFolder = typeof window.showDirectoryPicker === 'function';
    const notify = (m) => { if (typeof showNotification === 'function') showNotification(m); };

    let prefs = { daily: true, lastDay: '', lastAt: 0, lastHash: '' };
    try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') }; } catch (e) { /* defaults */ }
    const savePrefs = () => localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

    let dir = null;          // folder handle
    let folderOk = false;    // permission granted
    let saveTimer = 0;
    let saving = false;
    let pendingBooks = true; // check the folder's book files on the next save

    // ── tiny IndexedDB store for the folder handle ──
    function handleStore(mode, fn) {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('UltradianFiles', 1);
            req.onupgradeneeded = () => req.result.createObjectStore('h');
            req.onerror = () => reject(req.error);
            req.onsuccess = () => {
                const tx = req.result.transaction('h', mode);
                const r = fn(tx.objectStore('h'));
                tx.oncomplete = () => resolve(r && r.result);
                tx.onerror = () => reject(tx.error);
            };
        });
    }

    // ── snapshots ──
    function hash(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        return (h >>> 0).toString(36) + ':' + str.length;
    }

    // Everything the app stores, minus this file's own bookkeeping (so saving doesn't count as a change)
    function appData() {
        const all = appStorage.exportAll();
        delete all[PREFS_KEY];
        return all;
    }
    const dataJson = () => JSON.stringify(appData());

    function bufferToBase64(buf) {
        return new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result).split(',')[1] || '');
            r.readAsDataURL(new Blob([buf]));
        });
    }

    function base64ToBuffer(b64) {
        const bin = atob(b64);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out.buffer;
    }

    async function bookKeys() {
        if (typeof localforage === 'undefined') return [];
        return (await localforage.keys()).filter(k => k.startsWith('customBookBinary_'));
    }

    async function fullBackup() {
        const backup = { app: 'ultradian', version: 2, exportedAt: new Date().toISOString(), data: appData(), books: {} };
        for (const k of await bookKeys()) {
            const buf = await localforage.getItem(k);
            if (buf) backup.books[k] = await bufferToBase64(buf);
        }
        return backup;
    }

    // Restore a parsed backup (v1 or v2). Returns false if it isn't ours.
    async function restoreBackup(parsed) {
        const data = parsed && parsed.app === 'ultradian' && parsed.data ? parsed.data : parsed;
        const entries = data && typeof data === 'object' && !Array.isArray(data)
            ? Object.entries(data).filter(([, v]) => typeof v === 'string') : [];
        if (!entries.some(([k]) => k === 'habitAppState' || k === 'userName')) return false;
        await appStorage.importAll(Object.fromEntries(entries));
        for (const [k, b64] of Object.entries((parsed && parsed.books) || {})) {
            if (k.startsWith('customBookBinary_') && typeof b64 === 'string') await appStorage.setBinaryItem(k, base64ToBuffer(b64));
        }
        return true;
    }
    window.restoreUltradianBackup = restoreBackup;

    function downloadJson(obj, name) {
        const url = URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    const today = () => new Date().toISOString().slice(0, 10);

    async function backupNow(silent) {
        const backup = await fullBackup();
        downloadJson(backup, `ultradian-backup-${today()}.json`);
        prefs.lastDay = today();
        prefs.lastAt = Date.now();
        prefs.lastHash = hash(dataJson());
        savePrefs();
        renderCard();
        if (!silent) notify('💾 Backup saved to your Downloads');
    }

    // ── folder mode ──
    async function writeFile(handle, name, contents) {
        const fh = await handle.getFileHandle(name, { create: true });
        const w = await fh.createWritable();
        await w.write(contents);
        await w.close();
    }

    async function saveToFolder() {
        if (!dir || !folderOk || saving) return;
        saving = true;
        try {
            const json = dataJson();
            const h = hash(json);
            if (h !== prefs.lastHash) {
                await writeFile(dir, DATA_FILE, JSON.stringify({ app: 'ultradian', version: 2, savedAt: new Date().toISOString(), data: JSON.parse(json) }));
                prefs.lastHash = h;
            }
            if (pendingBooks) {
                pendingBooks = false;
                const books = await dir.getDirectoryHandle('books', { create: true });
                const keys = await bookKeys();
                for (const k of keys) {
                    try { await books.getFileHandle(k + '.bin'); } catch (e) {
                        const buf = await localforage.getItem(k);
                        if (buf) await writeFile(books, k + '.bin', buf);
                    }
                }
                // Remove files of deleted books
                for await (const [name] of books.entries()) {
                    if (name.endsWith('.bin') && !keys.includes(name.slice(0, -4))) await books.removeEntry(name).catch(() => {});
                }
            }
            prefs.lastAt = Date.now();
            savePrefs();
            renderCard();
        } catch (e) {
            console.warn('[LocalDB] folder save failed', e);
            folderOk = false;
            renderCard();
        } finally {
            saving = false;
        }
    }

    function scheduleSave(books) {
        if (books) pendingBooks = true;
        if (!dir) return;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(saveToFolder, 3000);
    }

    async function readFolderBackup(handle) {
        try {
            const file = await (await handle.getFileHandle(DATA_FILE)).getFile();
            const parsed = JSON.parse(await file.text());
            parsed.books = {};
            try {
                const books = await handle.getDirectoryHandle('books');
                for await (const [name, fh] of books.entries()) {
                    if (!name.endsWith('.bin')) continue;
                    parsed.books[name.slice(0, -4)] = await bufferToBase64(await (await fh.getFile()).arrayBuffer());
                }
            } catch (e) { /* no books folder */ }
            return parsed;
        } catch (e) {
            return null;
        }
    }

    async function connectFolder() {
        let handle;
        try {
            handle = await window.showDirectoryPicker({ id: 'ultradian-data', mode: 'readwrite', startIn: 'documents' });
        } catch (e) { return; } // cancelled
        dir = handle;
        folderOk = true;
        await handleStore('readwrite', s => s.put(handle, 'dir')).catch(() => {});
        const saved = await readFolderBackup(handle);
        const hasLocal = !!appStorage.getItem('habitAppState');
        if (saved && (!hasLocal || confirm(`This folder already has Ultradian data (saved ${new Date(saved.savedAt || saved.exportedAt || Date.now()).toLocaleString()}).\n\nOK = load that data into the app\nCancel = keep this phone's data and save it to the folder`))) {
            if (await restoreBackup(saved)) {
                notify('📂 Data loaded from your folder. Reloading…');
                setTimeout(() => location.reload(), 1200);
                return;
            }
        }
        prefs.lastHash = '';
        pendingBooks = true;
        await saveToFolder();
        notify('📂 Auto-save is on — your data now lives in that folder too');
    }

    async function resumeFolder(fromTap) {
        if (!dir) return;
        try {
            let perm = await dir.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted' && fromTap) perm = await dir.requestPermission({ mode: 'readwrite' });
            folderOk = perm === 'granted';
        } catch (e) { folderOk = false; }
        renderCard();
        if (folderOk) saveToFolder();
    }

    // ── daily backup (no folder access) ──
    let checkedDay = '';
    function maybeDailyBackup() {
        if (dir || !prefs.daily || prefs.lastDay === today() || checkedDay === today()) return;
        checkedDay = today(); // check once per day per visit
        if (!appStorage.getItem('habitAppState')) return;
        if (prefs.lastHash && prefs.lastHash === hash(dataJson())) return; // nothing new since the last backup
        backupNow(true).then(() => notify('💾 Today\'s backup was saved to Downloads'));
    }

    // ── restore from a file (welcome screen + settings) ──
    function pickAndRestore() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;
            try {
                const ok = await restoreBackup(JSON.parse(await file.text()));
                if (!ok) { notify('⚠️ That file isn\'t an Ultradian backup — nothing was changed.'); return; }
                prefs.lastDay = today();
                prefs.lastHash = hash(dataJson());
                savePrefs();
                notify('📥 Your data is back! Reloading…');
                setTimeout(() => location.reload(), 1200);
            } catch (e) {
                notify('⚠️ Couldn\'t read that backup file.');
            }
        };
        input.click();
    }

    // ── Settings card ──
    function timeAgo(t) {
        if (!t) return 'never';
        const m = Math.round((Date.now() - t) / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return `${m} min ago`;
        const h = Math.round(m / 60);
        if (h < 24) return `${h} h ago`;
        return new Date(t).toLocaleDateString();
    }

    function renderCard() {
        const card = document.getElementById('ldb-card');
        if (!card) return;
        let status;
        if (dir && folderOk) status = `✅ Auto-saving to your <b>${dir.name}</b> folder · saved ${timeAgo(prefs.lastAt)}`;
        else if (dir) status = `⏸️ Auto-save to <b>${dir.name}</b> is paused — tap <b>Resume</b> to allow it again`;
        else if (prefs.daily) status = `✅ A backup is saved to <b>Downloads</b> once a day · last ${timeAgo(prefs.lastAt)}`;
        else status = '⚠️ No automatic backup — clearing Chrome would erase your data';
        card.innerHTML = `
            <div class="ldb-head">💾 <b>Your data, saved on this phone</b></div>
            <p class="ldb-status">${status}</p>
            <div class="ldb-actions">
                ${supportsFolder ? (dir && !folderOk
                    ? '<button type="button" data-ldb="resume">▶️ Resume auto-save</button>'
                    : `<button type="button" data-ldb="folder">📂 ${dir ? 'Change folder' : 'Auto-save to a folder'}</button>`) : ''}
                <button type="button" data-ldb="backup">💾 Back up now</button>
                <button type="button" data-ldb="restore">📥 Restore from backup</button>
            </div>
            ${dir ? '' : `<label class="ldb-toggle"><input type="checkbox" data-ldb="daily" ${prefs.daily ? 'checked' : ''}> Save a backup to Downloads every day</label>`}
            <p class="ldb-hint">Clearing Chrome's "cookies and site data" wipes the app's memory, but these files stay on your phone. After clearing, open the app and tap <b>Restore from backup</b>.</p>`;
    }

    function buildCard() {
        const controls = document.querySelector('#settings-page .backup-controls');
        if (!controls || document.getElementById('ldb-card')) return;
        const card = document.createElement('div');
        card.id = 'ldb-card';
        card.className = 'ldb-card';
        controls.parentNode.insertBefore(card, controls);
        controls.style.display = 'none'; // replaced by the card's buttons
        card.addEventListener('click', (e) => {
            const b = e.target.closest('[data-ldb]');
            if (!b || b.tagName === 'INPUT') return;
            const act = b.dataset.ldb;
            if (act === 'folder') connectFolder();
            if (act === 'resume') resumeFolder(true);
            if (act === 'backup') backupNow(false);
            if (act === 'restore') pickAndRestore();
        });
        card.addEventListener('change', (e) => {
            if (e.target.dataset.ldb === 'daily') { prefs.daily = e.target.checked; savePrefs(); renderCard(); }
        });
        const style = document.createElement('style');
        style.textContent = `
            .ldb-card{padding:16px;border-radius:16px;background:var(--bg-input);border:1px solid var(--border);margin-bottom:16px}
            .ldb-head{font-size:1rem;color:var(--text-main);margin-bottom:6px}
            .ldb-status{margin:0 0 12px;font-size:.82rem;line-height:1.45;color:var(--text-main)}
            .ldb-actions{display:flex;flex-wrap:wrap;gap:8px}
            .ldb-actions button{flex:1 1 auto;border:1px solid var(--border);background:var(--bg-card);color:var(--text-main);border-radius:12px;padding:10px 12px;font-weight:700;font-size:.82rem;cursor:pointer}
            .ldb-toggle{display:flex;gap:8px;align-items:center;margin-top:12px;font-size:.82rem;color:var(--text-main);cursor:pointer}
            .ldb-hint{margin:10px 0 0;font-size:.72rem;line-height:1.45;color:var(--text-muted)}
            #ldb-welcome-restore{display:block;margin:12px auto 0;background:none;border:none;color:#7c5cf0;font-weight:700;font-size:.9rem;cursor:pointer;text-decoration:underline}`;
        document.head.appendChild(style);
        renderCard();
    }

    function buildWelcomeRestore() {
        const btn = document.getElementById('overlay-save-name-btn');
        if (!btn || document.getElementById('ldb-welcome-restore')) return;
        btn.insertAdjacentHTML('afterend', '<button type="button" id="ldb-welcome-restore">📥 Restore my data from a backup</button>');
        document.getElementById('ldb-welcome-restore').addEventListener('click', pickAndRestore);
    }

    // ── watch for changes ──
    function hookStorage() {
        const wrap = (name, books) => {
            const orig = appStorage[name].bind(appStorage);
            appStorage[name] = function (...args) {
                const r = orig(...args);
                scheduleSave(books);
                return r;
            };
        };
        wrap('setItem', false);
        wrap('removeItem', false);
        wrap('setBinaryItem', true);
        wrap('removeBinaryItem', true);
    }

    async function init() {
        if (typeof appStorage === 'undefined') return;
        hookStorage();
        buildCard();
        buildWelcomeRestore();
        // Ask the browser not to evict our data when the phone is low on space
        try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* ignore */ }
        if (supportsFolder) {
            try { dir = (await handleStore('readonly', s => s.get('dir'))) || null; } catch (e) { dir = null; }
            if (dir) await resumeFolder(false);
        }
        renderCard();
        // Daily backup is a download, which needs a tap: run it on the first tap of the day
        document.addEventListener('pointerdown', () => setTimeout(maybeDailyBackup, 1500), { capture: true });
        document.addEventListener('visibilitychange', () => { if (document.hidden && dir && folderOk) saveToFolder(); });
        setInterval(() => { if (dir && folderOk) saveToFolder(); }, 60000);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 800));
    else setTimeout(init, 800);

    window.LocalDB = { backupNow: () => backupNow(false), restore: pickAndRestore, connectFolder, get folder() { return dir && dir.name; } };
})();
