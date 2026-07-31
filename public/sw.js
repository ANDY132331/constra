const CACHE = "constra-v1";
const OFFLINE_QUEUE_KEY = "constra_offline_queue";

const PRECACHE = ["/dashboard", "/time-tracking", "/schedule", "/crew"];

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
  // Only handle same-origin GET requests
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  // Skip Next.js internal routes
  if (url.pathname.startsWith("/_next/")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Listen for messages from the app (offline clock-in queue sync)
self.addEventListener("message", (e) => {
  if (e.data?.type === "SYNC_QUEUE") {
    e.ports[0]?.postMessage({ type: "QUEUE_ACK" });
  }
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
