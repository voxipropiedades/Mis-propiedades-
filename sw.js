self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('voxi-hr-v1').then((cache) => cache.addAll([
      '/Mis-propiedades-/',
      '/Mis-propiedades-/index.html',
      '/Mis-propiedades-/manifest.json',
      '/Mis-propiedades-/logo.jpg'
    ])),
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request)),
  );
});
