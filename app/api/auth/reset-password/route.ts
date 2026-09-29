export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail, emailShell, APP_URL } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = await createServiceClient();

    // Generate the reset link server-side — bypasses Supabase SMTP entirely
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${APP_URL}/reset-password` },
    });

    if (error) {
      // Don't leak whether the email exists — always return 200
      console.error("[reset-password] generateLink error:", error.message);
      return NextResponse.json({ ok: true });
    }

    const resetUrl = data?.properties?.action_link;
    if (!resetUrl) {
      console.error("[reset-password] no action_link returned");
      return NextResponse.json({ ok: true });
    }

    const html = emailShell({
      company: "Constra",
      preheader: "Reset your Constra password",
      body: `
        <h2>Reset your password</h2>
        <p>We received a request to reset the password for your Constra account (<strong>${email}</strong>).</p>
        <p>Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
        <a class="cta" href="${resetUrl}">Reset Password →</a>
        <p style="color:#aaa;font-size:12px;margin-top:20px">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      `,
    });

    await sendEmail({
      to: email,
      subject: "Reset your Constra password",
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password] unexpected error:", err);
    return NextResponse.json({ ok: true }); // Never leak errors
  }
}
