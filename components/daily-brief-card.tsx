"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, RefreshCw, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useStore } from "@/lib/store";

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

export function DailyBriefCard() {
  const { workers, projects, punchItems, safetyIncidents, companyName } = useStore();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const hasGeneratedRef = useRef(false);

  const buildPayload = useCallback(() => {
    const now = new Date();
    const clockedIn = workers.filter((w) => w.clockedIn);

    const clockedInWorkers = clockedIn.map((w) => {
      const project = projects.find((p) => p.id === w.projectIds[0]);
      const hoursIn = w.clockInTime
        ? (now.getTime() - w.clockInTime.getTime()) / 3600000
        : 0;
      return { name: w.name, role: w.customRole, project: project?.name ?? "Unknown", hoursIn };
    });

    const activeProjects = projects
      .filter((p) => p.status === "active")
      .map((p) => {
        const tasksDue = p.tasks.filter(
          (t) => t.status !== "completed" && t.endDate.toDateString() === now.toDateString()
        ).length;
        const tasksOverdue = p.tasks.filter(
          (t) => t.status !== "completed" && t.endDate < now
        ).length;
        return { name: p.name, progress: p.progress, tasksTotal: p.tasks.length, tasksDue, tasksOverdue };
      });

    const tasksDueToday = projects.flatMap((p) =>
      p.tasks
        .filter((t) => t.status !== "completed")
        .filter((t) => t.endDate.toDateString() === now.toDateString() || t.endDate < now)
        .map((t) => {
          const worker = workers.find((w) => w.id === t.workerId);
          return {
            name: t.name,
            project: p.name,
            worker: worker?.name ?? "Unassigned",
            overdue: t.endDate < now && t.endDate.toDateString() !== now.toDateString(),
          };
        })
    );

    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const safetyThisWeek = safetyIncidents.filter((s) => new Date(s.date) >= weekAgo).length;

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
    };
  }, [workers, projects, punchItems, safetyIncidents, companyName]);

  const generate = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setText("");

    try {
      const res = await fetch("/api/daily-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setText(fullText);
      }

      setGeneratedAt(new Date());
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to generate brief");
    } finally {
      setLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    if (!hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      generate();
    }
    return () => { abortRef.current?.abort(); };
  }, [generate]);

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
            <p className="text-[13px] font-bold text-white">AI Daily Brief</p>
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
