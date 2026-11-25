// habit-reminders.js — the app's only notifications: habits you haven't finished yet.
//
// From 4 PM to 11 PM a reminder arrives every 2 minutes (changeable in Settings) for as long
// as any habit is still pending, and they stop the moment the last one is done. The wording
// rotates and gets tougher as the evening goes on, and the icon changes with it:
//
//   4–6 PM   🌱 sprout     "3 habits left today" · "Next up: 🏃 Run"
//   6–8 PM   ⏳ hourglass  "5 h 30 min left today"
//   8–10 PM  🔥 flame      "Your 12-day streak dies tonight"
//   10–11 PM ⏰ alarm      "Last call" · 11 PM "Final reminder tonight"
//
// Each one names the actual habits and expands to list them with their streaks; with one
// habit left it gets a "✓ Mark done" button.
//
// Android app: scheduled with the phone's own notification system (Capacitor
// LocalNotifications) with exact alarms, so they keep coming every 2 minutes with the app
// closed or the screen off. The exact-alarm access is granted automatically at install;
// the only thing you're asked is "Allow notifications". Today and tomorrow are scheduled
// (Android allows an app 500 alarms) and rebuilt whenever a habit changes or the app opens.
// Website: browsers can't schedule notifications for a closed page, so there they arrive
// only while the app is open.

(function () {
    'use strict';

    const WINDOW_START = 16 * 60;            // 4:00 PM, in minutes after midnight
    const WINDOW_END = 23 * 60;              // 11:00 PM (the last reminder)
    const EVERY_OPTIONS = [2, 3, 5, 10, 15, 30];
    const DEFAULT_EVERY = 2;
    const DAYS_AHEAD = 2;                    // today + tomorrow: ≤ 422 alarms at every 2 min (Android caps apps at 500)
    const PER_DAY = 220;                     // id space per day (211 reminders at most)
    const ID_BASE = 7100;                    // our notification ids: 7100–7539
    const TEST_ID = 7099;
    const CHANNEL = 'habits';
    const PREF_KEY = 'habitReminders';       // { enabled, asked, every }
    const isNative = !!window.ULTRADIAN_NATIVE;
    const store = window.appStorage || localStorage;

    // The evening in four phases: icon, colour and how hard the wording pushes
    const PHASES = [
        { until: 18 * 60, icon: 'habit_sprout', color: '#10b981', kinds: ['next', 'count', 'time'] },
        { until: 20 * 60, icon: 'habit_hourglass', color: '#d97706', kinds: ['next', 'time', 'count'] },
        { until: 22 * 60, icon: 'habit_flame', color: '#ea580c', kinds: ['streak', 'next', 'time'] },
        { until: 24 * 60, icon: 'habit_alarm', color: '#7c3aed', kinds: ['last', 'time', 'next'] }
    ];
    const NUDGES = [
        'Reminders stop the moment you finish.',
        'Ten focused minutes is enough to start.',
        'Do the smallest one first.',
        'Start now — not in {every} minutes.',
        'Future you is counting on this.',
        'One habit, right now.',
        'You said you would. Do it now.',
        'Close the app after this and go do it.'
    ];

    const native = (method, options) => window.ultradianNative('LocalNotifications', method, options);

    // ==================== PREFERENCES ====================
    function prefs() {
        let p;
        try { p = Object.assign({ enabled: false, asked: false, every: DEFAULT_EVERY }, JSON.parse(store.getItem(PREF_KEY) || '{}')); }
        catch (e) { p = { enabled: false, asked: false, every: DEFAULT_EVERY }; }
        if (!EVERY_OPTIONS.includes(Number(p.every))) p.every = DEFAULT_EVERY;
        p.every = Number(p.every);
        return p;
    }
    function setPrefs(p) { store.setItem(PREF_KEY, JSON.stringify(Object.assign(prefs(), p))); }

    // Every reminder time in the 4–11 PM window
    function slots(every) {
        const out = [];
        for (let t = WINDOW_START, n = 0; t <= WINDOW_END; t += every, n++) {
            const phase = PHASES.findIndex(p => t < p.until);
            out.push({ n, mins: t, h: Math.floor(t / 60), m: t % 60, phase, icon: PHASES[phase].icon, color: PHASES[phase].color });
        }
        return out;
    }

    // ==================== HABITS ====================
    function habits() {
        if (typeof userHabits !== 'undefined' && Array.isArray(userHabits)) return userHabits; // eslint-disable-line no-undef
        try { return JSON.parse(store.getItem('userHabits') || '[]'); } catch (e) { return []; }
    }
    const dayStr = (d) => d.toDateString();
    const label = (h) => `${h.emoji ? h.emoji + ' ' : ''}${String(h.text || '').trim()}`;
    const plural = (n, one, many) => n === 1 ? one : many;

    // A habit's streak is "alive" on `day` if it was last completed the day before
    function liveStreak(h, day) {
        const before = new Date(day); before.setDate(before.getDate() - 1);
        return h.lastCompletedDate === dayStr(before) ? (h.streak || 0) : 0;
    }

    // What's left on a given day. Today: the real state. Tomorrow: every habit (they reset
    // each day); streaks still count for tomorrow if today's gets done.
    function openOn(day, offset) {
        const all = habits().filter(h => h && h.text);
        if (offset === 0) {
            const left = all.filter(h => !(h.completedToday && h.lastCompletedDate === dayStr(day)));
            return { all, left, streakOf: (h) => liveStreak(h, day) };
        }
        return {
            all, left: all,
            streakOf: (h) => offset === 1 && h.lastCompletedDate === dayStr(new Date()) ? (h.streak || 0) : 0
        };
    }

    // ==================== WHAT EACH REMINDER SAYS ====================
    function timeLeft(mins) {
        const left = 24 * 60 - mins, h = Math.floor(left / 60), m = left % 60;
        return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
    }

    function message(slot, info, offset) {
        const { all, left, streakOf } = info;
        const n = left.length, total = all.length, done = total - n;
        const first = left[0];
        const withStreak = left.map(h => ({ h, s: streakOf(h) })).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
        const list = left.map(label);
        const listShort = list.length <= 3 ? list.join(', ') : `${list.slice(0, 2).join(', ')} and ${list.length - 2} more`;
        const habitsWord = (k) => `${k} ${plural(k, 'habit', 'habits')}`;

        let kind = PHASES[slot.phase].kinds[slot.n % PHASES[slot.phase].kinds.length];
        if (slot.n === 0) kind = 'start';
        if (slot.mins === WINDOW_END) kind = 'final';
        if (kind === 'streak' && !withStreak.length) kind = 'count';

        let title, body;
        switch (kind) {
            case 'start':
                title = `${habitsWord(n)} left today`;
                body = done === 0 ? `${listShort}. Start with the easiest one.` : `${listShort}. You've done ${done} of ${total} — keep going.`;
                break;
            case 'next':
                title = `Next up: ${label(first)}`;
                body = n === 1 ? 'It\'s the only one left today.' : `Then ${n - 1} more: ${list.slice(1, 3).join(', ')}${n > 3 ? '…' : ''}.`;
                break;
            case 'count':
                title = `Still ${habitsWord(n)} to go`;
                body = `${listShort}.${total ? ` ${done}/${total} done.` : ''}`;
                break;
            case 'time':
                title = `${timeLeft(slot.mins)} left today`;
                body = `${listShort} ${plural(n, 'is', 'are')} still pending.`;
                break;
            case 'streak': {
                const top = withStreak[0];
                title = `Your ${top.s}-day streak dies tonight 🔥`;
                body = withStreak.length === 1 ? `Unless you do ${label(top.h)}.${n > 1 ? ` Plus ${n - 1} more pending.` : ''}`
                    : `${withStreak.length} streaks at risk: ${withStreak.slice(0, 3).map(x => `${label(x.h)} (${x.s})`).join(', ')}.`;
                break;
            }
            case 'last':
                title = `Last call: ${habitsWord(n)} left`;
                body = n === 1 ? `Finish ${label(first)} and close the day with everything done.` : `${listShort}. Even one of them keeps you moving.`;
                break;
            default: // final, 11 PM
                title = 'Final reminder tonight';
                body = n === 1 ? `Do ${label(first)} now — this is the last nudge.` : `${listShort}. Finish what you can before midnight.`;
        }
        if (kind !== 'final') body += ' ' + NUDGES[slot.n % NUDGES.length].replace('{every}', prefs().every);

        const inbox = left.slice(0, 6).map(h => { const s = streakOf(h); return `${label(h)}${s ? `  ·  🔥 ${s}` : ''}`; });
        if (left.length > 6) inbox.push(`+ ${left.length - 6} more`);
        const summary = offset === 0 ? `${done}/${total} done · reminder ${slot.n + 1}` : `${habitsWord(total)} today · reminder ${slot.n + 1}`;
        return { title, body, inbox, summary };
    }

    function slotTime(day, slot) {
        const t = new Date(day); t.setHours(slot.h, slot.m, 0, 0); return t;
    }

    // Every reminder that should exist right now: the rest of today's, then tomorrow's
    function plan(now) {
        now = now || new Date();
        const every = prefs().every, daySlots = slots(every), out = [];
        for (let offset = 0; offset < DAYS_AHEAD; offset++) {
            const day = new Date(now); day.setDate(day.getDate() + offset); day.setHours(12, 0, 0, 0);
            const info = openOn(day, offset);
            if (!info.left.length) continue;
            for (const slot of daySlots) {
                const at = slotTime(day, slot);
                if (at <= now) continue;
                out.push({
                    id: ID_BASE + offset * PER_DAY + slot.n,
                    at, slot, ...message(slot, info, offset),
                    single: offset === 0 && info.left.length === 1 ? String(info.left[0].text) : null,
                    date: dayStr(day)
                });
            }
        }
        return out;
    }

    // ==================== ANDROID APP ====================
    let nativeReady = null;
    function nativeSetup() {
        if (nativeReady) return nativeReady;
        nativeReady = (async () => {
            await native('createChannel', {
                id: CHANNEL, name: 'Habit reminders',
                description: 'Every few minutes from 4 to 11 PM while habits are pending',
                importance: 4, visibility: 1, vibration: true, lights: true, lightColor: '#10b981'
            }).catch(() => {});
            await native('registerActionTypes', {
                types: [
                    { id: 'habit-single', actions: [{ id: 'done', title: '✓ Mark done' }] },
                    { id: 'habit-photo', actions: [{ id: 'prove', title: '📷 Prove it' }] }
                ]
            }).catch(() => {});
            listenNative('localNotificationActionPerformed', (ev) => handleAction(ev && ev.actionId, ev && ev.notification && ev.notification.extra));
        })();
        return nativeReady;
    }

    function listenNative(eventName, cb) {
        const cap = window.Capacitor;
        const p = cap && cap.Plugins && cap.Plugins.LocalNotifications;
        try {
            if (p && typeof p.addListener === 'function') p.addListener(eventName, cb);
            else if (cap && typeof cap.nativeCallback === 'function') cap.nativeCallback('LocalNotifications', 'addListener', { eventName }, cb);
        } catch (e) { /* plugin missing */ }
    }

    async function nativePermission(ask) {
        try {
            let st = await native('checkPermissions');
            if (st.display !== 'granted' && ask) st = await native('requestPermissions');
            return st.display === 'granted' ? 'granted' : st.display === 'denied' ? 'denied' : 'prompt';
        } catch (e) { return 'unavailable'; }
    }

    const idList = (from, count) => Array.from({ length: count }, (_, i) => ({ id: from + i }));

    async function nativeSync() {
        await nativeSetup();
        await native('cancel', { notifications: idList(ID_BASE, DAYS_AHEAD * PER_DAY) }).catch(() => {});
        // Opening the app clears the pile of reminders already in the notification shade
        await native('removeDeliveredNotifications', { notifications: idList(ID_BASE, PER_DAY) }).catch(() => {});
        if (!prefs().enabled) return 0;
        const list = plan();
        if (!list.length) return 0;
        await native('schedule', {
            notifications: list.map(r => ({
                id: r.id,
                title: r.title,
                body: r.body,
                largeBody: r.body,
                summaryText: r.summary,
                inboxList: r.inbox.length > 1 ? r.inbox : undefined,
                schedule: { at: r.at.toISOString(), allowWhileIdle: true },
                channelId: CHANNEL,
                smallIcon: 'ic_stat_habit',
                largeIcon: r.slot.icon,
                iconColor: r.slot.color,
                group: 'habit-reminders',
                autoCancel: true,
                actionTypeId: r.single ? (needsPhoto(r.single) ? 'habit-photo' : 'habit-single') : undefined,
                extra: { kind: 'habit', habit: r.single, date: r.date }
            }))
        });
        return list.length;
    }

    // ==================== WEBSITE ====================
    // Timers for today's remaining reminders; each re-checks your habits when it fires
    let webTimers = [];
    function webSync() {
        webTimers.forEach(clearTimeout);
        webTimers = [];
        if (!prefs().enabled || !('Notification' in window) || Notification.permission !== 'granted') return 0;
        const now = new Date();
        const today = slots(prefs().every).map(s => ({ s, at: slotTime(now, s) })).filter(x => x.at > now);
        today.forEach(({ s, at }) => webTimers.push(setTimeout(() => webShow(s), at - now)));
        const midnight = new Date(now); midnight.setHours(24, 0, 5, 0);
        webTimers.push(setTimeout(webSync, midnight - now));
        return today.length;
    }

    async function webShow(slot, test) {
        const info = openOn(new Date(), 0);
        if (!info.left.length && !test) return;
        const msg = test ? testMessage() : message(slot, info, 0);
        const single = !test && info.left.length === 1 ? String(info.left[0].text) : null;
        const options = {
            body: msg.body + (msg.inbox.length > 1 ? '\n' + msg.inbox.join('\n') : ''),
            icon: `notify-icons/web/${slot.icon}.png`,
            badge: 'notify-icons/web/badge.png',
            tag: 'habit-reminder', renotify: true,
            data: { kind: 'habit', habit: single, date: new Date().toDateString() },
            actions: single ? [needsPhoto(single) ? { action: 'prove', title: '📷 Prove it' } : { action: 'done', title: '✓ Mark done' }] : []
        };
        try {
            const reg = navigator.serviceWorker ? await navigator.serviceWorker.ready : null;
            if (reg) await reg.showNotification(msg.title, options);
            else new Notification(msg.title, options);
        } catch (e) {
            try { new Notification(msg.title, options); } catch (err) { console.warn('Habit reminder failed', err); }
        }
    }

    // ==================== TAPS & BUTTONS ====================
    function openHabits() {
        if (typeof window.showPage === 'function') window.showPage('main');
        setTimeout(() => {
            document.getElementById('tab-habits')?.click();
            document.getElementById('habits-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
    }

    // Photo-proof habits can't be ticked from a notification — the button opens the camera
    const needsPhoto = (text) => !!(window.HabitProof && window.HabitProof.needsPhoto({ text }));

    function handleAction(actionId, extra) {
        extra = extra || {};
        if ((actionId === 'done' || actionId === 'prove') && extra.habit && extra.date === new Date().toDateString()) {
            const list = habits();
            const i = list.findIndex(h => String(h.text) === extra.habit);
            if (i >= 0 && !list[i].completedToday) {
                if (needsPhoto(extra.habit)) {
                    openHabits();
                    setTimeout(() => window.HabitProof.open(i), 400);
                    return;
                }
                if (typeof window.toggleHabit === 'function') {
                    window.toggleHabit(i, true); // shows "🔥 done! Streak: n" and resyncs reminders
                    return;
                }
            }
        }
        openHabits();
    }

    // Website: taps arrive from the service worker as a message, or as ?habit= on a fresh open
    if (navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'habit-notification') handleAction(e.data.action, e.data.data);
        });
    }

    // ==================== SYNC ====================
    let syncTimer = 0;
    function sync() {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
            (isNative ? nativeSync() : Promise.resolve(webSync())).catch(e => console.warn('Habit reminders: sync failed', e));
            renderSettings();
        }, 400);
    }

    async function enable() {
        let permission;
        if (isNative) permission = await nativePermission(true);
        else if ('Notification' in window) {
            permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
        } else permission = 'unavailable';
        setPrefs({ enabled: permission === 'granted', asked: true });
        sync();
        if (typeof window.showNotification === 'function') {
            window.showNotification(permission === 'granted' ? `🔔 Habit reminders on — every ${prefs().every} min from 4 to 11 PM while habits are pending.`
                : permission === 'denied' ? '🔕 Notifications are blocked. Allow them for Ultradian in your phone settings.'
                : 'Notifications aren\'t available here.');
        }
        return permission;
    }

    function disable() { setPrefs({ enabled: false, asked: true }); sync(); }

    function testMessage() {
        const info = openOn(new Date(), 0);
        if (!info.left.length) return { title: 'Habit reminders work 🎉', body: 'All your habits are done — you\'d only hear from us if some were left.', inbox: [], summary: '' };
        const flame = slots(prefs().every).find(s => s.phase === 2);
        const m = message(flame, info, 0);
        return { ...m, title: m.title + ' (test)' };
    }

    async function sendTest() {
        const slot = slots(prefs().every).find(s => s.phase === 2);
        if (isNative) {
            await nativeSetup();
            if (await nativePermission(true) !== 'granted') return enable();
            const m = testMessage();
            const left = openOn(new Date(), 0).left;
            await native('schedule', {
                notifications: [{
                    id: TEST_ID, title: m.title, body: m.body, largeBody: m.body, summaryText: m.summary,
                    inboxList: m.inbox.length > 1 ? m.inbox : undefined,
                    schedule: { at: new Date(Date.now() + 3000).toISOString(), allowWhileIdle: true },
                    channelId: CHANNEL, smallIcon: 'ic_stat_habit', largeIcon: slot.icon, iconColor: slot.color,
                    actionTypeId: left.length === 1 ? (needsPhoto(String(left[0].text)) ? 'habit-photo' : 'habit-single') : undefined,
                    extra: { kind: 'habit', habit: left.length === 1 ? String(left[0].text) : null, date: new Date().toDateString() }
                }]
            });
        } else {
            if (!('Notification' in window)) return;
            if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return;
            setTimeout(() => webShow(slot, true), 3000);
        }
        if (typeof window.showNotification === 'function') window.showNotification('🔔 Test reminder arrives in 3 seconds — lock your screen to see it.');
    }

    // ==================== SETTINGS CARD ====================
    const ICON_SVG = {
        sprout: '<svg viewBox="0 0 256 256" aria-hidden="true"><circle cx="128" cy="128" r="128" fill="#10b981"/><path d="M128 196V122" stroke="#fff" stroke-width="14" stroke-linecap="round"/><path d="M128 130c-4-34-28-54-62-54 0 34 24 56 62 54z" fill="#fff"/><path d="M128 112c4-36 30-58 66-58 0 36-26 60-66 58z" fill="#ecfdf5"/><path d="M84 196h88" stroke="#fff" stroke-width="14" stroke-linecap="round"/></svg>',
        hourglass: '<svg viewBox="0 0 256 256" aria-hidden="true"><circle cx="128" cy="128" r="128" fill="#f59e0b"/><path d="M84 60h88M84 196h88" stroke="#fff" stroke-width="14" stroke-linecap="round"/><path d="M94 62c0 40 34 48 34 66s-34 26-34 66h68c0-40-34-48-34-66s34-26 34-66z" fill="none" stroke="#fff" stroke-width="12" stroke-linejoin="round"/><path d="M106 186c4-18 22-24 22-34 0 10 18 16 22 34z" fill="#fff"/></svg>',
        flame: '<svg viewBox="0 0 256 256" aria-hidden="true"><circle cx="128" cy="128" r="128" fill="#f97316"/><path d="M128 208c-38 0-62-26-62-60 0-30 20-48 34-66 4 18 12 28 22 32-4-30 10-58 34-74-2 30 10 46 24 64 12 14 10 26 10 44 0 34-24 60-62 60z" fill="#fff"/><path d="M128 198c-18 0-30-12-30-30 0-16 12-26 20-36 2 10 8 16 14 18-2-16 6-30 18-38 0 16 6 24 12 32 6 8 6 14 6 24 0 18-14 30-40 30z" fill="#fed7aa"/></svg>',
        alarm: '<svg viewBox="0 0 256 256" aria-hidden="true"><circle cx="128" cy="128" r="128" fill="#8b5cf6"/><circle cx="128" cy="138" r="62" fill="none" stroke="#fff" stroke-width="14"/><path d="M128 104v36l24 16" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><path d="M62 82l26-24M194 82l-26-24" stroke="#fff" stroke-width="14" stroke-linecap="round"/></svg>'
    };
    const PHASE_INFO = [
        ['sprout', '4–6 PM', 'What\'s left, next up'],
        ['hourglass', '6–8 PM', 'Time left today'],
        ['flame', '8–10 PM', 'Streaks at risk'],
        ['alarm', '10–11 PM', 'Last calls']
    ];

    let card = null;
    function buildSettings() {
        const heading = [...document.querySelectorAll('#settings-page h3')].find(h => /Data Management/i.test(h.textContent));
        if (!heading || card) return;
        card = document.createElement('section');
        card.className = 'hr-card';
        card.innerHTML = `
            <h3>🔔 Habit reminders</h3>
            <div class="hr-box">
                <label class="hr-row">
                    <span><b>Remind me about unfinished habits</b><small>4 PM to 11 PM, only while habits are pending. They stop the moment you finish.</small></span>
                    <span class="hr-switch"><input type="checkbox" id="hr-toggle"><i></i></span>
                </label>
                <label class="hr-every">Remind me every
                    <select id="hr-every">${EVERY_OPTIONS.map(m => `<option value="${m}">${m} minutes</option>`).join('')}</select>
                </label>
                <ul class="hr-times">${PHASE_INFO.map(([icon, time, what]) => `<li>${ICON_SVG[icon]}<b>${time}</b><span>${what}</span></li>`).join('')}</ul>
                <p class="hr-status" id="hr-status"></p>
                <button type="button" class="hr-test" id="hr-test">Send a test reminder</button>
            </div>`;
        heading.parentNode.insertBefore(card, heading);
        card.querySelector('#hr-toggle').addEventListener('change', (e) => { if (e.target.checked) enable(); else disable(); });
        card.querySelector('#hr-every').addEventListener('change', (e) => { setPrefs({ every: Number(e.target.value) }); sync(); });
        card.querySelector('#hr-test').addEventListener('click', sendTest);
        renderSettings();
    }

    async function renderSettings() {
        if (!card) return;
        const p = prefs();
        card.querySelector('#hr-toggle').checked = p.enabled;
        card.querySelector('#hr-every').value = String(p.every);
        card.classList.toggle('off', !p.enabled);
        const status = card.querySelector('#hr-status');
        let perm = 'unavailable';
        if (isNative) perm = await nativePermission(false);
        else if ('Notification' in window) perm = Notification.permission === 'default' ? 'prompt' : Notification.permission;
        const left = openOn(new Date(), 0).left.length;
        const upcoming = p.enabled ? plan() : [];
        const next = upcoming[0];
        const tonight = upcoming.filter(r => r.date === dayStr(new Date())).length;
        status.textContent = perm === 'denied' ? '🔕 Notifications are blocked for this app — allow them in your phone\'s settings.'
            : !p.enabled ? 'Off.'
            : !habits().length ? 'Add a habit and reminders will start.'
            : next ? `Next: ${next.at.toLocaleDateString([], { weekday: 'short' })} ${next.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}, then every ${p.every} min until 11 PM — ${left ? `${left} ${plural(left, 'habit', 'habits')} pending${tonight ? `, up to ${tonight} more tonight` : ''}` : 'all done today ✓'}.`
            : 'All done for today ✓';
        if (!isNative && p.enabled) status.textContent += ' On the website, reminders arrive only while the app is open — install the Android app to get them with it closed.';
    }

    // First time someone with habits opens the app: offer reminders once
    function maybeOffer() {
        const p = prefs();
        if (p.asked || p.enabled || !habits().length) return;
        if (!isNative && !('Notification' in window)) return;
        const el = document.createElement('div');
        el.className = 'hr-offer';
        el.innerHTML = `<div class="hr-offer-card" role="dialog" aria-label="Habit reminders">
                ${ICON_SVG.flame}
                <b>Never miss a habit</b>
                <p>From 4 to 11 PM you'll get a reminder every ${p.every} minutes while any habit is pending. They stop the moment you finish.</p>
                <div><button type="button" data-a="no">Not now</button><button type="button" data-a="yes" class="hr-yes">Turn on</button></div>
            </div>`;
        document.body.appendChild(el);
        el.addEventListener('click', async (e) => {
            const a = e.target.closest('[data-a]');
            if (!a && e.target !== el) return;
            el.remove();
            if (a && a.dataset.a === 'yes') await enable();
            else setPrefs({ asked: true });
        });
    }

    // ==================== START ====================
    function init() {
        buildSettings();
        sync();
        document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
        // Opened from a notification on the website (no window was open)
        const q = new URLSearchParams(location.search);
        if (q.get('habit')) {
            setTimeout(() => handleAction(q.get('habit'), { habit: q.get('name'), date: q.get('date') }), 1200);
            history.replaceState(null, '', location.pathname);
        }
        setTimeout(maybeOffer, 6000);
    }

    window.HabitReminders = { sync, enable, disable, sendTest, plan, prefs };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
