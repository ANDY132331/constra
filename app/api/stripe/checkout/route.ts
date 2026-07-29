export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false }, cookies: { getAll: () => [], setAll: () => {} } },
    );

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, email, name")
      .eq("id", user.id)
      .single();
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { data: company } = await supabase
      .from("companies")
      .select("id, name, stripe_customer_id")
      .eq("id", profile.company_id)
      .single();
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

    // Get or create Stripe customer
    let customerId = company.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email ?? user.email,
        name: company.name,
        metadata: { company_id: company.id, user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("companies")
        .update({ stripe_customer_id: customerId })
        .eq("id", company.id);
    }

    const origin = request.headers.get("origin") ?? "https://constra-jc6xjjxfe-anandssandhu31-1336s-projects.vercel.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${origin}/settings?tab=billing&success=1`,
      cancel_url: `${origin}/settings?tab=billing`,
      subscription_data: {
        metadata: { company_id: company.id },
        trial_period_days: 14,
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
