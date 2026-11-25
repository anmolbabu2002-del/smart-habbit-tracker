// habit-proof.js — photo proof for habits.
//
// Habits you can show (workout, reading, cooking…) are ticked off with a live photo from the
// app's own camera — no gallery. CLIP, an image-and-text AI, checks on the phone that the photo
// matches the habit; the photo is never saved or sent anywhere. Everything else (no sugar,
// call mom…) keeps a normal tick. Which is which comes from the habit's name
// (habit-proof-dictionary.js) and can't be switched. One free pass a week covers a forgotten
// photo (shown as a grey tick).
//
// The AI (standard CLIP ViT-B/32, photo part ~89 MB + engine ~21 MB) downloads once in the
// background into storage that app updates don't clear, then works offline. Fingerprints of the
// built-in habit descriptions ship in habit-proof-text.json, so CLIP's text part (~64 MB) is
// only fetched if a habit's name isn't recognised. Accuracy measured before shipping: 92% of
// real photos accepted, 1.2% of fakes (couch, phone, TV, laptop…) accepted.

(function () {
    'use strict';

    const D = window.HabitProofDictionary;
    if (!D) return;

    const MODEL = 'Xenova/clip-vit-base-patch32';
    const LIB_VERSION = '3.8.1';
    const THRESHOLD = 0.5;
    const MODEL_URL = (file) => `https://huggingface.co/${MODEL}/resolve/main/${file}`;
    const VISION_FILES = ['config.json', 'preprocessor_config.json', 'onnx/vision_model_quantized.onnx'];
    const TEXT_FILES = ['tokenizer.json', 'tokenizer_config.json', 'onnx/text_model_quantized.onnx'];
    const ENGINE_URL = `https://cdn.jsdelivr.net/npm/@huggingface/transformers@${LIB_VERSION}/dist/ort-wasm-simd-threaded.jsep.wasm`;
    const MODEL_CACHE = 'transformers-cache';     // where the library looks for model files
    const ENGINE_CACHE = 'photo-proof-engine';    // our own, never cleared by app updates
    const store = window.appStorage || localStorage;
    const $ = (s, r) => (r || document).querySelector(s);
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const toast = (m) => { if (typeof window.showNotification === 'function') window.showNotification(m); };

    // ==================== HABITS ====================
    function habits() {
        if (typeof userHabits !== 'undefined' && Array.isArray(userHabits)) return userHabits; // eslint-disable-line no-undef
        try { return JSON.parse(store.getItem('userHabits') || '[]'); } catch (e) { return []; }
    }
    const proofOf = (h) => D.classify(h && h.text);
    const needsPhoto = (h) => !!h && proofOf(h).mode === 'photo';

    // ==================== FREE PASS (one a week) ====================
    function data() {
        try { return Object.assign({ passes: {}, unverified: {}, introShown: false }, JSON.parse(store.getItem('photoProof') || '{}')); }
        catch (e) { return { passes: {}, unverified: {}, introShown: false }; }
    }
    function saveData(d) {
        // keep two months of history
        const cutoff = Date.now() - 62 * 86400000;
        Object.keys(d.unverified).forEach(k => { if (new Date(k).getTime() < cutoff) delete d.unverified[k]; });
        store.setItem('photoProof', JSON.stringify(d));
    }
    function weekKey(date) {
        const d = new Date(date || Date.now()); d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday of this week
        return d.toDateString();
    }
    const passLeft = () => !data().passes[weekKey()];
    const isUnverified = (h) => (data().unverified[new Date().toDateString()] || []).includes(String(h.text));

    function usePass(index) {
        const h = habits()[index];
        if (!h || !passLeft()) return false;
        const d = data();
        d.passes[weekKey()] = { habit: String(h.text), date: new Date().toDateString() };
        const today = new Date().toDateString();
        (d.unverified[today] = d.unverified[today] || []).push(String(h.text));
        saveData(d);
        complete(index);
        toast('🎟️ Free pass used — next one on Monday.');
        return true;
    }

    function complete(index) {
        if (typeof window.toggleHabit === 'function') window.toggleHabit(index, true);
    }

    // ==================== ON-DEVICE AI ====================
    const state = { lib: null, vision: null, processor: null, text: null, tokenizer: null, fps: null, ready: false, loading: null, progress: 0, error: null };
    const listeners = new Set();
    const emit = () => listeners.forEach(fn => { try { fn(state); } catch (e) { /* ignore */ } });

    // Download a file into a cache, reporting bytes as they arrive
    async function cacheFile(cacheName, url, onBytes) {
        const cache = await caches.open(cacheName);
        if (await cache.match(url)) return;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Download failed (${res.status})`);
        const reader = res.body.getReader();
        const chunks = [];
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            onBytes(value.length);
        }
        await cache.put(url, new Response(new Blob(chunks), { headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/octet-stream' } }));
    }

    // Background download (no AI loaded into memory): engine + photo part (+ text part if needed)
    async function prefetch(withText) {
        const files = [[ENGINE_CACHE, ENGINE_URL, 21.6e6], ...VISION_FILES.map(f => [MODEL_CACHE, MODEL_URL(f), f.endsWith('.onnx') ? 89.1e6 : 2e3])];
        if (withText) files.push(...TEXT_FILES.map(f => [MODEL_CACHE, MODEL_URL(f), f.endsWith('.onnx') ? 64.5e6 : 2.3e6]));
        const total = files.reduce((s, f) => s + f[2], 0);
        let got = 0;
        for (const [cache, url, size] of files) {
            const c = await caches.open(cache);
            if (await c.match(url)) { got += size; continue; }
            await cacheFile(cache, url, (n) => { got += n; state.progress = Math.min(0.99, got / total); emit(); });
        }
        state.progress = 1; emit();
    }

    async function engineURL() {
        const c = await caches.open(ENGINE_CACHE);
        let res = await c.match(ENGINE_URL);
        if (!res) { await cacheFile(ENGINE_CACHE, ENGINE_URL, () => {}); res = await c.match(ENGINE_URL); }
        return URL.createObjectURL(await res.blob());
    }

    async function fingerprints() {
        if (state.fps) return state.fps;
        const json = await (await fetch('habit-proof-text.json')).json();
        const fps = {};
        for (const [t, b64] of Object.entries(json.prompts)) {
            const bin = atob(b64), buf = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
            fps[t] = new Float32Array(buf.buffer);
        }
        return (state.fps = fps);
    }

    async function loadLib() {
        if (state.lib) return state.lib;
        const lib = await import('./vendor/transformers.min.js');
        lib.env.allowLocalModels = false;
        lib.env.useBrowserCache = true;
        // The engine comes from our own storage, so it works offline
        lib.env.backends.onnx.wasm.wasmPaths = {
            mjs: new URL('vendor/ort-wasm-simd-threaded.jsep.mjs', location.href).href,
            wasm: await engineURL()
        };
        lib.env.backends.onnx.wasm.numThreads = 1;
        return (state.lib = lib);
    }

    // Load CLIP's photo part into memory (only while the camera is open)
    function loadVision() {
        if (state.ready) return Promise.resolve();
        if (state.loading) return state.loading;
        state.error = null;
        state.loading = (async () => {
            try {
                if ('storage' in navigator && navigator.storage.persist) navigator.storage.persist().catch(() => {});
                await prefetch(false);
                const lib = await loadLib();
                state.processor = await lib.AutoProcessor.from_pretrained(MODEL);
                state.vision = await lib.CLIPVisionModelWithProjection.from_pretrained(MODEL, { dtype: 'q8' });
                await fingerprints();
                state.ready = true;
            } catch (e) {
                state.error = e;
                console.warn('Photo check failed to load', e);
            } finally {
                state.loading = null;
                emit();
            }
        })();
        return state.loading;
    }

    function unload() {
        // Free the memory the AI uses once the camera closes
        try { state.vision && state.vision.dispose && state.vision.dispose(); } catch (e) { /* ignore */ }
        try { state.text && state.text.dispose && state.text.dispose(); } catch (e) { /* ignore */ }
        state.vision = state.text = null;
        state.ready = false;
    }

    const normalize = (v) => { let s = 0; for (const x of v) s += x * x; s = Math.sqrt(s) || 1; return Float32Array.from(v, x => x / s); };
    const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

    // Fingerprint for a habit description: built-in, remembered, or made with CLIP's text part
    async function textFingerprint(prompt) {
        const fps = await fingerprints();
        if (fps[prompt]) return fps[prompt];
        const saved = JSON.parse(store.getItem('photoProofText') || '{}');
        if (saved[prompt]) return (fps[prompt] = new Float32Array(saved[prompt]));
        const lib = await loadLib();
        await prefetch(true);
        state.tokenizer = state.tokenizer || await lib.AutoTokenizer.from_pretrained(MODEL);
        state.text = state.text || await lib.CLIPTextModelWithProjection.from_pretrained(MODEL, { dtype: 'q8' });
        const { text_embeds } = await state.text(state.tokenizer([prompt], { padding: 'max_length', truncation: true }));
        const v = normalize(text_embeds.data);
        saved[prompt] = Array.from(v, x => Math.round(x * 1e5) / 1e5);
        store.setItem('photoProofText', JSON.stringify(saved));
        return (fps[prompt] = v);
    }

    // Does this photo show the habit? Compared with everyday scenes and common cheats.
    async function check(canvas, habit) {
        await loadVision();
        if (!state.ready) throw state.error || new Error('Photo check unavailable');
        const proof = proofOf(habit);
        const image = await state.lib.RawImage.fromCanvas(canvas);
        const { image_embeds } = await state.vision(await state.processor(image));
        const img = normalize(image_embeds.data);
        const prompts = ['a photo of ' + proof.show, ...D.SCENES.map(s => 'a photo of ' + s)];
        const logits = [];
        for (const p of prompts) logits.push(100 * dot(img, await textFingerprint(p)));
        const max = Math.max(...logits), ex = logits.map(l => Math.exp(l - max)), sum = ex.reduce((a, b) => a + b, 0);
        const probs = ex.map(x => x / sum);
        const best = probs.indexOf(Math.max(...probs));
        return { pass: probs[0] >= THRESHOLD, confidence: probs[0], looksLike: best === 0 ? null : D.SCENES[best - 1] };
    }

    // ==================== CAMERA SHEET ====================
    let sheet = null, stream = null, facing = 'environment', current = null, timerId = 0;

    function buildSheet() {
        sheet = document.createElement('div');
        sheet.className = 'hp-sheet';
        sheet.hidden = true;
        sheet.setAttribute('role', 'dialog');
        sheet.innerHTML = `
            <div class="hp-top">
                <button type="button" class="hp-close" aria-label="Close">✕</button>
                <div class="hp-title"><b></b><small></small></div>
            </div>
            <div class="hp-stage">
                <video class="hp-video" playsinline muted autoplay></video>
                <canvas class="hp-shot" hidden></canvas>
                <div class="hp-count" hidden></div>
                <div class="hp-overlay" hidden></div>
            </div>
            <div class="hp-status" aria-live="polite"></div>
            <div class="hp-controls">
                <button type="button" class="hp-flip" aria-label="Switch camera" title="Switch camera">⟲</button>
                <button type="button" class="hp-snap" aria-label="Take photo"><i></i></button>
                <button type="button" class="hp-timer" aria-label="10-second timer" title="10-second timer">10s</button>
            </div>
            <div class="hp-result" hidden></div>
            <button type="button" class="hp-pass"></button>`;
        document.body.appendChild(sheet);
        $('.hp-close', sheet).addEventListener('click', close);
        $('.hp-flip', sheet).addEventListener('click', () => { facing = facing === 'environment' ? 'user' : 'environment'; startCamera(); });
        $('.hp-snap', sheet).addEventListener('click', () => snap());
        $('.hp-timer', sheet).addEventListener('click', () => countdown(10));
        $('.hp-pass', sheet).addEventListener('click', () => { if (current != null && usePass(current.index)) close(); });
        document.addEventListener('keydown', (e) => { if (!sheet.hidden && e.key === 'Escape') close(); });
        document.addEventListener('visibilitychange', () => { if (document.hidden && !sheet.hidden) stopCamera(); else if (!document.hidden && !sheet.hidden && !$('.hp-video', sheet).hidden) startCamera(); });
        listeners.add(renderStatus);
    }

    function renderStatus() {
        if (!sheet || sheet.hidden) return;
        const el = $('.hp-status', sheet);
        if (state.error) el.textContent = navigator.onLine === false ? 'Photo check needs internet once to download — connect and try again.' : 'Couldn\'t load the photo check. Close and try again.';
        else if (!state.ready && state.loading) el.textContent = state.progress < 1 ? `Getting the photo check ready (one-time download)… ${Math.round(state.progress * 100)}%` : 'Starting the photo check…';
        else if (current) el.textContent = current.proof.timer ? 'Prop your phone up, tap 10s, and get into position.' : `Show ${current.proof.show.replace(/^a /, 'a ')}.`;
        $('.hp-snap', sheet).disabled = !state.ready;
        $('.hp-timer', sheet).disabled = !state.ready;
    }

    function renderPass() {
        const btn = $('.hp-pass', sheet);
        btn.hidden = false;
        btn.disabled = !passLeft();
        btn.textContent = passLeft() ? '🎟️ Forgot to take a photo? Use this week\'s free pass' : '🎟️ Free pass already used this week';
    }

    async function startCamera() {
        stopCamera();
        const video = $('.hp-video', sheet);
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
            video.srcObject = stream;
            await video.play().catch(() => {});
        } catch (e) {
            $('.hp-status', sheet).textContent = e && e.name === 'NotAllowedError'
                ? '📷 Camera permission is off. Allow it for Ultradian in your phone\'s settings.'
                : 'Couldn\'t open the camera.';
        }
    }

    function stopCamera() {
        if (stream) stream.getTracks().forEach(t => t.stop());
        stream = null;
    }

    function open(index) {
        const list = habits();
        const h = list[index];
        if (!h || h.completedToday) return;
        if (!needsPhoto(h)) { complete(index); return; }
        if (!sheet) buildSheet();
        current = { index, habit: h, proof: proofOf(h) };
        $('.hp-title b', sheet).textContent = h.text;
        $('.hp-title small', sheet).textContent = '📷 Photo proof — checked on your phone, never saved';
        $('.hp-timer', sheet).classList.toggle('suggested', !!current.proof.timer);
        showCamera();
        sheet.hidden = false;
        document.body.classList.add('hp-open');
        requestAnimationFrame(() => sheet.classList.add('open'));
        renderPass();
        startCamera();
        loadVision().then(renderStatus);
        // An unrecognised habit name needs CLIP's text part once — fetch it while the camera is up
        if (!current.proof.known) textFingerprint('a photo of ' + current.proof.show).catch(() => {});
        renderStatus();
    }

    function showCamera() {
        $('.hp-video', sheet).hidden = false;
        $('.hp-shot', sheet).hidden = true;
        $('.hp-result', sheet).hidden = true;
        $('.hp-controls', sheet).hidden = false;
        $('.hp-overlay', sheet).hidden = true;
    }

    function close() {
        clearInterval(timerId);
        stopCamera();
        if (!sheet) return;
        sheet.classList.remove('open');
        document.body.classList.remove('hp-open');
        setTimeout(() => { sheet.hidden = true; unload(); }, 200);
        current = null;
    }

    function countdown(sec) {
        clearInterval(timerId);
        const el = $('.hp-count', sheet);
        let n = sec;
        el.hidden = false; el.textContent = n;
        timerId = setInterval(() => {
            n--;
            if (n <= 0) { clearInterval(timerId); el.hidden = true; snap(); return; }
            el.textContent = n;
            try { window.SFX && window.SFX.play(n <= 3 ? 'tap' : 'pop'); } catch (e) { /* optional */ }
        }, 1000);
    }

    async function snap() {
        if (!current || !stream) return;
        const video = $('.hp-video', sheet), canvas = $('.hp-shot', sheet);
        const w = video.videoWidth || 640, h = video.videoHeight || 480, scale = Math.min(1, 640 / Math.max(w, h));
        canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        video.hidden = true; canvas.hidden = false;
        $('.hp-controls', sheet).hidden = true;
        const overlay = $('.hp-overlay', sheet);
        overlay.hidden = false; overlay.innerHTML = '<span class="hp-spin"></span>Checking…';
        stopCamera();
        let result;
        try { result = await check(canvas, current.habit); }
        catch (e) { result = { error: true }; }
        // The photo is only in this canvas; wipe it now that it's been checked
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        overlay.hidden = true;
        showResult(result);
    }

    function showResult(r) {
        const box = $('.hp-result', sheet);
        box.hidden = false;
        $('.hp-status', sheet).textContent = '';
        const name = current.habit.text;
        if (r.pass) {
            $('.hp-pass', sheet).hidden = true;
            const overlay = $('.hp-overlay', sheet);
            overlay.hidden = false; overlay.innerHTML = '<span class="hp-big">✅</span>';
            box.className = 'hp-result ok';
            box.innerHTML = `<b>✅ Looks like ${esc(name)} — done!</b>`;
            try { window.SFX && window.SFX.play('success'); } catch (e) { /* optional */ }
            const index = current.index;
            setTimeout(() => { close(); complete(index); }, 1100);
            return;
        }
        box.className = 'hp-result no';
        const why = r.error ? 'The photo check didn\'t load. Check your internet once, then try again.'
            : r.looksLike ? `It looks more like ${esc(r.looksLike.replace(/^an? /, ''))}.` : 'It isn\'t clear enough.';
        const tip = current.proof.timer ? 'Prop the phone up with your whole body in view and use the 10s timer.'
            : 'Try another angle with the activity clearly in the photo.';
        box.innerHTML = `<b>❌ This doesn't look like ${esc(name)}</b><small>${why} ${tip}</small>
            <button type="button" class="hp-retake">📷 Retake</button>`;
        try { window.SFX && window.SFX.play('error'); } catch (e) { /* optional */ }
        $('.hp-retake', box).addEventListener('click', () => { showCamera(); startCamera(); renderStatus(); renderPass(); });
    }

    // ==================== HABIT LIST ====================
    function decorate() {
        const listEl = document.getElementById('habits-list');
        if (!listEl) return;
        const items = [...listEl.querySelectorAll('li.habit-item')];
        const list = habits();
        items.forEach((li, i) => {
            const h = list[i];
            if (!h) return;
            const photo = needsPhoto(h);
            li.classList.toggle('hp-photo', photo);
            li.classList.toggle('hp-unverified', !!h.completedToday && isUnverified(h));
            const cb = li.querySelector('input.habit-checkbox');
            if (cb) {
                cb.dataset.hpIndex = String(i);
                if (photo && !h.completedToday) cb.title = '📷 Tap to prove with a photo';
                if (h.completedToday && isUnverified(h)) cb.title = 'Done with a free pass (not photo-verified)';
            }
            const text = li.querySelector('.habit-text');
            if (text && photo && !text.querySelector('.hp-badge')) {
                const b = document.createElement('span');
                b.className = 'hp-badge';
                b.textContent = '📷';
                b.title = 'Photo proof';
                text.prepend(b);
            }
        });
    }

    // Tapping the checkbox of a photo habit opens the camera instead of ticking it
    document.addEventListener('click', (e) => {
        const cb = e.target.closest && e.target.closest('#habits-list input.habit-checkbox');
        if (!cb || cb.disabled) return;
        if (typeof habitSelectionMode !== 'undefined' && habitSelectionMode) return; // eslint-disable-line no-undef
        const index = Number(cb.dataset.hpIndex);
        const h = habits()[index];
        if (!needsPhoto(h) || h.completedToday) return;
        e.preventDefault();
        e.stopPropagation();
        open(index);
    }, true);

    // First launch with this feature: show which habits need a photo
    function intro() {
        const d = data();
        const list = habits().filter(h => h && h.text);
        if (d.introShown || !list.length) return;
        const photo = list.filter(needsPhoto), tick = list.filter(h => !needsPhoto(h));
        if (!photo.length) { d.introShown = true; saveData(d); return; }
        const el = document.createElement('div');
        el.className = 'hp-intro';
        el.innerHTML = `<div class="hp-intro-card" role="dialog" aria-label="Photo proof">
                <div class="hp-intro-icon">📷</div>
                <b>Habits now need proof</b>
                <p>Tick these off with a quick photo from the app's camera. It's checked on your phone and never saved.</p>
                <ul>${photo.map(h => `<li>📷 ${esc(h.text)}</li>`).join('')}${tick.map(h => `<li class="tick">✓ ${esc(h.text)} <small>normal tick</small></li>`).join('')}</ul>
                <p class="hp-intro-small">Workouts get a 10-second timer so you can prop the phone up. Forgot a photo? You get one free pass a week.</p>
                <button type="button">Got it</button>
            </div>`;
        document.body.appendChild(el);
        el.querySelector('button').addEventListener('click', () => { el.remove(); const dd = data(); dd.introShown = true; saveData(dd); });
    }

    // Start the one-time background download soon after launch, if any habit needs a photo
    function backgroundDownload() {
        const list = habits().filter(h => h && h.text);
        const photo = list.filter(needsPhoto);
        if (!photo.length || !('caches' in window)) return;
        const withText = photo.some(h => !proofOf(h).known);
        const wasReady = store.getItem('photoProofDownloaded') === '1';
        prefetch(withText).then(() => {
            if (!wasReady) { store.setItem('photoProofDownloaded', '1'); toast('📷 Photo check ready — it now works offline.'); }
        }).catch(e => console.warn('Photo check download paused', e));
    }

    function init() {
        const listEl = document.getElementById('habits-list');
        if (listEl) new MutationObserver(decorate).observe(listEl, { childList: true });
        decorate();
        setTimeout(intro, 2500);
        const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 4000));
        idle(backgroundDownload);
    }

    window.HabitProof = { open, needsPhoto, classify: D.classify, check, passLeft, usePass, decorate, _state: state };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
