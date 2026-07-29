"use client";

import { createContext, useContext, type ReactNode } from "react";
import locales, { type Locale, type Translations, RTL_LOCALES } from "./locales";

type I18nCtx = {
  locale: Locale;
  t: Translations;
  isRTL: boolean;
};

const Ctx = createContext<I18nCtx>({
  locale: "en",
  t: locales.en,
  isRTL: false,
});

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = locales[locale] ?? locales.en;
  const isRTL = RTL_LOCALES.includes(locale);
  return <Ctx.Provider value={{ locale, t, isRTL }}>{children}</Ctx.Provider>;
}

export function useT(): Translations {
  return useContext(Ctx).t;
}

export function useLocale(): Locale {
  return useContext(Ctx).locale;
}

export function useIsRTL(): boolean {
  return useContext(Ctx).isRTL;
}

/** Replace {key} placeholders in a translation string. */
export function interpolate(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

export type { Locale, Translations };
