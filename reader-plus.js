// reader-plus.js — the e-reader, upgraded
// Realistic page curl (drag or tap), reading themes & typography, timed auto page-turn,
// listening mini-player with sleep timer, selection toolbar (colour highlights, notes,
// translate, define, read from here), highlights notebook, and quick translation peek.

(function () {
    const $ = (id) => document.getElementById(id);
    const modal = () => $('reader-modal');
    const stage = () => $('reader-content-container');
    const pageEl = () => $('reader-text');
    const esc = (s) => (typeof escapeHTML === 'function' ? escapeHTML(String(s)) : String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`));
    const notify = (m) => { if (typeof showNotification === 'function') showNotification(m); };

    // ==================== PREFERENCES ====================
    const DEFAULTS = { theme: 'paper', font: 'literary', size: 1.15, line: 1.8, margin: 22, align: 'justify', dim: 0, turn: 'curl', wpm: 230, keepAwake: true };
    let prefs = { ...DEFAULTS };
    try { prefs = { ...DEFAULTS, ...JSON.parse(localStorage.getItem('readerPrefs') || '{}') }; } catch (e) { /* defaults */ }
    const savePrefs = () => localStorage.setItem('readerPrefs', JSON.stringify(prefs));

    const THEMES = {
        paper: { label: 'Paper', bg: '#f4e8c1', fg: '#2b2318' },
        white: { label: 'White', bg: '#fbfaf7', fg: '#1f1f1f' },
        sepia: { label: 'Sepia', bg: '#ecd9b6', fg: '#5b4636' },
        tea: { label: 'Green tea', bg: '#dde8d3', fg: '#2c3a2a' },
        night: { label: 'Night', bg: '#1d1f24', fg: '#cfc8b8' },
        black: { label: 'Black', bg: '#000000', fg: '#a9a9a9' }
    };
    const FONTS = {
        literary: { label: 'Literary', css: "Georgia, 'Times New Roman', serif" },
        elegant: { label: 'Elegant', css: "'Playfair Display', Georgia, serif" },
        modern: { label: 'Modern', css: "'Inter', system-ui, sans-serif" },
        classic: { label: 'Classic', css: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }
    };

    let repaginateTimer = 0;
    function applyPrefs(layoutChanged) {
        const m = modal();
        if (!m) return;
        const theme = THEMES[prefs.theme] || THEMES.paper;
        m.dataset.rdTheme = prefs.theme;
        m.style.setProperty('--rd-bg', theme.bg);
        m.style.setProperty('--rd-fg', theme.fg);
        m.style.setProperty('--rd-font', (FONTS[prefs.font] || FONTS.literary).css);
        m.style.setProperty('--rd-size', prefs.size + 'rem');
        m.style.setProperty('--rd-line', String(prefs.line));
        m.style.setProperty('--rd-pad', prefs.margin + 'px');
        m.style.setProperty('--rd-align', prefs.align);
        m.style.setProperty('--rd-dim', String(prefs.dim));
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg);
        if (layoutChanged && typeof bookPages !== 'undefined' && bookPages.length && !m.classList.contains('hidden')) {
            clearTimeout(repaginateTimer);
            repaginateTimer = setTimeout(() => { if (typeof window.rePaginateBook === 'function') window.rePaginateBook(); }, 350);
        }
        renderSettings();
    }

    // ==================== PAGE CURL ENGINE ====================
    // A page is folded along the perpendicular bisector of corner C and the drag point P.
    // The part beyond the fold is clipped off the front page and drawn mirrored as the
    // paper's back, with soft shadows on both sides of the fold.

    function clipPoly(poly, m, n, keepPositive) {
        const side = (p) => ((p[0] - m[0]) * n[0] + (p[1] - m[1]) * n[1]) * (keepPositive ? 1 : -1);
        const out = [];
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i], b = poly[(i + 1) % poly.length];
            const sa = side(a), sb = side(b);
            if (sa >= 0) out.push(a);
            if ((sa >= 0) !== (sb >= 0)) {
                const t = sa / (sa - sb);
                out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
            }
        }
        return out;
    }
    const polyCss = (poly) => poly.length < 3 ? 'polygon(0 0, 0 0, 0 0)' : `polygon(${poly.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`;

    // CSS linear-gradient running along `dir`, with px stops measured from point `at`
    function gradientAt(dir, at, w, h, stops) {
        const angle = Math.atan2(dir[0], -dir[1]) * 180 / Math.PI;
        const len = Math.abs(w * dir[0]) + Math.abs(h * dir[1]);
        const startX = w / 2 - dir[0] * len / 2, startY = h / 2 - dir[1] * len / 2;
        const base = (at[0] - startX) * dir[0] + (at[1] - startY) * dir[1];
        return `linear-gradient(${angle.toFixed(2)}deg, ${stops.map(([c, d]) => `${c} ${(base + d).toFixed(1)}px`).join(', ')})`;
    }

    function makeCurl(front, under) {
        const st = stage();
        const W = st.clientWidth, H = st.clientHeight;
        const rect = [[0, 0], [W, 0], [W, H], [0, H]];
        const layer = document.createElement('div');
        layer.className = 'rd-curl-layer';
        layer.innerHTML = '<div class="rd-curl-shadow"></div><div class="rd-curl-flapwrap"><div class="rd-curl-flap"></div></div>';
        st.appendChild(layer);
        const shadow = layer.firstChild, flap = layer.querySelector('.rd-curl-flap');
        const isDark = prefs.theme === 'night' || prefs.theme === 'black';
        let corner = [W, H];

        function draw(P) {
            const C = corner;
            let dx = C[0] - P[0], dy = C[1] - P[1];
            let d = Math.hypot(dx, dy);
            if (d < 0.5) { front.style.clipPath = ''; layer.style.display = 'none'; return; }
            layer.style.display = '';
            const n = [dx / d, dy / d];
            const M = [(C[0] + P[0]) / 2, (C[1] + P[1]) / 2];
            const kept = clipPoly(rect, M, n, false);
            const folded = clipPoly(rect, M, n, true);
            const mirrored = folded.map(p => {
                const k = 2 * ((p[0] - M[0]) * n[0] + (p[1] - M[1]) * n[1]);
                return [p[0] - k * n[0], p[1] - k * n[1]];
            });
            front.style.clipPath = polyCss(kept);
            const fold = Math.min(1, d / W);
            const width = 18 + 50 * Math.sin(Math.PI * Math.min(1, d / (2 * W)));
            // Shadow cast by the lifted page onto the page beneath
            shadow.style.clipPath = polyCss(folded);
            shadow.style.background = gradientAt(n, M, W, H, [
                [`rgba(0,0,0,${(0.35 * fold + 0.1).toFixed(2)})`, 0], ['rgba(0,0,0,0)', width * 1.6]]);
            // Back of the page: lighter at the fold, darker towards its edge
            const back = [-n[0], -n[1]];
            flap.style.clipPath = polyCss(mirrored);
            flap.style.background = gradientAt(back, M, W, H, isDark
                ? [['#2b2e35', 0], ['#3a3d44', width], ['#24262c', width * 3]]
                : [['rgba(0,0,0,0.10)', 0], ['rgba(255,255,255,0.55)', width * 0.6], ['rgba(0,0,0,0.06)', width * 3]]) + ', var(--rd-bg, #f4e8c1)';
        }
        return {
            W, H,
            setCorner(c) { corner = c; },
            draw,
            destroy() { front.style.clipPath = ''; layer.remove(); }
        };
    }

    // Copy of the current page (canvas pixels included) for the turning sheet
    function snapshot() {
        const src = pageEl();
        const clone = src.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('rd-snap');
        clone.style.transform = 'none';
        const srcCanvases = src.querySelectorAll('canvas');
        clone.querySelectorAll('canvas').forEach((c, i) => {
            try { c.getContext('2d').drawImage(srcCanvases[i], 0, 0); } catch (e) { /* tainted or empty */ }
        });
        clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        src.parentNode.insertBefore(clone, src.nextSibling);
        clone.scrollTop = src.scrollTop;
        return clone;
    }

    const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    function tween(ms, step) {
        return new Promise(resolve => {
            const t0 = performance.now();
            const frame = (now) => {
                const t = Math.min(1, (now - t0) / ms);
                step(t);
                if (t < 1) requestAnimationFrame(frame); else resolve();
            };
            requestAnimationFrame(frame);
        });
    }

    // Path the corner travels on a full turn: across and a little up, like a real page
    const curlPath = (W, H, t) => [W - t * 2.05 * W, H - Math.sin(Math.PI * t) * H * 0.18];

    async function animateTurn(direction, render) {
        const style = prefs.turn;
        const page = pageEl();
        if (style === 'none' || document.hidden || !page) return render();
        const snap = snapshot();
        try {
            await render();
            if (style === 'fade') {
                snap.style.transition = 'opacity 0.32s ease';
                await new Promise(r => requestAnimationFrame(r));
                snap.style.opacity = '0';
                await new Promise(r => setTimeout(r, 330));
            } else if (style === 'slide') {
                const W = stage().clientWidth;
                if (direction === 'next') {
                    snap.classList.add('rd-raised');
                    await tween(380, t => { snap.style.transform = `translateX(${-easeInOut(t) * W}px)`; });
                } else {
                    page.classList.add('rd-raised');
                    await tween(380, t => { page.style.transform = `translateX(${(easeInOut(t) - 1) * W}px)`; });
                }
            } else {
                // Curl
                const front = direction === 'next' ? snap : page;
                if (direction === 'prev') snap.classList.add('rd-under');
                front.classList.add('rd-raised');
                const curl = makeCurl(front, direction === 'next' ? page : snap);
                const { W, H } = curl;
                await tween(direction === 'next' ? 620 : 560, t => {
                    const k = easeInOut(t);
                    curl.draw(curlPath(W, H, direction === 'next' ? k : 1 - k));
                });
                curl.destroy();
            }
        } finally {
            snap.remove();
            page.classList.remove('rd-raised');
            page.style.transform = '';
            page.style.clipPath = '';
        }
    }

    window.ReaderTurn = { animate: animateTurn };

    // ==================== GESTURES: drag to curl, tap zones ====================
    let gesture = null;

    function canTurn(dir) {
        if (typeof bookPages === 'undefined' || !bookPages.length) return false;
        if (typeof isAnimating !== 'undefined' && isAnimating) return false;
        return dir === 'next' ? bookPageIndex < bookPages.length - 1 : bookPageIndex > 0;
    }

    function hasSelection() {
        const sel = window.getSelection();
        return sel && !sel.isCollapsed && pageEl()?.contains(sel.anchorNode);
    }

    async function beginDrag(g) {
        const dir = g.dir;
        g.ready = false;
        isAnimating = true;
        g.fromIndex = bookPageIndex;
        g.toIndex = bookPageIndex + (dir === 'next' ? 1 : -1);
        g.snap = snapshot();
        await renderBookPageContent(g.toIndex); // highlights are added once the turn commits
        const page = pageEl();
        g.front = dir === 'next' ? g.snap : page;
        if (dir === 'prev') g.snap.classList.add('rd-under');
        g.front.classList.add('rd-raised');
        g.curl = makeCurl(g.front);
        // Grab near the top half -> fold the top corner; otherwise the bottom one
        if (dir === 'next' && g.startY < g.curl.H * 0.4) g.curl.setCorner([g.curl.W, 0]);
        g.ready = true;
        dragTo(g, g.lastX, g.lastY);
    }

    function dragPoint(g, x, y) {
        const { W, H } = g.curl;
        const cy = g.dir === 'next' && g.startY < H * 0.4 ? 0 : H;
        if (g.dir === 'next') return [Math.min(W - 1, Math.max(-W, x)), cy + (y - g.startY) * 0.35];
        // Previous: the page comes back from the left, its edge following the finger at double speed
        return [Math.min(W, -W + 2 * Math.max(0, x)), cy + (y - g.startY) * 0.25];
    }

    function dragTo(g, x, y) {
        g.lastX = x; g.lastY = y;
        if (!g.ready) return;
        g.p = dragPoint(g, x, y);
        g.curl.draw(g.p);
    }

    async function endDrag(g, velocity) {
        while (!g.ready) await new Promise(r => setTimeout(r, 16));
        const { W, H } = g.curl;
        const commit = g.dir === 'next'
            ? (g.p[0] < W * 0.5 || velocity < -0.45)
            : (g.p[0] > -W * 0.2 || velocity > 0.45);
        const from = g.p.slice();
        const target = g.dir === 'next'
            ? (commit ? [-1.05 * W, from[1]] : [W, from[1]])
            : (commit ? [W, from[1]] : [-1.05 * W, from[1]]);
        const cornerY = g.dir === 'next' && g.startY < H * 0.4 ? 0 : H;
        await tween(commit ? 320 : 260, t => {
            const k = easeInOut(t);
            g.curl.draw([from[0] + (target[0] - from[0]) * k, from[1] + (cornerY - from[1]) * k * 0.6]);
        });
        g.curl.destroy();
        g.front.classList.remove('rd-raised');
        if (commit) {
            g.snap.remove();
            bookPageIndex = g.toIndex;
            isAnimating = false;
            await finishBookPageShow(true);
        } else {
            await renderBookPageContent(g.fromIndex);
            if (typeof applyHighlightsToPage === 'function') applyHighlightsToPage(g.fromIndex);
            await applyTranslationToCurrentPage();
            g.snap.remove();
            isAnimating = false;
        }
    }

    function initGestures() {
        const st = stage();
        if (!st) return;
        st.addEventListener('pointerdown', (e) => {
            if (!e.isPrimary || e.button > 0) return;
            if (e.target.closest('.rd-popup, .rd-peek, a, button, input')) return;
            gesture = { x0: e.clientX, y0: e.clientY, t0: performance.now(), lastX: 0, lastY: 0, dragging: false, id: e.pointerId };
            const r = st.getBoundingClientRect();
            gesture.left = r.left; gesture.top = r.top; gesture.width = r.width;
            gesture.startY = e.clientY - r.top;
        });
        st.addEventListener('pointermove', (e) => {
            const g = gesture;
            if (!g || e.pointerId !== g.id) return;
            const dx = e.clientX - g.x0, dy = e.clientY - g.y0;
            if (!g.dragging) {
                if (Math.abs(dx) < 12 || Math.abs(dx) < Math.abs(dy) * 1.2 || hasSelection()) return;
                const dir = dx < 0 ? 'next' : 'prev';
                if (!canTurn(dir)) { gesture = null; return; }
                g.dir = dir;
                g.dragging = true;
                g.samples = [];
                try { st.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
                stopAutoTurn(true);
                if (prefs.turn !== 'curl') return; // other styles turn on release
                g.lastX = e.clientX - g.left; g.lastY = e.clientY - g.top;
                beginDrag(g);
            }
            g.samples.push([performance.now(), e.clientX]);
            if (g.samples.length > 5) g.samples.shift();
            if (prefs.turn === 'curl') dragTo(g, e.clientX - g.left, e.clientY - g.top);
        });
        const finish = (e) => {
            const g = gesture;
            gesture = null;
            if (!g || e.pointerId !== g.id) return;
            if (g.dragging) {
                const s = g.samples;
                const v = s.length > 1 ? (s[s.length - 1][1] - s[0][1]) / Math.max(1, s[s.length - 1][0] - s[0][0]) : 0;
                if (prefs.turn === 'curl') endDrag(g, v); // waits for the next page to finish rendering
                else (g.dir === 'next' ? goNextPage : goPrevPage)();
                return;
            }
            if (e.type === 'pointercancel') return;
            // A tap
            const moved = Math.hypot(e.clientX - g.x0, e.clientY - g.y0);
            if (moved > 10 || performance.now() - g.t0 > 350 || hasSelection()) return;
            if (e.target.closest('.book-highlight')) return; // opens the highlight popup instead
            const x = (e.clientX - g.left) / g.width;
            if (x < 0.3) { stopAutoTurn(true); goPrevPage(); }
            else if (x > 0.7) { stopAutoTurn(true); goNextPage(); }
            else toggleImmersive();
        };
        st.addEventListener('pointerup', finish);
        st.addEventListener('pointercancel', finish);

        document.addEventListener('keydown', (e) => {
            const m = modal();
            if (!m || m.classList.contains('hidden') || e.target.closest('input, textarea, select')) return;
            if (e.key === 'Escape') { if (closeSheets()) e.preventDefault(); return; }
            if (document.querySelector('.rd-sheet.open')) return;
            if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) { e.preventDefault(); goNextPage(); }
            else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goPrevPage(); }
        });
    }

    function toggleImmersive(force) {
        const m = modal();
        const on = typeof force === 'boolean' ? force : !m.classList.contains('rd-immersive');
        m.classList.toggle('rd-immersive', on);
    }

    // ==================== SHEETS (settings, notebook, note) ====================
    function openSheet(id) {
        closeSheets();
        const sh = $(id);
        if (!sh) return;
        sh.classList.add('open');
        modal().classList.add('rd-sheet-open');
        stopAutoTurn(true);
    }
    function closeSheets() {
        let closed = false;
        document.querySelectorAll('.rd-sheet.open').forEach(s => { s.classList.remove('open'); closed = true; });
        if (modal()?.classList.contains('rd-sheet-open')) modal().classList.remove('rd-sheet-open');
        return closed;
    }

    function chipRow(name, options, current) {
        return `<div class="rd-chips" data-pref="${name}">${options.map(([v, label]) =>
            `<button type="button" data-v="${esc(v)}" class="${String(current) === String(v) ? 'on' : ''}">${label}</button>`).join('')}</div>`;
    }

    function buildSettingsSheet() {
        const sh = document.createElement('div');
        sh.id = 'rd-settings';
        sh.className = 'rd-sheet';
        sh.innerHTML = `
            <div class="rd-sheet-scrim"></div>
            <div class="rd-sheet-card" role="dialog" aria-label="Reading settings">
                <div class="rd-sheet-grab"></div>
                <div class="rd-tabs">
                    <button type="button" data-tab="display" class="on">Display</button>
                    <button type="button" data-tab="listen">Listen</button>
                    <button type="button" data-tab="turn">Pages</button>
                </div>
                <div class="rd-tab" data-tab="display"><div id="rd-display"></div></div>
                <div class="rd-tab" data-tab="listen" hidden>
                    <div class="rd-row-label">Voice</div>
                    <div id="rd-voice-slot"></div>
                    <p class="rd-hint" id="rd-voice-hint"></p>
                    <div class="rd-row-label">Speed <span id="rd-speed-slot-label"></span></div>
                    <div id="rd-speed-slot"></div>
                    <div class="rd-toggle-row"><div><b>Turn pages while listening</b><small>Keeps reading into the next page</small></div><span id="rd-autoturn-slot"></span></div>
                    <div class="rd-row-label">Sleep timer</div>
                    <div id="rd-sleep"></div>
                    <div class="rd-row-label">Highlight colour</div>
                    <div id="rd-color-slot"></div>
                </div>
                <div class="rd-tab" data-tab="turn" hidden><div id="rd-turn"></div></div>
            </div>`;
        modal().appendChild(sh);

        // Reuse the original controls so tts.js keeps working with them
        $('rd-voice-slot').appendChild($('tts-voice-select'));
        const range = $('tts-speed-range');
        range.max = '2.5';
        $('rd-speed-slot').appendChild(range);
        $('rd-speed-slot-label').appendChild($('tts-speed-val'));
        $('rd-autoturn-slot').appendChild($('tts-auto-turn-toggle').closest('.toggle-switch'));
        $('rd-color-slot').appendChild($('highlight-color-picker'));
        $('tts-settings-modal')?.remove();

        sh.querySelector('.rd-sheet-scrim').addEventListener('click', closeSheets);
        sh.querySelector('.rd-tabs').addEventListener('click', (e) => {
            const b = e.target.closest('[data-tab]');
            if (!b) return;
            sh.querySelectorAll('.rd-tabs button').forEach(x => x.classList.toggle('on', x === b));
            sh.querySelectorAll('.rd-tab').forEach(t => { t.hidden = t.dataset.tab !== b.dataset.tab; });
        });
        sh.addEventListener('click', (e) => {
            const chip = e.target.closest('.rd-chips button');
            if (chip) {
                const pref = chip.parentElement.dataset.pref;
                if (pref === 'sleep') return setSleep(chip.dataset.v);
                const layout = ['font', 'line', 'margin', 'align'].includes(pref);
                prefs[pref] = isNaN(Number(chip.dataset.v)) ? chip.dataset.v : Number(chip.dataset.v);
                savePrefs();
                applyPrefs(layout);
                return;
            }
            const step = e.target.closest('[data-size]');
            if (step) {
                prefs.size = Math.round(Math.min(2, Math.max(0.8, prefs.size + Number(step.dataset.size))) * 100) / 100;
                savePrefs();
                applyPrefs(true);
                return;
            }
            const sw = e.target.closest('[data-theme]');
            if (sw) { prefs.theme = sw.dataset.theme; savePrefs(); applyPrefs(false); return; }
            if (e.target.closest('#rd-auto-toggle')) { autoTurn.on ? stopAutoTurn() : startAutoTurn(); renderSettings(); }
        });
        sh.addEventListener('input', (e) => {
            if (e.target.id === 'rd-dim') { prefs.dim = Number(e.target.value); savePrefs(); modal().style.setProperty('--rd-dim', String(prefs.dim)); }
            if (e.target.id === 'rd-wpm') {
                prefs.wpm = Number(e.target.value);
                savePrefs();
                const lbl = $('rd-wpm-val');
                if (lbl) lbl.textContent = `${prefs.wpm} words/min`;
            }
            if (e.target.id === 'rd-awake') { prefs.keepAwake = e.target.checked; savePrefs(); syncWakeLock(); }
        });
    }

    function renderSettings() {
        const d = $('rd-display');
        if (!d) return;
        d.innerHTML = `
            <div class="rd-row-label">Theme</div>
            <div class="rd-swatches">${Object.entries(THEMES).map(([k, t]) =>
                `<button type="button" data-theme="${k}" class="${prefs.theme === k ? 'on' : ''}" style="background:${t.bg};color:${t.fg}" aria-label="${t.label}">Aa<small>${t.label}</small></button>`).join('')}</div>
            <div class="rd-row-label">Font</div>
            <div class="rd-chips rd-fonts" data-pref="font">${Object.entries(FONTS).map(([k, f]) =>
                `<button type="button" data-v="${k}" class="${prefs.font === k ? 'on' : ''}" style="font-family:${esc(f.css)}">${f.label}</button>`).join('')}</div>
            <div class="rd-row-label">Text size</div>
            <div class="rd-stepper"><button type="button" data-size="-0.05" aria-label="Smaller">A−</button><span>${Math.round(prefs.size / 1.15 * 100)}%</span><button type="button" data-size="0.05" aria-label="Larger">A+</button></div>
            <div class="rd-row-label">Line spacing</div>
            ${chipRow('line', [[1.5, 'Compact'], [1.8, 'Normal'], [2.1, 'Airy']], prefs.line)}
            <div class="rd-row-label">Margins</div>
            ${chipRow('margin', [[14, 'Narrow'], [22, 'Normal'], [34, 'Wide']], prefs.margin)}
            <div class="rd-row-label">Alignment</div>
            ${chipRow('align', [['justify', 'Justified'], ['left', 'Left']], prefs.align)}
            <div class="rd-row-label">Dim the page</div>
            <input type="range" id="rd-dim" min="0" max="0.6" step="0.05" value="${prefs.dim}">
            <label class="rd-toggle-row"><div><b>Keep screen on</b><small>While a book is open</small></div><input type="checkbox" id="rd-awake" ${prefs.keepAwake ? 'checked' : ''}></label>`;

        const t = $('rd-turn');
        t.innerHTML = `
            <div class="rd-row-label">Page turn</div>
            ${chipRow('turn', [['curl', '📖 Curl'], ['slide', '➡️ Slide'], ['fade', '✨ Fade'], ['none', 'Instant']], prefs.turn)}
            <p class="rd-hint">Drag from the right edge to curl a page, or tap the left/right side. Tap the middle to hide the bars.</p>
            <div class="rd-toggle-row"><div><b>Auto page-turn</b><small>Turns pages at your reading pace</small></div>
                <button type="button" id="rd-auto-toggle" class="rd-pill ${autoTurn.on ? 'on' : ''}">${autoTurn.on ? 'On' : 'Off'}</button></div>
            <div class="rd-row-label">Reading pace <span id="rd-wpm-val">${prefs.wpm} words/min</span></div>
            <input type="range" id="rd-wpm" min="100" max="500" step="10" value="${prefs.wpm}">`;

        const sl = $('rd-sleep');
        if (sl) sl.innerHTML = chipRow('sleep', [['0', 'Off'], ['15', '15 min'], ['30', '30 min'], ['60', '1 hour'], ['page', 'End of page']], sleep.mode);

        const hint = $('rd-voice-hint');
        if (hint) {
            const ok = window.NeuralTTS && NeuralTTS.available;
            hint.innerHTML = ok
                ? '✨ Microsoft voices play as audio, so reading continues with the screen off and shows lock-screen controls.'
                : '✨ Microsoft neural voices unlock with a free Azure Speech key (500k characters/month). Until then, your device voices are used.';
        }
    }

    // ==================== AUTO PAGE-TURN (no audio) ====================
    const autoTurn = { on: false, timer: 0, started: 0, duration: 0, paused: false };

    function wordsOnPage() {
        const t = (pageEl()?.innerText || '').trim();
        return t ? t.split(/\s+/).length : 0;
    }

    function scheduleAutoTurn() {
        clearInterval(autoTurn.timer);
        if (!autoTurn.on) return;
        const words = Math.max(20, wordsOnPage());
        autoTurn.duration = Math.max(6000, words / prefs.wpm * 60000);
        autoTurn.started = performance.now();
        const bar = $('rd-auto-bar');
        autoTurn.timer = setInterval(() => {
            if (autoTurn.paused || document.hidden || modal().classList.contains('rd-sheet-open')) {
                autoTurn.started += 250;
                return;
            }
            const t = (performance.now() - autoTurn.started) / autoTurn.duration;
            if (bar) bar.style.transform = `scaleX(${Math.min(1, t)})`;
            if (t >= 1) {
                clearInterval(autoTurn.timer);
                if (bookPageIndex >= bookPages.length - 1) { stopAutoTurn(); notify('📖 End of the book'); return; }
                goNextPage();
            }
        }, 250);
    }

    function startAutoTurn() {
        if (typeof ttsState !== 'undefined' && ttsState.isPlaying) {
            notify('🎧 Already turning pages while listening');
            return;
        }
        autoTurn.on = true;
        autoTurn.paused = false;
        modal().classList.add('rd-auto-on');
        scheduleAutoTurn();
        notify(`📖 Auto page-turn on · ${prefs.wpm} words/min`);
    }

    // soft = the reader touched the page; just restart the timer for the new page
    function stopAutoTurn(soft) {
        if (!autoTurn.on) return;
        if (soft) { scheduleAutoTurn(); return; }
        autoTurn.on = false;
        clearInterval(autoTurn.timer);
        modal()?.classList.remove('rd-auto-on');
        const bar = $('rd-auto-bar');
        if (bar) bar.style.transform = 'scaleX(0)';
    }

    // ==================== SLEEP TIMER ====================
    const sleep = { mode: '0', until: 0, timer: 0 };

    function setSleep(mode) {
        sleep.mode = mode;
        clearInterval(sleep.timer);
        sleep.until = 0;
        if (mode !== '0' && mode !== 'page') {
            sleep.until = Date.now() + Number(mode) * 60000;
            sleep.timer = setInterval(() => {
                if (Date.now() >= sleep.until) sleepNow();
                updatePlayer();
            }, 5000);
        }
        renderSettings();
        updatePlayer();
        if (mode !== '0') notify(mode === 'page' ? '🌙 Listening stops at the end of this page' : `🌙 Listening stops in ${mode} min`);
    }

    function sleepNow() {
        clearInterval(sleep.timer);
        sleep.mode = '0';
        sleep.until = 0;
        if (window.NeuralTTS && NeuralTTS.isActive()) NeuralTTS.fadeOutAndPause();
        else if (typeof ttsState !== 'undefined' && ttsState.isPlaying && !ttsState.isPaused) toggleTTS();
        renderSettings();
        updatePlayer();
    }

    // ==================== LISTENING MINI-PLAYER ====================
    const SPEEDS = [0.8, 1, 1.2, 1.4, 1.6, 1.8, 2];

    function buildPlayer() {
        const footer = document.querySelector('#reader-modal .book-footer');
        if (!footer) return;
        footer.insertAdjacentHTML('afterbegin', `
            <div class="rd-player" id="rd-player" hidden>
                <button type="button" data-act="prev" aria-label="Previous page">⏮</button>
                <button type="button" data-act="play" class="rd-play" aria-label="Play or pause">⏸</button>
                <button type="button" data-act="next" aria-label="Next page">⏭</button>
                <div class="rd-player-info"><b id="rd-player-voice"></b><small id="rd-player-sub"></small></div>
                <button type="button" data-act="speed" class="rd-chip" id="rd-player-speed">1×</button>
                <button type="button" data-act="sleep" class="rd-chip" id="rd-player-sleep" aria-label="Sleep timer">🌙</button>
                <button type="button" data-act="stop" aria-label="Stop listening">✕</button>
            </div>
            <div class="rd-progress-row">
                <span id="rd-page-num"></span>
                <input type="range" id="rd-scrub" min="1" max="1" value="1" aria-label="Go to page">
                <span id="rd-time-left"></span>
            </div>`);
        footer.querySelector('#rd-player').addEventListener('click', (e) => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            const act = b.dataset.act;
            if (act === 'play') toggleTTS();
            if (act === 'prev') goPrevPage();
            if (act === 'next') goNextPage();
            if (act === 'stop') { if (typeof stopTTS === 'function') stopTTS(); }
            if (act === 'speed') {
                const cur = ttsState.speed;
                const next = SPEEDS.find(s => s > cur + 0.01) || SPEEDS[0];
                const range = $('tts-speed-range');
                range.value = String(next);
                range.dispatchEvent(new Event('input', { bubbles: true }));
                updatePlayer();
            }
            if (act === 'sleep') {
                const order = ['0', '15', '30', '60', 'page'];
                setSleep(order[(order.indexOf(sleep.mode) + 1) % order.length]);
            }
        });

        const scrub = $('rd-scrub');
        scrub.addEventListener('input', () => {
            const num = $('rd-page-num');
            if (num) num.textContent = `${scrub.value} / ${bookPages.length}`;
        });
        scrub.addEventListener('change', () => {
            const idx = Number(scrub.value) - 1;
            if (idx === bookPageIndex || isAnimating) return;
            bookPageIndex = idx;
            showBookPage(idx, 'none');
        });
    }

    function updatePlayer() {
        const pl = $('rd-player');
        if (!pl || typeof ttsState === 'undefined') return;
        const listening = !!ttsState.isPlaying;
        pl.hidden = !listening;
        modal()?.classList.toggle('rd-listening', listening);
        if (!listening) return;
        pl.querySelector('.rd-play').textContent = ttsState.isPaused ? '▶' : '⏸';
        const v = ttsState.selectedVoice;
        $('rd-player-voice').textContent = v ? (v.isNeural ? v.name.split(' — ')[0] : (v.name || '').replace(/Microsoft |Google |Desktop |\(.*?\)/g, '').trim() || 'Device voice') : 'Device voice';
        const sub = sleep.mode === 'page' ? 'Stops after this page'
            : sleep.until ? `Sleeps in ${Math.max(1, Math.ceil((sleep.until - Date.now()) / 60000))} min`
            : v && v.isNeural ? 'Microsoft neural · plays in background' : 'Reading aloud';
        $('rd-player-sub').textContent = sub;
        $('rd-player-speed').textContent = `${Number(ttsState.speed).toFixed(1).replace('.0', '')}×`;
        $('rd-player-sleep').classList.toggle('on', sleep.mode !== '0');
    }

    function updateProgress() {
        if (typeof bookPages === 'undefined' || !bookPages.length) return;
        const scrub = $('rd-scrub');
        if (scrub) { scrub.max = String(bookPages.length); scrub.value = String(bookPageIndex + 1); }
        const num = $('rd-page-num');
        if (num) num.textContent = `${bookPageIndex + 1} / ${bookPages.length}`;
        const left = $('rd-time-left');
        if (left) {
            const words = Math.max(60, wordsOnPage());
            const mins = Math.round((bookPages.length - bookPageIndex - 1) * words / (prefs.wpm || 230));
            left.textContent = mins <= 0 ? 'Last page' : mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m left` : `${mins} min left`;
        }
    }

    // ==================== KEEP SCREEN ON ====================
    let wakeLock = null;
    async function syncWakeLock() {
        const want = prefs.keepAwake && modal() && !modal().classList.contains('hidden') && !document.hidden;
        try {
            if (want && !wakeLock && 'wakeLock' in navigator) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => { wakeLock = null; });
            } else if (!want && wakeLock) {
                await wakeLock.release();
                wakeLock = null;
            }
        } catch (e) { wakeLock = null; }
    }

    // ==================== SELECTION TOOLBAR & HIGHLIGHTS ====================
    const HL_COLORS = ['#FFD54F', '#81C784', '#4FC3F7', '#F48FB1', '#CE93D8'];
    let popup = null;
    let selRange = null;
    let activeHl = null; // { el, text, offset, page }

    function buildPopup() {
        popup = document.createElement('div');
        popup.className = 'rd-popup';
        popup.hidden = true;
        modal().appendChild(popup);
        // Keep the text selection alive while tapping the toolbar
        popup.addEventListener('pointerdown', (e) => { if (!e.target.closest('select, textarea')) e.preventDefault(); });
        popup.addEventListener('click', onPopupClick);
    }

    function placePopup(rect) {
        const m = modal().getBoundingClientRect();
        popup.hidden = false;
        const w = popup.offsetWidth, h = popup.offsetHeight;
        let top = rect.top - m.top - h - 10;
        if (top < 60) top = rect.bottom - m.top + 10;
        const left = Math.max(8, Math.min(m.width - w - 8, rect.left - m.left + rect.width / 2 - w / 2));
        popup.style.top = `${top}px`;
        popup.style.left = `${left}px`;
    }

    function hidePopup() {
        if (popup) { popup.hidden = true; popup.classList.remove('rd-popup-wide'); }
        activeHl = null;
    }

    function selectionToolbar(range) {
        selRange = range.cloneRange();
        activeHl = null;
        const text = range.toString().trim();
        const single = /^[\p{L}'’-]{2,30}$/u.test(text);
        popup.innerHTML = `
            <div class="rd-pop-row">${HL_COLORS.map(c => `<button type="button" class="rd-dot" data-color="${c}" style="background:${c}" aria-label="Highlight"></button>`).join('')}</div>
            <div class="rd-pop-row rd-pop-actions">
                <button type="button" data-act="note">📝<small>Note</small></button>
                <button type="button" data-act="translate">🌐<small>Translate</small></button>
                ${single ? '<button type="button" data-act="define">🔎<small>Define</small></button>' : ''}
                <button type="button" data-act="copy">📋<small>Copy</small></button>
                <button type="button" data-act="listen">🔊<small>Read</small></button>
            </div>`;
        placePopup(range.getBoundingClientRect());
    }

    function highlightToolbar(el) {
        const text = decodeURIComponent(el.dataset.hlText || '');
        const offset = el.dataset.hlOffset !== undefined ? Number(el.dataset.hlOffset) : -1;
        const list = (bookHighlights && bookHighlights[bookPageIndex]) || [];
        const h = list.find(x => x.text === text && (offset === -1 || String(x.offset) === String(offset))) || {};
        activeHl = { el, text, offset, page: bookPageIndex, note: h.note || '' };
        selRange = null;
        popup.innerHTML = `
            <div class="rd-pop-row">${HL_COLORS.map(c => `<button type="button" class="rd-dot ${h.color === c ? 'on' : ''}" data-color="${c}" style="background:${c}" aria-label="Colour"></button>`).join('')}</div>
            ${h.note ? `<div class="rd-pop-note">${esc(h.note)}</div>` : ''}
            <div class="rd-pop-row rd-pop-actions">
                <button type="button" data-act="note">📝<small>${h.note ? 'Edit note' : 'Note'}</small></button>
                <button type="button" data-act="copy">📋<small>Copy</small></button>
                <button type="button" data-act="share">📤<small>Share</small></button>
                <button type="button" data-act="remove">🗑️<small>Remove</small></button>
            </div>`;
        placePopup(el.getBoundingClientRect());
    }

    function currentText() {
        return activeHl ? activeHl.text : selRange ? selRange.toString().trim() : '';
    }

    async function onPopupClick(e) {
        const dot = e.target.closest('[data-color]');
        if (dot) {
            const color = dot.dataset.color;
            if (activeHl) {
                updateHighlight(currentBookId, activeHl.page, activeHl.text, activeHl.offset, { color });
                activeHl.el.style.setProperty('--hl-bg', color);
                popup.querySelectorAll('.rd-dot').forEach(d => d.classList.toggle('on', d === dot));
            } else if (selRange) {
                handleTextSelection(selRange, { color });
                window.getSelection()?.removeAllRanges();
                hidePopup();
            }
            return;
        }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        const text = currentText();
        if (act === 'copy') {
            try { await navigator.clipboard.writeText(text); notify('📋 Copied'); } catch (err) { notify('Couldn\'t copy'); }
            hidePopup();
        } else if (act === 'share') {
            const msg = `“${text}”\n— ${currentBookTitle}`;
            if (navigator.share) navigator.share({ text: msg }).catch(() => {});
            else { navigator.clipboard?.writeText(msg); notify('📋 Quote copied'); }
            hidePopup();
        } else if (act === 'remove' && activeHl) {
            removeHighlight(currentBookId, activeHl.page, activeHl.text, activeHl.offset);
            hidePopup();
            showBookPage(bookPageIndex, 'none');
        } else if (act === 'note') {
            openNoteSheet();
        } else if (act === 'translate') {
            translateSelection(text);
        } else if (act === 'define') {
            defineWord(text);
        } else if (act === 'listen' && selRange) {
            const r = selRange;
            window.getSelection()?.removeAllRanges();
            hidePopup();
            readFrom(r);
        }
    }

    function readFrom(range) {
        if (typeof ttsState === 'undefined') return;
        if (ttsState.selectedVoice && ttsState.selectedVoice.isNeural && window.NeuralTTS) {
            if (typeof stopTTS === 'function' && ttsState.isPlaying) stopTTS();
            NeuralTTS.setVoice(ttsState.selectedVoice.id);
            NeuralTTS.setSpeed(ttsState.speed);
            NeuralTTS.startFromRange(range);
        } else {
            if (ttsState.isPlaying && typeof stopTTS === 'function') stopTTS();
            playTTS();
        }
    }

    async function translateSelection(text) {
        const lang = localStorage.getItem('rdSelectLang') || (typeof activeTranslationLang !== 'undefined' && activeTranslationLang) || 'hi';
        const sel = $('translate-lang-select');
        const options = sel ? sel.innerHTML : '<option value="hi">Hindi</option>';
        popup.classList.add('rd-popup-wide');
        popup.innerHTML = `<div class="rd-pop-head"><select class="rd-pop-lang">${options}</select></div><div class="rd-pop-body">Translating…</div>`;
        const pick = popup.querySelector('.rd-pop-lang');
        pick.value = lang;
        const run = async () => {
            localStorage.setItem('rdSelectLang', pick.value);
            const body = popup.querySelector('.rd-pop-body');
            body.textContent = 'Translating…';
            const out = await fetchTranslation(text, pick.value);
            body.textContent = out || 'Translation failed — check your connection.';
        };
        pick.addEventListener('change', run);
        await run();
    }

    async function defineWord(word) {
        popup.classList.add('rd-popup-wide');
        popup.innerHTML = `<div class="rd-pop-head"><b>${esc(word)}</b></div><div class="rd-pop-body">Looking up…</div>`;
        const body = popup.querySelector('.rd-pop-body');
        const w = encodeURIComponent(word.toLowerCase());
        const strip = (html) => new DOMParser().parseFromString(html || '', 'text/html').body.textContent.trim();
        try {
            const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`);
            if (!res.ok) throw new Error('not found');
            const entry = (await res.json())[0];
            const phon = entry.phonetic || (entry.phonetics || []).map(p => p.text).find(Boolean) || '';
            const parts = (entry.meanings || []).slice(0, 3).map(m =>
                `<div class="rd-def"><i>${esc(m.partOfSpeech)}</i> ${esc((m.definitions[0] || {}).definition || '')}</div>`).join('');
            if (!parts) throw new Error('empty');
            body.innerHTML = `${phon ? `<div class="rd-phon">${esc(phon)}</div>` : ''}${parts}`;
        } catch (err) {
            // Backup: Wiktionary
            try {
                const res = await fetch(`https://en.wiktionary.org/api/rest_v1/page/definition/${w}`);
                if (!res.ok) throw new Error('not found');
                const parts = ((await res.json()).en || []).slice(0, 3).map(m => {
                    const def = (m.definitions || []).map(d => strip(d.definition)).find(Boolean);
                    return def ? `<div class="rd-def"><i>${esc(m.partOfSpeech.toLowerCase())}</i> ${esc(def)}</div>` : '';
                }).join('');
                body.innerHTML = parts || 'No definition found.';
            } catch (err2) {
                body.textContent = 'No definition found.';
            }
        }
    }

    // Note editor (bottom sheet)
    function buildNoteSheet() {
        const sh = document.createElement('div');
        sh.id = 'rd-note';
        sh.className = 'rd-sheet';
        sh.innerHTML = `
            <div class="rd-sheet-scrim"></div>
            <div class="rd-sheet-card">
                <div class="rd-sheet-grab"></div>
                <div class="rd-note-quote" id="rd-note-quote"></div>
                <textarea id="rd-note-text" rows="4" placeholder="Your thoughts on this passage…"></textarea>
                <div class="rd-sheet-actions"><button type="button" class="rd-btn ghost" data-act="cancel">Cancel</button><button type="button" class="rd-btn" data-act="save">Save note</button></div>
            </div>`;
        modal().appendChild(sh);
        sh.querySelector('.rd-sheet-scrim').addEventListener('click', closeSheets);
        sh.addEventListener('click', (e) => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            if (b.dataset.act === 'save') {
                const note = $('rd-note-text').value.trim();
                if (sh._hl) updateHighlight(currentBookId, sh._hl.page, sh._hl.text, sh._hl.offset, { note });
                else if (sh._range) handleTextSelection(sh._range, { color: HL_COLORS[0], note });
                window.getSelection()?.removeAllRanges();
                closeSheets();
                showBookPage(bookPageIndex, 'none');
                if (note) notify('📝 Note saved');
            } else closeSheets();
        });
    }

    function openNoteSheet() {
        const sh = $('rd-note');
        sh._hl = activeHl ? { ...activeHl } : null;
        sh._range = activeHl ? null : selRange;
        $('rd-note-quote').textContent = `“${currentText()}”`;
        $('rd-note-text').value = activeHl ? activeHl.note : '';
        hidePopup();
        openSheet('rd-note');
        setTimeout(() => $('rd-note-text').focus(), 250);
    }

    function initSelection() {
        let t = 0;
        document.addEventListener('selectionchange', () => {
            clearTimeout(t);
            t = setTimeout(() => {
                const m = modal();
                if (!m || m.classList.contains('hidden') || m.classList.contains('rd-sheet-open')) return;
                const sel = window.getSelection();
                if (sel && !sel.isCollapsed && sel.rangeCount && pageEl()?.contains(sel.anchorNode) && sel.toString().trim().length > 1) {
                    if (bookType === 'pdf' && !pageEl().querySelector('.pdf-text-layer')) return;
                    selectionToolbar(sel.getRangeAt(0));
                } else if (popup && !popup.hidden && !activeHl && !popup.classList.contains('rd-popup-wide')) {
                    hidePopup();
                }
            }, 220);
        });
        // Tap a saved highlight -> its toolbar
        pageEl()?.addEventListener('click', (e) => {
            const el = e.target.closest('.book-highlight');
            if (!el || hasSelection()) return;
            e.stopPropagation();
            highlightToolbar(el);
        });
        // Tap elsewhere closes the toolbar
        document.addEventListener('pointerdown', (e) => {
            if (popup && !popup.hidden && !e.target.closest('.rd-popup') && !e.target.closest('.book-highlight')) {
                setTimeout(() => { if (!hasSelection()) hidePopup(); }, 0);
            }
        }, true);
    }

    // ==================== HIGHLIGHTS NOTEBOOK ====================
    function buildNotebook() {
        const sh = document.createElement('div');
        sh.id = 'rd-notebook';
        sh.className = 'rd-sheet';
        sh.innerHTML = `
            <div class="rd-sheet-scrim"></div>
            <div class="rd-sheet-card rd-tall">
                <div class="rd-sheet-grab"></div>
                <div class="rd-sheet-head"><div><b>Highlights & notes</b><small id="rd-nb-count"></small></div>
                    <button type="button" class="rd-btn ghost" id="rd-nb-export">Share all</button></div>
                <div id="rd-nb-list" class="rd-nb-list"></div>
            </div>`;
        modal().appendChild(sh);
        sh.querySelector('.rd-sheet-scrim').addEventListener('click', closeSheets);
        sh.addEventListener('click', async (e) => {
            const item = e.target.closest('[data-page]');
            const act = e.target.closest('[data-act]');
            if (act && item) {
                e.stopPropagation();
                const page = Number(item.dataset.page);
                const text = decodeURIComponent(item.dataset.text);
                const offset = Number(item.dataset.offset);
                if (act.dataset.act === 'delete') {
                    removeHighlight(currentBookId, page, text, offset);
                    renderNotebook();
                    if (page === bookPageIndex) showBookPage(bookPageIndex, 'none');
                } else if (act.dataset.act === 'copy') {
                    try { await navigator.clipboard.writeText(text); notify('📋 Copied'); } catch (err) { /* ignore */ }
                }
                return;
            }
            if (item) {
                closeSheets();
                const page = Number(item.dataset.page);
                if (page !== bookPageIndex) { bookPageIndex = page; showBookPage(page, 'none'); }
                return;
            }
            if (e.target.closest('#rd-nb-export')) {
                const text = notebookText();
                if (!text) return;
                if (navigator.share) navigator.share({ title: currentBookTitle, text }).catch(() => {});
                else { try { await navigator.clipboard.writeText(text); notify('📋 All highlights copied'); } catch (err) { /* ignore */ } }
            }
        });
    }

    function notebookEntries() {
        const all = getBookHighlights(currentBookId);
        const out = [];
        Object.keys(all).map(Number).sort((a, b) => a - b).forEach(page => {
            [...all[page]].sort((a, b) => (a.offset || 0) - (b.offset || 0)).forEach(h => out.push({ page, ...h }));
        });
        return out;
    }

    function notebookText() {
        const entries = notebookEntries();
        if (!entries.length) return '';
        return `Highlights from "${currentBookTitle}"\n\n` + entries.map(h =>
            `“${h.text}” — page ${h.page + 1}${h.note ? `\nNote: ${h.note}` : ''}`).join('\n\n');
    }

    function renderNotebook() {
        const list = $('rd-nb-list');
        const entries = notebookEntries();
        $('rd-nb-count').textContent = entries.length ? `${entries.length} in this book` : '';
        if (!entries.length) {
            list.innerHTML = `<div class="rd-empty">🖍️<p>Select any text while reading to highlight it, add a note, translate or look up a word.</p></div>`;
            return;
        }
        list.innerHTML = entries.map(h => `
            <div class="rd-nb-item" data-page="${h.page}" data-text="${encodeURIComponent(h.text)}" data-offset="${h.offset === undefined ? -1 : h.offset}" style="--c:${h.color || 'rgba(var(--hl-color-rgb, 255, 213, 79), 1)'}">
                <div class="rd-nb-text">${esc(h.text)}</div>
                ${h.note ? `<div class="rd-nb-note">📝 ${esc(h.note)}</div>` : ''}
                <div class="rd-nb-meta"><span>Page ${h.page + 1}</span><span>
                    <button type="button" data-act="copy" aria-label="Copy">📋</button>
                    <button type="button" data-act="delete" aria-label="Delete">🗑️</button></span></div>
            </div>`).join('');
    }

    window.openHighlightsNotebook = () => { renderNotebook(); openSheet('rd-notebook'); };

    // ==================== TRANSLATION: quick peek at the original ====================
    let peekLang = null;
    function buildPeek() {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'rd-peek';
        pill.hidden = true;
        stage().appendChild(pill);
        pill.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (peekLang) {
                activeTranslationLang = peekLang;
                peekLang = null;
            } else {
                peekLang = activeTranslationLang;
                activeTranslationLang = null;
            }
            await showBookPage(bookPageIndex, 'none');
            updatePeek();
        });
        // Remember the last language in the translate sheet and suggest recent ones
        const sel = $('translate-lang-select');
        const last = localStorage.getItem('rdLastLang');
        if (sel && last) sel.value = last;
        $('translate-do-btn')?.addEventListener('click', () => { if (sel) localStorage.setItem('rdLastLang', sel.value); peekLang = null; });
        $('translate-revert-btn')?.addEventListener('click', () => { peekLang = null; setTimeout(updatePeek, 50); });
    }

    function updatePeek() {
        const pill = stage()?.querySelector('.rd-peek');
        if (!pill) return;
        const lang = peekLang || (typeof activeTranslationLang !== 'undefined' ? activeTranslationLang : null);
        pill.hidden = !lang;
        if (!lang) return;
        const name = $('translate-lang-select')?.querySelector(`option[value="${lang}"]`)?.textContent.replace(/^\S+\s/, '').split(' (')[0] || lang;
        pill.textContent = peekLang ? `Original · tap for ${name}` : `${name} · tap for original`;
    }

    // ==================== OPEN / CLOSE ====================
    // Only react when the reader actually opens or closes: our own class changes on the
    // modal also trigger the observer, and classList.remove() records a mutation even when
    // nothing changed.
    let wasOpen = false;
    function onOpenChange() {
        const open = !modal().classList.contains('hidden');
        if (open === wasOpen) return;
        wasOpen = open;
        if (open) {
            applyPrefs(false);
            toggleImmersive(false);
            syncWakeLock();
            if (window.NeuralTTS) NeuralTTS.checkAvailable().then(renderSettings);
        } else {
            stopAutoTurn();
            setSleep('0');
            closeSheets();
            hidePopup();
            peekLang = null;
            syncWakeLock();
        }
    }

    function init() {
        const m = modal();
        if (!m || !stage()) return;
        m.insertAdjacentHTML('beforeend', '<div class="rd-dim-layer"></div>');
        stage().insertAdjacentHTML('beforeend', '<div class="rd-auto-track"><i id="rd-auto-bar"></i></div>');

        // Toolbar: friendlier labels on the existing buttons
        const set = (id, html, label) => { const b = $(id); if (b) { b.innerHTML = html; b.title = label; b.setAttribute('aria-label', label); } };
        set('reader-close-btn', '‹', 'Close book');
        set('reader-tts-settings-btn', '<span class="rd-aa">Aa</span>', 'Reading settings');
        set('reader-highlight-btn', '🖍️', 'Highlights & notes');
        set('reader-translate-btn', '🌐', 'Translate');

        buildSettingsSheet();
        buildNoteSheet();
        buildNotebook();
        buildPlayer();
        buildPopup();
        buildPeek();
        initGestures();
        initSelection();
        applyPrefs(false);

        // Settings button opens the new sheet (capture phase beats tts.js's listener)
        document.addEventListener('click', (e) => {
            if (e.target.closest('#reader-tts-settings-btn')) {
                e.stopImmediatePropagation();
                e.preventDefault();
                renderSettings();
                openSheet('rd-settings');
            }
        }, true);

        new MutationObserver(onOpenChange).observe(m, { attributes: true, attributeFilter: ['class'] });
        // Native voices report state through the toolbar button text
        const ttsBtn = $('reader-tts-btn');
        if (ttsBtn) new MutationObserver(updatePlayer).observe(ttsBtn, { childList: true, characterData: true, subtree: true });
        document.addEventListener('ttsstatechange', updatePlayer);
        document.addEventListener('readerpageshown', () => {
            updateProgress();
            updatePeek();
            hidePopup();
            if (autoTurn.on) scheduleAutoTurn();
            if (sleep.mode === 'page' && typeof ttsState !== 'undefined' && ttsState.isPlaying) sleepNow();
        });
        document.addEventListener('visibilitychange', syncWakeLock);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 600));
    else setTimeout(init, 600);
})();
