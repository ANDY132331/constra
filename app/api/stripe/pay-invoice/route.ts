export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { APP_URL } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

// Stripe zero-decimal currencies (no cents — amount is already the smallest unit)
const ZERO_DECIMAL = new Set([
  "BIF","CLP","DJF","GNF","JPY","KMF","KRW","MGA","PYG","RWF",
  "UGX","VND","VUV","XAF","XOF","XPF",
]);

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  let body: { invoiceId?: string; currency?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { invoiceId, currency = "CAD" } = body;
  if (!invoiceId) {
    return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
  }

  // Auth guard — must be authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch real invoice total from DB — never trust client-supplied amount
  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("total, status, company_id")
    .eq("id", invoiceId)
    .single();

  if (invErr || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const amount: number = invoice.total;
  const description = `Invoice payment`;

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
            product_data: {
              name: description,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      metadata: { invoiceId },
      success_url: `${APP_URL}/pay/${invoiceId}/success`,
      cancel_url: `${APP_URL}/pay/${invoiceId}`,
      payment_intent_data: {
        metadata: { invoiceId },
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
