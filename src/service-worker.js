self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  if (url.includes("state-maps")) {
    event.respondWith(
      caches.open("wzos-maps").then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const res = await fetch(event.request);
        cache.put(event.request, res.clone());
        return res;
      })
    );
  }
});
