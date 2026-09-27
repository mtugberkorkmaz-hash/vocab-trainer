/* Network-first service worker: whenever the phone is online, it always
 * fetches the latest deployed files and refreshes the cache in the
 * background, so content updates (new words, fixes) show up immediately
 * instead of being stuck behind a stale cache. The cache is only used as a
 * fallback when the network request fails (i.e. actually offline), which is
 * what makes the app work with no connection after the first successful
 * load. Bump CACHE_NAME on any release so old cache entries get cleared out. */
const CACHE_NAME = 'vocab-trainer-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/icons.js',
  './js/storage.js',
  './js/data.js',
  './js/router.js',
  './js/screens.js',
  './js/app.js',
  './data/words.json',
  './data/patterns.json',
  './data/meetings.json',
  './data/lessons.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  // Fetch with cache: 'no-store' — plain cache.addAll() can be satisfied by
  // the browser's own HTTP cache (the static file server here sends no
  // Cache-Control headers), which would seed our offline cache with stale
  // bytes from before a content update.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(
        ASSETS.map((url) =>
          fetch(url, { cache: 'no-store' }).then((res) => cache.put(url, res))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
