// Service worker for full offline play.
// Strategy: precache known static assets on install, cache everything
// same-origin + Google Fonts at runtime, network-first for navigation.

const CACHE_VERSION = 'v2';
const CACHE_NAME = `omitc-${CACHE_VERSION}`;

// Known static assets to precache on install.
// Vite-hashed bundles are cached at runtime on first fetch.
const PRECACHE_URLS = [
  './',
  './manifest.webmanifest',
  './assets/main_menu_bg.png',
  './assets/audio/combat_theme.mp3',
  './assets/audio/main_menu.mp3',
  './icons/favicon-16x16.png',
  './icons/favicon-32x32.png',
  './icons/apple-touch-icon.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip Supabase API calls and other third-party requests
  // (except Google Fonts which we want to cache for offline)
  const isGoogleFonts =
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isGoogleFonts) return;

  // Navigation: network-first, fall back to cached app shell
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // All other same-origin + Google Fonts: cache-first
  event.respondWith(cacheFirst(request));
});

/**
 * Network-first: try network, cache the response, fall back to cache.
 * For navigation requests this ensures fresh HTML on deploy while
 * still working offline.
 */
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch(() => caches.match(request).then((cached) => cached || caches.match('./')));
}

/**
 * Cache-first: return cached response if available, otherwise fetch
 * and cache for next time. Vite assets have content hashes so they
 * are effectively immutable -- cache-first is ideal.
 */
function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => {
      // Only cache valid responses (not errors, not opaque)
      if (response.ok || response.type === 'cors') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    });
  });
}
