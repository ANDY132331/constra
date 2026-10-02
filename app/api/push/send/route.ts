export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Auth check — must be a logged-in Constra user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: 30 pushes per minute per user
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
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
    const event = raw.event === "clock-in" || raw.event === "clock-out" ? raw.event : null;
    const workerId = typeof raw.workerId === "string" ? raw.workerId : "";
    const projectId = typeof raw.projectId === "string" ? raw.projectId : "";
    const hours = typeof raw.hours === "number" && isFinite(raw.hours) ? Math.max(0, Math.min(raw.hours, 48)) : null;
    if (!event || !workerId) return NextResponse.json({ error: "Unknown event" }, { status: 400 });

    const { data: me } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    if (!me?.company_id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const companyId = me.company_id as string;

    const { data: worker } = await serviceSupabase.from("profiles").select("name, company_id").eq("id", workerId).single();
    if (!worker || worker.company_id !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data: project } = projectId
      ? await serviceSupabase.from("projects").select("name, company_id").eq("id", projectId).single()
      : { data: null };
    const projectName = project && project.company_id === companyId ? project.name : "a project";

    const title = event === "clock-in" ? `${worker.name} clocked in` : `${worker.name} clocked out`;
    const text = event === "clock-in"
      ? `Working on ${projectName}`
      : `${hours != null ? hours.toFixed(1) + "h on " : ""}${projectName}`;
    const payload = JSON.stringify({ title, body: text, url: "/time-tracking" });

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
