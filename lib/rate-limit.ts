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

/**
 * Rate limit shared across all server instances (Postgres-backed, migration 013).
 * Falls back to the in-memory limiter if the database function isn't available.
 */
export async function rateLimitShared(key: string, max: number, windowMs: number): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return rateLimit(key, max, windowMs);
  }
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/hit_rate_limit`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_key: key, p_max: max, p_window_seconds: Math.ceil(windowMs / 1000) }),
      cache: "no-store",
    });
    if (!res.ok) return rateLimit(key, max, windowMs);
    return (await res.json()) === true;
  } catch {
    return rateLimit(key, max, windowMs);
  }
}
