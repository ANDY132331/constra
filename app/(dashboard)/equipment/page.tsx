"use client";

import { useState, useEffect } from "react";
import { Plus, Search, AlertTriangle, X, Pencil, Trash2, Truck } from "lucide-react";
import { useStore } from "@/lib/store";
import { ConfirmModal } from "@/components/confirm-modal";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { useSearchPrefill } from "@/lib/use-search-prefill";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";
import { isAdminOrAbove } from "@/lib/permissions";

const STATUS_CONFIG = {
  available:   { label: "Available",   className: "bg-green-500/15 text-green-400",  dot: "#22c55e" },
  "in-use":    { label: "In Use",      className: "bg-blue-500/15 text-blue-400",    dot: "#3b82f6" },
  maintenance: { label: "Maintenance", className: "bg-amber-500/15 text-amber-400",  dot: "#F5C400" },
  "off-site":  { label: "Off Site",    className: "bg-white/8 text-white/40",        dot: "#666"    },
};

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

type EqForm = {
  name: string; type: string;
  status: "available" | "in-use" | "maintenance" | "off-site";
  projectId: string; dailyRate: string;
  lastService: string; nextService: string; certExpiry: string;
};

const blank: EqForm = {
  name: "", type: "", status: "available",
  projectId: "", dailyRate: "",
  lastService: "", nextService: "", certExpiry: "",
};

export default function EquipmentPage() {
  const { equipment, projects, addEquipment, updateEquipment, deleteEquipment, getProjectById, currency, currentUser } = useStore();
  const isAdmin = isAdminOrAbove(currentUser.role);
  const t = useT();
  const prefill = useSearchPrefill("/equipment");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => { if (prefill) setSearch(prefill); }, [prefill]);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EqForm>(blank);

  const filtered = equipment.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.type.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  const totalDailyValue = equipment.filter((e) => e.status === "in-use").reduce((s, e) => s + e.dailyRate, 0);
  const needsService = equipment.filter((e) => e.nextService <= new Date());

  function openAdd() {
    setEditId(null);
    setForm(blank);
    setShowModal(true);
  }

  function openEdit(eq: typeof equipment[0]) {
    setEditId(eq.id);
    setForm({
      name: eq.name,
      type: eq.type,
      status: eq.status,
      projectId: eq.projectId ?? "",
      dailyRate: eq.dailyRate.toString(),
      lastService: eq.lastService.toISOString().split("T")[0],
      nextService: eq.nextService.toISOString().split("T")[0],
      certExpiry: eq.certExpiry ? eq.certExpiry.toISOString().split("T")[0] : "",
    });
    setShowModal(true);
  }

  const handleSave = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      type: form.type.trim(),
      status: form.status,
      projectId: form.projectId || undefined,
      dailyRate: parseFloat(form.dailyRate) || 0,
      lastService: form.lastService ? new Date(form.lastService) : new Date(),
      nextService: form.nextService ? new Date(form.nextService) : new Date(Date.now() + 90 * 86400000),
      certExpiry: form.certExpiry ? new Date(form.certExpiry) : undefined,
    };
    if (editId) {
      updateEquipment(editId, payload);
    } else {
      addEquipment(payload);
    }
    setForm(blank);
    setEditId(null);
    setShowModal(false);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  return (
    <>
      {/* MOBILE */}
      <div className="lg:hidden -mx-4 -mt-4 pb-6">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-xl font-bold text-white tracking-tight">Equipment</h2>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={14} />
            Add
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 px-4 mb-3">
          {(["available", "in-use", "maintenance", "off-site"] as const).map((status) => {
            const cfg = STATUS_CONFIG[status];
            const count = equipment.filter((e) => e.status === status).length;
            return (
              <button key={status}
                onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                className={`bg-[#131110] border rounded-xl p-3 text-center transition-all ${statusFilter === status ? "border-amber-500/40" : "border-white/[0.07]"}`}>
                <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: cfg.dot }} />
                <p className="text-xl font-bold text-white">{count}</p>
                <p className="text-[9px] text-white/40 mt-0.5 leading-tight">{cfg.label}</p>
              </button>
            );
          })}
        </div>

        {/* Service alert */}
        {needsService.length > 0 && (
          <div className="mx-4 mb-3 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-amber-300">{needsService.length} unit{needsService.length > 1 ? "s" : ""} due for service</p>
              <p className="text-[11px] text-amber-400/60 truncate">{needsService.map((e) => e.name).join(", ")}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2 bg-[#131110] border border-white/[0.07] rounded-xl px-3 py-2.5">
            <Search size={13} className="text-white/30 flex-shrink-0" />
            <input
              className="bg-transparent text-[13px] text-white/70 placeholder:text-white/25 outline-none flex-1"
              placeholder="Search equipment…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Equipment cards */}
        <div className="px-4 space-y-2">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Truck}
              title={equipment.length === 0 ? "No equipment yet" : "No equipment found"}
              body={equipment.length === 0
                ? "Track vehicles, machinery, and tools — assign them to projects and log service dates."
                : "Try changing your search or status filter."}
              action={equipment.length === 0 && isAdmin ? { label: "Add Equipment", onClick: openAdd } : undefined}
              isFiltered={equipment.length > 0 && filtered.length === 0}
            />
          ) : (
            filtered.map((eq) => {
              const project = eq.projectId ? getProjectById(eq.projectId) : null;
              const cfg = STATUS_CONFIG[eq.status];
              const serviceOverdue = eq.nextService <= new Date();
              return (
                <div key={eq.id} className="bg-[#131110] border border-white/[0.07] rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-white/85">{eq.name}</p>
                      {eq.type && <p className="text-[11px] text-white/35 mt-0.5">{eq.type}</p>}
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.className}`}>{cfg.label}</span>
                  </div>
                  {project && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                      <span className="text-[12px] text-amber-400/80">{project.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-[11px] text-white/35 mb-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <span className="text-white/25">Next svc:</span>
                      <span className={serviceOverdue ? "text-red-400 font-semibold" : ""}>
                        {serviceOverdue ? "OVERDUE" : eq.nextService.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {eq.certExpiry && (
                      <div className={eq.certExpiry < new Date() ? "text-red-400" : ""}>
                        Cert: {eq.certExpiry.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "2-digit" })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
                    <span className="text-[12px] font-semibold text-amber-400">{formatCurrency(eq.dailyRate, currency as never)}/day</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(eq)}
                        className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-all">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(eq.id, eq.name)}
                        className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block">
        <div className="space-y-5 max-w-[1100px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Equipment</h2>
              <p className="text-white/35 text-sm mt-0.5">
                {equipment.filter((e) => e.status === "in-use").length} units deployed · {formatCurrencyCompact(totalDailyValue, currency as never)}/day active cost
              </p>
            </div>
            <button onClick={openAdd}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors">
              <Plus size={15} />
              Add Equipment
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["available", "in-use", "maintenance", "off-site"] as const).map((status) => {
              const cfg = STATUS_CONFIG[status];
              const count = equipment.filter((e) => e.status === status).length;
              return (
                <button key={status} onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}
                  className={`bg-[#111111] border rounded-xl p-4 text-left transition-all ${statusFilter === status ? "border-amber-500/40" : "border-white/[0.06] hover:border-white/10"}`}>
                  <div className="w-2.5 h-2.5 rounded-full mb-2" style={{ backgroundColor: cfg.dot }} />
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{cfg.label}</p>
                </button>
              );
            })}
          </div>

          {needsService.length > 0 && (
            <div className="bg-amber-500/[0.07] border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[13px] font-bold text-amber-300">{needsService.length} unit{needsService.length > 1 ? "s" : ""} due for service</p>
                <p className="text-[12px] text-amber-400/60 mt-0.5">{needsService.map((e) => e.name).join(", ")}</p>
              </div>
              <button onClick={() => { const first = needsService[0]; if (first) openEdit(first); }}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors">
                Update Service Date
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-2 max-w-56">
              <Search size={13} className="text-white/30" />
              <input className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1"
                placeholder={`${t.common.search} equipment…`} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {equipment.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No equipment yet"
              body="Track vehicles, machinery, and tools — assign them to projects and log service dates."
              action={isAdmin ? { label: "Add Equipment", onClick: openAdd } : undefined}
            />
          ) : (
            <div className="overflow-x-auto rounded-xl">
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden min-w-[860px]">
              <div className="grid text-[10px] font-bold uppercase tracking-widest text-white/25 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]"
                style={{ gridTemplateColumns: "2fr 120px 100px 1fr 100px 100px 80px 64px" }}>
                <span>Equipment</span><span>Type</span><span>Status</span>
                <span>Deployed To</span><span>Last Service</span><span>Next Service</span>
                <span className="text-right">Daily Rate</span><span></span>
              </div>
              {filtered.map((eq) => {
                const project = eq.projectId ? getProjectById(eq.projectId) : null;
                const cfg = STATUS_CONFIG[eq.status];
                const serviceOverdue = eq.nextService <= new Date();
                return (
                  <div key={eq.id} className="grid items-center px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
                    style={{ gridTemplateColumns: "2fr 120px 100px 1fr 100px 100px 80px 64px" }}>
                    <div>
                      <p className="text-[13px] font-bold text-white/80 group-hover:text-white transition-colors">{eq.name}</p>
                      {eq.certExpiry && (
                        <p className={`text-[10px] mt-0.5 ${eq.certExpiry < new Date() ? "text-red-400" : "text-white/30"}`}>
                          Cert expires {eq.certExpiry.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <span className="text-[12px] text-white/45">{eq.type}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-fit ${cfg.className}`}>{cfg.label}</span>
                    <span className="text-[12px] text-white/45 truncate pr-2">
                      {project ? (
                        <span className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} />
                          {project.name}
                        </span>
                      ) : "—"}
                    </span>
                    <span className="text-[12px] text-white/40">
                      {eq.lastService.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </span>
                    <span className={`text-[12px] font-semibold ${serviceOverdue ? "text-red-400" : "text-white/40"}`}>
                      {serviceOverdue ? "OVERDUE" : eq.nextService.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </span>
                    <span className="text-right text-[12px] font-semibold text-amber-400">{formatCurrency(eq.dailyRate, currency as never)}/d</span>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(eq)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-white/8 text-white/30 hover:text-white/70 transition-all">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => handleDelete(eq.id, eq.name)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 sheet">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">{editId ? "Edit Equipment" : "Add Equipment"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Equipment Name *</label>
                <input className={inp} placeholder="e.g. CAT 320 Excavator"
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Type</label>
                  <input className={inp} placeholder="e.g. Heavy Equipment"
                    value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Status</label>
                  <CustomSelect
                    className={inp}
                    value={form.status}
                    onChange={(v) => {
                      const st = v as EqForm["status"];
                      setForm((f) => ({ ...f, status: st, projectId: st !== "in-use" ? "" : f.projectId }));
                    }}
                    options={[
                      { value: "available", label: "Available" },
                      { value: "in-use", label: "In Use" },
                      { value: "maintenance", label: "Maintenance" },
                      { value: "off-site", label: "Off Site" },
                    ]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Deployed To</label>
                  <CustomSelect
                    className={inp}
                    value={form.projectId}
                    onChange={(v) => {
                      const pid = v;
                      setForm((f) => ({ ...f, projectId: pid, status: pid ? "in-use" : f.status === "in-use" ? "available" : f.status }));
                    }}
                    options={[
                      { value: "", label: "None" },
                      ...projects.map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />
                </div>
                <div>
                  <label className={lbl}>Daily Rate ({currency})</label>
                  <input className={inp} type="number" min="0" placeholder="0"
                    value={form.dailyRate} onChange={(e) => setForm((f) => ({ ...f, dailyRate: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Last Service</label>
                  <input className={inp} type="date" value={form.lastService}
                    onChange={(e) => setForm((f) => ({ ...f, lastService: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Next Service</label>
                  <input className={inp} type="date" value={form.nextService}
                    onChange={(e) => setForm((f) => ({ ...f, nextService: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={lbl}>Cert Expiry (optional)</label>
                <input className={inp} type="date" value={form.certExpiry}
                  onChange={(e) => setForm((f) => ({ ...f, certExpiry: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">{t.common.cancel}</button>
              <button onClick={handleSave} disabled={!form.name.trim()}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editId ? "Save Changes" : "Add Equipment"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Equipment"
        body={deleteConfirm ? `Delete "${deleteConfirm.name}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) deleteEquipment(deleteConfirm.id); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
