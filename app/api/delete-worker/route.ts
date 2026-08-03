export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workerId } = await request.json().catch(() => ({}));
  if (!workerId) return NextResponse.json({ error: "Missing workerId" }, { status: 400 });

  // Verify caller is an Admin in the same company as the worker being removed
  const { data: callerProfile } = await authClient
    .from("profiles")
    .select("role, company_id")
    .eq("id", user.id)
    .single();

  if (!callerProfile || callerProfile.role !== "Admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the target worker belongs to the same company
  const { data: workerProfile } = await authClient
    .from("profiles")
    .select("company_id")
    .eq("id", workerId)
    .single();

  if (!workerProfile || workerProfile.company_id !== callerProfile.company_id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent self-deletion
  if (workerId === user.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  const service = await createServiceClient();

  // Delete the auth user — Supabase cascades to profiles if FK is configured; explicit delete below catches the rest
  const { error: authError } = await service.auth.admin.deleteUser(workerId);
  if (authError) {
    console.error("delete-worker auth error:", authError);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }

  // Explicit profile cleanup in case the DB doesn't cascade auth → profiles
  await service.from("profiles").delete().eq("id", workerId);

  return NextResponse.json({ deleted: true });
}
