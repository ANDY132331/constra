export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

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

  const service = await createServiceClient();
  const companyId = callerProfile.company_id;

  // Build a deterministic but secure temporary password.
  // Workers will be sent a password-reset email so they can set their own.
  const tempPassword = crypto.randomUUID().replace(/-/g, "") + "Cc1!";

  const workerEmail = email?.trim() || null;

  // If no email provided, use a placeholder so auth.admin.createUser doesn't fail.
  const authEmail = workerEmail ?? `worker-${crypto.randomUUID()}@placeholder.constra.app`;

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
    role: role ?? "Worker",
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

  // 3. Send password-reset email so the worker can set their own password
  //    (only if they have a real email)
  if (workerEmail) {
    await service.auth.admin.generateLink({
      type: "recovery",
      email: workerEmail,
    }).catch(() => {}); // best-effort
  }

  return NextResponse.json({ ok: true, id: newUserId, initials });
}
