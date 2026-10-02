export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { sendEmail, emailShell, APP_URL } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { onlinePaymentsEnabled } from "@/lib/payments";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Row = {
  number: string | null;
  client_name: string | null;
  client_email: string | null;
  items: { qty: number; rate: number }[] | null;
  tax_rate: number | null;
  company_id: string;
  due_date?: string | null;
  valid_until?: string | null;
  project_name?: string | null;
};

function detailRow(label: string, value: string, valueStyle = "font-weight:700;color:#111", last = false) {
  const border = last ? "" : "border-bottom:1px solid #e5e5e5;";
  return `<tr>
    <td style="padding:8px 0;${border}font-size:13px;color:#666">${label}</td>
    <td style="padding:8px 0;${border}font-size:13px;${valueStyle};text-align:right">${value}</td>
  </tr>`;
}

export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`invoice:email:${user.id}:${ip}`, 20, 3_600_000)) return rateLimitResponse();

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "Email sending isn't set up yet" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { invoiceId, estimateId, pdfDataUrl, isReminder, notes } = body as {
    invoiceId?: string;
    estimateId?: string;
    pdfDataUrl?: string;
    isReminder?: boolean;
    notes?: string;
  };

  const kind = invoiceId ? "invoice" : estimateId ? "estimate" : null;
  if (!kind) return NextResponse.json({ error: "Missing invoiceId or estimateId" }, { status: 400 });

  // Load from the DB and verify ownership — never trust client-supplied fields
  const { data: row, error: rowErr } = kind === "invoice"
    ? await authClient.from("invoices").select("number, client_name, client_email, items, tax_rate, due_date, company_id").eq("id", invoiceId!).single<Row>()
    : await authClient.from("estimates").select("number, client_name, client_email, items, tax_rate, valid_until, project_name, company_id").eq("id", estimateId!).single<Row>();

  if (rowErr || !row) return NextResponse.json({ error: `${kind === "invoice" ? "Invoice" : "Estimate"} not found` }, { status: 404 });

  const { data: profile } = await authClient.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile || profile.company_id !== row.company_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: company } = await authClient.from("companies").select("name, currency").eq("id", row.company_id).single();
  const companyName = (company as { name?: string } | null)?.name ?? "Constra";
  const currency = (company as { currency?: string } | null)?.currency ?? "CAD";

  const to = row.client_email ?? "";
  const number = row.number ?? "";
  if (!to || !number) return NextResponse.json({ error: "Missing client email or number" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "Invalid email address" }, { status: 400 });

  const subtotal = (row.items ?? []).reduce((s, item) => s + item.qty * item.rate, 0);
  const total = subtotal * (1 + (row.tax_rate ?? 0) / 100);
  let amount: string;
  try {
    amount = new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 2 }).format(total);
  } catch {
    amount = total.toFixed(2);
  }
  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }) : "");

  const cn = esc(row.client_name ?? "");
  const num = esc(number);
  const amt = esc(amount);
  const nt = notes ? esc(notes) : "";

  let subject: string;
  let html: string;

  if (kind === "estimate") {
    const valid = fmtDate(row.valid_until);
    subject = `Estimate ${number} from ${companyName} — ${amount}`;
    html = emailShell({
      company: companyName,
      preheader: `Estimate ${number} for ${amount}`,
      body: `
        <h2>Estimate ${num}</h2>
        <p>Hi <strong>${cn}</strong>,</p>
        <p>Thanks for the opportunity. Your estimate${row.project_name ? ` for <strong>${esc(row.project_name)}</strong>` : ""} is attached as a PDF.</p>
        <table style="width:100%;border-collapse:collapse;margin:14px 0">
          ${detailRow("Estimate #", num)}
          ${detailRow("Total", amt, "font-size:14px;font-weight:800;color:#111")}
          ${valid ? detailRow("Valid until", esc(valid), "font-weight:700;color:#111", true) : ""}
        </table>
        ${nt ? `<div class="quote">${nt}</div>` : ""}
        <p style="color:#888;font-size:12px">To go ahead or ask a question, just reply to this email.</p>
      `,
    });
  } else {
    const due = fmtDate(row.due_date);
    const payLink = `${APP_URL}/pay/${invoiceId}`;
    const payLabel = onlinePaymentsEnabled() ? "View &amp; pay invoice" : "View invoice";
    subject = isReminder
      ? `Payment reminder: Invoice ${number} from ${companyName} — ${amount} overdue`
      : `Invoice ${number} from ${companyName} — ${amount}${due ? ` due ${due}` : ""}`;
    html = isReminder
      ? emailShell({
          company: companyName,
          preheader: `Payment reminder: Invoice ${number} — ${amount} overdue`,
          body: `
            <h2 style="color:#ef4444">Payment overdue</h2>
            <p>Hi <strong>${cn}</strong>,</p>
            <p>This is a friendly reminder that the following invoice is <strong style="color:#ef4444">past due</strong>. Please arrange payment at your earliest convenience.</p>
            <table style="width:100%;border-collapse:collapse;margin:14px 0">
              ${detailRow("Invoice #", num)}
              ${detailRow("Amount due", amt, "font-size:14px;font-weight:800;color:#ef4444")}
              ${detailRow("Due date", `${esc(due)} (past due)`, "font-weight:700;color:#ef4444", true)}
            </table>
            ${nt ? `<div class="quote">${nt}</div>` : ""}
            <p style="color:#888;font-size:12px">If you've already sent payment, please disregard this notice.</p>
            <a class="cta" style="background:#ef4444" href="${payLink}">${payLabel} →</a>
          `,
        })
      : emailShell({
          company: companyName,
          preheader: `Invoice ${number} for ${amount}`,
          body: `
            <h2>Invoice ${num}</h2>
            <p>Hi <strong>${cn}</strong>,</p>
            <p>Please find your invoice below.</p>
            <table style="width:100%;border-collapse:collapse;margin:14px 0">
              ${detailRow("Invoice #", num)}
              ${detailRow("Amount due", amt, "font-size:14px;font-weight:800;color:#111")}
              ${due ? detailRow("Due date", esc(due), "font-weight:700;color:#111", true) : ""}
            </table>
            ${nt ? `<div class="quote">${nt}</div>` : ""}
            <p style="color:#888;font-size:12px">If you have any questions about this invoice, just reply to this email.</p>
            <a class="cta" href="${payLink}">${payLabel} →</a>
          `,
        });
  }

  const pdfBase64 = pdfDataUrl?.includes(",") ? pdfDataUrl.split(",")[1] : undefined;
  const attachments = pdfBase64
    ? [{ filename: `${number}.pdf`, content: pdfBase64, type: "application/pdf", disposition: "attachment" as const }]
    : undefined;

  try {
    const { error } = await sendEmail({ to, subject, html, attachments });
    if (error) {
      console.error(`[${kind}-email] send failed:`, error.message);
      return NextResponse.json({ error: "Email provider rejected the message" }, { status: 502 });
    }
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error(`[${kind}-email] error:`, err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
