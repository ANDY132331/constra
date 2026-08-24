export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function htmlPage(title: string, message: string, ok: boolean) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — Constra</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px}
  .card{max-width:420px;background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px 32px;text-align:center}
  .icon{font-size:40px;margin-bottom:16px}
  h1{font-size:20px;color:#fff;margin:0 0 10px}
  p{font-size:14px;color:rgba(255,255,255,0.55);line-height:1.6;margin:0 0 24px}
  a{display:inline-block;background:#F5C400;color:#0a0a0a;font-weight:700;font-size:13px;padding:12px 24px;border-radius:10px;text-decoration:none}
</style></head>
<body><div class="card">
  <div class="icon">${ok ? "✅" : "⚠️"}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <a href="/login">Go to Sign In →</a>
</div></body></html>`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const scope = url.searchParams.get("scope");

  if (!token || (scope !== "profile" && scope !== "company")) {
    return new Response(htmlPage("Invalid link", "This deletion-cancellation link is missing required information.", false), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const admin = getAdmin();
  const table = scope === "company" ? "companies" : "profiles";

  const { data: row } = await admin
    .from(table)
    .select("id, deletion_requested_at")
    .eq("deletion_token", token)
    .single();

  if (!row || !row.deletion_requested_at) {
    return new Response(
      htmlPage(
        "Link expired or already used",
        "This cancellation link is no longer valid — either the account was already restored, the deletion was already completed, or the link is incorrect.",
        false
      ),
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  const { error } = await admin
    .from(table)
    .update({ deletion_requested_at: null, deletion_token: null })
    .eq("id", row.id);

  if (error) {
    return new Response(htmlPage("Something went wrong", "We couldn't cancel the deletion. Please contact support@getconstra.com.", false), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }

  return new Response(
    htmlPage(
      "Deletion cancelled",
      scope === "company"
        ? "Your company workspace is safe — deletion has been cancelled. Sign back in to keep working."
        : "Your account is safe — deletion has been cancelled. Sign back in to keep working.",
      true
    ),
    { headers: { "Content-Type": "text/html" } }
  );
}
