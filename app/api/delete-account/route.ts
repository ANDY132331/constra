export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendEmail, accountDeletionEmail, APP_URL } from "@/lib/email";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`delete-account:${ip}`, 5, 3_600_000)) return rateLimitResponse();

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (!rateLimit(`delete-account:user:${user.id}`, 3, 3_600_000)) return rateLimitResponse();

  const { data: profile } = await authClient
    .from("profiles")
    .select("id, name, email, role, company_id, companies(name)")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const isAdmin = profile.role === "Admin";
  const companyName = (profile.companies as unknown as { name?: string } | null)?.name ?? "your company";
  const token = randomUUID();
  const service = await createServiceClient();

  if (isAdmin) {
    if (!profile.company_id) {
      return NextResponse.json({ error: "No company associated with this account." }, { status: 400 });
    }
    // Admin deletion cascades to the entire company workspace once purged.
    const { error } = await service
      .from("companies")
      .update({ deletion_requested_at: new Date().toISOString(), deletion_token: token })
      .eq("id", profile.company_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Only this person's own account — scoped strictly to their own row.
    const { error } = await service
      .from("profiles")
      .update({ deletion_requested_at: new Date().toISOString(), deletion_token: token })
      .eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const scope = isAdmin ? "company" : "profile";
  const cancelUrl = `${APP_URL}/api/restore-account?token=${token}&scope=${scope}`;

  const email = profile.email || user.email;
  if (email && process.env.RESEND_API_KEY) {
    try {
      await sendEmail({
        to: email,
        subject: "Constra — Account deletion requested (7 days to cancel)",
        html: accountDeletionEmail({ company: companyName, name: profile.name || "there", scope, cancelUrl }),
      });
    } catch (e) {
      // Don't fail the request over email delivery — the deletion is still scheduled correctly.
      console.error("[/api/delete-account] email send failed:", e);
    }
  }

  return NextResponse.json({ ok: true, scope });
}
