// Server-only. Client progress links carry a signature, so changing the project id in a link
// doesn't open someone else's job. Older links were the bare project id; those still open, with
// progress only, so a link already sent to a client doesn't break.

import { createHmac, timingSafeEqual } from "crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function key() {
  // A dedicated secret if one is set; otherwise one derived from a server-only key that already exists
  const k = process.env.SHARE_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("No secret for share links");
  return k;
}

const sign = (projectId: string) =>
  createHmac("sha256", key()).update(`project-share:${projectId}`).digest("base64url").slice(0, 22);

export function shareToken(projectId: string) {
  return `${projectId}.${sign(projectId)}`;
}

/** The project a link points at, and whether it's a signed (full) link or an old bare one */
export function readShareToken(token: string): { projectId: string; signed: boolean } | null {
  const [id, sig] = token.split(".");
  if (!id || !UUID.test(id)) return null;
  if (sig === undefined) return { projectId: id, signed: false };
  const want = Buffer.from(sign(id));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return { projectId: id, signed: true };
}
