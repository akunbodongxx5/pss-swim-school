const CACHE_NAME = "pss-v2";
const PRECACHE = ["/", "/jadwal", "/murid", "/pelatih"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableRequest(req) {
  if (req.method !== "GET") return false;
  const url = new URL(req.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.origin !== self.location.origin) return false;
  return true;
}

self.addEventListener("fetch", (e) => {
  if (!isCacheableRequest(e.request)) return;

  const url = new URL(e.request.url);
  if (url.pathname.startsWith("/api/")) return;

  /** Jangan cache bundle Next.js — hash berubah tiap build/dev; cache bikin chunk 404. */
  if (url.pathname.startsWith("/_next/")) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => {
            try {
              return c.put(e.request, clone);
            } catch {
              /* ignore */
            }
          });
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("/")))
  );
});
