// Sends a crash to /api/client-error so it shows up in the server log. At most a few per page load,
// never throws, and skips errors that don't come from our own code (browser extensions, ad blockers).
let sent = 0;
const seen = new Set<string>();

export function reportError(kind: string, err: unknown, digest?: string) {
  try {
    if (typeof window === "undefined" || sent >= 5) return;
    const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : "Unknown error");
    const stack = e.stack ?? "";
    if (kind !== "boundary" && stack && !stack.includes(window.location.origin) && !stack.includes("/_next/")) return;
    const key = `${kind}:${e.message}`;
    if (seen.has(key)) return;
    seen.add(key);
    sent++;
    const body = JSON.stringify({ kind, message: e.message, stack, digest, path: window.location.pathname });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
    else void fetch("/api/client-error", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch { /* reporting must never break the page */ }
}
