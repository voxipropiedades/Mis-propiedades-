// sw.js V50 - FORCED NETWORK ONLY
const CACHE_NAME = 'voxi-v50';
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
    // Si la URL tiene el parámetro v=, forzamos red
    if (e.request.url.includes('?v=')) {
        e.respondWith(fetch(e.request));
    } else {
        e.respondWith(
            fetch(e.request).catch(() => caches.match(e.request))
        );
    }
});
