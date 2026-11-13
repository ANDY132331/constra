const CACHE = "constra-v9";

const PRECACHE = ["/", "/dashboard", "/time-tracking", "/schedule", "/crew"];

// A signed-out request for an app page redirects to /login. Storing that as the app shell
// would show a login screen to someone who is signed in but offline, so redirects are skipped.
async function cachePage(cache, request, response) {
  if (!response || !response.ok || response.redirected || response.type === "opaqueredirect") return;
  try { await cache.put(request, response); } catch { /* quota */ }
}

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.allSettled(
        PRECACHE.map(async (url) => {
          const res = await fetch(url, { credentials: "same-origin", redirect: "follow" });
          await cachePage(c, url, res);
        })
      )
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

  // Homepage media (the drone flight frames, the ad video, site photos) is for visitors on the
  // website. Keeping it would put tens of MB on every crew phone for nothing the app needs.
  if (/^\/(hero|marketing|site)\//.test(url.pathname)) return;

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
        const clone = res.clone();
        caches.open(CACHE).then((c) => cachePage(c, e.request, clone));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(e.request);
        if (cached) return cached;
        // Navigation fallback — serve cached dashboard so the app shell still loads
        if (e.request.mode === "navigate") {
          // An invoice or estimate not opened before: any one's page works, it reads the id from
          // the address and the data is already on the phone.
          const detail = /^\/(invoices|estimates)\/[^/]+$/.exec(url.pathname);
          const shell = detail && await caches.match(`/${detail[1]}/offline`);
          if (shell) return shell;
          const fallback = await caches.match("/dashboard");
          if (fallback) return fallback;
        }
        return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
      })
  );
});

// Fetches every screen and its code ahead of time, so a page first opened on a job site with no
// signal still loads. Sent by the app once someone is signed in.
const APP_PAGES = ["/invoices/offline", "/estimates/offline", "/dashboard","/time-tracking", "/timesheets", "/crew-plan", "/time-off", "/templates", "/schedule", "/safety", "/messages", "/photos", "/projects", "/tasks", "/punch-list", "/rfis", "/equipment", "/materials", "/documents", "/blueprints", "/daily-reports", "/crew", "/reports", "/estimates", "/invoices", "/change-orders", "/budget", "/insurance", "/settings", "/support"];

async function warmCache() {
  const cache = await caches.open(CACHE);
  const seen = new Set();
  const queue = [];
  const found = (text) => {
    // Code loaded on demand (the camera, PDF export) is only named inside other code files
    for (const match of text.match(/(?:\/_next\/)?static\/(?:chunks|media|css)\/[^"'`\\\s<>)]+/g) ?? []) {
      const asset = match.startsWith("/_next/") ? match : `/_next/${match}`;
      if (!seen.has(asset)) { seen.add(asset); queue.push(asset); }
    }
  };
  await Promise.allSettled(APP_PAGES.map(async (page) => {
    const res = await fetch(page, { credentials: "same-origin" });
    await cachePage(cache, page, res.clone());
    if (res.ok && !res.redirected) found(await res.text());
  }));
  while (queue.length && seen.size < 1000) {
    await Promise.allSettled(queue.splice(0, 8).map(async (asset) => {
      const res = (await cache.match(asset)) ?? await fetch(asset);
      if (!res.ok) return;
      if (!(await cache.match(asset))) await cache.put(asset, res.clone());
      if (/\.js(\?|$)/.test(asset)) found(await res.text());
    }));
  }
}

// Sign-out clears cached app pages so the next person on this device starts clean.
self.addEventListener("message", (e) => {
  if (e.data?.type === "warm-offline") { e.waitUntil(warmCache()); return; }
  if (e.data?.type !== "clear-page-cache") return;
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      for (const req of await c.keys()) {
        if (!new URL(req.url).pathname.startsWith("/_next/static/")) await c.delete(req);
      }
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
      tag: data.tag || data.title + data.body,
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
