"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

/**
 * GlobalThemeApplier — mounted once in the root layout inside StoreProvider.
 * Keeps `data-theme` on <html> in sync with the store's theme value everywhere
 * in the app (landing page, login, onboarding, dashboard).
 */
export function ThemeApplier() {
  const { theme } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Animate theme changes only after the first paint, so page loads never fade from dark to light
  useEffect(() => {
    const id = setTimeout(() => document.documentElement.classList.add("theme-ready"), 400);
    return () => clearTimeout(id);
  }, []);

  return null;
}
