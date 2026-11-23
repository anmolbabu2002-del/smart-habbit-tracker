// native-speech.js — reading aloud in the Android app.
// Android's WebView (which the Capacitor app runs in) has no window.speechSynthesis, so the
// reader's voice list never loaded and device voices couldn't speak. This fills that gap with
// the phone's own text-to-speech engine (the @capacitor-community/text-to-speech plugin added
// by .github/workflows/android.yml), shaped like the browser API so tts.js works unchanged.
// Runs only in the app, and only when the WebView really lacks speechSynthesis.

(function () {
    if (!window.ULTRADIAN_NATIVE || window.speechSynthesis) return;

    const PLUGIN = 'TextToSpeech';
    const call = (method, options) => window.ultradianNative(PLUGIN, method, options);

    // Languages worth listing (the phone can have hundreds of voices)
    const KEEP_LANGS = /^(en|hi|ne|bn|ta|te|mr|gu|kn|ml|ur|pa|es|fr|de|it|pt|ru|ja|ko|zh|ar|tr|th)$/;
    const KEEP_ENGLISH = /^en-(US|GB|IN|AU)$/i;

    let voices = [];
    let current = null;   // { utterance, done }
    // tts.js speaks a page sentence by sentence with a short gap in between; its watchdog
    // would read that gap as the engine dying, so "speaking" lingers briefly after each one.
    let lingerUntil = 0;

    function fire(target, type, extra) {
        const handler = target && target['on' + type];
        if (typeof handler !== 'function') return;
        const event = Object.assign({ type, target, utterance: target }, extra || {});
        try { handler.call(target, event); } catch (e) { console.error('Speech handler error:', e); }
    }

    function finish(error) {
        const c = current;
        if (!c || c.done) return;
        c.done = true;
        current = null;
        lingerUntil = error ? 0 : Date.now() + 1500;
        synth.paused = false;
        if (error) fire(c.utterance, 'error', { error });
        else fire(c.utterance, 'end', { charIndex: (c.utterance.text || '').length });
    }

    function stopNative() {
        call('stop').catch(() => {});
    }

    const synth = {
        get speaking() { return !!current || Date.now() < lingerUntil; },
        paused: false,
        pending: false,
        onvoiceschanged: null,
        getVoices() { return voices.slice(); },
        speak(utterance) {
            if (!utterance) return;
            finish('interrupted');
            const entry = { utterance, done: false };
            current = entry;
            synth.paused = false;
            const voice = utterance.voice && voices.includes(utterance.voice) ? utterance.voice : null;
            const options = {
                text: String(utterance.text || ''),
                lang: (voice && voice.lang) || utterance.lang || 'en-US',
                rate: Number(utterance.rate) || 1,
                pitch: Number(utterance.pitch) || 1,
                volume: utterance.volume == null ? 1 : Number(utterance.volume)
            };
            if (voice) options.voice = voice._index;
            setTimeout(() => { if (current === entry) fire(utterance, 'start'); }, 0);
            call('speak', options).then(
                () => { if (current === entry) finish(null); },
                (err) => {
                    if (current !== entry) return;
                    console.warn('Phone text-to-speech failed:', err);
                    finish('synthesis-failed');
                }
            );
        },
        cancel() {
            if (current) finish('canceled');
            synth.paused = false;
            stopNative();
        },
        // The engine can't pause mid-sentence: stop, and let tts.js restart from where it was
        // (its resume path already does that when nothing is speaking after resume()).
        pause() {
            if (!current) return;
            const c = current;
            c.done = true;
            current = null;
            lingerUntil = 0;
            synth.paused = true;
            stopNative();
        },
        resume() {
            synth.paused = false;
        },
        addEventListener(type, fn) {
            if (type === 'voiceschanged') (listeners[type] = listeners[type] || []).push(fn);
        },
        removeEventListener(type, fn) {
            const list = listeners[type];
            if (list) listeners[type] = list.filter(f => f !== fn);
        }
    };
    const listeners = {};

    function SpeechSynthesisUtterance(text) {
        this.text = text == null ? '' : String(text);
        this.lang = '';
        this.voice = null;
        this.rate = 1;
        this.pitch = 1;
        this.volume = 1;
        this.onstart = this.onend = this.onerror = this.onboundary = this.onpause = this.onresume = this.onmark = null;
    }

    window.speechSynthesis = synth;
    if (!window.SpeechSynthesisUtterance) window.SpeechSynthesisUtterance = SpeechSynthesisUtterance;

    // Word-by-word highlighting: the engine reports which part of the text it's saying
    try {
        const cap = window.Capacitor;
        const onRange = (info) => {
            if (!current || !info) return;
            const start = Number(info.start) || 0;
            const end = Number(info.end) || start;
            fire(current.utterance, 'boundary', { name: 'word', charIndex: start, charLength: Math.max(0, end - start) });
        };
        const p = cap && cap.Plugins && cap.Plugins[PLUGIN];
        if (p && typeof p.addListener === 'function') p.addListener('onRangeStart', onRange);
        else if (cap && typeof cap.nativeCallback === 'function') cap.nativeCallback(PLUGIN, 'addListener', { eventName: 'onRangeStart' }, onRange);
    } catch (e) { /* highlighting falls back to whole sentences */ }

    // ── Voice list ──
    function friendlyVoices(raw) {
        const out = [];
        const seen = new Set();
        const perLang = {};
        raw.forEach((v, index) => {
            if (!v || !v.lang) return;
            const lang = String(v.lang).replace('_', '-');
            const base = lang.split('-')[0].toLowerCase();
            if (!KEEP_LANGS.test(base)) return;
            if (base === 'en' && !KEEP_ENGLISH.test(lang)) return;
            const uri = String(v.voiceURI || v.name || index);
            // Google's engine lists each voice twice (offline + online); keep the offline one
            const key = uri.replace(/-(local|network)$/i, '');
            const online = v.localService === false;
            if (seen.has(key) && online) return;
            if (seen.has(key)) {
                const i = out.findIndex(o => o._key === key);
                if (i >= 0) out.splice(i, 1);
            }
            seen.add(key);
            out.push({ _key: key, _index: index, _uri: uri, _online: online, lang, region: v.name || lang });
        });
        out.sort((a, b) => a.lang.localeCompare(b.lang) || a._uri.localeCompare(b._uri));
        return out.map(o => {
            perLang[o.lang] = (perLang[o.lang] || 0) + 1;
            const isDefault = /-language$/i.test(o._uri);
            const label = `📱 ${o.region} · ${isDefault ? 'Phone default' : 'Voice ' + perLang[o.lang]}${o._online ? ' (online)' : ''}`;
            return {
                name: label,
                lang: o.lang,
                voiceURI: o._uri,
                localService: !o._online,
                default: isDefault,
                _index: o._index
            };
        });
    }

    let attempts = 0;
    function loadVoices() {
        attempts++;
        call('getSupportedVoices').then(res => {
            const list = friendlyVoices((res && res.voices) || []);
            if (!list.length && attempts < 6) { setTimeout(loadVoices, attempts * 1000); return; }
            voices = list;
            if (typeof synth.onvoiceschanged === 'function') {
                try { synth.onvoiceschanged({ type: 'voiceschanged' }); } catch (e) { console.error(e); }
            }
            (listeners.voiceschanged || []).forEach(fn => { try { fn({ type: 'voiceschanged' }); } catch (e) { console.error(e); } });
        }).catch(err => {
            if (attempts < 6) setTimeout(loadVoices, attempts * 1000);
            else console.warn('Phone voices unavailable:', err);
        });
    }
    // Give tts.js a moment to attach onvoiceschanged, then ask the engine
    setTimeout(loadVoices, 300);
})();
