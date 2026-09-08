"use client";

import { useState, useMemo } from "react";
import { isAdminOrAbove } from "@/lib/permissions";
import {
  Shield, Plus, Search, AlertTriangle, CheckCircle2,
  Clock, Trash2, Pencil, X, FileText, ChevronDown, Building2, User, HardHat,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import type { InsurancePolicy, InsuranceCoverageType } from "@/lib/mock-data";
import { COVERAGE_TYPE_LABELS } from "@/lib/mock-data";
import { ConfirmModal } from "@/components/confirm-modal";
import { CustomSelect } from "@/components/ui/custom-select";
import { toast } from "sonner";

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

type FormState = {
  holderName: string;
  holderType: "company" | "subcontractor" | "worker";
  workerId: string;
  coverageType: InsuranceCoverageType;
  insurer: string;
  policyNumber: string;
  coverageAmount: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
};

const blank: FormState = {
  holderName: "",
  holderType: "company",
  workerId: "",
  coverageType: "general-liability",
  insurer: "",
  policyNumber: "",
  coverageAmount: "",
  issueDate: new Date().toISOString().split("T")[0],
  expiryDate: "",
  notes: "",
};

function expiryStatus(d: Date): "expired" | "soon" | "valid" {
  const now = Date.now();
  const ms = new Date(d).getTime() - now;
  if (ms <= 0) return "expired";
  if (ms < 30 * 24 * 60 * 60 * 1000) return "soon";
  return "valid";
}

function daysUntilExpiry(d: Date): number {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

const STATUS_CONFIG = {
  expired: { label: "Expired",        className: "bg-red-500/12 text-red-400",   dot: "bg-red-500" },
  soon:    { label: "Expiring Soon",   className: "bg-amber-500/12 text-amber-400", dot: "bg-amber-500" },
  valid:   { label: "Valid",           className: "bg-emerald-500/12 text-emerald-500", dot: "bg-emerald-500" },
};

const HOLDER_TYPE_CONFIG = {
  company:       { label: "Company",       icon: Building2, color: "text-blue-400" },
  subcontractor: { label: "Subcontractor", icon: HardHat,   color: "text-purple-400" },
  worker:        { label: "Worker",        icon: User,       color: "text-amber-400" },
};

export default function InsurancePage() {
  const { insurancePolicies, addInsurancePolicy, updateInsurancePolicy, deleteInsurancePolicy, workers, currentUser, currency } = useStore();
  const isAdmin = isAdminOrAbove(currentUser.role);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const f = (k: keyof FormState, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const filtered = useMemo(() => {
    let list = [...insurancePolicies];
    if (typeFilter !== "all") list = list.filter((p) => p.coverageType === typeFilter);
    if (statusFilter !== "all") list = list.filter((p) => expiryStatus(p.expiryDate) === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.holderName.toLowerCase().includes(q) ||
        p.insurer.toLowerCase().includes(q) ||
        p.policyNumber.toLowerCase().includes(q)
      );
    }
    // Sort: expired first, then expiring soon, then valid; within each group sort by expiry ASC
    const ORDER = { expired: 0, soon: 1, valid: 2 } as const;
    return list.sort((a, b) => {
      const sa = ORDER[expiryStatus(a.expiryDate)];
      const sb = ORDER[expiryStatus(b.expiryDate)];
      if (sa !== sb) return sa - sb;
      return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
    });
  }, [insurancePolicies, search, typeFilter, statusFilter]);

  // Stats
  const expired = insurancePolicies.filter((p) => expiryStatus(p.expiryDate) === "expired").length;
  const soon     = insurancePolicies.filter((p) => expiryStatus(p.expiryDate) === "soon").length;
  const valid    = insurancePolicies.filter((p) => expiryStatus(p.expiryDate) === "valid").length;

  function openAdd() {
    setForm(blank);
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(p: InsurancePolicy) {
    setForm({
      holderName:     p.holderName,
      holderType:     p.holderType,
      workerId:       p.workerId ?? "",
      coverageType:   p.coverageType,
      insurer:        p.insurer,
      policyNumber:   p.policyNumber,
      coverageAmount: String(p.coverageAmount),
      issueDate:      new Date(p.issueDate).toISOString().split("T")[0],
      expiryDate:     new Date(p.expiryDate).toISOString().split("T")[0],
      notes:          p.notes ?? "",
    });
    setEditId(p.id);
    setShowModal(true);
  }

  function handleSave() {
    if (!form.holderName.trim() || !form.insurer.trim() || !form.policyNumber.trim() || !form.expiryDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    const payload: Omit<InsurancePolicy, "id"> = {
      holderName:     form.holderName.trim(),
      holderType:     form.holderType,
      workerId:       form.holderType === "worker" && form.workerId ? form.workerId : undefined,
      coverageType:   form.coverageType,
      insurer:        form.insurer.trim(),
      policyNumber:   form.policyNumber.trim(),
      coverageAmount: parseFloat(form.coverageAmount) || 0,
      issueDate:      new Date(form.issueDate),
      expiryDate:     new Date(form.expiryDate),
      notes:          form.notes.trim() || undefined,
    };
    if (editId) {
      updateInsurancePolicy(editId, payload);
      toast.success("Policy updated");
    } else {
      addInsurancePolicy(payload);
      toast.success("Policy added");
    }
    setShowModal(false);
  }

  const coverageTypeOptions = Object.entries(COVERAGE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
  const holderTypeOptions = [
    { value: "company",       label: "Company" },
    { value: "subcontractor", label: "Subcontractor" },
    { value: "worker",        label: "Worker" },
  ];
  const workerOptions = workers.map((w) => ({ value: w.id, label: w.name }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-black text-white/90 flex items-center gap-2">
            <Shield size={20} className="text-amber-400" />
            Insurance & COI
          </h1>
          <p className="text-[12px] text-white/35 mt-0.5">Track certificates of insurance for your company, workers, and subcontractors</p>
        </div>
        {isAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-xl transition-all active:scale-95 shadow-lg shadow-amber-500/15"
          >
            <Plus size={15} />
            Add Policy
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Expired",       count: expired, color: "text-red-400",     bg: "bg-red-500/8 border-red-500/15" },
          { label: "Expiring Soon", count: soon,    color: "text-amber-400",   bg: "bg-amber-500/8 border-amber-500/15" },
          { label: "Valid",         count: valid,   color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/15" },
        ].map(({ label, count, color, bg }) => (
          <div key={label} className={`rounded-xl px-4 py-3 border ${bg}`}>
            <p className={`text-[22px] font-black ${color}`}>{count}</p>
            <p className="text-[11px] text-white/40 font-medium mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search holder, insurer, policy…"
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-xl pl-8 pr-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/30"
          />
        </div>
        <CustomSelect
          value={typeFilter}
          onChange={setTypeFilter}
          options={[{ value: "all", label: "All Types" }, ...coverageTypeOptions]}
          className="min-w-[160px]"
        />
        <CustomSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all",     label: "All Statuses" },
            { value: "expired", label: "Expired" },
            { value: "soon",    label: "Expiring Soon" },
            { value: "valid",   label: "Valid" },
          ]}
          className="min-w-[140px]"
        />
      </div>

      {/* Table / Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <Shield size={20} className="text-white/20" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-white/40">
              {search || typeFilter !== "all" || statusFilter !== "all" ? "No policies match your filters" : "No insurance policies yet"}
            </p>
            {!search && typeFilter === "all" && statusFilter === "all" && isAdmin && (
              <p className="text-[12px] text-white/25 mt-1">Click &ldquo;Add Policy&rdquo; to track your first COI</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((policy) => {
            const status = expiryStatus(policy.expiryDate);
            const cfg = STATUS_CONFIG[status];
            const holderCfg = HOLDER_TYPE_CONFIG[policy.holderType];
            const HolderIcon = holderCfg.icon;
            const days = daysUntilExpiry(policy.expiryDate);
            const worker = policy.workerId ? workers.find((w) => w.id === policy.workerId) : null;

            return (
              <div
                key={policy.id}
                className="group bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3.5 hover:border-white/[0.10] transition-all"
              >
                <div className="flex items-start gap-3">
                  {/* Status dot */}
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${cfg.dot}`} />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold text-white/90 truncate">{policy.holderName}</span>
                          {worker && (
                            <span className="text-[11px] text-white/40">({worker.name})</span>
                          )}
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.className}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                            {cfg.label}
                            {status === "soon" && ` · ${days}d`}
                            {status === "expired" && ` · ${Math.abs(days)}d ago`}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-[12px] text-white/50">{COVERAGE_TYPE_LABELS[policy.coverageType]}</span>
                          <span className="text-white/20 text-[10px]">·</span>
                          <span className={`flex items-center gap-1 text-[11px] font-medium ${holderCfg.color}`}>
                            <HolderIcon size={11} />
                            {holderCfg.label}
                          </span>
                          <span className="text-white/20 text-[10px]">·</span>
                          <span className="text-[12px] text-white/40">{policy.insurer}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-[13px] font-bold text-white/80">
                            {formatCurrency(policy.coverageAmount, currency)}
                          </p>
                          <p className="text-[11px] text-white/30 mt-0.5">
                            Exp: {new Date(policy.expiryDate).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                          </p>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEdit(policy)}
                              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/60 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteId(policy.id)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Policy number + dates row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[11px] text-white/30">
                        Policy #{policy.policyNumber}
                      </span>
                      <span className="text-white/15 text-[10px]">·</span>
                      <span className="text-[11px] text-white/30">
                        Effective {new Date(policy.issueDate).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                      <span className="sm:hidden text-[11px] text-white/30">
                        → Exp: {new Date(policy.expiryDate).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                      {policy.notes && (
                        <>
                          <span className="text-white/15 text-[10px]">·</span>
                          <span className="text-[11px] text-white/30 italic truncate max-w-[200px]">{policy.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-lg bg-[#111] border border-white/[0.08] rounded-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-[15px] font-bold text-white/90">
                {editId ? "Edit Policy" : "Add Insurance Policy"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Holder */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Holder Name *</label>
                  <input value={form.holderName} onChange={(e) => f("holderName", e.target.value)} placeholder="ABC Subcontractors Inc." className={inp} />
                </div>
                <div>
                  <label className={lbl}>Holder Type</label>
                  <CustomSelect
                    value={form.holderType}
                    onChange={(v) => f("holderType", v)}
                    options={holderTypeOptions}
                  />
                </div>
              </div>

              {form.holderType === "worker" && workers.length > 0 && (
                <div>
                  <label className={lbl}>Worker</label>
                  <CustomSelect
                    value={form.workerId}
                    onChange={(v) => f("workerId", v)}
                    options={[{ value: "", label: "Select worker…" }, ...workerOptions]}
                  />
                </div>
              )}

              {/* Coverage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Coverage Type *</label>
                  <CustomSelect
                    value={form.coverageType}
                    onChange={(v) => f("coverageType", v as InsuranceCoverageType)}
                    options={coverageTypeOptions}
                  />
                </div>
                <div>
                  <label className={lbl}>Coverage Amount</label>
                  <input value={form.coverageAmount} onChange={(e) => f("coverageAmount", e.target.value)} placeholder="2000000" type="number" min="0" className={inp} />
                </div>
              </div>

              {/* Insurer + Policy # */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Insurance Company *</label>
                  <input value={form.insurer} onChange={(e) => f("insurer", e.target.value)} placeholder="Intact Insurance" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Policy Number *</label>
                  <input value={form.policyNumber} onChange={(e) => f("policyNumber", e.target.value)} placeholder="GL-2024-001234" className={inp} />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Effective Date</label>
                  <input value={form.issueDate} onChange={(e) => f("issueDate", e.target.value)} type="date" className={inp} />
                </div>
                <div>
                  <label className={lbl}>Expiry Date *</label>
                  <input value={form.expiryDate} onChange={(e) => f("expiryDate", e.target.value)} type="date" className={inp} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={lbl}>Notes</label>
                <textarea value={form.notes} onChange={(e) => f("notes", e.target.value)} placeholder="Additional notes…" rows={2} className={`${inp} resize-none`} />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-[13px] text-white/50 hover:bg-white/[0.04] transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] transition-all active:scale-95">
                  {editId ? "Save Changes" : "Add Policy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Delete policy?"
        message="This will permanently remove this insurance record."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteId) { deleteInsurancePolicy(deleteId); toast.success("Policy deleted"); }
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
