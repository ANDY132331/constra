import { timingSafeEqual } from "crypto";

// Small server-side helpers so the same security rules are applied the same way everywhere.

/** Compares two secrets in constant time, so how long the answer takes can't hint at how much matched */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** True when the request carries the scheduled-job secret. Fails closed if no secret is configured. */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`);
}

/**
 * The caller's IP for rate limiting: the first (client) address only. Using the whole
 * x-forwarded-for header would let a caller mint a fresh "identity" per request by stuffing it.
 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (fwd || request.headers.get("x-real-ip") || "unknown").slice(0, 64);
}
