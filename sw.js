const CACHE_NAME = 'ultradian-v24';

// ═══ CORE APP SHELL (HTML, CSS, JS) ═══
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css?v=4.0',
  '/script.js?v=4.0',
  '/storage.js',
  '/quotes.js',
  '/tips.js',
  '/tts.js?v=1.0',
  '/advanced_dashboard.js',
  '/daily-challenge.js',
  '/manifest.json'
];

// ═══ 3D, GAMES & FEATURE JS ═══
const FEATURE_ASSETS = [
  '/welcome-3d.js',
  '/castle-3d.js?v=4.5',
  '/hero-landscape-3d.js',
  '/math-missile.js',
  '/pattern-prophet.js',
  '/omniscient.js',
  '/cross-zero.js',
  '/neuro-link.js',
  '/test-proxies.js',
  '/bundle.js'
];

// ═══ ICONS & APP IMAGES ═══
const IMAGE_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/icon_512.png',
  '/ultradian_app_icon_1774120827802.png',
  '/anmol-ai-avatar.jpeg',
  '/welcome-character.png',
  // Hub / Knowledge content images
  '/file_00000000164871fa8242a2f408db55dc.png',
  '/file_000000005c3871fab43858a38fc3b6a8.png',
  '/file_0000000074b4720899d764b82548f222.png',
  '/file_00000000ca207208bab30f2ec889c89f.png'
];

// ═══ MEDITATION & FOCUS AUDIO/VIDEO ═══
// NOT pre-cached (too large ~145MB). They play online and get cached
// on first listen via the fetch handler for future offline use.

// ═══ CDN LIBRARIES (needed for offline) ═══
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
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
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
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

  // ── 4. All other local assets: Cache-first, network fallback ──
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Try without query string as fallback
      const bareUrl = event.request.url.split('?')[0];
      return caches.match(bareUrl).then(fallback => {
        if (fallback) return fallback;

        // Not in cache — fetch from network and cache it
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      });
    }).catch(() => {
      // Last resort: serve index.html for HTML navigation requests
      if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
        return caches.match('/index.html');
      }
    })
  );
});

// ═══════ NOTIFICATION CLICK ═══════
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === location.origin) {
            if ('focus' in client) return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});
