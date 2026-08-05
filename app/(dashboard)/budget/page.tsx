"use client";

import { useState, useMemo } from "react";
import { isAdminOrAbove } from "@/lib/permissions";
import {
  Plus, Search, Trash2, X, Pencil, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle2, ChevronDown,
} from "lucide-react";
import { ConfirmModal } from "@/components/confirm-modal";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import type { BudgetLine, BudgetLineCategory } from "@/lib/mock-data";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

const CATEGORY_CONFIG: Record<BudgetLineCategory, { label: string; color: string; dot: string }> = {
  labour:        { label: "Labour",        color: "text-blue-400",    dot: "bg-blue-400" },
  materials:     { label: "Materials",     color: "text-emerald-400", dot: "bg-emerald-400" },
  subcontractor: { label: "Subcontractor", color: "text-purple-400",  dot: "bg-purple-400" },
  equipment:     { label: "Equipment",     color: "text-amber-400",   dot: "bg-amber-400" },
  general:       { label: "General",       color: "text-zinc-400",    dot: "bg-zinc-400" },
  other:         { label: "Other",         color: "text-white/40",    dot: "bg-white/30" },
};

const CATEGORIES: BudgetLineCategory[] = ["labour", "materials", "subcontractor", "equipment", "general", "other"];

type LineForm = {
  projectId: string;
  code: string;
  description: string;
  category: BudgetLineCategory;
  budgeted: string;
  actual: string;
};

const emptyForm = (): LineForm => ({
  projectId: "",
  code: "",
  description: "",
  category: "labour",
  budgeted: "",
  actual: "",
});

function variance(b: BudgetLine) { return b.budgeted - b.actual; }
function variancePct(b: BudgetLine) {
  if (b.budgeted === 0) return 0;
  return ((b.budgeted - b.actual) / b.budgeted) * 100;
}

export default function BudgetPage() {
  const {
    currentUser, projects, budgetLines,
    addBudgetLine, updateBudgetLine, deleteBudgetLine,
    currency,
  } = useStore();

  const isAdmin = isAdminOrAbove(currentUser.role);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterCategory, setFilterCategory] = useState<BudgetLineCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<LineForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  const activeProjects = projects.filter((p) => p.status !== "completed");

  const projectOptions: SelectOption[] = [
    { value: "all", label: "All Projects" },
    ...activeProjects.map((p) => ({ value: p.id, label: p.name })),
  ];
  const projectFormOptions: SelectOption[] = activeProjects.map((p) => ({
    value: p.id, label: p.name,
  }));
  const categoryOptions: SelectOption[] = [
    { value: "all", label: "All Categories" },
    ...CATEGORIES.map((c) => ({ value: c, label: CATEGORY_CONFIG[c].label })),
  ];

  // Filtered lines
  const filtered = useMemo(() => {
    return budgetLines.filter((b) => {
      if (filterProject !== "all" && b.projectId !== filterProject) return false;
      if (filterCategory !== "all" && b.category !== filterCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        const proj = projects.find((p) => p.id === b.projectId);
        if (
          !b.code.toLowerCase().includes(q) &&
          !b.description.toLowerCase().includes(q) &&
          !proj?.name.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [budgetLines, filterProject, filterCategory, search, projects]);

  // Group by project
  const grouped = useMemo(() => {
    const map = new Map<string, BudgetLine[]>();
    filtered.forEach((b) => {
      const arr = map.get(b.projectId) ?? [];
      arr.push(b);
      map.set(b.projectId, arr);
    });
    return map;
  }, [filtered]);

  // Summary totals
  const totals = useMemo(() => {
    const total = filtered.reduce((acc, b) => ({
      budgeted: acc.budgeted + b.budgeted,
      actual: acc.actual + b.actual,
    }), { budgeted: 0, actual: 0 });
    return { ...total, variance: total.budgeted - total.actual };
  }, [filtered]);

  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm(), projectId: filterProject !== "all" ? filterProject : (activeProjects[0]?.id ?? "") });
    setShowForm(true);
  }

  function openEdit(b: BudgetLine) {
    setEditId(b.id);
    setForm({
      projectId: b.projectId,
      code: b.code,
      description: b.description,
      category: b.category,
      budgeted: String(b.budgeted),
      actual: String(b.actual),
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      projectId: form.projectId,
      code: form.code.trim(),
      description: form.description.trim(),
      category: form.category,
      budgeted: parseFloat(form.budgeted) || 0,
      actual: parseFloat(form.actual) || 0,
    };
    if (!data.projectId || !data.code || !data.description) return;
    if (editId) {
      updateBudgetLine(editId, data);
    } else {
      addBudgetLine(data);
    }
    closeForm();
  }

  function handleDelete() {
    if (deleteId) deleteBudgetLine(deleteId);
    setDeleteId(null);
  }

  const fmt = (n: number) => formatCurrency(n, currency);

  const varColor = (v: number) =>
    v > 0 ? "text-emerald-400" : v < 0 ? "text-red-400" : "text-white/40";

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#080808]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 md:px-6 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[17px] font-semibold text-white/90 tracking-tight">Budget</h1>
            <p className="text-[12px] text-white/35 mt-0.5">Cost code line items per project</p>
          </div>
          {isAdmin && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[12px] font-semibold px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} />
              Add Line
            </button>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: "Total Budgeted", value: fmt(totals.budgeted), icon: DollarSign, color: "text-white/60" },
            { label: "Total Actual",   value: fmt(totals.actual),   icon: TrendingUp, color: "text-blue-400" },
            {
              label: "Variance",
              value: fmt(Math.abs(totals.variance)),
              icon: totals.variance >= 0 ? TrendingDown : AlertTriangle,
              color: totals.variance > 0 ? "text-emerald-400" : totals.variance < 0 ? "text-red-400" : "text-white/40",
              prefix: totals.variance >= 0 ? "Under " : "Over ",
            },
          ].map(({ label, value, icon: Icon, color, prefix }) => (
            <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon size={13} className={color} />
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">{label}</span>
              </div>
              <p className={`text-[15px] font-bold ${color}`}>
                {prefix}{value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cost codes…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40"
            />
          </div>
          <div className="w-full sm:w-44">
            <CustomSelect
              options={projectOptions}
              value={filterProject}
              onChange={(v) => setFilterProject(v as string)}
              placeholder="All Projects"
            />
          </div>
          <div className="w-full sm:w-44">
            <CustomSelect
              options={categoryOptions}
              value={filterCategory}
              onChange={(v) => setFilterCategory(v as BudgetLineCategory | "all")}
              placeholder="All Categories"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-4 md:px-6 py-4 space-y-4">
        {grouped.size === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <DollarSign size={36} className="text-white/10 mb-3" />
            <p className="text-[14px] text-white/30 font-medium">No budget lines yet</p>
            <p className="text-[12px] text-white/20 mt-1">Add cost code line items to track your project spend</p>
            {isAdmin && (
              <button
                onClick={openAdd}
                className="mt-4 flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[12px] font-semibold px-4 py-2 rounded-lg transition-colors border border-amber-500/20"
              >
                <Plus size={13} /> Add First Line
              </button>
            )}
          </div>
        ) : (
          Array.from(grouped.entries()).map(([projectId, lines]) => {
            const proj = projects.find((p) => p.id === projectId);
            const projTotals = lines.reduce((acc, b) => ({
              budgeted: acc.budgeted + b.budgeted,
              actual: acc.actual + b.actual,
            }), { budgeted: 0, actual: 0 });
            const projVariance = projTotals.budgeted - projTotals.actual;
            const isExpanded = expandedProject === null || expandedProject === projectId;

            return (
              <div key={projectId} className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
                {/* Project header */}
                <button
                  onClick={() => setExpandedProject(isExpanded && grouped.size > 1 ? (expandedProject === projectId ? null : projectId) : null)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-semibold text-white/85">{proj?.name ?? "Unknown Project"}</span>
                    <span className="text-[11px] text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-full">{lines.length} lines</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:flex items-center gap-4 text-[12px]">
                      <span className="text-white/40">Budget: <span className="text-white/70 font-medium">{fmt(projTotals.budgeted)}</span></span>
                      <span className="text-white/40">Actual: <span className="text-blue-400 font-medium">{fmt(projTotals.actual)}</span></span>
                      <span className={`font-semibold ${projVariance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {projVariance >= 0 ? "▼" : "▲"} {fmt(Math.abs(projVariance))}
                      </span>
                    </div>
                    <ChevronDown size={14} className={`text-white/30 transition-transform ${!isExpanded ? "-rotate-90" : ""}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-t border-white/[0.04] bg-white/[0.02]">
                          <th className="text-left text-[10px] font-bold text-white/25 uppercase tracking-wider px-4 py-2">Code</th>
                          <th className="text-left text-[10px] font-bold text-white/25 uppercase tracking-wider px-3 py-2">Description</th>
                          <th className="text-left text-[10px] font-bold text-white/25 uppercase tracking-wider px-3 py-2">Category</th>
                          <th className="text-right text-[10px] font-bold text-white/25 uppercase tracking-wider px-3 py-2">Budgeted</th>
                          <th className="text-right text-[10px] font-bold text-white/25 uppercase tracking-wider px-3 py-2">Actual</th>
                          <th className="text-right text-[10px] font-bold text-white/25 uppercase tracking-wider px-3 py-2">Variance</th>
                          <th className="text-right text-[10px] font-bold text-white/25 uppercase tracking-wider px-3 py-2">%</th>
                          {isAdmin && <th className="px-3 py-2" />}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {lines.map((b) => {
                          const v = variance(b);
                          const pct = variancePct(b);
                          const cat = CATEGORY_CONFIG[b.category];
                          return (
                            <tr key={b.id} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-4 py-2.5 font-mono text-[11px] text-white/60 font-semibold whitespace-nowrap">{b.code}</td>
                              <td className="px-3 py-2.5 text-white/75 max-w-[200px] truncate">{b.description}</td>
                              <td className="px-3 py-2.5">
                                <span className={`flex items-center gap-1.5 ${cat.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cat.dot}`} />
                                  {cat.label}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-right text-white/60 font-mono">{fmt(b.budgeted)}</td>
                              <td className="px-3 py-2.5 text-right text-blue-400 font-mono">{fmt(b.actual)}</td>
                              <td className={`px-3 py-2.5 text-right font-mono font-semibold ${varColor(v)}`}>
                                {v >= 0 ? "" : "-"}{fmt(Math.abs(v))}
                              </td>
                              <td className={`px-3 py-2.5 text-right font-semibold ${varColor(v)}`}>
                                {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                              </td>
                              {isAdmin && (
                                <td className="px-3 py-2.5">
                                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => openEdit(b)}
                                      className="p-1 rounded hover:bg-white/[0.06] text-white/40 hover:text-white/70 transition-colors"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                    <button
                                      onClick={() => setDeleteId(b.id)}
                                      className="p-1 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-colors"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Project subtotal */}
                      <tfoot>
                        <tr className="border-t border-white/[0.06] bg-white/[0.02]">
                          <td colSpan={3} className="px-4 py-2 text-[10px] font-bold text-white/30 uppercase tracking-wider">Subtotal</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-white/60">{fmt(projTotals.budgeted)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-blue-400">{fmt(projTotals.actual)}</td>
                          <td className={`px-3 py-2 text-right font-mono font-bold ${varColor(projVariance)}`}>
                            {projVariance >= 0 ? "" : "-"}{fmt(Math.abs(projVariance))}
                          </td>
                          <td className={`px-3 py-2 text-right font-bold ${varColor(projVariance)}`}>
                            {projTotals.budgeted > 0
                              ? `${(((projTotals.budgeted - projTotals.actual) / projTotals.budgeted) * 100).toFixed(1)}%`
                              : "—"}
                          </td>
                          {isAdmin && <td />}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeForm} />
          <div className="relative w-full sm:max-w-lg bg-[#111] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[15px] font-semibold text-white/90">{editId ? "Edit Line Item" : "Add Budget Line"}</h2>
              <button onClick={closeForm} className="text-white/40 hover:text-white/70 transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={lbl}>Project *</label>
                <CustomSelect
                  options={projectFormOptions}
                  value={form.projectId}
                  onChange={(v) => setForm((f) => ({ ...f, projectId: v as string }))}
                  placeholder="Select project…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Cost Code *</label>
                  <input
                    className={inp}
                    placeholder="e.g. 03-100"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className={lbl}>Category *</label>
                  <CustomSelect
                    options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_CONFIG[c].label }))}
                    value={form.category}
                    onChange={(v) => setForm((f) => ({ ...f, category: v as BudgetLineCategory }))}
                    placeholder="Category"
                  />
                </div>
              </div>

              <div>
                <label className={lbl}>Description *</label>
                <input
                  className={inp}
                  placeholder="e.g. Concrete foundations"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Budgeted ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inp}
                    placeholder="0.00"
                    value={form.budgeted}
                    onChange={(e) => setForm((f) => ({ ...f, budgeted: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={lbl}>Actual ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inp}
                    placeholder="0.00"
                    value={form.actual}
                    onChange={(e) => setForm((f) => ({ ...f, actual: e.target.value }))}
                  />
                </div>
              </div>

              {/* Live variance preview */}
              {(form.budgeted || form.actual) && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-[11px] text-white/35">Variance preview</span>
                  {(() => {
                    const b = parseFloat(form.budgeted) || 0;
                    const a = parseFloat(form.actual) || 0;
                    const v = b - a;
                    return (
                      <span className={`text-[13px] font-bold font-mono ${varColor(v)}`}>
                        {v >= 0 ? "Under " : "Over "}{fmt(Math.abs(v))}
                      </span>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={closeForm}
                  className="flex-1 bg-white/[0.05] hover:bg-white/[0.08] text-white/60 text-[13px] font-medium py-2.5 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-black text-[13px] font-semibold py-2.5 rounded-lg transition-colors">
                  {editId ? "Save Changes" : "Add Line"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteId}
        title="Delete budget line?"
        body="This will permanently remove this cost code line item."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
