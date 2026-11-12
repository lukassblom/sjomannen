/* Sjømannen – service worker for frakoblet bruk.
   Alt appen trenger ligger i én HTML-fil pluss ikoner, så alt lagres ved
   installering. Ny versjon = nytt navn på hurtigbufferen; den gamle slettes. */
const CACHE = "sjomannen-6e6d4fc6b811";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("sjomannen-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    // Sidevisning: svar fra hurtigbufferen (virker uten nett), ellers nett.
    event.respondWith(
      caches.match("./index.html").then((hit) => hit || fetch(req))
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req))
  );
});
