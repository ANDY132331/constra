export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { managerIds, pushToUsers } from "@/lib/push-server";

// Notifications about the crew plan and time off. The phone only names the event and the row;
// the server reads that row and writes the message itself, so nobody can send their own text
// to someone else's lock screen.

const day = (iso: string) => {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
};
const range = (a: string, b: string) => (a === b ? day(a) : `${day(a)} – ${day(b)}`);

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`push:team:${user.id}`, 60, 60_000)) return rateLimitResponse();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ ok: true, sent: 0 });

  const raw = await req.json().catch(() => ({}));
  const event = raw.event as string;
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: me } = await admin.from("profiles").select("company_id, role, name").eq("id", user.id).single();
  if (!me?.company_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const companyId = me.company_id as string;
  const isBoss = ["Admin", "Project Manager", "Foreman"].includes(me.role as string);

  // Foreman saved someone's plan for a day: tell that person where to be
  if (event === "crew-plan") {
    if (!isBoss) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const workerId = typeof raw.workerId === "string" ? raw.workerId : "";
    const date = typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : "";
    if (!workerId || !date) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const { data: a } = await admin.from("crew_assignments")
      .select("project_id, start_time, note, company_id").eq("worker_id", workerId).eq("work_date", date).maybeSingle();
    if (!a || a.company_id !== companyId) return NextResponse.json({ ok: true, sent: 0 });
    const { data: p } = await admin.from("projects").select("name, address").eq("id", a.project_id).single();
    const sent = await pushToUsers(admin, companyId, [workerId], {
      title: `${day(date)}: ${p?.name ?? "your job"}`,
      body: [a.start_time ? `Start ${a.start_time}` : "", p?.address, a.note].filter(Boolean).join(" · ").slice(0, 180) || "See the crew plan",
      url: "/crew-plan",
      tag: `plan-${date}`,
    });
    return NextResponse.json({ ok: true, sent });
  }

  if (event === "time-off-request" || event === "time-off-decision") {
    const requestId = typeof raw.requestId === "string" ? raw.requestId : "";
    if (!requestId) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const { data: r } = await admin.from("time_off_requests")
      .select("worker_id, start_date, end_date, status, company_id").eq("id", requestId).maybeSingle();
    if (!r || r.company_id !== companyId) return NextResponse.json({ ok: true, sent: 0 });

    if (event === "time-off-request") {
      // Only the person asking announces their own request
      if (r.worker_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const bosses = (await managerIds(admin, companyId)).filter((id) => id !== user.id);
      const sent = await pushToUsers(admin, companyId, bosses, {
        title: `${me.name || "Someone"} asked for time off`,
        body: range(r.start_date, r.end_date),
        url: "/time-off",
        tag: `timeoff-${requestId}`,
      });
      return NextResponse.json({ ok: true, sent });
    }

    if (!isBoss || r.status === "pending") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const sent = await pushToUsers(admin, companyId, [r.worker_id], {
      title: r.status === "approved" ? "Time off approved" : "Time off declined",
      body: range(r.start_date, r.end_date),
      url: "/time-off",
      tag: `timeoff-${requestId}`,
    });
    return NextResponse.json({ ok: true, sent });
  }

  return NextResponse.json({ error: "Unknown event" }, { status: 400 });
}
