// Data-aware AI endpoint — answers financial & operational questions
// using the actual company data sent from the client (store).
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export type ProjectSnap = {
  name: string;
  status: string;
  budget: number;
  spent: number;
  laborCost: number;  // clock hours × hourly rate
  revenue: number;    // invoices for this project
  progress: number;
  overdueTasks: number;
};

export type CompanySnap = {
  companyName: string;
  currency: string;
  currentDate: string;
  // Revenue
  totalBilled: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueInvoices: Array<{ number: string; amount: number; client: string; daysOverdue: number }>;
  // Labor (this month)
  totalLaborCostThisMonth: number;
  totalHoursThisMonth: number;
  // Projects
  projects: ProjectSnap[];
  // Budget lines
  budgetByCategory: Array<{ category: string; budgeted: number; actual: number }>;
  // Crew
  workerCount: number;
  clockedInCount: number;
  // Equipment
  equipmentTotal: number;
  equipmentInUse: number;
};

const SYSTEM_PROMPT = `You are the Constra AI — the financial and operations brain for a construction company. You have access to real company data.

Answer questions using specific numbers from the data. Be direct. Flag risks and opportunities immediately. Use plain construction-industry language.

Keep answers under 250 words unless asked for a full breakdown. Format currency with 2 decimal places when showing exact figures, or use K/M for large compact numbers.`;

function buildContext(d: CompanySnap): string {
  const lines: string[] = [
    `Company: ${d.companyName}`,
    `Date: ${d.currentDate}`,
    `Currency: ${d.currency}`,
    ``,
    `=== REVENUE ===`,
    `Billed: ${d.totalBilled.toFixed(2)}`,
    `Collected (paid): ${d.totalCollected.toFixed(2)}`,
    `Outstanding (unpaid): ${d.totalOutstanding.toFixed(2)}`,
    d.totalBilled > 0
      ? `Collection rate: ${((d.totalCollected / d.totalBilled) * 100).toFixed(1)}%`
      : `Collection rate: N/A (no invoices yet)`,
  ];

  if (d.overdueInvoices.length > 0) {
    lines.push(``, `Overdue invoices (${d.overdueInvoices.length}):`);
    d.overdueInvoices.forEach((inv) => {
      lines.push(
        `  Invoice ${inv.number} — ${inv.amount.toFixed(2)} from ${inv.client}, ${inv.daysOverdue} days overdue`
      );
    });
  }

  lines.push(
    ``,
    `=== LABOR (This Month) ===`,
    `Hours worked: ${d.totalHoursThisMonth.toFixed(1)}h`,
    `Labour cost: ${d.totalLaborCostThisMonth.toFixed(2)}`
  );

  if (d.budgetByCategory.length > 0) {
    lines.push(``, `=== BUDGET BY CATEGORY ===`);
    d.budgetByCategory.forEach((b) => {
      const pct = b.budgeted > 0 ? ((b.actual / b.budgeted) * 100).toFixed(0) + "%" : "N/A";
      const flag = b.actual > b.budgeted ? " ⚠ OVER BUDGET" : "";
      lines.push(`  ${b.category}: budgeted ${b.budgeted.toFixed(0)}, actual ${b.actual.toFixed(0)} (${pct})${flag}`);
    });
  }

  if (d.projects.length > 0) {
    lines.push(``, `=== PROJECTS (${d.projects.length} total) ===`);
    d.projects.forEach((p) => {
      const budgetPct = p.budget > 0 ? ((p.spent / p.budget) * 100).toFixed(0) + "%" : "N/A";
      const grossProfit = p.revenue - p.laborCost - p.spent;
      const margin = p.revenue > 0 ? ((grossProfit / p.revenue) * 100).toFixed(1) + "%" : "N/A";
      lines.push(
        `  ${p.name} [${p.status}]: ${p.progress}% complete` +
        ` | Budget ${p.budget.toFixed(0)} / spent ${p.spent.toFixed(0)} (${budgetPct})` +
        ` | Labour ${p.laborCost.toFixed(0)}` +
        ` | Revenue ${p.revenue.toFixed(0)}` +
        ` | Est. gross profit ${grossProfit.toFixed(0)} (${margin})` +
        (p.overdueTasks > 0 ? ` | ⚠ ${p.overdueTasks} overdue tasks` : "")
      );
    });
  }

  lines.push(
    ``,
    `=== CREW ===`,
    `Total workers: ${d.workerCount}`,
    `Currently clocked in: ${d.clockedInCount}`,
    ``,
    `=== EQUIPMENT ===`,
    `Total: ${d.equipmentTotal}`,
    `In use: ${d.equipmentInUse}`
  );

  return lines.join("\n");
}

export async function GET() {
  return Response.json({ configured: !!process.env.GROQ_API_KEY });
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response("GROQ_API_KEY not set in Vercel environment", { status: 503 });
  }

  let body: { messages: Array<{ role: string; content: string }>; companyData: CompanySnap };
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { messages, companyData } = body;
  if (!messages?.length || !companyData) {
    return new Response("Missing messages or companyData", { status: 400 });
  }

  const context = buildContext(companyData);
  const groqMessages = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n${context}` },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

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
        messages: groqMessages,
      }),
    });

    if (!groqRes.ok || !groqRes.body) {
      const txt = await groqRes.text().catch(() => "(no body)");
      console.error("[/api/ask-constra] Groq error:", groqRes.status, txt);
      // Parse Groq error for a user-friendly message
      let reason = `Groq ${groqRes.status}`;
      try {
        const parsed = JSON.parse(txt);
        reason = parsed?.error?.message ?? parsed?.message ?? reason;
      } catch { /* use raw text if not JSON */ if (txt.length < 200) reason = txt; }
      return new Response(reason, { status: 502 });
    }

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
                const text: string | undefined = parsed?.choices?.[0]?.delta?.content;
                if (text) controller.enqueue(encoder.encode(text));
              } catch { /* skip malformed line */ }
            }
          }
        } catch (err) {
          console.error("[/api/ask-constra] stream error:", err);
        }
        controller.close();
      },
      cancel() { upstream.cancel(); },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/ask-constra] fetch error:", msg);
    return new Response(`Server error: ${msg}`, { status: 502 });
  }
}
