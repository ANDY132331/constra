"use client";

import { useEffect } from "react";

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const html = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (dark: boolean) => {
      if (dark) html.classList.add("dark");
      else html.classList.remove("dark");
    };
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", handler);
    return () => {
      html.classList.add("dark"); // restore app-wide default
      mq.removeEventListener("change", handler);
    };
  }, []);

  return <>{children}</>;
}
