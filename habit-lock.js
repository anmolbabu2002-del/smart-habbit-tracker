// habit-lock.js — Habit Lock (Android app only).
//
// From 4 PM until every habit of the day is done, Instagram, YouTube, Facebook, Snapchat and
// TikTok are covered by a lock screen ("🔒 Instagram is locked — Workout first"). The blocking
// itself is native code (.github/android/HabitLock*.java): a background service that, only
// while the lock is on, asks Android which app is in front (Usage access) and draws the lock
// screen over the blocked ones (Display over other apps). Nothing is stored or sent.
//
// While apps are locked, the easy ways out are closed: habits can't be deleted, renamed or
// reset, backups can't be restored, and Habit Lock itself can't be switched off.

(function () {
    'use strict';
    if (!window.ULTRADIAN_NATIVE) return; // the website can't block other apps

    const PLUGIN = 'UltradianHabitLock';
    const LOCK_FROM = 16 * 60; // 4:00 PM
    const APPS = [
        { name: 'Instagram', icon: '📸', pkgs: ['com.instagram.android', 'com.instagram.lite'] },
        { name: 'YouTube', icon: '▶️', pkgs: ['com.google.android.youtube'] },
        { name: 'Facebook', icon: '📘', pkgs: ['com.facebook.katana', 'com.facebook.lite'] },
        { name: 'Snapchat', icon: '👻', pkgs: ['com.snapchat.android'] },
        { name: 'TikTok', icon: '🎵', pkgs: ['com.zhiliaoapp.musically', 'com.ss.android.ugc.trill', 'com.zhiliaoapp.musically.go'] }
    ];
    const store = window.appStorage || localStorage;
    const call = (method, options) => window.ultradianNative(PLUGIN, method, options);
    const toast = (m) => { if (typeof window.showNotification === 'function') window.showNotification(m); };

    // ==================== STATE ====================
    const prefs = () => { try { return Object.assign({ enabled: false }, JSON.parse(store.getItem('habitLock') || '{}')); } catch (e) { return { enabled: false }; } };
    const setPrefs = (p) => store.setItem('habitLock', JSON.stringify(Object.assign(prefs(), p)));

    function habits() {
        if (typeof userHabits !== 'undefined' && Array.isArray(userHabits)) return userHabits.filter(h => h && h.text); // eslint-disable-line no-undef
        try { return JSON.parse(store.getItem('userHabits') || '[]').filter(h => h && h.text); } catch (e) { return []; }
    }
    const todayStr = () => new Date().toDateString();
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isDone = (h) => !!h.completedToday && h.lastCompletedDate === todayStr();
    const pending = () => habits().filter(h => !isDone(h));
    const label = (h) => `${h.emoji ? h.emoji + ' ' : ''}${String(h.text).trim()}`;
    const minutesNow = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

    // Locked now = switched on, past 4 PM, and habits still pending
    function isLocked() {
        return prefs().enabled && habits().length > 0 && minutesNow() >= LOCK_FROM && pending().length > 0;
    }

    // ==================== TELL ANDROID ====================
    let syncTimer = 0;
    function sync() {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            const list = habits(), left = pending();
            call('update', {
                enabled: prefs().enabled,
                lockFrom: LOCK_FROM,
                today: ymd(new Date()),
                habitCount: list.length,
                done: list.length > 0 && left.length === 0,
                pending: left.map(label),
                allHabits: list.map(label),
                blocked: APPS.flatMap(a => a.pkgs)
            }).catch(e => console.warn('Habit Lock: update failed', e)).finally(renderSettings);
        }, 300);
    }

    // ==================== CLOSE THE EASY WAYS OUT ====================
    const BLOCKED_CONTROLS = ['#habitSelectionModeBtn', '#deleteSelectedHabits', '#resetApp', '#deleteAllStreak', '#import-btn',
        '[data-ldb="restore"]', '#ldb-welcome-restore'];
    function refuse(e, what) {
        e.preventDefault();
        e.stopImmediatePropagation();
        toast(`🔒 ${what} is off until today's habits are done.`);
    }
    document.addEventListener('click', (e) => {
        if (!isLocked() || !e.target.closest) return;
        const hit = e.target.closest(BLOCKED_CONTROLS.join(','));
        if (!hit) return;
        const what = hit.id === 'habitSelectionModeBtn' || hit.id === 'deleteSelectedHabits' ? 'Deleting habits'
            : /restore|import/i.test(hit.id + (hit.dataset.ldb || '')) ? 'Restoring a backup' : 'Resetting the app';
        refuse(e, what);
    }, true);
    // Renaming a habit (double-tap on its name)
    document.addEventListener('dblclick', (e) => {
        if (isLocked() && e.target.closest && e.target.closest('#habits-list .habit-text')) refuse(e, 'Renaming habits');
    }, true);

    // ==================== "PROVE IT" ON THE LOCK SCREEN ====================
    function openHabits(app) {
        if (typeof window.showPage === 'function') window.showPage('main');
        setTimeout(() => {
            document.getElementById('tab-habits')?.click();
            document.getElementById('habits-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
        if (app) toast(`🔒 ${app} unlocks when today's habits are done.`);
    }
    (function listen() {
        const cap = window.Capacitor;
        const p = cap && cap.Plugins && cap.Plugins[PLUGIN];
        const cb = (d) => openHabits(d && d.app);
        try {
            if (p && typeof p.addListener === 'function') p.addListener('openHabits', cb);
            else if (cap && typeof cap.nativeCallback === 'function') cap.nativeCallback(PLUGIN, 'addListener', { eventName: 'openHabits' }, cb);
        } catch (e) { /* plugin missing in an older app build */ }
    })();

    // ==================== SETTINGS ====================
    let card = null;
    function buildSettings() {
        const anchor = [...document.querySelectorAll('#settings-page h3')].find(h => /Data Management/i.test(h.textContent));
        if (!anchor || card) return;
        card = document.createElement('section');
        card.className = 'hl-card';
        card.innerHTML = `
            <h3>🔒 Habit Lock</h3>
            <div class="hl-box">
                <label class="hl-row">
                    <span><b>Lock social apps until habits are done</b><small>From 4 PM until every habit of the day is done.</small></span>
                    <span class="hl-switch"><input type="checkbox" id="hl-toggle"><i></i></span>
                </label>
                <div class="hl-apps">${APPS.map(a => `<span>${a.icon} ${a.name}</span>`).join('')}</div>
                <div class="hl-access">
                    <div class="hl-perm" data-perm="usage"><span><b>Usage access</b><small>Lets the lock see which app is open — only while apps are locked.</small></span><button type="button" data-open="usage">Allow</button></div>
                    <div class="hl-perm" data-perm="overlay"><span><b>Display over other apps</b><small>Lets the lock screen cover a blocked app.</small></span><button type="button" data-open="overlay">Allow</button></div>
                </div>
                <p class="hl-status" id="hl-status"></p>
                <p class="hl-note">While apps are locked you can't turn this off, delete, rename or reset habits, or restore a backup. Nothing about your app use is saved or sent.</p>
            </div>`;
        anchor.parentNode.insertBefore(card, anchor);
        card.querySelector('#hl-toggle').addEventListener('change', (e) => {
            if (!e.target.checked && isLocked()) {
                e.target.checked = true;
                toast('🔒 Habit Lock can\'t be turned off until today\'s habits are done.');
                return;
            }
            setPrefs({ enabled: e.target.checked });
            sync();
            if (e.target.checked) toast('🔒 Habit Lock on — social apps lock at 4 PM until your habits are done.');
        });
        card.addEventListener('click', (e) => {
            const b = e.target.closest('[data-open]');
            if (!b) return;
            call(b.dataset.open === 'usage' ? 'openUsageAccessSettings' : 'openOverlaySettings').catch(() => toast('Couldn\'t open that settings page.'));
        });
        renderSettings();
    }

    async function renderSettings() {
        if (!card) return;
        const p = prefs();
        let st = { usageAccess: false, overlay: false, locked: false };
        try { st = await call('getStatus'); } catch (e) { /* older app build without the native part */ }
        card.querySelector('#hl-toggle').checked = p.enabled;
        card.classList.toggle('off', !p.enabled);
        const setPerm = (key, ok) => {
            const row = card.querySelector(`[data-perm="${key}"]`);
            row.classList.toggle('ok', ok);
            row.querySelector('button').textContent = ok ? '✓ Allowed' : 'Allow';
            row.querySelector('button').disabled = ok;
        };
        setPerm('usage', !!st.usageAccess);
        setPerm('overlay', !!st.overlay);
        const left = pending();
        const status = card.querySelector('#hl-status');
        if (!p.enabled) status.textContent = 'Off.';
        else if (!st.usageAccess || !st.overlay) status.textContent = '⚠️ Allow both accesses above, or apps won\'t be locked.';
        else if (!habits().length) status.textContent = 'Add a habit and the lock starts at 4 PM.';
        else if (isLocked()) status.textContent = `🔒 Locked now — ${left.length} ${left.length === 1 ? 'habit' : 'habits'} left: ${left.slice(0, 3).map(label).join(', ')}${left.length > 3 ? '…' : ''}`;
        else if (!left.length) status.textContent = '✅ All habits done — apps are unlocked for today.';
        else status.textContent = `Apps lock at 4 PM unless your ${left.length} ${left.length === 1 ? 'habit is' : 'habits are'} done first.`;
        // Accesses switched off while the lock was meant to be on
        if (p.enabled && (!st.usageAccess || !st.overlay) && store.getItem('habitLockWarned') !== todayStr()) {
            store.setItem('habitLockWarned', todayStr());
            toast('⚠️ Habit Lock can\'t block apps: ' + (!st.usageAccess ? 'Usage access' : 'Display over other apps') + ' is turned off. Open Settings → Habit Lock.');
        }
    }

    // The every-2-minute habit reminders were removed (Habit Lock replaced them). Phones that had
    // them still have up to ~440 scheduled with Android: cancel them all once, and clear the shade.
    function clearOldReminders() {
        if (store.getItem('habitRemindersCleared') === '1') return;
        const ids = Array.from({ length: 441 }, (_, i) => ({ id: 7099 + i })); // ids 7099–7539
        const ln = (m, o) => window.ultradianNative('LocalNotifications', m, o);
        ln('cancel', { notifications: ids })
            .then(() => ln('removeDeliveredNotifications', { notifications: ids }))
            .then(() => { store.setItem('habitRemindersCleared', '1'); store.removeItem('habitReminders'); })
            .catch(() => { /* plugin missing: nothing was ever scheduled */ });
    }

    function init() {
        clearOldReminders();
        buildSettings();
        sync();
        document.addEventListener('visibilitychange', () => { if (!document.hidden) { sync(); } });
        // Habits change → tell Android (also called from saveUserHabits)
    }

    window.HabitLock = { sync, isLocked, apps: APPS };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
