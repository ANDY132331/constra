export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: 5 checkout attempts per minute per user
    const key = `stripe:checkout:${user.id}`;
    if (!rateLimit(key, 5, 60_000)) return rateLimitResponse();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-06-24.dahlia" });
    const { email, companyId, priceId } = await req.json();

    // Always use the server-configured price — ignore any caller-supplied priceId
    // unless it exactly matches the configured value (prevents price substitution attacks)
    const configuredPrice = process.env.STRIPE_PRO_PRICE_ID;
    const resolvedPrice = (!priceId || priceId === configuredPrice) ? configuredPrice : null;
    if (!resolvedPrice) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    const origin = req.headers.get("origin") ?? "https://getconstra.com";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: email ?? user.email,
      line_items: [{ price: resolvedPrice, quantity: 1 }],
      metadata: { companyId: companyId ?? "", userId: user.id },
      success_url: `${origin}/settings?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe/checkout error", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
