"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdminOrAbove } from "@/lib/permissions";
import { Clock, DollarSign, TrendingUp, Users, FileDown, AlertCircle, BarChart2, ChevronDown, FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrencyCompact } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { PAYROLL_ADAPTERS, exportPayroll } from "@/lib/payroll-export";
import { exportReportPdf } from "@/lib/pdf-export";

function periodBounds(period: "week" | "month" | "quarter"): { start: Date; end: Date; label: string } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (period === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return {
      start, end,
      label: `${start.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}`,
    };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start, end,
      label: now.toLocaleDateString("en-CA", { month: "long", year: "numeric" }),
    };
  }
  // quarter
  const quarterStart = Math.floor(now.getMonth() / 3) * 3;
  const start = new Date(now.getFullYear(), quarterStart, 1);
  return {
    start, end,
    label: `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`,
  };
}

export default function ReportsPage() {
  const { workers, projects, clockEntries, currency, currentUser, companyName } = useStore();
  const router = useRouter();
  const [pdfLoading, setPdfLoading] = useState(false);
  const t = useT();

  useEffect(() => {
    if (!isAdminOrAbove(currentUser.role)) router.replace("/dashboard");
  }, [currentUser.role, router]);
  const [period, setPeriod] = useState<"week" | "month" | "quarter">("week");
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const canSeeFinancials = currentUser.role === "Admin" || currentUser.role === "Project Manager";

  const { start: periodStart, end: periodEnd, label: periodLabel } = useMemo(
    () => periodBounds(period), [period]
  );

  // Hours within the selected period
  const periodEntries = useMemo(
    () => clockEntries.filter((e) => e.clockOut && e.clockIn >= periodStart && e.clockIn <= periodEnd),
    [clockEntries, periodStart, periodEnd]
  );

  const totalHours = useMemo(
    () => periodEntries.reduce((s, e) => s + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0),
    [periodEntries]
  );

  // Daily hours bar chart (last 7 days for week, or last N days for other periods)
  const dailyBars = useMemo(() => {
    const days: { label: string; hours: number; date: Date }[] = [];
    const dayCount = period === "week" ? 7 : period === "month" ? 30 : 90;
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
      const h = clockEntries
        .filter((e) => e.clockOut && e.clockIn >= dayStart && e.clockIn <= dayEnd)
        .reduce((s, e) => s + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0);
      days.push({
        label: d.toLocaleDateString("en-CA", { weekday: "short" }),
        hours: Math.round(h * 10) / 10,
        date: d,
      });
    }
    // For month/quarter, group by week to keep chart readable
    if (period !== "week") {
      const weeks: { label: string; hours: number }[] = [];
      for (let i = 0; i < days.length; i += 7) {
        const chunk = days.slice(i, i + 7);
        const h = chunk.reduce((s, d) => s + d.hours, 0);
        const startD = chunk[0].date;
        weeks.push({
          label: startD.toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
          hours: Math.round(h * 10) / 10,
        });
      }
      return weeks;
    }
    return days;
  }, [clockEntries, period]);

  const maxBarH = Math.max(...dailyBars.map((d) => d.hours), 1);
  const hasHoursData = totalHours > 0;

  // Budget data from actual project fields
  const projectBudgets = useMemo(
    () => projects
      .filter((p) => p.budget > 0)
      .map((p) => ({
        name: p.name,
        color: p.color,
        budget: p.budget,
        spent: p.spent,
        pct: p.budget > 0 ? Math.min(100, (p.spent / p.budget) * 100) : 0,
      })),
    [projects]
  );

  const totalBudget = projectBudgets.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projectBudgets.reduce((s, p) => s + p.spent, 0);

  // Top workers by actual hours in period
  const topWorkers = useMemo(() => {
    return workers
      .map((w) => {
        const h = periodEntries
          .filter((e) => e.workerId === w.id)
          .reduce((s, e) => s + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0);
        const projectCount = new Set(periodEntries.filter((e) => e.workerId === w.id).map((e) => e.projectId)).size;
        return { ...w, hoursThisPeriod: Math.round(h * 10) / 10, projectCount };
      })
      .filter((w) => w.hoursThisPeriod > 0)
      .sort((a, b) => b.hoursThisPeriod - a.hoursThisPeriod)
      .slice(0, 5);
  }, [workers, periodEntries]);

  const activeWorkers = workers.filter((w) => w.clockedIn).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Reports</h2>
          <p className="text-white/35 text-sm mt-0.5">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex gap-1 bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-1">
            {(["week", "month", "quarter"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors ${period === p ? "bg-amber-500 text-black" : "text-white/35 hover:text-white/55"}`}>
                {p === "week" ? "Week" : p === "month" ? "Month" : "Quarter"}
              </button>
            ))}
          </div>
          {canSeeFinancials && (
            <>
              <button
                onClick={async () => {
                  setPdfLoading(true);
                  try {
                    await exportReportPdf({ workers, projects, clockEntries, periodStart, periodEnd, periodLabel, currency, companyName });
                  } finally {
                    setPdfLoading(false);
                  }
                }}
                disabled={pdfLoading}
                className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-[13px] px-4 py-2 rounded-lg transition-colors border border-amber-500/20 disabled:opacity-50"
              >
                <FileText size={14} />
                {pdfLoading ? "Generating…" : "Download PDF"}
              </button>
              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen((o) => !o)}
                  className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.08] text-white/60 font-bold text-[13px] px-4 py-2 rounded-lg transition-colors border border-white/[0.07]"
                >
                  <FileDown size={14} />
                  {t.common.export} Payroll
                  <ChevronDown size={12} className={`transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 bg-[#1a1a1a] border border-white/[0.08] rounded-xl shadow-xl z-20 min-w-[180px] overflow-hidden">
                    {PAYROLL_ADAPTERS.map((adapter) => (
                      <button
                        key={adapter.id}
                        onClick={() => {
                          exportPayroll(adapter.id, clockEntries, workers, projects, periodStart, periodEnd, periodLabel);
                          setExportMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors text-left"
                      >
                        <FileDown size={12} className="text-amber-400/60" />
                        {adapter.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPI cards — all real data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Total Hours", icon: Clock, color: "text-amber-400",
            value: hasHoursData ? `${totalHours.toFixed(1)}h` : "0h",
            sub: hasHoursData ? `${periodEntries.length} completed session${periodEntries.length !== 1 ? "s" : ""}` : "No sessions this period",
          },
          {
            label: "On Site Now", icon: Users, color: "text-blue-400",
            value: activeWorkers.toString(),
            sub: activeWorkers === 0 ? "Nobody clocked in" : `of ${workers.length} total crew`,
          },
          {
            label: "Budget Used", icon: DollarSign, color: "text-green-400",
            value: totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(0)}%` : "—",
            sub: totalBudget > 0 ? `${formatCurrencyCompact(totalSpent, currency)} of ${formatCurrencyCompact(totalBudget, currency)}` : "No projects with budgets",
          },
          {
            label: "Avg Hours / Worker", icon: TrendingUp, color: "text-purple-400",
            value: workers.length > 0 && hasHoursData ? `${(totalHours / workers.length).toFixed(1)}h` : "—",
            sub: hasHoursData ? "This period per worker" : "No hours recorded yet",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
            <kpi.icon size={16} className={`${kpi.color} mb-3`} />
            <p className="text-[26px] font-black text-white">{kpi.value}</p>
            <p className="text-[10px] font-bold text-white/30 mt-0.5 uppercase tracking-wide">{kpi.label}</p>
            <p className="text-[11px] text-white/25 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Daily/Weekly Hours Chart — real data */}
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[14px] font-bold text-white">
              {period === "week" ? "Daily" : period === "month" ? "Weekly" : "Weekly"} Hours
            </h3>
            <span className="text-[11px] text-white/30">{periodLabel}</span>
          </div>
          {!hasHoursData ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <BarChart2 size={28} className="text-white/10" />
              <p className="text-[12px] text-white/25 text-center">No hours logged this period.<br />Clock in workers to see data.</p>
            </div>
          ) : (
            <div className="flex items-end gap-1.5 h-32 overflow-x-auto">
              {dailyBars.map((d, i) => {
                const pct = (d.hours / maxBarH) * 100;
                return (
                  <div key={i} className="flex-1 min-w-[24px] flex flex-col items-center gap-1.5">
                    {d.hours > 0 && <span className="text-[9px] text-white/30">{d.hours}h</span>}
                    <div
                      className="w-full rounded-t-md bg-amber-500/70 hover:bg-amber-500 transition-colors"
                      style={{ height: `${Math.max(pct, d.hours > 0 ? 8 : 2)}%`, minHeight: "2px" }}
                    />
                    <span className="text-[9px] text-white/35 font-semibold whitespace-nowrap">{d.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Budget Tracking — real project data */}
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[14px] font-bold text-white">Budget Tracking</h3>
            <span className="text-[11px] text-white/30">Active Projects</span>
          </div>
          {projectBudgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <DollarSign size={28} className="text-white/10" />
              <p className="text-[12px] text-white/25 text-center">No projects with budgets yet.<br />Add a project with a budget to track spending.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {projectBudgets.map((p) => {
                const over = p.pct > 90;
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-[12px] font-semibold text-white/70 truncate max-w-[140px]">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {over && <AlertCircle size={11} className="text-red-400" />}
                        <span className={`text-[11px] font-bold ${over ? "text-red-400" : "text-white/45"}`}>{p.pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${p.pct}%`, backgroundColor: p.pct > 90 ? "#ef4444" : p.pct > 70 ? "#f59e0b" : p.color }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-white/25">{formatCurrencyCompact(p.spent, currency)} spent</span>
                      <span className="text-[10px] text-white/25">{formatCurrencyCompact(p.budget, currency)} budget</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cost-per-project report */}
      {canSeeFinancials && (() => {
        const projectCosts = projects.map((p) => {
          const pEntries = periodEntries.filter((e) => e.projectId === p.id);
          const labourHours = pEntries.reduce((s, e) => s + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0);
          const labourCost = pEntries.reduce((s, e) => {
            const w = workers.find((w) => w.id === e.workerId);
            const hrs = (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000;
            return s + hrs * (w?.hourlyRate ?? 0);
          }, 0);
          return { ...p, labourHours, labourCost };
        }).filter((p) => p.labourHours > 0 || p.budget > 0);
        if (projectCosts.length === 0) return null;
        return (
          <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-white">Cost per Project</h3>
              <span className="text-[11px] text-white/30">Labour × rate + budget · {periodLabel}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["Project", "Hours", "Labour Cost", "Materials", "Total Spent", "Budget"].map((h) => (
                      <th key={h} className="text-left text-[9px] font-bold text-white/25 uppercase tracking-widest pb-2 pr-4 last:pr-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {projectCosts.map((p) => {
                    const materialsEst = Math.max(0, p.spent - p.labourCost);
                    const totalEst = p.labourCost + materialsEst;
                    const over = p.budget > 0 && totalEst > p.budget;
                    return (
                      <tr key={p.id} className="border-b border-white/[0.03] last:border-0">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="font-semibold text-white/75 truncate max-w-[140px]">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-white/50">{p.labourHours.toFixed(1)}h</td>
                        <td className="py-2.5 pr-4 text-white/70 font-semibold">{formatCurrencyCompact(Math.round(p.labourCost), currency)}</td>
                        <td className="py-2.5 pr-4 text-white/45">{materialsEst > 0 ? formatCurrencyCompact(Math.round(materialsEst), currency) : "—"}</td>
                        <td className={`py-2.5 pr-4 font-bold ${over ? "text-red-400" : "text-white/70"}`}>{totalEst > 0 ? formatCurrencyCompact(Math.round(totalEst), currency) : "—"}</td>
                        <td className="py-2.5 text-white/35">{p.budget > 0 ? formatCurrencyCompact(p.budget, currency) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Top Workers — real hours only */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-bold text-white">Top Workers</h3>
          <span className="text-[11px] text-white/30">By Hours · {periodLabel}</span>
        </div>
        {topWorkers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Users size={28} className="text-white/10" />
            <p className="text-[12px] text-white/25">No hours logged this period.</p>
            <p className="text-[11px] text-white/20">Worker rankings appear once time has been tracked.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topWorkers.map((worker, i) => {
              const maxH = topWorkers[0].hoursThisPeriod;
              return (
                <div key={worker.id} className="flex items-center gap-4">
                  <span className="text-[13px] font-black text-white/20 w-4 flex-shrink-0">{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center text-[11px] font-black flex-shrink-0"
                    style={{ backgroundColor: worker.color + "20", color: worker.color }}>
                    {worker.photo
                      ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" />
                      : worker.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-semibold text-white/80">{worker.name}</span>
                      <span className="text-[13px] font-black text-white">{worker.hoursThisPeriod}h</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${(worker.hoursThisPeriod / maxH) * 100}%`, backgroundColor: worker.color }} />
                      </div>
                      <span className="text-[10px] text-white/25 flex-shrink-0">
                        {worker.projectCount} project{worker.projectCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
