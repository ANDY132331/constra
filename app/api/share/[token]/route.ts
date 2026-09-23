export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  if (!rateLimit(`share:${ip}`, 60, 60_000)) return rateLimitResponse();

  const { token } = await params;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const supabase = getAdmin();

  // token = project ID (UUID — unguessable enough for casual sharing)
  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      id, name, client, address, status, progress, color,
      start_date, end_date,
      tasks ( id, name, status, progress, start_date, end_date ),
      companies ( name )
    `)
    .eq("id", token)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Return only client-safe fields — no budget / financial data
  return NextResponse.json({
    id: project.id,
    name: project.name,
    client: project.client,
    address: project.address,
    status: project.status,
    progress: project.progress,
    color: project.color,
    startDate: project.start_date,
    endDate: project.end_date,
    companyName: (project.companies as { name?: string } | null)?.name ?? "Your contractor",
    tasks: (project.tasks as { id: string; name: string; status: string; progress: number; start_date: string; end_date: string }[]).map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      progress: t.progress,
      startDate: t.start_date,
      endDate: t.end_date,
    })),
  });
}
