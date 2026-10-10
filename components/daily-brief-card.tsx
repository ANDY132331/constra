"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useStore } from "@/lib/store";
import { moneyTotals, lineAmount } from "@/lib/money";
import { hoursBetween } from "@/lib/hours";
import { generateBrief, type BriefPayload } from "@/lib/daily-brief";
import { isOutstanding, isOverdue } from "@/lib/invoice-status";
import { endOfDay } from "@/lib/utils";
import { useProjectSpend } from "@/lib/project-spend";
import { projectProgress } from "@/lib/project-progress";

function parseBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function BriefLine({ line }: { line: string }) {
  const trimmed = line.trim();
  if (!trimmed) return <div className="h-2" />;
  const isBullet = trimmed.startsWith("•") || trimmed.startsWith("-") || /^\d+\./.test(trimmed);
  const isHeading = trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.indexOf("**", 2) === trimmed.length - 2;

  if (isHeading) {
    return (
      <p className="text-[12px] font-bold text-amber-400 uppercase tracking-wide mt-3 mb-1">
        {trimmed.replace(/\*\*/g, "")}
      </p>
    );
  }
  if (isBullet) {
    const content = trimmed.replace(/^[•\-]\s*/, "").replace(/^\d+\.\s*/, "");
    return (
      <div className="flex gap-2 text-[12.5px] text-white/70 leading-relaxed">
        <span className="text-amber-500/60 flex-shrink-0 mt-0.5">›</span>
        <span>{parseBold(content)}</span>
      </div>
    );
  }
  return (
    <p className="text-[12.5px] text-white/70 leading-relaxed">{parseBold(trimmed)}</p>
  );
}

function invTotal(inv: { items: { qty: number; rate: number }[]; taxRate: number }) {
  return moneyTotals(inv.items, inv.taxRate).total;
}

// The dashboard mounts this card twice — once in the narrow layout, once in the wide one —
// and CSS hides whichever does not apply. Sharing one result keeps both copies showing the
// same brief and the same timestamp, so resizing across the breakpoint never swaps the text.
type BriefState = { text: string; loading: boolean; error: string | null; at: Date | null };
const listeners = new Set<(s: BriefState) => void>();
let shared: BriefState = { text: "", loading: false, error: null, at: null };

function push(patch: Partial<BriefState>) {
  shared = { ...shared, ...patch };
  for (const fn of listeners) fn(shared);
}

function runShared(payload: BriefPayload) {
  // Built on the spot from data the store already holds. No request, so it works with no
  // signal and cannot fail with a server error the way the old fetch did.
  try {
    push({ loading: false, error: null, text: generateBrief(payload), at: new Date() });
  } catch (err: unknown) {
    push({ loading: false, text: "", error: err instanceof Error ? err.message : "Could not build the brief" });
  }
}

export function DailyBriefCard() {
  const spendOf = useProjectSpend();
  const { workers, projects, punchItems, safetyIncidents, companyName, invoices } = useStore();
  const [{ text, loading, error, at: generatedAt }, setBrief] = useState<BriefState>(shared);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    listeners.add(setBrief);
    setBrief(shared);
    return () => { listeners.delete(setBrief); };
  }, []);

  const buildPayload = useCallback(() => {
    const now = new Date();
    const clockedIn = workers.filter((w) => w.clockedIn);

    const clockedInWorkers = clockedIn.map((w) => {
      const project = projects.find((p) => p.id === w.projectIds[0]);
      const hoursIn = w.clockInTime
        ? hoursBetween(w.clockInTime, now)
        : 0;
      return { name: w.name, role: w.customRole, project: project?.name ?? "Unknown", hoursIn };
    });

    const activeProjects = projects
      .filter((p) => p.status === "active")
      .map((p) => {
        const tasksDue = p.tasks.filter(
          (t) => t.status !== "completed" && new Date(t.endDate).toDateString() === now.toDateString()
        ).length;
        const tasksOverdue = p.tasks.filter(
          (t) => t.status !== "completed" && endOfDay(t.endDate) < now
        ).length;
        const budgetPct = spendOf(p).revisedBudget > 0 ? Math.round((spendOf(p).total / spendOf(p).revisedBudget) * 100) : null;
        return { name: p.name, progress: projectProgress(p), tasksTotal: p.tasks.length, tasksDue, tasksOverdue, budgetPct };
      });

    const tasksDueToday = projects.flatMap((p) =>
      p.tasks
        .filter((t) => t.status !== "completed")
        .filter((t) => new Date(t.endDate).toDateString() === now.toDateString() || endOfDay(t.endDate) < now)
        .map((t) => {
          const worker = workers.find((w) => w.id === t.workerId);
          return {
            name: t.name,
            project: p.name,
            worker: worker?.name ?? "Unassigned",
            overdue: endOfDay(t.endDate) < now && new Date(t.endDate).toDateString() !== now.toDateString(),
          };
        })
    );

    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const safetyThisWeek = safetyIncidents.filter((s) => new Date(s.date) >= weekAgo).length;

    // ── Financial ────────────────────────────────────────────────────────────
    const totalOutstanding = invoices
      .filter(isOutstanding)
      .reduce((s, i) => s + invTotal(i), 0);
    const overdueInvoices = invoices
      .filter((i) => isOverdue(i, now))
      .map((i) => ({
        number: i.number,
        amount: Math.round(invTotal(i)),
        client: i.clientName,
        daysOverdue: Math.floor((now.getTime() - endOfDay(i.dueDate).getTime()) / 86400000),
      }));
    const overBudgetProjects = activeProjects.filter((p) => p.budgetPct !== null && p.budgetPct > 90);

    return {
      workerCount: workers.length,
      clockedInWorkers,
      activeProjects,
      tasksDueToday,
      openPunchItems: punchItems.filter((p) => p.status !== "resolved").length,
      highPriorityPunchItems: punchItems.filter((p) => p.status !== "resolved" && p.priority === "high").length,
      safetyIncidentsThisWeek: safetyThisWeek,
      companyName: companyName || "Your Company",
      currentTime: now.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      nowIso: now.toISOString(),
      // Financial additions
      totalOutstanding: Math.round(totalOutstanding),
      overdueInvoices,
      overBudgetProjects: overBudgetProjects.map((p) => ({ name: p.name, budgetPct: p.budgetPct })),
    };
  }, [workers, projects, punchItems, safetyIncidents, companyName, invoices, spendOf]);

  // Regenerate is an explicit user action, so it always starts a fresh run.
  const generate = useCallback(() => runShared(buildPayload()), [buildPayload]);

  // Kick the first brief off once. This used to depend on generate(), whose identity changes
  // with the store, so the cleanup aborted the in-flight request the moment the store
  // hydrated and a ref guard blocked the retry — the card stayed blank forever. The shared
  // runner now de-duplicates, and the request is only cancelled once no card is listening.
  const payloadRef = useRef(buildPayload);
  payloadRef.current = buildPayload;
  useEffect(() => {
    if (!shared.text && !shared.loading && !shared.error) runShared(payloadRef.current());
    // Deliberately no abort here. Cancelling on unmount raced React's remount and left the
    // card blank with nothing willing to retry; letting the stream finish caches the result,
    // so a card that mounts a moment later shows the brief immediately.
  }, []);

  const lines = text.split("\n");

  return (
    <div className="bg-[#111111] border border-amber-500/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Sparkles size={13} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">Morning Brief</p>
            {generatedAt && !loading && (
              <p className="text-[10px] text-white/25 flex items-center gap-1">
                <Clock size={9} />
                Generated at {generatedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors px-2.5 py-1.5 rounded-lg hover:bg-amber-500/8"
          >
            <RefreshCw size={11} className={loading ? "animate-spin text-amber-400" : ""} />
            {loading ? "Generating…" : "Regenerate"}
          </button>
          <button
            aria-label={collapsed ? "Expand" : "Collapse"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.05] transition-colors"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 py-4">
          {loading && !text && (
            <div className="flex items-center gap-3 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-[12px] text-white/30 italic">Analysing your site data…</span>
            </div>
          )}

          {error && (
            <div className="text-[12px] text-red-400/80 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2.5">
              {error}
            </div>
          )}

          {/* A 200 that streams nothing used to leave an empty box with no way back in. */}
          {!loading && !error && !text && (
            <div className="flex flex-wrap items-center gap-3 py-2">
              <p className="text-[12px] text-white/35">No brief yet for today.</p>
              <button
                onClick={generate}
                className="text-[12px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 px-3 py-1.5 rounded-lg transition-colors"
              >
                Write today&apos;s brief
              </button>
            </div>
          )}

          {text && (
            <div className="space-y-0.5">
              {lines.map((line, i) => <BriefLine key={i} line={line} />)}
              {loading && (
                <span className="inline-block w-0.5 h-3.5 bg-amber-400 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
