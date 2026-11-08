export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { shareToken } from "@/lib/share-token";

/** Makes a client progress link for a project in the caller's company. Foreman and up only. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`share:link:${user.id}`, 30, 60_000)) return rateLimitResponse();

  const body = await req.json().catch(() => ({}));
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!projectId) return NextResponse.json({ error: "Missing project" }, { status: 400 });

  const { data: me } = await supabase.from("profiles").select("company_id, role").eq("id", user.id).single();
  if (!me?.company_id || !["Admin", "Project Manager", "Foreman"].includes(me.role as string)) {
    return NextResponse.json({ error: "Only a foreman or admin can share a job" }, { status: 403 });
  }
  // Read through the caller's own session, so row security confirms the project is theirs
  const { data: project } = await supabase.from("projects").select("id, company_id").eq("id", projectId).single();
  if (!project || project.company_id !== me.company_id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ token: shareToken(projectId) });
}
