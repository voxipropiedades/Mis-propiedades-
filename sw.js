// sw.js V47 - NUCLEAR RESET
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
    // Bypass SW entirely
    return; 
});
