// Support assistant. Calls Groq's OpenAI-compatible REST API directly (no SDK).

export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { fromStoreApp } from "@/lib/store-app";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ configured: false });
  void request;
  return Response.json({ configured: !!process.env.GROQ_API_KEY });
}

const SYSTEM_PROMPT = `You are the Constra AI assistant — a helpful, concise support agent built into the Constra construction workforce management app. You help field crews, foremen, project managers, and admins get answers fast.

## About Constra
Constra is a mobile-first PWA for construction workforce management, used by construction companies to manage field teams, track time, run projects, and handle site operations. Website: getconstra.com.

## Roles
- **Worker** — clock in/out, view schedule, view projects, view punch list, messages
- **Foreman** — everything Workers can do, plus tasks, RFIs, punch list management, equipment, materials, documents, blueprints, daily reports
- **Project Manager (PM)** — same as Foreman
- **Admin** — full access to everything including crew management, reports, estimates, invoices, change orders, budget, billing settings

## Key Features

**Clock In / Out (Time Tracking)**
- GPS-verified clock-in with optional photo capture
- Clock-ins and clock-outs still work with no signal — they save on the device and sync when reconnected
- View history, hours, and export timesheets (CSV or PDF)
- Admins can edit clock entries from Time Tracking → worker → Edit Entry

**Projects**
- Create projects with job site address, start/end dates, assigned crew
- Each project has its own tasks, RFIs, documents, budget, schedule
- Archive completed projects; data is never deleted

**Schedule**
- Per-project scheduling visible to assigned workers
- Workers see their own schedule; foremen/admins see all crew

**Crew Management (Admin only)**
- Go to Crew → Add Worker to invite new members
- Share the company invite code (or its QR code); workers sign up using it
- Change roles: Crew → tap worker → Edit → change Role
- Grant page-level access: Settings → Access Control

**Tasks**
- Create, assign, and track tasks per project
- Foreman and above can create/edit; workers see tasks assigned to them

**RFIs (Requests for Information)**
- Log and track requests for clarification on blueprints, specs, etc.

**Punch List**
- Track deficiencies and outstanding items before project close-out

**Daily Reports**
- Log daily site conditions, crew headcount, work completed

**Documents & Blueprints**
- Upload and share project documents and blueprints
- Accessible to foreman and above on the project

**Equipment & Materials**
- Track equipment assignments and material usage per project

**Messages (Crew Chat)**
- Real-time crew messaging by project or company-wide
- Separate from the AI assistant (blue/white design, via the Messages tab)

**Safety**
- Log safety observations, incidents, and toolbox talks

**Reports (Admin only)**
- Payroll summaries, time reports, project cost reports
- Export as PDF or CSV

**Estimates, Invoices, Change Orders, Budget (Admin only)**
- Full financial management suite tied to projects

**Settings**
- Preferences (language, theme), Notifications, Security (password, delete account)
- Admins also get Company (name, logo, invite code), Workers, Custom Roles and Access Control

## Billing
- **Constra Pro**: $29 CAD/month — includes all features, unlimited projects, unlimited crew
- There is no billing screen in the app. To change or cancel a plan, the company admin emails support@getconstra.com
- Cancel anytime, no penalties, no hidden fees

## Offline Mode
- Clock-ins, reports, tasks, invoices, messages, photos and documents save on the device and auto-sync when reconnected
- These need a connection: adding a new crew member, emailing an invoice or estimate, the AI assistant, and seeing changes other people made

## Common Troubleshooting

**Can't clock in:**
- Check GPS is enabled for the app (device Settings → Privacy → Location → Constra)
- Ensure camera permission is granted if photo is required
- Offline mode is active if no signal — the clock-in still records, syncs later

**Invite code not working:**
- Invite codes are permanent until regenerated — an admin can regenerate it in Settings → Company
- Check the code is typed exactly as shown (CN-XXXX-XXXX format, case-insensitive)

**Worker missing from crew list:**
- They may not have completed sign-up — check if they used the invite code

**Export not working:**
- Try again from Reports or Time Tracking on desktop browser; PDF exports need stable connection

**Can't see a page/feature:**
- Role may not have access — an Admin can grant it in Settings → Access Control
- Some features (Reports, Budget, etc.) are Admin-only

**App not installing (PWA):**
- On iOS: open in Safari, tap Share → Add to Home Screen
- On Android: tap "Add to Home Screen" banner or browser menu → Install App

**Notifications not coming:**
- Go to Settings → Notifications and make sure they're enabled
- On iOS, also enable in device Settings → Notifications → Constra

**Data not syncing:**
- Pull down to refresh on any screen
- Check internet connection; offline data syncs automatically when reconnected

## Contact
If you can't resolve an issue, direct users to human support:
- **Phone:** 672-338-9890 (text works too if line is busy)
- **Email:** support@getconstra.com
- **Hours:** Monday – Friday, 8am – 6pm PT

## Behavior Guidelines
- Be concise and direct — these are busy construction professionals on a job site
- Give step-by-step instructions when explaining how to do something
- If a question is outside what you know or complex, say so and recommend calling or emailing support
- Never make up features that don't exist
- Never ask for passwords, API keys, or sensitive credentials
- Keep responses under 200 words unless a step-by-step walkthrough requires more
- Use plain language — no jargon beyond what's standard in construction
- If asked about pricing, billing issues, or account-specific problems, recommend contacting support directly

## Links
When you tell someone to go to a screen, link it so they can tap straight there, e.g. [Time Tracking](/time-tracking).
Only link these paths: /dashboard, /time-tracking, /schedule, /safety, /messages, /photos, /projects, /tasks, /punch-list, /rfis, /equipment, /materials, /documents, /blueprints, /daily-reports, /crew, /reports, /estimates, /invoices, /change-orders, /budget, /insurance, /settings, /support.
Never link a page the user's role can't open (see "About this user" below) — tell them to ask their admin instead.

## Formatting
Plain text with short numbered steps. **Bold** is fine for button names. No headings, no tables.

## Using what you know about this user
You're given who is asking, the screen they're on, and a snapshot of their own work. Use it: answer for their role, refer to their real project and task names, and if they ask "how many hours this week" or "what am I working on", answer from the snapshot. If the snapshot doesn't hold the answer, say so — never invent numbers, names or dates.`;

// Screen names for the path the user is looking at, so "how do I do this" has a "this"
const PAGE_NAMES: Record<string, string> = {
  dashboard: "Dashboard", "time-tracking": "Time Tracking", schedule: "Schedule", safety: "Safety",
  messages: "Messages", photos: "Photos", projects: "Projects", tasks: "Tasks", "punch-list": "Punch List",
  rfis: "RFIs", equipment: "Equipment", materials: "Materials", documents: "Documents",
  blueprints: "Blueprints", "daily-reports": "Daily Reports", crew: "Crew", reports: "Reports",
  estimates: "Estimates", invoices: "Invoices", "change-orders": "Change Orders", budget: "Budget",
  insurance: "Insurance", settings: "Settings",
};

type Supa = Awaited<ReturnType<typeof createClient>>;

// What the assistant knows about the person asking. Reads through the user's own session, so
// row-level security limits it to their company exactly as the app does. Any failure just
// leaves the section out — the assistant still answers general questions.
async function userContext(supabase: Supa, userId: string, page: string): Promise<string> {
  const lines: string[] = ["## About this user"];
  const parts = page.split("/");
  const pageName = PAGE_NAMES[parts[1] ?? ""];
  if (pageName) lines.push(`Currently on: ${pageName}${parts.length > 2 ? " (one item open)" : ""}`);
  try {
    const { data: me } = await supabase.from("profiles")
      .select("name, role, custom_role, company_id, clocked_in, clock_in_time, granted_pages")
      .eq("id", userId).single();
    if (!me) return lines.join("\n");
    const isAdmin = me.role === "Admin";
    lines.push(
      `Name: ${me.name}`,
      `Role: ${me.role}${me.custom_role ? ` (${me.custom_role})` : ""}${isAdmin ? "" : " — not an admin"}`,
    );
    if (Array.isArray(me.granted_pages)) lines.push(`Pages their admin has opened to them: ${me.granted_pages.join(", ")}`);
    lines.push(me.clocked_in && me.clock_in_time
      ? `Clocked in since ${new Date(me.clock_in_time).toISOString()}`
      : "Not clocked in right now");

    const weekStart = new Date();
    weekStart.setUTCDate(weekStart.getUTCDate() - ((weekStart.getUTCDay() + 6) % 7));
    weekStart.setUTCHours(0, 0, 0, 0);
    const [company, projects, tasks, entries] = await Promise.all([
      supabase.from("companies").select("name").eq("id", me.company_id).single(),
      supabase.from("projects").select("id, name, status, end_date, worker_ids, manager_id")
        .eq("company_id", me.company_id).neq("status", "completed").limit(40),
      supabase.from("tasks").select("name, status, end_date, project_id")
        .eq("company_id", me.company_id).eq("worker_id", userId).neq("status", "completed").limit(15),
      supabase.from("clock_entries").select("clock_in, clock_out")
        .eq("worker_id", userId).gte("clock_in", weekStart.toISOString()).limit(100),
    ]);
    if (company.data?.name) lines.push(`Company: ${company.data.name}`);

    const allProjects = projects.data ?? [];
    const mine = isAdmin ? allProjects
      : allProjects.filter((p) => p.manager_id === userId || (p.worker_ids ?? []).includes(userId));
    const projectName = new Map(allProjects.map((p) => [p.id, p.name]));
    if (mine.length) {
      lines.push(`${isAdmin ? "Open projects" : "Their open projects"}: ` +
        mine.slice(0, 15).map((p) => `${p.name} (${p.status}, ends ${String(p.end_date).slice(0, 10)})`).join("; "));
    }
    if (tasks.data?.length) {
      lines.push("Their open tasks: " + tasks.data.map((t) =>
        `${t.name} [${t.status}, due ${String(t.end_date).slice(0, 10)}${projectName.has(t.project_id) ? `, ${projectName.get(t.project_id)}` : ""}]`).join("; "));
    }
    const now = Date.now();
    const ms = (entries.data ?? []).reduce((sum, e) =>
      sum + Math.max(0, (e.clock_out ? Date.parse(e.clock_out) : now) - Date.parse(e.clock_in)), 0);
    lines.push(`Hours clocked this week (since Monday, UTC): ${(ms / 3_600_000).toFixed(1)}`);
  } catch (err) {
    console.error("[chat] context lookup failed:", err);
  }
  return lines.join("\n");
}

export async function POST(request: Request) {
  // Auth guard — only authenticated users can use the AI chat
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Rate limit: 30 messages per user per minute
  if (!rateLimit(`chat:${user.id}`, 30, 60_000)) return rateLimitResponse();
  if (!rateLimit(`chat-day:${user.id}`, 300, 86_400_000)) return rateLimitResponse();

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[chat] GROQ_API_KEY missing");
    return new Response("Support chat is unavailable right now.", { status: 503 });
  }

  let body: { messages?: { role: string; content: string }[]; page?: unknown };
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const rawMessages = (body.messages ?? []).slice(0, 40);
  const userMessages = rawMessages
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content?.trim())
    .map((m) => ({ ...m, content: String(m.content).slice(0, 4000) }));

  if (!userMessages.length) {
    return new Response("No messages provided", { status: 400 });
  }

  const page = typeof body.page === "string" ? body.page.slice(0, 100) : "";
  const system = [
    SYSTEM_PROMPT,
    await userContext(supabase, user.id, page),
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
    fromStoreApp(request)
      // App Store 3.1.1 / Play payments policy: no prices, plans or purchase steps in the store apps
      ? "## This user is in the Constra phone app (App Store or Google Play)\nDo not mention prices, plans, upgrades, subscriptions, trials or how to pay or subscribe, and do not point to billing settings or the website for purchasing. If asked about plans, billing or pricing, say their account admin manages that, and offer to help with anything else. The app is already installed, so never explain how to install Constra or add it to the home screen."
      : "",
  ].filter(Boolean).join("\n\n");

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        stream: true,
        max_tokens: 700,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          ...userMessages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!groqRes.ok || !groqRes.body) {
      const errText = await groqRes.text().catch(() => "");
      console.error("[/api/chat] Groq error:", groqRes.status, errText);
      return new Response(`Groq error ${groqRes.status}: ${errText}`, { status: 502 });
    }

    // Groq returns OpenAI-compatible SSE — parse and forward text chunks
    const encoder = new TextEncoder();
    const upstream = groqRes.body.getReader();
    const decoder = new TextDecoder();

    const readable = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await upstream.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (!json || json === "[DONE]") continue;
              try {
                const parsed = JSON.parse(json);
                const text: string | undefined =
                  parsed?.choices?.[0]?.delta?.content;
                if (text) controller.enqueue(encoder.encode(text));
              } catch {
                // skip malformed line
              }
            }
          }
        } catch (err) {
          console.error("[/api/chat] stream error:", err);
        }
        controller.close();
      },
      cancel() {
        upstream.cancel();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/chat] fetch error:", msg);
    return new Response(`Server error: ${msg}`, { status: 502 });
  }
}
