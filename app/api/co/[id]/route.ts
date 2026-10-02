export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, rateLimitResponse, rateLimitShared } from "@/lib/rate-limit";
import { sendEmail, emailShell, APP_URL } from "@/lib/email";

// Public client-approval endpoint for change orders. The change order's random UUID is the
// link token (same model as the invoice pay link), so only people sent the link can open it.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ipOf(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

async function load(id: string) {
  const { data } = await getAdmin()
    .from("change_orders")
    .select("id, company_id, number, title, description, reason, amount, status, submitted_at, approved_at, approved_by, projects ( name, client ), companies ( name, currency )")
    .eq("id", id)
    .single();
  return data;
}

type Loaded = NonNullable<Awaited<ReturnType<typeof load>>>;
const one = <T,>(v: T | T[] | null | undefined): T | undefined => (Array.isArray(v) ? v[0] : v ?? undefined);

function publicView(co: Loaded) {
  const project = one(co.projects as { name?: string; client?: string } | { name?: string; client?: string }[] | null);
  const company = one(co.companies as { name?: string; currency?: string } | { name?: string; currency?: string }[] | null);
  return {
    number: co.number,
    title: co.title,
    description: co.description ?? "",
    reason: co.reason ?? "",
    amount: Number(co.amount),
    status: co.status as "pending" | "approved" | "rejected",
    submittedAt: co.submitted_at,
    decidedAt: co.approved_at,
    decidedBy: co.approved_by,
    projectName: project?.name ?? "",
    clientName: project?.client ?? "",
    companyName: company?.name ?? "Your contractor",
    currency: company?.currency ?? "CAD",
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!rateLimit(`co-view:${ipOf(req)}`, 60, 60_000)) return rateLimitResponse();
  const { id } = await params;
  if (!UUID.test(id) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const co = await load(id);
  if (!co || co.status === "void") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(publicView(co));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await rateLimitShared(`co-decide:${ipOf(req)}`, 10, 3_600_000))) return rateLimitResponse();
  const { id } = await params;
  if (!UUID.test(id) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const decision = body.decision === "approve" ? "approved" : body.decision === "reject" ? "rejected" : null;
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  if (!decision) return NextResponse.json({ error: "Choose approve or decline" }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ error: "Type your full name to sign" }, { status: 400 });
  if (decision === "approved" && body.agree !== true) {
    return NextResponse.json({ error: "Tick the box to confirm you approve the change and its cost" }, { status: 400 });
  }

  const co = await load(id);
  if (!co || co.status === "void") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (co.status !== "pending") {
    return NextResponse.json({ error: "This change order has already been answered", ...publicView(co) }, { status: 409 });
  }

  const now = new Date().toISOString();
  const signedBy = `${name} (client, signed online)`;
  const { error } = await getAdmin()
    .from("change_orders")
    .update({ status: decision, approved_at: now, approved_by: signedBy })
    .eq("id", id)
    .eq("status", "pending");
  if (error) return NextResponse.json({ error: "Couldn't save your answer. Please try again." }, { status: 500 });

  // Tell the company's admins (best effort)
  const view = publicView({ ...co, status: decision, approved_at: now, approved_by: signedBy });
  if (process.env.RESEND_API_KEY) {
    const { data: admins } = await getAdmin()
      .from("profiles")
      .select("email")
      .eq("company_id", co.company_id)
      .in("role", ["Admin", "Project Manager"]);
    const amount = new Intl.NumberFormat("en-CA", { style: "currency", currency: view.currency }).format(view.amount);
    const verb = decision === "approved" ? "approved" : "declined";
    for (const a of admins ?? []) {
      if (!a.email || a.email.includes("@placeholder.")) continue;
      const { error: sendErr } = await sendEmail({
        to: a.email,
        subject: `${name} ${verb} ${view.number}: ${view.title} (${amount})`,
        html: emailShell({
          company: view.companyName,
          preheader: `${name} ${verb} change order ${view.number}`,
          body: `
            <h2>Change order ${esc(verb)}</h2>
            <p><strong>${esc(name)}</strong> ${esc(verb)} <strong>${esc(view.number)} — ${esc(view.title)}</strong>${view.projectName ? ` on ${esc(view.projectName)}` : ""} for <strong>${esc(amount)}</strong>.</p>
            <a class="cta" href="${APP_URL}/change-orders">View change orders →</a>
          `,
        }),
      });
      if (sendErr) console.error("[co-approval] notify failed:", sendErr.message);
    }
  }

  return NextResponse.json(view);
}
