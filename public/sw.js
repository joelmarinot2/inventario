// Service worker mínimo: hace la app instalable y SIEMPRE va a la red, para
// no quedar nunca con una versión vieja. No guarda copia de HTML ni de JS.
const CACHE = "inventario-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Borra cualquier caché vieja (versiones anteriores de la app).
      const claves = await caches.keys();
      await Promise.all(claves.map((c) => caches.delete(c)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: red primero; si no hay internet, intenta lo que haya en caché.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
  }
});
