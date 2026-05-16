/* Service Worker - 离线缓存 */
var CACHE_NAME = 'vocab-app-v1';
var STATIC_ASSETS = [
  './',
  './index.html',
  './css/reset.css',
  './css/variables.css',
  './css/layout.css',
  './css/components.css',
  './css/pages.css',
  './css/animations.css',
  './js/storage.js',
  './js/speech.js',
  './js/data.js',
  './js/router.js',
  './js/learn.js',
  './js/quiz.js',
  './js/spell.js',
  './js/review.js',
  './js/stats.js',
  './js/app.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/favicon.ico'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; }).map(function(k) { return caches.delete(k); })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request);
    })
  );
});
