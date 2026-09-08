export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { APP_URL } from "@/lib/email";

// Stripe zero-decimal currencies (no cents — amount is already the smallest unit)
const ZERO_DECIMAL = new Set([
  "BIF","CLP","DJF","GNF","JPY","KMF","KRW","MGA","PYG","RWF",
  "UGX","VND","VUV","XAF","XOF","XPF",
]);

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  let body: { invoiceId?: string; amount?: number; currency?: string; description?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { invoiceId, amount, currency = "CAD", description } = body;
  if (!invoiceId || !amount) {
    return NextResponse.json({ error: "Missing invoiceId or amount" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-06-24.dahlia" as Parameters<typeof Stripe>[1]["apiVersion"],
  });

  const stripeCurrency = currency.toLowerCase();
  const unitAmount = ZERO_DECIMAL.has(currency.toUpperCase())
    ? Math.round(amount)
    : Math.round(amount * 100);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: stripeCurrency,
          product_data: {
            name: description || "Invoice Payment",
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
}
