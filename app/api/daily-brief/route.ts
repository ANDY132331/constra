export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { generateBrief, type BriefPayload } from "@/lib/daily-brief";

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
