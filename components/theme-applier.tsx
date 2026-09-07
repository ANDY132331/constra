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

  return null;
}
