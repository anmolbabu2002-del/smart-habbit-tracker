const CACHE_NAME = 'ultradian-v50';

// ═══ CORE APP SHELL (HTML, CSS, JS) ═══
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css?v=4.0',
  './script.js?v=4.0',
  './safe-html.js',
  './storage.js',
  './native-app.js',
  './native-app.css',
  './native-speech.js',
  './quotes.js',
  './tips.js',
  './tts.js?v=1.0',
  './meditation-scene.js',
  './meditation-scene.css',
  './neural-tts.js',
  './reader-plus.js',
  './reader-plus.css',
  './library-room.js',
  './library-room.css',
  './sound-fx.js',
  './local-db.js',
  './advanced_dashboard.js?v=1.1',
  './daily-challenge.js?v=5.1',
  './manifest.json'
];

// ═══ 3D, GAMES & FEATURE JS ═══
const FEATURE_ASSETS = [
  './welcome-3d.js',
  './castle-3d.js?v=4.5',
  './hero-landscape-3d.js',
  './focus-gym.js',
  './focus-gym.css',
  './habit-reminders.js',
  './habit-reminders.css',
  './habit-proof-dictionary.js',
  './habit-proof.js',
  './habit-proof.css',
  './habit-proof-text.json',
  './vendor/transformers.min.js',
  './vendor/ort-wasm-simd-threaded.jsep.mjs',
  './notify-icons/web/habit_sprout.png',
  './notify-icons/web/habit_hourglass.png',
  './notify-icons/web/habit_flame.png',
  './notify-icons/web/habit_alarm.png',
  './notify-icons/web/badge.png'
];

// ═══ ICONS & APP IMAGES ═══
const IMAGE_ASSETS = [
  './icon-192-v2.png',
  './icon-512-v2.png',
  './anmol-ai-avatar.webp',
  './welcome-character.png'
  // Hub infographics (hub-*.webp) are cached on first view, not pre-cached
];

// ═══ MEDITATION & FOCUS AUDIO/VIDEO ═══
// NOT pre-cached (too large ~145MB). They play online and get cached
// on first listen via the fetch handler for future offline use.

// ═══ CDN LIBRARIES (needed for offline) ═══
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&family=Outfit:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Space+Grotesk:wght@400;600;700&family=Cormorant+Garamond:wght@400;600;700&display=swap'
];

// Combine all except media (media cached lazily to avoid blocking install)
const INSTALL_CACHE = [...CORE_ASSETS, ...FEATURE_ASSETS, ...IMAGE_ASSETS, ...CDN_ASSETS];

// ═══════ INSTALL ═══════
// Cache core assets immediately. Large media files are cached in background
// so the SW installs fast and doesn't time out.
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      console.log('[SW] Caching core assets…');
      // Cache core + CDN (small files) – fail gracefully per-item
      await Promise.allSettled(
        INSTALL_CACHE.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Skip:', url, err.message))
        )
      );

      console.log('[SW] Install complete ✅');
    })
  );
});

// ═══════ ACTIVATE ═══════
// Clean up ALL old caches and claim clients immediately
// Caches owned by the photo check (habit-proof.js): the CLIP model and its engine
const PERMANENT_CACHES = ['transformers-cache', 'photo-proof-engine'];

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        // Photo-check AI downloads are permanent: never delete them on an app update
        keys.filter(key => key !== CACHE_NAME && !PERMANENT_CACHES.includes(key))
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ═══════ FETCH ═══════
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // ── 1. API / Netlify Functions: Network-only (AI chatbot needs internet) ──
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/.netlify/functions')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'You are offline. AI features need internet.' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // ── 2a. Photo-check AI (Hugging Face model, AI engine): habit-proof.js stores these itself
  if (/(^|\.)huggingface\.co$|\.hf\.co$/.test(url.hostname) ||
      (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/@huggingface/transformers'))) {
    return;
  }

  // ── 2. External CDN/fonts: Cache-first (they rarely change) ──
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => {
          // For font CSS, return an empty response so the app doesn't break
          if (event.request.url.includes('fonts.googleapis.com')) {
            return new Response('', { headers: { 'Content-Type': 'text/css' } });
          }
          return new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  // ── 3. Media files (mp3/mp4): Cache-first, stream-friendly ──
  if (/\.(mp3|mp4|ogg|wav|webm)(\?.*)?$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        // Also try without query string
        return caches.match(url.pathname).then(fallback => {
          if (fallback) return fallback;
          // Not cached yet — fetch and cache for next time
          return fetch(event.request).then(response => {
            if (!response || response.status !== 200) return response;
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return response;
          });
        });
      }).catch(() => new Response('', { status: 503, statusText: 'Offline' }))
    );
    return;
  }

  // ── 4. App code (HTML/JS/CSS/JSON): Network-first, cache fallback ──
  // Users always get the latest deploy when online, and the cached copy offline.
  // No more manual CACHE_NAME bumps needed to ship a fix.
  const isCode = event.request.mode === 'navigate' || /\.(html|js|css|json)$/i.test(url.pathname) || url.pathname.endsWith('/');
  if (isCode) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then(cached =>
          cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : new Response('', { status: 503 }))
        )
      )
    );
    return;
  }

  // ── 5. Images & other static files: Cache-first, network fallback ──
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => new Response('', { status: 503, statusText: 'Offline' }))
  );
});

// ═══════ NOTIFICATION CLICK ═══════
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action || 'open';
  const isHabit = data.kind === 'habit';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === location.origin) {
            // Habit reminder: the open app shows your habits (or marks the one left as done)
            if (isHabit) client.postMessage({ type: 'habit-notification', action, data });
            if ('focus' in client) return client.focus();
          }
        }
        if (clients.openWindow) {
          if (!isHabit) return clients.openWindow('./');
          const q = new URLSearchParams({ habit: action, name: data.habit || '', date: data.date || '' });
          return clients.openWindow('./?' + q.toString());
        }
      })
  );
});
