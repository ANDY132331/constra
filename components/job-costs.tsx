"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { useProjectSpend } from "@/lib/project-spend";
import { hoursBetween } from "@/lib/hours";
import { formatCurrencyCompact } from "@/lib/currency";

/** Past this share of the budget a job gets a warning, early enough to do something about it */
export const BUDGET_WARN_AT = 0.8;

/**
 * Every active job's spend against what the client approved, with labour broken out and shifts
 * running right now included, so a job going over shows up the day it happens, not at month end.
 */
export function JobCosts({ now }: { now: number }) {
  const { projects, clockEntries, workers, currency } = useStore();
  const spendOf = useProjectSpend();

  const rows = useMemo(() => {
    const rate = new Map(workers.map((w) => [w.id, Number(w.hourlyRate) || 0]));
    const running = new Map<string, { cost: number; people: number }>();
    for (const e of clockEntries) {
      if (e.clockOut || !e.projectId) continue;
      const r = running.get(e.projectId) ?? { cost: 0, people: 0 };
      r.cost += hoursBetween(e.clockIn, now) * (rate.get(e.workerId) ?? 0);
      r.people++;
      running.set(e.projectId, r);
    }
    return projects
      .filter((p) => p.status === "active")
      .map((p) => {
        const s = spendOf(p);
        const live = running.get(p.id) ?? { cost: 0, people: 0 };
        const spent = s.total + live.cost;
        const budget = s.revisedBudget;
        const share = budget > 0 ? spent / budget : 0;
        return { p, labour: s.labour + live.cost, other: s.other + s.opening, live, spent, budget, share };
      })
      .sort((a, b) => b.share - a.share);
  }, [projects, clockEntries, workers, spendOf, now]);

  if (!rows.length) return null;
  const money = (n: number) => formatCurrencyCompact(n, currency as never);
  const warnings = rows.filter((r) => r.budget > 0 && r.share >= BUDGET_WARN_AT).length;

  return (
    <section aria-label="Job costs" className="bg-[#111111] border border-white/[0.07] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-1">
        <h3 className="text-[15px] font-bold text-white">Job costs</h3>
        {warnings > 0
          ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-400"><AlertTriangle size={12} /> {warnings} need{warnings === 1 ? "s" : ""} a look</span>
          : <span className="text-[11px] text-white/45">Live, includes shifts running now</span>}
      </div>
      <ul>
        {rows.map(({ p, labour, other, live, spent, budget, share }) => {
          const over = budget > 0 && share > 1;
          const warn = budget > 0 && !over && share >= BUDGET_WARN_AT;
          const bar = over ? "bg-red-500" : warn ? "bg-orange-400" : "bg-green-500";
          return (
            <li key={p.id} className="px-4 py-3.5 border-t border-white/[0.05] first:border-t-0">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[14px] font-semibold text-white truncate">{p.name}</p>
                <p className="text-[13px] font-bold text-white tabular-nums flex-shrink-0">
                  {money(spent)}{budget > 0 && <span className="text-white/45 font-normal"> / {money(budget)}</span>}
                </p>
              </div>
              {budget > 0 ? (
                <div className="mt-2 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={`week-bar h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, share * 100)}%` }} />
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 mt-1.5 text-[12px]">
                <span className="text-white/55 tabular-nums truncate">
                  Labour {money(labour)}{other > 0 && ` · Other ${money(other)}`}
                  {live.people > 0 && <span className="text-green-400"> · {live.people} on the clock</span>}
                </span>
                <span className={`font-semibold tabular-nums flex-shrink-0 ${over ? "text-red-400" : warn ? "text-orange-400" : "text-white/55"}`}>
                  {budget > 0 ? (over ? `${money(spent - budget)} over` : `${Math.round(share * 100)}% used`) : "No budget set"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <Link href="/projects" className="flex items-center justify-center gap-1.5 min-h-[44px] border-t border-white/[0.05] text-[12px] font-semibold text-white/60 hover:text-white transition-colors">
        All projects <ArrowRight size={12} />
      </Link>
    </section>
  );
}
