// library-room.js — the Library as a cozy reading room
// A window that follows the time of day (rain at dusk and night), lamp light, a sleeping cat,
// optional rain/fire sounds, wooden shelves with real book spines and covers, a book-opening
// flourish, and a richer "Add your own book" sheet (EPUB/PDF/DOCX/HTML/TXT with covers).

(function () {
    const $ = (id) => document.getElementById(id);
    const esc = (s) => escapeHTML(String(s == null ? '' : s));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SPINE_COLORS = ['#7b2d26', '#2f4858', '#33658a', '#86654a', '#4a5d23', '#6d3b47', '#264653', '#9c6644', '#3d405b', '#5f0f40', '#1d3557', '#8d6346', '#2d6a4f', '#7f5539'];
    const COVER_GRADIENTS = [
        ['#667eea', '#764ba2'], ['#f6d365', '#fda085'], ['#84fab0', '#8fd3f4'], ['#ff758c', '#ff7eb3'],
        ['#4facfe', '#00f2fe'], ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#30cfd0', '#330867']
    ];

    function hash(str) {
        let h = 2166136261;
        for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
        return h >>> 0;
    }

    function customMeta(id) {
        return getCustomBooks().find(b => String(b.id) === String(id));
    }

    // ==================== THE ROOM ====================
    function timeOfDay() {
        const h = new Date().getHours() + new Date().getMinutes() / 60;
        if (h >= 5 && h < 8) return 'dawn';
        if (h >= 8 && h < 17) return 'day';
        if (h >= 17 && h < 19.5) return 'dusk';
        return 'night';
    }

    let room = null;
    function buildRoom() {
        room = document.createElement('div');
        room.className = 'lr-room';
        room.setAttribute('aria-hidden', 'true');
        let rain = '';
        for (let i = 0; i < 46; i++) {
            rain += `<i style="left:${(Math.random() * 100).toFixed(1)}%;animation-delay:-${(Math.random() * 1.2).toFixed(2)}s;animation-duration:${(0.55 + Math.random() * 0.5).toFixed(2)}s;opacity:${(0.25 + Math.random() * 0.5).toFixed(2)}"></i>`;
        }
        let drops = '';
        for (let i = 0; i < 14; i++) {
            drops += `<b style="left:${(Math.random() * 96).toFixed(1)}%;top:${(Math.random() * 70).toFixed(1)}%;animation-delay:-${(Math.random() * 9).toFixed(1)}s;animation-duration:${(6 + Math.random() * 6).toFixed(1)}s"></b>`;
        }
        let motes = '';
        for (let i = 0; i < 18; i++) {
            motes += `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 100).toFixed(1)}%;--dx:${(Math.random() * 60 - 30).toFixed(0)}px;--dy:${(Math.random() * -80 - 20).toFixed(0)}px;animation-duration:${(9 + Math.random() * 9).toFixed(1)}s;animation-delay:-${(Math.random() * 12).toFixed(1)}s"></i>`;
        }
        let stars = '';
        for (let i = 0; i < 30; i++) stars += `<i style="left:${(Math.random() * 100).toFixed(1)}%;top:${(Math.random() * 60).toFixed(1)}%;animation-delay:-${(Math.random() * 4).toFixed(1)}s"></i>`;

        room.innerHTML = `
            <div class="lr-wall"></div>
            <div class="lr-lamp"></div>
            <div class="lr-window">
                <div class="lr-sky"></div>
                <div class="lr-stars">${stars}</div>
                <div class="lr-orb"></div>
                <div class="lr-hills"></div>
                <svg class="lr-trees" viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M0,120 L0,70 L14,52 L22,66 L34,38 L48,64 L58,48 L70,70 L84,44 L98,72 L112,58 L124,74 L140,40 L156,70 L170,56 L186,76 L200,62 L214,78 L232,46 L248,74 L262,60 L278,80 L294,50 L310,76 L326,58 L342,78 L358,42 L374,70 L388,56 L400,66 L400,120 Z"/></svg>
                <div class="lr-rain">${rain}</div>
                <div class="lr-drops">${drops}</div>
                <div class="lr-glass"></div>
                <div class="lr-muntin-v"></div><div class="lr-muntin-h"></div>
            </div>
            <div class="lr-curtain lr-curtain-l"></div>
            <div class="lr-curtain lr-curtain-r"></div>
            <div class="lr-sill">
                <svg class="lr-plant" viewBox="0 0 60 80"><path class="lr-leaf" d="M30 52 C14 40 10 22 16 10 C24 22 30 34 30 52Z"/><path class="lr-leaf" d="M30 52 C44 38 52 24 48 8 C38 20 32 34 30 52Z"/><path class="lr-leaf" d="M30 54 C22 34 26 16 31 4 C36 18 36 36 30 54Z"/><path class="lr-pot" d="M16 52 H44 L40 78 H20 Z"/></svg>
                <svg class="lr-cat" viewBox="0 0 120 60"><g class="lr-cat-body"><path d="M18 52 C14 30 34 18 62 20 C86 21 102 30 104 46 C105 52 100 56 92 56 L26 56 C21 56 18 55 18 52Z"/><path d="M84 26 L88 12 L95 24 Z M98 30 L104 16 L108 30 Z"/><ellipse cx="96" cy="36" rx="14" ry="12"/></g><path class="lr-cat-tail" d="M20 50 C6 50 4 38 12 34 C16 32 18 36 15 38"/><path class="lr-cat-eye" d="M90 37 q3 2 6 0 M99 37 q3 2 6 0"/></svg>
            </div>
            <div class="lr-motes">${motes}</div>
            <div class="lr-fire"></div>
            <div class="lr-vignette"></div>`;
        document.body.insertBefore(room, document.body.firstChild);
        applyTime();
    }

    function applyTime() {
        if (!room) return;
        const tod = timeOfDay();
        room.dataset.tod = tod;
        room.classList.toggle('lr-raining', tod === 'night' || tod === 'dusk' || ambient.mode.includes('rain'));
    }

    // ==================== AMBIENT SOUND (generated, no files) ====================
    const ambient = { mode: localStorage.getItem('lrAmbient') || 'off', ctx: null, master: null, crackle: 0, parts: [] };
    const MODES = ['off', 'rain', 'fire', 'rain+fire'];
    const MODE_LABEL = { off: '🔇', rain: '🌧️', fire: '🔥', 'rain+fire': '🌧️🔥' };

    function noiseBuffer(ctx, kind) {
        const len = ctx.sampleRate * 3;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, last = 0;
        for (let i = 0; i < len; i++) {
            const w = Math.random() * 2 - 1;
            if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
            else { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526; d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
        }
        return buf;
    }

    function loop(ctx, buf, filterType, freq, gain) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const f = ctx.createBiquadFilter();
        f.type = filterType;
        f.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.value = gain;
        src.connect(f).connect(g).connect(ambient.master);
        src.start();
        return { src, g };
    }

    function crackle() {
        if (!ambient.ctx || !ambient.mode.includes('fire')) return;
        const ctx = ambient.ctx;
        const t = ctx.currentTime;
        const src = ctx.createBufferSource();
        src.buffer = ambient.white;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = 1500 + Math.random() * 3000;
        f.Q.value = 2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.35, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.03 + Math.random() * 0.08);
        src.connect(f).connect(g).connect(ambient.master);
        src.start(t, Math.random() * 2, 0.15);
        ambient.crackle = setTimeout(crackle, 40 + Math.random() * (Math.random() < 0.2 ? 900 : 260));
    }

    function startAmbient() {
        stopAmbient();
        if (ambient.mode === 'off') return;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = ambient.ctx || new AC();
        ambient.ctx = ctx;
        ctx.resume?.();
        ambient.master = ctx.createGain();
        ambient.master.gain.value = 0;
        ambient.master.connect(ctx.destination);
        ambient.master.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 1.5);
        ambient.white = ambient.white || noiseBuffer(ctx, 'pink');
        if (ambient.mode.includes('rain')) {
            ambient.parts.push(loop(ctx, ambient.white, 'lowpass', 5200, 0.55));
            ambient.parts.push(loop(ctx, ambient.white, 'highpass', 2600, 0.12));
        }
        if (ambient.mode.includes('fire')) {
            ambient.brown = ambient.brown || noiseBuffer(ctx, 'brown');
            ambient.parts.push(loop(ctx, ambient.brown, 'lowpass', 380, 0.9));
            crackle();
        }
    }

    function stopAmbient() {
        clearTimeout(ambient.crackle);
        ambient.parts.forEach(p => { try { p.src.stop(); } catch (e) { /* already stopped */ } });
        ambient.parts = [];
        if (ambient.master) { try { ambient.master.disconnect(); } catch (e) { /* ignore */ } ambient.master = null; }
    }

    function cycleAmbient() {
        ambient.mode = MODES[(MODES.indexOf(ambient.mode) + 1) % MODES.length];
        localStorage.setItem('lrAmbient', ambient.mode);
        const btn = $('lr-sound-btn');
        if (btn) btn.textContent = MODE_LABEL[ambient.mode];
        applyTime();
        startAmbient();
        if (typeof showNotification === 'function') {
            showNotification({ off: '🔇 Room sounds off', rain: '🌧️ Gentle rain', fire: '🔥 Crackling fireplace', 'rain+fire': '🌧️🔥 Rain by the fire' }[ambient.mode]);
        }
    }

    // ==================== BOOKS ON SHELVES ====================
    function coverArt(title, author, meta, idx) {
        if (meta && meta.coverImage) return `<img src="${esc(meta.coverImage)}" alt="">`;
        const [a, b] = meta && meta.coverColor ? [meta.coverColor, meta.coverColor2 || meta.coverColor] : COVER_GRADIENTS[(hash(title) + (idx || 0)) % COVER_GRADIENTS.length];
        return `<div class="lr-gen-cover" style="background:linear-gradient(150deg, ${a}, ${b})">
            <span class="lr-gen-emoji">${esc((meta && meta.emoji) || '📖')}</span>
            <span class="lr-gen-title">${esc(title)}</span>
            ${author ? `<span class="lr-gen-author">${esc(author)}</span>` : ''}</div>`;
    }

    function faceOut(opts) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lr-book lr-face';
        btn.title = opts.title;
        btn.innerHTML = `<div class="lr-cover">${opts.cover}${opts.badge || ''}</div>${opts.caption ? `<div class="lr-caption">${opts.caption}</div>` : ''}`;
        // Missing cover image -> a generated one
        const img = btn.querySelector('img');
        if (img) img.addEventListener('error', () => { img.outerHTML = coverArt(opts.title, opts.author, null, 0); }, { once: true });
        btn.addEventListener('click', () => flourish(btn, opts.open));
        return btn;
    }

    function spine(opts) {
        const h = hash(opts.id + opts.title);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lr-book lr-spine' + (opts.finished ? ' lr-finished' : '') + (h % 7 === 3 ? ' lr-tilt' : '');
        btn.title = opts.title;
        const color = opts.color || SPINE_COLORS[h % SPINE_COLORS.length];
        const height = 148 + (h % 5) * 9;
        const width = Math.max(30, Math.min(48, opts.width || 34 + (h % 4) * 4));
        btn.style.cssText = `--c:${color};--h:${height}px;--w:${width}px`;
        btn.innerHTML = `<span class="lr-band"></span><span class="lr-spine-title">${esc(opts.title)}</span><span class="lr-spine-mark">${esc(opts.mark || '')}</span><span class="lr-band lr-band-b"></span>`;
        btn.addEventListener('click', () => { if (!btn._longPressed) flourish(btn, opts.open); btn._longPressed = false; });
        if (opts.onLongPress) {
            let timer = 0;
            const cancel = () => clearTimeout(timer);
            btn.addEventListener('pointerdown', () => { timer = setTimeout(() => { btn._longPressed = true; opts.onLongPress(); }, 650); });
            btn.addEventListener('pointerup', cancel);
            btn.addEventListener('pointerleave', cancel);
            btn.addEventListener('contextmenu', (e) => { e.preventDefault(); });
        }
        return btn;
    }

    function shelfRow(listEl) {
        listEl.className = 'lr-row';
        listEl.innerHTML = '';
        return listEl;
    }

    function openBook(entry) {
        if (entry.url === '__custom__') openCustomBook(entry.id, entry.title, entry.emoji || (customMeta(entry.id) || {}).emoji || '📖');
        else openReader(entry.id, entry.title, entry.url, entry.coverUrl);
    }

    window.renderReadingHistory = function () {
        const section = $('reading-history-section');
        const list = $('reading-history-list');
        if (!section || !list) return;
        const history = getBookHistory();
        section.style.display = history.length ? 'block' : 'none';
        section.classList.add('lr-shelf');
        shelfRow(list);
        history.forEach((book, i) => {
            const pct = book.totalPages > 0 ? Math.round(((book.pageIndex + 1) / book.totalPages) * 100) : 0;
            const custom = book.url === '__custom__';
            const meta = custom ? customMeta(book.id) : null;
            const cover = custom
                ? coverArt(book.title, meta && meta.author, meta || { emoji: book.coverUrl }, i)
                : `<img src="${esc(safeImageSrc(book.coverUrl) || '')}" alt="" loading="lazy">`;
            list.appendChild(faceOut({
                title: book.title,
                cover,
                badge: `<span class="lr-progress"><i style="width:${pct}%"></i></span><span class="lr-pct">${pct}%</span>`,
                caption: i === 0 ? 'Continue' : '',
                open: () => openBook({ ...book, emoji: meta && meta.emoji })
            }));
        });
        updateHero();
    };

    window.renderFinishedBooks = function () {
        const section = $('finished-books-section');
        const list = $('finished-books-list');
        if (!section || !list) return;
        const finished = getFinishedBooks();
        section.style.display = finished.length ? 'block' : 'none';
        section.classList.add('lr-shelf');
        shelfRow(list);
        finished.forEach(book => list.appendChild(spine({
            id: book.id, title: book.title, finished: true, mark: '🏆',
            open: () => openBook(book)
        })));
    };

    window.renderRecommendations = function () {
        const grid = $('recommendations-grid');
        if (!grid) return;
        const recs = [
            { id: 2680, title: 'Meditations', author: 'Marcus Aurelius' },
            { id: 1342, title: 'Pride and Prejudice', author: 'Jane Austen' },
            { id: 84, title: 'Frankenstein', author: 'Mary Shelley' },
            { id: 345, title: 'Dracula', author: 'Bram Stoker' },
            { id: 2701, title: 'Moby Dick', author: 'Herman Melville' },
            { id: 1661, title: 'The Adventures of Sherlock Holmes', author: 'Arthur Conan Doyle' },
            { id: 11, title: "Alice's Adventures in Wonderland", author: 'Lewis Carroll' },
            { id: 1232, title: 'The Prince', author: 'Niccolò Machiavelli' },
            { id: 132, title: 'The Art of War', author: 'Sun Tzu' },
            { id: 64317, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' }
        ];
        document.getElementById('library-recommendations')?.classList.add('lr-shelf');
        shelfRow(grid);
        recs.forEach(b => {
            const coverUrl = `https://www.gutenberg.org/cache/epub/${b.id}/pg${b.id}.cover.medium.jpg`;
            const textUrl = `https://www.gutenberg.org/ebooks/${b.id}.txt.utf-8`;
            grid.appendChild(faceOut({
                title: b.title,
                author: b.author,
                cover: `<img src="${coverUrl}" alt="" loading="lazy">`,
                open: () => openReader(b.id, b.title, textUrl, coverUrl)
            }));
        });
    };

    window.renderMyBooks = function () {
        const grid = $('my-books-grid');
        if (!grid) return;
        document.getElementById('my-books-section')?.classList.add('lr-shelf');
        shelfRow(grid);
        const books = getCustomBooks();
        books.forEach(book => {
            const ft = book.fileType || 'text';
            grid.appendChild(spine({
                id: book.id,
                title: book.title,
                color: book.coverColor,
                width: ft === 'text' ? 30 + Math.min(18, Math.round(book.charCount / 40000)) : 40,
                mark: book.emoji || '📕',
                open: () => openCustomBook(book.id, book.title, book.emoji),
                onLongPress: () => {
                    if (confirm(`Delete "${book.title}" from your library? This can't be undone.`)) {
                        deleteCustomBook(book.id);
                        window.renderMyBooks();
                        window.renderReadingHistory();
                    }
                }
            }));
        });
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'lr-book lr-add';
        add.innerHTML = '<span>＋</span><small>Add book</small>';
        add.addEventListener('click', openAddSheet);
        grid.appendChild(add);
        const hint = document.getElementById('lr-mybooks-hint');
        if (hint) hint.hidden = books.length === 0;
    };

    // ==================== OPENING FLOURISH ====================
    function flourish(el, open) {
        if (reduceMotion || !el.getBoundingClientRect) return open();
        const r = el.getBoundingClientRect();
        const fly = el.cloneNode(true);
        fly.classList.add('lr-fly');
        fly.style.left = `${r.left}px`;
        fly.style.top = `${r.top}px`;
        fly.style.width = `${r.width}px`;
        fly.style.height = `${r.height}px`;
        document.body.appendChild(fly);
        el.classList.add('lr-pulled');
        const scale = Math.min(window.innerWidth / r.width, window.innerHeight / r.height) * 0.55;
        const dx = window.innerWidth / 2 - (r.left + r.width / 2);
        const dy = window.innerHeight / 2 - (r.top + r.height / 2);
        requestAnimationFrame(() => {
            fly.style.transform = `translate(${dx}px, ${dy}px) scale(${scale}) rotateY(-18deg)`;
        });
        setTimeout(open, 360);
        setTimeout(() => { fly.style.opacity = '0'; }, 520);
        setTimeout(() => { fly.remove(); el.classList.remove('lr-pulled'); }, 900);
    }

    // ==================== HERO ====================
    function updateHero() {
        const hero = $('lr-hero');
        if (!hero) return;
        const h = new Date().getHours();
        const name = typeof getUserName === 'function' ? getUserName() : '';
        const greet = h < 5 ? 'Late-night reading' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
        const tod = timeOfDay();
        const line = room && room.classList.contains('lr-raining')
            ? 'Rain on the window — perfect reading weather.'
            : tod === 'day' ? 'Sunlight on the pages. Settle in.' : tod === 'dawn' ? 'A quiet morning with a good book.' : 'The lamp is on. Pick up a story.';
        const last = getBookHistory()[0];
        hero.innerHTML = `<p class="lr-greet">${esc(greet)}${name ? `, ${esc(name)}` : ''}</p><p class="lr-line">${esc(line)}</p>
            ${last ? `<button type="button" class="lr-resume" id="lr-resume">📖 Resume <b>${esc(last.title)}</b></button>` : ''}`;
        $('lr-resume')?.addEventListener('click', () => openBook(last));
    }

    // ==================== ADD YOUR OWN BOOK ====================
    let addState = null;

    function buildAddSheet() {
        const el = document.createElement('div');
        el.id = 'lr-add';
        el.className = 'lr-add-sheet';
        el.hidden = true;
        el.innerHTML = `
            <div class="lr-add-scrim"></div>
            <div class="lr-add-card" role="dialog" aria-label="Add your own book">
                <div class="lr-add-head"><b>Add to your shelf</b><button type="button" class="lr-x" data-act="close" aria-label="Close">✕</button></div>
                <div class="lr-add-tabs"><button type="button" data-tab="file" class="on">📂 Files</button><button type="button" data-tab="paste">📝 Paste text</button></div>
                <div class="lr-add-pane" data-pane="file">
                    <label class="lr-drop" id="lr-drop">
                        <input type="file" id="lr-file" multiple accept=".epub,.pdf,.txt,.md,.text,.html,.htm,.docx">
                        <span class="lr-drop-icon">📚</span>
                        <b>Choose books or drop them here</b>
                        <small>EPUB · PDF · Word (.docx) · HTML · TXT · Markdown — add several at once</small>
                    </label>
                    <div id="lr-files"></div>
                </div>
                <div class="lr-add-pane" data-pane="paste" hidden>
                    <input type="text" id="lr-paste-title" class="lr-input" placeholder="Title" maxlength="100">
                    <input type="text" id="lr-paste-author" class="lr-input" placeholder="Author (optional)" maxlength="80">
                    <textarea id="lr-paste-text" class="lr-input" rows="7" placeholder="Paste the text of your book, notes or article…"></textarea>
                </div>
                <div class="lr-cover-pick" id="lr-cover-pick" hidden>
                    <div class="lr-cover-preview" id="lr-cover-preview"></div>
                    <div class="lr-cover-opts">
                        <small>Cover</small>
                        <div class="lr-swatch-row" id="lr-swatches">${COVER_GRADIENTS.map(([a, b], i) => `<button type="button" data-g="${i}" style="background:linear-gradient(150deg,${a},${b})" aria-label="Colour ${i + 1}"></button>`).join('')}</div>
                        <div class="lr-emoji-row" id="lr-emojis">${['📖', '📕', '📗', '📘', '🌙', '🌿', '⭐', '🦋', '🔥', '🧠', '💡', '🎭'].map(e => `<button type="button" data-e="${e}">${e}</button>`).join('')}</div>
                        <label class="lr-img-btn">🖼️ Use an image<input type="file" id="lr-cover-file" accept="image/*" hidden></label>
                    </div>
                </div>
                <div class="lr-add-foot"><span id="lr-add-status"></span><button type="button" class="lr-save" data-act="save" disabled>Add to shelf</button></div>
            </div>`;
        document.body.appendChild(el);

        el.querySelector('.lr-add-scrim').addEventListener('click', closeAddSheet);
        el.addEventListener('click', (e) => {
            const act = e.target.closest('[data-act]');
            if (act && act.dataset.act === 'close') return closeAddSheet();
            if (act && act.dataset.act === 'save') return saveAll();
            const tab = e.target.closest('.lr-add-tabs [data-tab]');
            if (tab) {
                el.querySelectorAll('.lr-add-tabs button').forEach(b => b.classList.toggle('on', b === tab));
                el.querySelectorAll('.lr-add-pane').forEach(p => { p.hidden = p.dataset.pane !== tab.dataset.tab; });
                addState.mode = tab.dataset.tab;
                refreshAdd();
                return;
            }
            const g = e.target.closest('[data-g]');
            if (g) { const item = currentItem(); if (item) { item.coverImage = null; item.gradient = Number(g.dataset.g); refreshAdd(); } return; }
            const em = e.target.closest('[data-e]');
            if (em) { const item = currentItem(); if (item) { item.emoji = em.dataset.e; refreshAdd(); } return; }
            const rm = e.target.closest('[data-remove]');
            if (rm) { addState.items.splice(Number(rm.dataset.remove), 1); refreshAdd(); return; }
            const pick = e.target.closest('[data-pick]');
            if (pick) { addState.current = Number(pick.dataset.pick); refreshAdd(); }
        });
        el.addEventListener('input', (e) => {
            if (e.target.matches('[data-field]') && addState.items[Number(e.target.dataset.i)]) {
                addState.items[Number(e.target.dataset.i)][e.target.dataset.field] = e.target.value;
                drawPreview();
            }
            if (e.target.id === 'lr-paste-title' || e.target.id === 'lr-paste-author' || e.target.id === 'lr-paste-text') refreshAdd(true);
        });
        $('lr-file').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
        $('lr-cover-file').addEventListener('change', async (e) => {
            const f = e.target.files[0];
            e.target.value = '';
            const item = currentItem();
            if (!f || !item) return;
            item.coverImage = await downscaleImage(URL.createObjectURL(f));
            refreshAdd();
        });
        const drop = $('lr-drop');
        ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
        ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
        drop.addEventListener('drop', (e) => addFiles([...(e.dataTransfer?.files || [])]));
    }

    function openAddSheet() {
        addState = { mode: 'file', items: [], current: 0, paste: { gradient: 0, emoji: '📖', coverImage: null } };
        const el = $('lr-add');
        el.hidden = false;
        el.querySelectorAll('.lr-add-tabs button').forEach((b, i) => b.classList.toggle('on', i === 0));
        el.querySelectorAll('.lr-add-pane').forEach((p, i) => { p.hidden = i !== 0; });
        ['lr-paste-title', 'lr-paste-author', 'lr-paste-text'].forEach(id => { $(id).value = ''; });
        requestAnimationFrame(() => el.classList.add('open'));
        refreshAdd();
    }

    function closeAddSheet() {
        const el = $('lr-add');
        el.classList.remove('open');
        setTimeout(() => { el.hidden = true; }, 280);
    }

    function currentItem() {
        if (!addState) return null;
        return addState.mode === 'paste' ? addState.paste : addState.items[addState.current];
    }

    const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
    const baseName = (name) => name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();

    async function addFiles(files) {
        const ok = files.filter(f => ['epub', 'pdf', 'txt', 'md', 'text', 'html', 'htm', 'docx'].includes(extOf(f.name)));
        if (ok.length < files.length && typeof showNotification === 'function') showNotification('Some files were skipped — use EPUB, PDF, DOCX, HTML or TXT.');
        for (const file of ok) {
            const item = { file, title: baseName(file.name), author: '', gradient: hash(file.name) % COVER_GRADIENTS.length, emoji: '📖', coverImage: null, status: 'Reading…' };
            addState.items.push(item);
            addState.current = addState.items.length - 1;
            refreshAdd();
            try {
                await inspectFile(item);
                item.status = '';
            } catch (err) {
                item.status = 'Could not read this file';
                item.failed = true;
            }
            refreshAdd();
        }
    }

    // Pull title, author, cover and text out of each file type
    async function inspectFile(item) {
        const ext = extOf(item.file.name);
        if (ext === 'epub') {
            item.kind = 'epub';
            item.buffer = await item.file.arrayBuffer();
            const zip = await JSZip.loadAsync(item.buffer);
            const parser = new DOMParser();
            const container = parser.parseFromString(await zip.file('META-INF/container.xml').async('text'), 'application/xml');
            const opfPath = container.querySelector('rootfile')?.getAttribute('full-path');
            const opf = parser.parseFromString(await zip.file(opfPath).async('text'), 'application/xml');
            const title = opf.getElementsByTagName('dc:title')[0]?.textContent || opf.querySelector('title')?.textContent;
            const author = opf.getElementsByTagName('dc:creator')[0]?.textContent || opf.querySelector('creator')?.textContent;
            if (title) item.title = title.trim();
            if (author) item.author = author.trim();
            const dir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : '';
            const items = [...opf.querySelectorAll('item')];
            const coverId = opf.querySelector('meta[name="cover"]')?.getAttribute('content');
            const coverItem = items.find(i => /cover-image/.test(i.getAttribute('properties') || ''))
                || items.find(i => i.getAttribute('id') === coverId)
                || items.find(i => /cover/i.test(i.getAttribute('id') || i.getAttribute('href')) && /image/.test(i.getAttribute('media-type')));
            if (coverItem) {
                const f = zip.file(dir + coverItem.getAttribute('href')) || zip.file(decodeURIComponent(dir + coverItem.getAttribute('href')));
                if (f) item.coverImage = await downscaleImage(URL.createObjectURL(await f.async('blob')));
            }
        } else if (ext === 'pdf') {
            item.kind = 'pdf';
            item.buffer = await item.file.arrayBuffer();
            const doc = await pdfjsLib.getDocument({ data: new Uint8Array(item.buffer.slice(0)) }).promise;
            try {
                const meta = await doc.getMetadata();
                if (meta.info?.Title && meta.info.Title.trim().length > 2) item.title = meta.info.Title.trim();
                if (meta.info?.Author) item.author = meta.info.Author.trim();
            } catch (e) { /* no metadata */ }
            const page = await doc.getPage(1);
            const vp = page.getViewport({ scale: 1 });
            const scale = 300 / vp.width;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            item.coverImage = canvas.toDataURL('image/jpeg', 0.75);
            doc.destroy();
        } else if (ext === 'docx') {
            item.kind = 'text';
            const zip = await JSZip.loadAsync(await item.file.arrayBuffer());
            const xml = new DOMParser().parseFromString(await zip.file('word/document.xml').async('text'), 'application/xml');
            const paras = [...xml.getElementsByTagName('w:p')].map(p => [...p.getElementsByTagName('w:t')].map(t => t.textContent).join(''));
            item.text = paras.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
            const core = zip.file('docProps/core.xml');
            if (core) {
                const c = new DOMParser().parseFromString(await core.async('text'), 'application/xml');
                const t = c.getElementsByTagName('dc:title')[0]?.textContent;
                const a = c.getElementsByTagName('dc:creator')[0]?.textContent;
                if (t && t.trim()) item.title = t.trim();
                if (a && a.trim()) item.author = a.trim();
            }
        } else if (ext === 'html' || ext === 'htm') {
            item.kind = 'text';
            const doc = new DOMParser().parseFromString(await item.file.text(), 'text/html');
            doc.querySelectorAll('script, style, nav, noscript').forEach(n => n.remove());
            if (doc.title && doc.title.trim()) item.title = doc.title.trim();
            item.text = (doc.body?.innerText || doc.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
        } else {
            item.kind = 'text';
            item.text = (await item.file.text()).replace(/\r\n/g, '\n');
            if (ext === 'md') {
                const h = item.text.match(/^#\s+(.+)$/m);
                if (h) item.title = h[1].trim();
                item.text = item.text.replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`([^`]+)`/g, '$1');
            }
        }
        if (item.kind === 'text' && !(item.text || '').trim()) throw new Error('empty');
    }

    function downscaleImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const w = Math.min(240, img.naturalWidth || 240);
                const h = Math.round((img.naturalHeight || 360) * w / (img.naturalWidth || 240));
                const c = document.createElement('canvas');
                c.width = w;
                c.height = h;
                c.getContext('2d').drawImage(img, 0, 0, w, h);
                URL.revokeObjectURL(url);
                resolve(c.toDataURL('image/jpeg', 0.78));
            };
            img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
            img.src = url;
        });
    }

    function drawPreview() {
        const item = currentItem();
        const prev = $('lr-cover-preview');
        if (!item || !prev) return;
        const title = addState.mode === 'paste' ? ($('lr-paste-title').value || 'Untitled') : item.title;
        const author = addState.mode === 'paste' ? $('lr-paste-author').value : item.author;
        const [a, b] = COVER_GRADIENTS[item.gradient || 0];
        prev.innerHTML = coverArt(title, author, { coverImage: item.coverImage, coverColor: a, coverColor2: b, emoji: item.emoji }, 0);
    }

    function refreshAdd(fromTyping) {
        const list = $('lr-files');
        const isPaste = addState.mode === 'paste';
        if (!fromTyping || !isPaste) {
            list.innerHTML = addState.items.map((it, i) => `
                <div class="lr-file ${i === addState.current ? 'on' : ''}" data-pick="${i}">
                    <span class="lr-file-kind">${esc((it.kind || extOf(it.file.name)).toUpperCase())}</span>
                    <div class="lr-file-fields">
                        <input class="lr-input" data-field="title" data-i="${i}" value="${esc(it.title)}" placeholder="Title">
                        <input class="lr-input lr-small" data-field="author" data-i="${i}" value="${esc(it.author)}" placeholder="Author">
                        ${it.status ? `<small class="${it.failed ? 'lr-err' : ''}">${esc(it.status)}</small>` : ''}
                    </div>
                    <button type="button" class="lr-x" data-remove="${i}" aria-label="Remove">✕</button>
                </div>`).join('');
        }
        const item = currentItem();
        $('lr-cover-pick').hidden = !item || (!isPaste && !addState.items.length);
        drawPreview();
        const ready = isPaste
            ? $('lr-paste-title').value.trim() && $('lr-paste-text').value.trim()
            : addState.items.some(it => !it.failed && !it.status);
        const save = document.querySelector('#lr-add .lr-save');
        save.disabled = !ready;
        const n = addState.items.filter(it => !it.failed && !it.status).length;
        save.textContent = !isPaste && n > 1 ? `Add ${n} books` : 'Add to shelf';
    }

    function patchMeta(id, item) {
        const books = getCustomBooks();
        const meta = books.find(b => b.id === id);
        if (!meta) return;
        const [a, b] = COVER_GRADIENTS[item.gradient || 0];
        Object.assign(meta, {
            author: item.author || '',
            emoji: item.emoji || meta.emoji,
            coverColor: a,
            coverColor2: b,
            coverImage: item.coverImage || null
        });
        appStorage.setItem('customBooks', JSON.stringify(books));
    }

    async function saveAll() {
        const status = $('lr-add-status');
        const save = document.querySelector('#lr-add .lr-save');
        save.disabled = true;
        let added = 0;
        try {
            if (addState.mode === 'paste') {
                const title = $('lr-paste-title').value.trim();
                const text = $('lr-paste-text').value.trim();
                const book = saveCustomBook(title, text);
                patchMeta(book.id, { ...addState.paste, author: $('lr-paste-author').value.trim() });
                added = 1;
            } else {
                for (const item of addState.items) {
                    if (item.failed || item.status) continue;
                    status.textContent = `Adding “${item.title}”…`;
                    const title = (item.title || baseName(item.file.name)).trim();
                    const book = item.kind === 'epub' || item.kind === 'pdf'
                        ? await saveCustomBookBinary(title, item.kind, item.buffer)
                        : saveCustomBook(title, item.text);
                    patchMeta(book.id, item);
                    added++;
                }
            }
        } catch (err) {
            status.textContent = 'Storage is full — try a smaller file.';
            save.disabled = false;
            return;
        }
        status.textContent = '';
        closeAddSheet();
        window.renderMyBooks();
        if (typeof showNotification === 'function') showNotification(added > 1 ? `📚 ${added} books added to your shelf` : '📚 Added to your shelf');
    }

    // ==================== SHOW / HIDE WITH THE PAGE ====================
    function init() {
        const page = $('library-page');
        if (!page) return;
        buildRoom();
        buildAddSheet();

        // Hero + sound button
        page.querySelector('.lib-top-nav')?.insertAdjacentHTML('afterend', '<div class="lr-hero" id="lr-hero"></div>');
        const nav = page.querySelector('.lib-top-nav > div');
        nav?.insertAdjacentHTML('afterbegin', `<button id="lr-sound-btn" class="lib-nav-icon-btn" title="Room sounds">${MODE_LABEL[ambient.mode]}</button>`);
        $('lr-sound-btn')?.addEventListener('click', cycleAmbient);
        document.getElementById('my-books-section')?.insertAdjacentHTML('beforeend', '<p class="lr-hint" id="lr-mybooks-hint" hidden>Long-press a book to remove it.</p>');
        document.querySelector('#reading-history-section h3')?.replaceChildren('Continue reading');
        document.querySelector('#finished-books-section h3')?.replaceChildren('Finished');
        const discover = document.querySelector('#library-recommendations h3');
        if (discover) discover.innerHTML = 'Discover <span class="lr-h-sub">70,000+ free classics</span>';

        const sync = () => {
            const open = page.classList.contains('active');
            document.body.classList.toggle('lr-on', open);
            if (open) {
                applyTime();
                updateHero();
                if (ambient.mode !== 'off' && !document.hidden) startAmbient();
            } else {
                stopAmbient();
            }
        };
        new MutationObserver(sync).observe(page, { attributes: true, attributeFilter: ['class'] });
        // Pause room sounds while reading a book or when the app is hidden
        const reader = $('reader-modal');
        const pauseForReader = () => {
            if (!page.classList.contains('active')) return;
            if (document.hidden || (reader && !reader.classList.contains('hidden'))) stopAmbient();
            else if (ambient.mode !== 'off') startAmbient();
        };
        if (reader) new MutationObserver(pauseForReader).observe(reader, { attributes: true, attributeFilter: ['class'] });
        document.addEventListener('visibilitychange', pauseForReader);
        setInterval(applyTime, 300000);
        sync();
        window.renderReadingHistory();
        window.renderFinishedBooks();
        window.renderMyBooks();
        window.renderRecommendations();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
