// sw.js V54 - NUCLEAR CACHE BUST
const CACHE_NAME = 'voxi-v54';
self.addEventListener('install', (e) => {
    self.skipWaiting();
});
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => caches.delete(key))
        )).then(() => self.clients.claim())
    );
});
self.addEventListener('fetch', (e) => {
    // Forzar red para todo, solo usar caché si falla la red
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
