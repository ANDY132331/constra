"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
  CheckCircle2, Clock, Circle, AlertCircle, MapPin, Calendar,
  Building2, Loader2, HardHat, ChevronRight, TrendingUp, Users,
  ArrowRight,
} from "lucide-react";

type SharedTask = {
  id: string; name: string; status: string; progress: number;
  startDate: string; endDate: string;
};

type SharedProject = {
  id: string; name: string; client: string; address: string;
  status: string; progress: number; color: string;
  startDate: string; endDate: string;
  companyName: string; tasks: SharedTask[];
};

const TASK_STATUS: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  completed:     { label: "Complete",    icon: <CheckCircle2 size={14} />, color: "#22c55e", bg: "rgba(34,197,94,0.10)" },
  "in-progress": { label: "In Progress", icon: <Clock size={14} />,        color: "#F5C400", bg: "rgba(245,196,0,0.10)" },
  "not-started": { label: "Not Started", icon: <Circle size={14} />,       color: "#6b7280", bg: "rgba(107,114,128,0.10)" },
  delayed:       { label: "Delayed",     icon: <AlertCircle size={14} />,  color: "#ef4444", bg: "rgba(239,68,68,0.10)" },
};

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

function daysLeft(endDate: string) {
  const diff = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "1 day left";
  return `${diff} days left`;
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [project, setProject] = useState<SharedProject | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setProject)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
        <Loader2 size={22} className="text-amber-500 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6 bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="text-4xl">🔒</div>
        <div>
          <h1 className="text-[20px] font-black text-gray-900 dark:text-white">Link not found</h1>
          <p className="text-[14px] text-gray-500 dark:text-white/40 mt-1 max-w-xs">
            This project link may have expired or no longer exists.
          </p>
        </div>
        <Link href="https://getconstra.com" className="text-[13px] text-amber-600 hover:text-amber-500 font-semibold flex items-center gap-1">
          Visit Constra <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  const completed  = project.tasks.filter((t) => t.status === "completed").length;
  const inProgress = project.tasks.filter((t) => t.status === "in-progress").length;
  const delayed    = project.tasks.filter((t) => t.status === "delayed").length;
  const total      = project.tasks.length;

  const progressColor =
    project.progress >= 90 ? "#22c55e" :
    project.progress >= 60 ? "#F5C400" :
    "#3b82f6";

  const statusLabel =
    project.status === "active" ? "Active" :
    project.status === "completed" ? "Completed" :
    "Upcoming";

  const statusCls =
    project.status === "active"    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" :
    project.status === "completed" ? "bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-white/40" :
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#080808]">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-[#0d0d0d]/90 backdrop-blur-md border-b border-gray-100 dark:border-white/[0.05] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/25">
            <HardHat size={14} className="text-black" />
          </div>
          <div>
            <span className="font-black text-[15px] text-gray-900 dark:text-white">{project.companyName}</span>
            <span className="text-gray-400 dark:text-white/25 text-[13px] ml-1.5 hidden sm:inline">· Project Update</span>
          </div>
        </div>
        <div className="text-[11px] text-gray-400 dark:text-white/25 font-medium">Read-only · Shared view</div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Hero card */}
        <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111]">
          {/* Color bar */}
          <div className="h-1.5" style={{ backgroundColor: project.color }} />
          <div className="p-6">
            <div className="flex items-start gap-3 justify-between flex-wrap gap-y-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${statusCls}`}>
                    {statusLabel}
                  </span>
                </div>
                <h1 className="text-[26px] font-black tracking-tight text-gray-900 dark:text-white leading-tight">{project.name}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-[12px] text-gray-500 dark:text-white/45">
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} className="text-gray-400 dark:text-white/30" />
                    {project.client}
                  </div>
                  {project.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-gray-400 dark:text-white/30" />
                      {project.address.split(",")[0]}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-400 dark:text-white/30" />
                    Due {fmtDate(project.endDate)}
                  </div>
                </div>
              </div>

              {/* Days left chip */}
              {project.status !== "completed" && (
                <div className="flex-shrink-0 text-right">
                  <div className="text-[11px] font-bold text-gray-400 dark:text-white/30">TIMELINE</div>
                  <div className="text-[13px] font-bold text-gray-700 dark:text-white/70 mt-0.5">
                    {daysLeft(project.endDate)}
                  </div>
                </div>
              )}
            </div>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-gray-500 dark:text-white/45">Overall completion</span>
                <span className="text-[22px] font-black text-gray-900 dark:text-white" style={{ color: progressColor }}>
                  {project.progress}%
                </span>
              </div>
              <div className="h-2.5 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${project.progress}%`, backgroundColor: progressColor }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Task stats row */}
        {total > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Completed",   count: completed,  color: "#22c55e", bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.15)" },
              { label: "In Progress", count: inProgress, color: "#F5C400", bg: "rgba(245,196,0,0.08)", border: "rgba(245,196,0,0.15)" },
              { label: "Delayed",     count: delayed,    color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.15)" },
            ].map(({ label, count, color, bg, border }) => (
              <div
                key={label}
                className="rounded-xl px-3 py-3.5 text-center border"
                style={{ background: bg, borderColor: border }}
              >
                <p className="text-[24px] font-black" style={{ color }}>{count}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5 text-gray-500 dark:text-white/35">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Task list */}
        {project.tasks.length > 0 && (
          <div className="rounded-2xl border border-gray-100 dark:border-white/[0.06] bg-white dark:bg-[#111] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 dark:border-white/[0.04] flex items-center justify-between">
              <h2 className="text-[12px] font-black uppercase tracking-widest text-gray-400 dark:text-white/30">
                Work Items
              </h2>
              <span className="text-[11px] text-gray-400 dark:text-white/25">{total} tasks</span>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-white/[0.03]">
              {project.tasks.map((task) => {
                const s = TASK_STATUS[task.status] ?? TASK_STATUS["not-started"];
                return (
                  <div key={task.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div
                      className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: s.bg, color: s.color }}
                    >
                      {s.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800 dark:text-white/80 truncate">{task.name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-white/30 mt-0.5">
                        {fmtDate(task.startDate)} → {fmtDate(task.endDate)}
                      </p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <div className="w-14 h-1.5 bg-gray-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${task.progress}%`, backgroundColor: s.color }}
                        />
                      </div>
                      <span className="text-[11px] font-bold w-7 text-right tabular-nums" style={{ color: s.color }}>
                        {task.progress}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Powered by footer */}
        <div className="flex flex-col items-center gap-3 py-4">
          <Link
            href="https://getconstra.com"
            className="flex items-center gap-2 group"
          >
            <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <HardHat size={12} className="text-black" />
            </div>
            <span className="font-black text-[14px] text-gray-900 dark:text-white/70">Constra</span>
          </Link>
          <p className="text-[11px] text-gray-400 dark:text-white/25">
            Construction management software · <Link href="https://getconstra.com" className="hover:text-amber-500 transition-colors">getconstra.com</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
