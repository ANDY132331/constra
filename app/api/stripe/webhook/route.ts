import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-06-24.dahlia" });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const obj = event.data.object as Stripe.Checkout.Session;
      const companyId = obj.metadata?.companyId;
      if (companyId) {
        await supabase.from("companies")
          .update({ plan: "pro", stripe_customer_id: obj.customer as string })
          .eq("id", companyId);
      }
      break;
    }
    case "customer.subscription.deleted":
    case "customer.subscription.paused": {
      const sub = event.data.object as Stripe.Subscription;
      const custId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await supabase.from("companies").update({ plan: "free" }).eq("stripe_customer_id", custId);
      break;
    }
    case "customer.subscription.resumed":
    case "invoice.payment_succeeded": {
      const inv = event.data.object as Stripe.Invoice;
      const custId = inv.customer ? (typeof inv.customer === "string" ? inv.customer : (inv.customer as Stripe.Customer).id) : null;
      if (custId) await supabase.from("companies").update({ plan: "pro" }).eq("stripe_customer_id", custId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
