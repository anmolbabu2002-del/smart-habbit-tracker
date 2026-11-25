// Ultradian service worker (website only; the Android app has its files on the phone).
// Code: network first, so a new version shows up straight away; the cached copy works offline.
// Built files in /assets have unique names, so they're cached forever. Sounds are cached on
// first play. The photo-check AI manages its own storage and is never deleted here.
const CACHE = 'ultradian-v2';
const PERMANENT = ['transformers-cache', 'photo-proof-engine'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './manifest.json'])).catch(() => {}));
});

self.addEventListener('activate', e => {
  // Clears the old app's caches too (ultradian-v52 and earlier)
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && !PERMANENT.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                      // CDNs, AI model, book APIs
  if (url.pathname.startsWith('/.netlify/')) return;                 // AI, book proxy: always live

  const put = (res) => { if (res && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/media/') || url.pathname.startsWith('/vendor/')) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(put)));
    return;
  }
  e.respondWith(fetch(req).then(put).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : new Response('', { status: 503 })))));
});
