// tts.js — Premium Text-to-Speech for E-Reader
// Features: Hindi + English voices, auto-read on page turn, Spotify-like background mode

const ttsState = {
    synth: window.speechSynthesis,
    voices: [],
    selectedVoice: null,
    isPlaying: false,
    isPaused: false,
    speed: 1.0,
    autoTurn: true,
    currentUtterance: null,
    _voicesLoaded: false,
    _continuousMode: false,  // when true, auto-reads every page after turn
    _pageReadStartTime: 0,   // timestamp when current page reading started
    _minReadTimeMs: 2000     // minimum ms before allowing auto-page-turn
};

// ===================== COOL VOICE NAMING =====================
function getCoolVoiceName(voice) {
    const n = voice.name;
    const lang = voice.lang;

    // Hindi voices
    if (/hi[-_]?IN|Hindi/i.test(lang) || /Hindi/i.test(n)) {
        if (/Hemant/i.test(n))        return '🎵 Hemant — Deep Male (Hindi)';
        if (/Kalpana/i.test(n))       return '🎵 Kalpana — Soft Female (Hindi)';
        if (/Swara/i.test(n))         return '🎵 Swara — Bright Female (Hindi)';
        if (/Madhur/i.test(n))        return '🎵 Madhur — Warm Male (Hindi)';
        if (/Natural/i.test(n))       return '✨ Vani — Ultra-Realistic (Hindi)';
        if (/Google/i.test(n))        return '🌟 Dhwani — Google Cloud (Hindi)';
        const cleanName = n.replace(/Microsoft |Google |Desktop /g, '').trim();
        return `🎵 ${cleanName || 'Hindi Voice'} (हिन्दी)`;
    }

    // Microsoft Natural voices (Edge) — best quality
    if (/Natural/i.test(n)) {
        if (/Female|Jenny|Aria|Sara|Ana/i.test(n)) return `✨ Aurora (Natural Female)`;
        return `✨ Atlas (Natural Male)`;
    }
    // Google online voices (Chrome)
    if (/Google UK English Female/i.test(n)) return '🌟 Nova (British Female)';
    if (/Google UK English Male/i.test(n))   return '🌟 Orion (British Male)';
    if (/Google US English/i.test(n))        return '🌟 Echo (US)';
    if (/Google.*Hindi/i.test(n))            return '🎵 Dhwani (Google Hindi)';
    if (/Google/i.test(n)) return `🌟 ${n.replace('Google ', '')}`;
    // Microsoft standard voices
    if (/Zira/i.test(n))   return '💎 Zira (Crystal Female)';
    if (/David/i.test(n))  return '💎 David (Steady Male)';
    if (/Mark/i.test(n))   return '💎 Mark (Bold Male)';
    if (/Hazel/i.test(n))  return '💎 Hazel (Warm Female)';
    if (/Susan/i.test(n))  return '💎 Susan (Gentle Female)';
    if (/George/i.test(n)) return '💎 George (Classic Male)';
    // Generic cleanup
    return `${n.replace(/Microsoft |Google |Desktop /g, '')}`;
}

// ===================== VOICE LOADING =====================
function loadTTSVoices() {
    const allVoices = ttsState.synth.getVoices();
    
    // Cloud voices powered by our Netlify TTS proxy — always available, no downloads needed
    const cloudVoices = [
        { isCloud: true, lang: 'hi-IN', name: '🇮🇳 Hindi (Cloud)' },
        { isCloud: true, lang: 'ne-NP', name: '🇳🇵 Nepali (Cloud)' }
    ];

    ttsState.voices = [...cloudVoices, ...allVoices];

    ttsState.voices.sort((a, b) => {
        // Cloud voices pinned at the top
        if (a.isCloud && !b.isCloud) return -1;
        if (!a.isCloud && b.isCloud) return 1;

        // Premium/Natural voices next
        const aQ = /Natural|Premium/i.test(a.name) ? 0 : /Google/i.test(a.name) ? 1 : 2;
        const bQ = /Natural|Premium/i.test(b.name) ? 0 : /Google/i.test(b.name) ? 1 : 2;
        if (aQ !== bQ) return aQ - bQ;
        // Then sort by language
        const aLang = /^en/i.test(a.lang) ? 0 : /^hi/i.test(a.lang) ? 1 : /^ne/i.test(a.lang) ? 2 : 3;
        const bLang = /^en/i.test(b.lang) ? 0 : /^hi/i.test(b.lang) ? 1 : /^ne/i.test(b.lang) ? 2 : 3;
        if (aLang !== bLang) return aLang - bLang;
        return a.name.localeCompare(b.name);
    });

    const select = document.getElementById('tts-voice-select');
    if (!select) return;

    select.innerHTML = '';

    // Dynamically group by language
    const langNames = { 
        en: '🇬🇧 English', 
        hi: '🇮🇳 Hindi (हिन्दी)', 
        ne: '🇳🇵 Nepali (नेपाली)',
        es: '🇪🇸 Spanish', 
        fr: '🇫🇷 French', 
        de: '🇩🇪 German', 
        ja: '🇯🇵 Japanese', 
        ko: '🇰🇷 Korean', 
        zh: '🇨🇳 Chinese', 
        pt: '🇧🇷 Portuguese', 
        ru: '🇷🇺 Russian', 
        ar: '🇸🇦 Arabic', 
        it: '🇮🇹 Italian' 
    };
    let lastLangCode = '';
    let currentOptgroup = null;

    ttsState.voices.forEach((voice, i) => {
        const langCode = voice.lang.substring(0, 2).toLowerCase();
        
        if (langCode !== lastLangCode) {
            currentOptgroup = document.createElement('optgroup');
            currentOptgroup.label = langNames[langCode] || `🌐 ${voice.lang}`;
            select.appendChild(currentOptgroup);
            lastLangCode = langCode;
        }

        const opt = document.createElement('option');
        opt.textContent = voice.isCloud ? voice.name : getCoolVoiceName(voice);
        opt.value = String(i);
        (currentOptgroup || select).appendChild(opt);
    });

    // Restore saved voice
    const savedIdx = localStorage.getItem('ttsVoiceIdx');
    if (savedIdx && parseInt(savedIdx) < ttsState.voices.length) {
        select.value = savedIdx;
    } else {
        select.selectedIndex = 0;
    }
    ttsState.selectedVoice = ttsState.voices[parseInt(select.value) || 0] || null;
    ttsState._voicesLoaded = true;
}

// ===================== TEXT EXTRACTION =====================
function extractCurrentPageText() {
    const readerTextEl = document.getElementById('reader-text');
    if (!readerTextEl) return '';
    // innerText gives us the visible rendered text for all modes (plain, epub, pdf text layer)
    let text = readerTextEl.innerText || readerTextEl.textContent || '';
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}

// ===================== CHROME LONG-TEXT BUG WORKAROUND =====================
// Chrome has a bug where speechSynthesis stops after ~15 seconds of continuous speech.
// Fix: chunk text and use a recursive queue.
function speakTextWithChunking(text) {
    ttsState.synth.cancel();
    if (ttsState._cloudAudio) {
        ttsState._cloudAudio.pause();
        ttsState._cloudAudio = null;
    }

    const isCloud = ttsState.selectedVoice && ttsState.selectedVoice.isCloud;
    // Cloud TTS proxy has a 200-char limit; native can handle 180 comfortably
    const MAX_CHARS = isCloud ? 150 : 180;

    // Split by words for cloud (safer for multibyte), by sentences for native
    const chunks = [];
    if (isCloud) {
        const words = text.split(/\s+/);
        let current = '';
        for (const word of words) {
            if ((current + ' ' + word).trim().length > MAX_CHARS && current.length > 0) {
                chunks.push(current.trim());
                current = word;
            } else {
                current = (current + ' ' + word).trim();
            }
        }
        if (current.trim()) chunks.push(current.trim());
    } else {
        const sentences = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text];
        let current = '';
        for (const sentence of sentences) {
            if ((current + sentence).length > MAX_CHARS && current.length > 0) {
                chunks.push(current.trim());
                current = sentence;
            } else {
                current += sentence;
            }
        }
        if (current.trim()) chunks.push(current.trim());
    }

    let chunkIndex = 0;

    function speakNext() {
        if (chunkIndex >= chunks.length) {
            onPageReadingComplete();
            return;
        }

        if (isCloud) {
            // Cloud path: fetch audio from our same-origin Netlify proxy (no CORS issues)
            const tl = ttsState.selectedVoice.lang.substring(0, 2);
            const proxyUrl = `/.netlify/functions/tts-proxy?tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(chunks[chunkIndex])}`;
            
            const audio = new Audio(proxyUrl);
            audio.playbackRate = ttsState.speed;
            ttsState._cloudAudio = audio;
            
            audio.onended = () => {
                chunkIndex++;
                if (ttsState.isPlaying && !ttsState.isPaused) speakNext();
            };
            audio.onerror = () => {
                console.error('Cloud TTS chunk failed, skipping');
                chunkIndex++;
                if (ttsState.isPlaying && !ttsState.isPaused) {
                    setTimeout(speakNext, 100);
                } else {
                    ttsState.isPlaying = false;
                    updateTTSButton();
                }
            };
            
            audio.play().catch(e => {
                console.error('Cloud TTS play error:', e);
                ttsState.isPlaying = false;
                updateTTSButton();
            });

        } else {
            // Native path: SpeechSynthesis
            const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
            if (ttsState.selectedVoice) utterance.voice = ttsState.selectedVoice;
            utterance.rate = ttsState.speed;
            utterance.pitch = 1.0;

            utterance.onend = () => {
                chunkIndex++;
                if (ttsState.isPlaying && !ttsState.isPaused) {
                    speakNext();
                }
            };

            utterance.onerror = (e) => {
                if (e.error === 'canceled') return; 
                console.error('TTS chunk error:', e);
                ttsState.isPlaying = false;
                updateTTSButton();
            };

            ttsState.currentUtterance = utterance;
            ttsState.synth.speak(utterance);
        }
    }

    speakNext();
}

function onPageReadingComplete() {
    if (ttsState.autoTurn && ttsState.isPlaying && !ttsState.isPaused && ttsState._continuousMode) {
        // Enforce minimum read time to prevent premature page turns
        const elapsed = Date.now() - ttsState._pageReadStartTime;
        const remainingWait = Math.max(0, ttsState._minReadTimeMs - elapsed);
        
        setTimeout(() => {
            if (!ttsState.isPlaying || ttsState.isPaused) return; // User may have stopped during wait
            const nextZone = document.getElementById('reader-next-zone');
            if (nextZone) {
                nextZone.click();
            } else {
                // No more pages — book finished
                ttsState.isPlaying = false;
                ttsState._continuousMode = false;
                updateTTSButton();
            }
        }, remainingWait);
    } else {
        ttsState.isPlaying = false;
        ttsState._continuousMode = false;
        updateTTSButton();
    }
}

// ===================== TTS PLAYBACK =====================
function playTTS() {
    ttsState.synth.cancel();

    const text = extractCurrentPageText();
    if (!text || text.length < 3) {
        // Page is empty — try auto-turn
        if (ttsState.autoTurn && ttsState._continuousMode) {
            setTimeout(() => {
                const nextZone = document.getElementById('reader-next-zone');
                if (nextZone) nextZone.click();
            }, 400);
        }
        return;
    }

    // Ensure voice is set
    if (!ttsState.selectedVoice && ttsState.voices.length > 0) {
        ttsState.selectedVoice = ttsState.voices[0];
    }

    ttsState.isPlaying = true;
    ttsState.isPaused = false;
    ttsState._continuousMode = true;
    ttsState._pageReadStartTime = Date.now();  // Track when this page started reading
    updateTTSButton();

    // Use chunking to beat Chrome's 15-second bug
    speakTextWithChunking(text);

    // Background keepalive audio
    try { document.getElementById('tts-keepalive-audio')?.play().catch(() => {}); } catch(e) {}

    // Media Session for lock-screen controls
    setupMediaSession();
}

function stopTTS() {
    ttsState.synth.cancel();
    if (ttsState._cloudAudio) {
        ttsState._cloudAudio.pause();
        ttsState._cloudAudio = null;
    }
    ttsState.isPlaying = false;
    ttsState.isPaused = false;
    ttsState._continuousMode = false;
    ttsState.currentUtterance = null;
    updateTTSButton();
    try { document.getElementById('tts-keepalive-audio')?.pause(); } catch(e) {}
}

function toggleTTS() {
    if (!ttsState.isPlaying) {
        playTTS();
    } else if (ttsState.isPlaying && !ttsState.isPaused) {
        // Pause
        ttsState.synth.pause();
        if (ttsState._cloudAudio) ttsState._cloudAudio.pause();
        ttsState.isPaused = true;
        updateTTSButton();
        try { document.getElementById('tts-keepalive-audio')?.pause(); } catch(e) {}
    } else {
        // Resume
        ttsState.synth.resume();
        if (ttsState._cloudAudio) ttsState._cloudAudio.play().catch(()=>{});
        ttsState.isPaused = false;
        updateTTSButton();
        try { document.getElementById('tts-keepalive-audio')?.play().catch(() => {}); } catch(e) {}
    }
}

// ===================== AUTO-READ HOOK =====================
// This is called from script.js after each page turn animation completes
window._ttsAutoReadAfterTurn = function() {
    if (ttsState.isPlaying && ttsState._continuousMode && !ttsState.isPaused) {
        // Small delay to let the DOM settle after page render
        setTimeout(() => {
            playTTS();
        }, 200);
    }
};

// ===================== UI UPDATES =====================
function updateTTSButton() {
    const btn = document.getElementById('reader-tts-btn');
    if (!btn) return;
    if (ttsState.isPlaying && !ttsState.isPaused) {
        btn.textContent = '⏸️';
        btn.classList.add('tts-pulse');
    } else if (ttsState.isPlaying && ttsState.isPaused) {
        btn.textContent = '▶️';
        btn.classList.remove('tts-pulse');
    } else {
        btn.textContent = '🔊';
        btn.classList.remove('tts-pulse');
    }
}

// ===================== MEDIA SESSION =====================
function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    try {
        const titleEl = document.getElementById('reader-book-title');
        navigator.mediaSession.metadata = new MediaMetadata({
            title: titleEl ? titleEl.textContent : 'Book',
            artist: 'Ultradian E-Reader',
            album: 'My Library'
        });
        navigator.mediaSession.setActionHandler('play', toggleTTS);
        navigator.mediaSession.setActionHandler('pause', toggleTTS);
        navigator.mediaSession.setActionHandler('stop', stopTTS);
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            stopTTS();
            const prevZone = document.getElementById('reader-prev-zone');
            if (prevZone) prevZone.click();
            setTimeout(playTTS, 800);
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            stopTTS();
            const nextZone = document.getElementById('reader-next-zone');
            if (nextZone) nextZone.click();
            setTimeout(playTTS, 800);
        });
    } catch(e) {}
}

// ===================== INITIALIZATION =====================
function initTTS() {
    // Load voices
    loadTTSVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadTTSVoices;
    }
    setTimeout(() => { if (!ttsState._voicesLoaded) loadTTSVoices(); }, 2000);

    // ---- Play/Pause Button ----
    document.getElementById('reader-tts-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTTS();
    });

    // ---- Settings Button ----
    document.getElementById('reader-tts-settings-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('tts-settings-modal')?.classList.remove('hidden');
    });

    document.getElementById('tts-settings-close')?.addEventListener('click', () => {
        document.getElementById('tts-settings-modal')?.classList.add('hidden');
    });

    document.getElementById('tts-settings-save')?.addEventListener('click', () => {
        document.getElementById('tts-settings-modal')?.classList.add('hidden');
    });

    // ---- Voice Select (works even while book is open) ----
    document.getElementById('tts-voice-select')?.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value) || 0;
        ttsState.selectedVoice = ttsState.voices[idx] || null;
        localStorage.setItem('ttsVoiceIdx', String(idx));

        // If currently playing, cancel old speech and restart with new voice immediately
        if (ttsState.isPlaying) {
            const wasContinuous = ttsState._continuousMode;
            ttsState.synth.cancel();
            ttsState._continuousMode = wasContinuous;
            ttsState.isPlaying = true;
            // Small delay to let cancel propagate
            setTimeout(() => {
                playTTS();
            }, 100);
        }
    });

    // ---- Speed Slider ----
    document.getElementById('tts-speed-range')?.addEventListener('input', (e) => {
        ttsState.speed = parseFloat(e.target.value) || 1.0;
        const label = document.getElementById('tts-speed-val');
        if (label) label.textContent = `${ttsState.speed.toFixed(1)}x`;

        if (ttsState.isPlaying) {
            const wasContinuous = ttsState._continuousMode;
            ttsState.synth.cancel();
            ttsState._continuousMode = wasContinuous;
            ttsState.isPlaying = true;
            setTimeout(() => { playTTS(); }, 100);
        }
    });

    // ---- Auto Turn Toggle ----
    document.getElementById('tts-auto-turn-toggle')?.addEventListener('change', (e) => {
        ttsState.autoTurn = e.target.checked;
    });

    // ---- Stop TTS when reader is closed ----
    document.getElementById('reader-close-btn')?.addEventListener('click', stopTTS);

    // ---- Close settings on backdrop click ----
    document.getElementById('tts-settings-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'tts-settings-modal') {
            e.target.classList.add('hidden');
        }
    });
}

// ===================== DYNAMIC CSS =====================
(function injectTTSStyles() {
    const s = document.createElement('style');
    s.textContent = `
        @keyframes ttsPulseGlow {
            0%   { box-shadow: 0 0 0 0 rgba(139,92,246,0.5); }
            70%  { box-shadow: 0 0 0 8px rgba(139,92,246,0); }
            100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); }
        }
        .tts-pulse {
            animation: ttsPulseGlow 1.5s infinite !important;
            background: rgba(139,92,246,0.15) !important;
            color: #8b5cf6 !important;
        }
    `;
    document.head.appendChild(s);
})();

// ===================== BOOT =====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initTTS, 500));
} else {
    setTimeout(initTTS, 500);
}
