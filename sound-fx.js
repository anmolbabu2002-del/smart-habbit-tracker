// sound-fx.js — playful interface sounds (Duolingo-style), generated with Web Audio
// No audio files: every sound is synthesized, so it's instant and works offline.
// Taps, toggles, completions, celebrations, errors, deletes, water, page turns.
// Can be switched off in Settings.

(function () {
    const KEY = 'sfxOn';
    let enabled = localStorage.getItem(KEY) !== '0';
    let ctx = null;
    let master = null;
    let lastAt = 0;
    let lastName = '';

    function audio() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0.9;
            const comp = ctx.createDynamicsCompressor();
            master.connect(comp).connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    // One note with a soft bell envelope; optional pitch glide
    function tone(freq, at, dur, { type = 'sine', gain = 0.12, glide = 0, attack = 0.005 } = {}) {
        const c = ctx;
        const t = c.currentTime + at;
        const osc = c.createOscillator();
        const g = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g).connect(master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }

    // Bright "ding" = fundamental + quiet octave shimmer
    function bell(freq, at, dur, gain) {
        tone(freq, at, dur, { type: 'triangle', gain });
        tone(freq * 2, at, dur * 0.6, { type: 'sine', gain: gain * 0.35 });
    }

    let noise = null;
    function swish(at, dur, from, to, gain) {
        const c = ctx;
        if (!noise) {
            noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
            const d = noise.getChannelData(0);
            for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        }
        const t = c.currentTime + at;
        const src = c.createBufferSource();
        src.buffer = noise;
        const f = c.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = 1.2;
        f.frequency.setValueAtTime(from, t);
        f.frequency.exponentialRampToValueAtTime(to, t + dur);
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f).connect(g).connect(master);
        src.start(t, Math.random() * 0.5, dur + 0.05);
    }

    const SOUNDS = {
        tap: () => tone(620, 0, 0.07, { gain: 0.07, glide: 480 }),
        nav: () => tone(520, 0, 0.06, { type: 'triangle', gain: 0.06, glide: 600 }),
        open: () => tone(420, 0, 0.12, { gain: 0.07, glide: 700 }),
        close: () => tone(560, 0, 0.11, { gain: 0.06, glide: 320 }),
        confirm: () => { tone(660, 0, 0.08, { type: 'triangle', gain: 0.09 }); tone(990, 0.06, 0.12, { type: 'triangle', gain: 0.08 }); },
        // The classic "correct!" two-note chime
        success: () => { bell(784, 0, 0.18, 0.13); bell(1175, 0.09, 0.32, 0.13); },
        untick: () => tone(440, 0, 0.08, { type: 'triangle', gain: 0.06, glide: 330 }),
        toggleOn: () => { tone(700, 0, 0.05, { gain: 0.07 }); tone(1050, 0.05, 0.07, { gain: 0.07 }); },
        toggleOff: () => { tone(900, 0, 0.05, { gain: 0.06 }); tone(600, 0.05, 0.07, { gain: 0.06 }); },
        // Level-up / streak fanfare: quick major arpeggio + sparkle
        celebrate: () => {
            [523, 659, 784, 1047].forEach((f, i) => bell(f, i * 0.075, 0.28, 0.11));
            [2093, 2637, 3136].forEach((f, i) => tone(f, 0.32 + i * 0.05, 0.18, { gain: 0.035 }));
        },
        notify: () => { bell(880, 0, 0.16, 0.07); bell(1320, 0.07, 0.2, 0.06); },
        error: () => { tone(220, 0, 0.12, { type: 'sawtooth', gain: 0.045, glide: 190 }); tone(196, 0.13, 0.16, { type: 'sawtooth', gain: 0.045, glide: 160 }); },
        delete: () => swish(0, 0.22, 2400, 300, 0.12),
        water: () => { tone(300, 0, 0.13, { gain: 0.11, glide: 900 }); tone(420, 0.1, 0.11, { gain: 0.08, glide: 1100 }); },
        page: () => swish(0, 0.16, 5000, 1800, 0.05),
        pop: () => tone(880, 0, 0.06, { gain: 0.08, glide: 1300 })
    };

    function play(name) {
        if (!enabled || document.hidden || !SOUNDS[name]) return;
        const now = performance.now();
        // Avoid stacking: a soft sound right after another one is skipped
        if (now - lastAt < 90 && (name === 'tap' || name === 'notify' || name === lastName)) return;
        if (!audio()) return;
        lastAt = now;
        lastName = name;
        try { SOUNDS[name](); } catch (e) { /* audio not ready yet */ }
    }

    // ── what each interaction sounds like ──
    const text = (el) => `${el.textContent || ''} ${el.title || ''} ${el.getAttribute('aria-label') || ''} ${el.id || ''}`.toLowerCase();

    function soundForClick(el) {
        if (el.classList.contains('nav-btn') || el.closest('.nav-bar, .screen-tabs')) return 'nav';
        const t = text(el);
        if (/delete|remove|🗑|trash|clear all|reset/.test(t)) return 'delete';
        if (el.classList.contains('close-btn') || /^\s*(✕|×|‹|close|cancel|not now|back)\b/.test(t) || /close/.test(el.id || '')) return 'close';
        if (/💧|water|glass|\+\s*\d+\s*ml|drink/.test(t)) return 'water';
        if (/save|add|start|complete|done|log |submit|confirm|enter|apply|✓|✅|finish|create/.test(t)) return 'confirm';
        if (/settings|menu|⋮|open|more|aa\b/.test(t)) return 'open';
        return 'tap';
    }

    document.addEventListener('click', (e) => {
        const el = e.target.closest('button, [role="button"], a, .sp-item, .game-card, .hub-card, [onclick]');
        if (!el || el.disabled) return;
        if (el.closest('.rd-player, #reader-content-container')) return; // reader has its own page sounds
        play(soundForClick(el));
    }, true);

    document.addEventListener('change', (e) => {
        const t = e.target;
        if (t.type === 'checkbox') {
            // Toggle switches sound like switches; ticking off a task or habit gets the chime
            if (t.closest('.toggle-switch, .switch, [role="switch"]') || t.getAttribute('role') === 'switch') play(t.checked ? 'toggleOn' : 'toggleOff');
            else play(t.checked ? 'success' : 'untick');
        } else if (t.type === 'radio' || t.tagName === 'SELECT') {
            play('tap');
        }
    }, true);

    // Page turns in the reader
    document.addEventListener('readerpageshown', () => {
        const listening = typeof ttsState !== 'undefined' && ttsState.isPlaying;
        if (!listening) play('page');
    });

    // Toasts: celebrate wins, buzz on problems, gentle pop otherwise
    function classify(msg) {
        const m = String(msg || '');
        if (/🏆|🎉|🥳|🔥|⭐|congrat|streak|achievement|unlock|level up|goal (reached|complete|done)|completed|finished|all done|perfect/i.test(m)) return 'celebrate';
        if (/⚠️|❌|fail|couldn|can't|cannot|error|invalid|not found|limit reached/i.test(m)) return 'error';
        return 'notify';
    }

    function wrapNotifications() {
        if (typeof window.showNotification !== 'function' || window.showNotification.__sfx) return;
        const original = window.showNotification;
        const wrapped = function (message, ...rest) {
            play(classify(message));
            return original.call(this, message, ...rest);
        };
        wrapped.__sfx = true;
        window.showNotification = wrapped;
    }

    // ── Settings switch ──
    function addSettingsToggle() {
        const container = document.querySelector('#settings-page .settings-container');
        if (!container || document.getElementById('sfx-toggle')) return;
        const row = document.createElement('div');
        row.className = 'sfx-setting';
        row.innerHTML = `
            <div><b>🔊 Sound effects</b><small>Playful sounds for taps, wins and streaks</small></div>
            <label class="toggle-switch"><input type="checkbox" id="sfx-toggle" ${enabled ? 'checked' : ''}><span class="slider round"></span></label>`;
        container.insertBefore(row, container.firstChild);
        row.querySelector('#sfx-toggle').addEventListener('change', (e) => {
            enabled = e.target.checked;
            localStorage.setItem(KEY, enabled ? '1' : '0');
            if (enabled) play('toggleOn');
        });
        const style = document.createElement('style');
        style.textContent = `.sfx-setting{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;margin-bottom:22px;border-radius:16px;background:var(--bg-input);}
            .sfx-setting b{display:block;color:var(--text-main);font-size:.95rem}.sfx-setting small{display:block;color:var(--text-muted);font-size:.75rem;margin-top:2px}`;
        document.head.appendChild(style);
    }

    // Browsers only allow audio after the first tap; warm the engine up then
    const unlock = () => { if (enabled) audio(); };
    document.addEventListener('pointerdown', unlock, { once: true, capture: true });

    function init() {
        wrapNotifications();
        addSettingsToggle();
        setTimeout(wrapNotifications, 1500); // in case another script redefines it later
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    window.SFX = { play, get enabled() { return enabled; }, setEnabled: (v) => { enabled = !!v; localStorage.setItem(KEY, enabled ? '1' : '0'); } };
})();
