// native-app.js — native Android behaviour for the Capacitor build.
// Runs only when storage.js detected the app (window.ULTRADIAN_NATIVE); the website is untouched.
//   • edge-to-edge: pads around the status/navigation bars (sizes come from the
//     UltradianSystemBars plugin in .github/android/) and picks light/dark bar icons
//   • Android back button: closes the open popup, then goes Home, then minimises the app
//   • light vibration on taps, fade between screens, scroll to top on a new screen
//   • no pinch-zoom, no sticky :hover effects after a tap

(function () {
    if (!window.ULTRADIAN_NATIVE) return;

    const root = document.documentElement;
    const call = (plugin, method, options) => window.ultradianNative(plugin, method, options);
    const quiet = (plugin, method, options) => call(plugin, method, options).catch(() => {});

    function listen(plugin, eventName, callback) {
        const cap = window.Capacitor;
        if (!cap || typeof cap.nativeCallback !== 'function') return;
        try { cap.nativeCallback(plugin, 'addListener', { eventName }, callback); } catch (e) { /* plugin missing */ }
    }

    // ── No pinch-zoom; let the page reach under the system bars ──
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');

    // ── System bar sizes → CSS variables ──
    function applyInsets(d) {
        if (!d || typeof d !== 'object') return;
        root.style.setProperty('--sat', (Number(d.top) || 0) + 'px');
        root.style.setProperty('--sar', (Number(d.right) || 0) + 'px');
        root.style.setProperty('--sab', (Number(d.bottom) || 0) + 'px');
        root.style.setProperty('--sal', (Number(d.left) || 0) + 'px');
        root.classList.toggle('native-keyboard-open', !!d.keyboard);
    }
    call('UltradianSystemBars', 'getInsets').then(applyInsets).catch(() => {});
    listen('UltradianSystemBars', 'insetsChange', applyInsets);

    // ── Status bar icons: dark on light screens, light on dark screens ──
    function parseColor(str) {
        const m = /rgba?\(([^)]+)\)/.exec(str || '');
        if (!m) return null;
        const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }

    function colorBehindStatusBar() {
        let el = document.elementFromPoint(window.innerWidth / 2, 1);
        while (el && el.nodeType === 1) {
            const s = getComputedStyle(el);
            const c = parseColor(s.backgroundColor);
            if (c && c.a > 0.5) return c;
            const g = parseColor(s.backgroundImage); // first colour of a gradient
            if (g && g.a > 0.5) return g;
            el = el.parentElement;
        }
        return { r: 255, g: 255, b: 255, a: 1 };
    }

    let lastDarkIcons = null;
    function updateBarStyle() {
        const c = colorBehindStatusBar();
        const darkIcons = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255 > 0.55;
        if (darkIcons === lastDarkIcons) return;
        lastDarkIcons = darkIcons;
        quiet('UltradianSystemBars', 'setStyle', { darkIcons });
    }

    // ── Popups that cover the screen should stay clear of the system bars ──
    function markSafeAreas(scope) {
        const els = scope.querySelectorAll ? scope.querySelectorAll('*') : [];
        const list = scope.nodeType === 1 ? [scope, ...els] : els;
        for (const el of list) {
            if (el.id === 'main-nav') continue;
            const hasTop = el.classList.contains('native-safe-top');
            const hasBottom = el.classList.contains('native-safe-bottom');
            if (hasTop && hasBottom) continue;
            const s = getComputedStyle(el);
            if (s.position !== 'fixed') continue;
            if (!hasTop && s.top === '0px') {
                el.style.setProperty('--native-pt', s.paddingTop || '0px');
                el.classList.add('native-safe-top');
            }
            if (!hasBottom && s.bottom === '0px') {
                el.style.setProperty('--native-pb', s.paddingBottom || '0px');
                el.classList.add('native-safe-bottom');
            }
        }
    }

    // ── Android back button ──
    function isShown(el) {
        const s = getComputedStyle(el);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.05) return false;
        const r = el.getBoundingClientRect();
        return r.width >= window.innerWidth * 0.5 && r.height >= window.innerHeight * 0.3;
    }

    function topOverlay() {
        let best = null;
        let bestZ = -Infinity;
        for (const el of document.body.querySelectorAll('*')) {
            if (el.id === 'main-nav' || el.classList.contains('page')) continue;
            const s = getComputedStyle(el);
            if (s.position !== 'fixed' || s.pointerEvents === 'none' || !isShown(el)) continue;
            const z = parseInt(s.zIndex, 10) || 0;
            if (z >= bestZ) { best = el; bestZ = z; }
        }
        return best;
    }

    const CLOSE_SELECTOR = [
        '[id*="close" i]', '[class*="close" i]', '[aria-label*="close" i]', '[title*="close" i]',
        '[id*="cancel" i]', '[class*="cancel" i]', '[id*="back-btn" i]', '[class*="back-btn" i]',
        '[class*="btn-back" i]', '[data-dismiss]'
    ].join(',');
    const CLOSE_TEXT = /^(✕|✖|×|x|←|⟵|close|cancel|back|done)$/i;

    function findCloseButton(overlay) {
        const candidates = overlay.querySelectorAll('button, [role="button"], a, span, div, i');
        for (const el of candidates) {
            if (!el.getClientRects().length) continue;
            const text = (el.textContent || '').trim();
            const looksClickable = /^(BUTTON|A)$/.test(el.tagName) || el.getAttribute('role') === 'button' ||
                el.hasAttribute('onclick') || getComputedStyle(el).cursor === 'pointer';
            if (!looksClickable) continue;
            if (el.matches(CLOSE_SELECTOR) || (text.length <= 6 && CLOSE_TEXT.test(text))) return el;
        }
        return null;
    }

    function closeTopOverlay() {
        const overlay = topOverlay();
        if (!overlay) return false;
        const btn = findCloseButton(overlay);
        if (btn) { btn.click(); return true; }
        // Many popups close when the dimmed backdrop itself is tapped
        overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return !isShown(overlay);
    }

    function handleBack() {
        if (closeTopOverlay()) return;
        const active = document.querySelector('.page.active');
        if (active && active.id !== 'main' && typeof window.showPage === 'function') {
            window.showPage('main');
            return;
        }
        call('App', 'minimizeApp').catch(() => quiet('App', 'exitApp'));
    }
    listen('App', 'backButton', handleBack);

    // ── Light vibration on taps ──
    let lastBuzz = 0;
    document.addEventListener('click', (e) => {
        const t = e.target && e.target.closest &&
            e.target.closest('button, .nav-btn, [role="button"], input[type="checkbox"], input[type="radio"]');
        if (!t) return;
        const now = Date.now();
        if (now - lastBuzz < 70) return;
        lastBuzz = now;
        quiet('Haptics', 'impact', { style: 'LIGHT' });
    }, true);

    // ── Screen changes: fade in, start at the top ──
    function wrapShowPage() {
        const original = window.showPage;
        if (typeof original !== 'function' || original.__nativeWrapped) return;
        const wrapped = function (pageId) {
            const before = document.querySelector('.page.active');
            const result = original.apply(this, arguments);
            const after = document.getElementById(pageId);
            if (after && after !== before) {
                after.classList.remove('native-page-enter');
                void after.offsetWidth; // restart the animation
                after.classList.add('native-page-enter');
                window.scrollTo(0, 0);
                markSafeAreas(after); // some screens only become full-screen once active
            }
            setTimeout(updateBarStyle, 60);
            return result;
        };
        wrapped.__nativeWrapped = true;
        window.showPage = wrapped;
    }

    // ── Remove :hover styles: on touch screens they stick after a tap ──
    function splitSelectors(text) {
        const parts = [];
        let depth = 0;
        let start = 0;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (ch === '(' || ch === '[') depth++;
            else if (ch === ')' || ch === ']') depth--;
            else if (ch === ',' && depth === 0) { parts.push(text.slice(start, i)); start = i + 1; }
        }
        parts.push(text.slice(start));
        return parts;
    }

    function stripHover(list, parent) {
        for (let i = list.length - 1; i >= 0; i--) {
            const rule = list[i];
            if (rule.selectorText && rule.selectorText.includes(':hover')) {
                const keep = splitSelectors(rule.selectorText).filter(s => !s.includes(':hover'));
                if (keep.length) rule.selectorText = keep.join(',');
                else { try { parent.deleteRule(i); } catch (e) { /* ignore */ } continue; }
            }
            if (rule.cssRules && rule.cssRules.length) stripHover(rule.cssRules, rule);
        }
    }

    function removeStickyHover() {
        for (const sheet of Array.from(document.styleSheets)) {
            let rules;
            try { rules = sheet.cssRules; } catch (e) { continue; } // cross-origin (fonts)
            if (rules) stripHover(rules, sheet);
        }
    }

    function start() {
        wrapShowPage();
        setTimeout(wrapShowPage, 0); // script.js replaces showPage in its own DOMContentLoaded handler
        window.addEventListener('load', wrapShowPage);
        removeStickyHover();
        markSafeAreas(document.body);
        updateBarStyle();
        setInterval(updateBarStyle, 1500); // popups and themes can change the top colour

        let pending = [];
        let timer = 0;
        new MutationObserver((records) => {
            for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) pending.push(n);
            if (!pending.length) return;
            clearTimeout(timer);
            timer = setTimeout(() => { const nodes = pending; pending = []; nodes.forEach(markSafeAreas); }, 300);
        }).observe(document.body, { childList: true, subtree: true });

        window.addEventListener('load', removeStickyHover); // stylesheets that finished late
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
