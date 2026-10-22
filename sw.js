/* Service worker — 2026년 재물조사 (offline-first static app) */
const CACHE_NAME = 'jaemul-v4';
const PRECACHE_URLS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'vendor/tailwindcss.js',
  'vendor/html5-qrcode.min.js',
  'vendor/barcode-detector.js',
  'vendor/zxing_reader.wasm',
  'vendor/cp949.js'
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
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Pages: network-first so updates show up; cached copy when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((response) => {
        if (response && response.ok) {
          // Only the app shell is stored as index.html; other pages (selftest.html) are cached under their own URL
          const path = new URL(req.url).pathname;
          const isApp = path.endsWith('/') || path.endsWith('/index.html');
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(isApp ? 'index.html' : req, copy));
        }
        return response;
      }).catch(() => {
        const path = new URL(req.url).pathname;
        const isApp = path.endsWith('/') || path.endsWith('/index.html');
        return (isApp ? caches.match('index.html') : caches.match(req))
          .then((cached) => cached || caches.match('index.html'))
          .then((cached) => cached || caches.match('./'));
      })
    );
    return;
  }

  // Assets: cache-first, network fallback.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((response) => {
        if (response && response.ok && new URL(req.url).origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      }).catch(() => Response.error());
    })
  );
});
