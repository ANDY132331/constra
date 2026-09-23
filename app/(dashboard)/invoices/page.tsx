"use client";
import { toast } from "sonner";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAdminOrAbove } from "@/lib/permissions";
import {
  Plus, Search, Send, CheckCircle2, AlertTriangle, Lock,
  Trash2, X, FileText, ChevronRight, Download,
  Mail, Pencil, Link2, Check, Copy,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency";
import type { Invoice } from "@/lib/mock-data";
import { exportInvoicePdf } from "@/lib/pdf-export";
import { ConfirmModal } from "@/components/confirm-modal";
import { EmptyState } from "@/components/empty-state";
import { CustomSelect } from "@/components/ui/custom-select";
import { TemplatePicker, useTemplateChoice } from "@/components/pdf-template-picker";

const STATUS_CONFIG = {
  draft:   { label: "Draft",   bg: "bg-zinc-700/60",       text: "text-zinc-300",   dot: "bg-zinc-400",   bar: "bg-zinc-600" },
  sent:    { label: "Sent",    bg: "bg-blue-500/15",       text: "text-blue-400",   dot: "bg-blue-400",   bar: "bg-blue-500" },
  paid:    { label: "Paid",    bg: "bg-emerald-500/15",    text: "text-emerald-400",dot: "bg-emerald-400",bar: "bg-emerald-500" },
  overdue: { label: "Overdue", bg: "bg-red-500/15",        text: "text-red-400",    dot: "bg-red-500",    bar: "bg-red-500" },
};

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

type LineItem = { description: string; qty: string; rate: string };
type InvForm = {
  clientName: string; clientEmail: string; clientAddress: string;
  status: "draft" | "sent" | "paid" | "overdue";
  issueDate: string; dueDate: string;
  taxRate: string; notes: string;
  items: LineItem[];
};

const blankItem = (): LineItem => ({ description: "", qty: "1", rate: "" });
const blank: InvForm = {
  clientName: "", clientEmail: "", clientAddress: "",
  status: "draft", issueDate: "", dueDate: "",
  taxRate: "13", notes: "", items: [blankItem()],
};

function invoiceTotal(inv: Invoice) {
  const sub = inv.items.reduce((s, i) => s + i.qty * i.rate, 0);
  return sub * (1 + inv.taxRate / 100);
}

// â"€â"€ Paper style helper â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
import type { InvoiceTemplate } from "@/lib/pdf-export";
function invoicePaperStyles(t: InvoiceTemplate, isPaid: boolean) {
  if (t === "modern") return {
    headerBg:          "bg-[#1c2026]",
    headerBorder:      "border-[#2a2e38]",
    accentStrip:       true,
    companyNameColor:  "text-white",
    companyAddrColor:  "text-white/40",
    invoiceTitleColor: "text-amber-400",
    invoiceNumColor:   "text-white/35",
    balanceLabelColor: "text-white/40",
    balanceAmtColor:   "text-white",
    tableHeadBg:       "bg-[#1c2026]",
    tableHeadText:     "text-white/80",
    altRowBg:          "bg-gray-50",
    balanceBg:         isPaid ? "bg-emerald-500" : "bg-amber-500",
    footerBg:          "bg-[#1c2026]",
    footerText:        "text-white/60",
    clientNameColor:   "text-amber-400",
  } as const;
  if (t === "minimal") return {
    headerBg:          "bg-white",
    headerBorder:      "border-gray-200",
    accentStrip:       false,
    companyNameColor:  "text-gray-700",
    companyAddrColor:  "text-gray-400",
    invoiceTitleColor: "text-gray-300",
    invoiceNumColor:   "text-gray-400",
    balanceLabelColor: "text-gray-400",
    balanceAmtColor:   "text-gray-800",
    tableHeadBg:       "bg-gray-50",
    tableHeadText:     "text-gray-500",
    altRowBg:          "",
    balanceBg:         isPaid ? "bg-emerald-500" : "bg-gray-800",
    footerBg:          "bg-gray-100",
    footerText:        "text-gray-400",
    clientNameColor:   "text-gray-700",
  } as const;
  return {
    headerBg:          "bg-white",
    headerBorder:      "border-gray-100",
    accentStrip:       false,
    companyNameColor:  "text-amber-600",
    companyAddrColor:  "text-gray-400",
    invoiceTitleColor: "text-gray-800",
    invoiceNumColor:   "text-gray-400",
    balanceLabelColor: "text-gray-400",
    balanceAmtColor:   "text-gray-900",
    tableHeadBg:       "bg-amber-500",
    tableHeadText:     "text-white",
    altRowBg:          "bg-gray-50",
    balanceBg:         isPaid ? "bg-emerald-500" : "bg-amber-500",
    footerBg:          "bg-amber-500",
    footerText:        "text-white/80",
    clientNameColor:   "text-amber-600",
  } as const;
}

// ── Inline-edit helpers (outside component to avoid TS issues) ───────────────
type DraftItem = { description: string; qty: string; rate: string };
type InvoiceDraft = {
  clientName: string; clientEmail: string; clientAddress: string;
  issueDate: string; dueDate: string; taxRate: string; notes: string;
  items: DraftItem[];
};
function toDraft(inv: Invoice): InvoiceDraft {
  const toDateStr = (d: Date | string) =>
    (d instanceof Date ? d : new Date(d)).toISOString().split("T")[0];
  return {
    clientName: inv.clientName ?? "",
    clientEmail: inv.clientEmail ?? "",
    clientAddress: inv.clientAddress ?? "",
    issueDate: toDateStr(inv.issueDate),
    dueDate: toDateStr(inv.dueDate),
    taxRate: String(inv.taxRate ?? 0),
    notes: inv.notes ?? "",
    items: (inv.items ?? []).map((i) => ({
      description: i.description ?? "",
      qty: String(i.qty ?? 1),
      rate: String(i.rate ?? 0),
    })),
  };
}

function InvoiceDetail({
  invoice, currency, companyName, companyAddress, companyLogo,
  onUpdate, onDelete, onEdit, onDuplicate, onClose,
}: {
  invoice: Invoice;
  currency: string;
  companyName: string;
  companyAddress: string;
  companyLogo: string;
  onUpdate: (id: string, u: Partial<Invoice>) => void;
  onDelete: (id: string) => void;
  onEdit: (invoice: Invoice) => void;
  onDuplicate: (invoice: Invoice) => void;
  onClose: () => void;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [template, setTemplate] = useTemplateChoice("constra_invoice_template");

  // ── Inline editing state ────────────────────────────────────────────────────
  const [draft, setDraft] = useState<InvoiceDraft>(() => toDraft(invoice));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setDraft(toDraft(invoice)); }, [invoice.id]);
  const isDirty = JSON.stringify(draft) !== JSON.stringify(toDraft(invoice));
  const updItem = (idx: number, field: keyof DraftItem, val: string) =>
    setDraft((d) => ({ ...d, items: d.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }));
  const addDraftItem = () => setDraft((d) => ({ ...d, items: [...d.items, { description: "", qty: "1", rate: "" }] }));
  const removeDraftItem = (idx: number) => setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
  const handleSaveDraft = () => {
    if (!draft.clientName.trim()) { toast.error("Client name is required"); return; }
    const items = draft.items
      .filter((i) => i.description.trim())
      .map((i) => ({ description: i.description.trim(), qty: parseFloat(i.qty) || 1, rate: parseFloat(i.rate) || 0 }));
    if (items.length === 0) { toast.error("Add at least one line item"); return; }
    const taxRate = parseFloat(draft.taxRate) || 0;
    onUpdate(invoice.id, {
      clientName: draft.clientName.trim(),
      clientEmail: draft.clientEmail.trim(),
      clientAddress: draft.clientAddress.trim() || undefined,
      issueDate: draft.issueDate ? new Date(draft.issueDate) : invoice.issueDate,
      dueDate: draft.dueDate ? new Date(draft.dueDate) : invoice.dueDate,
      items,
      taxRate,
      notes: draft.notes.trim() || undefined,
    });
    // Normalize draft to match what the store will return so isDirty → false immediately
    setDraft({
      clientName: draft.clientName.trim(),
      clientEmail: draft.clientEmail.trim(),
      clientAddress: draft.clientAddress.trim(),
      issueDate: draft.issueDate,
      dueDate: draft.dueDate,
      taxRate: String(taxRate),
      notes: draft.notes.trim(),
      items: items.map((i) => ({ description: i.description, qty: String(i.qty), rate: String(i.rate) })),
    });
    toast.success("Invoice saved");
  };
  // Shared editable cell style — borderless until hover/focus
  const ec = (extra = "") => `bg-transparent border-b border-gray-300 hover:border-gray-500 focus:border-amber-500 focus:bg-amber-500/[0.03] outline-none transition-colors placeholder:text-gray-300 cursor-text rounded-sm ${extra}`;

  function copyPaymentLink() {
    const url = `${window.location.origin}/pay/${invoice.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
      toast.success("Payment link copied");
    }).catch(() => toast.error("Could not copy link"));
  }

  useEffect(() => {
    if (!sendStatus) return;
    const t = setTimeout(() => setSendStatus(null), 4000);
    return () => clearTimeout(t);
  }, [sendStatus]);
  // Live totals computed from draft so they update as you type
  const sub   = draft.items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0);
  const taxPct = parseFloat(draft.taxRate) || 0;
  const tax   = sub * (taxPct / 100);
  const total = sub + tax;
  const cfg       = STATUS_CONFIG[invoice.status];
  const isOverdue = invoice.status === "overdue";
  const isPaid    = invoice.status === "paid";
  const ps        = invoicePaperStyles(template, isPaid);

  return (
    <div className="flex flex-col h-full">
      {/* â"€â"€ Toolbar â"€â"€ */}
      <div className="flex items-center justify-between px-5 pb-3 border-b border-white/[0.06] flex-shrink-0 bg-[#0d0d0d]" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
        <div className="flex items-center gap-2.5">
          <button onClick={onClose} aria-label="Back to invoices" className="w-10 h-10 flex items-center justify-center rounded-full text-white/30 hover:text-white/60 active:bg-white/[0.05] transition-colors -ml-1">
            <ChevronRight size={16} className="rotate-180" />
          </button>
          <span className="font-mono text-[12px] text-white/35 tracking-wider">{invoice.number}</span>
          <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {sendStatus && (
            <span className={`hidden sm:inline text-[11px] font-semibold mr-1 ${sendStatus.ok ? "text-emerald-400" : "text-red-400"}`}>
              {sendStatus.msg}
            </span>
          )}
          <button
            disabled={sendLoading || !invoice.clientEmail}
            title={!invoice.clientEmail ? "Add a client email to send" : "Send invoice by email"}
            onClick={async () => {
              if (!invoice.clientEmail) { toast.error("Add a client email address to this invoice first"); return; }
              setSendLoading(true);
              try {
                const t = invoice.items.reduce((s, i) => s + i.qty * i.rate, 0) * (1 + invoice.taxRate / 100);
                const amountStr = formatCurrency(t, currency as never);
                const dueDateStr = invoice.dueDate.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });
                let pdfDataUrl: string | undefined;
                try {
                  const { generateInvoicePdfDataUrl } = await import("@/lib/pdf-export");
                  pdfDataUrl = await generateInvoicePdfDataUrl(invoice, currency, companyName, companyAddress, companyLogo, template);
                } catch {}
                const res = await fetch("/api/invoice/email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: invoice.clientEmail,
                    invoiceNumber: invoice.number,
                    invoiceId: invoice.id,
                    clientName: invoice.clientName,
                    amount: amountStr,
                    dueDate: dueDateStr,
                    companyName,
                    notes: invoice.notes,
                    pdfDataUrl,
                    isReminder: invoice.status === "overdue",
                  }),
                });
                if (res.ok) {
                  if (invoice.status === "draft") onUpdate(invoice.id, { status: "sent" });
                  setSendStatus({ ok: true, msg: `Sent to ${invoice.clientEmail}` });
                  toast.success(`Invoice sent to ${invoice.clientEmail}`);
                } else {
                  setSendStatus({ ok: false, msg: "Failed to send. Check RESEND_API_KEY in Vercel." });
                  toast.error("Failed to send invoice");
                }
              } finally {
                setSendLoading(false);
              }
            }}
            className={`flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-40 ${
              invoice.status === "overdue"
                ? "text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15"
                : "text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.09]"
            }`}
          >
            <Mail size={13} />
            <span className="hidden sm:inline">{sendLoading ? "Sending…" : invoice.status === "overdue" ? "Send Reminder" : "Send"}</span>
          </button>
          <button
            onClick={copyPaymentLink}
            className={`flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-full transition-colors ${linkCopied ? "text-emerald-400 bg-emerald-500/10" : "text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.09]"}`}
            title="Copy payment link"
          >
            {linkCopied ? <Check size={13} /> : <Link2 size={13} />}
            <span className="hidden sm:inline">{linkCopied ? "Copied!" : "Link"}</span>
          </button>
          <TemplatePicker value={template} onChange={setTemplate} />
          <button
            onClick={async () => {
              setPdfLoading(true);
              try { await exportInvoicePdf(invoice, currency, companyName, companyAddress, companyLogo, "#F5C400", "save", template); }
              finally { setPdfLoading(false); }
            }}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] px-2.5 py-1.5 rounded-full transition-colors disabled:opacity-40"
          >
            <Download size={13} /> <span className="hidden sm:inline">{pdfLoading ? "â€¦" : "PDF"}</span>
          </button>
          <button onClick={() => onDuplicate(invoice)} aria-label="Duplicate invoice" title="Duplicate" className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] transition-colors">
            <Copy size={14} />
          </button>
          <button onClick={() => onEdit(invoice)} aria-label="Edit invoice" className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:text-white bg-white/[0.06] hover:bg-white/[0.10] transition-colors">
            <Pencil size={15} />
          </button>
          <button onClick={() => setDeleteConfirm(true)} aria-label="Delete invoice"
            className="w-10 h-10 flex items-center justify-center rounded-full text-red-400/70 hover:text-red-400 bg-red-500/[0.07] hover:bg-red-500/[0.14] transition-colors">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* â"€â"€ Invoice document (white-paper preview) â"€â"€ */}
      <div className="flex-1 overflow-y-auto bg-[#1a1a1a]">
        <div className="max-w-[640px] mx-auto my-4 sm:my-6 px-3 sm:px-4">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl shadow-black/60">

            {/* â"€â"€ Header â"€â"€ */}
            <div className={`relative px-5 sm:px-8 pt-6 sm:pt-8 pb-5 sm:pb-6 border-b ${ps.headerBg} ${ps.headerBorder}`}>
              {ps.accentStrip && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
              <div className="flex items-start justify-between gap-3">
                {/* Logo + company */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {companyLogo ? (
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl overflow-hidden flex-shrink-0">
                      <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[18px] sm:text-[22px] font-black">{(companyName ?? "C").charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`text-[15px] sm:text-[17px] font-black leading-tight truncate ${ps.companyNameColor}`}>{companyName}</p>
                    {companyAddress && (
                      <p className={`text-[10px] sm:text-[11px] mt-0.5 leading-snug ${ps.companyAddrColor}`}>
                        {companyAddress.split(",").slice(0, 2).map((s) => s.trim()).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                {/* Invoice type + number + balance */}
                <div className="text-right flex-shrink-0">
                  <p className={`text-[18px] sm:text-[28px] font-black leading-none tracking-tight ${ps.invoiceTitleColor}`}>INVOICE</p>
                  <p className={`text-[10px] mt-0.5 font-mono ${ps.invoiceNumColor}`}>#{invoice.number}</p>
                  <div className="mt-2">
                    <p className={`text-[9px] uppercase tracking-wider font-bold ${ps.balanceLabelColor}`}>Balance Due</p>
                    <p className={`text-[16px] sm:text-[22px] font-black leading-tight ${ps.balanceAmtColor}`}>
                      {formatCurrency(isPaid ? 0 : Math.round(total), currency as never)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* â"€â"€ Status banners â"€â"€ */}
            {isOverdue && (
              <div className="mx-4 sm:mx-8 mt-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-[12px] font-bold text-red-600">Payment Overdue</p>
                  <p className="text-[11px] text-red-400">Was due {invoice.dueDate.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}</p>
                </div>
              </div>
            )}
            {isPaid && (
              <div className="mx-4 sm:mx-8 mt-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                <p className="text-[12px] font-bold text-emerald-700">Paid in Full â€" Thank you!</p>
              </div>
            )}

            {/* edit hint */}
            <div className="mx-5 sm:mx-8 mt-4 mb-0 flex items-center gap-1.5 text-[10px] text-amber-400/70 font-medium">
              <Pencil size={9} /> Click any field to edit
            </div>

            {/* â"€â"€ Bill To / Dates â"€â"€ */}
            <div className="px-5 sm:px-8 pt-5 pb-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:gap-8">
                <div className="flex-1 mb-4 sm:mb-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5">Bill To</p>
                  <input
                    className={ec(`text-[14px] font-bold ${ps.clientNameColor} w-full`)}
                    value={draft.clientName}
                    onChange={(e) => setDraft((d) => ({ ...d, clientName: e.target.value }))}
                    placeholder="Client name"
                    maxLength={100}
                  />
                  <input
                    className={ec("text-[11px] text-gray-500 w-full mt-1")}
                    value={draft.clientAddress}
                    onChange={(e) => setDraft((d) => ({ ...d, clientAddress: e.target.value }))}
                    placeholder="Address (optional)"
                    maxLength={200}
                  />
                  <div className="flex items-center gap-1 mt-1">
                    <Mail size={10} className="text-gray-300 flex-shrink-0" />
                    <input
                      className={ec("text-[11px] text-gray-400 flex-1")}
                      value={draft.clientEmail}
                      onChange={(e) => setDraft((d) => ({ ...d, clientEmail: e.target.value }))}
                      placeholder="client@email.com"
                      maxLength={100}
                    />
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col gap-6 sm:gap-3 flex-shrink-0">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Invoice Date</p>
                    <input
                      type="date"
                      className={ec("text-[12px] text-gray-700 font-semibold")}
                      value={draft.issueDate}
                      onChange={(e) => setDraft((d) => ({ ...d, issueDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Due Date</p>
                    <input
                      type="date"
                      className={ec(`text-[12px] font-semibold ${isOverdue ? "text-red-600" : "text-gray-700"}`)}
                      value={draft.dueDate}
                      onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* â"€â"€ Line items â"€â"€ */}
            <div className="px-5 sm:px-8 pt-4 pb-2">
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] min-w-[380px]">
                  <thead>
                    <tr className={ps.tableHeadBg}>
                      <th className={`text-left text-[9px] font-black uppercase tracking-[0.12em] px-3 py-2.5 rounded-tl-lg w-7 ${ps.tableHeadText}`}>#</th>
                      <th className={`text-left text-[9px] font-black uppercase tracking-[0.12em] px-3 py-2.5 ${ps.tableHeadText}`}>Item</th>
                      <th className={`text-center text-[9px] font-black uppercase tracking-[0.12em] px-3 py-2.5 w-10 ${ps.tableHeadText}`}>Qty</th>
                      <th className={`text-right text-[9px] font-black uppercase tracking-[0.12em] px-3 py-2.5 w-20 ${ps.tableHeadText}`}>Rate</th>
                      <th className={`text-right text-[9px] font-black uppercase tracking-[0.12em] px-3 py-2.5 w-24 ${ps.tableHeadText}`}>Amount</th>
                      <th className="rounded-tr-lg w-6" />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.items.map((item, i) => (
                      <tr key={i} className={`border-b border-gray-100 group ${i % 2 === 1 ? ps.altRowBg : ""}`}>
                        <td className="py-2 px-3 text-gray-400 text-center text-[11px]">{i + 1}</td>
                        <td className="py-2 px-3">
                          <input
                            className={ec("w-full text-gray-800 font-medium text-[12px]")}
                            value={item.description}
                            onChange={(e) => updItem(i, "description", e.target.value)}
                            placeholder="Item description"
                            maxLength={200}
                          />
                        </td>
                        <td className="py-2 px-3 w-14">
                          <input
                            type="number"
                            className={ec("w-full text-center text-gray-500 text-[12px]")}
                            value={item.qty}
                            onChange={(e) => updItem(i, "qty", e.target.value)}
                            min="0"
                          />
                        </td>
                        <td className="py-2 px-3 w-24">
                          <input
                            type="number"
                            className={ec("w-full text-right text-gray-500 text-[12px]")}
                            value={item.rate}
                            onChange={(e) => updItem(i, "rate", e.target.value)}
                            min="0"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-2 px-3 text-right text-gray-800 font-bold text-[12px] w-24">
                          {formatCurrency((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0), currency as never)}
                        </td>
                        <td className="py-2 px-1 text-center">
                          {draft.items.length > 1 && (
                            <button
                              onClick={() => removeDraftItem(i)}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                              aria-label="Remove row"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={addDraftItem}
                className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-amber-500 hover:text-amber-400 transition-colors px-1 py-1"
              >
                <Plus size={12} /> Add line item
              </button>
            </div>

            {/* â"€â"€ Totals â"€â"€ */}
            <div className="px-5 sm:px-8 pt-3 pb-6 flex justify-end">
              <div className="w-full sm:w-64">
                <div className="flex justify-between py-1.5 text-[12px]">
                  <span className="text-gray-500">Sub Total</span>
                  <span className="text-gray-800 font-semibold">{formatCurrency(sub, currency as never)}</span>
                </div>
                <div className="flex justify-between py-1.5 text-[12px] border-b border-gray-100 items-center">
                  <span className="text-gray-500 flex items-center gap-1">
                    Tax
                    <input
                      type="number"
                      className={ec("w-10 text-center text-gray-500 text-[12px]")}
                      value={draft.taxRate}
                      onChange={(e) => setDraft((d) => ({ ...d, taxRate: e.target.value }))}
                      min="0"
                      max="100"
                      placeholder="0"
                    />
                    %
                  </span>
                  <span className="text-gray-800 font-semibold">{formatCurrency(tax, currency as never)}</span>
                </div>
                <div className="flex justify-between py-1.5 text-[12px] border-b border-gray-200">
                  <span className="text-gray-700 font-bold">Total</span>
                  <span className="text-gray-900 font-bold">{formatCurrency(Math.round(total), currency as never)}</span>
                </div>
                <div className={`flex justify-between items-center px-4 py-3 mt-2 rounded-2xl ${ps.balanceBg}`}>
                  <span className="text-[12px] font-black text-white">Balance Due</span>
                  <span className="text-[16px] sm:text-[18px] font-black text-white">
                    {formatCurrency(isPaid ? 0 : Math.round(total), currency as never)}
                  </span>
                </div>
              </div>
            </div>

            {/* â"€â"€ Notes â"€â"€ */}
            <div className="mx-4 sm:mx-8 mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5">Notes</p>
              <textarea
                className={ec("w-full text-[12px] text-gray-600 leading-relaxed resize-none")}
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Payment terms, bank details, thank-you note…"
                maxLength={1000}
              />
            </div>

            {/* â"€â"€ Terms â"€â"€ */}
            <div className="mx-4 sm:mx-8 mb-5 sm:mb-7">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Terms &amp; Conditions</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">All payments are due as specified. Overdue accounts may be subject to late fees. Thank you for your business.</p>
            </div>

            {/* â"€â"€ Footer band â"€â"€ */}
            <div className={`${ps.footerBg} px-5 sm:px-8 py-3 flex items-center justify-between`}>
              <p className={`text-[10px] font-medium ${ps.footerText}`}>{companyName} Â· {invoice.number}</p>
              <p className={`text-[10px] ${ps.footerText} opacity-70`}>Page 1</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Save / Discard bar ── shown when there are unsaved inline edits */}
      {isDirty && (
        <div className="flex items-center gap-2 px-5 py-2.5 border-t border-amber-500/20 bg-amber-500/[0.05] flex-shrink-0">
          <span className="text-[11px] text-amber-400/70 flex-1">Unsaved changes</span>
          <button
            onClick={() => setDraft(toDraft(invoice))}
            className="text-[12px] font-semibold text-white/40 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/[0.06] transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleSaveDraft}
            className="text-[12px] font-bold text-black bg-amber-500 hover:bg-amber-400 px-4 py-1.5 rounded-full transition-colors"
          >
            Save
          </button>
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="flex items-center gap-2 px-5 pt-3.5 border-t border-white/[0.06] flex-shrink-0 bg-[#0d0d0d]" style={{ paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom))' }}>
        {invoice.status === "draft" && (
          <button onClick={() => { onUpdate(invoice.id, { status: "sent" }); toast.success("Invoice marked as sent"); }}
            className="flex items-center gap-1.5 text-[12px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-full transition-colors">
            <Send size={13} /> Mark as Sent
          </button>
        )}
        {invoice.status === "sent" && (
          <>
            <button onClick={() => { onUpdate(invoice.id, { status: "paid" }); toast.success("Invoice marked as paid"); }}
              className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-full transition-colors">
              <CheckCircle2 size={13} /> Mark Paid
            </button>
            <button onClick={() => { onUpdate(invoice.id, { status: "overdue" }); toast.success("Invoice marked as overdue"); }}
              className="flex items-center gap-1.5 text-[12px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-full transition-colors">
              <AlertTriangle size={12} /> Mark Overdue
            </button>
          </>
        )}
        {invoice.status === "overdue" && (
          <button onClick={() => { onUpdate(invoice.id, { status: "paid" }); toast.success("Invoice marked as paid"); }}
            className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-full transition-colors">
            <CheckCircle2 size={13} /> Mark Paid
          </button>
        )}
        {invoice.status === "paid" && (
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-400">
            <CheckCircle2 size={13} /> Collected
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => onEdit(invoice)} className="lg:hidden flex items-center gap-1.5 text-[12px] font-bold text-white/60 bg-white/[0.06] hover:bg-white/10 px-3 py-2 rounded-full transition-colors">
            <Pencil size={13} /> Edit
          </button>
          <button onClick={() => setDeleteConfirm(true)} className="lg:hidden flex items-center gap-1.5 text-[12px] font-bold text-red-400/80 bg-red-500/[0.08] hover:bg-red-500/15 px-3 py-2 rounded-full transition-colors">
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>
      <ConfirmModal
        open={deleteConfirm}
        title={`Delete ${invoice.number}?`}
        body="This invoice will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => { onDelete(invoice.id); toast.success("Invoice deleted"); onClose(); }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}

// â"€â"€ Invoice list row â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function InvoiceRow({ invoice, currency, onClick }: {
  invoice: Invoice; currency: string; onClick: () => void;
}) {
  const total = invoiceTotal(invoice);
  const cfg = STATUS_CONFIG[invoice.status];
  const isOverdue = invoice.status === "overdue";
  const isPaid = invoice.status === "paid";

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 border-b border-white/[0.04] transition-all hover:bg-white/[0.04] active:bg-white/[0.06] group relative border-l-2 border-l-transparent hover:border-l-amber-500/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-[10px] text-white/30">{invoice.number}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
          </div>
          <p className="text-[13px] font-semibold text-white/90 truncate" title={invoice.clientName}>{invoice.clientName}</p>
          <p className={`text-[11px] mt-0.5 ${isOverdue ? "text-red-400" : "text-white/35"}`}>
            {isOverdue ? "Overdue Â· " : "Due "}
            {invoice.dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-[14px] font-black ${isPaid ? "text-emerald-400" : isOverdue ? "text-red-400" : "text-white"}`}>
            {formatCurrencyCompact(Math.round(total), currency as never)}
          </p>
          <ChevronRight size={13} className="text-white/20 group-hover:text-white/40 transition-colors ml-auto mt-0.5" />
        </div>
      </div>
    </button>
  );
}

// â"€â"€ Main page â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export default function InvoicesPage() {
  const { invoices, addInvoice, updateInvoice, deleteInvoice, currency, companyName, companyAddress, companyLogo, currentUser, defaultTaxRate } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAdminOrAbove(currentUser.role)) router.replace("/dashboard");
  }, [currentUser.role, router]);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Invoice["status"]>("all");
  const [showModal, setShowModal]     = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [form, setForm]               = useState<InvForm>(blank);
  const searchParams = useSearchParams();
  useEffect(() => { if (searchParams.get("new") === "1") { setEditId(null); setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0], taxRate: String(defaultTaxRate) }); setShowModal(true); } }, [searchParams, defaultTaxRate]);

  const openEdit = (invoice: Invoice) => {
    setEditId(invoice.id);
    setForm({
      clientName: invoice.clientName,
      clientEmail: invoice.clientEmail,
      clientAddress: invoice.clientAddress ?? "",
      status: invoice.status,
      issueDate: invoice.issueDate.toISOString().split("T")[0],
      dueDate: invoice.dueDate.toISOString().split("T")[0],
      taxRate: invoice.taxRate.toString(),
      notes: invoice.notes ?? "",
      items: invoice.items.map((i) => ({ description: i.description, qty: i.qty.toString(), rate: i.rate.toString() })),
    });
    setShowModal(true);
  };

  const filtered = invoices.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || i.clientName.toLowerCase().includes(q) || i.number.toLowerCase().includes(q);
  });

  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + invoiceTotal(i), 0);

  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + invoiceTotal(i), 0);

  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  const calcTotal = useCallback((items: LineItem[], taxRate: string) => {
    const sub = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0);
    return sub * (1 + (parseFloat(taxRate) || 0) / 100);
  }, []);

  const nextNumber = (() => {
    const nums = invoices.map((i) => parseInt(i.number.replace(/\D/g, ""), 10)).filter(Boolean);
    const max = nums.length ? Math.max(...nums) : 0;
    return `INV-${new Date().getFullYear()}-${String(max + 1).padStart(3, "0")}`;
  })();

  const updateItem   = (idx: number, field: keyof LineItem, val: string) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }));
  const addItem      = () => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }));
  const removeItem   = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleSave = () => {
    if (!form.clientName.trim()) { toast.error("Client name is required"); return; }
    const items = form.items
      .filter((i) => i.description.trim())
      .map((i) => ({ description: i.description.trim(), qty: parseFloat(i.qty) || 1, rate: parseFloat(i.rate) || 0 }));
    if (editId) {
      updateInvoice(editId, {
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
        clientAddress: form.clientAddress.trim(),
        status: form.status,
        issueDate: form.issueDate ? new Date(form.issueDate) : new Date(),
        dueDate: form.dueDate ? new Date(form.dueDate) : new Date(Date.now() + 30 * 86400000),
        items,
        taxRate: parseFloat(form.taxRate) || 0,
        notes: form.notes.trim() || undefined,
      });
    } else {
      addInvoice({
        number: nextNumber,
        clientName: form.clientName.trim(),
        clientEmail: form.clientEmail.trim(),
        clientAddress: form.clientAddress.trim(),
        status: form.status,
        issueDate: form.issueDate ? new Date(form.issueDate) : new Date(),
        dueDate: form.dueDate ? new Date(form.dueDate) : new Date(Date.now() + 30 * 86400000),
        items,
        taxRate: parseFloat(form.taxRate) || 0,
        notes: form.notes.trim() || undefined,
      });
    }
    setForm({ ...blank, taxRate: String(defaultTaxRate) });
    setEditId(null);
    setShowModal(false);
    toast.success(editId ? "Invoice updated" : "Invoice created");
  };

  const previewTotal = calcTotal(form.items, form.taxRate);

  const TABS: Array<{ key: "all" | Invoice["status"]; label: string; count: number }> = [
    { key: "all",     label: "All",     count: invoices.length },
    { key: "draft",   label: "Draft",   count: invoices.filter((i) => i.status === "draft").length },
    { key: "sent",    label: "Sent",    count: invoices.filter((i) => i.status === "sent").length },
    { key: "paid",    label: "Paid",    count: invoices.filter((i) => i.status === "paid").length },
    { key: "overdue", label: "Overdue", count: overdueCount },
  ];

  return (
    <>
      {/* MOBILE */}
      <div className="lg:hidden -mx-5 -mt-5 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h1 className="text-[24px] font-bold text-white tracking-tight">Invoices</h1>
            <p className="text-[12px] text-white/35 mt-0.5">{invoices.length} total</p>
          </div>
          <button
            onClick={() => { setEditId(null); setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0], taxRate: String(defaultTaxRate) }); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-amber-500 active:bg-amber-600 text-black font-bold text-[13px] px-4 py-2.5 rounded-full transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus size={15} /> New
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-2.5 px-5 mb-4 overflow-x-auto no-scrollbar">
          <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3.5">
            <p className="text-[11px] text-white/35 font-medium mb-1">Outstanding</p>
            <p className="text-[20px] font-bold text-amber-400 leading-none">{formatCurrencyCompact(Math.round(totalOutstanding), currency as never)}</p>
          </div>
          <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3.5">
            <p className="text-[11px] text-white/35 font-medium mb-1">Collected</p>
            <p className="text-[20px] font-bold text-emerald-400 leading-none">{formatCurrencyCompact(Math.round(totalPaid), currency as never)}</p>
          </div>
          {overdueCount > 0 && (
            <div className="flex-shrink-0 bg-red-500/[0.08] border border-red-500/20 rounded-2xl px-4 py-3.5">
              <p className="text-[11px] text-red-400/70 font-medium mb-1">Overdue</p>
              <p className="text-[20px] font-bold text-red-400 leading-none">{overdueCount}</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.06] mx-5 mb-3 px-3.5 py-3 rounded-2xl">
          <Search size={14} className="text-white/30 flex-shrink-0" />
          <input
            className="bg-transparent text-[13px] text-white/80 placeholder:text-white/30 outline-none flex-1"
            placeholder="Search client or invoice #…"
            autoComplete="off" spellCheck={false} maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex-shrink-0 snap-start flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-full transition-all ${
                statusFilter === tab.key
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                  : "text-white/40 bg-white/[0.04] border border-transparent"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  statusFilter === tab.key ? "bg-amber-500/25 text-amber-300" : "bg-white/[0.07] text-white/25"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Invoice list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            body="Create your first invoice to start getting paid faster."
            action={{ label: "Create Invoice", onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="mx-5 space-y-2.5">
            {filtered.map((inv) => {
              const total = invoiceTotal(inv);
              const cfg = STATUS_CONFIG[inv.status];
              const isOverdue = inv.status === "overdue";
              const isPaid = inv.status === "paid";
              return (
                <button
                  key={inv.id}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className="card-hover w-full text-left bg-[#131110] border border-white/[0.07] rounded-2xl overflow-hidden active:scale-[0.985] active:opacity-90"
                >
                  <div className="px-4 py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        <span className="font-mono text-[10px] text-white/25">{inv.number}</span>
                      </div>
                      <p className="text-[14px] font-semibold text-white/90 truncate">{inv.clientName}</p>
                      <p className={`text-[11px] mt-0.5 ${isOverdue ? "text-red-400" : "text-white/30"}`}>
                        {isOverdue ? "âš  Overdue Â· " : "Due "}
                        {inv.dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <p className={`text-[18px] font-black flex-shrink-0 tabular-nums ${isPaid ? "text-emerald-400" : isOverdue ? "text-red-400" : "text-white"}`}>
                      {formatCurrencyCompact(Math.round(total), currency as never)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block h-full">
        <div className="h-full flex flex-col -m-4 md:-m-6">

          {/* â"€â"€ Top stats bar â"€â"€ */}
          <div className="flex items-stretch gap-0 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-3 px-5 py-3.5 border-r border-white/[0.05] min-w-[160px]">
          <div className="flex-1">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Outstanding</p>
            <p className="text-[18px] font-black text-amber-400 mt-0.5">{formatCurrencyCompact(Math.round(totalOutstanding), currency as never)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5 border-r border-white/[0.05] min-w-[140px]">
          <div className="flex-1">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Collected</p>
            <p className="text-[18px] font-black text-emerald-400 mt-0.5">{formatCurrencyCompact(Math.round(totalPaid), currency as never)}</p>
          </div>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-3 px-5 py-3.5 border-r border-white/[0.05] min-w-[120px]">
            <div className="flex-1">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Overdue</p>
              <p className="text-[18px] font-black text-red-400 mt-0.5">{overdueCount}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 px-5 py-3.5 ml-auto flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70 bg-amber-500/10 px-2.5 py-1 rounded-full">
            <Lock size={9} /> Private
          </div>
          <button
            onClick={() => { setEditId(null); setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0], taxRate: String(defaultTaxRate) }); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-[12px] px-3.5 py-2 rounded-full transition-colors"
          >
            <Plus size={14} /> New Invoice
          </button>
        </div>
      </div>

      {/* â"€â"€ Master / Detail layout â"€â"€ */}
      <div className="flex flex-1 overflow-hidden">

        {/* List panel */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search + filter */}
          <div className="px-3 py-3 border-b border-white/[0.05] space-y-2 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
              <Search size={13} className="text-white/30 flex-shrink-0" />
              <input
                className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1 min-w-0"
                placeholder="Search client or number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                    statusFilter === tab.key
                      ? "bg-amber-500/15 text-amber-400"
                      : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`text-[9px] px-1 py-0.5 rounded-full ${statusFilter === tab.key ? "bg-amber-500/25 text-amber-300" : "bg-white/[0.07] text-white/25"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices"
                body="Create your first invoice to get paid."
                action={{ label: "Create Invoice", onClick: () => setShowModal(true) }}
              />
            ) : (
              filtered.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  currency={currency}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                />
              ))
            )}
          </div>
        </div>

      </div>

        </div>
      </div>

      {/* â"€â"€ New Invoice Modal â"€â"€ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="sheet bg-[#161616] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-[15px] font-bold text-white">{editId ? "Edit Invoice" : "New Invoice"}</h3>
                {!editId && <p className="text-[11px] text-white/30 mt-0.5 font-mono">{nextNumber}</p>}
              </div>
              <button onClick={() => { setShowModal(false); setEditId(null); }} aria-label="Close" className="w-10 h-10 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/5 active:bg-white/10 transition-all -mr-1">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-scroll overscroll-y-contain p-6 space-y-4" style={{touchAction:"pan-y"}}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Client Name *</label>
                  <input className={inp} placeholder="Acme Corp" maxLength={100}
                    value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Client Email</label>
                  <input className={inp} type="email" placeholder="client@example.com" maxLength={100}
                    value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={lbl}>Client Address</label>
                <input className={inp} placeholder="123 Main St, City, Province" maxLength={200}
                  value={form.clientAddress} onChange={(e) => setForm((f) => ({ ...f, clientAddress: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>Status</label>
                  <CustomSelect
                    className={inp}
                    value={form.status}
                    onChange={(v) => setForm((f) => ({ ...f, status: v as InvForm["status"] }))}
                    options={[
                      { value: "draft", label: "Draft" },
                      { value: "sent", label: "Sent" },
                      { value: "paid", label: "Paid" },
                      { value: "overdue", label: "Overdue" },
                    ]}
                  />
                </div>
                <div>
                  <label className={lbl}>Issue Date</label>
                  <input className={inp} type="date" value={form.issueDate}
                    onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Due Date</label>
                  <input className={inp} type="date" value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={lbl} style={{ marginBottom: 0 }}>Line Items</label>
                  <button onClick={addItem} className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition-colors">+ Add line</button>
                </div>
                <div className="space-y-2">
                  <div className="hidden sm:grid sm:grid-cols-[1fr_56px_80px_20px] gap-1.5 text-[9px] font-bold text-white/25 uppercase tracking-wider px-1">
                    <span>Description</span><span>Qty</span><span>Rate</span><span />
                  </div>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_56px_80px_20px] sm:gap-1.5 sm:items-center bg-white/[0.03] sm:bg-transparent rounded-lg p-2 sm:p-0">
                      <input className={inp} placeholder="Description (e.g. Labour)" maxLength={200} value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)} />
                      <div className="flex gap-2 sm:contents">
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider mb-1 sm:hidden">Qty</p>
                          <input className={inp} type="number" placeholder="1" value={item.qty}
                            onChange={(e) => updateItem(idx, "qty", e.target.value)} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider mb-1 sm:hidden">Rate ($)</p>
                          <input className={inp} type="number" placeholder="0.00" value={item.rate}
                            onChange={(e) => updateItem(idx, "rate", e.target.value)} />
                        </div>
                        <button onClick={() => removeItem(idx)} className="self-end text-white/20 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-500/10">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Tax Rate (%)</label>
                  <input className={inp} type="number" placeholder="13" value={form.taxRate}
                    onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))} />
                </div>
                <div className="flex flex-col justify-end">
                  {previewTotal > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
                      <p className="text-[9px] text-amber-400/60 uppercase tracking-widest font-bold">Total</p>
                      <p className="text-[20px] font-black text-amber-400 leading-tight">{formatCurrency(Math.round(previewTotal), currency as never)}</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={lbl}>Notes</label>
                <textarea className={inp + " resize-none"} rows={2} placeholder="Payment terms, bank details…" maxLength={1000}
                  value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex-shrink-0 flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06]">
              <button onClick={() => { setShowModal(false); setEditId(null); }}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!form.clientName.trim()}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editId ? "Save Changes" : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}








