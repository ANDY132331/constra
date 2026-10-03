// One place for invoice/estimate money math, so the screen, PDFs, emails and the Stripe
// charge always agree to the cent.
//
// Each line is rounded to the cent (half-up), the subtotal is the sum of those lines, tax is
// rounded once on the subtotal, and the total is subtotal + tax. That way the printed lines
// always add up to the printed total.

type Num = number | string | null | undefined;

const num = (v: Num) => {
  const n = typeof v === "string" ? parseFloat(v) : v ?? 0;
  return Number.isFinite(n) ? (n as number) : 0;
};

/** Round to cents, half away from zero. The tiny nudge absorbs float error (2.5 × 19.99 = 49.974999…). */
export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0;
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * 100 + 1e-6)) / 100;
}

export function lineAmount(qty: Num, rate: Num): number {
  return roundMoney(num(qty) * num(rate));
}

export function moneyTotals(items: { qty: Num; rate: Num }[] | null | undefined, taxRate: Num) {
  const subtotal = roundMoney((items ?? []).reduce((s, i) => s + lineAmount(i.qty, i.rate), 0));
  const tax = roundMoney(subtotal * (num(taxRate) / 100));
  return { subtotal, tax, total: roundMoney(subtotal + tax) };
}
