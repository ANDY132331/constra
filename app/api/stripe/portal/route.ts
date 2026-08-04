export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const key = `stripe:portal:${user.id}`;
    if (!rateLimit(key, 10, 60_000)) return rateLimitResponse();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    // Look up the company's Stripe customer ID server-side
    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: profile } = await service
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const { data: company } = await service
      .from("companies")
      .select("stripe_customer_id")
      .eq("id", profile.company_id)
      .single();

    const customerId = company?.stripe_customer_id as string | null;
    if (!customerId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-06-24.dahlia" });
    const origin = req.headers.get("origin") ?? "https://getconstra.com";
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe/portal error", err);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
