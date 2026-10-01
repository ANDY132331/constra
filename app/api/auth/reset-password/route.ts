export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail, emailShell, APP_URL } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? req.headers.get("x-real-ip") ?? "unknown";
    // Silently drop over-limit requests so this can't be used to probe accounts or spam inboxes
    if (!rateLimit(`reset-pw:ip:${ip}`, 10, 3_600_000) || !rateLimit(`reset-pw:email:${email}`, 3, 3_600_000)) {
      return NextResponse.json({ ok: true });
    }

    const supabase = await createServiceClient();
    const { data, error } = await supabase.auth.admin.generateLink({ type: "recovery", email });

    if (error) {
      console.error("[reset-password] generateLink error:", error.message);
      return NextResponse.json({ ok: true });
    }

    // Link to our own page with the hashed token; the page verifies it client-side.
    // Supabase's action_link redirects with an implicit-flow hash, which the PKCE browser client rejects.
    const tokenHash = data?.properties?.hashed_token;
    if (!tokenHash) {
      console.error("[reset-password] no hashed_token returned");
      return NextResponse.json({ ok: true });
    }
    const resetUrl = `${APP_URL}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;

    const html = emailShell({
      company: "Constra",
      preheader: "Reset your Constra password",
      body: `
        <h2>Reset your password</h2>
        <p>We received a request to reset the password for your Constra account (<strong>${esc(email)}</strong>).</p>
        <p>Click the button below to choose a new password. This link expires in <strong>1 hour</strong> and can only be used once.</p>
        <a class="cta" href="${resetUrl}">Reset Password →</a>
        <p style="color:#aaa;font-size:12px;margin-top:20px">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      `,
    });

    const { error: sendError } = await sendEmail({ to: email, subject: "Reset your Constra password", html });
    if (sendError) console.error("[reset-password] email send failed:", sendError.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password] unexpected error:", err);
    return NextResponse.json({ ok: true });
  }
}
