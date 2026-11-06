// A tiny in-memory stand-in for Supabase, so offline sync can be tested end to end without touching
// the live database. Started by offline-sync.mjs. Inspect it at GET /__db, change behaviour with
// POST /__control {"failTable": "tasks", "failCode": "42501"} or {"down": true}.
import http from "http";

export const COMPANY = "11111111-1111-4111-8111-111111111111";
export const USER = "22222222-2222-4222-8222-222222222222";
export const PROJECT = "33333333-3333-4333-8333-333333333333";

export function startMock(port) {
  const now = new Date().toISOString();
  const db = {
    companies: [{ id: COMPANY, name: "Sync Test Co", currency: "CAD", plan: "pro", invite_code: "CN-TEST-TEST", custom_roles: [], created_at: now }],
    profiles: [{ id: USER, company_id: COMPANY, name: "Sam Tester", initials: "ST", role: "Admin", custom_role: "Owner", email: "sam@example.test", phone: "", color: "#f59e0b", clocked_in: false, hourly_rate: 40, created_at: now }],
    // Never opened in the test before going offline, so its own page isn't cached
    invoices: [{ id: "44444444-4444-4444-8444-444444444444", company_id: COMPANY, number: "INV-SEED-1", client_name: "Rivera Family", client_email: "", client_address: "", issue_date: now, due_date: now, status: "sent", items: [{ description: "Framing", qty: 1, rate: 500 }], tax_rate: 13, created_at: now }],
    projects: [{ id: PROJECT, company_id: COMPANY, name: "Maple St Reno", client: "Rivera", status: "active", start_date: now, end_date: now, progress: 10, budget: 1000, spent: 0, address: "", color: "#3b82f6", worker_ids: [USER], created_at: now }],
  };
  const files = {};
  const log = [];
  let control = {};

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const send = (code, json) => {
        res.writeHead(code, {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": req.headers.origin ?? "*",
          "Access-Control-Allow-Headers": req.headers["access-control-request-headers"] ?? "*",
          "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Expose-Headers": "*",
        });
        res.end(json === undefined ? "" : JSON.stringify(json));
      };
      if (req.method === "OPTIONS") return send(204);
      if (url.pathname === "/__db") return send(200, { db, files: Object.keys(files), log });
      if (url.pathname === "/__control") { control = JSON.parse(body.toString() || "{}"); return send(200, control); }
      if (control.down) return req.socket.destroy();

      if (url.pathname === "/auth/v1/user") return send(200, { id: USER, aud: "authenticated", role: "authenticated", email: "sam@example.test", app_metadata: {}, user_metadata: {}, created_at: now });

      const upload = /^\/storage\/v1\/object\/([^/]+)\/(.+)$/.exec(url.pathname);
      if (upload && req.method === "POST") {
        const key = `${upload[1]}/${decodeURIComponent(upload[2])}`;
        if (files[key]) return send(409, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
        files[key] = body.length;
        log.push(`upload ${upload[1]}`);
        return send(200, { Key: key, Id: key });
      }

      const rest = /^\/rest\/v1\/([a-z_]+)$/.exec(url.pathname);
      if (!rest) return send(404, { message: "not found" });
      const table = rest[1];
      const rows = (db[table] ??= []);
      const filters = [...url.searchParams].filter(([k, v]) => !["select", "order", "limit", "columns", "on_conflict"].includes(k) && v.startsWith("eq."));
      const match = (r) => filters.every(([k, v]) => String(r[k]) === v.slice(3));

      if (req.method !== "GET" && control.failTable === table) {
        return send(403, { code: control.failCode ?? "42501", message: "refused by test", details: null, hint: null });
      }
      if (req.method === "GET") {
        const found = rows.filter(match);
        if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) {
          return found.length === 1 ? send(200, found[0]) : send(406, { code: "PGRST116", message: "no rows" });
        }
        return send(200, found);
      }
      const data = body.length ? JSON.parse(body.toString()) : null;
      if (req.method === "POST") {
        for (const row of Array.isArray(data) ? data : [data]) {
          if (rows.some((r) => r.id === row.id)) return send(409, { code: "23505", message: "duplicate key" });
          if (table === "tasks" && !(db.projects ?? []).some((p) => p.id === row.project_id)) {
            return send(409, { code: "23503", message: "project missing: changes replayed out of order" });
          }
          rows.push(row);
          log.push(`insert ${table}`);
        }
        return send(201);
      }
      if (req.method === "PATCH") {
        rows.filter(match).forEach((r) => Object.assign(r, data));
        log.push(`update ${table}`);
        return send(204);
      }
      if (req.method === "DELETE") {
        db[table] = rows.filter((r) => !match(r));
        log.push(`delete ${table}`);
        return send(204);
      }
      send(405, { message: "method" });
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (process.argv[1]?.endsWith("mock-supabase.mjs")) {
  const port = Number(process.argv[2] ?? 54399);
  await startMock(port);
  console.log(`mock supabase on ${port}`);
}
