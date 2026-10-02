export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sendEmail, taskAssignedEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`task-notify:${user.id}`, 20, 60_000)) return rateLimitResponse();

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ skipped: true });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { to, taskName, projectName, assigneeName, dueDate } = body as {
    to: string; taskName: string; projectName: string;
    assigneeName: string; dueDate?: string;
  };

  if (!to || !taskName || !projectName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify `to` belongs to the caller's company (prevents using this as an open relay)
  const { data: callerProfile } = await authClient
    .from("profiles")
    .select("company_id, name, role")
    .eq("id", user.id)
    .single();
  // Only people who can assign tasks (foreman and up) can send assignment emails
  if (!callerProfile || !["Admin", "Project Manager", "Foreman"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { data: targetProfile } = await authClient
    .from("profiles")
    .select("id")
    .eq("company_id", callerProfile.company_id)
    .eq("email", to)
    .maybeSingle();
  if (!targetProfile) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const safeName = (s: unknown, max = 100) => String(s ?? "").slice(0, max).replace(/[<>"'&]/g, "");
  const { data: company } = await authClient.from("companies").select("name").eq("id", callerProfile.company_id).single();
  try {
    await sendEmail({
      to,
      subject: `You've been assigned: "${safeName(taskName)}" — ${safeName(projectName)}`,
      html: taskAssignedEmail({
        company: safeName(company?.name ?? "Constra"),
        assigneeName: safeName(assigneeName ?? "there"),
        assignerName: safeName(callerProfile.name || "Your manager"),
        taskName: safeName(taskName),
        projectName: safeName(projectName),
        dueDate: dueDate ? safeName(dueDate, 50) : undefined,
      }),
    });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("task-assigned email error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
