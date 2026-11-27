export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { clientIp } from "@/lib/security";

// Crashes on people's phones, written to the server log (Vercel › Logs, search "[client-error]").
// No user id, email or page data is stored: only the error text, the page path and the browser.
// Open to signed-out visitors too, since the login and signup pages can break as well.
const cut = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");

export async function POST(request: NextRequest) {
  if (!rateLimit(`client-error:${clientIp(request)}`, 10, 60_000)) return rateLimitResponse();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ ok: false }, { status: 400 });
  const path = cut(body.path, 200).split("?")[0];
  console.error("[client-error]", JSON.stringify({
    kind: cut(body.kind, 20),
    message: cut(body.message, 500),
    stack: cut(body.stack, 2000),
    digest: cut(body.digest, 80),
    path,
    ua: cut(request.headers.get("user-agent"), 200),
  }));
  return NextResponse.json({ ok: true });
}
