export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const GRACE_PERIOD_DAYS = 7;

export async function GET(request: Request) {
  const secret = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();
  const cutoff = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let companiesDeleted = 0;
  let profilesDeleted = 0;
  const errors: string[] = [];

  // ── Company-scope deletions (Admin requested — wipes the whole workspace) ──
  const { data: companies, error: compErr } = await admin
    .from("companies")
    .select("id")
    .not("deletion_requested_at", "is", null)
    .lt("deletion_requested_at", cutoff);

  if (compErr) errors.push(`companies query: ${compErr.message}`);

  for (const c of companies ?? []) {
    // Grab member auth user ids before the cascade removes their profile rows.
    const { data: members } = await admin.from("profiles").select("id").eq("company_id", c.id);
    const { error: delErr } = await admin.from("companies").delete().eq("id", c.id);
    if (delErr) {
      errors.push(`company ${c.id}: ${delErr.message}`);
      continue;
    }
    companiesDeleted++;
    for (const m of members ?? []) {
      const { error: authErr } = await admin.auth.admin.deleteUser(m.id);
      if (authErr) errors.push(`auth user ${m.id}: ${authErr.message}`);
    }
  }

  // ── Profile-scope deletions (an individual worker requested their own) ──
  const { data: profiles, error: profErr } = await admin
    .from("profiles")
    .select("id")
    .not("deletion_requested_at", "is", null)
    .lt("deletion_requested_at", cutoff);

  if (profErr) errors.push(`profiles query: ${profErr.message}`);

  for (const p of profiles ?? []) {
    // Deleting the auth user cascades to the profile row (and, per schema,
    // their clock_entries/hours_adjustments) automatically.
    const { error: authErr } = await admin.auth.admin.deleteUser(p.id);
    if (authErr) errors.push(`auth user ${p.id}: ${authErr.message}`);
    else profilesDeleted++;
  }

  return NextResponse.json({ companiesDeleted, profilesDeleted, errors: errors.length ? errors : undefined });
}
