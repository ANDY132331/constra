const CACHE = "constra-v3";

const PRECACHE = ["/", "/dashboard", "/time-tracking", "/schedule", "/crew"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.allSettled(PRECACHE.map((url) => c.add(url)))
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // Never cache API calls or auth endpoints
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Never cache Next.js server-side data fetches
  if (url.pathname.startsWith("/_next/data/")) return;

  // Cache-first for immutable static assets (content-hashed by Next.js build)
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Network-first for everything else (pages, public assets)
  if (e.request.method !== "GET") return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        // Navigation fallback — serve cached dashboard so the app shell still loads
        if (e.request.mode === "navigate") {
          const fallback = await caches.match("/dashboard");
          if (fallback) return fallback;
        }
        return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
      })
  );
});

// ── Web Push ──────────────────────────────────────────────────────────────────

self.addEventListener("push", (e) => {
  if (!e.data) return;
  let data = { title: "Constra", body: "You have a new notification.", url: "/dashboard" };
  try { data = { ...data, ...e.data.json() }; } catch {}

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.title + data.body,
      requireInteraction: false,
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? "/dashboard";
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      const match = cs.find((c) => c.url.includes(self.location.origin) && "focus" in c);
      if (match) return match.focus().then((w) => w.navigate(url));
      return clients.openWindow(url);
    })
  );
});
