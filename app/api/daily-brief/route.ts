import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const MOCK_BRIEF = `**Good morning — here's your site snapshot for today.**

**Crew on Site**
No workers have clocked in yet. Expected crew of 8 across your active projects once the day gets rolling.

**Today's Task Priorities**
• 2 tasks are due today — check the task board for assignees and blockers
• 3 tasks are currently overdue and need immediate attention

**Active Projects**
All 3 active projects are progressing. Lakeview Condo Development leads at 72% complete. Watch the North Bridge Overpass project — it's running slightly behind schedule.

**Open Issues**
4 punch list items remain open, including 1 high-priority electrical safety item on the North Bridge site. Recommend resolving before end of day.

**What to Focus On**
1. Follow up on the overdue tasks — delays compound fast
2. Clear the high-priority safety punch item
3. Check in with the North Bridge foreman on schedule recovery

Have a productive day on site.`;

function buildPrompt(data: {
  workerCount: number;
  clockedInWorkers: Array<{ name: string; role: string; project: string; hoursIn: number }>;
  activeProjects: Array<{ name: string; progress: number; tasksTotal: number; tasksDue: number; tasksOverdue: number }>;
  tasksDueToday: Array<{ name: string; project: string; worker: string; overdue: boolean }>;
  openPunchItems: number;
  highPriorityPunchItems: number;
  safetyIncidentsThisWeek: number;
  companyName: string;
  currentTime: string;
}) {
  const lines: string[] = [];

  lines.push(`Company: ${data.companyName}`);
  lines.push(`Current time: ${data.currentTime}`);
  lines.push(`Total crew: ${data.workerCount} workers`);
  lines.push(`Currently clocked in (${data.clockedInWorkers.length}):`);
  if (data.clockedInWorkers.length === 0) {
    lines.push("  - No one clocked in yet");
  } else {
    data.clockedInWorkers.forEach((w) => {
      lines.push(`  - ${w.name} (${w.role}) on ${w.project} — ${w.hoursIn.toFixed(1)}h so far`);
    });
  }

  lines.push(`\nActive projects (${data.activeProjects.length}):`);
  data.activeProjects.forEach((p) => {
    lines.push(`  - ${p.name}: ${p.progress}% complete, ${p.tasksDue} task(s) due today, ${p.tasksOverdue} overdue`);
  });

  const due = data.tasksDueToday.filter((t) => !t.overdue);
  const overdue = data.tasksDueToday.filter((t) => t.overdue);
  if (due.length > 0) {
    lines.push(`\nTasks due today (${due.length}):`);
    due.forEach((t) => lines.push(`  - "${t.name}" on ${t.project} (assigned to ${t.worker})`));
  }
  if (overdue.length > 0) {
    lines.push(`\nOverdue tasks (${overdue.length}):`);
    overdue.forEach((t) => lines.push(`  - "${t.name}" on ${t.project} (assigned to ${t.worker})`));
  }

  lines.push(`\nOpen punch list items: ${data.openPunchItems} (${data.highPriorityPunchItems} high priority)`);
  lines.push(`Safety incidents this week: ${data.safetyIncidentsThisWeek}`);

  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  type BriefPayload = Parameters<typeof buildPrompt>[0];
  let body: BriefPayload = {
    workerCount: 0, clockedInWorkers: [], activeProjects: [], tasksDueToday: [],
    openPunchItems: 0, highPriorityPunchItems: 0, safetyIncidentsThisWeek: 0,
    companyName: "", currentTime: new Date().toISOString(),
  };
  try { body = await req.json(); } catch { /* empty body — use defaults */ }

  if (!apiKey || apiKey.startsWith("your-")) {
    return new Response(MOCK_BRIEF, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(body);

  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 512,
    thinking: { type: "adaptive" },
    system:
      "You are a sharp, no-nonsense construction site AI assistant. Generate a brief daily morning summary for the site manager — what matters today, who's on site, what's at risk, and what to act on first. Use bold headings and bullet points. Be concise: under 220 words total. Do not use placeholders — write actual analysis from the data provided.",
    messages: [{ role: "user", content: prompt }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI generation failed";
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
