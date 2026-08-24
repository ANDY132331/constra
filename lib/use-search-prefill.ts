"use client";

import { useEffect, useState } from "react";

export function useSearchPrefill(href: string): string {
  const [prefill, setPrefill] = useState("");
  useEffect(() => {
    // Intentional: hydrating from an external system (sessionStorage) on mount/nav,
    // not deriving state from props already available during render.
    try {
      const raw = sessionStorage.getItem("search_prefill");
      if (!raw) return;
      const data = JSON.parse(raw) as { href: string; label: string; ts: number };
      if (data.href !== href) return;
      if (Date.now() - data.ts > 5000) return;
      sessionStorage.removeItem("search_prefill");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrefill(data.label);
    } catch {}
  }, [href]);
  return prefill;
}
