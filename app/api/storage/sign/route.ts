export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const PRIVATE_BUCKETS = new Set(["documents", "clock-photos", "project-photos"]);
const TTL_SECONDS = 3600;

// Private-bucket files are stored as "{companyId}/..." paths. Signed links are only
// issued to signed-in members of that company.
export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!rateLimit(`storage-sign:${user.id}`, 300, 60_000)) return rateLimitResponse();

  const body = await request.json().catch(() => null);
  const bucket = typeof body?.bucket === "string" ? body.bucket : "";
  const path = typeof body?.path === "string" ? body.path : "";
  if (!PRIVATE_BUCKETS.has(bucket) || !path || path.includes("..")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const { data: profile } = await authClient.from("profiles").select("company_id").eq("id", user.id).single();
  if (!profile?.company_id || !path.startsWith(`${profile.company_id}/`)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = await createServiceClient();
  const { data, error } = await service.storage.from(bucket).createSignedUrl(path, TTL_SECONDS);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  return NextResponse.json({ url: data.signedUrl, expiresIn: TTL_SECONDS });
}
