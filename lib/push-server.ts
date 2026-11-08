// Server-only: send a notification to particular people's phones. Used by scheduled jobs, which
// have no signed-in user, so callers must decide who may receive what before calling this.

import webPush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  const s = process.env.VAPID_SUBJECT;
  webPush.setVapidDetails(!s || s.includes("gmail") ? "mailto:admin@getconstra.com" : s, pub, priv);
  configured = true;
  return true;
}

export type PushMessage = { title: string; body: string; url: string; tag?: string };

/** Returns how many phones it reached. Dead subscriptions are removed as they're found. */
export async function pushToUsers(admin: SupabaseClient, companyId: string, userIds: string[], msg: PushMessage): Promise<number> {
  if (!userIds.length || !configure()) return 0;
  const { data: rows } = await admin
    .from("push_subscriptions")
    .select("subscription, endpoint")
    .eq("company_id", companyId)
    .in("user_id", userIds);
  if (!rows?.length) return 0;
  const payload = JSON.stringify(msg);
  const results = await Promise.allSettled(rows.map(async (row) => {
    try {
      await webPush.sendNotification(row.subscription, payload);
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("endpoint", row.endpoint);
      throw e;
    }
  }));
  return results.filter((r) => r.status === "fulfilled").length;
}

export async function managerIds(admin: SupabaseClient, companyId: string): Promise<string[]> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("company_id", companyId)
    .in("role", ["Admin", "Project Manager", "Foreman"]);
  return (data ?? []).map((m) => m.id as string);
}
