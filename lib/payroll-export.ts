// Payroll export adapter pattern.
// Phase 1: CSV (universal), QuickBooks IIF, Gusto CSV
// Phase 2: ADP, Paychex (add new adapters here without changing callers)

import type { ClockEntry, Worker, Project } from "./mock-data";
import type { OvertimeSettings } from "./overtime";
import { computeWorkerOvertime } from "./overtime";

export type PayrollRow = {
  workerName: string;
  workerEmail: string;
  role: string;
  projectName: string;
  date: string;
  clockIn: string;
  clockOut: string;
  hoursWorked: number;
  hourlyRate: number;
  grossPay: number;
};

// Per-worker overtime breakdown for the whole export period
export type WorkerOvertimeSummary = {
  workerName: string;
  workerEmail: string;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  totalPay: number;
};

export type PayrollAdapter = {
  id: string;
  label: string;
  fileExtension: string;
  mimeType: string;
  serialize: (
    rows: PayrollRow[],
    periodLabel: string,
    overtimeSummaries?: WorkerOvertimeSummary[],
    multiplier?: number,
  ) => string;
};

function buildRows(
  entries: ClockEntry[],
  workers: Worker[],
  projects: Project[],
  periodStart: Date,
  periodEnd: Date,
): PayrollRow[] {
  const workerMap = new Map(workers.map((w) => [w.id, w]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return entries
    .filter((e) => e.clockOut && e.clockIn >= periodStart && e.clockIn <= periodEnd && e.clockOut.getTime() !== 0)
    .map((e) => {
      const worker = workerMap.get(e.workerId);
      const project = projectMap.get(e.projectId);
      const hours = ((e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000);
      const rate = worker?.hourlyRate ?? 0;
      return {
        workerName: worker?.name ?? "Unknown",
        workerEmail: worker?.email ?? "",
        role: worker?.customRole ?? worker?.role ?? "",
        projectName: project?.name ?? "—",
        date: e.clockIn.toLocaleDateString("en-CA"),
        clockIn: e.clockIn.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        clockOut: e.clockOut!.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        hoursWorked: Math.round(hours * 100) / 100,
        hourlyRate: rate,
        grossPay: Math.round(hours * rate * 100) / 100,
      };
    })
    .sort((a, b) => a.workerName.localeCompare(b.workerName) || a.date.localeCompare(b.date));
}

function buildOvertimeSummaries(
  entries: ClockEntry[],
  workers: Worker[],
  periodStart: Date,
  periodEnd: Date,
  settings: OvertimeSettings,
): WorkerOvertimeSummary[] {
  const workerMap = new Map(workers.map((w) => [w.id, w]));
  // Group entries by worker within the period
  const byWorker = new Map<string, ClockEntry[]>();
  for (const e of entries) {
    if (!e.clockOut || e.clockIn < periodStart || e.clockIn > periodEnd || e.clockOut.getTime() === 0) continue;
    const list = byWorker.get(e.workerId) ?? [];
    list.push(e);
    byWorker.set(e.workerId, list);
  }

  const summaries: WorkerOvertimeSummary[] = [];
  for (const [workerId, workerEntries] of byWorker) {
    const worker = workerMap.get(workerId);
    const breakdown = computeWorkerOvertime(workerEntries, worker?.hourlyRate ?? 0, settings);
    summaries.push({
      workerName: worker?.name ?? "Unknown",
      workerEmail: worker?.email ?? "",
      regularHours: breakdown.regularHours,
      overtimeHours: breakdown.overtimeHours,
      regularPay: breakdown.regularPay,
      overtimePay: breakdown.overtimePay,
      totalPay: breakdown.totalPay,
    });
  }

  return summaries.sort((a, b) => a.workerName.localeCompare(b.workerName));
}

function escapeCsv(val: string | number): string {
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

// ── Adapters ──────────────────────────────────────────────────────────────────

const csvAdapter: PayrollAdapter = {
  id: "csv",
  label: "CSV (Universal)",
  fileExtension: "csv",
  mimeType: "text/csv",
  serialize(rows, periodLabel, overtimeSummaries, multiplier) {
    const header = ["Worker", "Email", "Role", "Project", "Date", "Clock In", "Clock Out", "Hours", "Rate ($/hr)", "Gross Pay ($)"];
    const lines = [
      `# Constra Payroll Export — ${periodLabel}`,
      `# Generated: ${new Date().toLocaleString("en-CA")}`,
      "",
      header.map(escapeCsv).join(","),
      ...rows.map((r) =>
        [r.workerName, r.workerEmail, r.role, r.projectName, r.date, r.clockIn, r.clockOut, r.hoursWorked, r.hourlyRate, r.grossPay]
          .map(escapeCsv).join(",")
      ),
    ];

    // Summary totals (straight hours, for reference)
    const totalHours = rows.reduce((s, r) => s + r.hoursWorked, 0);
    const totalPay = rows.reduce((s, r) => s + r.grossPay, 0);
    lines.push("", `# Totals,,,,,,,${totalHours.toFixed(2)},,$${totalPay.toFixed(2)}`);

    // Overtime breakdown section — appended when OT is enabled
    if (overtimeSummaries && overtimeSummaries.length > 0) {
      lines.push(
        "",
        `# ── Overtime Breakdown (${multiplier ?? 1.5}× multiplier) ──`,
        ["Worker", "Email", "Regular Hrs", "OT Hrs", "Regular Pay ($)", "OT Pay ($)", "Total Pay ($)"]
          .map(escapeCsv).join(","),
        ...overtimeSummaries.map((s) =>
          [s.workerName, s.workerEmail, s.regularHours, s.overtimeHours, s.regularPay, s.overtimePay, s.totalPay]
            .map(escapeCsv).join(",")
        ),
      );
      const totReg = overtimeSummaries.reduce((s, r) => s + r.regularPay, 0);
      const totOT = overtimeSummaries.reduce((s, r) => s + r.overtimePay, 0);
      const totAll = overtimeSummaries.reduce((s, r) => s + r.totalPay, 0);
      lines.push(`# OT Totals,,,,${totReg.toFixed(2)},${totOT.toFixed(2)},${totAll.toFixed(2)}`);
    }

    return lines.join("\n");
  },
};

const gustoAdapter: PayrollAdapter = {
  id: "gusto",
  label: "Gusto",
  fileExtension: "csv",
  mimeType: "text/csv",
  serialize(rows, periodLabel, overtimeSummaries) {
    // Gusto time import format: Employee Name, Hours, Earnings Type, Job/Department, Date, Note
    const header = ["Employee Name", "Hours", "Earnings Type", "Job/Department", "Date", "Note"];
    const lines = [
      `# Constra → Gusto Export — ${periodLabel}`,
      "",
      header.map(escapeCsv).join(","),
    ];

    if (overtimeSummaries && overtimeSummaries.length > 0) {
      // When overtime is enabled: aggregated Regular + OT rows per worker (Gusto preferred format)
      for (const s of overtimeSummaries) {
        if (s.regularHours > 0) {
          lines.push([s.workerName, s.regularHours.toFixed(2), "Regular", "", "", ""].map(escapeCsv).join(","));
        }
        if (s.overtimeHours > 0) {
          lines.push([s.workerName, s.overtimeHours.toFixed(2), "Overtime", "", "", ""].map(escapeCsv).join(","));
        }
      }
    } else {
      // No overtime — per-shift detail rows
      for (const r of rows) {
        lines.push([r.workerName, r.hoursWorked.toFixed(2), "Regular", r.projectName, r.date, ""].map(escapeCsv).join(","));
      }
    }

    return lines.join("\n");
  },
};

const quickbooksAdapter: PayrollAdapter = {
  id: "quickbooks",
  label: "QuickBooks (IIF)",
  fileExtension: "iif",
  mimeType: "text/plain",
  serialize(rows, periodLabel) {
    // QuickBooks IIF time activity format (simplified)
    const lines = [
      `!TIMEAVTY\tNAME\tJOBNAME\tITEMSERVICE\tDURATION\tPAYROLLITEM\tNOTE`,
      `; Constra Payroll Export — ${periodLabel}`,
      ...rows.map((r) =>
        `TIMEAVTY\t${r.workerName}\t${r.projectName}\t\t${r.hoursWorked.toFixed(2)}\tHourly\t${r.date}`
      ),
    ];
    return lines.join("\n");
  },
};

export const PAYROLL_ADAPTERS: PayrollAdapter[] = [csvAdapter, gustoAdapter, quickbooksAdapter];

export function exportPayroll(
  adapterId: string,
  entries: ClockEntry[],
  workers: Worker[],
  projects: Project[],
  periodStart: Date,
  periodEnd: Date,
  periodLabel: string,
  overtimeSettings?: OvertimeSettings | null,
): void {
  const adapter = PAYROLL_ADAPTERS.find((a) => a.id === adapterId);
  if (!adapter) return;

  const rows = buildRows(entries, workers, projects, periodStart, periodEnd);

  // Build overtime summaries only when the feature is enabled
  const overtimeSummaries =
    overtimeSettings?.enabled
      ? buildOvertimeSummaries(entries, workers, periodStart, periodEnd, overtimeSettings)
      : undefined;

  const content = adapter.serialize(rows, periodLabel, overtimeSummaries, overtimeSettings?.multiplier);
  const blob = new Blob([content], { type: adapter.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `constra-payroll-${periodLabel.replace(/\s/g, "-").toLowerCase()}.${adapter.fileExtension}`;
  // Must append to DOM before clicking — required for Firefox and mobile browsers
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
