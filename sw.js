// add at top of sw.js or just change cache names
const STATIC_CACHE = "projectvault-static-v2";
const DYNAMIC_CACHE = "projectvault-dynamic-v2";

const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => ![STATIC_CACHE, DYNAMIC_CACHE].includes(key))
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  if (url.hostname.includes("supabase.co")) {
    event.respondWith(fetch(req));
    return;
  }

  if (
    req.destination === "document" ||
    req.destination === "script" ||
    req.destination === "style" ||
    req.destination === "image" ||
    req.destination === "manifest"
  ) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;

        return fetch(req).then(networkRes => {
          const clone = networkRes.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(req, clone));
          return networkRes;
        }).catch(() => {
          if (req.destination === "document") {
            return caches.match("./index.html");
          }
        });
      })
    );
  }
});
