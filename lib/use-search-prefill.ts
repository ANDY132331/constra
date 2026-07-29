"use client";

import { useEffect, useState } from "react";

export function useSearchPrefill(href: string): string {
  const [prefill, setPrefill] = useState("");
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("search_prefill");
      if (!raw) return;
      const data = JSON.parse(raw) as { href: string; label: string; ts: number };
      if (data.href !== href) return;
      if (Date.now() - data.ts > 5000) return;
      sessionStorage.removeItem("search_prefill");
      setPrefill(data.label);
    } catch {}
  }, [href]);
  return prefill;
}
