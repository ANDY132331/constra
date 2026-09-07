"use client";

/**
 * AskConstra — data-aware AI widget for Admin / Project Manager users.
 * Answers financial and operational questions using real store data.
 * Placed on the dashboard below the Daily Brief.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Sparkles, Send, Loader2, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import type { CompanySnap, ProjectSnap } from "@/app/api/ask-constra/route";

// ── Helper: compute an invoice's subtotal ──────────────────────────────────────
function invoiceTotal(inv: { items: { qty: number; rate: number }[]; taxRate: number }) {
  const sub = inv.items.reduce((s, it) => s + it.qty * it.rate, 0);
  return sub * (1 + inv.taxRate / 100);
}

// ── Helper: ms → hours ────────────────────────────────────────────────────────
function msToHours(ms: number) { return ms / 3_600_000; }

// ── Build snapshot from store data ────────────────────────────────────────────
function buildSnapshot(store: ReturnType<typeof useStore>): CompanySnap {
  const {
    companyName, currency, workers, projects, clockEntries,
    invoices, budgetLines, equipment, changeOrders,
  } = store;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── Revenue ─────────────────────────────────────────────────────────────────
  const totalBilled = invoices.reduce((s, i) => s + invoiceTotal(i), 0);
  const totalCollected = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + invoiceTotal(i), 0);
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent")
    .reduce((s, i) => s + invoiceTotal(i), 0);

  const overdueInvoices = invoices
    .filter((i) => i.status === "overdue")
    .map((i) => ({
      number: i.number,
      amount: invoiceTotal(i),
      client: i.clientName,
      daysOverdue: Math.floor((now.getTime() - i.dueDate.getTime()) / 86_400_000),
    }));

  // ── Labor (this month) ───────────────────────────────────────────────────────
  const monthEntries = clockEntries.filter(
    (e) => e.clockOut && e.clockIn >= monthStart
  );
  let totalLaborCostThisMonth = 0;
  let totalHoursThisMonth = 0;
  monthEntries.forEach((e) => {
    const hours = msToHours(e.clockOut!.getTime() - e.clockIn.getTime());
    const worker = workers.find((w) => w.id === e.workerId);
    totalHoursThisMonth += hours;
    totalLaborCostThisMonth += hours * (worker?.hourlyRate ?? 0);
  });

  // ── Per-project labor cost (all-time) ───────────────────────────────────────
  const laborByProject: Record<string, number> = {};
  clockEntries.forEach((e) => {
    if (!e.clockOut) return;
    const hours = msToHours(e.clockOut.getTime() - e.clockIn.getTime());
    const rate = workers.find((w) => w.id === e.workerId)?.hourlyRate ?? 0;
    laborByProject[e.projectId] = (laborByProject[e.projectId] ?? 0) + hours * rate;
  });

  // ── Per-project revenue (invoices keyed by client name vs project client) ───
  // Invoices don't have projectId; match by clientName = project.client
  const revenueByClient: Record<string, number> = {};
  invoices
    .filter((i) => i.status === "paid" || i.status === "sent")
    .forEach((i) => {
      revenueByClient[i.clientName] = (revenueByClient[i.clientName] ?? 0) + invoiceTotal(i);
    });

  // ── Project snapshots ────────────────────────────────────────────────────────
  const projectSnaps: ProjectSnap[] = projects.map((p) => {
    const overdueTasks = p.tasks.filter(
      (t) => t.status !== "completed" && t.endDate < now
    ).length;
    return {
      name: p.name,
      status: p.status,
      budget: p.budget ?? 0,
      spent: p.spent ?? 0,
      laborCost: laborByProject[p.id] ?? 0,
      revenue: revenueByClient[p.client] ?? 0,
      progress: p.progress ?? 0,
      overdueTasks,
    };
  });

  // ── Budget by category ───────────────────────────────────────────────────────
  const catMap: Record<string, { budgeted: number; actual: number }> = {};
  budgetLines.forEach((b) => {
    if (!catMap[b.category]) catMap[b.category] = { budgeted: 0, actual: 0 };
    catMap[b.category].budgeted += b.budgeted;
    catMap[b.category].actual += b.actual;
  });
  const budgetByCategory = Object.entries(catMap).map(([category, v]) => ({
    category,
    budgeted: v.budgeted,
    actual: v.actual,
  }));

  // ── Crew ─────────────────────────────────────────────────────────────────────
  const clockedInCount = workers.filter((w) => w.clockedIn).length;

  // ── Equipment ────────────────────────────────────────────────────────────────
  const equipmentInUse = equipment.filter((e) => e.status === "in-use").length;

  void changeOrders; // available if needed later

  return {
    companyName: companyName || "Your Company",
    currency,
    currentDate: now.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    totalBilled,
    totalCollected,
    totalOutstanding,
    overdueInvoices,
    totalLaborCostThisMonth,
    totalHoursThisMonth,
    projects: projectSnaps,
    budgetByCategory,
    workerCount: workers.length,
    clockedInCount,
    equipmentTotal: equipment.length,
    equipmentInUse,
  };
}

// ── Render markdown-style text ────────────────────────────────────────────────
function ResponseText({ text, streaming }: { text: string; streaming: boolean }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1.5" />;
        // bold headers: **text**
        if (/^\*\*[^*]+\*\*$/.test(trimmed)) {
          return (
            <p key={i} className="text-[11px] font-black text-amber-400 uppercase tracking-wider mt-2.5 mb-0.5">
              {trimmed.replace(/\*\*/g, "")}
            </p>
          );
        }
        // bullet lines
        if (trimmed.startsWith("•") || trimmed.startsWith("-") || /^\d+\./.test(trimmed)) {
          const content = trimmed.replace(/^[•\-]\s*/, "").replace(/^\d+\.\s*/, "");
          return (
            <div key={i} className="flex gap-2 text-[12.5px] text-white/70 leading-relaxed">
              <span className="text-amber-500/60 flex-shrink-0 mt-0.5 text-[10px]">▸</span>
              <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>") }} />
            </div>
          );
        }
        return (
          <p
            key={i}
            className="text-[12.5px] text-white/75 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: trimmed.replace(/\*\*([^*]+)\*\*/g, "<strong class='text-white font-semibold'>$1</strong>") }}
          />
        );
      })}
      {streaming && <span className="inline-block w-0.5 h-3.5 bg-amber-400 animate-pulse ml-0.5 align-middle" />}
    </div>
  );
}

// ── Example questions ─────────────────────────────────────────────────────────
const QUICK_QUESTIONS = [
  "Which jobs are losing money?",
  "What invoices haven't been paid?",
  "How much did we bill this month?",
  "Which projects are over budget?",
  "How much have we spent on labour?",
  "What's our current gross profit?",
];

// ── Main component ─────────────────────────────────────────────────────────────
export function AskConstra() {
  const store = useStore();
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ask = useCallback(async (question: string) => {
    if (!question.trim() || streaming) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStreaming(true);
    setResponse("");
    setError(null);
    setLastQuestion(question);
    setInput("");
    if (collapsed) setCollapsed(false);

    try {
      const snapshot = buildSnapshot(store);
      const res = await fetch("/api/ask-constra", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: question }],
          companyData: snapshot,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error(`Error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setResponse(full);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [store, streaming, collapsed]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  };

  // Auto-size textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 80) + "px";
    }
  }, [input]);

  return (
    <div className="bg-[#0f0d0a] border border-amber-500/20 rounded-2xl overflow-hidden">
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(245,158,11,0.08)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Sparkles size={13} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[13px] font-black text-white">Ask Constra</p>
            <p className="text-[10px] text-white/25">Your company&apos;s data, answered instantly</p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.05] transition-colors"
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* ── Quick questions (shown when no response yet) ── */}
          {!response && !streaming && (
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Try asking</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => ask(q)}
                    className="text-[11px] text-amber-400/80 bg-amber-500/8 hover:bg-amber-500/15 border border-amber-500/15 hover:border-amber-500/30 rounded-xl px-2.5 py-1.5 transition-all active:scale-95 text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Response area ── */}
          {(response || streaming || error) && (
            <div className="px-4 pt-3 pb-1">
              {/* Question label */}
              {lastQuestion && (
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="flex-1 h-px bg-white/[0.05]" />
                  <p className="text-[10px] text-white/25 truncate max-w-[200px]">{lastQuestion}</p>
                  <div className="flex-1 h-px bg-white/[0.05]" />
                </div>
              )}

              {/* Loading state */}
              {streaming && !response && (
                <div className="flex items-center gap-2.5 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-amber-400/50 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-white/25 italic">Analysing your data…</span>
                </div>
              )}

              {/* Error */}
              {error && (
                <p className="text-[12px] text-red-400/80 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2">
                  {error}
                </p>
              )}

              {/* Streamed response */}
              {response && <ResponseText text={response} streaming={streaming} />}

              {/* Ask another question chips (after response) */}
              {response && !streaming && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button
                    onClick={() => { setResponse(""); setLastQuestion(null); setError(null); }}
                    className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/50 bg-white/[0.04] hover:bg-white/[0.07] rounded-lg px-2 py-1 transition-colors"
                  >
                    <RotateCcw size={9} />
                    Ask another
                  </button>
                  {QUICK_QUESTIONS.slice(0, 3).map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="text-[10px] text-amber-400/60 bg-amber-500/6 hover:bg-amber-500/12 border border-amber-500/10 rounded-lg px-2 py-1 transition-all active:scale-95"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Input ── */}
          <div
            className="flex items-end gap-2 px-3 pb-3 pt-2.5"
            style={{ borderTop: "1px solid rgba(245,158,11,0.06)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="How much did we bill this month?"
              rows={1}
              disabled={streaming}
              className="flex-1 bg-[#1a1209] text-white text-[13px] placeholder-white/20 rounded-xl px-3.5 py-2.5 resize-none outline-none border border-amber-500/10 focus:border-amber-500/30 transition-colors leading-[1.5] disabled:opacity-50"
              style={{ maxHeight: 80, overflowY: "auto" }}
            />
            <button
              onClick={() => ask(input)}
              disabled={!input.trim() || streaming}
              aria-label="Ask"
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-amber-500 disabled:bg-white/[0.06] disabled:cursor-not-allowed text-black transition-all active:scale-95 hover:bg-amber-400"
            >
              {streaming ? (
                <Loader2 size={15} className="animate-spin text-white/40" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
