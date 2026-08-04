export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

type BriefPayload = {
  workerCount: number;
  clockedInWorkers: Array<{ name: string; role: string; project: string; hoursIn: number }>;
  activeProjects: Array<{ name: string; progress: number; tasksTotal: number; tasksDue: number; tasksOverdue: number }>;
  tasksDueToday: Array<{ name: string; project: string; worker: string; overdue: boolean }>;
  openPunchItems: number;
  highPriorityPunchItems: number;
  safetyIncidentsThisWeek: number;
  companyName: string;
  currentTime: string;
};

function generateBrief(data: BriefPayload): string {
  const hour = new Date(data.currentTime).getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const due = data.tasksDueToday.filter((t) => !t.overdue);
  const overdue = data.tasksDueToday.filter((t) => t.overdue);

  const lines: string[] = [];

  // Header
  lines.push(`**${greeting} — here's your site snapshot.**`);
  lines.push("");

  // Crew
  lines.push("**Crew on Site**");
  if (data.clockedInWorkers.length === 0) {
    lines.push(`No workers clocked in yet. ${data.workerCount} total crew in your workspace.`);
  } else {
    lines.push(`${data.clockedInWorkers.length} of ${data.workerCount} workers currently on site:`);
    data.clockedInWorkers.slice(0, 5).forEach((w) => {
      lines.push(`• ${w.name} (${w.role}) — ${w.project}, ${w.hoursIn.toFixed(1)}h in`);
    });
    if (data.clockedInWorkers.length > 5) {
      lines.push(`• …and ${data.clockedInWorkers.length - 5} more`);
    }
  }
  lines.push("");

  // Projects
  if (data.activeProjects.length > 0) {
    lines.push("**Active Projects**");
    data.activeProjects.slice(0, 4).forEach((p) => {
      const flags: string[] = [];
      if (p.tasksOverdue > 0) flags.push(`${p.tasksOverdue} task${p.tasksOverdue > 1 ? "s" : ""} overdue`);
      if (p.tasksDue > 0) flags.push(`${p.tasksDue} due today`);
      const flagStr = flags.length > 0 ? ` — ⚠ ${flags.join(", ")}` : "";
      lines.push(`• ${p.name}: ${p.progress}% complete${flagStr}`);
    });
    lines.push("");
  }

  // Tasks
  if (overdue.length > 0 || due.length > 0) {
    lines.push("**Tasks**");
    if (overdue.length > 0) {
      lines.push(`${overdue.length} overdue task${overdue.length > 1 ? "s" : ""} need immediate attention:`);
      overdue.slice(0, 3).forEach((t) => lines.push(`• "${t.name}" — ${t.project} (${t.worker})`));
      if (overdue.length > 3) lines.push(`• …and ${overdue.length - 3} more`);
    }
    if (due.length > 0) {
      lines.push(`${due.length} task${due.length > 1 ? "s" : ""} due today:`);
      due.slice(0, 3).forEach((t) => lines.push(`• "${t.name}" — ${t.project} (${t.worker})`));
      if (due.length > 3) lines.push(`• …and ${due.length - 3} more`);
    }
    lines.push("");
  }

  // Issues
  const hasIssues = data.openPunchItems > 0 || data.safetyIncidentsThisWeek > 0;
  if (hasIssues) {
    lines.push("**Open Issues**");
    if (data.openPunchItems > 0) {
      lines.push(`${data.openPunchItems} open punch list item${data.openPunchItems > 1 ? "s" : ""}${data.highPriorityPunchItems > 0 ? ` — ${data.highPriorityPunchItems} high priority` : ""}.`);
    }
    if (data.safetyIncidentsThisWeek > 0) {
      lines.push(`⚠ ${data.safetyIncidentsThisWeek} safety incident${data.safetyIncidentsThisWeek > 1 ? "s" : ""} logged this week — review before mobilising crew.`);
    }
    lines.push("");
  }

  // Action items
  const actions: string[] = [];
  if (data.safetyIncidentsThisWeek > 0) actions.push("Review this week's safety incidents before crew mobilises");
  if (data.highPriorityPunchItems > 0) actions.push(`Clear ${data.highPriorityPunchItems} high-priority punch item${data.highPriorityPunchItems > 1 ? "s" : ""}`);
  if (overdue.length > 0) actions.push(`Follow up on ${overdue.length} overdue task${overdue.length > 1 ? "s" : ""} — delays compound`);
  if (due.length > 0) actions.push(`${due.length} task${due.length > 1 ? "s" : ""} due today — confirm assignments are clear`);
  if (data.clockedInWorkers.length === 0 && data.workerCount > 0) actions.push("No one clocked in yet — check on crew status");
  if (actions.length === 0) actions.push("All clear — solid start to the day");

  lines.push("**What to Focus On**");
  actions.slice(0, 4).forEach((a, i) => lines.push(`${i + 1}. ${a}`));

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`daily-brief:${user.id}:${ip}`, 10, 60_000)) return rateLimitResponse();

  let body: BriefPayload = {
    workerCount: 0, clockedInWorkers: [], activeProjects: [], tasksDueToday: [],
    openPunchItems: 0, highPriorityPunchItems: 0, safetyIncidentsThisWeek: 0,
    companyName: "", currentTime: new Date().toISOString(),
  };
  try { body = await req.json(); } catch { /* use defaults */ }

  const brief = generateBrief(body);

  // Stream character by character so the dashboard's existing streaming UI still works
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(brief));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
