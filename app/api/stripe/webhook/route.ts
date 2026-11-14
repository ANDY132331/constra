export const dynamic = "force-dynamic";

// Stripe requires the raw request body for signature verification.
// Next.js App Router exposes it via req.text().
import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { expectedCharge } from "@/lib/invoice-charge";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-06-24.dahlia" as any });

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

    // Only mark it paid if what was collected matches what we billed, in the billed currency.
    // Signed events can still be for a different amount (an old or altered session), and a
    // short payment must never close an invoice.
    const { data: inv } = await supabase.from("invoices").select("items, tax_rate, companies ( currency )").eq("id", invoiceId).single();
    if (!inv) {
      console.error(`[stripe/webhook] invoice ${invoiceId} not found`);
      return NextResponse.json({ skipped: "invoice not found" });
    }
    const want = expectedCharge(inv as never);
    if (session.amount_total !== want.unitAmount || (session.currency ?? "").toLowerCase() !== want.currency) {
      console.error(`[stripe/webhook] MISMATCH on invoice ${invoiceId}: paid ${session.amount_total} ${session.currency}, expected ${want.unitAmount} ${want.currency}. Not marked paid.`);
      return NextResponse.json({ skipped: "amount mismatch" });
    }

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
