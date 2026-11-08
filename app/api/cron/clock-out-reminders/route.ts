export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { managerIds, pushToUsers } from "@/lib/push-server";

// Runs once each evening (see vercel.json). A forgotten clock-out is the most common time-tracking
// mistake and the one that costs the contractor: the shift keeps counting all night. So the worker
// gets a nudge on their phone, and the owner gets one list of who's still on the clock.

/** Shifts shorter than this are probably a real evening shift, not a forgotten one */
const MIN_HOURS = 4;

const fmtHours = (h: number) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}h ${m % 60}m`; };

export async function GET(request: Request) {
  const secret = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ skipped: "not configured" });

  // ?dry=1 reports who would be reminded without sending anything
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const send: typeof pushToUsers = dry ? async (_a, _c, ids) => ids.length : pushToUsers;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const cutoff = new Date(Date.now() - MIN_HOURS * 3_600_000).toISOString();

  const { data: open, error } = await admin
    .from("clock_entries")
    .select("id, company_id, worker_id, project_id, clock_in")
    .is("clock_out", null)
    .lt("clock_in", cutoff)
    .limit(2000);
  if (error) {
    console.error("[cron/clock-out-reminders]", error.message);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
  if (!open?.length) return NextResponse.json({ ok: true, open: 0 });

  const workerIds = [...new Set(open.map((e) => e.worker_id as string))];
  const projectIds = [...new Set(open.map((e) => e.project_id as string).filter(Boolean))];
  const [{ data: people }, { data: jobs }] = await Promise.all([
    admin.from("profiles").select("id, name").in("id", workerIds),
    projectIds.length ? admin.from("projects").select("id, name").in("id", projectIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const nameOf = new Map((people ?? []).map((p) => [p.id as string, (p.name as string) || "Someone"]));
  const jobOf = new Map((jobs ?? []).map((p) => [p.id as string, p.name as string]));

  let sent = 0;
  const byCompany = new Map<string, typeof open>();
  for (const e of open) {
    const list = byCompany.get(e.company_id as string) ?? [];
    list.push(e);
    byCompany.set(e.company_id as string, list);
  }

  for (const [companyId, entries] of byCompany) {
    // Each worker: their own reminder
    for (const e of entries) {
      const hours = (Date.now() - new Date(e.clock_in as string).getTime()) / 3_600_000;
      const job = jobOf.get(e.project_id as string);
      sent += await send(admin, companyId, [e.worker_id as string], {
        title: "Still clocked in",
        body: `${fmtHours(hours)}${job ? ` at ${job}` : ""}. Tap to clock out if you're done.`,
        url: "/time-tracking",
        tag: "clock-out-reminder",
      });
    }
    // The owner and foremen: one list, not a notification per person
    const names = entries.map((e) => nameOf.get(e.worker_id as string) ?? "Someone");
    const listed = names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
    const bosses = (await managerIds(admin, companyId)).filter((id) => !entries.some((e) => e.worker_id === id));
    sent += await send(admin, companyId, bosses, {
      title: `${entries.length} still clocked in`,
      body: `${listed}. Check before the hours run overnight.`,
      url: "/time-tracking",
      tag: "clock-out-summary",
    });
  }

  return NextResponse.json({ ok: true, dry, open: open.length, companies: byCompany.size, sent });
}
