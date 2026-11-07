// Payroll export adapter pattern.
// Phase 1: CSV (universal), QuickBooks IIF, Gusto CSV
// Phase 2: ADP, Paychex (add new adapters here without changing callers)

import type { ClockEntry, Worker, Project } from "./mock-data";
import type { OvertimeSettings } from "./overtime";
import { computeWorkerOvertime } from "./overtime";
import { hoursBetween } from "./hours";
import { saveFile } from "@/lib/native";

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
    .filter((e) => e.clockOut && new Date(e.clockIn) >= periodStart && new Date(e.clockIn) <= periodEnd && new Date(e.clockOut).getTime() !== 0)
    .map((e) => {
      const worker = workerMap.get(e.workerId);
      const project = projectMap.get(e.projectId);
      const hours = (hoursBetween(e.clockIn, e.clockOut!));
      const rate = worker?.hourlyRate ?? 0;
      return {
        workerName: worker?.name ?? "Unknown",
        workerEmail: worker?.email ?? "",
        role: worker?.customRole ?? worker?.role ?? "",
        projectName: project?.name ?? "—",
        date: new Date(e.clockIn).toLocaleDateString("en-CA"),
        clockIn: new Date(e.clockIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        clockOut: new Date(e.clockOut!).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
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
    if (!e.clockOut || new Date(e.clockIn) < periodStart || new Date(e.clockIn) > periodEnd || new Date(e.clockOut).getTime() === 0) continue;
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

export function escapeCsv(val: string | number): string {
  let s = String(val);
  // Spreadsheet apps run text starting with = + - @ as a formula (CSV injection)
  if (typeof val === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
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

// QuickBooks Desktop timer activity. Tabs and line breaks would split a row, and every row needs
// names that already exist in that company's QuickBooks. Not yet tried against a real company file.
const iifText = (s: string) => s.replace(/[\t\r\n]+/g, " ").trim();

function hoursToDuration(hours: number): string {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

const quickbooksAdapter: PayrollAdapter = {
  id: "quickbooks",
  label: "QuickBooks Desktop (IIF)",
  fileExtension: "iif",
  mimeType: "text/plain",
  serialize(rows) {
    const lines = [
      "!TIMEACT\tDATE\tJOB\tEMP\tITEM\tPITEM\tDURATION\tPROJ\tNOTE\tXFERTOPAYROLL\tBILLINGSTATUS",
      ...rows.map((r) => {
        const [y, m, d] = r.date.split("-");
        return ["TIMEACT", `${m}/${d}/${y}`, iifText(r.projectName), iifText(r.workerName), "", "Hourly", hoursToDuration(r.hoursWorked), "", iifText(`${r.clockIn} to ${r.clockOut}`), "Y", "0"].join("\t");
      }),
    ];
    return lines.join("\r\n");
  },
};

// QuickBooks Online has no general way to import hours, so this is the sheet to enter them from
const quickbooksOnlineAdapter: PayrollAdapter = {
  id: "quickbooks-online",
  label: "QuickBooks Online (hours to enter)",
  fileExtension: "csv",
  mimeType: "text/csv",
  serialize(rows, periodLabel, overtimeSummaries) {
    const totals = new Map<string, { regular: number; overtime: number }>();
    for (const r of rows) {
      const t = totals.get(r.workerName) ?? { regular: 0, overtime: 0 };
      t.regular += r.hoursWorked;
      totals.set(r.workerName, t);
    }
    for (const o of overtimeSummaries ?? []) totals.set(o.workerName, { regular: o.regularHours, overtime: o.overtimeHours });
    // Overtime columns only when it's switched on: a column of zeros would read as "no overtime"
    const withOvertime = !!overtimeSummaries?.length;
    return [
      `# Hours for ${periodLabel}`,
      (withOvertime ? ["Employee", "Regular Hours", "Overtime Hours", "Total Hours"] : ["Employee", "Total Hours"]).join(","),
      ...[...totals].map(([name, t]) => (withOvertime
        ? [name, t.regular.toFixed(2), t.overtime.toFixed(2), (t.regular + t.overtime).toFixed(2)]
        : [name, t.regular.toFixed(2)]).map(escapeCsv).join(",")),
    ].join("\n");
  },
};

export const PAYROLL_ADAPTERS: PayrollAdapter[] = [csvAdapter, gustoAdapter, quickbooksOnlineAdapter, quickbooksAdapter];

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
  // BOM so Excel reads names with accents correctly (not for QuickBooks IIF)
  const blob = new Blob([adapter.fileExtension === "csv" ? "\uFEFF" + content : content], { type: adapter.mimeType });
  // Keep the name plain ASCII: en dashes, commas and accents from a period label trip up
  // Windows, Excel and some payroll portals.
  const slug = periodLabel.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  saveFile(blob, `constra-payroll-${slug}.${adapter.fileExtension}`).catch(console.error);
}
