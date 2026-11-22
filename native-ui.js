/* ==================== NATIVE UI LAYER ====================
 * Makes Ultradian look and behave like an Android app on phones
 * (the installed app, and the website on a phone-sized screen).
 * Desktop is untouched: everything is scoped to <html class="nui">.
 *
 *  • Top app bars: each page's ✕ + heading become a back arrow + title bar
 *  • Android back button: closes popup → game → page → Home → minimises app
 *  • Screen transitions, press feedback, haptics, no zoom / text selection
 *  • Status bar & gesture bar: app draws behind them, padded by real insets
 *
 * Styles live in native-ui.css. Loaded in <head> so the class is set before
 * the first paint; DOM work waits for DOMContentLoaded.
 * ========================================================== */
(function () {
  'use strict';

  const root = document.documentElement;
  const C = window.Capacitor;
  let isNative = false;
  try {
    isNative = !!(C && (typeof C.isNativePlatform === 'function' ? C.isNativePlatform()
      : (typeof C.getPlatform === 'function' && C.getPlatform() !== 'web')));
  } catch (e) { /* web */ }

  const phoneQuery = window.matchMedia('(max-width: 820px) and (pointer: coarse), (max-width: 600px)');
  if (!isNative && !phoneQuery.matches) return;           // desktop: leave everything as it was

  root.classList.add('nui');
  if (isNative) root.classList.add('nui-native');

  // Edge-to-edge viewport, no pinch/double-tap zoom (apps don't zoom)
  const vp = document.querySelector('meta[name="viewport"]');
  if (vp) vp.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');

  // ---------- Native plugin helpers (no bundler) ----------
  function plugin(name) {
    const cap = window.Capacitor;
    return cap && cap.Plugins ? cap.Plugins[name] : null;
  }
  function call(name, method, opts) {
    try {
      const p = plugin(name);
      if (p && typeof p[method] === 'function') return Promise.resolve(p[method](opts || {})).catch(() => null);
    } catch (e) { /* plugin missing */ }
    return Promise.resolve(null);
  }

  // ---------- Haptics ----------
  let lastBuzz = 0;
  function buzz(kind) {
    const now = Date.now();
    if (now - lastBuzz < 40) return;
    lastBuzz = now;
    if (isNative) {
      if (kind === 'select') call('Haptics', 'selectionChanged');
      else call('Haptics', 'impact', { style: kind === 'medium' ? 'MEDIUM' : 'LIGHT' });
    } else if (navigator.vibrate) {
      try { navigator.vibrate(kind === 'medium' ? 12 : 6); } catch (e) { /* ignore */ }
    }
  }
  window.ultradianHaptic = buzz;

  // ---------- Status bar / system bar insets ----------
  function setInsets(top, bottom) {
    if (typeof top === 'number') root.style.setProperty('--nui-top', Math.max(0, top) + 'px');
    if (typeof bottom === 'number') root.style.setProperty('--nui-bottom', Math.max(0, bottom) + 'px');
  }

  function applyInsets(insets) {
    if (!insets) return;
    const top = insets.top || 0;
    // Before Android 15 the WebView stops above the navigation bar; from 15 on it
    // reaches the bottom of the screen. Only pad when the page really goes under it.
    const v = navigator.userAgent.match(/Android (\d+)/);
    const underNavBar = v ? parseInt(v[1], 10) >= 15
      : (screen.height - window.innerHeight) < Math.max(8, (insets.bottom || 0) / 2);
    setInsets(top, underNavBar ? (insets.bottom || 0) : 0);
  }

  function isDarkTheme() {
    const probe = getComputedStyle(document.body || root).getPropertyValue('--text-main').trim()
      || getComputedStyle(document.body || root).color;
    const m = probe.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
    let r, g, b;
    if (m) {
      let h = m[1];
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
    } else {
      const rgb = probe.match(/(\d+)\D+(\d+)\D+(\d+)/);
      if (!rgb) return false;
      r = +rgb[1]; g = +rgb[2]; b = +rgb[3];
    }
    // Light text colour → dark theme
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
  }

  // Pages that always sit on a dark scene, whatever the theme
  const DARK_SCENES = new Set(['meditation-page', 'library-page']);

  function syncStatusBar() {
    const page = document.querySelector('.page.active');
    const gameOpen = document.body.classList.contains('game-active');
    const dark = isDarkTheme() || gameOpen || (page && DARK_SCENES.has(page.id));
    root.classList.toggle('nui-dark', isDarkTheme());
    if (isNative) call('StatusBar', 'setStyle', { style: dark ? 'DARK' : 'LIGHT' });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const bg = getComputedStyle(document.body).backgroundColor;
      if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) meta.setAttribute('content', bg);
    }
  }

  async function initSystemBars() {
    if (!isNative) return;
    await call('StatusBar', 'setOverlaysWebView', { overlay: true });
    const SA = plugin('SafeArea');
    if (SA) {
      const res = await call('SafeArea', 'getSafeAreaInsets');
      if (res && res.insets) applyInsets(res.insets);
      try {
        SA.addListener('safeAreaChanged', data => applyInsets(data && (data.insets || data)));
      } catch (e) { /* older plugin */ }
    } else {
      const info = await call('StatusBar', 'getInfo');
      if (info && info.height) setInsets(info.height, 0);
    }
    syncStatusBar();
  }

  // ---------- Top app bars ----------
  const BACK_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>';

  // Tab pages get a large title and no back arrow
  const TAB_PAGES = new Set(['main', 'dashboard-page', 'anmol-ai-page', 'brain-games-page', 'settings-page']);

  function buildAppBar(page) {
    if (page.querySelector(':scope > .nui-appbar')) return;
    const closeBtn = page.querySelector(':scope > .close-btn, :scope > [id^="close"]');
    const heading = page.querySelector(':scope > h1, :scope > h2');
    if (!closeBtn && !heading) return;

    const bar = document.createElement('header');
    bar.className = 'nui-appbar';

    const isTab = TAB_PAGES.has(page.id);
    if (!isTab) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'nui-back';
      back.setAttribute('aria-label', 'Back');
      back.innerHTML = BACK_ICON;
      back.addEventListener('click', () => { buzz('light'); goBackFromPage(page); });
      bar.appendChild(back);
    } else {
      bar.classList.add('nui-appbar-tab');
    }
    if (closeBtn) closeBtn.classList.add('nui-hidden-close');

    if (heading) {
      heading.classList.add('nui-title');
      bar.appendChild(heading);              // move, so code that renames it keeps working
    }

    // Keep page-specific action buttons (e.g. streak settings) in the bar
    const action = page.querySelector(':scope > .streak-settings-btn');
    if (action) { action.classList.add('nui-action'); bar.appendChild(action); }

    page.insertBefore(bar, page.firstChild);
  }

  function addDashboardTitle() {
    const page = document.getElementById('dashboard-page');
    if (!page || page.querySelector(':scope > .nui-appbar')) return;
    const bar = document.createElement('header');
    bar.className = 'nui-appbar nui-appbar-tab';
    const h = document.createElement('h1');
    h.className = 'nui-title';
    h.textContent = 'Dashboard';
    bar.appendChild(h);
    page.insertBefore(bar, page.firstChild);
  }

  function buildGamesTitle() {
    const hub = document.getElementById('games-hub-view');
    if (!hub || hub.querySelector(':scope > .nui-appbar')) return;
    const title = hub.querySelector(':scope > .page-title');
    if (!title) return;
    const bar = document.createElement('header');
    bar.className = 'nui-appbar nui-appbar-tab';
    title.classList.add('nui-title');
    bar.appendChild(title);
    hub.insertBefore(bar, hub.firstChild);
  }

  // Detail screens (anything that isn't a bottom tab) hide the tab bar
  function syncDetail() {
    const active = document.querySelector('.page.active');
    root.classList.toggle('nui-detail', !!active && !TAB_PAGES.has(active.id));
  }

  // App bar gets a tinted surface once content scrolls under it
  let scrollRaf = 0;
  function onScroll() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      root.classList.toggle('nui-scrolled', window.scrollY > 4);
    });
  }

  // ---------- Navigation: transitions + back stack ----------
  let currentPage = 'main';

  function goBackFromPage(page) {
    const closeBtn = page.querySelector('.nui-hidden-close');
    navDirection('back');
    // The original close button runs the page's own clean-up (stop timers, sounds…)
    if (closeBtn && closeBtn.id !== 'closeStreak' && closeBtn.id !== 'closeSettings') closeBtn.click();
    if (document.querySelector('.page.active') === page && typeof window.showPage === 'function') {
      window.showPage('main');
    }
  }

  function navDirection(dir) {
    root.setAttribute('data-nav', dir);
    clearTimeout(navDirection._t);
    navDirection._t = setTimeout(() => root.setAttribute('data-nav', 'none'), 450);
  }

  function wrapShowPage() {
    const original = window.showPage;
    if (typeof original !== 'function' || original.__nui) return;
    const wrapped = function (pageId) {
      const from = currentPage;
      if (root.getAttribute('data-nav') !== 'back') {
        if (TAB_PAGES.has(pageId) && TAB_PAGES.has(from)) navDirection('tab');
        else if (TAB_PAGES.has(pageId) && !TAB_PAGES.has(from)) navDirection('back');
        else navDirection('forward');
      }
      const result = original.apply(this, arguments);
      if (pageId !== from) {
        currentPage = pageId;
        window.scrollTo(0, 0);
        root.classList.remove('nui-scrolled');
      }
      syncDetail();
      syncStatusBar();
      return result;
    };
    wrapped.__nui = true;
    window.showPage = wrapped;
  }

  // Visible (not display:none / hidden / transparent) at all?
  function isShown(el) {
    if (!el || el.disabled || el.getAttribute('data-strict-disabled') === 'true') return false;
    if (el.closest('.nav-bar, .nui-appbar')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && +cs.opacity !== 0;
  }

  // On screen and not covered by something else? (Off-screen = scrolled away: allowed.)
  function notCovered(el) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return true;
    const hit = document.elementFromPoint(x, y);
    return !!hit && (hit === el || el.contains(hit));
  }

  const DISMISS_SELECTOR = [
    '[id^="back-to-hub"]', '.back-btn', '[id^="close"]', '[id$="-close"]', '[id*="close-"]',
    '.close-btn', '[class*="close-btn"]', '[class*="modal-close"]', '[aria-label="Close"]',
    '[id*="cancel"]', '[id*="Cancel"]', '[title^="Close"]', '[title="Back"]'
  ].join(',');

  function looksLikeDismiss(el) {
    const t = (el.textContent || '').trim();
    return el.matches(DISMISS_SELECTOR) || /^(✕|×|✖|←|⬅|‹)/.test(t) || /^(close|cancel|back|done)\b/i.test(t);
  }

  const LAYER_SELECTOR = '[class*="overlay"], [class*="modal"], [id$="-view"], [class*="reader"], ' +
    '[class*="sheet"], [class*="drawer"], [class*="popup"], [class*="editor"], [role="dialog"], .page';

  // The top-most thing on screen: a dialog, sheet, game screen… or the page itself
  function topLayer() {
    const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    if (!hit || hit === document.body || hit === root) return null;
    let layer = hit.closest(LAYER_SELECTOR);
    // Prefer the outermost overlay-like ancestor below the page (a modal's card is
    // inside its overlay; the overlay holds the close button)
    while (layer && !layer.classList.contains('page')) {
      const up = layer.parentElement && layer.parentElement.closest(LAYER_SELECTOR);
      if (!up || up.classList.contains('page')) break;
      layer = up;
    }
    return layer;
  }

  function findDismissButton() {
    const layer = topLayer();
    if (!layer || layer.classList.contains('page')) {
      // Nothing over the page. Game screens sit beside the page, not in it.
      return null;
    }
    const buttons = Array.from(layer.querySelectorAll('button, [role="button"], a, ' + DISMISS_SELECTOR))
      .filter(el => !el.classList.contains('nui-hidden-close') && isShown(el) && looksLikeDismiss(el) && notCovered(el));
    // Prefer explicit close/back ids over generic "Done"/"Cancel" text
    buttons.sort((a, b) => (b.matches(DISMISS_SELECTOR) ? 1 : 0) - (a.matches(DISMISS_SELECTOR) ? 1 : 0));
    return buttons[0] || null;
  }

  function handleBack() {
    // Strict focus mode keeps its "press back 5 times" rule
    // strictFocusActive is a top-level `let` in script.js, so it isn't on window
    let strict = false;
    try { strict = typeof strictFocusActive !== 'undefined' && strictFocusActive; } catch (e) { /* not loaded */ }
    if (strict || document.body.classList.contains('strict-focus')) {
      if (typeof window.strictPopstateHandler === 'function') window.strictPopstateHandler({});
      return;
    }
    // Open dropdown menus / More drawer
    const drawer = document.getElementById('more-drawer-overlay');
    if (drawer && drawer.classList.contains('visible')) { drawer.classList.remove('visible'); return; }
    const openMenu = document.querySelector('.menu-dropdown:not(.hidden)');
    if (openMenu) { openMenu.classList.add('hidden'); return; }

    const btn = findDismissButton();
    if (btn) { navDirection('back'); btn.click(); buzz('light'); return; }
    // A popup with no close button: tap its backdrop, which most popups here close on
    const layer = topLayer();
    if (layer && !layer.classList.contains('page') && /overlay|modal/i.test(layer.className || '')) {
      layer.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      buzz('light');
      return;
    }

    const active = document.querySelector('.page.active');
    if (active && active.id !== 'main') {
      buzz('light');
      if (TAB_PAGES.has(active.id)) { navDirection('back'); window.showPage('main'); }
      else goBackFromPage(active);
      return;
    }
    call('App', 'minimizeApp');
  }

  function initBackButton() {
    window.ultradianBack = handleBack;
    if (!isNative) return;
    const App = plugin('App');
    if (!App || typeof App.addListener !== 'function') return;
    try { App.addListener('backButton', handleBack); } catch (e) { /* no-op */ }
  }

  // ---------- Press feedback & haptics on taps ----------
  const HAPTIC_TARGETS = '.nav-btn, .sp-item, .game-card, .theme-btn, .tracker-tab, .timer-type-btn, ' +
    '.preset-btn, .water-btn, .mood-btn, .nui-back, .menu-btn, #plus, #habit-plus, .dc-btn-done, ' +
    '.settings-toggle-row input, .switch input, [class*="toggle"] input';

  function initTouch() {
    document.addEventListener('click', e => {
      const t = e.target.closest && e.target.closest(HAPTIC_TARGETS);
      if (t) buzz(t.classList.contains('nav-btn') ? 'select' : 'light');
    }, true);
    // Long-press should not open the browser's link/image menu
    document.addEventListener('contextmenu', e => {
      if (!e.target.closest('input, textarea, [contenteditable="true"], .nui-selectable')) e.preventDefault();
    });
  }

  // ---------- Boot ----------
  function boot() {
    document.querySelectorAll('.page').forEach(buildAppBar);
    addDashboardTitle();
    buildGamesTitle();
    initTouch();
    window.addEventListener('scroll', onScroll, { passive: true });
    const active = document.querySelector('.page.active');
    if (active) currentPage = active.id;
    syncDetail();

    // script.js re-wraps showPage inside its own DOMContentLoaded; wrap after that
    setTimeout(wrapShowPage, 0);
    window.addEventListener('load', wrapShowPage);

    initBackButton();
    initSystemBars();
    syncStatusBar();
    // Theme changes replace body.className: follow them
    new MutationObserver(syncStatusBar).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
