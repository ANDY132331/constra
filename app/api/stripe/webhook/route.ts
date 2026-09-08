export const dynamic = "force-dynamic";

// Stripe requires the raw request body for signature verification.
// Next.js App Router exposes it via req.text().
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-06-24.dahlia" as Parameters<typeof Stripe>[1]["apiVersion"],
  });

  const sig = req.headers.get("stripe-signature");
  const body = await req.text(); // raw body — required for Stripe signature check

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown";
    console.error("[stripe/webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Handle events ───────────────────────────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Payment must be fully collected (not just authorised)
    if (session.payment_status !== "paid") {
      return NextResponse.json({ skipped: "payment_status not paid" });
    }

    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) {
      console.warn("[stripe/webhook] checkout.session.completed has no invoiceId in metadata");
      return NextResponse.json({ skipped: "no invoiceId" });
    }

    const supabase = getAdmin();
    const { error } = await supabase
      .from("invoices")
      .update({ status: "paid" })
      .eq("id", invoiceId)
      .neq("status", "paid"); // idempotent — don't re-update already-paid invoices

    if (error) {
      console.error("[stripe/webhook] Failed to mark invoice as paid:", error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    console.log(`[stripe/webhook] ✓ Invoice ${invoiceId} marked as paid`);
  }

  return NextResponse.json({ received: true });
}
