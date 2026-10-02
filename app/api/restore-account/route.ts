export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function htmlPage(title: string, message: string, ok: boolean, action = "") {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title} — Constra</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#E7E5E0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px}
  .card{max-width:420px;background:#F5F4F1;border:1.5px solid #151617;border-radius:6px;padding:36px 32px;text-align:center;box-shadow:6px 6px 0 #151617}
  .tape{height:10px;margin:-36px -32px 28px;background:repeating-linear-gradient(135deg,#151617 0 10px,#F5C400 10px 20px)}
  h1{font-size:22px;color:#151617;margin:0 0 10px;text-transform:uppercase;letter-spacing:.01em}
  p{font-size:14px;color:#4B4D50;line-height:1.6;margin:0 0 24px}
  a,button{display:inline-block;background:#F5C400;color:#1A1600;font-weight:700;font-size:14px;padding:12px 24px;border-radius:4px;text-decoration:none;border:0;box-shadow:inset 0 0 0 1.5px #1A1600,0 2px 0 #1A1600;cursor:pointer}
  .ok{color:#1E7A45}.bad{color:#B9382C}
</style></head>
<body><div class="card">
  <div class="tape"></div>
  <h1 class="${ok ? "ok" : "bad"}">${title}</h1>
  <p>${message}</p>
  ${action || `<a href="/login">Go to sign in →</a>`}
</div></body></html>`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parse(url: URL) {
  const token = url.searchParams.get("token");
  const scope = url.searchParams.get("scope");
  if (!token || !UUID.test(token) || (scope !== "profile" && scope !== "company")) return null;
  return { token, scope: scope as "profile" | "company" };
}

const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/html" } });

const invalid = () =>
  html(htmlPage("Invalid link", "This deletion-cancellation link is missing required information.", false), 400);

const expired = () =>
  html(htmlPage(
    "Link expired or already used",
    "This cancellation link is no longer valid — either the account was already restored, the deletion was already completed, or the link is incorrect.",
    false,
  ), 400);

async function findPending(token: string, scope: "profile" | "company") {
  const table = scope === "company" ? "companies" : "profiles";
  const { data: row } = await getAdmin()
    .from(table)
    .select("id, deletion_requested_at")
    .eq("deletion_token", token)
    .single();
  return row && row.deletion_requested_at ? { table, id: row.id as string } : null;
}

function limited(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  return !rateLimit(`restore:${ip}`, 30, 3_600_000);
}

// GET only shows a confirm button: email security scanners open links automatically,
// and a state-changing GET would let them silently cancel a requested deletion.
export async function GET(request: Request) {
  if (limited(request)) return rateLimitResponse();
  const p = parse(new URL(request.url));
  if (!p) return invalid();
  if (!(await findPending(p.token, p.scope))) return expired();

  const what = p.scope === "company" ? "company workspace" : "account";
  const form = `<form method="post" action="/api/restore-account?token=${p.token}&scope=${p.scope}" style="margin:0">
    <button type="submit">Cancel deletion</button>
  </form>`;
  return html(htmlPage(
    `Keep your ${what}?`,
    `Your ${what} is scheduled for deletion. Cancel it to keep everything as it is.`,
    true,
    form,
  ));
}

export async function POST(request: Request) {
  if (limited(request)) return rateLimitResponse();
  const p = parse(new URL(request.url));
  if (!p) return invalid();
  const pending = await findPending(p.token, p.scope);
  if (!pending) return expired();

  const { error } = await getAdmin()
    .from(pending.table)
    .update({ deletion_requested_at: null, deletion_token: null })
    .eq("id", pending.id);

  if (error) {
    return html(htmlPage("Something went wrong", "We couldn't cancel the deletion. Please contact support@getconstra.com.", false), 500);
  }
  return html(htmlPage(
    "Deletion cancelled",
    p.scope === "company"
      ? "Your company workspace is safe — deletion has been cancelled. Sign back in to keep working."
      : "Your account is safe — deletion has been cancelled. Sign back in to keep working.",
    true,
  ));
}
