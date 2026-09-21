// Service worker mínimo: hace la app instalable y SIEMPRE va a la red, para
// no quedar nunca con una versión vieja. No guarda copia de HTML ni de JS
// (no hay modo sin conexión: la app avisa "No hay internet" en pantalla).
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Borra cualquier caché que hayan dejado versiones anteriores.
      const claves = await caches.keys();
      await Promise.all(claves.map((c) => caches.delete(c)));
      await self.clients.claim();
    })(),
  );
});

// Un manejador de fetch es requisito para que el navegador ofrezca "Instalar".
// Pasa las peticiones tal cual a la red.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || req.mode !== "navigate") return;
  event.respondWith(fetch(req));
});
