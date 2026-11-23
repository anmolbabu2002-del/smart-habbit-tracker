// focus-gym.js — the Mind Games tab: short drills, each built on a well-studied task and
// tied to a skill that deep work runs on. Every drill adapts its level to you, keeps your
// scores, and feeds a small daily workout.
//
//   Working memory   N-Back, Memory Matrix
//   Focus            Schulte Table
//   Impulse control  Go / No-Go, Color Clash (Stroop)
//   Switching        Task Switch
//   Mental math      Tug of War
//
// Everything is drawn here; index.html only has <div id="brain-games-page"> for it.

(function () {
    'use strict';

    const $ = (sel, root) => (root || document).querySelector(sel);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const rand = (n) => Math.floor(Math.random() * n);
    const pick = (arr) => arr[rand(arr.length)];
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const avg = (arr) => arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;
    const sfx = (name) => { try { window.SFX && window.SFX.play(name); } catch (e) { /* sound is optional */ } };
    const todayKey = (d) => { const x = d || new Date(); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
    const store = window.appStorage || localStorage;

    // ==================== SKILLS & DRILLS ====================
    const SKILLS = {
        memory: { name: 'Working memory', icon: '🧠', why: 'Hold plans, numbers and ideas in mind while you work.' },
        focus: { name: 'Focus', icon: '🎯', why: 'Lock onto what matters and scan quickly.' },
        control: { name: 'Impulse control', icon: '🛑', why: 'Resist distractions and automatic reactions.' },
        switching: { name: 'Switching', icon: '🔀', why: 'Move between tasks and lose less time doing it.' },
        math: { name: 'Mental math', icon: '➗', why: 'Work with numbers quickly, without a calculator.' }
    };

    const DRILLS = []; // filled below: { id, name, skill, icon, color, minutes, maxLevel, unit, how, science, run }

    // ==================== SAVED PROGRESS ====================
    const KEY = 'focusGym';
    function load() {
        let s = null;
        try { s = JSON.parse(store.getItem(KEY) || 'null'); } catch (e) { s = null; }
        if (!s || typeof s !== 'object') s = {};
        s.levels = s.levels || {};
        s.best = s.best || {};
        s.history = Array.isArray(s.history) ? s.history : [];
        s.workouts = s.workouts || {};
        return s;
    }
    let data = load();
    function save() {
        // Keep it small: the last 400 sessions and 60 days of workouts
        if (data.history.length > 400) data.history = data.history.slice(-400);
        const days = Object.keys(data.workouts).sort();
        days.slice(0, Math.max(0, days.length - 60)).forEach(d => delete data.workouts[d]);
        try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { console.warn('Focus Gym: could not save', e); }
    }
    const levelOf = (id) => clamp(data.levels[id] || 1, 1, drill(id).maxLevel);
    const drill = (id) => DRILLS.find(d => d.id === id);
    const sessionsOf = (id) => data.history.filter(h => h.d === id);

    // ==================== DAILY WORKOUT ====================
    // Three drills, three different skills, favouring the skills you've trained least lately
    function todaysWorkout() {
        const key = todayKey();
        let w = data.workouts[key];
        if (w && Array.isArray(w.plan) && w.plan.every(drill)) return w;
        const lastTrained = {};
        data.history.forEach(h => { const sk = drill(h.d) && drill(h.d).skill; if (sk) lastTrained[sk] = Math.max(lastTrained[sk] || 0, h.t); });
        const skills = Object.keys(SKILLS).sort((a, b) => (lastTrained[a] || 0) - (lastTrained[b] || 0) || Math.random() - 0.5);
        const plan = skills.slice(0, 3).map(sk => pick(DRILLS.filter(d => d.skill === sk)).id);
        w = data.workouts[key] = { plan, done: [] };
        save();
        return w;
    }

    function workoutStreak() {
        let streak = 0;
        const d = new Date();
        const doneOn = (day) => { const w = data.workouts[todayKey(day)]; return w && w.plan && w.plan.every(id => w.done.includes(id)); };
        if (!doneOn(d)) d.setDate(d.getDate() - 1); // today not finished yet doesn't break the streak
        while (doneOn(d)) { streak++; d.setDate(d.getDate() - 1); }
        return streak;
    }

    // ==================== HUB ====================
    let root = null;

    function renderHub() {
        if (!root) return;
        const w = todaysWorkout();
        const done = w.plan.filter(id => w.done.includes(id)).length;
        const allDone = done === w.plan.length;
        const streak = workoutStreak();
        const mins = w.plan.reduce((s, id) => s + drill(id).minutes, 0);

        const skillRows = Object.entries(SKILLS).map(([key, sk]) => {
            const ds = DRILLS.filter(d => d.skill === key);
            const pct = Math.max(...ds.map(d => (levelOf(d.id) - 1) / (d.maxLevel - 1)));
            const played = ds.some(d => sessionsOf(d.id).length);
            return `<div class="fg-skill">
                <span class="fg-skill-icon">${sk.icon}</span>
                <div class="fg-skill-main"><div class="fg-skill-top"><b>${esc(sk.name)}</b><small>${played ? 'Level ' + Math.max(...ds.map(d => levelOf(d.id))) : 'Not trained yet'}</small></div>
                <div class="fg-bar"><i style="width:${played ? Math.max(6, Math.round(pct * 100)) : 0}%"></i></div></div></div>`;
        }).join('');

        const cards = DRILLS.map(d => {
            const best = data.best[d.id];
            const n = sessionsOf(d.id).length;
            return `<button type="button" class="fg-card" data-drill="${d.id}" style="--c:${d.color}">
                <span class="fg-card-icon">${d.icon}</span>
                <span class="fg-card-text"><b>${esc(d.name)}</b><small>${esc(SKILLS[d.skill].name)} · ${d.minutes} min</small></span>
                <span class="fg-card-meta">${n ? `<b>Lv ${levelOf(d.id)}</b><small>Best ${best} ${esc(d.unit)}</small>` : '<small class="fg-new">New</small>'}</span>
            </button>`;
        }).join('');

        root.innerHTML = `
            <div class="fg">
                <header class="fg-head">
                    <h1 class="page-title">Focus Gym 🧠</h1>
                    <p>Short drills for the skills deep work runs on.</p>
                </header>

                <section class="fg-workout ${allDone ? 'is-done' : ''}">
                    <div class="fg-workout-top">
                        <div><small>Today's workout</small><b>${allDone ? 'Done for today ✓' : `${w.plan.length} drills · about ${mins} min`}</b></div>
                        ${streak ? `<span class="fg-streak" title="Days in a row">🔥 ${streak}</span>` : ''}
                    </div>
                    <ol class="fg-plan">${w.plan.map(id => { const d = drill(id); return `<li class="${w.done.includes(id) ? 'done' : ''}"><span>${d.icon}</span>${esc(d.name)}<small>${esc(SKILLS[d.skill].name)}</small></li>`; }).join('')}</ol>
                    ${allDone ? '<p class="fg-workout-note">Nice work. Come back tomorrow for a new mix.</p>'
                        : `<button type="button" class="fg-btn fg-btn-main" data-act="workout">${done ? 'Continue workout' : 'Start workout'} →</button>`}
                </section>

                <section class="fg-section">
                    <h2>Your skills</h2>
                    <div class="fg-skills">${skillRows}</div>
                </section>

                <section class="fg-section">
                    <h2>All drills</h2>
                    <div class="fg-cards">${cards}</div>
                </section>
            </div>`;
    }

    // ==================== DRILL SCREEN ====================
    let screen = null;
    let session = null; // { drill, workout, timers, keyHandler, finished }

    function buildScreen() {
        screen = document.createElement('div');
        screen.className = 'fg-screen';
        screen.hidden = true;
        screen.setAttribute('role', 'dialog');
        screen.innerHTML = `
            <div class="fg-bar-top">
                <button type="button" class="fg-close" aria-label="Close" title="Close">✕</button>
                <div class="fg-title"><b></b><small></small></div>
                <span class="fg-status"></span>
            </div>
            <div class="fg-progress"><i></i></div>
            <div class="fg-body"></div>`;
        document.body.appendChild(screen);
        $('.fg-close', screen).addEventListener('click', closeScreen);
        document.addEventListener('keydown', (e) => {
            if (screen.hidden) return;
            if (e.key === 'Escape') { closeScreen(); return; }
            if (session && session.keyHandler && !e.repeat) session.keyHandler(e);
        });
        // A drill can't be scored fairly if the app was in the background part-way
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && session && session.playing) {
                stopTimers();
                showIntro(session.drill.id, session.workout, 'Paused because the app went to the background. Start again when you\'re ready.');
            }
        });
    }

    function stopTimers() {
        if (!session) return;
        session.timers.forEach(t => { clearTimeout(t); clearInterval(t); });
        session.timers = [];
        if (session.raf) cancelAnimationFrame(session.raf);
        session.keyHandler = null;
        session.playing = false;
    }

    function openScreen() {
        if (!screen) buildScreen();
        screen.hidden = false;
        document.body.classList.add('game-active', 'fg-open');
        requestAnimationFrame(() => screen.classList.add('open'));
    }

    function closeScreen() {
        stopTimers();
        session = null;
        if (!screen) return;
        screen.classList.remove('open');
        document.body.classList.remove('game-active', 'fg-open');
        setTimeout(() => { if (!session) screen.hidden = true; }, 200);
        renderHub();
    }

    function setHeader(d, sub) {
        $('.fg-title b', screen).textContent = d.name;
        $('.fg-title small', screen).textContent = sub || SKILLS[d.skill].name;
        screen.style.setProperty('--c', d.color);
        setStatus('');
        setProgress(0);
    }
    const setStatus = (t) => { $('.fg-status', screen).textContent = t; };
    const setProgress = (f) => { $('.fg-progress i', screen).style.width = `${clamp(f, 0, 1) * 100}%`; };
    const body = () => $('.fg-body', screen);

    function trendBars(id) {
        const last = sessionsOf(id).slice(-12);
        if (last.length < 2) return '';
        const max = Math.max(...last.map(h => h.s), 1);
        return `<div class="fg-trend" aria-label="Your recent scores">${last.map(h => `<i style="height:${Math.max(8, Math.round(h.s / max * 100))}%" title="${h.s}"></i>`).join('')}</div><small class="fg-trend-label">Your last ${last.length} sessions</small>`;
    }

    function showIntro(id, workout, note) {
        const d = drill(id);
        stopTimers();
        session = { drill: d, workout: !!workout, timers: [], keyHandler: null, playing: false };
        openScreen();
        const step = workout ? todaysWorkout().plan.indexOf(id) + 1 : 0;
        setHeader(d, workout ? `Workout · drill ${step} of ${todaysWorkout().plan.length}` : '');
        const level = levelOf(id);
        body().innerHTML = `
            <div class="fg-intro">
                <div class="fg-intro-icon">${d.icon}</div>
                <h2>${esc(d.name)}</h2>
                <p class="fg-intro-skill">${SKILLS[d.skill].icon} ${esc(SKILLS[d.skill].name)} — ${esc(SKILLS[d.skill].why)}</p>
                ${note ? `<p class="fg-note">${esc(note)}</p>` : ''}
                <div class="fg-how"><b>How to play</b>${d.how(level)}</div>
                <details class="fg-science"><summary>Why this works</summary><p>${d.science}</p></details>
                ${trendBars(id)}
                <div class="fg-level-pick">
                    <button type="button" data-lv="-1" aria-label="Easier" ${level <= 1 ? 'disabled' : ''}>−</button>
                    <span>Level <b>${level}</b> of ${d.maxLevel}</span>
                    <button type="button" data-lv="1" aria-label="Harder" ${level >= d.maxLevel ? 'disabled' : ''}>+</button>
                </div>
                <button type="button" class="fg-btn fg-btn-main fg-start">Start</button>
            </div>`;
        body().querySelectorAll('[data-lv]').forEach(b => b.addEventListener('click', () => {
            data.levels[id] = clamp(level + Number(b.dataset.lv), 1, d.maxLevel);
            save();
            showIntro(id, workout);
        }));
        body().querySelector('.fg-start').addEventListener('click', () => countdown(d));
        session.keyHandler = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); countdown(d); } };
    }

    function countdown(d) {
        session.keyHandler = null;
        let n = 3;
        body().innerHTML = `<div class="fg-count"><b>${n}</b><small>Get ready</small></div>`;
        const tick = () => {
            n--;
            if (!session) return;
            if (n === 0) return play(d);
            body().querySelector('.fg-count b').textContent = n;
            session.timers.push(setTimeout(tick, 650));
        };
        session.timers.push(setTimeout(tick, 650));
    }

    function play(d) {
        const level = levelOf(d.id);
        body().innerHTML = '<div class="fg-play"></div>';
        session.playing = true;
        const s = session;
        const ctx = {
            el: body().querySelector('.fg-play'),
            level,
            after: (ms, fn) => { const t = setTimeout(() => { if (session === s && s.playing) fn(); }, ms); s.timers.push(t); return t; },
            every: (ms, fn) => { const t = setInterval(() => { if (session === s && s.playing) fn(); }, ms); s.timers.push(t); return t; },
            cancel: (t) => { clearTimeout(t); clearInterval(t); },
            frame: (fn) => { const loop = (now) => { if (session !== s || !s.playing) return; if (fn(now) !== false) s.raf = requestAnimationFrame(loop); }; s.raf = requestAnimationFrame(loop); },
            keys: (fn) => { s.keyHandler = fn; },
            status: setStatus,
            progress: setProgress,
            good: () => sfx('tap'),
            bad: () => { sfx('error'); try { navigator.vibrate?.(40); } catch (e) { /* no vibration */ } },
            finish: (result) => { if (session !== s || !s.playing) return; stopTimers(); finish(d, level, result); }
        };
        d.run(ctx);
    }

    function finish(d, level, r) {
        const newLevel = clamp(r.level != null ? r.level : level + (r.delta || 0), 1, d.maxLevel);
        const score = Math.max(0, Math.round(r.score));
        const prevBest = data.best[d.id];
        const isBest = score > 0 && (prevBest == null || score > prevBest);
        data.levels[d.id] = newLevel;
        if (isBest) data.best[d.id] = score;
        data.history.push({ d: d.id, s: score, l: level, a: r.accuracy != null ? Math.round(r.accuracy * 100) : null, t: Date.now() });

        let next = null;
        if (session.workout) {
            const w = todaysWorkout();
            if (!w.done.includes(d.id)) w.done.push(d.id);
            next = w.plan.find(id => !w.done.includes(id)) || null;
        }
        save();
        try { store.setItem('lastBrainWorkoutDate', new Date().toDateString()); } catch (e) { /* optional */ }
        sfx(isBest || newLevel > level ? 'celebrate' : 'confirm');

        const workoutDone = session.workout && !next;
        const levelLine = newLevel > level ? `<span class="fg-up">Level up → ${newLevel}</span>`
            : newLevel < level ? `<span class="fg-down">Level ${newLevel} next time — a bit easier</span>`
            : `<span>Level ${level} — keep going</span>`;
        setProgress(1);
        setStatus('');
        body().innerHTML = `
            <div class="fg-result">
                ${workoutDone ? '<div class="fg-banner">🎉 Workout complete!</div>' : ''}
                <small>${esc(r.headline || 'Your score')}</small>
                <div class="fg-score">${score}<span>${esc(d.unit)}</span></div>
                ${isBest && prevBest != null ? '<div class="fg-best">★ New personal best</div>' : prevBest != null ? `<div class="fg-prev">Best: ${prevBest} ${esc(d.unit)}</div>` : ''}
                <div class="fg-level-line">${levelLine}</div>
                <div class="fg-stats">${(r.stats || []).map(([k, v]) => `<div><b>${esc(v)}</b><small>${esc(k)}</small></div>`).join('')}</div>
                ${r.insight ? `<p class="fg-insight">💡 ${esc(r.insight)}</p>` : ''}
                ${trendBars(d.id)}
                <div class="fg-actions">
                    ${next ? `<button type="button" class="fg-btn fg-btn-main" data-act="next">Next: ${esc(drill(next).name)} →</button>`
                        : `<button type="button" class="fg-btn fg-btn-main" data-act="done">Done</button>`}
                    <button type="button" class="fg-btn" data-act="again">Play again</button>
                </div>
            </div>`;
        body().querySelector('[data-act="again"]').addEventListener('click', () => showIntro(d.id, false));
        body().querySelector('[data-act="next"]')?.addEventListener('click', () => showIntro(next, true));
        body().querySelector('[data-act="done"]')?.addEventListener('click', closeScreen);
        if (workoutDone && typeof window.showNotification === 'function') window.showNotification('🧠 Brain workout done for today!');
    }

    // ==================== DRILL: N-BACK ====================
    DRILLS.push({
        id: 'nback', name: 'N-Back', skill: 'memory', icon: '🔲', color: '#6366f1', minutes: 2, maxLevel: 8, unit: 'pts',
        how: (lv) => `<p>A square lights up on a 3×3 grid, one after another.</p>
            <p>Tap <b>Match</b> when the square is in the <b>same place as ${lv === 1 ? 'the one just before' : `${lv} steps back`}</b>. Otherwise do nothing.</p>
            <p class="fg-how-small">Level = how many steps back (${lv}-back now). Keyboard: Space.</p>`,
        science: 'N-back is the most widely used working-memory task in research. You must keep updating a short list in your head while comparing against it — the same mental juggling you do when holding a plan, a phone number or an argument while working.',
        run(ctx) {
            const N = ctx.level, total = 20 + N, STEP = 2500, SHOW = 900;
            const pos = [];
            for (let i = 0; i < total; i++) {
                if (i >= N && Math.random() < 0.3) pos.push(pos[i - N]);
                else { let p; do { p = rand(9); } while (i >= N && p === pos[i - N]); pos.push(p); }
            }
            ctx.el.innerHTML = `<div class="fg-nb-hint">${N === 1 ? 'Same place as the last one?' : `Same place as ${N} back?`}</div>
                <div class="fg-nb-grid">${Array.from({ length: 9 }, (_, i) => `<i data-i="${i}"></i>`).join('')}</div>
                <button type="button" class="fg-btn fg-big fg-nb-match">Match</button>`;
            const cells = ctx.el.querySelectorAll('.fg-nb-grid i');
            const btn = ctx.el.querySelector('.fg-nb-match');
            let i = -1, responded = false, hits = 0, misses = 0, fa = 0, cr = 0;
            const isTarget = (k) => k >= N && pos[k] === pos[k - N];
            const flash = (cls) => { btn.classList.remove('ok', 'no'); void btn.offsetWidth; btn.classList.add(cls); };
            function respond() {
                if (i < N || responded) return;
                responded = true;
                if (isTarget(i)) { hits++; flash('ok'); ctx.good(); } else { fa++; flash('no'); ctx.bad(); }
            }
            btn.addEventListener('pointerdown', (e) => { e.preventDefault(); respond(); });
            ctx.keys((e) => { if (e.key === ' ' || e.key === 'j' || e.key === 'Enter') { e.preventDefault(); respond(); } });
            function step() {
                if (i >= N) {
                    if (isTarget(i) && !responded) { misses++; flash('miss'); }
                    else if (!isTarget(i) && !responded) cr++;
                }
                i++;
                if (i >= total) {
                    const scored = total - N, errors = misses + fa, acc = (hits + cr) / scored;
                    const targets = hits + misses;
                    return ctx.finish({
                        score: N * 100 * acc, accuracy: acc,
                        delta: errors <= 3 ? 1 : errors >= 6 ? -1 : 0,
                        headline: `${N}-back`,
                        stats: [['Accuracy', Math.round(acc * 100) + '%'], ['Matches caught', `${hits}/${targets}`], ['False alarms', fa]],
                        insight: errors <= 3 ? 'Fewer than 4 mistakes — next time it goes one step further back.'
                            : errors >= 6 ? 'Lots to hold at once — one step back next time, then build up again.'
                            : 'Get to 3 mistakes or fewer to move up a level.'
                    });
                }
                responded = false;
                ctx.status(`${i + 1}/${total}`);
                ctx.progress(i / total);
                cells.forEach(c => c.classList.remove('on'));
                void cells[pos[i]].offsetWidth;
                cells[pos[i]].classList.add('on');
                ctx.after(SHOW, () => cells[pos[i]] && cells[pos[i]].classList.remove('on'));
                ctx.after(STEP, step);
            }
            step();
        }
    });

    // ==================== DRILL: MEMORY MATRIX ====================
    DRILLS.push({
        id: 'matrix', name: 'Memory Matrix', skill: 'memory', icon: '🟪', color: '#ec4899', minutes: 2, maxLevel: 12, unit: 'tiles',
        how: (lv) => `<p>Some tiles light up for a moment. Then tap <b>every tile that lit up</b>.</p>
            <p>Get a round right and the next one has one more tile; miss and it has one fewer. 10 rounds.</p>
            <p class="fg-how-small">You start at ${lv + 2} tiles.</p>`,
        science: 'This is a visual-spatial span task, like the Corsi blocks used in neuropsychology. How many places you can hold at once is a direct measure of visual working memory — what you use to keep a layout, a diagram or your place on a page in mind.',
        run(ctx) {
            const ROUNDS = 10;
            let tiles = ctx.level + 2, round = 0, bestSpan = 0, correctRounds = 0;
            const sideFor = (t) => t <= 4 ? 3 : t <= 7 ? 4 : t <= 11 ? 5 : 6;
            function next() {
                round++;
                if (round > ROUNDS) {
                    const acc = correctRounds / ROUNDS;
                    return ctx.finish({
                        score: bestSpan, accuracy: acc,
                        level: Math.max(1, Math.min(ctx.level + 3, bestSpan - 2)), // start a little under your best, at most 3 levels up per session
                        headline: 'Most tiles remembered',
                        stats: [['Rounds right', `${correctRounds}/${ROUNDS}`], ['Best round', `${bestSpan} tiles`], ['Ended on', `${tiles} tiles`]],
                        insight: bestSpan >= 7 ? 'Seven or more places at once is a strong visual memory.' : 'Tip: group the lit tiles into a shape or pattern instead of remembering them one by one.'
                    });
                }
                ctx.status(`Round ${round}/${ROUNDS}`);
                ctx.progress((round - 1) / ROUNDS);
                const side = sideFor(tiles);
                const lit = new Set(shuffle([...Array(side * side).keys()]).slice(0, tiles));
                ctx.el.innerHTML = `<div class="fg-mm-info">${tiles} tiles</div>
                    <div class="fg-mm-grid" style="--n:${side}">${Array.from({ length: side * side }, (_, i) => `<button type="button" data-i="${i}" disabled></button>`).join('')}</div>
                    <div class="fg-mm-msg">Watch…</div>`;
                const cells = [...ctx.el.querySelectorAll('.fg-mm-grid button')];
                const msg = ctx.el.querySelector('.fg-mm-msg');
                ctx.after(400, () => lit.forEach(i => cells[i].classList.add('lit')));
                ctx.after(400 + 900 + tiles * 120, () => {
                    lit.forEach(i => cells[i].classList.remove('lit'));
                    msg.textContent = `Tap the ${tiles} tiles`;
                    let found = 0, over = false;
                    cells.forEach(c => { c.disabled = false; });
                    cells.forEach((c, i) => c.addEventListener('click', () => {
                        if (over || c.classList.contains('hit')) return;
                        if (lit.has(i)) {
                            c.classList.add('hit');
                            found++;
                            ctx.good();
                            if (found === tiles) {
                                over = true;
                                correctRounds++;
                                bestSpan = Math.max(bestSpan, tiles);
                                msg.textContent = '✓ Correct';
                                tiles = Math.min(tiles + 1, 16);
                                ctx.after(700, next);
                            }
                        } else {
                            over = true;
                            c.classList.add('wrong');
                            ctx.bad();
                            lit.forEach(k => { if (!cells[k].classList.contains('hit')) cells[k].classList.add('reveal'); });
                            msg.textContent = 'Not quite — here they were';
                            tiles = Math.max(2, tiles - 1);
                            ctx.after(1300, next);
                        }
                    }));
                });
            }
            next();
        }
    });

    // ==================== DRILL: SCHULTE TABLE ====================
    const SCHULTE = [null, { n: 4 }, { n: 5 }, { n: 5, tint: true }, { n: 6 }, { n: 6, tint: true }, { n: 7, tint: true }];
    DRILLS.push({
        id: 'schulte', name: 'Schulte Table', skill: 'focus', icon: '🔢', color: '#0ea5e9', minutes: 1, maxLevel: 6, unit: '/min',
        how: (lv) => `<p>Tap the numbers <b>in order, from 1 to ${SCHULTE[lv].n * SCHULTE[lv].n}</b>, as fast as you can.</p>
            <p>Try to keep your eyes on the <b>centre dot</b> and find the numbers with your side vision.</p>
            <p class="fg-how-small">Grid ${SCHULTE[lv].n}×${SCHULTE[lv].n}${SCHULTE[lv].tint ? ', with coloured cells to distract you' : ''}.</p>`,
        science: 'Schulte tables have been used for decades to train attention and visual search. Holding your gaze in the centre while scanning trains you to take in more at once and to stay locked on one goal — find the next number — while ignoring everything else.',
        run(ctx) {
            const cfg = SCHULTE[ctx.level], cells = cfg.n * cfg.n;
            const nums = shuffle([...Array(cells).keys()].map(x => x + 1));
            const tints = ['#fee2e2', '#dbeafe', '#dcfce7', '#fef9c3', '#f3e8ff', '#ffedd5'];
            ctx.el.innerHTML = `<div class="fg-sc-next">Find <b>1</b></div>
                <div class="fg-sc-grid" style="--n:${cfg.n}">${nums.map(v => `<button type="button" data-v="${v}" ${cfg.tint ? `style="--t:${pick(tints)}"` : ''}>${v}</button>`).join('')}<span class="fg-sc-dot"></span></div>`;
            const nextEl = ctx.el.querySelector('.fg-sc-next b');
            let target = 1, errors = 0;
            const start = performance.now();
            const LIMIT = cells * 6000;
            ctx.every(200, () => {
                const t = (performance.now() - start) / 1000;
                ctx.status(`${t.toFixed(1)}s`);
                if (t * 1000 > LIMIT) end(true);
            });
            function end(timedOut) {
                const secs = (performance.now() - start) / 1000;
                const perCell = secs / cells;
                const found = target - 1;
                ctx.finish({
                    score: found / secs * 60, accuracy: found / Math.max(1, found + errors),
                    delta: timedOut || perCell > 2.4 ? -1 : perCell < 1.2 && errors <= 2 ? 1 : 0,
                    headline: 'Numbers found per minute',
                    stats: [['Time', `${secs.toFixed(1)}s`], ['Per number', `${perCell.toFixed(2)}s`], ['Wrong taps', errors]],
                    insight: perCell < 1.2 && errors <= 2 ? 'Under 1.2 s a number with few slips — the grid gets bigger next time.'
                        : 'Get under 1.2 s per number with 2 slips or fewer to move up. Keep your eyes on the centre dot.'
                });
            }
            ctx.el.querySelector('.fg-sc-grid').addEventListener('click', (e) => {
                const b = e.target.closest('button');
                if (!b) return;
                if (Number(b.dataset.v) === target) {
                    b.classList.add('done');
                    ctx.good();
                    target++;
                    ctx.progress((target - 1) / cells);
                    if (target > cells) return end(false);
                    nextEl.textContent = target;
                } else {
                    errors++;
                    ctx.bad();
                    b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
                }
            });
        }
    });

    // ==================== DRILL: GO / NO-GO ====================
    const GONOGO = [null, { win: 1000, nogo: 0.25 }, { win: 850, nogo: 0.25 }, { win: 720, nogo: 0.3 }, { win: 620, nogo: 0.3 }, { win: 540, nogo: 0.33 }, { win: 470, nogo: 0.35 }];
    DRILLS.push({
        id: 'gonogo', name: 'Go / No-Go', skill: 'control', icon: '🟢', color: '#22c55e', minutes: 2, maxLevel: 6, unit: 'pts',
        how: (lv) => `<p>Shapes flash up one at a time.</p>
            <p><b>Green circle</b> → tap fast. <b>Red square ✋</b> → don't tap.</p>
            <p class="fg-how-small">Most shapes are green, so you'll want to tap on autopilot — that's the point. Each shape stays ${GONOGO[lv].win} ms. Keyboard: Space.</p>`,
        science: 'Go/No-Go is a standard test of response inhibition: stopping an action you were already about to make. It\'s the same brake you use to not open your phone, not click the notification, and stay on the task in front of you.',
        run(ctx) {
            const cfg = GONOGO[ctx.level], TOTAL = 60;
            const kinds = shuffle(Array.from({ length: TOTAL }, (_, i) => i < Math.round(TOTAL * cfg.nogo) ? 'nogo' : 'go'));
            if (kinds[0] === 'nogo') { const j = kinds.indexOf('go'); [kinds[0], kinds[j]] = [kinds[j], kinds[0]]; }
            ctx.el.innerHTML = `<div class="fg-gn-area" role="button" aria-label="Tap area"><div class="fg-gn-fix">+</div><div class="fg-gn-shape"></div><div class="fg-gn-fb"></div></div>
                <p class="fg-gn-tip">Tap anywhere in the box</p>`;
            const area = ctx.el.querySelector('.fg-gn-area'), shape = ctx.el.querySelector('.fg-gn-shape'), fb = ctx.el.querySelector('.fg-gn-fb');
            let i = -1, shownAt = 0, active = false, tapped = false;
            let hits = 0, misses = 0, commissions = 0, stops = 0;
            const rts = [];
            const feedback = (text, cls) => { fb.textContent = text; fb.className = 'fg-gn-fb ' + cls; };
            function respond() {
                if (!active || tapped) return;
                tapped = true;
                if (kinds[i] === 'go') { hits++; rts.push(performance.now() - shownAt); ctx.good(); shape.classList.add('hit'); }
                else { commissions++; ctx.bad(); feedback('Hold back on red!', 'bad'); area.classList.add('shake'); ctx.after(300, () => area.classList.remove('shake')); }
            }
            area.addEventListener('pointerdown', (e) => { e.preventDefault(); respond(); });
            ctx.keys((e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); respond(); } });
            function next() {
                i++;
                if (i >= TOTAL) {
                    const acc = (hits + stops) / TOTAL, rt = avg(rts);
                    return ctx.finish({
                        score: acc * 100 * (1 + 0.2 * (ctx.level - 1)), accuracy: acc,
                        delta: commissions <= 1 && misses <= 2 ? 1 : commissions >= 5 || misses >= 7 ? -1 : 0,
                        headline: 'Points (accuracy × level)',
                        stats: [['Accuracy', Math.round(acc * 100) + '%'], ['Reaction', rt ? Math.round(rt) + ' ms' : '—'], ['Tapped on red', commissions], ['Missed green', misses]],
                        insight: commissions <= 1 ? 'Great braking. Shapes get faster next time if you also keep misses low.'
                            : 'Tapping on red means the autopilot won. Slowing down a touch usually cuts those errors right away.'
                    });
                }
                ctx.status(`${i + 1}/${TOTAL}`);
                ctx.progress(i / TOTAL);
                shape.className = 'fg-gn-shape';
                ctx.after(400 + rand(600), () => {
                    feedback('', '');
                    tapped = false;
                    active = true;
                    shownAt = performance.now();
                    shape.className = 'fg-gn-shape show ' + kinds[i];
                    shape.textContent = kinds[i] === 'nogo' ? '✋' : '';
                    ctx.after(cfg.win, () => {
                        active = false;
                        shape.className = 'fg-gn-shape';
                        if (kinds[i] === 'go' && !tapped) { misses++; feedback('Too slow', 'miss'); }
                        if (kinds[i] === 'nogo' && !tapped) stops++;
                        next();
                    });
                });
            }
            next();
        }
    });

    // ==================== DRILL: COLOR CLASH (STROOP) ====================
    const INKS = [
        { name: 'RED', hex: '#e11d48' }, { name: 'BLUE', hex: '#2563eb' }, { name: 'GREEN', hex: '#16a34a' }, { name: 'YELLOW', hex: '#ca8a04' },
        { name: 'PURPLE', hex: '#9333ea' }, { name: 'ORANGE', hex: '#ea580c' }
    ];
    const STROOP = [null, { colors: 4, incong: 0.5 }, { colors: 4, incong: 0.75 }, { colors: 6, incong: 0.75 }, { colors: 6, incong: 0.8, inkButtons: true }, { colors: 6, incong: 0.8, inkButtons: true, shuffle: true }, { colors: 6, incong: 0.85, inkButtons: true, shuffle: true, fast: true }];
    DRILLS.push({
        id: 'stroop', name: 'Color Clash', skill: 'control', icon: '🎨', color: '#e11d48', minutes: 1, maxLevel: 6, unit: 'pts',
        how: (lv) => `<p>A colour word appears, printed in a colour.</p>
            <p>Tap the <b>colour of the ink</b> — not what the word says. <span style="color:#2563eb;font-weight:800">RED</span> → tap <b>Blue</b>.</p>
            <p class="fg-how-small">45 seconds. ${STROOP[lv].shuffle ? 'Buttons move around each time. ' : ''}${STROOP[lv].inkButtons ? 'Button labels are printed in the wrong colours too. ' : ''}Keyboard: 1–${STROOP[lv].colors}.</p>`,
        science: 'This is the Stroop task, one of the most studied tests in psychology. Reading is automatic, so you must actively override it to name the ink. That override — doing what you decided instead of what\'s automatic — is the core of self-control.',
        run(ctx) {
            const cfg = STROOP[ctx.level], colors = INKS.slice(0, cfg.colors), DURATION = 45000;
            ctx.el.innerHTML = `<div class="fg-st-word"></div><div class="fg-st-btns" style="--cols:${cfg.colors > 4 ? 3 : 2}"></div>`;
            const wordEl = ctx.el.querySelector('.fg-st-word'), btnsEl = ctx.el.querySelector('.fg-st-btns');
            let ink = null, word = null, shownAt = 0, correct = 0, errors = 0, last = null, order = colors;
            const rtC = [], rtI = [];
            function drawButtons() {
                if (cfg.shuffle) order = shuffle(colors);
                btnsEl.innerHTML = order.map((c, k) => {
                    const labelInk = cfg.inkButtons ? pick(colors.filter(x => x !== c)).hex : 'inherit';
                    return `<button type="button" data-c="${c.name}" style="--dot:${c.hex};color:${labelInk}"><i></i>${c.name[0] + c.name.slice(1).toLowerCase()}<small>${k + 1}</small></button>`;
                }).join('');
            }
            function nextWord() {
                do { ink = pick(colors); } while (ink === last);
                last = ink;
                const incong = Math.random() < cfg.incong;
                word = incong ? pick(colors.filter(c => c !== ink)) : ink;
                wordEl.textContent = word.name;
                wordEl.style.color = ink.hex;
                wordEl.classList.remove('pop'); void wordEl.offsetWidth; wordEl.classList.add('pop');
                drawButtons();
                shownAt = performance.now();
            }
            function answer(name) {
                const rt = performance.now() - shownAt;
                if (name === ink.name) { correct++; ctx.good(); (word === ink ? rtC : rtI).push(rt); }
                else { errors++; ctx.bad(); wordEl.classList.add('shake'); ctx.after(250, () => wordEl.classList.remove('shake')); }
                nextWord();
            }
            btnsEl.addEventListener('pointerdown', (e) => { const b = e.target.closest('button'); if (b) { e.preventDefault(); answer(b.dataset.c); } });
            ctx.keys((e) => { const k = Number(e.key); if (k >= 1 && k <= order.length) answer(order[k - 1].name); });
            const start = performance.now();
            ctx.every(100, () => {
                const left = Math.max(0, DURATION - (performance.now() - start));
                ctx.status(`${Math.ceil(left / 1000)}s`);
                ctx.progress(1 - left / DURATION);
                if (left <= 0) {
                    const acc = correct / Math.max(1, correct + errors);
                    const cost = rtC.length >= 3 && rtI.length >= 3 ? Math.round(avg(rtI) - avg(rtC)) : null;
                    ctx.finish({
                        score: Math.max(0, correct - errors) * (1 + 0.15 * (ctx.level - 1)), accuracy: acc,
                        delta: acc >= 0.9 && correct >= 22 ? 1 : acc < 0.75 ? -1 : 0,
                        headline: 'Points (right − wrong, × level)',
                        stats: [['Right', correct], ['Wrong', errors], ['Accuracy', Math.round(acc * 100) + '%'], ['Clash slowdown', cost != null ? `${cost} ms` : '—']],
                        insight: cost != null && cost > 0
                            ? `When word and ink clashed you were ${cost} ms slower — that's the cost of overriding an automatic habit. It shrinks with practice.`
                            : 'Move up with 90% accuracy and at least 22 right in 45 seconds.'
                    });
                }
            });
            if (cfg.fast) ctx.every(1600, () => { if (performance.now() - shownAt > 1500) { errors++; ctx.bad(); nextWord(); } });
            nextWord();
        }
    });

    // ==================== DRILL: TASK SWITCH ====================
    const SWITCH = [null, { p: 0.25, limit: 0 }, { p: 0.5, limit: 0 }, { p: 0.5, limit: 2600 }, { p: 0.5, limit: 2000 }, { p: 0.5, limit: 1600 }, { p: 0.5, limit: 1300 }];
    DRILLS.push({
        id: 'switch', name: 'Task Switch', skill: 'switching', icon: '🔀', color: '#f59e0b', minutes: 1, maxLevel: 6, unit: 'pts',
        how: (lv) => `<p>A number appears in the <b>top</b> or <b>bottom</b> box.</p>
            <p><b>Top → odd or even?</b> &nbsp; <b>Bottom → lower or higher than 5?</b></p>
            <p class="fg-how-small">Left button = Odd / Lower, right button = Even / Higher. 45 seconds${SWITCH[lv].limit ? `, ${SWITCH[lv].limit / 1000}s per number` : ''}. Keyboard: ← →.</p>`,
        science: 'Task switching is how researchers measure the hidden cost of jumping between jobs. Every switch makes you slower and more error-prone for a moment while your brain reloads the rules. Training it helps — but seeing your own switch cost is the real lesson: batch similar work.',
        run(ctx) {
            const cfg = SWITCH[ctx.level], DURATION = 45000, DIGITS = [1, 2, 3, 4, 6, 7, 8, 9];
            ctx.el.innerHTML = `<div class="fg-ts-board">
                    <div class="fg-ts-half top"><span class="fg-ts-label">Odd or even?</span><b></b></div>
                    <div class="fg-ts-half bottom"><span class="fg-ts-label">Lower or higher than 5?</span><b></b></div>
                </div>
                <div class="fg-ts-btns">
                    <button type="button" data-side="L"><span class="t">Odd</span><span class="b">Lower</span></button>
                    <button type="button" data-side="R"><span class="t">Even</span><span class="b">Higher</span></button>
                </div>`;
            const top = ctx.el.querySelector('.fg-ts-half.top'), bottom = ctx.el.querySelector('.fg-ts-half.bottom');
            let rule = Math.random() < 0.5 ? 'top' : 'bottom', digit = 0, shownAt = 0, isSwitch = false, first = true, deadline = null;
            let correct = 0, errors = 0;
            const rtRepeat = [], rtSwitch = [];
            function nextTrial() {
                if (!first) {
                    const sw = Math.random() < cfg.p;
                    isSwitch = sw;
                    if (sw) rule = rule === 'top' ? 'bottom' : 'top';
                }
                first = false;
                digit = pick(DIGITS);
                top.classList.toggle('on', rule === 'top');
                bottom.classList.toggle('on', rule === 'bottom');
                top.querySelector('b').textContent = rule === 'top' ? digit : '';
                bottom.querySelector('b').textContent = rule === 'bottom' ? digit : '';
                shownAt = performance.now();
                if (deadline) ctx.cancel(deadline);
                if (cfg.limit) deadline = ctx.after(cfg.limit, () => { errors++; ctx.bad(); nextTrial(); });
            }
            function answer(side) {
                const right = rule === 'top' ? (digit % 2 === 0 ? 'R' : 'L') : (digit > 5 ? 'R' : 'L');
                const rt = performance.now() - shownAt;
                if (side === right) { correct++; ctx.good(); (isSwitch ? rtSwitch : rtRepeat).push(rt); }
                else { errors++; ctx.bad(); ctx.el.querySelector('.fg-ts-board').classList.add('shake'); ctx.after(250, () => ctx.el.querySelector('.fg-ts-board')?.classList.remove('shake')); }
                nextTrial();
            }
            ctx.el.querySelector('.fg-ts-btns').addEventListener('pointerdown', (e) => { const b = e.target.closest('button'); if (b) { e.preventDefault(); answer(b.dataset.side); } });
            ctx.keys((e) => {
                if (e.key === 'ArrowLeft' || e.key === 'f') answer('L');
                else if (e.key === 'ArrowRight' || e.key === 'j') answer('R');
            });
            const start = performance.now();
            ctx.every(100, () => {
                const left = Math.max(0, DURATION - (performance.now() - start));
                ctx.status(`${Math.ceil(left / 1000)}s`);
                ctx.progress(1 - left / DURATION);
                if (left > 0) return;
                const acc = correct / Math.max(1, correct + errors);
                const cost = rtSwitch.length >= 3 && rtRepeat.length >= 3 ? Math.round(avg(rtSwitch) - avg(rtRepeat)) : null;
                ctx.finish({
                    score: Math.max(0, correct - errors) * (1 + 0.15 * (ctx.level - 1)), accuracy: acc,
                    delta: acc >= 0.9 && correct >= 20 ? 1 : acc < 0.7 ? -1 : 0,
                    headline: 'Points (right − wrong, × level)',
                    stats: [['Right', correct], ['Wrong', errors], ['Accuracy', Math.round(acc * 100) + '%'], ['Switch cost', cost != null ? `${cost} ms` : '—']],
                    insight: cost != null && cost > 0
                        ? `Each switch cost you about ${cost} ms here. In real work a switch costs minutes, not milliseconds — group similar tasks together.`
                        : 'Move up with 90% accuracy and at least 20 right in 45 seconds.'
                });
            });
            nextTrial();
        }
    });

    // ==================== DRILL: TUG OF WAR (MENTAL MATH) ====================
    const TUG = [null,
        { ops: ['+', '-'], max: 10, pull: 3200 },
        { ops: ['+', '-'], max: 20, pull: 3000 },
        { ops: ['+', '-', '×'], max: 30, times: 6, pull: 2900 },
        { ops: ['+', '-', '×'], max: 50, times: 9, pull: 2800 },
        { ops: ['+', '-', '×', '÷'], max: 60, times: 10, pull: 2700 },
        { ops: ['+', '-', '×', '÷'], max: 100, times: 12, pull: 2600 },
        { ops: ['+', '-', '×', '÷'], max: 150, times: 12, pull: 2400 },
        { ops: ['+', '-', '×', '÷', '2×'], max: 200, times: 15, pull: 2300 },
        { ops: ['+', '-', '×', '÷', '2×'], max: 300, times: 19, pull: 2200 },
        { ops: ['+', '-', '×', '÷', '2×'], max: 500, times: 25, pull: 2000 }
    ];
    function mathProblem(cfg) {
        const op = pick(cfg.ops);
        const r = (lo, hi) => lo + rand(hi - lo + 1);
        if (op === '+') { const a = r(1, cfg.max), b = r(1, cfg.max); return { q: `${a} + ${b}`, a: a + b }; }
        if (op === '-') { const a = r(2, cfg.max), b = r(1, a); return { q: `${a} − ${b}`, a: a - b }; }
        if (op === '×') { const a = r(2, cfg.times), b = r(2, Math.min(cfg.times, 12)); return { q: `${a} × ${b}`, a: a * b }; }
        if (op === '÷') { const b = r(2, Math.min(cfg.times, 12)), a = r(2, cfg.times); return { q: `${a * b} ÷ ${b}`, a }; }
        const a = r(11, 49), b = r(3, 9); return { q: `${a} × ${b}`, a: a * b }; // 2-digit × 1-digit
    }
    DRILLS.push({
        id: 'tug', name: 'Tug of War', skill: 'math', icon: '🪢', color: '#ef4444', minutes: 2, maxLevel: 10, unit: '/min',
        how: (lv) => `<p>Solve sums to pull the rope your way. Your opponent pulls on their own every few seconds.</p>
            <p>Type the answer — it's checked as soon as you've typed enough digits. Wrong answers give them a free pull.</p>
            <p class="fg-how-small">Level ${lv}: ${TUG[lv].ops.map(o => o === '2×' ? 'bigger ×' : o).join(' ')} · opponent pulls every ${(TUG[lv].pull / 1000).toFixed(1)}s. Win to level up.</p>`,
        science: 'Fast mental arithmetic exercises working memory and processing speed together: you hold numbers in mind while operating on them. The time pressure adds the part that matters for work — thinking clearly while something is pushing you.',
        run(ctx) {
            const cfg = TUG[ctx.level], LIMIT = 120000;
            ctx.el.innerHTML = `<div class="fg-tug-field">
                    <span class="fg-tug-you">🙂<small>You</small></span>
                    <div class="fg-tug-rope"><i class="fg-tug-mid"></i><b class="fg-tug-knot"></b></div>
                    <span class="fg-tug-them">🤖<small>Bot</small></span>
                </div>
                <div class="fg-tug-q"><span></span> = <b class="fg-tug-in">?</b></div>
                <div class="fg-tug-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0].map(k => `<button type="button" data-k="${k}">${k}</button>`).join('')}</div>`;
            const knot = ctx.el.querySelector('.fg-tug-knot'), qEl = ctx.el.querySelector('.fg-tug-q span'), inEl = ctx.el.querySelector('.fg-tug-in');
            let rope = 0, typed = '', prob = null, solved = 0, wrong = 0, askedAt = 0;
            const times = [];
            const start = performance.now();
            const draw = () => { knot.style.left = `${50 + rope * 45}%`; };
            function ask() { prob = mathProblem(cfg); typed = ''; qEl.textContent = prob.q; inEl.textContent = '?'; askedAt = performance.now(); }
            function pull(by) {
                rope = clamp(rope + by, -1, 1);
                draw();
                if (rope <= -1) end(true);
                else if (rope >= 1) end(false);
            }
            function end(won) {
                const mins = (performance.now() - start) / 60000;
                const acc = solved / Math.max(1, solved + wrong);
                ctx.finish({
                    score: solved / Math.max(mins, 0.25), accuracy: acc,
                    delta: won ? 1 : -1,
                    headline: won ? 'You won! Answers per minute' : 'The bot won. Answers per minute',
                    stats: [['Solved', solved], ['Wrong', wrong], ['Per answer', times.length ? (avg(times) / 1000).toFixed(1) + 's' : '—']],
                    insight: won ? 'Next level brings bigger numbers and a faster opponent.' : 'One level easier next time. Accuracy beats speed here — a wrong answer is a free pull for the bot.'
                });
            }
            function key(k) {
                if (k === '⌫') { typed = typed.slice(0, -1); inEl.textContent = typed || '?'; return; }
                if (typed.length >= 6) return;
                typed += k;
                inEl.textContent = typed;
                if (typed.length < String(prob.a).length) return;
                if (Number(typed) === prob.a) {
                    solved++; times.push(performance.now() - askedAt); ctx.good();
                    inEl.classList.remove('ok'); void inEl.offsetWidth; inEl.classList.add('ok');
                    pull(-0.2);
                } else {
                    wrong++; ctx.bad();
                    ctx.el.querySelector('.fg-tug-q').classList.add('shake');
                    ctx.after(250, () => ctx.el.querySelector('.fg-tug-q')?.classList.remove('shake'));
                    pull(0.15);
                }
                if (session && session.playing) ask();
            }
            ctx.el.querySelector('.fg-tug-pad').addEventListener('pointerdown', (e) => { const b = e.target.closest('button'); if (b) { e.preventDefault(); key(b.dataset.k); } });
            ctx.keys((e) => { if (/^[0-9]$/.test(e.key)) key(e.key); else if (e.key === 'Backspace') key('⌫'); });
            ctx.every(cfg.pull, () => { knot.classList.remove('tug'); void knot.offsetWidth; knot.classList.add('tug'); pull(0.12); });
            ctx.every(200, () => {
                const t = performance.now() - start;
                ctx.status(`${Math.floor(t / 1000)}s`);
                ctx.progress(t / LIMIT);
                if (t >= LIMIT) end(rope < 0);
            });
            draw();
            ask();
        }
    });

    // ==================== INIT ====================
    function init() {
        const page = document.getElementById('brain-games-page');
        if (!page) return;
        page.innerHTML = '<div id="focus-gym-root"></div>';
        root = page.firstElementChild;
        root.addEventListener('click', (e) => {
            const card = e.target.closest('[data-drill]');
            if (card) return showIntro(card.dataset.drill, false);
            if (e.target.closest('[data-act="workout"]')) {
                const w = todaysWorkout();
                const next = w.plan.find(id => !w.done.includes(id));
                if (next) showIntro(next, true);
            }
        });
        renderHub();
        // Refresh when the tab is opened (a new day means a new workout)
        new MutationObserver(() => { if (page.classList.contains('active')) renderHub(); }).observe(page, { attributes: true, attributeFilter: ['class'] });
    }

    window.FocusGym = { open: showIntro, drills: DRILLS, skills: SKILLS };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
