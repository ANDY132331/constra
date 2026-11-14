export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { APP_URL } from "@/lib/email";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { onlinePaymentsEnabled } from "@/lib/payments";
import { expectedCharge } from "@/lib/invoice-charge";
import { clientIp } from "@/lib/security";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  if (!onlinePaymentsEnabled()) {
    return NextResponse.json({ error: "Online card payments aren't available yet" }, { status: 503 });
  }

  // Rate limit by IP — no auth required (this is a public client-facing endpoint)
  const ip = clientIp(req);
  if (!rateLimit(`pay-invoice-create:${ip}`, 10, 60_000)) return rateLimitResponse();

  let body: { invoiceId?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // The amount and currency come only from our database. A currency sent by the browser is ignored:
  // changing it would turn a 1,000.00 CAD invoice into a much smaller charge.
  const { invoiceId } = body;
  if (typeof invoiceId !== "string" || !/^[0-9a-f-]{36}$/i.test(invoiceId)) {
    return NextResponse.json({ error: "Missing invoiceId" }, { status: 400 });
  }

  // Use service role — clients are unauthenticated, RLS would block them
  const supabase = getAdmin();

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .select("items, tax_rate, status, company_id, companies ( currency )")
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

  const { unitAmount, currency: stripeCurrency } = expectedCharge(invoice as never);
  if (unitAmount <= 0) return NextResponse.json({ error: "Nothing to pay on this invoice" }, { status: 409 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" as any });

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
    // The detail goes to our logs, not to whoever is on the payment page
    console.error("[stripe/pay-invoice]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The payment page couldn't be opened. Try again in a minute." }, { status: 502 });
  }
}
