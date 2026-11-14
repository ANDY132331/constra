export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { clientIp } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    // Auth check — must be a logged-in Constra user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: 30 pushes per minute per user
    const ip = clientIp(req);
    const key = `push:send:${user.id}:${ip}`;
    if (!rateLimit(key, 30, 60_000)) return rateLimitResponse();

    webPush.setVapidDetails(
      (() => { const s = process.env.VAPID_SUBJECT; return (!s || s.includes("gmail")) ? "mailto:admin@getconstra.com" : s; })(),
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
      process.env.VAPID_PRIVATE_KEY ?? ""
    );

    const serviceSupabase = createSupabaseServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // The server writes the notification from a known event, so callers can't push
    // arbitrary text to everyone's phone. Only managers are notified, never the actor.
    const raw = await req.json().catch(() => ({}));
    const EVENTS = ["clock-in", "clock-out", "left-site", "returned-site"] as const;
    const event = (EVENTS as readonly string[]).includes(raw.event) ? (raw.event as (typeof EVENTS)[number]) : null;
    const workerId = typeof raw.workerId === "string" ? raw.workerId : "";
    const projectId = typeof raw.projectId === "string" ? raw.projectId : "";
    const hours = typeof raw.hours === "number" && isFinite(raw.hours) ? Math.max(0, Math.min(raw.hours, 48)) : null;
    const metres = typeof raw.metres === "number" && isFinite(raw.metres) ? Math.max(0, Math.min(raw.metres, 5_000_000)) : null;
    // The phone reports when it noticed; never trust a time far from now
    const reportedAt = typeof raw.at === "string" ? new Date(raw.at) : null;
    const at = reportedAt && Math.abs(reportedAt.getTime() - Date.now()) < 15 * 60_000 ? reportedAt : new Date();
    if (!event || !workerId) return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    // Only a worker's own phone can say they left or came back
    if ((event === "left-site" || event === "returned-site") && workerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: me } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    if (!me?.company_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const companyId = me.company_id as string;

    const { data: worker } = await serviceSupabase.from("profiles").select("name, company_id").eq("id", workerId).single();
    if (!worker || worker.company_id !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data: project } = projectId
      ? await serviceSupabase.from("projects").select("name, company_id").eq("id", projectId).single()
      : { data: null };
    const projectName = project && project.company_id === companyId ? project.name : "a project";

    // The phone sends its own wall-clock time (the server has no idea of the site's time zone).
    // Only a bare time like "2:14 PM" gets through, so this can't carry other text to a phone.
    const clock = typeof raw.clock === "string" && /^\d{1,2}:\d{2}\s[AP]M$/.test(raw.clock) ? raw.clock : at.toISOString().slice(11, 16) + " UTC";
    const distance = metres == null ? "" : metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
    const title = event === "clock-in" ? `${worker.name} clocked in`
      : event === "clock-out" ? `${worker.name} clocked out`
      : event === "left-site" ? `${worker.name} left ${projectName}`
      : `${worker.name} is back at ${projectName}`;
    const text = event === "clock-in" ? `Working on ${projectName}`
      : event === "clock-out" ? `${hours != null ? hours.toFixed(1) + "h on " : ""}${projectName}`
      : event === "left-site" ? `${clock} · ${distance ? distance + " from the site · " : ""}still clocked in`
      : `${clock}`;
    // Site alerts replace each other per worker on the lock screen instead of stacking up
    const tag = event === "left-site" || event === "returned-site" ? `site-${workerId}` : undefined;
    const payload = JSON.stringify({ title, body: text, url: "/time-tracking", tag });

    const { data: managers } = await serviceSupabase
      .from("profiles")
      .select("id")
      .eq("company_id", companyId)
      .in("role", ["Admin", "Project Manager", "Foreman"])
      .neq("id", user.id);
    const managerIds = (managers ?? []).map((m) => m.id as string);
    if (!managerIds.length) return NextResponse.json({ ok: true, sent: 0 });

    const { data: rows } = await serviceSupabase
      .from("push_subscriptions")
      .select("subscription, endpoint")
      .eq("company_id", companyId)
      .in("user_id", managerIds);

    if (!rows?.length) return NextResponse.json({ ok: true, sent: 0 });

    const results = await Promise.allSettled(
      rows.map(async (row) => {
        try {
          await webPush.sendNotification(row.subscription, payload);
        } catch (e: unknown) {
          if ((e as { statusCode?: number }).statusCode === 410) {
            await serviceSupabase.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
          }
          throw e;
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error("push/send error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
