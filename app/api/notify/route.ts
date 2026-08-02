export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";
import {
  sendEmail,
  crewMessageEmail,
  safetyIncidentEmail,
  taskAssignedEmail,
  clockInEmail,
} from "@/lib/email";

function supabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false }, cookies: { getAll: () => [], setAll: () => {} } },
  );
}

async function getCompanyWorkers(companyId: string) {
  const { data } = await supabase()
    .from("profiles")
    .select("id, name, email, role")
    .eq("company_id", companyId)
    .not("email", "is", null);
  return (data ?? []) as { id: string; name: string; email: string; role: string }[];
}

async function getCompanyName(companyId: string) {
  const { data } = await supabase()
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();
  return (data?.name as string | undefined) ?? "Your Company";
}

export async function POST(request: Request) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: "no RESEND_API_KEY" });
  }

  const body = await request.json().catch(() => null);
  if (!body?.type || !body?.companyId) {
    return NextResponse.json({ error: "Missing type or companyId" }, { status: 400 });
  }

  const { type, companyId, data } = body as {
    type: string;
    companyId: string;
    data: Record<string, string>;
  };

  const [workers, company] = await Promise.all([
    getCompanyWorkers(companyId),
    getCompanyName(companyId),
  ]);

  const adminsAndPMs = workers.filter((w) => w.role === "Admin" || w.role === "Project Manager");

  try {
    switch (type) {
      case "crew_message": {
        // Notify everyone except the sender — but cap at 20 to avoid spam bursts
        const recipients = workers
          .filter((w) => w.id !== data.senderUserId && w.email)
          .slice(0, 20);
        await Promise.all(
          recipients.map((w) =>
            sendEmail({
              to: w.email,
              subject: `💬 ${data.senderName} in ${data.projectName} — Constra`,
              html: crewMessageEmail({
                company,
                senderName: data.senderName,
                projectName: data.projectName,
                message: data.message,
              }),
            }),
          ),
        );
        break;
      }

      case "safety_incident": {
        const recipients = adminsAndPMs.filter((w) => w.id !== data.reporterUserId && w.email);
        await Promise.all(
          recipients.map((w) =>
            sendEmail({
              to: w.email,
              subject: `⚠️ Safety incident on ${data.projectName} — Constra`,
              html: safetyIncidentEmail({
                company,
                reporterName: data.reporterName,
                projectName: data.projectName,
                description: data.description,
                severity: data.severity,
              }),
            }),
          ),
        );
        break;
      }

      case "task_assigned": {
        const assignee = workers.find((w) => w.id === data.assigneeUserId);
        if (assignee?.email) {
          await sendEmail({
            to: assignee.email,
            subject: `📋 New task: ${data.taskName} — Constra`,
            html: taskAssignedEmail({
              company,
              assigneeName: assignee.name,
              assignerName: data.assignerName,
              taskName: data.taskName,
              projectName: data.projectName,
              dueDate: data.dueDate,
            }),
          });
        }
        break;
      }

      case "clock_in":
      case "clock_out": {
        const action = type === "clock_in" ? "in" : "out";
        const recipients = adminsAndPMs.filter((w) => w.id !== data.workerUserId && w.email);
        await Promise.all(
          recipients.map((w) =>
            sendEmail({
              to: w.email,
              subject: `${action === "in" ? "🟢" : "🔴"} ${data.workerName} clocked ${action} — Constra`,
              html: clockInEmail({
                company,
                workerName: data.workerName,
                projectName: data.projectName,
                time: data.time,
                action,
              }),
            }),
          ),
        );
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Notification error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
