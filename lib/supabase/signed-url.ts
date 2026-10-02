"use client";

import { useEffect, useState } from "react";

const PRIVATE_BUCKETS = ["documents", "clock-photos", "project-photos"];
const cache = new Map<string, { url: string; expires: number }>();

// Stored URLs look like .../storage/v1/object/public/{bucket}/{path}; private buckets
// reject those, so they have to be swapped for a signed link before use.
function parsePrivate(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
  if (!m || !PRIVATE_BUCKETS.includes(m[1])) return null;
  return { bucket: m[1], path: decodeURIComponent(m[2]) };
}

export async function resolveFileUrl(url: string | undefined | null): Promise<string | undefined> {
  if (!url) return undefined;
  const target = parsePrivate(url);
  if (!target) return url;
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.url;
  const res = await fetch("/api/storage/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(target),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't open file");
  const { url: signed, expiresIn } = await res.json();
  cache.set(url, { url: signed, expires: Date.now() + (expiresIn - 120) * 1000 });
  return signed;
}

/** Returns a URL the browser can load, or undefined while a signed link is being fetched. */
export function useFileUrl(url: string | undefined | null): { url: string | undefined; error: string | null } {
  const needsSigning = !!url && !!parsePrivate(url);
  const [state, setState] = useState<{ src: string | null | undefined; url?: string; error: string | null }>({ src: null, error: null });

  useEffect(() => {
    if (!url || !needsSigning) return;
    let cancelled = false;
    resolveFileUrl(url)
      .then((u) => { if (!cancelled) setState({ src: url, url: u, error: null }); })
      .catch((e: Error) => { if (!cancelled) setState({ src: url, url: undefined, error: e.message }); });
    return () => { cancelled = true; };
  }, [url, needsSigning]);

  if (!url) return { url: undefined, error: null };
  if (!needsSigning) return { url, error: null };
  return state.src === url ? { url: state.url, error: state.error } : { url: undefined, error: null };
}
