// Service Worker minimal — sa seule présence débloque l'installabilité PWA
// (Chrome/Edge exigent un SW enregistré pour proposer "Installer l'application").
// Aucun cache offline pour l'instant, volontairement : l'app nécessite le backend.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Laisse passer toutes les requêtes normalement — pas de mise en cache.
  event.respondWith(fetch(event.request));
});