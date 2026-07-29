export type CurrencyCode =
  | "USD" | "CAD" | "EUR" | "GBP" | "AUD" | "NZD"
  | "JPY" | "CNY" | "INR" | "MXN" | "BRL" | "CHF"
  | "SGD" | "HKD" | "AED" | "SAR" | "ZAR" | "NGN"
  | "KES" | "SEK" | "NOK" | "DKK" | "PLN" | "TRY"
  | "KRW" | "TWD" | "THB" | "IDR" | "PHP" | "MYR";

type CurrencyMeta = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  locale: string;
  flag: string;
};

export const CURRENCIES: CurrencyMeta[] = [
  { code: "USD", name: "US Dollar",          symbol: "$",  locale: "en-US", flag: "🇺🇸" },
  { code: "CAD", name: "Canadian Dollar",    symbol: "C$", locale: "en-CA", flag: "🇨🇦" },
  { code: "EUR", name: "Euro",               symbol: "€",  locale: "de-DE", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound",      symbol: "£",  locale: "en-GB", flag: "🇬🇧" },
  { code: "AUD", name: "Australian Dollar",  symbol: "A$", locale: "en-AU", flag: "🇦🇺" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$",locale: "en-NZ", flag: "🇳🇿" },
  { code: "JPY", name: "Japanese Yen",       symbol: "¥",  locale: "ja-JP", flag: "🇯🇵" },
  { code: "CNY", name: "Chinese Yuan",       symbol: "¥",  locale: "zh-CN", flag: "🇨🇳" },
  { code: "INR", name: "Indian Rupee",       symbol: "₹",  locale: "en-IN", flag: "🇮🇳" },
  { code: "MXN", name: "Mexican Peso",       symbol: "MX$",locale: "es-MX", flag: "🇲🇽" },
  { code: "BRL", name: "Brazilian Real",     symbol: "R$", locale: "pt-BR", flag: "🇧🇷" },
  { code: "CHF", name: "Swiss Franc",        symbol: "Fr", locale: "de-CH", flag: "🇨🇭" },
  { code: "SGD", name: "Singapore Dollar",   symbol: "S$", locale: "en-SG", flag: "🇸🇬" },
  { code: "HKD", name: "Hong Kong Dollar",   symbol: "HK$",locale: "zh-HK", flag: "🇭🇰" },
  { code: "AED", name: "UAE Dirham",         symbol: "د.إ",locale: "ar-AE", flag: "🇦🇪" },
  { code: "SAR", name: "Saudi Riyal",        symbol: "﷼",  locale: "ar-SA", flag: "🇸🇦" },
  { code: "ZAR", name: "South African Rand", symbol: "R",  locale: "en-ZA", flag: "🇿🇦" },
  { code: "NGN", name: "Nigerian Naira",     symbol: "₦",  locale: "en-NG", flag: "🇳🇬" },
  { code: "KES", name: "Kenyan Shilling",    symbol: "KSh",locale: "en-KE", flag: "🇰🇪" },
  { code: "SEK", name: "Swedish Krona",      symbol: "kr", locale: "sv-SE", flag: "🇸🇪" },
  { code: "NOK", name: "Norwegian Krone",    symbol: "kr", locale: "nb-NO", flag: "🇳🇴" },
  { code: "DKK", name: "Danish Krone",       symbol: "kr", locale: "da-DK", flag: "🇩🇰" },
  { code: "PLN", name: "Polish Złoty",       symbol: "zł", locale: "pl-PL", flag: "🇵🇱" },
  { code: "TRY", name: "Turkish Lira",       symbol: "₺",  locale: "tr-TR", flag: "🇹🇷" },
  { code: "KRW", name: "South Korean Won",   symbol: "₩",  locale: "ko-KR", flag: "🇰🇷" },
  { code: "TWD", name: "Taiwan Dollar",      symbol: "NT$",locale: "zh-TW", flag: "🇹🇼" },
  { code: "THB", name: "Thai Baht",          symbol: "฿",  locale: "th-TH", flag: "🇹🇭" },
  { code: "IDR", name: "Indonesian Rupiah",  symbol: "Rp", locale: "id-ID", flag: "🇮🇩" },
  { code: "PHP", name: "Philippine Peso",    symbol: "₱",  locale: "en-PH", flag: "🇵🇭" },
  { code: "MYR", name: "Malaysian Ringgit",  symbol: "RM", locale: "ms-MY", flag: "🇲🇾" },
];

const META_MAP: Partial<Record<CurrencyCode, CurrencyMeta>> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, c])
);

/**
 * Format a number as a currency string using Intl.NumberFormat.
 * Falls back gracefully if the locale is not supported.
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "USD",
  opts?: { compact?: boolean; decimals?: number }
): string {
  const meta = META_MAP[currency];
  const locale = meta?.locale ?? "en-US";
  const { compact = false, decimals } = opts ?? {};

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: decimals ?? (compact ? 0 : undefined),
      maximumFractionDigits: decimals ?? (compact ? 1 : undefined),
    });
    return formatter.format(amount);
  } catch {
    // Fallback for unsupported environments
    const symbol = meta?.symbol ?? "$";
    return `${symbol}${amount.toLocaleString()}`;
  }
}

/** Short compact version: $1.2M, $450K, etc. */
export function formatCurrencyCompact(amount: number, currency: CurrencyCode = "USD"): string {
  return formatCurrency(amount, currency, { compact: true });
}

/** Get the symbol for a currency code. */
export function getCurrencySymbol(currency: CurrencyCode): string {
  return META_MAP[currency]?.symbol ?? currency;
}

/** Get metadata for a currency code. */
export function getCurrencyMeta(currency: CurrencyCode): CurrencyMeta | undefined {
  return META_MAP[currency];
}
