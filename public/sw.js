/*
 * Context Tree's service worker. It makes the app installable and shows a page when offline.
 *
 * It must never store private data: pages, API replies and anything from a signed-in session go
 * straight to the network and are never cached, so nothing outlives sign-out on a shared computer.
 * Only files that are the same for everyone are kept: hashed build files, icons, the offline page.
 */
const CACHE = 'ct-shell-v1';
const OFFLINE = '/offline.html';
const PRECACHE = [OFFLINE, '/icons/icon-192.png', '/icons/icon-512.png'];

/** 'static': cache first. 'navigate': network, then the offline page. 'network': hands off. */
function strategyFor(url, request, origin) {
  if (request.method !== 'GET' || url.origin !== origin) return 'network';
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) return 'static';
  if (request.mode === 'navigate') return 'navigate';
  return 'network';
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const strategy = strategyFor(new URL(event.request.url), event.request, self.location.origin);
  if (strategy === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
  } else if (strategy === 'static') {
    event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request).then((reply) => {
      if (reply.ok) {
        const copy = reply.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      }
      return reply;
    })));
  }
});
