export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail, emailShell, APP_URL } from "@/lib/email";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function invoiceTotal(items: { qty: number; rate: number }[], taxRate: number) {
  const sub = items.reduce((s, i) => s + i.qty * i.rate, 0);
  return sub * (1 + taxRate / 100);
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export async function GET(request: Request) {
  const secret = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: "no RESEND_API_KEY" });
  }

  const supabase = getAdmin();

  // Fetch all overdue invoices with their company name
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("*, companies(name)")
    .eq("status", "overdue");

  if (error) {
    console.error("Cron invoice fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!invoices || invoices.length === 0) {
    return NextResponse.json({ sent: 0, message: "No overdue invoices" });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const inv of invoices) {
    if (!inv.client_email) continue;

    const companyName = (inv.companies as { name?: string } | null)?.name ?? "Your contractor";
    const total = invoiceTotal(inv.items ?? [], Number(inv.tax_rate ?? 0));
    const amount = fmt(total);
    const dueDate = new Date(inv.due_date).toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });

    const html = emailShell({
      company: companyName,
      preheader: `Payment reminder: Invoice ${inv.number} — ${amount} overdue`,
      body: `
        <h2 style="color:#ef4444">⚠️ Payment Reminder</h2>
        <p>Hi <strong>${esc(inv.client_name ?? "")}</strong>,</p>
        <p>This is an automated reminder that the following invoice is <strong style="color:#ef4444">past due</strong>. Please arrange payment at your earliest convenience.</p>
        <table style="width:100%;border-collapse:collapse;margin:14px 0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666">Invoice #</td>
            <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:13px;font-weight:700;color:#111;text-align:right">${esc(String(inv.number ?? ""))}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666">Amount Due</td>
            <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:14px;font-weight:800;color:#ef4444;text-align:right">${amount}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:13px;color:#666">Was Due</td>
            <td style="padding:8px 0;font-size:13px;font-weight:700;color:#ef4444;text-align:right">${esc(dueDate)}</td>
          </tr>
        </table>
        <p style="color:#888;font-size:12px">If you have already sent payment, please disregard this notice.</p>
        <a class="cta" style="background:#ef4444" href="${APP_URL}/invoices">View Invoice →</a>
      `,
    });

    try {
      await sendEmail({
        to: inv.client_email,
        subject: `Payment Reminder: Invoice ${inv.number} from ${companyName} — ${amount} OVERDUE`,
        html,
      });
      sent++;
    } catch (e) {
      errors.push(`${inv.number}: ${e}`);
    }
  }

  return NextResponse.json({ sent, errors: errors.length ? errors : undefined });
}
