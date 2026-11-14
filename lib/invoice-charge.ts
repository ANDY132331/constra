import { moneyTotals } from "./money";

// What an invoice should cost on a card, worked out only from our own database. The checkout
// route uses it to create the charge and the webhook uses it to confirm what was actually paid,
// so neither the browser nor a crafted request can change the amount or currency.

// Stripe zero-decimal currencies: the amount is already the smallest unit
const ZERO_DECIMAL = new Set(["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"]);

export type ChargeRow = { items: unknown; tax_rate: number | string | null; companies?: { currency?: string | null } | { currency?: string | null }[] | null };

export function expectedCharge(inv: ChargeRow): { unitAmount: number; currency: string } {
  const co = Array.isArray(inv.companies) ? inv.companies[0] : inv.companies;
  const currency = (co?.currency || "CAD").toUpperCase();
  const total = moneyTotals(inv.items as { qty: number; rate: number }[], inv.tax_rate).total;
  return { unitAmount: ZERO_DECIMAL.has(currency) ? Math.round(total) : Math.round(total * 100), currency: currency.toLowerCase() };
}
