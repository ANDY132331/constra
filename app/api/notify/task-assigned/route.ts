export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sendEmail, taskAssignedEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ skipped: true });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { to, taskName, projectName, assigneeName, assignerName, dueDate, companyName } = body as {
    to: string; taskName: string; projectName: string;
    assigneeName: string; assignerName: string;
    dueDate?: string; companyName?: string;
  };

  if (!to || !taskName || !projectName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify `to` belongs to the caller's company (prevents using this as an open relay)
  const { data: callerProfile } = await authClient
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (callerProfile) {
    const { data: targetProfile } = await authClient
      .from("profiles")
      .select("id")
      .eq("company_id", callerProfile.company_id)
      .eq("email", to)
      .maybeSingle();
    if (!targetProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    await sendEmail({
      to,
      subject: `You've been assigned: "${taskName}" — ${projectName}`,
      html: taskAssignedEmail({
        company: companyName ?? "Constra",
        assigneeName: assigneeName ?? "there",
        assignerName: assignerName ?? "Your manager",
        taskName,
        projectName,
        dueDate,
      }),
    });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("task-assigned email error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
