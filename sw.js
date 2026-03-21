const CACHE_NAME = 'ultradian-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/quotes.js',
  '/tips.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/ultradian_app_icon_1774120827802.png',
  // Google Fonts - cache the CSS that loads the font files
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600&family=Outfit:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Space+Grotesk:wght@400;600;700&display=swap'
];

// Install: cache all core files
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching core files');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate: clean up old caches
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

// Fetch: serve from cache first, fall back to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never cache API calls (AI chatbot needs internet)
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/.netlify/functions')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // Not in cache - fetch from network and cache it for next time
        return fetch(event.request).then(response => {
          // Only cache successful responses
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        });
      })
      .catch(() => {
        // If both cache and network fail, show offline fallback for HTML pages
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      })
  );
});
