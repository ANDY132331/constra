export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // omits confusable chars
  let code = "CN-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += "-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// POST /api/create-company
// Creates the auth user, company, and admin profile in one server-side transaction.
// Must be server-side because new users cannot INSERT into companies (no company_id yet).
export async function POST(request: NextRequest) {
  // 5 account creations per IP per hour
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`create-company:${ip}`, 5, 3_600_000)) return rateLimitResponse();

  const body = await request.json();
  const { email, password, firstName, lastName, companyName, currency, language, industry } = body;

  if (!email || !password || !firstName || !companyName) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (email.length > 254 || password.length > 128 || firstName.length > 50 ||
      (lastName && lastName.length > 50) || companyName.length > 100) {
    return NextResponse.json({ error: "One or more fields exceed the maximum allowed length." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, cookies: { getAll: () => [], setAll: () => {} } },
  );

  // 1. Create auth user (email confirmed immediately for admin flow)
  const { data: authData, error: signUpErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (signUpErr || !authData.user) {
    return NextResponse.json({ error: signUpErr?.message ?? "Sign-up failed." }, { status: 400 });
  }

  const userId = authData.user.id;

  // 2. Create company
  const inviteCode = generateInviteCode();
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .insert({
      name: companyName.trim(),
      invite_code: inviteCode,
      plan: "free",
      currency: currency ?? "USD",
      language: language ?? "en",
      industry: industry ?? "Construction",
      trial_ends_at: trialEndsAt,
    })
    .select("id")
    .single();

  if (companyErr || !company) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Failed to create company." }, { status: 500 });
  }

  // 3. Create admin profile
  const full = [firstName.trim(), (lastName ?? "").trim()].filter(Boolean).join(" ");
  const initials = [firstName[0], lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const { error: profileErr } = await supabase.from("profiles").insert({
    id: userId,
    company_id: company.id,
    name: full,
    initials,
    role: "Admin",
    custom_role: "Admin / Owner",
    email: email.trim(),
    phone: "",
    color: "#f59e0b",
    clocked_in: false,
    hourly_rate: 0,
  });

  if (profileErr) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Failed to create profile." }, { status: 500 });
  }

  // Send welcome email (best-effort — don't fail signup if email fails)
  if (process.env.RESEND_API_KEY) {
    sendEmail({
      to: email.trim(),
      subject: `Welcome to Constra — ${companyName.trim()} is ready`,
      html: welcomeEmail({ firstName: firstName.trim(), companyName: companyName.trim(), inviteCode }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, inviteCode });
}
