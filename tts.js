// tts.js — Premium Text-to-Speech for E-Reader
// ReadEra-style sentence-level highlighting: clean, professional, zero text corruption
// Highlight color shared between TTS mode and manual pen highlighting
// v2.0 — Robust rewrite: fixes stuck states, Chrome timeout, Android resume, highlight corruption

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
    _continuousMode: false,
    _pageReadStartTime: 0,
    _minReadTimeMs: 2000,
    // Highlighting state
    _originalHTML: '',
    _chunks: [],
    _chunkPositions: [],
    _currentChunkIdx: -1,
    _activeHlSpan: null,
    _isTransitioning: false,
    _cloudAudio: null,
    _cloudWordTimer: null,
    _hlCharOffset: 0,
    _pdfCharToSpan: null,
    _pdfFullText: null,
    // Watchdog & keepalive
    _keepAliveTimer: null,
    _watchdogTimer: null,
    _lastBoundaryTime: 0,
    _boundaryCount: 0,
    // Resume tracking (for Android restart-on-resume)
    _pausedAtChunk: -1,
    _fullText: ''
};

// ===================== COOL VOICE NAMING =====================
function getCoolVoiceName(voice) {
    const n = voice.name;
    const lang = voice.lang;

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
    if (/Natural/i.test(n)) {
        if (/Female|Jenny|Aria|Sara|Ana/i.test(n)) return `✨ Aurora (Natural Female)`;
        return `✨ Atlas (Natural Male)`;
    }
    if (/Google UK English Female/i.test(n)) return '🌟 Nova (British Female)';
    if (/Google UK English Male/i.test(n))   return '🌟 Orion (British Male)';
    if (/Google US English/i.test(n))        return '🌟 Echo (US)';
    if (/Google.*Hindi/i.test(n))            return '🎵 Dhwani (Google Hindi)';
    if (/Google/i.test(n)) return `🌟 ${n.replace('Google ', '')}`;
    if (/Zira/i.test(n))   return '💎 Zira (Crystal Female)';
    if (/David/i.test(n))  return '💎 David (Steady Male)';
    if (/Mark/i.test(n))   return '💎 Mark (Bold Male)';
    if (/Hazel/i.test(n))  return '💎 Hazel (Warm Female)';
    if (/Susan/i.test(n))  return '💎 Susan (Gentle Female)';
    if (/George/i.test(n)) return '💎 George (Classic Male)';
    return `${n.replace(/Microsoft |Google |Desktop /g, '')}`;
}

// ===================== VOICE LOADING =====================
function loadTTSVoices() {
    const allVoices = ttsState.synth.getVoices();
    const cloudVoices = [
        { isCloud: true, lang: 'hi-IN', name: '🇮🇳 Hindi (Cloud)' },
        { isCloud: true, lang: 'ne-NP', name: '🇳🇵 Nepali (Cloud)' }
    ];

    ttsState.voices = [...cloudVoices, ...allVoices];

    ttsState.voices.sort((a, b) => {
        if (a.isCloud && !b.isCloud) return -1;
        if (!a.isCloud && b.isCloud) return 1;
        const aQ = /Natural|Premium/i.test(a.name) ? 0 : /Google/i.test(a.name) ? 1 : 2;
        const bQ = /Natural|Premium/i.test(b.name) ? 0 : /Google/i.test(b.name) ? 1 : 2;
        if (aQ !== bQ) return aQ - bQ;
        const aLang = /^en/i.test(a.lang) ? 0 : /^hi/i.test(a.lang) ? 1 : /^ne/i.test(a.lang) ? 2 : 3;
        const bLang = /^en/i.test(b.lang) ? 0 : /^hi/i.test(b.lang) ? 1 : /^ne/i.test(b.lang) ? 2 : 3;
        if (aLang !== bLang) return aLang - bLang;
        return a.name.localeCompare(b.name);
    });

    const select = document.getElementById('tts-voice-select');
    if (!select) return;
    select.innerHTML = '';

    const langNames = { 
        en: '🇬🇧 English', hi: '🇮🇳 Hindi (हिन्दी)', ne: '🇳🇵 Nepali (नेपाली)',
        es: '🇪🇸 Spanish', fr: '🇫🇷 French', de: '🇩🇪 German', 
        ja: '🇯🇵 Japanese', ko: '🇰🇷 Korean', zh: '🇨🇳 Chinese', 
        pt: '🇧🇷 Portuguese', ru: '🇷🇺 Russian', ar: '🇸🇦 Arabic', it: '🇮🇹 Italian' 
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

    // ★ TRANSLATED TEXT: Always check this FIRST — it overrides the original
    const transDiv = readerTextEl.querySelector('.pdf-translate-replacement');
    if (transDiv) {
        let text = transDiv.innerText || transDiv.textContent || '';
        text = text.replace(/\s+/g, ' ').trim();
        if (text.length > 2) return text;
    }

    // PDF mode: text lives in invisible .pdf-text-layer spans
    const pdfTextLayer = readerTextEl.querySelector('.pdf-text-layer');
    if (pdfTextLayer) {
        const spans = pdfTextLayer.querySelectorAll('span');
        if (spans.length > 0) {
            let pdfText = '';
            spans.forEach(span => {
                const t = span.textContent;
                if (t && t.trim()) pdfText += t + ' ';
            });
            pdfText = pdfText.replace(/\s+/g, ' ').trim();
            if (pdfText.length > 2) return pdfText;
        }
    }

    // Standard text / EPUB mode
    let text = readerTextEl.innerText || readerTextEl.textContent || '';
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}

// ===================== HIGHLIGHTING ENGINE =====================

function _isPdfMode() {
    const el = document.getElementById('reader-text');
    return el && !!el.querySelector('.pdf-text-layer');
}

// ── PDF: Build char→span index once per page ──
function _buildPdfCharIndex() {
    const el = document.getElementById('reader-text');
    if (!el) return;
    const pdfLayer = el.querySelector('.pdf-text-layer');
    if (!pdfLayer) return;

    const spans = Array.from(pdfLayer.querySelectorAll('span'));
    const charToSpan = [];
    let fullText = '';

    for (const span of spans) {
        const t = span.textContent || '';
        if (!t.trim()) continue;
        if (fullText.length > 0) {
            charToSpan.push(null);
            fullText += ' ';
        }
        for (let i = 0; i < t.length; i++) {
            charToSpan.push(span);
            fullText += t[i];
        }
    }

    ttsState._pdfCharToSpan = charToSpan;
    ttsState._pdfFullText = fullText;
}

// ── PDF: Highlight a range of characters ──
function _highlightPdfRange(startChar, endChar) {
    if (!ttsState._pdfCharToSpan) return;
    const seen = new Set();
    for (let i = startChar; i < endChar && i < ttsState._pdfCharToSpan.length; i++) {
        const span = ttsState._pdfCharToSpan[i];
        if (span && !seen.has(span)) {
            seen.add(span);
            span.classList.add('tts-pdf-hl');
        }
    }
    const first = ttsState._pdfCharToSpan[startChar];
    if (first) _scrollToEl(first);
}

// ── PDF: Clear all highlights ──
function _clearPdfHighlights() {
    const el = document.getElementById('reader-text');
    if (!el) return;
    const layer = el.querySelector('.pdf-text-layer');
    if (layer) {
        layer.querySelectorAll('.tts-pdf-hl').forEach(s => s.classList.remove('tts-pdf-hl'));
    }
}

// ── TEXT/EPUB: Get all text nodes under an element ──
function _getTextNodes(root) {
    const nodes = [];
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    let n;
    while ((n = tw.nextNode())) nodes.push(n);
    return nodes;
}

// ── TEXT/EPUB: Build a cumulative text-node map ──
function _buildTextMap(root) {
    const textNodes = _getTextNodes(root);
    let offset = 0;
    const map = textNodes.map(tn => {
        const entry = { node: tn, start: offset, len: tn.textContent.length };
        offset += entry.len;
        return entry;
    });
    return { map, fullText: textNodes.map(n => n.textContent).join(''), totalLen: offset };
}

// ── TEXT/EPUB: Remove the single active highlight span ──
function _unwrapActiveSpan() {
    const span = ttsState._activeHlSpan;
    if (!span || !span.parentNode) { ttsState._activeHlSpan = null; return; }
    try {
        const parent = span.parentNode;
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        parent.removeChild(span);
        parent.normalize();
    } catch (e) {
        // If unwrap fails, just null it out — don't crash
        console.warn('TTS: unwrap span failed (non-fatal)', e);
    }
    ttsState._activeHlSpan = null;
}

// ── TEXT/EPUB: Highlight text from character idx to endIdx ──
function _highlightTextRange(startIdx, endIdx) {
    const el = document.getElementById('reader-text');
    if (!el) return;

    // First remove any existing highlight
    _unwrapActiveSpan();
    // Also remove any paragraph fallback highlights
    el.querySelectorAll('.tts-speaking-para').forEach(p => p.classList.remove('tts-speaking-para'));

    const { map } = _buildTextMap(el);
    let startNode = null, startOff = 0, endNode = null, endOff = 0;

    for (const entry of map) {
        const entryEnd = entry.start + entry.len;
        if (!startNode && entryEnd > startIdx) {
            startNode = entry.node;
            startOff = Math.max(0, startIdx - entry.start);
        }
        if (entryEnd >= endIdx) {
            endNode = entry.node;
            endOff = Math.min(entry.len, endIdx - entry.start);
            break;
        }
    }
    if (!startNode || !endNode) return;

    // Clamp offsets to valid range
    startOff = Math.min(startOff, startNode.textContent.length);
    endOff = Math.min(endOff, endNode.textContent.length);

    try {
        const range = document.createRange();
        range.setStart(startNode, startOff);
        range.setEnd(endNode, endOff);

        // surroundContents fails when range crosses element boundaries
        // Check if start and end are in the same parent element
        if (startNode.parentElement === endNode.parentElement) {
            const span = document.createElement('span');
            span.className = 'tts-hl';
            range.surroundContents(span);
            ttsState._activeHlSpan = span;
            _scrollToEl(span);
        } else {
            // Cross-boundary: use paragraph-level fallback
            const parent = startNode.parentElement;
            if (parent) {
                parent.classList.add('tts-speaking-para');
                _scrollToEl(parent);
            }
        }
    } catch (e) {
        // Last resort fallback — highlight the parent paragraph
        try {
            const parent = startNode.parentElement;
            if (parent) {
                parent.classList.add('tts-speaking-para');
                _scrollToEl(parent);
            }
        } catch (e2) { /* give up highlighting, speech continues */ }
    }
}

function _scrollToEl(el) {
    const readerTextEl = document.getElementById('reader-text');
    if (!readerTextEl || !el) return;
    const scrollParent = readerTextEl.closest('.reader-body') || readerTextEl.parentElement;
    if (!scrollParent || scrollParent.scrollHeight <= scrollParent.clientHeight) return;

    const elRect = el.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    const pad = 100;
    if (elRect.top < parentRect.top + pad || elRect.bottom > parentRect.bottom - pad) {
        const target = el.offsetTop - scrollParent.offsetTop - (scrollParent.clientHeight / 3);
        scrollParent.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }
}

// ── Master clear ──
function clearHighlighting() {
    _stopWatchdog();
    _stopKeepAlive();

    if (ttsState._cloudWordTimer) {
        clearTimeout(ttsState._cloudWordTimer);
        ttsState._cloudWordTimer = null;
    }

    _clearPdfHighlights();
    document.querySelectorAll('.tts-speaking-para').forEach(el => el.classList.remove('tts-speaking-para'));
    _unwrapActiveSpan();

    const readerTextEl = document.getElementById('reader-text');
    if (readerTextEl && ttsState._originalHTML) {
        readerTextEl.innerHTML = ttsState._originalHTML;
        ttsState._originalHTML = '';
    }

    ttsState._chunks = [];
    ttsState._chunkPositions = [];
    ttsState._currentChunkIdx = -1;
    ttsState._hlCharOffset = 0;
    ttsState._pdfCharToSpan = null;
    ttsState._pdfFullText = null;
    ttsState._fullText = '';
}

// ===================== WATCHDOG: Detect silent speech death =====================
// Chrome/Android can silently stop speaking without firing onend or onerror.
// This watchdog checks every 5 seconds: if no boundary events have fired
// and synth isn't speaking, we know it died. Auto-recover cleanly.

function _startWatchdog() {
    _stopWatchdog();
    ttsState._lastBoundaryTime = Date.now();
    ttsState._boundaryCount = 0;

    ttsState._watchdogTimer = setInterval(() => {
        if (!ttsState.isPlaying || ttsState.isPaused) return;

        const isCloud = ttsState.selectedVoice && ttsState.selectedVoice.isCloud;
        if (isCloud) return; // Cloud uses its own audio element, no watchdog needed

        const elapsed = Date.now() - ttsState._lastBoundaryTime;
        const synthSpeaking = ttsState.synth.speaking;
        const synthPaused = ttsState.synth.paused;

        // If synth says it's not speaking and not paused, and we think we're playing → it died
        if (!synthSpeaking && !synthPaused && elapsed > 3000) {
            console.warn('TTS Watchdog: Speech died silently. Auto-recovering...');
            _forceCleanStop();
            return;
        }

        // If synth says speaking but no boundary events for 20+ seconds → likely frozen
        if (synthSpeaking && !synthPaused && elapsed > 20000 && ttsState._boundaryCount > 0) {
            console.warn('TTS Watchdog: No boundary events for 20s. Force-restarting...');
            ttsState.synth.cancel();
            setTimeout(() => {
                if (ttsState.isPlaying) playTTS();
            }, 300);
            return;
        }
    }, 4000);
}

function _stopWatchdog() {
    if (ttsState._watchdogTimer) {
        clearInterval(ttsState._watchdogTimer);
        ttsState._watchdogTimer = null;
    }
}

// ===================== CHROME KEEPALIVE =====================
// Chrome has a bug where speechSynthesis stops after ~15 seconds.
// We pause+resume every 8 seconds to keep it alive.
// Uses OUR state (not browser's) to decide if we should keep going.

function _startKeepAlive() {
    _stopKeepAlive();

    // Only needed on Chrome (not Edge)
    if (!/Chrome/i.test(navigator.userAgent) || /Edge|Edg/i.test(navigator.userAgent)) return;

    ttsState._keepAliveTimer = setInterval(() => {
        // Check OUR state, not the browser's
        if (!ttsState.isPlaying || ttsState.isPaused) {
            _stopKeepAlive();
            return;
        }

        // Only act if synth is actually speaking
        if (ttsState.synth.speaking && !ttsState.synth.paused) {
            try {
                ttsState.synth.pause();
                // Resume after a tiny delay to ensure the pause registered
                setTimeout(() => {
                    if (ttsState.isPlaying && !ttsState.isPaused) {
                        ttsState.synth.resume();
                    }
                }, 50);
            } catch (e) {
                // If pause/resume throws, synth is dead
                console.warn('TTS keepalive error:', e);
            }
        } else if (!ttsState.synth.speaking) {
            // Synth stopped but we think we're playing → watchdog will handle
            _stopKeepAlive();
        }
    }, 8000);
}

function _stopKeepAlive() {
    if (ttsState._keepAliveTimer) {
        clearInterval(ttsState._keepAliveTimer);
        ttsState._keepAliveTimer = null;
    }
}

// ===================== FORCE CLEAN STOP =====================
// Guaranteed clean state reset — called when anything goes wrong
function _forceCleanStop() {
    try { ttsState.synth.cancel(); } catch (e) {}
    if (ttsState._cloudAudio) {
        try { ttsState._cloudAudio.pause(); } catch (e) {}
        ttsState._cloudAudio = null;
    }
    ttsState.isPlaying = false;
    ttsState.isPaused = false;
    ttsState._continuousMode = false;
    ttsState._isTransitioning = false;
    ttsState.currentUtterance = null;
    ttsState._pausedAtChunk = -1;
    clearHighlighting();
    updateTTSButton();
    try { document.getElementById('tts-keepalive-audio')?.pause(); } catch (e) {}
}

// ===================== CHUNKING + SPEAKING =====================
function speakTextWithChunking(text) {
    // Cancel anything currently running
    try { ttsState.synth.cancel(); } catch (e) {}
    if (ttsState._cloudAudio) {
        try { ttsState._cloudAudio.pause(); } catch (e) {}
        ttsState._cloudAudio = null;
    }

    const isCloud = ttsState.selectedVoice && ttsState.selectedVoice.isCloud;
    const isPdf = _isPdfMode();

    // ── Build sentence chunks ──
    const chunks = [];
    const MAX_CHARS = isCloud ? 160 : 250;

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
        // Group 2-3 sentences per chunk to minimize pauses between utterances.
        // Each utterance has ~200-500ms startup overhead, so fewer chunks = smoother flow.
        // Max ~500 chars per chunk keeps it under Chrome's 15-second timeout.
        const GROUP_MAX_CHARS = 500;
        // Sentence split regex supports:
        //   . ! ?          — English/Latin
        //   ।  ॥           — Hindi/Nepali (purna viram, double danda)
        //   。！？          — Chinese/Japanese
        //   ؟              — Arabic question mark
        const sentences = text.match(/[^.!?।॥。！？؟]*[.!?।॥。！？؟]+[\s]*/g);
        let covered = 0;
        if (sentences && sentences.length > 0) {
            let groupBuffer = '';
            for (const sentence of sentences) {
                const trimmed = sentence.trim();
                if (trimmed.length > GROUP_MAX_CHARS) {
                    // Flush buffer first
                    if (groupBuffer.trim()) { chunks.push(groupBuffer.trim()); groupBuffer = ''; }
                    // Split giant sentence by words
                    const words = trimmed.split(/\s+/);
                    let curr = '';
                    for (const w of words) {
                        if ((curr + ' ' + w).length > 250 && curr.length > 0) {
                            chunks.push(curr.trim());
                            curr = w;
                        } else {
                            curr += ' ' + w;
                        }
                    }
                    if (curr.trim()) chunks.push(curr.trim());
                } else if (trimmed.length > 0) {
                    // Would adding this sentence exceed the group limit?
                    if ((groupBuffer + ' ' + trimmed).trim().length > GROUP_MAX_CHARS && groupBuffer.trim()) {
                        chunks.push(groupBuffer.trim());
                        groupBuffer = trimmed;
                    } else {
                        groupBuffer = (groupBuffer + ' ' + trimmed).trim();
                    }
                }
                covered += sentence.length;
            }
            // Flush remaining buffer
            if (groupBuffer.trim()) chunks.push(groupBuffer.trim());
            const remainder = text.substring(covered).trim();
            if (remainder.length > 0) chunks.push(remainder);
        } else {
            // No punctuation — word-split into groups
            const words = text.split(/\s+/);
            let current = '';
            for (const word of words) {
                if ((current + ' ' + word).trim().length > GROUP_MAX_CHARS && current.length > 0) {
                    chunks.push(current.trim());
                    current = word;
                } else {
                    current = (current + ' ' + word).trim();
                }
            }
            if (current.trim()) chunks.push(current.trim());
        }
    }

    if (chunks.length === 0) {
        onPageReadingComplete();
        return;
    }

    // ── Save original state ──
    const readerTextEl = document.getElementById('reader-text');
    if (readerTextEl && !ttsState._originalHTML) {
        ttsState._originalHTML = readerTextEl.innerHTML;
    }
    ttsState._chunks = chunks;
    ttsState._fullText = text;
    ttsState._hlCharOffset = 0;

    // ── PDF: Build char→span index ──
    if (isPdf) {
        _buildPdfCharIndex();
    }

    // ── Build chunk-to-character-offset mapping ──
    const chunkPositions = [];
    let searchFrom = 0;
    const refText = isPdf ? (ttsState._pdfFullText || text) : text;

    for (const chunk of chunks) {
        const idx = refText.indexOf(chunk, searchFrom);
        if (idx >= 0) {
            chunkPositions.push({ start: idx, end: idx + chunk.length });
            searchFrom = idx + chunk.length;
        } else {
            const partial = chunk.substring(0, 20);
            const pIdx = refText.indexOf(partial, searchFrom);
            if (pIdx >= 0) {
                chunkPositions.push({ start: pIdx, end: pIdx + chunk.length });
                searchFrom = pIdx + chunk.length;
            } else {
                chunkPositions.push(null);
            }
        }
    }

    ttsState._chunkPositions = chunkPositions;

    let chunkIndex = 0;

    // Helper: find which chunk index a charIndex falls into
    function getChunkAtChar(charIdx) {
        for (let i = 0; i < chunkPositions.length; i++) {
            const p = chunkPositions[i];
            if (p && charIdx >= p.start && charIdx < p.end) return i;
        }
        for (let i = 0; i < chunkPositions.length; i++) {
            const p = chunkPositions[i];
            if (p && charIdx < p.start) return i;
        }
        return -1;
    }

    // Helper: highlight a chunk by index
    function highlightChunk(idx) {
        if (idx < 0 || idx >= chunkPositions.length) return;
        const pos = chunkPositions[idx];
        if (!pos) return;
        try {
            if (isPdf) {
                _clearPdfHighlights();
                _highlightPdfRange(pos.start, pos.end);
            } else {
                _highlightTextRange(pos.start, pos.end);
            }
        } catch (e) {
            console.warn('TTS highlight error (non-fatal):', e);
        }
        ttsState._currentChunkIdx = idx;
    }

    if (isCloud) {
        // ─── Cloud TTS ───
        function speakNextCloud() {
            if (ttsState._isTransitioning) return;

            if (chunkIndex >= chunks.length) {
                if (isPdf) _clearPdfHighlights();
                else _unwrapActiveSpan();
                onPageReadingComplete();
                return;
            }

            highlightChunk(chunkIndex);

            const tl = ttsState.selectedVoice.lang.substring(0, 2);
            const proxyUrl = `/.netlify/functions/tts-proxy?tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(chunks[chunkIndex])}`;

            const audio = new Audio(proxyUrl);
            audio.playbackRate = ttsState.speed;
            ttsState._cloudAudio = audio;

            audio.onended = () => {
                chunkIndex++;
                if (ttsState.isPlaying && !ttsState.isPaused) speakNextCloud();
            };
            audio.onerror = () => {
                console.error('Cloud TTS chunk failed, skipping');
                chunkIndex++;
                if (ttsState.isPlaying && !ttsState.isPaused) {
                    setTimeout(speakNextCloud, 100);
                } else {
                    _forceCleanStop();
                }
            };

            audio.play().catch(e => {
                console.error('Cloud TTS play error:', e);
                chunkIndex++;
                if (ttsState.isPlaying && !ttsState.isPaused) {
                    setTimeout(speakNextCloud, 200);
                } else {
                    _forceCleanStop();
                }
            });
        }
        speakNextCloud();

    } else {
        // ─── Native voice: CHUNK-BY-CHUNK speaking ───
        // Speaking the full page as one utterance sounds natural on desktop but
        // breaks on mobile (no onboundary events → no highlighting, plus Chrome
        // kills long utterances after ~15 seconds). Instead, we speak one sentence
        // chunk at a time. This guarantees:
        //   1. Each sentence gets highlighted as it's spoken
        //   2. No Chrome 15-second timeout (each chunk is short)
        //   3. Works on ALL devices (no onboundary dependency)

        let nativeChunkIdx = 0;

        function speakNextNativeChunk() {
            if (!ttsState.isPlaying || ttsState.isPaused || ttsState._isTransitioning) return;

            if (nativeChunkIdx >= chunks.length) {
                // All chunks done
                if (isPdf) _clearPdfHighlights();
                else _unwrapActiveSpan();
                onPageReadingComplete();
                return;
            }

            // Highlight current sentence
            highlightChunk(nativeChunkIdx);

            const chunkText = chunks[nativeChunkIdx];
            const utterance = new SpeechSynthesisUtterance(chunkText);
            if (ttsState.selectedVoice && !ttsState.selectedVoice.isCloud) {
                utterance.voice = ttsState.selectedVoice;
            }
            utterance.rate = ttsState.speed;
            utterance.pitch = 1.0;

            // ── Word-level highlighting via onboundary (works on desktop) ──
            let boundaryFired = false;
            const chunkPos = chunkPositions[nativeChunkIdx];

            utterance.onboundary = (event) => {
                if (event.name !== 'word') return;
                boundaryFired = true;
                ttsState._lastBoundaryTime = Date.now();
                ttsState._boundaryCount++;

                // Word-level highlight: offset relative to full page text
                if (!isPdf && chunkPos && ttsState.speed < 1.5) {
                    try {
                        const wordStart = chunkPos.start + event.charIndex;
                        const wordLen = event.charLength ||
                            (chunkText.substring(event.charIndex).match(/^\S+/) || [''])[0].length;
                        const wordEnd = wordStart + wordLen;
                        _unwrapActiveSpan();
                        _highlightTextRange(wordStart, wordEnd);
                    } catch (e) { /* non-fatal */ }
                }
            };

            utterance.onend = () => {
                nativeChunkIdx++;
                ttsState._pausedAtChunk = nativeChunkIdx;

                // Immediately queue the next chunk — no artificial delay
                if (ttsState.isPlaying && !ttsState.isPaused) {
                    speakNextNativeChunk();
                }
            };

            utterance.onerror = (e) => {
                if (e.error === 'canceled' || e.error === 'interrupted') return;
                console.error('TTS chunk error:', e.error, '— skipping chunk');

                // Skip this chunk and try the next one
                nativeChunkIdx++;
                if (ttsState.isPlaying && !ttsState.isPaused) {
                    setTimeout(speakNextNativeChunk, 100);
                } else {
                    _forceCleanStop();
                }
            };

            ttsState.currentUtterance = utterance;

            try {
                ttsState.synth.speak(utterance);
            } catch (e) {
                console.error('TTS speak() threw:', e);
                // Skip and try next
                nativeChunkIdx++;
                if (ttsState.isPlaying && !ttsState.isPaused) {
                    setTimeout(speakNextNativeChunk, 200);
                } else {
                    _forceCleanStop();
                }
            }
        }

        // Start from the first chunk
        speakNextNativeChunk();

        // ── Start keepalive and watchdog ──
        _startKeepAlive();
        _startWatchdog();
    }
}

// ===================== PAGE TURN SYNCHRONIZATION =====================
function onPageReadingComplete() {
    _stopKeepAlive();
    _stopWatchdog();

    if (ttsState.autoTurn && ttsState.isPlaying && !ttsState.isPaused && ttsState._continuousMode) {
        const elapsed = Date.now() - ttsState._pageReadStartTime;
        const remainingWait = Math.max(0, ttsState._minReadTimeMs - elapsed);

        ttsState._isTransitioning = true;

        setTimeout(() => {
            if (!ttsState.isPlaying || ttsState.isPaused) {
                ttsState._isTransitioning = false;
                return;
            }

            clearHighlighting();
            const nextZone = document.getElementById('reader-next-zone');
            if (nextZone) {
                nextZone.click();
            } else {
                _forceCleanStop();
            }
        }, remainingWait);
    } else {
        ttsState.isPlaying = false;
        ttsState._continuousMode = false;
        ttsState._pausedAtChunk = -1;
        updateTTSButton();
    }
}

// ===================== TTS PLAYBACK =====================
function playTTS() {
    // Always fully cancel before starting fresh
    try { ttsState.synth.cancel(); } catch (e) {}
    if (ttsState._cloudAudio) {
        try { ttsState._cloudAudio.pause(); } catch (e) {}
        ttsState._cloudAudio = null;
    }
    _stopKeepAlive();
    _stopWatchdog();

    const text = extractCurrentPageText();
    if (!text || text.length < 3) {
        if (ttsState.autoTurn && ttsState._continuousMode) {
            setTimeout(() => {
                const nextZone = document.getElementById('reader-next-zone');
                if (nextZone) nextZone.click();
            }, 400);
        }
        return;
    }

    if (!ttsState.selectedVoice && ttsState.voices.length > 0) {
        ttsState.selectedVoice = ttsState.voices[0];
    }

    ttsState.isPlaying = true;
    ttsState.isPaused = false;
    ttsState._continuousMode = true;
    ttsState._isTransitioning = false;
    ttsState._pageReadStartTime = Date.now();
    ttsState._pausedAtChunk = -1;
    updateTTSButton();

    speakTextWithChunking(text);

    try { document.getElementById('tts-keepalive-audio')?.play().catch(() => {}); } catch(e) {}
    setupMediaSession();
}

function stopTTS() {
    _forceCleanStop();
}

function toggleTTS() {
    if (!ttsState.isPlaying) {
        // Start fresh
        playTTS();
    } else if (ttsState.isPlaying && !ttsState.isPaused) {
        // ── PAUSE ──
        const isCloud = ttsState.selectedVoice && ttsState.selectedVoice.isCloud;
        if (isCloud) {
            if (ttsState._cloudAudio) ttsState._cloudAudio.pause();
        } else {
            try { ttsState.synth.pause(); } catch (e) {}
        }
        ttsState.isPaused = true;
        _stopKeepAlive();
        _stopWatchdog();
        updateTTSButton();
        try { document.getElementById('tts-keepalive-audio')?.pause(); } catch(e) {}
    } else {
        // ── RESUME ──
        const isCloud = ttsState.selectedVoice && ttsState.selectedVoice.isCloud;
        if (isCloud) {
            if (ttsState._cloudAudio) {
                ttsState._cloudAudio.play().catch(() => {});
            }
            ttsState.isPaused = false;
            updateTTSButton();
        } else {
            // On Android, synth.resume() is broken — it often does nothing.
            // Strategy: try resume first, then check after 500ms if it worked.
            // If not, restart the entire speech (which always works).
            try { ttsState.synth.resume(); } catch (e) {}
            ttsState.isPaused = false;
            updateTTSButton();

            // Verify resume actually worked after a short delay
            setTimeout(() => {
                if (!ttsState.isPlaying || ttsState.isPaused) return;

                // Check if synth is actually speaking
                if (!ttsState.synth.speaking && !ttsState.synth.paused) {
                    // Resume failed! Restart from scratch.
                    console.warn('TTS: resume() failed (Android bug). Restarting...');
                    ttsState.synth.cancel();
                    clearHighlighting();
                    ttsState.isPaused = false;
                    ttsState._isTransitioning = false;

                    // Small delay to let cancel fully process
                    setTimeout(() => {
                        if (ttsState.isPlaying) playTTS();
                    }, 200);
                } else {
                    // Resume worked — restart keepalive and watchdog
                    _startKeepAlive();
                    _startWatchdog();
                }
            }, 500);
        }
        try { document.getElementById('tts-keepalive-audio')?.play().catch(() => {}); } catch(e) {}
    }
}

window._ttsAutoReadAfterTurn = function() {
    if (ttsState.isPlaying && ttsState._continuousMode && !ttsState.isPaused) {
        ttsState._isTransitioning = false;
        setTimeout(() => {
            playTTS();
        }, 300);
    } else {
        ttsState._isTransitioning = false;
    }
};

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
    loadTTSVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadTTSVoices;
    }
    setTimeout(() => { if (!ttsState._voicesLoaded) loadTTSVoices(); }, 2000);

    // Color Picker & Styling Engine — shared between TTS and manual highlight
    const hlBtns = document.querySelectorAll('.hl-color-btn');
    const savedHlHex = localStorage.getItem('hlColor') || '#FF8C42';

    function setHlColor(hex) {
        document.documentElement.style.setProperty('--hl-color', hex);
        const r = parseInt(hex.slice(1,3), 16) || 255;
        const g = parseInt(hex.slice(3,5), 16) || 140;
        const b = parseInt(hex.slice(5,7), 16) || 66;
        document.documentElement.style.setProperty('--hl-color-rgb', `${r}, ${g}, ${b}`);
        localStorage.setItem('hlColor', hex);

        hlBtns.forEach(btn => {
            if (btn.dataset.hlColor === hex) {
                btn.style.borderColor = '#1e293b';
                btn.style.transform = 'scale(1.15)';
            } else {
                btn.style.borderColor = 'transparent';
                btn.style.transform = 'scale(1)';
            }
        });
    }

    setHlColor(savedHlHex);

    hlBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setHlColor(btn.dataset.hlColor);
        });
    });

    document.getElementById('reader-tts-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTTS();
    });

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

    document.getElementById('tts-voice-select')?.addEventListener('change', (e) => {
        const idx = parseInt(e.target.value) || 0;
        ttsState.selectedVoice = ttsState.voices[idx] || null;
        localStorage.setItem('ttsVoiceIdx', String(idx));

        if (ttsState.isPlaying) {
            const wasContinuous = ttsState._continuousMode;
            stopTTS();
            ttsState._continuousMode = wasContinuous;
            ttsState.isPlaying = true;
            setTimeout(() => { playTTS(); }, 100);
        }
    });

    document.getElementById('tts-speed-range')?.addEventListener('input', (e) => {
        ttsState.speed = parseFloat(e.target.value) || 1.0;
        const label = document.getElementById('tts-speed-val');
        if (label) label.textContent = `${ttsState.speed.toFixed(1)}x`;

        if (ttsState.isPlaying) {
            const wasContinuous = ttsState._continuousMode;
            stopTTS();
            ttsState._continuousMode = wasContinuous;
            ttsState.isPlaying = true;
            setTimeout(() => { playTTS(); }, 100);
        }
    });

    document.getElementById('tts-auto-turn-toggle')?.addEventListener('change', (e) => {
        ttsState.autoTurn = e.target.checked;
    });

    document.getElementById('reader-close-btn')?.addEventListener('click', stopTTS);

    document.getElementById('tts-settings-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'tts-settings-modal') {
            e.target.classList.add('hidden');
        }
    });
}

// ===================== DYNAMIC CSS — ReadEra-Style Professional =====================
(function injectTTSStyles() {
    const s = document.createElement('style');
    s.textContent = `
        @keyframes ttsPulseGlow {
            0%   { box-shadow: 0 0 0 0 rgba(var(--hl-color-rgb, 255,140,66), 0.5); }
            70%  { box-shadow: 0 0 0 8px rgba(var(--hl-color-rgb, 255,140,66), 0); }
            100% { box-shadow: 0 0 0 0 rgba(var(--hl-color-rgb, 255,140,66), 0); }
        }
        .tts-pulse {
            animation: ttsPulseGlow 1.5s infinite !important;
            background: rgba(var(--hl-color-rgb, 255,140,66), 0.15) !important;
            color: var(--hl-color, #FF8C42) !important;
        }

        /* ===== ReadEra-Style Sentence Highlight ===== */
        .tts-hl {
            background: rgba(var(--hl-color-rgb, 255, 140, 66), 0.15);
            border-bottom: 2px solid rgba(var(--hl-color-rgb, 255, 140, 66), 0.6);
            border-radius: 2px;
            padding: 1px 0;
            transition: background 0.25s ease, border-color 0.25s ease;
            box-decoration-break: clone;
            -webkit-box-decoration-break: clone;
        }

        /* Paragraph-level fallback */
        .tts-speaking-para {
            background: rgba(var(--hl-color-rgb, 255, 140, 66), 0.08) !important;
            border-left: 3px solid rgba(var(--hl-color-rgb, 255, 140, 66), 0.5);
            padding-left: 8px;
            border-radius: 2px;
            transition: background 0.3s ease;
        }

        /* Dark mode */
        [data-theme="dark"] .tts-hl,
        .dark-mode .tts-hl {
            background: rgba(var(--hl-color-rgb, 255, 150, 80), 0.2);
            border-bottom-color: rgba(var(--hl-color-rgb, 255, 140, 66), 0.8);
        }
        [data-theme="dark"] .tts-speaking-para,
        .dark-mode .tts-speaking-para {
            background: rgba(var(--hl-color-rgb, 255, 150, 80), 0.1) !important;
        }

        /* PDF highlight */
        .pdf-text-layer span.tts-pdf-hl {
            background: rgba(var(--hl-color-rgb, 255, 140, 66), 0.25) !important;
            border-bottom: 2px solid rgba(var(--hl-color-rgb, 255, 140, 66), 0.6) !important;
            border-radius: 2px;
            color: transparent !important;
            z-index: 10;
        }
        [data-theme="dark"] .pdf-text-layer span.tts-pdf-hl,
        .dark-mode .pdf-text-layer span.tts-pdf-hl {
            background: rgba(var(--hl-color-rgb, 255, 150, 80), 0.3) !important;
            border-bottom-color: rgba(var(--hl-color-rgb, 255, 140, 66), 0.8) !important;
        }

        .reader-body {
            scroll-behavior: smooth;
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
