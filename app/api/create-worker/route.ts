export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sendEmail, emailShell, APP_URL } from "@/lib/email";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// POST /api/create-worker
// Creates a real auth user + profile for a new crew member.
// Requires the caller to be an Admin in the same company.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`create-worker:${ip}`, 20, 3_600_000)) return rateLimitResponse();

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify caller is Admin or Project Manager
  const { data: callerProfile } = await authClient
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!callerProfile || !["Admin", "Project Manager"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, role, customRole, email, phone, color, hourlyRate, photo } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const VALID_ROLES = ["Admin", "Project Manager", "Worker", "Foreman", "Subcontractor", "Estimator", "Safety Officer"];
  const safeRole = VALID_ROLES.includes(role) ? role : "Worker";
  if (safeRole === "Admin" && callerProfile.role !== "Admin") {
    return NextResponse.json({ error: "Only an Admin can add another Admin" }, { status: 403 });
  }

  const workerEmail = email?.trim() || null;
  if (workerEmail && !workerEmail.includes("@")) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const service = await createServiceClient();
  const companyId = callerProfile.company_id;

  // Build a deterministic but secure temporary password.
  // Workers will be sent a password-reset email so they can set their own.
  const tempPassword = crypto.randomUUID().replace(/-/g, "") + "Cc1!";

  // If no email provided, use a placeholder so auth.admin.createUser doesn't fail.
  const authEmail = workerEmail ?? `worker-${crypto.randomUUID()}@placeholder.getconstra.com`;

  // 1. Create the auth user
  const { data: authData, error: authErr } = await service.auth.admin.createUser({
    email: authEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { company_id: companyId },
  });

  if (authErr || !authData.user) {
    return NextResponse.json({ error: authErr?.message ?? "Failed to create user" }, { status: 400 });
  }

  const newUserId = authData.user.id;
  const trimmedName = name.trim();
  const initials = trimmedName.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();

  // 2. Create the profile row
  const { error: profileErr } = await service.from("profiles").insert({
    id: newUserId,
    company_id: companyId,
    name: trimmedName,
    initials,
    role: safeRole,
    custom_role: customRole?.trim() ?? "",
    email: workerEmail ?? "",
    phone: phone?.trim() ?? "",
    color: color ?? "#3b82f6",
    photo_url: photo ?? null,
    clocked_in: false,
    hourly_rate: parseFloat(hourlyRate) || 0,
  });

  if (profileErr) {
    // Roll back the auth user so we don't leave orphaned auth entries
    await service.auth.admin.deleteUser(newUserId);
    return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  }

  // 3. Send a welcome email with a password-setup link (only if they have a real email)
  if (workerEmail && process.env.RESEND_API_KEY) {
    try {
      const { data: linkData } = await service.auth.admin.generateLink({ type: "recovery", email: workerEmail });
      // Same link format as password reset: the page verifies the hashed token itself
      const tokenHash = linkData?.properties?.hashed_token;
      if (tokenHash) {
        const setupUrl = `${APP_URL}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
        const { data: company } = await service.from("companies").select("name").eq("id", companyId).single();
        const companyName = esc((company as { name?: string } | null)?.name ?? "your company");
        const html = emailShell({
          company: "Constra",
          preheader: `${companyName} added you to Constra`,
          body: `
            <h2>Welcome to Constra</h2>
            <p>Hi ${esc(trimmedName)}, <strong>${companyName}</strong> added you to their Constra workspace, where you'll clock in, see your tasks and message your crew.</p>
            <p>Set a password to get started. This link expires in <strong>1 hour</strong>; if it does, use "Forgot password?" on the sign-in page.</p>
            <a class="cta" href="${setupUrl}">Set your password →</a>
            <p style="color:#aaa;font-size:12px;margin-top:20px">If you weren't expecting this, you can safely ignore this email.</p>
          `,
        });
        const { error: sendError } = await sendEmail({ to: workerEmail, subject: `${(company as { name?: string } | null)?.name ?? "Your team"} added you to Constra — set your password`, html });
        if (sendError) console.error("[/api/create-worker] welcome email failed:", sendError.message);
      }
    } catch (e) {
      console.error("[/api/create-worker] welcome email failed:", e);
      // Don't fail the request — the worker account was created successfully
    }
  }

  return NextResponse.json({ ok: true, id: newUserId, initials });
}
