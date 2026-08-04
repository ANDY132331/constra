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
      process.env.VAPID_SUBJECT ?? "mailto:admin@getconstra.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
      process.env.VAPID_PRIVATE_KEY ?? ""
    );

    const serviceSupabase = createSupabaseServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const raw = await req.json();
    const companyId = typeof raw.companyId === "string" ? raw.companyId : undefined;
    const title = typeof raw.title === "string" ? raw.title.slice(0, 100) : "";
    const body = typeof raw.body === "string" ? raw.body.slice(0, 500) : "";
    // Only allow same-origin relative URLs for the notification action
    const rawUrl = typeof raw.url === "string" ? raw.url : "/dashboard";
    const url = rawUrl.startsWith("/") && !rawUrl.startsWith("//") ? rawUrl.slice(0, 200) : "/dashboard";
    const directSub = raw.subscription;

    const payload = JSON.stringify({ title, body, url });

    // When targeting a company, verify the caller belongs to it
    if (companyId) {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
      if (!profile || profile.company_id !== companyId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    if (directSub) {
      try {
        await webPush.sendNotification(directSub, payload);
      } catch (e: unknown) {
        if ((e as { statusCode?: number }).statusCode === 410) {
          await serviceSupabase.from("push_subscriptions").delete().eq("endpoint", directSub.endpoint);
        }
      }
      return NextResponse.json({ ok: true, sent: 1 });
    }

    if (!companyId) return NextResponse.json({ error: "Missing companyId" }, { status: 400 });

    const { data: rows } = await serviceSupabase
      .from("push_subscriptions")
      .select("subscription, endpoint")
      .eq("company_id", companyId);

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
