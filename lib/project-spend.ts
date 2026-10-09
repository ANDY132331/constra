"use client";

// What a project has actually cost so far, and what the client has actually approved.
//
// `project.spent` is a stored number that is set to 0 when a project is created and that
// nothing in the app ever updates — there is no field for it in the project form and no code
// that adds costs to it. So for every real project the budget bar sat empty, "over budget"
// could never trigger, and Ask Constra answered "which projects are over budget?" with
// "none" no matter what. Only the demo data, which presets the figure, hid it.
//
// The app already records the biggest cost a trades business has: labour, as timesheet hours
// against a worker with an hourly rate. Other costs live in the project's budget ledger.
//
// Approved change orders raise the total contract value. Comparing spend against only the
// original budget marks every legitimately expanded job as over budget. `revisedBudget` is
// the contract value the client has actually signed off on: original + approved COs.
//
// Derived at read time and never written back. Storing the result in `spent` would add it
// again on the next save and compound with every edit.

import { useCallback, useMemo } from "react";
import { useStore } from "./store";
import { hoursBetween } from "./hours";
import { roundMoney } from "./money";

type ProjectLike = { id: string; budget?: number | null; spent?: number | string | null };

export type Spend = {
  /** Hours on completed timesheets for this project x each worker's rate. Straight time. */
  labour: number;
  /** Actuals from the project's budget lines, excluding labour so it is not counted twice. */
  other: number;
  /** Anything already stored on the project — costs from before it was tracked here. */
  opening: number;
  total: number;
  /** Original project.budget + sum of approved change order amounts for this project. */
  revisedBudget: number;
  /** Total value of approved change orders for this project. */
  approvedCos: number;
};

const num = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

export function useProjectSpend() {
  const { clockEntries, workers, budgetLines, changeOrders } = useStore();

  const byProject = useMemo(() => {
    const rate = new Map(workers.map((w) => [w.id, num(w.hourlyRate)]));
    const labour = new Map<string, number>();
    for (const e of clockEntries) {
      // A running shift has not been worked yet; payroll does not pay it either.
      if (!e.clockOut || !e.projectId) continue;
      const cost = hoursBetween(e.clockIn, e.clockOut) * (rate.get(e.workerId) ?? 0);
      labour.set(e.projectId, (labour.get(e.projectId) ?? 0) + cost);
    }
    const other = new Map<string, number>();
    for (const b of budgetLines) {
      if (b.category === "labour") continue; // timesheets are the exact record of labour
      other.set(b.projectId, (other.get(b.projectId) ?? 0) + num(b.actual));
    }
    const approvedCos = new Map<string, number>();
    for (const co of changeOrders) {
      if (co.status !== "approved") continue;
      approvedCos.set(co.projectId, (approvedCos.get(co.projectId) ?? 0) + num(co.amount));
    }
    return { labour, other, approvedCos };
  }, [clockEntries, workers, budgetLines, changeOrders]);

  const spendOf = useCallback((p: ProjectLike): Spend => {
    const labour = roundMoney(byProject.labour.get(p.id) ?? 0);
    const other = roundMoney(byProject.other.get(p.id) ?? 0);
    const opening = roundMoney(num(p.spent));
    const approvedCos = roundMoney(byProject.approvedCos.get(p.id) ?? 0);
    const originalBudget = roundMoney(num(p.budget));
    return {
      labour,
      other,
      opening,
      total: roundMoney(labour + other + opening),
      approvedCos,
      revisedBudget: roundMoney(originalBudget + approvedCos),
    };
  }, [byProject]);

  return spendOf;
}
