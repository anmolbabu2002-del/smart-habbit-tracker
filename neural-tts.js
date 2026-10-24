// neural-tts.js — Microsoft neural voices for the e-reader
// Plays real audio (not the browser speech engine), so reading keeps going with the screen
// off or the app in the background, with lock-screen controls. Pages are prefetched so the
// next one starts without a gap. Voices come from the official Azure AI Speech service
// (netlify/functions/neural-tts.js); without a key the reader falls back to device voices.

(function () {
    const ENDPOINT = '/.netlify/functions/neural-tts';

    // Curated Azure neural voices (id, label, lang)
    const VOICES = [
        ['en-US-AvaMultilingualNeural', 'Ava — warm storyteller (US)'],
        ['en-US-AndrewMultilingualNeural', 'Andrew — calm, natural (US)'],
        ['en-US-EmmaMultilingualNeural', 'Emma — bright, friendly (US)'],
        ['en-US-BrianMultilingualNeural', 'Brian — relaxed narrator (US)'],
        ['en-US-AriaNeural', 'Aria — clear, expressive (US)'],
        ['en-US-JennyNeural', 'Jenny — soft, gentle (US)'],
        ['en-US-GuyNeural', 'Guy — steady (US)'],
        ['en-GB-SoniaNeural', 'Sonia — British'],
        ['en-GB-RyanNeural', 'Ryan — British'],
        ['en-AU-NatashaNeural', 'Natasha — Australian'],
        ['en-IN-NeerjaNeural', 'Neerja — Indian English'],
        ['en-IN-PrabhatNeural', 'Prabhat — Indian English'],
        ['hi-IN-SwaraNeural', 'Swara — Hindi'],
        ['hi-IN-MadhurNeural', 'Madhur — Hindi'],
        ['ne-NP-HemkalaNeural', 'Hemkala — Nepali'],
        ['ne-NP-SagarNeural', 'Sagar — Nepali'],
        ['bn-IN-TanishaaNeural', 'Tanishaa — Bengali'],
        ['ta-IN-PallaviNeural', 'Pallavi — Tamil'],
        ['te-IN-ShrutiNeural', 'Shruti — Telugu'],
        ['mr-IN-AarohiNeural', 'Aarohi — Marathi'],
        ['gu-IN-DhwaniNeural', 'Dhwani — Gujarati'],
        ['kn-IN-SapnaNeural', 'Sapna — Kannada'],
        ['ml-IN-SobhanaNeural', 'Sobhana — Malayalam'],
        ['ur-PK-UzmaNeural', 'Uzma — Urdu'],
        ['es-ES-ElviraNeural', 'Elvira — Spanish'],
        ['fr-FR-DeniseNeural', 'Denise — French'],
        ['de-DE-KatjaNeural', 'Katja — German'],
        ['it-IT-ElsaNeural', 'Elsa — Italian'],
        ['pt-BR-FranciscaNeural', 'Francisca — Portuguese'],
        ['ru-RU-SvetlanaNeural', 'Svetlana — Russian'],
        ['ja-JP-NanamiNeural', 'Nanami — Japanese'],
        ['ko-KR-SunHiNeural', 'Sun-Hi — Korean'],
        ['zh-CN-XiaoxiaoNeural', 'Xiaoxiao — Chinese'],
        ['ar-SA-ZariyahNeural', 'Zariyah — Arabic'],
        ['tr-TR-EmelNeural', 'Emel — Turkish'],
        ['th-TH-PremwadeeNeural', 'Premwadee — Thai']
    ].map(([id, label]) => ({ id, label, lang: id.split('-').slice(0, 2).join('-') }));

    // Translation target -> voice language
    const TRANSLATION_LANG = {
        hinglish: 'en-IN', hi: 'hi-IN', ne: 'ne-NP', bn: 'bn-IN', ta: 'ta-IN', te: 'te-IN', mr: 'mr-IN',
        gu: 'gu-IN', kn: 'kn-IN', ml: 'ml-IN', ur: 'ur-PK', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
        it: 'it-IT', pt: 'pt-BR', ru: 'ru-RU', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', ar: 'ar-SA',
        tr: 'tr-TR', th: 'th-TH'
    };

    const BLOCK = 'p,div,h1,h2,h3,h4,h5,h6,li,blockquote,pre,section,article,td,th,dt,dd,figcaption';
    const FIRST_SEGMENT = 260;  // short first piece so speech starts quickly
    const SEGMENT = 1100;

    const audio = new Audio();
    audio.preload = 'auto';

    const st = {
        active: false,
        paused: false,
        voiceId: null,
        speed: 1,
        pageIdx: -1,
        text: '',
        map: [],
        segments: [],
        segIdx: 0,
        weights: null,
        raf: 0,
        turning: false,
        available: null,   // null = unknown, true/false after the server check
        token: 0           // bumps on every start/stop so stale async work is ignored
    };
    const cache = new Map(); // `${voice}|${text}` -> Promise<objectURL>

    // ── availability check (does the server have an Azure key?) ──
    function checkAvailable() {
        if (st.available !== null) return Promise.resolve(st.available);
        return fetch(ENDPOINT, { method: 'GET' })
            .then(r => r.json())
            .then(d => (st.available = !!d.configured))
            .catch(() => (st.available = false));
    }

    // ── text <-> DOM mapping ──
    // Builds the text to speak with whitespace collapsed, plus a map from each character
    // back to its DOM text node, so word highlights land on the right spot.
    function buildSpeech(root, eachSpanIsUnit) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let text = '';
        const map = [];
        let lastUnit = null;
        const space = (ref) => { if (text && text[text.length - 1] !== ' ') { text += ' '; map.push(ref); } };
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const parent = node.parentElement;
            if (!parent || parent.closest('script,style')) continue;
            const unit = eachSpanIsUnit ? parent : (parent.closest(BLOCK) || root);
            if ((lastUnit && unit !== lastUnit) || (node.previousSibling && node.previousSibling.nodeName === 'BR')) space(null);
            lastUnit = unit;
            const s = node.nodeValue;
            for (let i = 0; i < s.length; i++) {
                if (/\s/.test(s[i])) space({ node, i });
                else { text += s[i]; map.push({ node, i }); }
            }
        }
        while (text.endsWith(' ')) { text = text.slice(0, -1); map.pop(); }
        if (text.startsWith(' ')) { text = text.slice(1); map.shift(); }
        return { text, map };
    }

    function pageRoot() {
        const el = document.getElementById('reader-text');
        if (!el) return null;
        const translated = el.querySelector('.pdf-translate-replacement');
        if (translated) return { root: translated, spans: false };
        const pdfLayer = el.querySelector('.pdf-text-layer');
        if (pdfLayer) return { root: pdfLayer, spans: true };
        return { root: el, spans: false };
    }

    // Same text as buildSpeech would produce once the page is shown, without rendering it
    async function textForPage(index) {
        if (typeof bookPages === 'undefined' || index < 0 || index >= bookPages.length) return '';
        if (typeof activeTranslationLang !== 'undefined' && activeTranslationLang) return ''; // unknown until translated
        const div = document.createElement('div');
        if (bookType === 'pdf') {
            if (!pdfDoc) return '';
            const page = await pdfDoc.getPage(index + 1);
            const content = await page.getTextContent();
            for (const item of content.items) {
                if (!item.str) continue;
                const span = document.createElement('span');
                span.textContent = item.str;
                div.appendChild(span);
            }
            return buildSpeech(div, true).text;
        }
        if (bookType === 'epub') div.innerHTML = bookPages[index];
        else div.textContent = bookPages[index];
        return buildSpeech(div, false).text;
    }

    function splitSegments(text, from) {
        const segs = [];
        let pos = from;
        let limit = FIRST_SEGMENT;
        while (pos < text.length) {
            let end = Math.min(text.length, pos + limit);
            if (end < text.length) {
                const slice = text.slice(pos, end);
                const sentenceEnd = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '),
                    slice.lastIndexOf('। '), slice.lastIndexOf('。'));
                const cut = sentenceEnd > limit * 0.4 ? sentenceEnd + 1 : slice.lastIndexOf(' ');
                if (cut > 0) end = pos + cut;
            }
            const raw = text.slice(pos, end);
            const lead = raw.length - raw.trimStart().length;
            const segText = raw.trim();
            if (segText) segs.push({ start: pos + lead, end: pos + lead + segText.length, text: segText });
            pos = end;
            limit = SEGMENT;
        }
        return segs;
    }

    // ── fetching audio ──
    function fetchAudio(text, voice) {
        const key = voice + '|' + text;
        if (cache.has(key)) return cache.get(key);
        const p = (async () => {
            let lastErr;
            for (let attempt = 0; attempt < 2; attempt++) {
                try {
                    const res = await fetch(ENDPOINT, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text, voice })
                    });
                    if (!res.ok) {
                        let msg = '';
                        try { msg = (await res.json()).error || ''; } catch (e) { /* not JSON */ }
                        const err = new Error(msg || `HTTP ${res.status}`);
                        err.status = res.status;
                        throw err;
                    }
                    return URL.createObjectURL(await res.blob());
                } catch (err) {
                    lastErr = err;
                    if (err.status && err.status !== 502) break; // only retry flaky upstream errors
                    await new Promise(r => setTimeout(r, 600));
                }
            }
            cache.delete(key);
            throw lastErr;
        })();
        cache.set(key, p);
        // Keep memory bounded
        if (cache.size > 40) {
            const oldest = cache.keys().next().value;
            const old = cache.get(oldest);
            cache.delete(oldest);
            old.then(url => URL.revokeObjectURL(url)).catch(() => {});
        }
        return p;
    }

    // ── word highlighting (CSS Custom Highlight API: no DOM changes) ──
    const canHighlight = typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight !== 'undefined';

    function rangeFor(start, end) {
        let a = start, b = end - 1;
        while (a <= b && !st.map[a]) a++;
        while (b >= a && !st.map[b]) b--;
        if (a > b) return null;
        const s = st.map[a], e = st.map[b];
        if (!s.node.isConnected || !e.node.isConnected) return null;
        try {
            const r = document.createRange();
            r.setStart(s.node, s.i);
            r.setEnd(e.node, e.i + 1);
            return r;
        } catch (err) { return null; }
    }

    function clearHighlights() {
        if (!canHighlight) return;
        CSS.highlights.delete('tts-word');
        CSS.highlights.delete('tts-sentence');
    }

    // Character weights so the estimated position pauses at punctuation like real speech
    function weightsFor(seg) {
        const w = new Float32Array(seg.text.length + 1);
        let total = 0;
        for (let i = 0; i < seg.text.length; i++) {
            const c = seg.text[i];
            total += /[.!?।。]/.test(c) ? 9 : /[,;:—–]/.test(c) ? 4 : 1;
            w[i + 1] = total;
        }
        return w;
    }

    let lastWordStart = -1;
    function highlightTick() {
        st.raf = 0;
        if (!st.active || st.paused) return;
        const seg = st.segments[st.segIdx];
        if (seg && canHighlight && !document.hidden && audio.duration > 0) {
            const w = st.weights;
            const target = Math.min(1, audio.currentTime / audio.duration) * w[w.length - 1];
            let lo = 0, hi = w.length - 1;
            while (lo < hi) { const mid = (lo + hi) >> 1; if (w[mid] < target) lo = mid + 1; else hi = mid; }
            let a = Math.min(lo, seg.text.length - 1);
            while (a > 0 && seg.text[a - 1] !== ' ') a--;
            if (a !== lastWordStart) {
                lastWordStart = a;
                let b = a;
                while (b < seg.text.length && seg.text[b] !== ' ') b++;
                const range = rangeFor(seg.start + a, seg.start + b);
                if (range) {
                    CSS.highlights.set('tts-word', new Highlight(range));
                    keepInView(range);
                }
            }
        }
        st.raf = requestAnimationFrame(highlightTick);
    }

    function keepInView(range) {
        const box = document.getElementById('reader-text');
        if (!box || box.scrollHeight <= box.clientHeight + 4) return;
        const r = range.getBoundingClientRect();
        const b = box.getBoundingClientRect();
        if (r.bottom > b.bottom - 60 || r.top < b.top + 40) {
            box.scrollTo({ top: box.scrollTop + (r.top - b.top) - b.height / 3, behavior: 'smooth' });
        }
    }

    function showSentence(seg) {
        if (!canHighlight) return;
        const range = rangeFor(seg.start, seg.end);
        if (range) CSS.highlights.set('tts-sentence', new Highlight(range));
        else CSS.highlights.delete('tts-sentence');
        lastWordStart = -1;
    }

    // ── playback ──
    function syncState() {
        if (typeof ttsState !== 'undefined') {
            ttsState.isPlaying = st.active;
            ttsState.isPaused = st.active && st.paused;
        }
        if (typeof updateTTSButton === 'function') updateTTSButton();
        document.dispatchEvent(new CustomEvent('ttsstatechange', { detail: { engine: 'neural', active: st.active, paused: st.paused } }));
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = !st.active ? 'none' : st.paused ? 'paused' : 'playing';
    }

    function pickVoice() {
        let id = st.voiceId || VOICES[0].id;
        const lang = typeof activeTranslationLang !== 'undefined' && activeTranslationLang ? TRANSLATION_LANG[activeTranslationLang] : null;
        if (lang && !id.startsWith(lang)) {
            const multilingualOk = /Multilingual/.test(id) && !/-IN$|-NP$|-PK$/.test(lang);
            if (!multilingualOk) {
                const match = VOICES.find(v => v.lang === lang) || VOICES.find(v => v.lang.slice(0, 2) === lang.slice(0, 2));
                if (match) id = match.id;
            }
        }
        return id;
    }

    async function start(fromChar) {
        const token = ++st.token;
        st.active = true;
        st.paused = false;
        st.turning = false;
        cancelAnimationFrame(st.raf);
        st.raf = 0;
        clearHighlights();
        syncState();

        const page = pageRoot();
        if (!page) return stop();
        const built = buildSpeech(page.root, page.spans);
        st.text = built.text;
        st.map = built.map;
        st.pageIdx = typeof bookPageIndex !== 'undefined' ? bookPageIndex : 0;

        if (st.text.length < 2) return pageFinished(token);

        let from = 0;
        if (fromChar > 0) {
            // Back up to the start of the word so speech begins cleanly
            from = Math.min(fromChar, st.text.length - 1);
            while (from > 0 && st.text[from - 1] !== ' ') from--;
        }
        st.segments = splitSegments(st.text, from);
        st.segIdx = 0;
        setupMediaSession();

        const voice = pickVoice();
        st.segments.slice(0, 2).forEach(s => fetchAudio(s.text, voice).catch(() => {}));
        playSegment(token, voice);
    }

    async function playSegment(token, voice) {
        if (token !== st.token) return;
        const seg = st.segments[st.segIdx];
        if (!seg) return pageFinished(token);

        // Prefetch the following segment, and the next page while on the last one
        const next = st.segments[st.segIdx + 1];
        if (next) fetchAudio(next.text, voice).catch(() => {});
        else prefetchNextPage(voice);

        let url;
        try {
            url = await fetchAudio(seg.text, voice);
        } catch (err) {
            if (token !== st.token) return;
            return failOver(err);
        }
        if (token !== st.token) return;

        st.weights = weightsFor(seg);
        showSentence(seg);
        audio.src = url;
        audio.playbackRate = st.speed;
        audio.defaultPlaybackRate = st.speed;
        audio.onended = () => {
            if (token !== st.token) return;
            st.segIdx++;
            playSegment(token, voice);
        };
        try {
            await audio.play();
            if (token !== st.token) { audio.pause(); return; }
            if (st.paused) audio.pause();
            if (!st.raf) st.raf = requestAnimationFrame(highlightTick);
        } catch (err) {
            if (token !== st.token) return;
            // Autoplay blocked (e.g. resumed from background without a tap): wait for the user
            st.paused = true;
            syncState();
        }
    }

    async function prefetchNextPage(voice) {
        const idx = st.pageIdx + 1;
        try {
            const text = await textForPage(idx);
            if (text) splitSegments(text, 0).slice(0, 2).forEach(s => fetchAudio(s.text, voice).catch(() => {}));
        } catch (e) { /* prefetch is best effort */ }
    }

    function pageFinished(token) {
        if (token !== st.token) return;
        clearHighlights();
        const autoTurn = typeof ttsState === 'undefined' || ttsState.autoTurn;
        const last = typeof bookPages === 'undefined' || st.pageIdx >= bookPages.length - 1;
        if (!autoTurn || last) {
            stop();
            if (last && typeof showNotification === 'function') showNotification('📖 You reached the end of the book.');
            return;
        }
        st.turning = true;
        const tryTurn = (tries) => {
            if (token !== st.token) return;
            if (typeof isAnimating !== 'undefined' && isAnimating && tries < 20) return setTimeout(() => tryTurn(tries + 1), 150);
            goNextPage(); // the 'readerpageshown' event continues reading
        };
        tryTurn(0);
    }

    function failOver(err) {
        stop();
        const notConfigured = err && err.message === 'not-configured';
        if (notConfigured) st.available = false;
        const msg = notConfigured
            ? '🎙️ Microsoft voices need a free Azure key — using your device voice for now.'
            : err && err.status === 429
                ? '🎙️ Microsoft voice limit reached — using your device voice for now.'
                : '🎙️ Couldn\'t reach Microsoft voices — using your device voice.';
        if (typeof showNotification === 'function') showNotification(msg);
        // Switch the selector to the best device voice and keep reading
        if (typeof ttsState !== 'undefined') {
            const device = ttsState.voices.find(v => !v.isNeural && !v.isCloud) || ttsState.voices.find(v => v.isCloud);
            if (device) {
                ttsState.selectedVoice = device;
                const select = document.getElementById('tts-voice-select');
                if (select) select.value = String(ttsState.voices.indexOf(device));
                if (typeof playTTS === 'function') setTimeout(playTTS, 200);
            }
        }
    }

    function pause() {
        if (!st.active || st.paused) return;
        st.paused = true;
        audio.pause();
        cancelAnimationFrame(st.raf);
        st.raf = 0;
        syncState();
    }

    function resume() {
        if (!st.active) return start(0);
        if (!st.paused) return;
        // The page may have changed while paused (manual turn): read the page on screen
        if (typeof bookPageIndex !== 'undefined' && bookPageIndex !== st.pageIdx) return start(0);
        st.paused = false;
        syncState();
        if (audio.src && !audio.ended) {
            audio.play().then(() => { if (!st.raf) st.raf = requestAnimationFrame(highlightTick); }).catch(() => {});
        } else {
            playSegment(st.token, pickVoice());
        }
    }

    function stop() {
        st.token++;
        st.active = false;
        st.paused = false;
        st.turning = false;
        audio.pause();
        cancelAnimationFrame(st.raf);
        st.raf = 0;
        clearHighlights();
        syncState();
    }

    function setupMediaSession() {
        if (!('mediaSession' in navigator)) return;
        try {
            const cover = typeof currentBookCover !== 'undefined' && /^https?:|^data:/.test(currentBookCover) ? currentBookCover : 'icon-512-v2.png';
            navigator.mediaSession.metadata = new MediaMetadata({
                title: typeof currentBookTitle !== 'undefined' && currentBookTitle ? currentBookTitle : 'Book',
                artist: typeof bookPages !== 'undefined' ? `Page ${st.pageIdx + 1} of ${bookPages.length}` : 'Ultradian',
                album: 'Ultradian Library',
                artwork: [{ src: cover, sizes: '512x512' }]
            });
            const ms = navigator.mediaSession;
            ms.setActionHandler('play', resume);
            ms.setActionHandler('pause', pause);
            ms.setActionHandler('stop', stop);
            ms.setActionHandler('nexttrack', () => { st.turning = true; goNextPage(); });
            ms.setActionHandler('previoustrack', () => {
                if (audio.currentTime > 4 && st.segIdx === 0) { audio.currentTime = 0; return; }
                st.turning = true;
                goPrevPage();
            });
            ms.setActionHandler('seekbackward', () => { audio.currentTime = Math.max(0, audio.currentTime - 10); });
            ms.setActionHandler('seekforward', () => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10); });
        } catch (e) { /* not supported */ }
    }

    // A page was shown (turned by us, by the user, or re-rendered): keep reading on it
    document.addEventListener('readerpageshown', () => {
        if (!st.active) return;
        if (st.paused) { st.turning = false; return; } // paused mid-turn: resume() reads the new page
        const changed = typeof bookPageIndex !== 'undefined' && bookPageIndex !== st.pageIdx;
        if (st.turning || (changed && !st.paused)) start(0);
        else if (changed) st.turning = false;
    });

    // Closing the reader stops listening
    document.getElementById('reader-close-btn')?.addEventListener('click', stop);

    window.NEURAL_VOICES = VOICES;
    window.NeuralTTS = {
        voices: VOICES,
        checkAvailable,
        get available() { return st.available; },
        isActive: () => st.active,
        isPaused: () => st.paused,
        start: (fromChar) => checkAvailable().then(ok => {
            if (!ok) return failOver(new Error('not-configured'));
            start(fromChar || 0);
        }),
        restartPage: () => { if (st.active) start(0); },
        // Start reading at a selected passage
        startFromRange: (range) => checkAvailable().then(ok => {
            if (!ok) return failOver(new Error('not-configured'));
            const page = pageRoot();
            if (!page) return;
            const { map } = buildSpeech(page.root, page.spans);
            let idx = map.findIndex(m => m && m.node === range.startContainer && m.i >= range.startOffset);
            if (idx < 0) idx = map.findIndex(m => m && range.intersectsNode(m.node));
            start(Math.max(0, idx));
        }),
        toggle: () => (st.active && !st.paused ? pause() : resume()),
        pause,
        resume,
        stop,
        setVoice: (id) => { st.voiceId = id; },
        setSpeed: (s) => { st.speed = s; audio.playbackRate = s; audio.defaultPlaybackRate = s; },
        // For the sleep timer: fade out gently, then pause
        fadeOutAndPause: () => new Promise(resolve => {
            const startVol = audio.volume;
            let v = startVol;
            const iv = setInterval(() => {
                v -= startVol / 20;
                if (v <= 0.02) { clearInterval(iv); pause(); audio.volume = startVol; resolve(); }
                else audio.volume = v;
            }, 150);
        })
    };
})();
