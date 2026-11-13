/* Sjømannen – service worker for frakoblet bruk.
   Alt appen trenger ligger i én HTML-fil pluss ikoner, så alt lagres ved
   installering. Ny versjon = nytt navn på hurtigbufferen; den gamle slettes. */
const CACHE = "sjomannen-a42e1090d9f3";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png", "./ms-gann.mp4", "./ms-gann-poster.jpg", "./sjomannen-intro.mp4", "./sjomannen-intro-poster.jpg"];

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
  const range = req.headers.get("range");
  if (range) {
    // Video hentes i biter (Range). Svar med riktig bit fra hurtigbufferen,
    // ellers spiller ikke videoen uten nett i Safari.
    event.respondWith(
      caches.match(url.pathname, { ignoreSearch: true }).then((hit) => {
        if (!hit) return fetch(req);
        return hit.arrayBuffer().then((buf) => {
          const m = /bytes=(\d*)-(\d*)/.exec(range) || [];
          const size = buf.byteLength;
          let start = m[1] ? parseInt(m[1], 10) : 0;
          let end = m[2] ? parseInt(m[2], 10) : size - 1;
          if (!m[1] && m[2]) { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
          end = Math.min(end, size - 1);
          if (start > end || start >= size) {
            return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + size } });
          }
          return new Response(buf.slice(start, end + 1), {
            status: 206,
            headers: {
              "Content-Type": hit.headers.get("Content-Type") || "application/octet-stream",
              "Content-Range": "bytes " + start + "-" + end + "/" + size,
              "Content-Length": String(end - start + 1),
              "Accept-Ranges": "bytes",
            },
          });
        });
      })
    );
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req))
  );
});
