// Simple in-memory rate limiter for API routes.
// Resets on cold start; good enough for a Node.js serverless context.

const store = new Map<string, { count: number; reset: number }>();

// Prune stale entries every 5 minutes to avoid unbounded growth.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (now > v.reset) store.delete(k);
    }
  }, 5 * 60 * 1000);
}

/**
 * Returns true if the request is within the rate limit, false if it should be blocked.
 * @param key    A string key (e.g. IP + route)
 * @param max    Max requests per window
 * @param windowMs  Window duration in milliseconds
 */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }

  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export function rateLimitResponse() {
  return new Response(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": "60" },
  });
}
