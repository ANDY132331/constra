import type {
  Worker, Project, Invoice, RFI, PunchItem, SafetyIncident, Equipment, MaterialEntry, DailyReport,
  ChangeOrder, BudgetLine, InsurancePolicy,
} from "./mock-data";
import { COVERAGE_TYPE_LABELS } from "./mock-data";
import { moneyTotals } from "./money";
import { isoToSerial } from "./sheet-calc";
import { Book, type Cell, type Row, type SheetDef, type Cf, type Validation, colName, serialDay } from "./xlsx-book";

// Ready-made Excel sheets for a contractor's office. Every one carries the company logo and name
// on top, is a real Excel Table (filter buttons, rows that extend with their formulas, a totals
// row), has drop-downs and status colours where they help, and prints on one page width.
// Some can be filled with the company's own records first; the rest start blank.

export type Category = "money" | "crew" | "site" | "plans";
export const CATEGORY_LABELS: Record<Category, string> = { money: "Money & payments", crew: "Crew & time", site: "Site & paperwork", plans: "Plans & schedules" };

export type Kind = "text" | "long" | "money" | "num" | "int" | "pct" | "date" | "list";
type Rec = Record<string, string | number | Date | null | undefined>;
type Tone = "good" | "warn" | "bad" | "info";
export type Ref = { t: (key: string) => string; S: (key: string) => string; sum: (key: string) => string; rng: (a: string, b: string) => string };

type Col = {
  key: string; label: string; kind: Kind; w?: number; list?: string[];
  total?: "sum" | "count" | "average";
  /** A formula for the whole column, written with Ref helpers (structured references) */
  calc?: (r: Ref) => string;
  /** The value shown for a pre-filled row before Excel recalculates */
  value?: (rec: Rec) => number | string;
};

type Setting = { key: string; label: string; value: number; kind: "pct" | "num" | "money" | "int" };
type Result = { label: string; formula: (r: Ref, prev: string[]) => string; kind: "money" | "num"; big?: boolean };

export type Template = {
  id: string; category: Category; title: string; blurb: string;
  tableName: string; cols: Col[]; blank: number;
  fields?: string[]; settings?: Setting[]; results?: Result[];
  status?: { key: string; tones: Record<string, Tone> };
  gantt?: { startKey: string; endKey: string; weeks: number };
  tips?: string[]; landscape?: boolean; admin?: boolean;
  /** What "use my data" fills in, and the rows for it */
  prefillLabel?: string;
  prefill?: (d: TemplateData) => Rec[];
};

export type TemplateData = {
  currency: string; workers: Worker[]; projects: Project[]; invoices: Invoice[]; rfis: RFI[]; punchItems: PunchItem[];
  safetyIncidents: SafetyIncident[]; equipment: Equipment[]; materialEntries: MaterialEntry[]; dailyReports: DailyReport[];
  changeOrders: ChangeOrder[]; budgetLines: BudgetLine[]; insurancePolicies: InsurancePolicy[];
};

const PRIORITY = ["Low", "Medium", "High"];
const YESNO = ["Yes", "No"];
const UNITS = ["EA", "LF", "SF", "SY", "CY", "HR", "DAY", "LS", "M", "M2", "M3", "KG", "T", "BAG", "BOX", "ROLL", "SHEET"];
const COST_CATS = ["Labour", "Materials", "Subcontractor", "Equipment", "General", "Other"];
const cap = (s: string | undefined) => (s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ") : "");
const d = (x: Date | string | undefined | null) => (x ? new Date(x) : null);

const money = (n: number) => Math.round(n * 100) / 100;

export const TEMPLATES: Template[] = [
  // ───────────────────────────── Money ─────────────────────────────
  {
    id: "payment-tracker", category: "money", title: "Payment Tracker", blurb: "Who owes you what: invoiced, paid, balance and overdue, with the status worked out for you.",
    tableName: "Payments", blank: 30, admin: true, fields: ["Project"],
    cols: [
      { key: "invoice", label: "Invoice #", kind: "text", w: 14 },
      { key: "client", label: "Client", kind: "text", w: 24 },
      { key: "project", label: "Project", kind: "text", w: 24 },
      { key: "due", label: "Due date", kind: "date" },
      { key: "received", label: "Date received", kind: "date" },
      { key: "method", label: "Method", kind: "list", list: ["e-Transfer", "Cheque", "Cash", "Card", "Bank transfer", "Other"] },
      { key: "invoiced", label: "Invoiced", kind: "money", total: "sum" },
      { key: "paid", label: "Paid", kind: "money", total: "sum" },
      { key: "balance", label: "Balance", kind: "money", total: "sum", calc: (r) => `${r.t("invoiced")}-${r.t("paid")}`, value: (x) => money(Number(x.invoiced ?? 0) - Number(x.paid ?? 0)) },
      {
        key: "status", label: "Status", kind: "text", w: 12,
        calc: (r) => `IF(${r.t("invoiced")}=0,"",IF(${r.t("paid")}>=${r.t("invoiced")},"Paid",IF(AND(${r.t("due")}<>"",${r.t("due")}<TODAY()),"Overdue",IF(${r.t("paid")}>0,"Partial","Unpaid"))))`,
        value: (x) => { const i = Number(x.invoiced ?? 0), p = Number(x.paid ?? 0); return i === 0 ? "" : p >= i ? "Paid" : x.due && new Date(x.due as Date) < new Date() ? "Overdue" : p > 0 ? "Partial" : "Unpaid"; },
      },
    ],
    status: { key: "status", tones: { Paid: "good", Partial: "warn", Unpaid: "info", Overdue: "bad" } },
    tips: ["Type the invoice amount in Invoiced and what the client has paid in Paid. Balance and Status fill themselves.", "Overdue shows when the due date has passed and the invoice isn't fully paid."],
    prefillLabel: "my invoices",
    prefill: (dt) => dt.invoices.filter((i) => i.status !== "draft").map((i) => {
      const t = moneyTotals(i.items, i.taxRate).total;
      return { invoice: i.number, client: i.clientName, project: "", due: d(i.dueDate), received: null, method: "", invoiced: t, paid: i.status === "paid" ? t : 0 };
    }),
  },
  {
    id: "invoice-register", category: "money", title: "Invoice Register", blurb: "Every invoice you've sent in one list, with totals, tax, what's paid and what's outstanding.",
    tableName: "Invoices", blank: 30, admin: true,
    cols: [
      { key: "number", label: "Invoice #", kind: "text", w: 14 },
      { key: "client", label: "Client", kind: "text", w: 26 },
      { key: "issued", label: "Issued", kind: "date" },
      { key: "due", label: "Due", kind: "date" },
      { key: "subtotal", label: "Subtotal", kind: "money", total: "sum" },
      { key: "tax", label: "Tax", kind: "money", total: "sum" },
      { key: "total", label: "Total", kind: "money", total: "sum", calc: (r) => `${r.t("subtotal")}+${r.t("tax")}`, value: (x) => money(Number(x.subtotal ?? 0) + Number(x.tax ?? 0)) },
      { key: "paid", label: "Paid", kind: "money", total: "sum" },
      { key: "outstanding", label: "Outstanding", kind: "money", total: "sum", calc: (r) => `${r.t("total")}-${r.t("paid")}`, value: (x) => money(Number(x.subtotal ?? 0) + Number(x.tax ?? 0) - Number(x.paid ?? 0)) },
      { key: "status", label: "Status", kind: "list", list: ["Draft", "Sent", "Paid", "Overdue"] },
    ],
    status: { key: "status", tones: { Draft: "info", Sent: "warn", Paid: "good", Overdue: "bad" } },
    prefillLabel: "my invoices",
    prefill: (dt) => dt.invoices.map((i) => {
      const t = moneyTotals(i.items, i.taxRate);
      return { number: i.number, client: i.clientName, issued: d(i.issueDate), due: d(i.dueDate), subtotal: t.subtotal, tax: t.tax, paid: i.status === "paid" ? t.total : 0, status: cap(i.status) };
    }),
  },
  {
    id: "subcontractor-payments", category: "money", title: "Subcontractor Payments", blurb: "What you've paid each sub, with retainage held back and the net you actually sent.",
    tableName: "SubPayments", blank: 30, admin: true, fields: ["Project"],
    cols: [
      { key: "date", label: "Date", kind: "date" },
      { key: "sub", label: "Subcontractor", kind: "text", w: 26 },
      { key: "trade", label: "Trade", kind: "text", w: 16 },
      { key: "ref", label: "Invoice or ref", kind: "text", w: 16 },
      { key: "contract", label: "Contract amount", kind: "money", total: "sum" },
      { key: "paid", label: "Paid this time", kind: "money", total: "sum" },
      { key: "pct", label: "Retainage %", kind: "pct" },
      { key: "held", label: "Retainage held", kind: "money", total: "sum", calc: (r) => `${r.t("paid")}*${r.t("pct")}` },
      { key: "net", label: "Net paid", kind: "money", total: "sum", calc: (r) => `${r.t("paid")}-${r.t("held")}` },
      { key: "status", label: "Status", kind: "list", list: ["Approved", "Paid", "On hold", "Disputed"] },
    ],
    status: { key: "status", tones: { Approved: "info", Paid: "good", "On hold": "warn", Disputed: "bad" } },
    tips: ["Enter retainage as a percentage, for example 10%. Retainage held and Net paid are worked out from it."],
  },
  {
    id: "expense-log", category: "money", title: "Expense & Receipt Log", blurb: "Log every receipt by job and category, with tax split out, so nothing is lost at year end.",
    tableName: "Expenses", blank: 40, admin: true, fields: ["Project"],
    cols: [
      { key: "date", label: "Date", kind: "date" },
      { key: "vendor", label: "Vendor", kind: "text", w: 24 },
      { key: "category", label: "Category", kind: "list", list: ["Materials", "Labour", "Fuel", "Equipment hire", "Tools", "Permits", "Insurance", "Office", "Travel", "Other"], w: 18 },
      { key: "project", label: "Project", kind: "text", w: 22 },
      { key: "paidwith", label: "Paid with", kind: "list", list: ["Company card", "Cash", "Cheque", "Bank transfer", "Personal card"] },
      { key: "receipt", label: "Receipt #", kind: "text", w: 14 },
      { key: "amount", label: "Amount", kind: "money", total: "sum" },
      { key: "tax", label: "Tax", kind: "money", total: "sum" },
      { key: "total", label: "Total", kind: "money", total: "sum", calc: (r) => `${r.t("amount")}+${r.t("tax")}` },
      { key: "reimb", label: "Reimbursable", kind: "list", list: YESNO, w: 14 },
    ],
  },
  {
    id: "job-cost-tracker", category: "money", title: "Job Cost Tracker", blurb: "Budget against what you've committed and spent per cost code, with a flag when a line runs hot.",
    tableName: "JobCosts", blank: 30, admin: true,
    cols: [
      { key: "code", label: "Cost code", kind: "text", w: 12 },
      { key: "project", label: "Project", kind: "text", w: 24 },
      { key: "desc", label: "Description", kind: "text", w: 30 },
      { key: "category", label: "Category", kind: "list", list: COST_CATS, w: 16 },
      { key: "budget", label: "Budget", kind: "money", total: "sum" },
      { key: "committed", label: "Committed", kind: "money", total: "sum" },
      { key: "actual", label: "Actual", kind: "money", total: "sum" },
      { key: "variance", label: "Variance", kind: "money", total: "sum", calc: (r) => `${r.t("budget")}-${r.t("actual")}`, value: (x) => money(Number(x.budget ?? 0) - Number(x.actual ?? 0)) },
      { key: "used", label: "% used", kind: "pct", calc: (r) => `IF(${r.t("budget")}=0,0,${r.t("actual")}/${r.t("budget")})`, value: (x) => (Number(x.budget) > 0 ? Number(x.actual ?? 0) / Number(x.budget) : 0) },
      {
        key: "flag", label: "Flag", kind: "text", w: 13,
        calc: (r) => `IF(${r.t("budget")}=0,"",IF(${r.t("actual")}>${r.t("budget")},"Over budget",IF(${r.t("actual")}>=${r.t("budget")}*0.8,"Watch","On track")))`,
        value: (x) => { const b = Number(x.budget ?? 0), a = Number(x.actual ?? 0); return b === 0 ? "" : a > b ? "Over budget" : a >= b * 0.8 ? "Watch" : "On track"; },
      },
    ],
    status: { key: "flag", tones: { "On track": "good", Watch: "warn", "Over budget": "bad" } },
    tips: ["Variance is Budget minus Actual, so a negative number means you're over.", "Watch appears once a line has used 80% of its budget."],
    prefillLabel: "my budget lines",
    prefill: (dt) => dt.budgetLines.map((b) => ({ code: b.code, project: dt.projects.find((p) => p.id === b.projectId)?.name ?? "", desc: b.description, category: cap(b.category), budget: b.budgeted, committed: 0, actual: b.actual })),
  },
  {
    id: "estimate-builder", category: "money", title: "Estimate Builder", blurb: "Line items with quantities and unit costs, then markup and tax, for a quote total you can send.",
    tableName: "Estimate", blank: 25, admin: true, fields: ["Project", "Client", "Prepared by", "Date"],
    settings: [{ key: "markup", label: "Markup %", value: 0.15, kind: "pct" }, { key: "tax", label: "Tax %", value: 0.05, kind: "pct" }],
    cols: [
      { key: "item", label: "Item", kind: "text", w: 24 },
      { key: "desc", label: "Description", kind: "long", w: 40 },
      { key: "category", label: "Category", kind: "list", list: COST_CATS, w: 16 },
      { key: "qty", label: "Qty", kind: "num" },
      { key: "unit", label: "Unit", kind: "list", list: UNITS, w: 9 },
      { key: "cost", label: "Unit cost", kind: "money" },
      { key: "line", label: "Line total", kind: "money", total: "sum", calc: (r) => `${r.t("qty")}*${r.t("cost")}` },
    ],
    results: [
      { label: "Subtotal", kind: "money", formula: (r) => r.sum("line") },
      { label: "Markup", kind: "money", formula: (r, p) => `${p[0]}*${r.S("markup")}` },
      { label: "Tax", kind: "money", formula: (r, p) => `(${p[0]}+${p[1]})*${r.S("tax")}` },
      { label: "Total", kind: "money", big: true, formula: (_r, p) => `${p[0]}+${p[1]}+${p[2]}` },
    ],
    tips: ["Change the Markup % and Tax % at the top and every total follows.", "Add rows by typing under the last one. Line total fills in on its own."],
  },
  {
    id: "change-order-log", category: "money", title: "Change Order Log", blurb: "Track every change order: what changed, the amount, and where approval stands.",
    tableName: "ChangeOrders", blank: 25, admin: true,
    cols: [
      { key: "number", label: "CO #", kind: "text", w: 11 },
      { key: "title", label: "Title", kind: "text", w: 30 },
      { key: "project", label: "Project", kind: "text", w: 24 },
      { key: "submitted", label: "Submitted", kind: "date" },
      { key: "amount", label: "Amount", kind: "money", total: "sum" },
      { key: "status", label: "Status", kind: "list", list: ["Pending", "Approved", "Rejected", "Void"] },
      { key: "approvedBy", label: "Approved by", kind: "text", w: 18 },
      { key: "approvedOn", label: "Approved on", kind: "date" },
      { key: "reason", label: "Reason", kind: "long", w: 36 },
    ],
    status: { key: "status", tones: { Pending: "warn", Approved: "good", Rejected: "bad", Void: "info" } },
    prefillLabel: "my change orders",
    prefill: (dt) => dt.changeOrders.map((c) => ({ number: c.number, title: c.title, project: dt.projects.find((p) => p.id === c.projectId)?.name ?? "", submitted: d(c.submittedAt), amount: c.amount, status: cap(c.status), approvedBy: c.approvedBy ?? "", approvedOn: d(c.approvedAt), reason: c.reason })),
  },
  {
    id: "cash-flow", category: "money", title: "Weekly Cash Flow", blurb: "Money in, money out and a running balance by week, so you see a shortfall before it arrives.",
    tableName: "CashFlow", blank: 26, admin: true,
    settings: [{ key: "opening", label: "Opening balance", value: 0, kind: "money" }],
    cols: [
      { key: "week", label: "Week starting", kind: "date", w: 16 },
      { key: "notes", label: "What's expected", kind: "text", w: 34 },
      { key: "inflow", label: "Money in", kind: "money", total: "sum" },
      { key: "outflow", label: "Money out", kind: "money", total: "sum" },
      { key: "net", label: "Net", kind: "money", total: "sum", calc: (r) => `${r.t("inflow")}-${r.t("outflow")}` },
      { key: "balance", label: "Running balance", kind: "money", w: 18, calc: (r) => `${r.S("opening")}+SUM(INDEX(${r.sum("net").replace(/^SUBTOTAL\(109,/, "").replace(/\)$/, "")},1):${r.t("net")})` },
    ],
    tips: ["Set your opening balance at the top. Running balance adds each week's net to it."],
  },
  {
    id: "retainage-tracker", category: "money", title: "Retainage Tracker", blurb: "How much each client is holding back on you, what's been released and what's still owed.",
    tableName: "Retainage", blank: 20, admin: true,
    cols: [
      { key: "project", label: "Project", kind: "text", w: 28 },
      { key: "client", label: "Client", kind: "text", w: 24 },
      { key: "contract", label: "Contract value", kind: "money", total: "sum" },
      { key: "pct", label: "Retainage %", kind: "pct" },
      { key: "billed", label: "Billed to date", kind: "money", total: "sum" },
      { key: "held", label: "Retainage held", kind: "money", total: "sum", calc: (r) => `${r.t("billed")}*${r.t("pct")}` },
      { key: "released", label: "Released", kind: "money", total: "sum" },
      { key: "owed", label: "Still owed to you", kind: "money", total: "sum", calc: (r) => `${r.t("held")}-${r.t("released")}` },
      { key: "dueOn", label: "Release due", kind: "date" },
    ],
  },
  // ───────────────────────────── Crew ─────────────────────────────
  {
    id: "weekly-timesheet", category: "crew", title: "Weekly Timesheet", blurb: "A week-at-a-glance grid for the whole crew with regular and overtime hours and pay worked out.",
    tableName: "WeekHours", blank: 20, admin: true, fields: ["Week starting", "Project"], landscape: true,
    settings: [{ key: "otAfter", label: "Overtime after (hours per week)", value: 40, kind: "num" }, { key: "otMult", label: "Overtime pay multiplier", value: 1.5, kind: "num" }],
    cols: [
      { key: "name", label: "Worker", kind: "text", w: 24 },
      { key: "role", label: "Role", kind: "text", w: 16 },
      ...["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((k) => ({ key: k.toLowerCase(), label: k, kind: "num" as Kind, w: 8, total: "sum" as const })),
      { key: "total", label: "Total hours", kind: "num", w: 12, total: "sum", calc: (r) => `SUM(${r.rng("mon", "sun")})` },
      { key: "regular", label: "Regular", kind: "num", w: 10, total: "sum", calc: (r) => `MIN(${r.t("total")},${r.S("otAfter")})` },
      { key: "ot", label: "Overtime", kind: "num", w: 10, total: "sum", calc: (r) => `MAX(${r.t("total")}-${r.S("otAfter")},0)` },
      { key: "rate", label: "Hourly rate", kind: "money" },
      { key: "pay", label: "Gross pay", kind: "money", total: "sum", calc: (r) => `${r.t("regular")}*${r.t("rate")}+${r.t("ot")}*${r.t("rate")}*${r.S("otMult")}` },
    ],
    tips: ["Type each person's hours under the day. Regular, overtime and pay are worked out from the rules at the top.", "Change the overtime hours or multiplier at the top to match your rules."],
    prefillLabel: "my crew",
    prefill: (dt) => dt.workers.map((w) => ({ name: w.name, role: w.customRole || w.role, rate: w.hourlyRate || 0 })),
  },
  {
    id: "crew-contacts", category: "crew", title: "Crew Contacts & Certifications", blurb: "Phone numbers, emergency contacts and tickets for the whole crew, with expiry dates that flag themselves.",
    tableName: "Crew", blank: 25, admin: true, landscape: true,
    cols: [
      { key: "name", label: "Name", kind: "text", w: 22 },
      { key: "role", label: "Role", kind: "text", w: 16 },
      { key: "phone", label: "Phone", kind: "text", w: 16 },
      { key: "email", label: "Email", kind: "text", w: 26 },
      { key: "emergency", label: "Emergency contact", kind: "text", w: 22 },
      { key: "emergencyPhone", label: "Emergency phone", kind: "text", w: 16 },
      { key: "cert", label: "Certification", kind: "text", w: 24 },
      { key: "expires", label: "Expires", kind: "date" },
      { key: "days", label: "Days left", kind: "int", calc: (r) => `IF(${r.t("expires")}="","",${r.t("expires")}-TODAY())`, value: (x) => (x.expires ? Math.floor((new Date(x.expires as Date).getTime() - Date.now()) / 86_400_000) : "") },
      {
        key: "status", label: "Status", kind: "text", w: 12,
        calc: (r) => `IF(${r.t("expires")}="","",IF(${r.t("expires")}<TODAY(),"Expired",IF(${r.t("expires")}-TODAY()<=30,"Expiring","Valid")))`,
        value: (x) => { if (!x.expires) return ""; const dd = Math.floor((new Date(x.expires as Date).getTime() - Date.now()) / 86_400_000); return dd < 0 ? "Expired" : dd <= 30 ? "Expiring" : "Valid"; },
      },
    ],
    status: { key: "status", tones: { Valid: "good", Expiring: "warn", Expired: "bad" } },
    tips: ["Add one row per certification. A person with three tickets gets three rows.", "Expiring shows within 30 days of the expiry date."],
    prefillLabel: "my crew",
    prefill: (dt) => dt.workers.flatMap((w) => {
      const base = { name: w.name, role: w.customRole || w.role, phone: w.phone, email: w.email };
      return w.certifications?.length ? w.certifications.map((c) => ({ ...base, cert: c.name, expires: d(c.expiryDate) })) : [base];
    }),
  },
  {
    id: "toolbox-signin", category: "crew", title: "Toolbox Talk Sign-in", blurb: "A sign-in sheet for the morning safety talk: topic, presenter and a line for each person's signature.",
    tableName: "SignIn", blank: 30, fields: ["Project", "Topic", "Presenter", "Date"],
    cols: [
      { key: "name", label: "Name", kind: "text", w: 28 },
      { key: "company", label: "Company", kind: "text", w: 26 },
      { key: "time", label: "Time", kind: "text", w: 10 },
      { key: "signature", label: "Signature", kind: "text", w: 36 },
    ],
    tips: ["Print it, or fill it in on a tablet. Each row is one person."],
  },
  // ───────────────────────────── Site ─────────────────────────────
  {
    id: "rfi-log", category: "site", title: "RFI Log", blurb: "Every request for information, who has it, how long it's been open and the answer when it comes.",
    tableName: "RFIs", blank: 25, landscape: true,
    cols: [
      { key: "number", label: "RFI #", kind: "text", w: 10 },
      { key: "subject", label: "Subject", kind: "text", w: 30 },
      { key: "project", label: "Project", kind: "text", w: 22 },
      { key: "from", label: "Asked by", kind: "text", w: 18 },
      { key: "to", label: "Assigned to", kind: "text", w: 18 },
      { key: "priority", label: "Priority", kind: "list", list: ["Routine", "Urgent", "Critical"] },
      { key: "sent", label: "Date sent", kind: "date" },
      { key: "needed", label: "Needed by", kind: "date" },
      { key: "status", label: "Status", kind: "list", list: ["Open", "Answered", "Closed"] },
      { key: "answered", label: "Date answered", kind: "date" },
      { key: "days", label: "Days open", kind: "int", calc: (r) => `IF(${r.t("sent")}="","",IF(${r.t("answered")}<>"",${r.t("answered")},TODAY())-${r.t("sent")})` },
      { key: "question", label: "Question", kind: "long", w: 40 },
      { key: "answer", label: "Answer", kind: "long", w: 40 },
    ],
    status: { key: "status", tones: { Open: "warn", Answered: "good", Closed: "info" } },
    prefillLabel: "my RFIs",
    prefill: (dt) => dt.rfis.map((x) => ({
      number: x.number, subject: x.subject, project: dt.projects.find((p) => p.id === x.projectId)?.name ?? "",
      from: dt.workers.find((w) => w.id === x.submittedById)?.name ?? "", to: dt.workers.find((w) => w.id === x.assignedToId)?.name ?? "",
      priority: cap(x.priority), sent: d(x.createdAt), needed: d(x.dueDate), status: cap(x.status), answered: null, question: x.question, answer: x.answer ?? "",
    })),
  },
  {
    id: "punch-list", category: "site", title: "Punch List", blurb: "Deficiencies to close out, by location and trade, with who's on it and when it's due.",
    tableName: "Punch", blank: 30, landscape: true, fields: ["Project"],
    cols: [
      { key: "no", label: "#", kind: "int", w: 6 },
      { key: "location", label: "Location", kind: "text", w: 20 },
      { key: "desc", label: "Description", kind: "long", w: 44 },
      { key: "project", label: "Project", kind: "text", w: 22 },
      { key: "trade", label: "Trade", kind: "text", w: 16 },
      { key: "assigned", label: "Assigned to", kind: "text", w: 18 },
      { key: "priority", label: "Priority", kind: "list", list: PRIORITY },
      { key: "status", label: "Status", kind: "list", list: ["Open", "In progress", "Resolved"] },
      { key: "due", label: "Due", kind: "date" },
      { key: "done", label: "Done on", kind: "date" },
    ],
    status: { key: "status", tones: { Open: "bad", "In progress": "warn", Resolved: "good" } },
    prefillLabel: "my punch list",
    prefill: (dt) => dt.punchItems.map((p, i) => ({ no: i + 1, location: p.location ?? "", desc: `${p.title}${p.description ? ` — ${p.description}` : ""}`, project: dt.projects.find((x) => x.id === p.projectId)?.name ?? "", trade: "", assigned: dt.workers.find((w) => w.id === p.assignedToId)?.name ?? "", priority: cap(p.priority), status: cap(p.status), due: d(p.dueDate), done: null })),
  },
  {
    id: "daily-report-log", category: "site", title: "Daily Report Log", blurb: "One row a day per job: weather, crew count, what got done and what got in the way.",
    tableName: "DailyLog", blank: 30, landscape: true,
    cols: [
      { key: "date", label: "Date", kind: "date" },
      { key: "project", label: "Project", kind: "text", w: 22 },
      { key: "weather", label: "Weather", kind: "text", w: 16 },
      { key: "crew", label: "Crew on site", kind: "int", w: 12, total: "sum" },
      { key: "work", label: "Work completed", kind: "long", w: 44 },
      { key: "delays", label: "Delays", kind: "long", w: 28 },
      { key: "materials", label: "Materials used", kind: "long", w: 28 },
      { key: "by", label: "Submitted by", kind: "text", w: 18 },
    ],
    prefillLabel: "my daily reports",
    prefill: (dt) => dt.dailyReports.map((r) => ({ date: d(r.date), project: dt.projects.find((p) => p.id === r.projectId)?.name ?? "", weather: r.weather, crew: r.crewCount, work: r.workCompleted, delays: r.delays, materials: r.materialsUsed, by: dt.workers.find((w) => w.id === r.submittedById)?.name ?? "" })),
  },
  {
    id: "safety-incident-log", category: "site", title: "Safety Incident Log", blurb: "Near misses, injuries and damage in one record, with severity, regulator reporting and the action taken.",
    tableName: "Incidents", blank: 20, landscape: true,
    cols: [
      { key: "date", label: "Date", kind: "date" },
      { key: "project", label: "Project", kind: "text", w: 22 },
      { key: "type", label: "Type", kind: "list", list: ["Near miss", "Injury", "Property damage", "Environmental"], w: 18 },
      { key: "severity", label: "Severity", kind: "list", list: ["Low", "Medium", "High", "Critical"] },
      { key: "desc", label: "What happened", kind: "long", w: 44 },
      { key: "injured", label: "Person involved", kind: "text", w: 18 },
      { key: "reported", label: "Reported to regulator", kind: "list", list: YESNO, w: 20 },
      { key: "action", label: "Action taken", kind: "long", w: 36 },
      { key: "by", label: "Reported by", kind: "text", w: 18 },
    ],
    status: { key: "severity", tones: { Low: "info", Medium: "warn", High: "bad", Critical: "bad" } },
    prefillLabel: "my safety incidents",
    prefill: (dt) => dt.safetyIncidents.map((s) => ({ date: d(s.date), project: dt.projects.find((p) => p.id === s.projectId)?.name ?? "", type: cap(s.type), severity: cap(s.severity), desc: s.description, injured: dt.workers.find((w) => w.id === s.injuredId)?.name ?? "", reported: s.reportedToOSHA ? "Yes" : "No", action: s.actionTaken, by: dt.workers.find((w) => w.id === s.reportedById)?.name ?? "" })),
  },
  {
    id: "equipment-log", category: "site", title: "Equipment Log", blurb: "Every machine and tool: where it is, when it was last serviced and when service is next due.",
    tableName: "Equipment", blank: 25, landscape: true,
    cols: [
      { key: "name", label: "Equipment", kind: "text", w: 26 },
      { key: "type", label: "Type", kind: "text", w: 16 },
      { key: "status", label: "Status", kind: "list", list: ["Available", "In use", "Maintenance", "Off site"] },
      { key: "project", label: "Project", kind: "text", w: 22 },
      { key: "last", label: "Last service", kind: "date" },
      { key: "next", label: "Next service", kind: "date" },
      { key: "days", label: "Days to service", kind: "int", w: 14, calc: (r) => `IF(${r.t("next")}="","",${r.t("next")}-TODAY())`, value: (x) => (x.next ? Math.floor((new Date(x.next as Date).getTime() - Date.now()) / 86_400_000) : "") },
      { key: "cert", label: "Certification expires", kind: "date", w: 18 },
      { key: "rate", label: "Daily rate", kind: "money" },
      { key: "notes", label: "Operator / notes", kind: "text", w: 24 },
    ],
    status: { key: "status", tones: { Available: "good", "In use": "info", Maintenance: "warn", "Off site": "info" } },
    prefillLabel: "my equipment",
    prefill: (dt) => dt.equipment.map((e) => ({ name: e.name, type: e.type, status: cap(e.status), project: dt.projects.find((p) => p.id === e.projectId)?.name ?? "", last: d(e.lastService), next: d(e.nextService), cert: d(e.certExpiry), rate: e.dailyRate })),
  },
  {
    id: "material-orders", category: "site", title: "Material Order Tracker", blurb: "What you've ordered, from whom, what it costs and whether it has arrived.",
    tableName: "Orders", blank: 30, landscape: true,
    cols: [
      { key: "item", label: "Item", kind: "text", w: 28 },
      { key: "supplier", label: "Supplier", kind: "text", w: 22 },
      { key: "project", label: "Project", kind: "text", w: 22 },
      { key: "qty", label: "Qty", kind: "num" },
      { key: "unit", label: "Unit", kind: "list", list: UNITS, w: 9 },
      { key: "cost", label: "Unit cost", kind: "money" },
      { key: "total", label: "Total", kind: "money", total: "sum", calc: (r) => `${r.t("qty")}*${r.t("cost")}` },
      { key: "ordered", label: "Ordered", kind: "date" },
      { key: "expected", label: "Expected", kind: "date" },
      { key: "received", label: "Received", kind: "date" },
      { key: "status", label: "Status", kind: "list", list: ["Ordered", "Shipped", "Delivered", "Backordered", "Cancelled"] },
    ],
    status: { key: "status", tones: { Ordered: "info", Shipped: "warn", Delivered: "good", Backordered: "bad", Cancelled: "info" } },
    prefillLabel: "my material deliveries",
    prefill: (dt) => dt.materialEntries.filter((m) => m.type === "delivery").map((m) => ({ item: m.materialName, supplier: "", project: dt.projects.find((p) => p.id === m.projectId)?.name ?? "", qty: m.quantity, unit: m.unit, cost: 0, ordered: null, expected: null, received: d(m.date), status: "Delivered" })),
  },
  {
    id: "inspection-checklist", category: "site", title: "Inspection Checklist", blurb: "A walk-through checklist with pass, fail or N/A per item, notes and a fixed-on date.",
    tableName: "Inspection", blank: 30, fields: ["Project", "Area", "Inspector", "Date"],
    cols: [
      { key: "no", label: "#", kind: "int", w: 6 },
      { key: "item", label: "Item to check", kind: "long", w: 46 },
      { key: "result", label: "Result", kind: "list", list: ["Pass", "Fail", "N/A"], w: 10 },
      { key: "notes", label: "Notes", kind: "long", w: 38 },
      { key: "fixed", label: "Fixed on", kind: "date" },
      { key: "signoff", label: "Sign-off", kind: "text", w: 18 },
    ],
    status: { key: "result", tones: { Pass: "good", Fail: "bad", "N/A": "info" } },
  },
  {
    id: "submittal-log", category: "site", title: "Submittal Log", blurb: "Shop drawings, product data and samples going out for review, and where each one stands.",
    tableName: "Submittals", blank: 25, landscape: true,
    cols: [
      { key: "no", label: "#", kind: "text", w: 8 },
      { key: "spec", label: "Spec section", kind: "text", w: 14 },
      { key: "desc", label: "Description", kind: "long", w: 40 },
      { key: "project", label: "Project", kind: "text", w: 22 },
      { key: "submitted", label: "Submitted", kind: "date" },
      { key: "required", label: "Required by", kind: "date" },
      { key: "reviewer", label: "Reviewer", kind: "text", w: 20 },
      { key: "status", label: "Status", kind: "list", list: ["Draft", "Submitted", "Approved", "Approved as noted", "Rejected", "Resubmit"], w: 18 },
      { key: "returned", label: "Returned", kind: "date" },
    ],
    status: { key: "status", tones: { Draft: "info", Submitted: "warn", Approved: "good", "Approved as noted": "good", Rejected: "bad", Resubmit: "bad" } },
  },
  // ───────────────────────────── Plans ─────────────────────────────
  {
    id: "project-schedule", category: "plans", title: "Project Schedule", blurb: "Tasks with start dates and durations, and a bar chart that draws itself across the weeks.",
    tableName: "Schedule", blank: 25, landscape: true, fields: ["Project"],
    cols: [
      { key: "task", label: "Task", kind: "text", w: 30 },
      { key: "owner", label: "Owner", kind: "text", w: 16 },
      { key: "start", label: "Start", kind: "date", w: 13 },
      { key: "days", label: "Days", kind: "int", w: 8 },
      { key: "end", label: "End", kind: "date", w: 13, calc: (r) => `IF(${r.t("start")}="","",${r.t("start")}+${r.t("days")}-1)` },
      { key: "done", label: "% done", kind: "pct", w: 9 },
      { key: "status", label: "Status", kind: "list", list: ["Not started", "In progress", "Completed", "Delayed"], w: 13 },
    ],
    gantt: { startKey: "start", endKey: "end", weeks: 26 },
    status: { key: "status", tones: { "Not started": "info", "In progress": "warn", Completed: "good", Delayed: "bad" } },
    tips: ["Enter a start date and the number of days. End and the yellow bars on the right fill in.", "The bars start from your earliest task and show 26 weeks."],
  },
  {
    id: "task-list", category: "plans", title: "Task List", blurb: "A simple to-do list for the job: who has what, how urgent it is and when it's due.",
    tableName: "Tasks", blank: 30,
    cols: [
      { key: "task", label: "Task", kind: "text", w: 34 },
      { key: "project", label: "Project", kind: "text", w: 22 },
      { key: "assigned", label: "Assigned to", kind: "text", w: 18 },
      { key: "priority", label: "Priority", kind: "list", list: PRIORITY },
      { key: "due", label: "Due", kind: "date" },
      { key: "status", label: "Status", kind: "list", list: ["Not started", "In progress", "Completed", "Delayed"], w: 14 },
      { key: "progress", label: "Progress", kind: "pct" },
      { key: "notes", label: "Notes", kind: "long", w: 34 },
    ],
    status: { key: "status", tones: { "Not started": "info", "In progress": "warn", Completed: "good", Delayed: "bad" } },
    prefillLabel: "my project tasks",
    prefill: (dt) => dt.projects.flatMap((p) => p.tasks.map((t) => ({ task: t.name, project: p.name, assigned: dt.workers.find((w) => w.id === t.workerId)?.name ?? "", priority: "", due: d(t.endDate), status: cap(t.status), progress: (t.progress ?? 0) / 100, notes: "" }))),
  },
  {
    id: "insurance-licence", category: "plans", title: "Insurance & Licence Tracker", blurb: "Policies and licences with their expiry dates, counting down the days and flagging what's about to lapse.",
    tableName: "Policies", blank: 20, admin: true, landscape: true,
    cols: [
      { key: "holder", label: "Holder", kind: "text", w: 24 },
      { key: "type", label: "Coverage or licence", kind: "text", w: 24 },
      { key: "insurer", label: "Insurer or issuer", kind: "text", w: 22 },
      { key: "policy", label: "Policy #", kind: "text", w: 16 },
      { key: "amount", label: "Coverage amount", kind: "money" },
      { key: "start", label: "Start", kind: "date" },
      { key: "expires", label: "Expires", kind: "date" },
      { key: "days", label: "Days left", kind: "int", calc: (r) => `IF(${r.t("expires")}="","",${r.t("expires")}-TODAY())`, value: (x) => (x.expires ? Math.floor((new Date(x.expires as Date).getTime() - Date.now()) / 86_400_000) : "") },
      {
        key: "status", label: "Status", kind: "text", w: 12,
        calc: (r) => `IF(${r.t("expires")}="","",IF(${r.t("expires")}<TODAY(),"Expired",IF(${r.t("expires")}-TODAY()<=30,"Expiring","Active")))`,
        value: (x) => { if (!x.expires) return ""; const dd = Math.floor((new Date(x.expires as Date).getTime() - Date.now()) / 86_400_000); return dd < 0 ? "Expired" : dd <= 30 ? "Expiring" : "Active"; },
      },
    ],
    status: { key: "status", tones: { Active: "good", Expiring: "warn", Expired: "bad" } },
    prefillLabel: "my insurance policies",
    prefill: (dt) => dt.insurancePolicies.map((p) => ({ holder: p.holderName, type: COVERAGE_TYPE_LABELS[p.coverageType] ?? p.coverageType, insurer: p.insurer, policy: p.policyNumber, amount: p.coverageAmount, start: d(p.issueDate), expires: d(p.expiryDate) })),
  },
];

export const templateById = (id: string) => TEMPLATES.find((t) => t.id === id);
export type TplCol = Template["cols"][number];
export type Rec2 = Record<string, string | number | Date | null | undefined>;

/** A calculated cell stays blank until its row has something in it (shared by the Excel file and the screen) */
export function wrapBlankFormula(tableName: string, raw: string): string {
  if (/^IF\(/.test(raw)) return raw;
  const conds: string[] = [];
  const seen = new Set<string>();
  for (const m of raw.matchAll(/\[\[#This Row\],\[([^\]]+)\]\]/g)) if (!seen.has(m[0])) { seen.add(m[0]); conds.push(`${tableName}${m[0]}=""`); }
  for (const m of raw.matchAll(/\[\[#This Row\],\[[^\]]+\]:\[[^\]]+\]\]/g)) conds.push(`COUNT(${tableName}${m[0]})=0`);
  return conds.length ? `IF(AND(${conds.join(",")}),"",${raw})` : raw;
}

/** The same formulas, pointed at the on-screen settings instead of spreadsheet cells */
export function screenRef(tpl: Template): Ref {
  const label = (key: string) => tpl.cols.find((c) => c.key === key)!.label;
  return {
    t: (key) => `${tpl.tableName}[[#This Row],[${label(key)}]]`,
    S: (key) => `SETTING_${key}`,
    sum: (key) => `SUBTOTAL(109,${tpl.tableName}[${label(key)}])`,
    rng: (a, b) => `${tpl.tableName}[[#This Row],[${label(a)}]:[${label(b)}]]`,
  };
}


// ──────────────────────────── Building the workbook ────────────────────────────

const TONES: Record<Tone, { fill: string; color: string }> = {
  good: { fill: "#DCEFE3", color: "#1E7A45" },
  warn: { fill: "#FFF1C2", color: "#7A5C00" },
  bad: { fill: "#FDE4DF", color: "#B9382C" },
  info: { fill: "#E4ECF5", color: "#2F4A6B" },
};
const defaultW: Record<Kind, number> = { text: 22, long: 38, money: 15, num: 11, int: 9, pct: 11, date: 14, list: 16 };

function currencySymbol(currency: string) {
  try {
    const parts = new Intl.NumberFormat(currency === "CAD" ? "en-CA" : "en-US", { style: "currency", currency: currency || "CAD" }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? "$";
  } catch { return "$"; }
}

export type BuildOptions = {
  company: string; logo?: string; currency: string; project?: string; preparedBy?: string;
  /** Rows to start from; omit for a blank sheet */
  data?: TemplateData;
  /** Rows typed on screen (these win over `data`) */
  rows?: Rec2[];
  /** Typed values for the header inputs (dates as yyyy-mm-dd) */
  fieldValues?: Record<string, string>;
  settingValues?: Record<string, number>;
  /** Values for calculated columns, to show before Excel recalculates */
  cached?: Record<string, (string | number | null)[]>;
  resultValues?: number[];
};

export async function buildTemplateXlsx(tpl: Template, opts: BuildOptions): Promise<Blob> {
  const book = new Book();
  const sym = currencySymbol(opts.currency);
  const fmt: Record<Kind, string | undefined> = {
    text: undefined, long: undefined, list: undefined,
    money: `"${sym}"#,##0.00;[Red]-"${sym}"#,##0.00`, num: "#,##0.00", int: "#,##0", pct: "0.0%", date: "mmm d, yyyy",
  };
  const INK = "#151617", INK2 = "#4B4D50", HV = "#F5C400", RULE = "#E4E1DB";
  const cellStyle = (k: Kind, bold = false): number => book.style({
    size: 11, color: INK2, bold, numFmt: fmt[k], bottom: { style: "thin", color: RULE },
    align: k === "money" || k === "num" || k === "int" || k === "pct" ? "right" : "left", wrap: k === "long", valign: k === "long" ? "top" : "center",
  });
  const S = {
    company: book.style({ bold: true, size: 20, color: INK }),
    title: book.style({ size: 13, color: "#77797C" }),
    note: book.style({ italic: true, size: 10, color: "#77797C" }),
    label: book.style({ bold: true, size: 11, color: INK2 }),
    input: book.style({ size: 11, color: INK, fill: "#FFF8D6", bottom: { style: "thin", color: INK } }),
    inputDate: book.style({ size: 11, color: INK, fill: "#FFF8D6", bottom: { style: "thin", color: INK }, numFmt: "mmm d, yyyy", align: "left" }),
    head: book.style({ bold: true, size: 10, color: "#FFFFFF", fill: INK, wrap: true, valign: "center", bottom: { style: "medium", color: HV }, align: "left", indent: 1 }),
    headRight: book.style({ bold: true, size: 10, color: "#FFFFFF", fill: INK, wrap: true, valign: "center", bottom: { style: "medium", color: HV }, align: "right", indent: 1 }),
    totalLabel: book.style({ bold: true, size: 11, color: INK, fill: "#F5F4F1", top: { style: "medium", color: INK } }),
  };
  const totalStyle = (k: Kind) => book.style({ bold: true, size: 11, color: INK, fill: "#F5F4F1", top: { style: "medium", color: INK }, numFmt: fmt[k], align: k === "text" ? "left" : "right" });

  const prefilled: Rec[] = opts.rows ?? (opts.data && tpl.prefill ? tpl.prefill(opts.data) : []);
  const dataRows = prefilled.length ? prefilled.length + (opts.rows ? 5 : 10) : tpl.blank;
  const cols = tpl.cols;
  const T = tpl.tableName;
  const calcOf = (c: Col, r: Ref): string => wrapBlankFormula(T, c.calc!(r));
  const hasTotals = cols.some((c) => c.total);
  const widths = cols.map((c) => c.w ?? defaultW[c.kind]);

  // ── The top of the sheet: logo, name, title, inputs ──
  const rows: Row[] = [];
  const merges: string[] = [];
  rows.push({ cells: [], height: 54 }, { cells: [], height: 6 });
  rows.push({ cells: [{ s: opts.company || "Your company", st: S.company }], height: 28 });
  rows.push({ cells: [{ s: tpl.title, st: S.title }], height: 20 });
  rows.push({ cells: [{ s: "Yellow cells are yours to fill in. Add rows by typing under the last one; formulas and formatting carry on by themselves.", st: S.note }] });
  rows.push({ cells: [] });

  const refCell = new Map<string, string>(); // setting key → absolute cell
  const addInput = (label: string, cell: Cell) => {
    const r = rows.length + 1;
    rows.push({ cells: [{ s: label, st: S.label }, cell, { s: "", st: S.input }], height: 20 });
    merges.push(`B${r}:C${r}`);
    return r;
  };
  for (const f of tpl.fields ?? []) {
    const given = opts.fieldValues?.[f];
    if (/date|week starting/i.test(f)) addInput(f, { n: (given ? isoToSerial(given) : null) ?? serialDay(new Date()), st: S.inputDate });
    else addInput(f, { s: given ?? (f === "Project" ? opts.project ?? "" : f === "Prepared by" ? opts.preparedBy ?? "" : ""), st: S.input });
  }
  for (const s of tpl.settings ?? []) {
    const r = addInput(s.label, { n: opts.settingValues?.[s.key] ?? s.value, st: book.style({ size: 11, color: INK, fill: "#FFF8D6", bottom: { style: "thin", color: INK }, numFmt: s.kind === "pct" ? "0.0%" : s.kind === "money" ? fmt.money : "#,##0.00", align: "left" }) });
    refCell.set(s.key, `$B$${r}`);
  }

  // The table's header row comes after a gap (and after the results, if any)
  const resultCells: string[] = [];
  const colRef = (key: string) => cols.find((c) => c.key === key)!.label;
  const ref: Ref = {
    t: (key) => `${tpl.tableName}[[#This Row],[${colRef(key)}]]`,
    S: (key) => refCell.get(key) ?? "0",
    sum: (key) => `SUBTOTAL(109,${tpl.tableName}[${colRef(key)}])`,
    rng: (a, b) => `${tpl.tableName}[[#This Row],[${colRef(a)}]:[${colRef(b)}]]`,
  };
  if (tpl.results?.length) {
    tpl.results.forEach((res, ri) => {
      const r = rows.length + 1;
      const f = res.formula(ref, resultCells);
      resultCells.push(`$B$${r}`);
      const st = book.style({ bold: true, size: res.big ? 14 : 11, color: INK, numFmt: res.kind === "money" ? fmt.money : "#,##0.00", align: "left", top: res.big ? { style: "medium", color: INK } : undefined, fill: res.big ? "#FFF1C2" : undefined });
      const lab = book.style({ bold: true, size: res.big ? 14 : 11, color: INK2, top: res.big ? { style: "medium", color: INK } : undefined, fill: res.big ? "#FFF1C2" : undefined });
      rows.push({ cells: [{ s: res.label, st: lab }, { f, v: opts.resultValues?.[ri] ?? 0, st }, { s: "", st: res.big ? lab : 0 }], height: res.big ? 26 : 20 });
    });
  }
  rows.push({ cells: [] });

  const headRow = rows.length + 1;
  const ganttStart = cols.length + 1; // one blank column, then the weeks
  const headCells: Cell[] = cols.map((c) => ({ s: c.label, st: c.kind === "money" || c.kind === "num" || c.kind === "int" || c.kind === "pct" ? S.headRight : S.head }));
  const ganttHead = book.style({ bold: true, size: 9, color: "#FFFFFF", fill: INK, numFmt: "d mmm", align: "center", bottom: { style: "medium", color: HV } });
  if (tpl.gantt) {
    headCells.push(null);
    for (let w = 0; w < tpl.gantt.weeks; w++) {
      headCells.push(w === 0
        ? { f: `IF(COUNT(${tpl.tableName}[${colRef(tpl.gantt.startKey)}])=0,TODAY()-WEEKDAY(TODAY(),2)+1,MIN(${tpl.tableName}[${colRef(tpl.gantt.startKey)}])-WEEKDAY(MIN(${tpl.tableName}[${colRef(tpl.gantt.startKey)}]),2)+1)`, v: 0, st: ganttHead }
        : { f: `${colName(ganttStart + w)}${headRow}+7`, v: 0, st: ganttHead });
    }
  }
  rows.push({ cells: headCells, height: 30 });

  // ── Data rows ──
  const calcCache: number[] = cols.map(() => 0);
  const body: Row[] = [];
  for (let i = 0; i < dataRows; i++) {
    const rec: Rec | undefined = prefilled[i];
    body.push({
      cells: cols.map((c, ci): Cell => {
        const st = cellStyle(c.kind);
        if (c.calc) {
          const cache = opts.cached?.[c.key];
          const v: string | number = cache ? (cache[i] ?? "") : rec && c.value ? c.value(rec) : rec ? 0 : "";
          if (rec && typeof v === "number") calcCache[ci] += v;
          return { f: calcOf(c, ref), v, st };
        }
        const raw = rec?.[c.key];
        if (raw === undefined || raw === null || raw === "") return { s: "", st };
        if (c.kind === "date") return raw instanceof Date ? { n: serialDay(raw), st } : { s: "", st };
        if (c.kind === "money" || c.kind === "num" || c.kind === "int" || c.kind === "pct") {
          const n = Number(raw);
          if (Number.isFinite(n)) { calcCache[ci] += n; return { n, st }; }
          return { s: "", st };
        }
        return { s: String(raw), st };
      }),
    });
  }
  rows.push(...body);

  // The gantt grid cells just need a style so the bars show against a light grid
  if (tpl.gantt) {
    const grid = book.style({ bottom: { style: "thin", color: "#EFEDE8" }, left: { style: "thin", color: "#EFEDE8" } });
    for (let i = 0; i < dataRows; i++) {
      const r = rows[headRow + i];
      for (let w = 0; w < tpl.gantt.weeks; w++) r.cells[ganttStart + w] = { s: "", st: grid };
    }
  }

  if (hasTotals) {
    rows.push({
      cells: cols.map((c, ci): Cell => {
        if (ci === 0) return { s: "Total", st: S.totalLabel };
        if (!c.total) return { s: "", st: S.totalLabel };
        const fnum = c.total === "sum" ? 109 : c.total === "count" ? 103 : 101;
        return { f: `SUBTOTAL(${fnum},${tpl.tableName}[${c.label}])`, v: calcCache[ci], st: totalStyle(c.kind) };
      }),
      height: 24,
    });
  }

  // ── Dropdowns, status colours ──
  const last = headRow + dataRows + 300; // new rows inherit these
  const validations: Validation[] = [];
  const cfs: Cf[] = [];
  cols.forEach((c, ci) => {
    const L = colName(ci);
    if (c.kind === "list" && c.list) validations.push({ sqref: `${L}${headRow + 1}:${L}${last}`, type: "list", list: c.list });
    if (c.kind === "money" || c.kind === "num" || c.kind === "int") if (!c.calc) validations.push({ sqref: `${L}${headRow + 1}:${L}${last}`, type: "decimal", min: -1e12 });
  });
  if (tpl.status) {
    const ci = cols.findIndex((c) => c.key === tpl.status!.key);
    const L = colName(ci);
    cfs.push({ sqref: `${L}${headRow + 1}:${L}${last}`, rules: Object.entries(tpl.status.tones).map(([val, tone]) => ({ kind: "equal" as const, value: `"${val}"`, dxf: book.dxf({ fill: TONES[tone].fill, color: TONES[tone].color, bold: true }) })) });
  }
  if (tpl.gantt) {
    const si = colName(cols.findIndex((c) => c.key === tpl.gantt!.startKey)), ei = colName(cols.findIndex((c) => c.key === tpl.gantt!.endKey));
    const G0 = colName(ganttStart), G1 = colName(ganttStart + tpl.gantt.weeks - 1), f = headRow + 1;
    cfs.push({ sqref: `${G0}${f}:${G1}${last}`, rules: [{ kind: "expr", formula: `AND($${si}${f}<>"",${G0}$${headRow}<=$${ei}${f},${G0}$${headRow}+6>=$${si}${f})`, dxf: book.dxf({ fill: HV }) }] });
  }

  cfs.push({ sqref: `A${headRow + 1}:${colName(cols.length - 1)}${last}`, rules: [{ kind: "expr", formula: "MOD(ROW(),2)=0", dxf: book.dxf({ fill: "#F7F6F3" }) }] });
  const widthsAll = tpl.gantt ? [...widths, 2, ...Array(tpl.gantt.weeks).fill(6.5)] : widths;
  const sheet: SheetDef = {
    name: tpl.title.replace(/[\\/?*[\]:]/g, "").slice(0, 31), rows, widths: widthsAll, merges, freezeRow: headRow <= 12 ? headRow : undefined, logoRows: 2,
    tables: [{
      name: tpl.tableName, headRow, firstCol: 0, rows: dataRows, totals: hasTotals,
      columns: cols.map((c, ci) => ({
        name: c.label, calc: c.calc ? calcOf(c, ref) : undefined,
        total: hasTotals ? (ci === 0 ? "label" as const : c.total) : undefined, totalLabel: "Total",
      })),
    }],
    validations, cfs, landscape: !!tpl.landscape, printTitleRow: headRow, tabColor: HV,
  };
  book.sheets.push(sheet);

  // ── A guide sheet ──
  const gs = { h: book.style({ bold: true, size: 16, color: INK }), b: book.style({ size: 11, color: INK2, wrap: true, valign: "top" }), k: book.style({ bold: true, size: 11, color: INK, valign: "top" }) };
  const tips = [
    ["What it is", tpl.blurb],
    ["Filling it in", "Type into the rows under the dark header. Cells with a drop-down arrow offer a list; you can still type your own value."],
    ["Adding rows", "Click in the last row and press Tab, or just type in the row underneath. The formulas, drop-downs and formatting carry down by themselves."],
    ["Totals", hasTotals ? "The bottom row totals each column and follows any filter you apply with the arrows in the header." : "This sheet has no totals row."],
    ["Making it yours", "Rename columns, change the drop-down lists (Data > Data Validation), add columns, or change the numbers at the top. It is a normal Excel file."],
    ...(tpl.tips ?? []).map((t, i) => [i === 0 ? "Good to know" : "", t]),
  ];
  book.sheets.push({
    name: "Guide",
    rows: [
      { cells: [], height: 54 }, { cells: [], height: 6 },
      { cells: [{ s: tpl.title, st: gs.h }], height: 26 },
      { cells: [] },
      ...tips.map(([k, v]) => ({ cells: [{ s: k, st: gs.k }, { s: v, st: gs.b }] as Cell[], height: Math.max(20, Math.ceil(v.length / 78) * 17) })),
    ],
    widths: [20, 90], logoRows: 2, tabColor: INK,
  });

  return book.build({ company: opts.company || "Your company", logo: opts.logo });
}

export function templateFileName(company: string, tpl: Template) {
  const clean = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
  return `${clean(company || "Constra") || "Constra"}-${clean(tpl.title)}.xlsx`;
}
