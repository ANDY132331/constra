export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sendEmail, emailShell } from "@/lib/email";

// Sends a timesheet the phone already built (PDF and Excel, in the company's own local times)
// to the payroll address saved in Settings. The address comes from the database, never from the
// request, so this can't be used to mail files to anyone else.

const MAX_FILE = 3_000_000; // base64 characters, about 2.2 MB per file

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`timesheet:email:${user.id}`, 10, 60 * 60_000)) return rateLimitResponse();
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Email isn't set up on the server" }, { status: 503 });

  const { data: me } = await supabase.from("profiles").select("company_id, role, name").eq("id", user.id).single();
  if (!me?.company_id || !["Admin", "Project Manager"].includes(me.role as string)) {
    return NextResponse.json({ error: "Only an admin can send timesheets to payroll" }, { status: 403 });
  }
  const { data: co, error } = await supabase.from("companies").select("name, payroll_email").eq("id", me.company_id).single();
  if (error) {
    const pending = /payroll_email/.test(error.message);
    return NextResponse.json({ error: pending ? "A database update is still pending" : "Couldn't read settings" }, { status: pending ? 409 : 500 });
  }
  const to = (co?.payroll_email as string | null)?.trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return NextResponse.json({ error: "Add a payroll email first" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const period = typeof body.period === "string" ? body.period.slice(0, 60) : "";
  const files = Array.isArray(body.files) ? body.files : [];
  const attachments = files.slice(0, 2).flatMap((f: { name?: unknown; type?: unknown; base64?: unknown }) => {
    const name = typeof f.name === "string" ? f.name.replace(/[^\w.\-]/g, "_").slice(0, 120) : "";
    const ok = /\.(pdf|xlsx)$/.test(name) && typeof f.base64 === "string" && f.base64.length <= MAX_FILE && /^[A-Za-z0-9+/=]+$/.test(f.base64);
    if (!ok) return [];
    const type = name.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    return [{ filename: name, content: f.base64 as string, type, disposition: "attachment" as const }];
  });
  if (!attachments.length) return NextResponse.json({ error: "No timesheet attached" }, { status: 400 });

  const company = (co?.name as string) || "Your company";
  const summary = typeof body.summary === "string" ? body.summary.slice(0, 200) : "";
  try {
    await sendEmail({
      to,
      subject: `${company} timesheet${period ? `: ${period}` : ""}`,
      html: emailShell({
        company,
        preheader: `Timesheet${period ? ` for ${period}` : ""}`,
        body: `<p style="margin:0 0 12px">Hi,</p>
<p style="margin:0 0 12px">Attached is ${esc(company)}'s timesheet${period ? ` for <strong>${esc(period)}</strong>` : ""}, as a PDF and an Excel file.</p>
${summary ? `<p style="margin:0 0 12px">${esc(summary)}</p>` : ""}
<p style="margin:0">Sent by ${esc((me.name as string) || "the office")} from Constra.</p>`,
      }),
      attachments,
    });
  } catch (e) {
    console.error("[timesheets/email]", e);
    return NextResponse.json({ error: "The email didn't go. Try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, to });
}
