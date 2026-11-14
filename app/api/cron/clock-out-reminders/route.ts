export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { managerIds, pushToUsers } from "@/lib/push-server";
import { isCronAuthorized } from "@/lib/security";

// A forgotten clock-out is the most common time-tracking mistake and the one that costs the
// contractor: the shift keeps counting all night. Constra is used in every time zone, so this
// doesn't wait for "the evening". It nudges once a shift has been open REMIND_AFTER_HOURS,
// which means the same thing in Sydney, London or Vancouver, and for night shifts too.
//
// vercel.json calls this every hour (one daily entry per hour, so it runs on any plan). Each
// shift is marked when it's been nudged (clock_entries.reminder_sent_at, migration 015), so
// nobody hears about the same shift twice. Until 015 is live there is no mark, so only the
// 02:00 UTC run sends, reminding anything open 4+ hours: once a day, never repeated hourly.

const REMIND_AFTER_HOURS = 10;
const LEGACY_MIN_HOURS = 4;
const LEGACY_HOUR_UTC = 2;

const fmtHours = (h: number) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}h ${m % 60}m`; };

type Open = { id: string; company_id: string; worker_id: string; project_id: string | null; clock_in: string };

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ skipped: "not configured" });

  // ?dry=1 reports who would be reminded without sending or marking anything
  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const send: typeof pushToUsers = dry ? async (_a, _c, ids) => ids.length : pushToUsers;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let open: Open[] = [];
  let marked = true;
  const res = await admin
    .from("clock_entries")
    .select("id, company_id, worker_id, project_id, clock_in")
    .is("clock_out", null)
    .is("reminder_sent_at", null)
    .lt("clock_in", new Date(Date.now() - REMIND_AFTER_HOURS * 3_600_000).toISOString())
    .limit(2000);
  if (res.error) {
    // Column missing: migration 015 isn't live yet. Fall back to one run a day.
    if (!/reminder_sent_at/.test(res.error.message)) {
      console.error("[cron/clock-out-reminders]", res.error.message);
      return NextResponse.json({ error: "query failed" }, { status: 500 });
    }
    marked = false;
    if (new Date().getUTCHours() !== LEGACY_HOUR_UTC && !dry) return NextResponse.json({ ok: true, skipped: "waiting for migration 015" });
    const legacy = await admin
      .from("clock_entries")
      .select("id, company_id, worker_id, project_id, clock_in")
      .is("clock_out", null)
      .lt("clock_in", new Date(Date.now() - LEGACY_MIN_HOURS * 3_600_000).toISOString())
      .limit(2000);
    if (legacy.error) return NextResponse.json({ error: "query failed" }, { status: 500 });
    open = (legacy.data ?? []) as Open[];
  } else {
    open = (res.data ?? []) as Open[];
  }
  if (!open.length) return NextResponse.json({ ok: true, dry, marked, open: 0 });

  // Mark first: if sending fails halfway, a rerun must not tell the same people again
  if (marked && !dry) {
    await admin.from("clock_entries").update({ reminder_sent_at: new Date().toISOString() }).in("id", open.map((e) => e.id));
  }

  const workerIds = [...new Set(open.map((e) => e.worker_id))];
  const projectIds = [...new Set(open.map((e) => e.project_id).filter((x): x is string => !!x))];
  const [{ data: people }, { data: jobs }] = await Promise.all([
    admin.from("profiles").select("id, name").in("id", workerIds),
    projectIds.length ? admin.from("projects").select("id, name").in("id", projectIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const nameOf = new Map((people ?? []).map((p) => [p.id as string, (p.name as string) || "Someone"]));
  const jobOf = new Map((jobs ?? []).map((p) => [p.id as string, p.name as string]));

  const byCompany = new Map<string, Open[]>();
  for (const e of open) byCompany.set(e.company_id, [...(byCompany.get(e.company_id) ?? []), e]);

  let sent = 0;
  for (const [companyId, entries] of byCompany) {
    for (const e of entries) {
      const hours = (Date.now() - new Date(e.clock_in).getTime()) / 3_600_000;
      const job = e.project_id ? jobOf.get(e.project_id) : undefined;
      sent += await send(admin, companyId, [e.worker_id], {
        title: "Still clocked in",
        body: `${fmtHours(hours)}${job ? ` at ${job}` : ""}. Tap to clock out if you're done.`,
        url: "/time-tracking",
        tag: "clock-out-reminder",
      });
    }
    // Owner and foremen: one message per run, not one per person
    const names = entries.map((e) => nameOf.get(e.worker_id) ?? "Someone");
    const listed = names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
    const bosses = (await managerIds(admin, companyId)).filter((id) => !entries.some((e) => e.worker_id === id));
    const hrs = marked ? REMIND_AFTER_HOURS : LEGACY_MIN_HOURS;
    sent += await send(admin, companyId, bosses, entries.length === 1
      ? { title: `${listed} is still clocked in`, body: `Open over ${hrs} hours. Check for a missed clock-out.`, url: "/time-tracking", tag: "clock-out-summary" }
      : { title: `${entries.length} still clocked in`, body: `${listed}. Open over ${hrs} hours. Check for missed clock-outs.`, url: "/time-tracking", tag: "clock-out-summary" });
  }

  return NextResponse.json({ ok: true, dry, marked, open: open.length, companies: byCompany.size, sent });
}
