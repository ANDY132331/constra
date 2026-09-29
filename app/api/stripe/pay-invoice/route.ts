export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { APP_URL } from "@/lib/email";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// Stripe zero-decimal currencies (no cents — amount is already the smallest unit)
const ZERO_DECIMAL = new Set([
  "BIF","CLP","DJF","GNF","JPY","KMF","KRW","MGA","PYG","RWF",
  "UGX","VND","VUV","XAF","XOF","XPF",
]);

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  // Rate limit by IP — no auth required (this is a public client-facing endpoint)
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`pay-invoice-create:${ip}`, 10, 60_000)) return rateLimitResponse();

  let body: { invoiceId?: string; currency?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { invoiceId, currency = "CAD" } = body;
  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
  }

  // Use service role — clients are unauthenticated, RLS would block them
  const supabase = getAdmin();

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("items, tax_rate, status, company_id")
    .eq("id", invoiceId)
    .single();

  if (invErr || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Only allow payment on sent/overdue invoices
  if (invoice.status === "paid") {
    return NextResponse.json({ error: "Invoice already paid" }, { status: 409 });
  }
  if (invoice.status === "draft") {
    return NextResponse.json({ error: "Invoice not yet sent" }, { status: 403 });
  }

  type DbItem = { qty: number; rate: number };
  const subtotal = (invoice.items as DbItem[] ?? []).reduce((s: number, i: DbItem) => s + i.qty * i.rate, 0);
  const amount: number = subtotal * (1 + Number(invoice.tax_rate ?? 0) / 100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" as any });

  const stripeCurrency = currency.toLowerCase();
  const unitAmount = ZERO_DECIMAL.has(currency.toUpperCase())
    ? Math.round(amount)
    : Math.round(amount * 100);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: stripeCurrency,
            product_data: { name: "Invoice payment" },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: { invoiceId },
      success_url: `${APP_URL}/pay/${invoiceId}/success`,
      cancel_url: `${APP_URL}/pay/${invoiceId}`,
      payment_intent_data: { metadata: { invoiceId } },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
