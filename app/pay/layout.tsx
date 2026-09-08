"use client";

import { useEffect } from "react";

export default function PayLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (dark: boolean) =>
      document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", handler);
    return () => {
      mq.removeEventListener("change", handler);
      document.documentElement.removeAttribute("data-theme");
    };
  }, []);
  return <>{children}</>;
}
