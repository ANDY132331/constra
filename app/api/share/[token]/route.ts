export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
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
