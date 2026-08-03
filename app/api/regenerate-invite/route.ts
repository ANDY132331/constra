export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "CN-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += "-";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function POST(request: Request) {
  const { companyId } = await request.json();
  if (!companyId) return NextResponse.json({ error: "Missing companyId." }, { status: 400 });

  // Verify caller is authenticated and is an Admin of the requested company
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data: profile } = await authClient
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.company_id !== companyId || profile.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const serviceClient = await createServiceClient();
  const newCode = generateInviteCode();
  const { error } = await serviceClient
    .from("companies")
    .update({ invite_code: newCode })
    .eq("id", companyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inviteCode: newCode });
}
