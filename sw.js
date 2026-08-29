// Legacy stub — replaced by push-only SW in public/sw.js and per-store SW from PWAController.
// Kept as no-op to avoid cache-first stale HTML if ever served. Push handling lives in public/sw.js.
// Do NOT cache HTML here.
self.addEventListener('install', function(event) {
  self.skipWaiting();
});
self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});
// No fetch handler — network-only ensures fresh HTML. Offline fallback is per-store SW responsibility.