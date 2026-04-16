const CACHE_NAME = 'familia-martinho-v15';
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
  'https://cdn.jsdelivr.net/npm/@babel/standalone@7/babel.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(['/', '/index.html', '/manifest.json', ...CDN_ASSETS]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls (sync backends): network only, no cache
  if (url.hostname.includes('jsonblob') || url.hostname.includes('npoint') || url.hostname.includes('ntfy')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // CDN assets (React, Babel, Tesseract): cache first (never change)
  if (url.hostname !== self.location.hostname) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      }))
    );
    return;
  }

  // Own files (index.html, manifest, etc): NETWORK FIRST, fallback to cache
  // This ensures updates are always picked up immediately
  event.respondWith(
    fetch(event.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
      return res;
    }).catch(() => caches.match(event.request))
  );
});
