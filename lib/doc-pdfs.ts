import type {
  RFI, ChangeOrder, PunchItem, SafetyIncident, DailyReport, Equipment, InsurancePolicy, Project, Worker, BudgetLine, Task,
} from "./mock-data";
import { COVERAGE_TYPE_LABELS } from "./mock-data";
import { exportRecordPdf, exportListPdf, safeName, type Brand, type Tone } from "./branded-pdf";

// The paper version of each record, and a printable list of each log, all with the company logo.

export type DocCtx = { brand: Brand; currency: string; projects: Project[]; workers: Worker[] };

const cap = (s: string | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ") : "");
const day = (d: Date | string | undefined | null) => (d ? new Date(d).toLocaleDateString("en-CA", { dateStyle: "medium" }) : "");
const money = (n: number, cur: string) => new Intl.NumberFormat("en-CA", { style: "currency", currency: cur || "CAD" }).format(n || 0);
const proj = (c: DocCtx, id?: string) => c.projects.find((p) => p.id === id)?.name ?? "";
const who = (c: DocCtx, id?: string) => c.workers.find((w) => w.id === id)?.name ?? "";
const file = (c: DocCtx, kind: string, num?: string) => `${safeName(c.brand.company)}-${safeName(kind)}${num ? `-${safeName(num)}` : ""}.pdf`;
const stamp = () => new Date().toISOString().slice(0, 10);

const RFI_TONE: Record<string, Tone> = { open: "warn", answered: "good", closed: "info" };
const CO_TONE: Record<string, Tone> = { pending: "warn", approved: "good", rejected: "bad", void: "info" };
const PUNCH_TONE: Record<string, Tone> = { open: "bad", "in-progress": "warn", resolved: "good" };
const SEV_TONE: Record<string, Tone> = { low: "info", medium: "warn", high: "bad", critical: "bad" };

// ───────────────────────────── single records ─────────────────────────────

export function exportRfiPdf(r: RFI, c: DocCtx) {
  return exportRecordPdf({
    brand: c.brand, kind: "RFI", number: `${r.number}  -  Request for information`, title: r.subject,
    status: { label: cap(r.status), tone: RFI_TONE[r.status] ?? "info" },
    fields: [
      ["Project", proj(c, r.projectId)], ["Priority", cap(r.priority)],
      ["Asked by", who(c, r.submittedById)], ["Assigned to", who(c, r.assignedToId)],
      ["Date sent", day(r.createdAt)], ["Needed by", day(r.dueDate)],
    ],
    sections: [{ heading: "Question", body: r.question }, { heading: "Answer", body: r.answer ?? "" }],
    signatures: ["Answered by", "Date"],
    filename: file(c, "RFI", r.number),
  });
}

export function exportChangeOrderBrandedPdf(co: ChangeOrder, c: DocCtx) {
  return exportRecordPdf({
    brand: c.brand, kind: "Change order", number: co.number, title: co.title,
    status: { label: cap(co.status), tone: CO_TONE[co.status] ?? "info" },
    fields: [
      ["Project", proj(c, co.projectId)], ["Amount", money(co.amount, c.currency)],
      ["Submitted by", who(c, co.submittedById)], ["Submitted on", day(co.submittedAt)],
      ...(co.approvedAt ? ([["Approved by", co.approvedBy ?? ""], ["Approved on", day(co.approvedAt)]] as [string, string][]) : []),
    ],
    sections: [{ heading: "Description of the change", body: co.description }, { heading: "Reason", body: co.reason }],
    signatures: ["Contractor", "Client approval", "Date"],
    filename: file(c, "Change-order", co.number),
  });
}

export function exportPunchItemPdf(p: PunchItem, c: DocCtx) {
  return exportRecordPdf({
    brand: c.brand, kind: "Punch item", title: p.title,
    status: { label: cap(p.status), tone: PUNCH_TONE[p.status] ?? "info" },
    fields: [
      ["Project", proj(c, p.projectId)], ["Priority", cap(p.priority)],
      ["Location", p.location ?? ""], ["Assigned to", who(c, p.assignedToId)],
      ["Added", day(p.createdAt)], ["Due", day(p.dueDate)],
    ],
    sections: [{ heading: "What needs doing", body: p.description }],
    signatures: ["Completed by", "Accepted by", "Date"],
    filename: file(c, "Punch-item", p.title.slice(0, 24)),
  });
}

export function exportIncidentPdf(i: SafetyIncident, c: DocCtx) {
  return exportRecordPdf({
    brand: c.brand, kind: "Incident report", title: `${cap(i.type)} on ${day(i.date)}`,
    status: { label: cap(i.severity), tone: SEV_TONE[i.severity] ?? "info" },
    fields: [
      ["Date", day(i.date)], ["Project", proj(c, i.projectId)],
      ["Type", cap(i.type)], ["Severity", cap(i.severity)],
      ["Reported by", who(c, i.reportedById)], ["Person involved", who(c, i.injuredId)],
      ["Reported to regulator", i.reportedToOSHA ? "Yes" : "No"],
    ],
    sections: [{ heading: "What happened", body: i.description }, { heading: "Action taken", body: i.actionTaken }],
    signatures: ["Reported by", "Supervisor", "Date"],
    filename: file(c, "Incident-report", new Date(i.date).toISOString().slice(0, 10)),
  });
}

export function exportDailyReportBrandedPdf(r: DailyReport, c: DocCtx, metric = false) {
  const temp = metric ? `${Math.round(((r.temperatureF - 32) * 5) / 9)} °C` : `${Math.round(r.temperatureF)} °F`;
  const names = (r.crewOnSite ?? []).map((id) => who(c, id)).filter(Boolean);
  return exportRecordPdf({
    brand: c.brand, kind: "Daily report", number: day(r.date), title: proj(c, r.projectId) || "Daily report",
    fields: [
      ["Project", proj(c, r.projectId)], ["Date", day(r.date)],
      ["Weather", `${r.weather || ""}${r.temperatureF ? `, ${temp}` : ""}`.replace(/^, /, "")], ["Crew on site", String(r.crewCount ?? names.length)],
      ["Submitted by", who(c, r.submittedById)],
    ],
    sections: [
      { heading: "Crew", body: names.join(", ") },
      { heading: "Work completed", body: r.workCompleted }, { heading: "Delays", body: r.delays },
      { heading: "Materials used", body: r.materialsUsed }, { heading: "Visitors", body: r.visitorLog }, { heading: "Notes", body: r.notes },
    ],
    signatures: ["Foreman", "Date"],
    filename: file(c, "Daily-report", new Date(r.date).toISOString().slice(0, 10)),
  });
}

// ───────────────────────────── whole lists ─────────────────────────────

export function exportRfiListPdf(list: RFI[], c: DocCtx) {
  return exportListPdf({
    brand: c.brand, title: "RFI log", landscape: true,
    summary: [["Total", String(list.length)], ["Open", String(list.filter((r) => r.status === "open").length)], ["Answered", String(list.filter((r) => r.status === "answered").length)], ["Closed", String(list.filter((r) => r.status === "closed").length)]],
    columns: [{ label: "RFI #", w: 1 }, { label: "Subject", w: 4 }, { label: "Project", w: 2.4 }, { label: "Assigned to", w: 2 }, { label: "Priority", w: 1.2 }, { label: "Needed by", w: 1.6 }, { label: "Status", w: 1.2 }],
    rows: list.map((r) => [r.number, r.subject, proj(c, r.projectId), who(c, r.assignedToId), cap(r.priority), day(r.dueDate), cap(r.status)]),
    toneColumn: { index: 6, tones: { Open: "warn", Answered: "good", Closed: "info" } },
    filename: `${safeName(c.brand.company)}-RFI-log-${stamp()}.pdf`,
  });
}

export function exportPunchListPdf(list: PunchItem[], c: DocCtx) {
  return exportListPdf({
    brand: c.brand, title: "Punch list", landscape: true,
    summary: [["Items", String(list.length)], ["Open", String(list.filter((p) => p.status === "open").length)], ["In progress", String(list.filter((p) => p.status === "in-progress").length)], ["Resolved", String(list.filter((p) => p.status === "resolved").length)]],
    columns: [{ label: "Item", w: 4 }, { label: "Location", w: 1.8 }, { label: "Project", w: 2.4 }, { label: "Assigned to", w: 2 }, { label: "Priority", w: 1.2 }, { label: "Due", w: 1.6 }, { label: "Status", w: 1.4 }],
    rows: list.map((p) => [p.title, p.location ?? "", proj(c, p.projectId), who(c, p.assignedToId), cap(p.priority), day(p.dueDate), cap(p.status)]),
    toneColumn: { index: 6, tones: { Open: "bad", "In progress": "warn", Resolved: "good" } },
    filename: `${safeName(c.brand.company)}-Punch-list-${stamp()}.pdf`,
  });
}

export function exportEquipmentListPdf(list: Equipment[], c: DocCtx) {
  return exportListPdf({
    brand: c.brand, title: "Equipment list", landscape: true,
    summary: [["Machines", String(list.length)], ["In use", String(list.filter((e) => e.status === "in-use").length)], ["In maintenance", String(list.filter((e) => e.status === "maintenance").length)]],
    columns: [{ label: "Equipment", w: 3 }, { label: "Type", w: 2 }, { label: "Status", w: 1.5 }, { label: "Project", w: 2.4 }, { label: "Last service", w: 1.6 }, { label: "Next service", w: 1.6 }, { label: "Daily rate", w: 1.4, align: "right" }],
    rows: list.map((e) => [e.name, e.type, cap(e.status), proj(c, e.projectId), day(e.lastService), day(e.nextService), money(e.dailyRate, c.currency)]),
    toneColumn: { index: 2, tones: { Available: "good", "In use": "info", Maintenance: "warn", "Off site": "info" } },
    filename: `${safeName(c.brand.company)}-Equipment-${stamp()}.pdf`,
  });
}

export function exportInsuranceListPdf(list: InsurancePolicy[], c: DocCtx) {
  const now = Date.now();
  const status = (p: InsurancePolicy) => { const d = (new Date(p.expiryDate).getTime() - now) / 86_400_000; return d < 0 ? "Expired" : d <= 30 ? "Expiring" : "Active"; };
  return exportListPdf({
    brand: c.brand, title: "Insurance & policies", landscape: true,
    summary: [["Policies", String(list.length)], ["Expiring soon", String(list.filter((p) => status(p) === "Expiring").length)], ["Expired", String(list.filter((p) => status(p) === "Expired").length)]],
    columns: [{ label: "Holder", w: 2.4 }, { label: "Coverage", w: 2.4 }, { label: "Insurer", w: 2 }, { label: "Policy #", w: 1.6 }, { label: "Amount", w: 1.6, align: "right" }, { label: "Expires", w: 1.5 }, { label: "Status", w: 1.2 }],
    rows: list.map((p) => [p.holderName, COVERAGE_TYPE_LABELS[p.coverageType] ?? p.coverageType, p.insurer, p.policyNumber, money(p.coverageAmount, c.currency), day(p.expiryDate), status(p)]),
    toneColumn: { index: 6, tones: { Active: "good", Expiring: "warn", Expired: "bad" } },
    filename: `${safeName(c.brand.company)}-Insurance-${stamp()}.pdf`,
  });
}

export function exportTaskListPdf(list: (Task & { projectName: string })[], c: DocCtx) {
  return exportListPdf({
    brand: c.brand, title: "Task list", landscape: true,
    summary: [["Tasks", String(list.length)], ["In progress", String(list.filter((t) => t.status === "in-progress").length)], ["Completed", String(list.filter((t) => t.status === "completed").length)], ["Delayed", String(list.filter((t) => t.status === "delayed").length)]],
    columns: [{ label: "Task", w: 4 }, { label: "Project", w: 2.4 }, { label: "Assigned to", w: 2 }, { label: "Start", w: 1.5 }, { label: "Due", w: 1.5 }, { label: "Progress", w: 1.1, align: "right" }, { label: "Status", w: 1.4 }],
    rows: list.map((t) => [t.name, t.projectName, who(c, t.workerId), day(t.startDate), day(t.endDate), `${Math.round(t.progress ?? 0)}%`, cap(t.status)]),
    toneColumn: { index: 6, tones: { "Not started": "info", "In progress": "warn", Completed: "good", Delayed: "bad" } },
    filename: `${safeName(c.brand.company)}-Tasks-${stamp()}.pdf`,
  });
}

export function exportChangeOrderListPdf(list: ChangeOrder[], c: DocCtx) {
  const approved = list.filter((x) => x.status === "approved").reduce((s, x) => s + x.amount, 0);
  const pending = list.filter((x) => x.status === "pending").reduce((s, x) => s + x.amount, 0);
  return exportListPdf({
    brand: c.brand, title: "Change order log", landscape: true,
    summary: [["Change orders", String(list.length)], ["Approved", money(approved, c.currency)], ["Pending", money(pending, c.currency)]],
    columns: [{ label: "CO #", w: 1 }, { label: "Title", w: 4 }, { label: "Project", w: 2.4 }, { label: "Submitted", w: 1.6 }, { label: "Amount", w: 1.6, align: "right" }, { label: "Status", w: 1.3 }],
    rows: list.map((x) => [x.number, x.title, proj(c, x.projectId), day(x.submittedAt), money(x.amount, c.currency), cap(x.status)]),
    toneColumn: { index: 5, tones: { Pending: "warn", Approved: "good", Rejected: "bad", Void: "info" } },
    filename: `${safeName(c.brand.company)}-Change-orders-${stamp()}.pdf`,
  });
}

export function exportDailyReportListPdf(list: DailyReport[], c: DocCtx) {
  return exportListPdf({
    brand: c.brand, title: "Daily report log", landscape: true,
    summary: [["Reports", String(list.length)], ["Crew days", String(list.reduce((s, r) => s + (r.crewCount || 0), 0))]],
    columns: [{ label: "Date", w: 1.4 }, { label: "Project", w: 2.2 }, { label: "Weather", w: 1.4 }, { label: "Crew", w: 0.8, align: "right" }, { label: "Work completed", w: 5 }, { label: "Delays", w: 2.4 }],
    rows: list.map((r) => [day(r.date), proj(c, r.projectId), r.weather, String(r.crewCount ?? ""), r.workCompleted, r.delays]),
    filename: `${safeName(c.brand.company)}-Daily-reports-${stamp()}.pdf`,
  });
}

export function exportIncidentListPdf(list: SafetyIncident[], c: DocCtx) {
  return exportListPdf({
    brand: c.brand, title: "Safety incident log", landscape: true,
    summary: [["Incidents", String(list.length)], ["High or critical", String(list.filter((i) => i.severity === "high" || i.severity === "critical").length)], ["Injuries", String(list.filter((i) => i.type === "injury").length)]],
    columns: [{ label: "Date", w: 1.4 }, { label: "Project", w: 2 }, { label: "Type", w: 1.5 }, { label: "Severity", w: 1.2 }, { label: "What happened", w: 4.2 }, { label: "Action taken", w: 3 }],
    rows: list.map((i) => [day(i.date), proj(c, i.projectId), cap(i.type), cap(i.severity), i.description, i.actionTaken]),
    toneColumn: { index: 3, tones: { Low: "info", Medium: "warn", High: "bad", Critical: "bad" } },
    filename: `${safeName(c.brand.company)}-Safety-log-${stamp()}.pdf`,
  });
}

export function exportBudgetPdf(lines: BudgetLine[], c: DocCtx) {
  const budget = lines.reduce((s, l) => s + l.budgeted, 0), actual = lines.reduce((s, l) => s + l.actual, 0);
  return exportListPdf({
    brand: c.brand, title: "Budget vs actual", landscape: true,
    summary: [["Budget", money(budget, c.currency)], ["Actual", money(actual, c.currency)], ["Remaining", money(budget - actual, c.currency)]],
    columns: [{ label: "Code", w: 1 }, { label: "Project", w: 2.4 }, { label: "Description", w: 3.2 }, { label: "Category", w: 1.6 }, { label: "Budget", w: 1.5, align: "right" }, { label: "Actual", w: 1.5, align: "right" }, { label: "Left", w: 1.5, align: "right" }],
    rows: lines.map((l) => [l.code, proj(c, l.projectId), l.description, cap(l.category), money(l.budgeted, c.currency), money(l.actual, c.currency), money(l.budgeted - l.actual, c.currency)]),
    filename: `${safeName(c.brand.company)}-Budget-${stamp()}.pdf`,
  });
}

export type MaterialsByTrade = Record<string, { name: string; unit: string; deliveries: number; usage: number }[]>;

export function exportMaterialsBrandedPdf(projectName: string, byTrade: MaterialsByTrade, c: DocCtx) {
  const rows: string[][] = [];
  let low = 0, items = 0;
  for (const trade of Object.keys(byTrade)) {
    for (const m of byTrade[trade] ?? []) {
      const onHand = m.deliveries - m.usage;
      items++; if (onHand < 0) low++;
      rows.push([trade, m.name, `${m.deliveries} ${m.unit}`, `${m.usage} ${m.unit}`, `${onHand} ${m.unit}`, onHand < 0 ? "Low" : "OK"]);
    }
  }
  return exportListPdf({
    brand: c.brand, title: "Materials report", subtitle: `${projectName}  -  ${day(new Date())}`,
    summary: [["Materials", String(items)], ["Trades", String(Object.keys(byTrade).length)], ["Running low", String(low)]],
    columns: [{ label: "Trade", w: 1.6 }, { label: "Material", w: 3.4 }, { label: "Delivered", w: 1.4, align: "right" }, { label: "Used", w: 1.4, align: "right" }, { label: "On hand", w: 1.4, align: "right" }, { label: "Status", w: 1 }],
    rows,
    toneColumn: { index: 5, tones: { OK: "good", Low: "bad" } },
    filename: `${safeName(c.brand.company)}-Materials-${safeName(projectName)}-${stamp()}.pdf`,
  });
}
