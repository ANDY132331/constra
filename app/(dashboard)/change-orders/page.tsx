"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdminOrAbove } from "@/lib/permissions";
import {
  Plus, Search, GitPullRequest, DollarSign, Trash2, X,
  ChevronRight, ChevronLeft, Download, CheckCircle2, Clock, XCircle, Ban, Pencil,
} from "lucide-react";
import { ConfirmModal } from "@/components/confirm-modal";
import { EmptyState } from "@/components/empty-state";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import type { ChangeOrder } from "@/lib/mock-data";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

const STATUS_CONFIG = {
  pending:  { label: "Pending",  bg: "bg-amber-500/15",    text: "text-amber-400",    dot: "bg-amber-400",    icon: Clock },
  approved: { label: "Approved", bg: "bg-emerald-500/15",  text: "text-emerald-400",  dot: "bg-emerald-400",  icon: CheckCircle2 },
  rejected: { label: "Rejected", bg: "bg-red-500/15",      text: "text-red-400",      dot: "bg-red-400",      icon: XCircle },
  void:     { label: "Void",     bg: "bg-zinc-700/60",     text: "text-zinc-400",     dot: "bg-zinc-500",     icon: Ban },
};

type COForm = {
  projectId: string;
  number: string;
  title: string;
  description: string;
  reason: string;
  amount: string;
  status: ChangeOrder["status"];
};

const emptyForm = (nextNumber?: string): COForm => ({
  projectId: "",
  number: nextNumber ?? "",
  title: "",
  description: "",
  reason: "",
  amount: "",
  status: "pending",
});

export default function ChangeOrdersPage() {
  const router = useRouter();
  const { currentUser, projects, workers, currency, changeOrders, addChangeOrder, updateChangeOrder, deleteChangeOrder } = useStore();
  const isAdmin = isAdminOrAbove(currentUser.role);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ChangeOrder["status"]>("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selected, setSelected] = useState<ChangeOrder | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChangeOrder | null>(null);
  const [form, setForm] = useState<COForm>(emptyForm());
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router]);

  const nextNumber = (() => {
    const nums = changeOrders.map((c) => parseInt(c.number.replace("CO-", "")) || 0);
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `CO-${String(max + 1).padStart(3, "0")}`;
  })();

  const filtered = changeOrders.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (projectFilter !== "all" && c.projectId !== projectFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const proj = projects.find((p) => p.id === c.projectId);
      if (!c.title.toLowerCase().includes(q) && !c.number.toLowerCase().includes(q) && !(proj?.name.toLowerCase().includes(q))) return false;
    }
    return true;
  }).sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

  const totals = {
    pending: changeOrders.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0),
    approved: changeOrders.filter((c) => c.status === "approved").reduce((s, c) => s + c.amount, 0),
    all: changeOrders.reduce((s, c) => s + (c.status === "approved" ? c.amount : 0), 0),
  };

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm(nextNumber));
    setShowForm(true);
  };

  const openEdit = (co: ChangeOrder) => {
    setEditing(co);
    setForm({
      projectId: co.projectId,
      number: co.number,
      title: co.title,
      description: co.description,
      reason: co.reason,
      amount: String(co.amount),
      status: co.status,
    });
    setShowForm(true);
  };

  const handleSubmit = useCallback(() => {
    if (!form.projectId || !form.title.trim() || !form.number.trim()) return;
    if (editing) {
      updateChangeOrder(editing.id, {
        projectId: form.projectId,
        number: form.number.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        reason: form.reason.trim(),
        amount: parseFloat(form.amount) || 0,
        status: form.status,
        approvedAt: form.status === "approved" && editing.status !== "approved" ? new Date() : editing.approvedAt,
        approvedBy: form.status === "approved" && editing.status !== "approved" ? currentUser.name : editing.approvedBy,
      });
      if (selected?.id === editing.id) {
        setSelected((prev) => prev ? { ...prev, ...{ projectId: form.projectId, title: form.title.trim(), status: form.status } } : null);
      }
    } else {
      addChangeOrder({
        projectId: form.projectId,
        number: form.number.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        reason: form.reason.trim(),
        amount: parseFloat(form.amount) || 0,
        status: form.status,
        submittedAt: new Date(),
        submittedById: currentUser.id,
      });
    }
    setForm(emptyForm());
    setShowForm(false);
    setEditing(null);
  }, [form, editing, addChangeOrder, updateChangeOrder, currentUser, selected]);

  const handleExportPdf = useCallback(async (co: ChangeOrder) => {
    setPdfLoading(true);
    try {
      const { exportChangeOrderPdf } = await import("@/lib/pdf-export");
      const project = projects.find((p) => p.id === co.projectId);
      const submitter = workers.find((w) => w.id === co.submittedById);
      await exportChangeOrderPdf({ changeOrder: co, projectName: project?.name ?? "Unknown", submitterName: submitter?.name ?? "Unknown", currency });
    } finally {
      setPdfLoading(false);
    }
  }, [projects, workers, currency]);

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const workerMap = new Map(workers.map((w) => [w.id, w]));

  if (!isAdmin) return null;

  return (
    <>
      {/* MOBILE */}
      <div className="lg:hidden -mx-4 -mt-4 pb-6">
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d0c0b] border-b border-white/[0.06]">
          {selected ? (
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white/80 transition-colors">
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <h1 className="text-[15px] font-bold text-white">Change Orders</h1>
          )}
          {!selected && (
            <button onClick={openNew} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors">
              <Plus size={13} /> New
            </button>
          )}
        </div>

        {!selected ? (
          <>
            <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
              <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-white/30 mb-0.5">Pending</p>
                <p className="text-[12px] font-bold font-mono text-amber-400">{formatCurrency(totals.pending, currency as never)}</p>
              </div>
              <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-white/30 mb-0.5">Approved</p>
                <p className="text-[12px] font-bold font-mono text-emerald-400">{formatCurrency(totals.approved, currency as never)}</p>
              </div>
              <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-xl px-3 py-2 text-center">
                <p className="text-[10px] text-white/30 mb-0.5">Total</p>
                <p className="text-[12px] font-bold font-mono text-white/70">{formatCurrency(totals.all, currency as never)}</p>
              </div>
            </div>
            <div className="px-4 mb-3">
              <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
                <Search size={13} className="text-white/30 flex-shrink-0" />
                <input className="flex-1 bg-transparent text-[13px] text-white/80 placeholder:text-white/25 outline-none"
                  placeholder="Search change orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
              {(["all", "pending", "approved", "rejected", "void"] as const).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold capitalize transition-colors ${statusFilter === s ? "bg-amber-500 text-black" : "bg-white/[0.06] text-white/45 hover:bg-white/[0.09]"}`}>
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div className="px-4 space-y-2">
              {filtered.length === 0 ? (
                <EmptyState
                  icon={GitPullRequest}
                  title={changeOrders?.length === 0 ? "No change orders yet" : "No change orders found"}
                  body={changeOrders?.length === 0
                    ? "Log scope changes, cost adjustments, and client approvals as change orders."
                    : "Try adjusting your search or status filter."}
                  action={changeOrders?.length === 0 && isAdmin ? { label: "New Change Order", onClick: () => { openNew(); } } : undefined}
                  isFiltered={!!changeOrders?.length && filtered.length === 0}
                />
              ) : filtered.map((co) => {
                const proj = projectMap.get(co.projectId);
                const cfg = STATUS_CONFIG[co.status];
                return (
                  <button key={co.id} onClick={() => setSelected(co)} className="w-full text-left bg-[#131110] border border-white/[0.07] rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono text-white/30">{co.number}</p>
                        <p className="text-[13px] font-semibold text-white/85 mt-0.5 line-clamp-1">{co.title}</p>
                        <p className="text-[11px] text-white/40 mt-0.5">{proj?.name ?? "Unknown project"}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13px] font-bold font-mono text-white/80">{formatCurrency(co.amount, currency as never)}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="px-4 py-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-mono text-white/30">{selected.number}</span>
                <StatusBadge status={selected.status} />
              </div>
              <h2 className="text-[16px] font-bold text-white/90">{selected.title}</h2>
              <p className="text-[12px] text-white/40 mt-0.5">
                {projectMap.get(selected.projectId)?.name ?? "Unknown project"} &bull;{" "}
                {workerMap.get(selected.submittedById)?.name ?? "Unknown"} &bull;{" "}
                {selected.submittedAt.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="bg-[#131110] border border-white/[0.07] rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Change Amount</p>
                <p className="text-[22px] font-bold text-white/90">{formatCurrency(selected.amount, currency as never)}</p>
              </div>
              {selected.status === "pending" && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { updateChangeOrder(selected.id, { status: "approved", approvedAt: new Date(), approvedBy: currentUser.name }); setSelected((p) => p ? { ...p, status: "approved", approvedAt: new Date(), approvedBy: currentUser.name } : null); }}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors">
                    <CheckCircle2 size={12} /> Approve
                  </button>
                  <button
                    onClick={() => { updateChangeOrder(selected.id, { status: "rejected" }); setSelected((p) => p ? { ...p, status: "rejected" } : null); }}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors">
                    <XCircle size={12} /> Reject
                  </button>
                </div>
              )}
            </div>
            {selected.description && (
              <div className="bg-[#131110] border border-white/[0.07] rounded-2xl p-4">
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Description</p>
                <p className="text-[13px] text-white/65 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
              </div>
            )}
            {selected.reason && (
              <div className="bg-[#131110] border border-white/[0.07] rounded-2xl p-4">
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Reason for Change</p>
                <p className="text-[13px] text-white/65 leading-relaxed whitespace-pre-wrap">{selected.reason}</p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => openEdit(selected)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.09] text-white/60 text-[12px] font-semibold transition-colors">
                <Pencil size={13} /> Edit
              </button>
              <button onClick={() => setDeleteConfirm(selected.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[12px] font-semibold transition-colors">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:flex h-full overflow-hidden">
      {/* Left list */}
      <div className={`flex flex-col ${selected ? "hidden lg:flex" : "flex"} w-full lg:w-[380px] lg:min-w-[380px] border-r border-white/[0.06]`}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <div className="flex-1 flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
            <Search size={13} className="text-white/30 flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-[13px] text-white/80 placeholder:text-white/25 outline-none"
              placeholder="Search change orders…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[12px] font-bold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
          >
            <Plus size={13} /> New
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 py-2 border-b border-white/[0.06] flex gap-2">
          <CustomSelect
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-white/60 outline-none"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as typeof statusFilter)}
            options={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "void", label: "Void" },
            ]}
          />
          <CustomSelect
            className="flex-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-white/60 outline-none"
            value={projectFilter}
            onChange={(v) => setProjectFilter(v)}
            options={[
              { value: "all", label: "All projects" },
              ...projects.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </div>

        {/* Summary cards */}
        <div className="px-4 py-3 border-b border-white/[0.06] grid grid-cols-3 gap-2">
          <SummaryCard label="Pending" value={formatCurrency(totals.pending, currency as never)} color="amber" />
          <SummaryCard label="Approved" value={formatCurrency(totals.approved, currency as never)} color="emerald" />
          <SummaryCard label="Total Approved" value={formatCurrency(totals.all, currency as never)} color="white" />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <EmptyState
                icon={GitPullRequest}
                title={changeOrders?.length === 0 ? "No change orders yet" : "No change orders found"}
                body={changeOrders?.length === 0
                  ? "Log scope changes, cost adjustments, and client approvals as change orders."
                  : "Try adjusting your search or status filter."}
                action={changeOrders?.length === 0 && isAdmin ? { label: "New Change Order", onClick: () => { openNew(); } } : undefined}
                isFiltered={!!changeOrders?.length && filtered.length === 0}
              />
            </div>
          ) : (
            filtered.map((co) => {
              const proj = projectMap.get(co.projectId);
              const cfg = STATUS_CONFIG[co.status];
              const isActive = selected?.id === co.id;
              return (
                <button
                  key={co.id}
                  onClick={() => setSelected(co)}
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.04] transition-colors ${isActive ? "bg-amber-500/8" : "hover:bg-white/[0.03]"}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-mono text-white/35 mr-2">{co.number}</span>
                      <span className="text-[13px] font-semibold text-white/80 line-clamp-1">{co.title}</span>
                    </div>
                    <ChevronRight size={12} className="text-white/20 flex-shrink-0 mt-0.5" />
                  </div>
                  <p className="text-[11px] text-white/40 mb-1.5">{proj?.name ?? "Unknown project"}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                    <span className="text-[12px] font-mono font-semibold text-white/60">{formatCurrency(co.amount, currency as never)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[12px] font-mono text-white/35">{selected.number}</span>
                <StatusBadge status={selected.status} />
              </div>
              <h2 className="text-[15px] font-bold text-white/90">{selected.title}</h2>
              <p className="text-[12px] text-white/40 mt-0.5">
                {projectMap.get(selected.projectId)?.name ?? "Unknown project"}
                {" · "}Submitted by {workerMap.get(selected.submittedById)?.name ?? "Unknown"}
                {" · "}{selected.submittedAt.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportPdf(selected)}
                disabled={pdfLoading}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              >
                <Download size={13} /> {pdfLoading ? "…" : "PDF"}
              </button>
              <button onClick={() => openEdit(selected)} className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors" title="Edit">
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setDeleteConfirm(selected.id)}
                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
              >
                <Trash2 size={14} />
              </button>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors lg:hidden">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Amount */}
            <div className="bg-white/[0.03] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-500/15 rounded-lg flex items-center justify-center">
                  <DollarSign size={16} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider">Change Amount</p>
                  <p className="text-[20px] font-bold text-white/90">{formatCurrency(selected.amount, currency as never)}</p>
                </div>
              </div>
              {selected.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { updateChangeOrder(selected.id, { status: "approved", approvedAt: new Date(), approvedBy: currentUser.name }); setSelected((p) => p ? { ...p, status: "approved", approvedAt: new Date(), approvedBy: currentUser.name } : null); }}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <CheckCircle2 size={13} /> Approve
                  </button>
                  <button
                    onClick={() => { updateChangeOrder(selected.id, { status: "rejected" }); setSelected((p) => p ? { ...p, status: "rejected" } : null); }}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              )}
            </div>

            {selected.description && <DetailSection title="Description" content={selected.description} />}
            {selected.reason && <DetailSection title="Reason for Change" content={selected.reason} />}
            {selected.approvedAt && (
              <div>
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Approval</p>
                <p className="text-[13px] text-white/65">
                  {selected.status === "approved" ? "Approved" : "Reviewed"} by <strong>{selected.approvedBy}</strong> on {selected.approvedAt.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {!selected && (
        <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-3 text-center">
          <GitPullRequest size={40} className="text-white/10" />
          <p className="text-[14px] text-white/30">Select a change order to view details</p>
        </div>
      )}

      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/[0.08] rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-[14px] font-bold text-white/90">{editing ? "Edit Change Order" : "New Change Order"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"><X size={14} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>CO Number *</label>
                  <input className={inp} placeholder={nextNumber} value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Status</label>
                  <CustomSelect
                    className={inp}
                    value={form.status}
                    onChange={(v) => setForm((f) => ({ ...f, status: v as ChangeOrder["status"] }))}
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "approved", label: "Approved" },
                      { value: "rejected", label: "Rejected" },
                      { value: "void", label: "Void" },
                    ]}
                  />
                </div>
              </div>
              <div>
                <label className={lbl}>Project *</label>
                <CustomSelect
                  className={inp}
                  value={form.projectId}
                  onChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
                  options={[
                    { value: "", label: "Select project…" },
                    ...projects.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </div>
              <div>
                <label className={lbl}>Title *</label>
                <input className={inp} placeholder="Additional foundation waterproofing" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Amount ($)</label>
                <input className={inp} type="number" placeholder="0.00" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Description</label>
                <textarea className={`${inp} resize-none`} rows={3} placeholder="Describe the change in scope…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Reason</label>
                <textarea className={`${inp} resize-none`} rows={2} placeholder="Why is this change needed?" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 rounded-lg hover:bg-white/[0.05] transition-colors">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!form.projectId || !form.title.trim() || !form.number.trim()}
                className="px-4 py-2 text-[13px] font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black rounded-lg transition-colors"
              >
                {editing ? "Save Changes" : "Create CO"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Change Order"
        body="Delete this change order permanently? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) { deleteChangeOrder(deleteConfirm); setSelected(null); } setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: "amber" | "emerald" | "white" }) {
  const colors = { amber: "text-amber-400", emerald: "text-emerald-400", white: "text-white/80" };
  return (
    <div className="bg-white/[0.03] rounded-lg p-2.5 text-center">
      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-[12px] font-bold font-mono ${colors[color]}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ChangeOrder["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function DetailSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">{title}</p>
      <p className="text-[13px] text-white/65 leading-relaxed whitespace-pre-wrap">{content}</p>
    </div>
  );
}
