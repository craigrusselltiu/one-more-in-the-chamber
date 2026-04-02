// Minimal service worker for PWA installability.
// A fuller offline-capable service worker (asset caching, background sync)
// is tracked separately in TASKS.md section 3.2.

const CACHE_NAME = 'omitc-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
