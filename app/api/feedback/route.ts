export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";

// "Tell us what's missing": a signed-in user's note goes straight to the Constra inbox, with
// who sent it, so a reply reaches them. The destination is fixed here, never taken from the
// request.
const INBOX = "support@getconstra.com";
const KINDS = { idea: "Idea", problem: "Problem", other: "Note" } as const;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to send feedback" }, { status: 401 });
  if (!rateLimit(`feedback:${user.id}`, 5, 60 * 60_000)) return rateLimitResponse();
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Email isn't set up on the server" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";
  if (message.length < 3) return NextResponse.json({ error: "Write a few words first" }, { status: 400 });
  const kind = (typeof body.kind === "string" && body.kind in KINDS ? body.kind : "other") as keyof typeof KINDS;
  const page = typeof body.page === "string" ? body.page.slice(0, 120) : "";
  const device = (req.headers.get("user-agent") ?? "").slice(0, 200);

  const { data: me } = await supabase.from("profiles").select("name, role, company_id").eq("id", user.id).single();
  const { data: co } = me?.company_id
    ? await supabase.from("companies").select("name").eq("id", me.company_id).single()
    : { data: null };

  const rows: [string, string][] = [
    ["From", `${me?.name ?? "Unknown"} (${me?.role ?? "?"})`],
    ["Company", (co?.name as string) ?? "Unknown"],
    ["Email", user.email ?? "none"],
    ["Screen", page || "unknown"],
    ["Device", device],
  ];
  try {
    await sendEmail({
      to: INBOX,
      replyTo: user.email ?? undefined,
      subject: `[${KINDS[kind]}] ${message.split("\n")[0].slice(0, 70)}`,
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#151617">
<p style="white-space:pre-wrap;margin:0 0 16px">${esc(message)}</p>
<table style="font-size:13px;color:#4B4D50;border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;font-weight:600">${k}</td><td>${esc(v)}</td></tr>`).join("")}</table>
</div>`,
    });
  } catch (e) {
    console.error("[feedback]", e);
    return NextResponse.json({ error: "It didn't send. Try again in a minute." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
