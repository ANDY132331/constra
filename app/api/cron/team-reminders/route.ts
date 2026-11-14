export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { pushToUsers } from "@/lib/push-server";
import { isCronAuthorized } from "@/lib/security";

// Once a day (see vercel.json):
//  - Certifications: the holder and the office hear 30, 14, 7 and 1 days before a ticket expires,
//    and the day it does. One run a day, so each of those days fires exactly once.
//  - Mondays: offices that switched on the payroll reminder get a nudge that opens last week's
//    timesheet ready to send. The file itself is built on their phone, in their own time zone.
// Both need migration 015; before it, this reports what's missing and does nothing.

const WARN_DAYS = new Set([30, 14, 7, 1, 0]);

type Cert = { name?: string; expiryDate?: string };

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ skipped: "not configured" });
  const url = new URL(request.url);
  const dry = url.searchParams.get("dry") === "1";
  const send: typeof pushToUsers = dry ? async (_a, _c, ids) => ids.length : pushToUsers;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out: Record<string, unknown> = { dry };

  // ── Certifications ──
  const { data: people, error } = await admin.from("profiles").select("id, name, role, company_id, certifications").limit(10000);
  if (error) {
    out.certs = /certifications/.test(error.message) ? "waiting for migration 015" : "query failed";
  } else {
    const officeOf = new Map<string, string[]>();
    for (const p of people ?? []) {
      if (p.role === "Admin" || p.role === "Project Manager") officeOf.set(p.company_id, [...(officeOf.get(p.company_id) ?? []), p.id]);
    }
    let sent = 0, due = 0;
    for (const p of people ?? []) {
      for (const c of (Array.isArray(p.certifications) ? p.certifications : []) as Cert[]) {
        if (!c?.name || !c.expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(c.expiryDate)) continue;
        const [y, m, d] = c.expiryDate.split("-").map(Number);
        const days = Math.round((Date.UTC(y, m - 1, d) - todayUtc) / 86_400_000);
        if (!WARN_DAYS.has(days)) continue;
        due++;
        const when = days === 0 ? "expires today" : `expires in ${days} day${days === 1 ? "" : "s"}`;
        const tag = `cert-${p.id}-${c.name}`.slice(0, 60);
        sent += await send(admin, p.company_id, [p.id], { title: `Your ${c.name} ${when}`, body: "Book the renewal so you can keep working on site.", url: "/crew", tag });
        const office = (officeOf.get(p.company_id) ?? []).filter((id) => id !== p.id);
        sent += await send(admin, p.company_id, office, { title: `${p.name}'s ${c.name} ${when}`, body: `Expiry ${c.expiryDate}`, url: "/crew", tag });
      }
    }
    out.certs = { due, sent };
  }

  // ── Monday payroll nudge ──
  if (now.getUTCDay() === 1 || url.searchParams.get("monday") === "1") {
    const { data: cos, error: coErr } = await admin.from("companies").select("id, payroll_email").eq("payroll_email_on", true);
    if (coErr) {
      out.payroll = /payroll_email/.test(coErr.message) ? "waiting for migration 015" : "query failed";
    } else {
      let sent = 0;
      for (const co of cos ?? []) {
        if (!co.payroll_email) continue;
        const { data: office } = await admin.from("profiles").select("id").eq("company_id", co.id).in("role", ["Admin", "Project Manager"]);
        sent += await send(admin, co.id, (office ?? []).map((o) => o.id as string), {
          title: "Last week's timesheet is ready",
          body: `Tap to check it and send it to ${co.payroll_email}.`,
          url: "/timesheets?send=last-week",
          tag: "payroll-monday",
        });
      }
      out.payroll = { companies: cos?.length ?? 0, sent };
    }
  }

  return NextResponse.json({ ok: true, ...out });
}
