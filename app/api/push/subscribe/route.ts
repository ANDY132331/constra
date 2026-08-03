export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: 10 subscribe calls per minute per user
    const key = `push:sub:${user.id}`;
    if (!rateLimit(key, 10, 60_000)) return rateLimitResponse();

    const { subscription, companyId, userId } = await req.json();
    if (!subscription?.endpoint || !companyId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const serviceSupabase = createSupabaseServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await serviceSupabase.from("push_subscriptions").upsert(
      { company_id: companyId, user_id: userId ?? user.id, subscription, endpoint: subscription.endpoint },
      { onConflict: "endpoint" }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("push/subscribe error", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { endpoint } = await req.json();
    if (endpoint) {
      const serviceSupabase = createSupabaseServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      await serviceSupabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
