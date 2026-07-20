/* ============================================================
   Personal Toolkit — service worker
   Caches the app shell so tools still open offline.
   Bump CACHE_NAME any time files change to force a refresh.
   ============================================================ */

const CACHE_NAME = 'personal-toolkit-v2';

const APP_SHELL = [
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/secure.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './pages/pantry.html',
  './pages/shopping-list.html',
  './pages/calculator.html',
  './pages/notes.html',
  './pages/health.html',
  './pages/loan.html',
  './pages/tip.html',
  './pages/password-gen.html',
  './pages/vault.html',
  './pages/cards.html',
  './pages/convert.html',
  './pages/translate.html',
  './pages/calendar.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first for cross-origin API calls (barcode lookup, translation) so data stays fresh.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // Cache-first for the app shell itself, so it works offline.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => cached);
    })
  );
});
