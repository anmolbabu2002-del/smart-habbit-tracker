const CACHE_NAME = 'ultradian-v10';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css?v=3.0',
  '/script.js?v=4.0',
  '/storage.js',
  '/castle-3d.js?v=3.0',
  '/math-missile.js',
  '/pattern-prophet.js',
  '/omniscient.js',
  '/cross-zero.js',
  '/quotes.js',
  '/tips.js',
  'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/ultradian_app_icon_1774120827802.png',
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

// Activate: clean up old caches and take over immediately
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
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'You are offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Try without query string as fallback
        const urlWithoutQuery = event.request.url.split('?')[0];
        return caches.match(urlWithoutQuery).then(fallbackResponse => {
          if (fallbackResponse) {
            return fallbackResponse;
          }

          // Not in cache at all - fetch from network and cache it
          return fetch(event.request).then(response => {
            if (!response || response.status !== 200) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
            return response;
          });
        });
      })
      .catch(() => {
        // If everything fails and it's an HTML request, serve index.html
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      })
  );
});

// Notification click behavior: focus window or open start URL
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // If the app is already open, focus the tab
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === location.origin) {
            if ('focus' in client) return client.focus();
          }
        }
        // If not open, open a new window at the start URL
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});
