export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { sendEmail, emailShell, APP_URL } from "@/lib/email";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

// POST /api/join
// Looks up a company by invite code (service-role bypass), signs up the user,
// and creates their profile row — all in one server-side transaction.
export async function POST(request: NextRequest) {
  // 10 join attempts per IP per hour
  const ip = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`join:${ip}`, 10, 3_600_000)) return rateLimitResponse();

  const { inviteCode, email, password, firstName, lastName } = await request.json();

  if (!inviteCode || !email || !password || !firstName) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (email.length > 254 || password.length > 128 || firstName.length > 50 ||
      (lastName && lastName.length > 50) || inviteCode.length > 20) {
    return NextResponse.json({ error: "One or more fields exceed the maximum allowed length." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // Service-role client — bypasses RLS so we can read company by invite_code
  // before the user exists.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, cookies: { getAll: () => [], setAll: () => {} } },
  );

  // 1. Look up company
  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select("id, name")
    .eq("invite_code", inviteCode.trim().toUpperCase())
    .single();

  if (companyErr || !company) {
    return NextResponse.json({ error: "Invalid invite code." }, { status: 404 });
  }

  // 2. Create auth user
  const { data: authData, error: signUpErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { company_id: company.id },
  });

  if (signUpErr || !authData.user) {
    const msg = signUpErr?.message ?? "Sign-up failed.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // 3. Create profile
  const full = [firstName.trim(), (lastName ?? "").trim()].filter(Boolean).join(" ");
  const initials = [firstName[0], lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const { error: profileErr } = await supabase.from("profiles").insert({
    id: authData.user.id,
    company_id: company.id,
    name: full,
    initials,
    role: "Worker",
    custom_role: "",
    email,
    phone: "",
    color: "#3b82f6",
    clocked_in: false,
    hourly_rate: 0,
  });

  if (profileErr) {
    // Roll back the auth user to keep things consistent
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: "Failed to create profile." }, { status: 500 });
  }

  // Send welcome-to-team email (best-effort)
  if (process.env.RESEND_API_KEY) {
    sendEmail({
      to: email.trim(),
      subject: `You've joined ${company.name} on Constra`,
      html: emailShell({
        company: company.name,
        preheader: `You've been added to ${company.name} on Constra`,
        body: `
          <h2>Welcome to the team, ${firstName.trim()}! 🎉</h2>
          <p>You've successfully joined <strong>${company.name}</strong> on Constra.</p>
          <p>You can now clock in, view your tasks, and stay connected with your crew — all from your phone or desktop.</p>
          <a class="cta" href="${APP_URL}/dashboard">Go to your dashboard →</a>
          <p style="color:#aaa;font-size:12px;margin-top:24px">Questions? Contact your company admin or reply to this email.</p>
        `,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, companyName: company.name });
}
