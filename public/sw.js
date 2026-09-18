// Service worker mínimo: hace la app instalable y cachea el "esqueleto"
// estático. Los datos siempre se piden por la red (no hay modo sin conexión).
const CACHE = "inventario-v1";
const ESTATICOS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ESTATICOS)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Nunca cachear llamadas a Supabase ni de otro origen.
  if (url.origin !== self.location.origin) return;

  // Iconos y manifest: cache primero.
  if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req)),
    );
    return;
  }

  // Navegación: red primero, con respaldo al esqueleto cacheado si no hay internet.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/").then((r) => r || Response.error())),
    );
  }
});
