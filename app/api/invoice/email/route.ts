export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sendEmail, emailShell, APP_URL } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: "no RESEND_API_KEY" });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const {
    to,
    invoiceNumber,
    clientName,
    amount,
    dueDate,
    companyName,
    notes,
    pdfDataUrl,
    isReminder,
  } = body as {
    to: string;
    invoiceNumber: string;
    clientName: string;
    amount: string;
    dueDate: string;
    companyName: string;
    notes?: string;
    pdfDataUrl?: string;
    isReminder?: boolean;
  };

  if (!to || !invoiceNumber) {
    return NextResponse.json({ error: "Missing to or invoiceNumber" }, { status: 400 });
  }

  const html = isReminder
    ? emailShell({
        company: companyName,
        preheader: `Payment reminder: Invoice ${invoiceNumber} — ${amount} overdue`,
        body: `
          <h2 style="color:#ef4444">⚠️ Payment Overdue</h2>
          <p>Hi <strong>${clientName}</strong>,</p>
          <p>This is a friendly reminder that the following invoice is <strong style="color:#ef4444">past due</strong>. Please arrange payment at your earliest convenience.</p>
          <table style="width:100%;border-collapse:collapse;margin:14px 0">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666">Invoice #</td>
              <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:13px;font-weight:700;color:#111;text-align:right">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666">Amount Due</td>
              <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:14px;font-weight:800;color:#ef4444;text-align:right">${amount}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#666">Due Date</td>
              <td style="padding:8px 0;font-size:13px;font-weight:700;color:#ef4444;text-align:right">${dueDate} (past due)</td>
            </tr>
          </table>
          ${notes ? `<div class="quote">${notes}</div>` : ""}
          <p style="color:#888;font-size:12px">If you believe this is in error or have already sent payment, please disregard this notice or contact us directly.</p>
          <a class="cta" style="background:#ef4444" href="${APP_URL}/invoices">View & Pay Invoice →</a>
        `,
      })
    : emailShell({
        company: companyName,
        preheader: `Invoice ${invoiceNumber} for ${amount}`,
        body: `
          <h2>Invoice ${invoiceNumber}</h2>
          <p>Hi <strong>${clientName}</strong>,</p>
          <p>Please find your invoice below.</p>
          <table style="width:100%;border-collapse:collapse;margin:14px 0">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666">Invoice #</td>
              <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:13px;font-weight:700;color:#111;text-align:right">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:13px;color:#666">Amount Due</td>
              <td style="padding:8px 0;border-bottom:1px solid #e5e5e5;font-size:14px;font-weight:800;color:#f59e0b;text-align:right">${amount}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#666">Due Date</td>
              <td style="padding:8px 0;font-size:13px;font-weight:700;color:#111;text-align:right">${dueDate}</td>
            </tr>
          </table>
          ${notes ? `<div class="quote">${notes}</div>` : ""}
          <p style="color:#888;font-size:12px">If you have any questions about this invoice, please reply to this email.</p>
          <a class="cta" href="${APP_URL}/invoices">View Invoice Portal →</a>
        `,
      });

  const attachments = pdfDataUrl
    ? [{ filename: `${invoiceNumber}.pdf`, content: pdfDataUrl.split(",")[1], type: "application/pdf", disposition: "attachment" as const }]
    : undefined;

  const subject = isReminder
    ? `Payment Reminder: Invoice ${invoiceNumber} from ${companyName} — ${amount} OVERDUE`
    : `Invoice ${invoiceNumber} from ${companyName} — ${amount} due ${dueDate}`;

  try {
    await sendEmail({ to, subject, html, attachments });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Invoice email error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
