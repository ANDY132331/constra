export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

const supabaseAdmin = () =>
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, cookies: { getAll: () => [], setAll: () => {} } },
  );

async function setCompanyPlan(companyId: string, plan: "starter" | "pro", subscriptionId?: string, status?: string) {
  await supabaseAdmin()
    .from("companies")
    .update({
      plan,
      subscription_status: status ?? plan,
      ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
    })
    .eq("id", companyId);
}

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.subscription
          ? ((await stripe.subscriptions.retrieve(session.subscription as string)).metadata?.company_id)
          : null;
        if (companyId) {
          await setCompanyPlan(companyId, "pro", session.subscription as string, "active");
          // Store customer ID if not already saved
          if (session.customer) {
            await supabase.from("companies")
              .update({ stripe_customer_id: session.customer as string })
              .eq("id", companyId);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.company_id;
        if (!companyId) break;
        const plan = sub.status === "active" || sub.status === "trialing" ? "pro" : "starter";
        await setCompanyPlan(companyId, plan, sub.id, sub.status);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const companyId = sub.metadata?.company_id;
        if (companyId) await setCompanyPlan(companyId, "starter", undefined, "canceled");
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subId = (inv as { subscription?: string }).subscription;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const companyId = sub.metadata?.company_id;
          if (companyId) await setCompanyPlan(companyId, "pro", sub.id, "past_due");
        }
        break;
      }
    }
  } catch (err) {
    console.error(`Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
