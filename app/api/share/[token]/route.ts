export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { projectProgress } from "@/lib/project-progress";
import { readShareToken } from "@/lib/share-token";

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

  const link = readShareToken(token);
  if (!link) return NextResponse.json({ error: "Project not found" }, { status: 404 });
  const supabase = getAdmin();

  // Old links are the bare project id and show progress only; signed links add photos and the logo
  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      id, name, client, address, status, progress, color,
      start_date, end_date,
      tasks ( id, name, status, progress, start_date, end_date ),
      company_id, companies ( name, logo )
    `)
    .eq("id", link.projectId)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Photos the crew took on this job: hosted ones only (an inline image can be megabytes)
  let photos: { id: string; url: string; caption: string; at: string }[] = [];
  if (link.signed) {
    const { data: rows } = await supabase
      .from("photos")
      .select("id, url, caption, uploaded_at")
      .eq("project_id", link.projectId)
      .eq("company_id", (project as { company_id: string }).company_id)
      .like("url", "https://%")
      .order("uploaded_at", { ascending: false })
      .limit(12);
    // Job photos live in a private bucket: hand the client a link that works for an hour
    const signed = await Promise.all((rows ?? []).map(async (p) => {
      const m = (p.url as string).match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/([^?]+)/);
      let url = p.url as string;
      if (m && ["project-photos", "clock-photos", "documents"].includes(m[1])) {
        // Clock-in selfies and documents never go to a client, whatever the row says
        if (m[1] !== "project-photos") return null;
        const { data } = await supabase.storage.from(m[1]).createSignedUrl(decodeURIComponent(m[2]), 3600);
        if (!data?.signedUrl) return null;
        url = data.signedUrl;
      }
      return { id: p.id as string, url, caption: (p.caption as string) ?? "", at: p.uploaded_at as string };
    }));
    photos = signed.filter((p): p is NonNullable<typeof p> => p !== null);
  }
  const co = project.companies as { name?: string; logo?: string } | null;
  const logo = link.signed && co?.logo && co.logo.length < 1_500_000 ? co.logo : null;

  // Return only client-safe fields — no budget / financial data
  return NextResponse.json({
    photos,
    logo,
    updatedAt: photos[0]?.at ?? null,
    id: project.id,
    name: project.name,
    client: project.client,
    address: project.address,
    status: project.status,
    progress: projectProgress(project as Parameters<typeof projectProgress>[0]),
    color: project.color,
    startDate: project.start_date,
    endDate: project.end_date,
    companyName: co?.name ?? "Your contractor",
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
