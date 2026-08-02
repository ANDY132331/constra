"use client";

import { useState } from "react";
import { Plus, Search, Circle, Timer, CheckCircle2, AlertCircle, MapPin, Calendar, X, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import { ConfirmModal } from "@/components/confirm-modal";
import { MicButton } from "@/components/mic-button";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";

const PRIORITY_CONFIG = {
  high: { label: "HIGH", className: "bg-red-500/15 text-red-400" },
  medium: { label: "MED", className: "bg-amber-500/15 text-amber-400" },
  low: { label: "LOW", className: "bg-white/8 text-white/40" },
};

const STATUS_CONFIG = {
  open: { label: "Open", icon: Circle, iconClass: "text-red-400" },
  "in-progress": { label: "In Progress", icon: Timer, iconClass: "text-amber-400" },
  resolved: { label: "Resolved", icon: CheckCircle2, iconClass: "text-green-400" },
};

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

type ItemForm = {
  projectId: string; title: string; description: string;
  priority: "low" | "medium" | "high";
  assignedToId: string; location: string; dueDate: string;
};

const blank: ItemForm = {
  projectId: "", title: "", description: "", priority: "medium",
  assignedToId: "", location: "", dueDate: "",
};

export default function PunchListPage() {
  const { punchItems, projects, workers, addPunchItem, updatePunchItem, deletePunchItem, getWorkerById, getProjectById } = useStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(blank);

  const filtered = punchItems.filter((item) => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (priorityFilter !== "all" && item.priority !== priorityFilter) return false;
    if (projectFilter !== "all" && item.projectId !== projectFilter) return false;
    return true;
  });

  const counts = {
    open: punchItems.filter((p) => p.status === "open").length,
    "in-progress": punchItems.filter((p) => p.status === "in-progress").length,
    resolved: punchItems.filter((p) => p.status === "resolved").length,
  };

  const isOverdue = (item: typeof punchItems[0]) =>
    item.dueDate && item.dueDate < new Date() && item.status !== "resolved";

  const openEdit = (item: typeof punchItems[0]) => {
    setEditId(item.id);
    setForm({
      projectId: item.projectId,
      title: item.title,
      description: item.description,
      priority: item.priority,
      assignedToId: item.assignedToId ?? "",
      location: item.location ?? "",
      dueDate: item.dueDate ? item.dueDate.toISOString().split("T")[0] : "",
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (!editId && !form.projectId) return;
    if (editId) {
      updatePunchItem(editId, {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        assignedToId: form.assignedToId || undefined,
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        location: form.location.trim() || undefined,
      });
    } else {
      addPunchItem({
        projectId: form.projectId,
        title: form.title.trim(),
        description: form.description.trim(),
        status: "open",
        priority: form.priority,
        assignedToId: form.assignedToId || undefined,
        createdAt: new Date(),
        dueDate: form.dueDate ? new Date(form.dueDate) : undefined,
        location: form.location.trim() || undefined,
      });
    }
    setForm(blank);
    setEditId(null);
    setShowModal(false);
  };

  return (
    <>
      {/* MOBILE */}
      <div className="lg:hidden -mx-4 -mt-4 pb-6">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h2 className="text-xl font-bold text-white tracking-tight">Punch List</h2>
          <button onClick={() => { setForm(blank); setEditId(null); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={14} />
            Add Item
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 px-4 mb-3">
          <div className="bg-[#131110] border border-white/[0.07] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-white">{punchItems.length}</p>
            <p className="text-[10px] text-white/40 mt-0.5">Total</p>
          </div>
          <div className="bg-[#131110] border border-white/[0.07] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-red-400">{counts.open}</p>
            <p className="text-[10px] text-white/40 mt-0.5">Open</p>
          </div>
          <div className="bg-[#131110] border border-white/[0.07] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-amber-400">{counts["in-progress"]}</p>
            <p className="text-[10px] text-white/40 mt-0.5">In Prog</p>
          </div>
          <div className="bg-[#131110] border border-white/[0.07] rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-400">{counts.resolved}</p>
            <p className="text-[10px] text-white/40 mt-0.5">Done</p>
          </div>
        </div>

        {/* Priority filter tabs */}
        <div className="flex gap-2 px-4 mb-3 overflow-x-auto scrollbar-none pb-0.5">
          {(["all", "low", "medium", "high"] as const).map((p) => (
            <button key={p} onClick={() => setPriorityFilter(p)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold transition-colors capitalize ${
                priorityFilter === p ? "bg-amber-500 text-black" : "bg-white/[0.06] text-white/40"
              }`}>
              {p === "all" ? "All" : p}
            </button>
          ))}
        </div>

        {/* Item cards */}
        <div className="px-4 space-y-2">
          {filtered.map((item) => {
            const project = getProjectById(item.projectId);
            const assignee = item.assignedToId ? getWorkerById(item.assignedToId) : null;
            const prioCfg = PRIORITY_CONFIG[item.priority];
            const statCfg = STATUS_CONFIG[item.status];
            const StatusIcon = statCfg.icon;
            const overdue = isOverdue(item);

            return (
              <div key={item.id} className={`bg-[#131110] border rounded-2xl p-4 ${overdue ? "border-red-500/25" : "border-white/[0.07]"}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <StatusIcon size={14} className={`flex-shrink-0 ${statCfg.iconClass}`} />
                    <p className="text-[14px] font-bold text-white/85 leading-tight">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prioCfg.className}`}>{prioCfg.label}</span>
                    {overdue && <span className="text-[9px] bg-red-500/15 text-red-400 font-bold px-1.5 py-0.5 rounded-full">LATE</span>}
                  </div>
                </div>
                {item.description && (
                  <p className="text-[12px] text-white/45 mb-2 leading-relaxed line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center gap-3 flex-wrap text-[11px] text-white/35 mb-3">
                  {project && (
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                      <span>{project.name}</span>
                    </div>
                  )}
                  {item.location && (
                    <div className="flex items-center gap-1">
                      <MapPin size={9} />
                      <span>{item.location}</span>
                    </div>
                  )}
                  {assignee && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                        style={{ backgroundColor: assignee.color + "30", color: assignee.color }}>
                        {assignee.photo
                          ? <img src={assignee.photo} alt={assignee.name} className="w-full h-full object-cover" />
                          : assignee.initials}
                      </div>
                      <span>{assignee.name}</span>
                    </div>
                  )}
                  {item.dueDate && (
                    <div className={`flex items-center gap-1 ${overdue ? "text-red-400 font-semibold" : ""}`}>
                      <Calendar size={9} />
                      <span>Due {item.dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
                  {item.status === "open" && (
                    <button onClick={() => updatePunchItem(item.id, { status: "in-progress" })}
                      className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg transition-colors">
                      Start
                    </button>
                  )}
                  {item.status !== "resolved" && (
                    <button onClick={() => updatePunchItem(item.id, { status: "resolved" })}
                      className="text-[11px] font-semibold text-green-400 bg-green-500/10 px-3 py-1 rounded-lg transition-colors">
                      Resolve
                    </button>
                  )}
                  {item.status === "resolved" && (
                    <button onClick={() => updatePunchItem(item.id, { status: "open" })}
                      className="text-[11px] font-semibold text-white/30 bg-white/5 px-3 py-1 rounded-lg transition-colors">
                      Reopen
                    </button>
                  )}
                  <div className="flex items-center gap-1 ml-auto">
                    <button onClick={() => openEdit(item)}
                      className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-all">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteConfirm(item.id)}
                      className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-all">
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-white/25 space-y-2">
              <CheckCircle2 size={36} className="mx-auto opacity-30" />
              <p className="text-[13px] font-semibold">
                {punchItems.length === 0 ? "No punch items yet" : "No items match your filters"}
              </p>
              {punchItems.length === 0 && (
                <button onClick={() => setShowModal(true)} className="text-amber-400 text-[12px] hover:text-amber-300 transition-colors">
                  + Add your first item
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block">
        <div className="space-y-5 max-w-[1100px]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Punch List</h2>
              <p className="text-white/35 text-sm mt-0.5">Track and resolve defects, issues, and site observations</p>
            </div>
            <button onClick={() => { setForm(blank); setEditId(null); setShowModal(true); }}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors">
              <Plus size={15} />
              Add Item
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["open", "in-progress", "resolved"] as const).map((status) => {
              const cfg = STATUS_CONFIG[status];
              const Icon = cfg.icon;
              const isActive = statusFilter === status;
              return (
                <button key={status} onClick={() => setStatusFilter(isActive ? "all" : status)}
                  className={`bg-[#111111] border rounded-xl p-4 text-left transition-all ${isActive ? "border-amber-500/40" : "border-white/[0.06] hover:border-white/10"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon size={15} className={cfg.iconClass} />
                    <span className="text-[12px] font-semibold text-white/60">{cfg.label}</span>
                  </div>
                  <p className="text-3xl font-bold text-white">{counts[status]}</p>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-2 flex-1 max-w-56">
              <Search size={13} className="text-white/30" />
              <input className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1"
                placeholder="Search items…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <CustomSelect
              className="bg-[#111111] border border-white/[0.06] text-white/55 text-[12px] rounded-lg px-3 py-2 outline-none cursor-pointer"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={[
                { value: "all", label: "All Statuses" },
                { value: "open", label: "Open" },
                { value: "in-progress", label: "In Progress" },
                { value: "resolved", label: "Resolved" },
              ]}
            />
            <CustomSelect
              className="bg-[#111111] border border-white/[0.06] text-white/55 text-[12px] rounded-lg px-3 py-2 outline-none cursor-pointer"
              value={priorityFilter}
              onChange={(v) => setPriorityFilter(v)}
              options={[
                { value: "all", label: "All Priorities" },
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
            />
            <CustomSelect
              className="bg-[#111111] border border-white/[0.06] text-white/55 text-[12px] rounded-lg px-3 py-2 outline-none cursor-pointer"
              value={projectFilter}
              onChange={(v) => setProjectFilter(v)}
              options={[
                { value: "all", label: "All Projects" },
                ...projects.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
            <span className="text-[12px] text-white/30 ml-auto">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          <div className="space-y-2">
            {filtered.map((item) => {
              const project = getProjectById(item.projectId);
              const assignee = item.assignedToId ? getWorkerById(item.assignedToId) : null;
              const prioCfg = PRIORITY_CONFIG[item.priority];
              const statCfg = STATUS_CONFIG[item.status];
              const StatusIcon = statCfg.icon;
              const overdue = isOverdue(item);

              return (
                <div key={item.id} className={`bg-[#111111] border rounded-xl p-4 hover:border-white/10 transition-all group ${overdue ? "border-red-500/25" : "border-white/[0.06]"}`}>
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 flex-shrink-0">
                      <StatusIcon size={16} className={statCfg.iconClass} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-bold text-white/85">{item.title}</p>
                          {overdue && <span className="text-[10px] bg-red-500/15 text-red-400 font-bold px-2 py-0.5 rounded-full">OVERDUE</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prioCfg.className}`}>{prioCfg.label}</span>
                          <button onClick={() => openEdit(item)}
                            className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/60 transition-all">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => setDeleteConfirm(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                      {item.description && <p className="text-[12px] text-white/45 mb-3 leading-relaxed">{item.description}</p>}
                      <div className="flex items-center gap-4 flex-wrap text-[11px] text-white/30">
                        {project && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                            <span>{project.name}</span>
                          </div>
                        )}
                        {item.location && <div className="flex items-center gap-1"><MapPin size={10} /><span>{item.location}</span></div>}
                        {assignee && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold"
                              style={{ backgroundColor: assignee.color + "30", color: assignee.color }}>
                              {assignee.photo ? <img src={assignee.photo} alt={assignee.name} className="w-full h-full object-cover" /> : assignee.initials}
                            </div>
                            <span>{assignee.name}</span>
                          </div>
                        )}
                        {item.dueDate && (
                          <div className={`flex items-center gap-1 ${overdue ? "text-red-400 font-semibold" : ""}`}>
                            <Calendar size={10} />
                            <span>Due {item.dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.05]">
                    {item.status === "open" && (
                      <button onClick={() => updatePunchItem(item.id, { status: "in-progress" })}
                        className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 px-3 py-1 rounded-lg transition-colors">
                        Start Work
                      </button>
                    )}
                    {item.status !== "resolved" && (
                      <button onClick={() => updatePunchItem(item.id, { status: "resolved" })}
                        className="text-[11px] font-semibold text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/15 px-3 py-1 rounded-lg transition-colors">
                        Mark Resolved
                      </button>
                    )}
                    {item.status === "resolved" && (
                      <button onClick={() => updatePunchItem(item.id, { status: "open" })}
                        className="text-[11px] font-semibold text-white/30 hover:text-white/60 bg-white/5 hover:bg-white/8 px-3 py-1 rounded-lg transition-colors">
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-white/25 space-y-2">
                <CheckCircle2 size={40} className="mx-auto opacity-30" />
                <p className="text-[14px] font-semibold">
                  {punchItems.length === 0 ? "No punch items yet" : "No items match your filters"}
                </p>
                {punchItems.length === 0 && (
                  <button onClick={() => setShowModal(true)} className="text-amber-400 text-[12px] hover:text-amber-300 transition-colors">
                    + Add your first item
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">{editId ? "Edit Item" : "Add Punch Item"}</h3>
              <button onClick={() => { setShowModal(false); setEditId(null); }} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Title *</label>
                <input className={inp} placeholder="e.g. Crack in south wall"
                  value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold text-white/35 uppercase tracking-wider">Description</label>
                  <MicButton size="sm" onResult={(t) => setForm((f) => ({ ...f, description: (f.description ? f.description + " " : "") + t.trim() }))} />
                </div>
                <textarea className={inp + " resize-none"} rows={3} placeholder="Describe the issue..."
                  value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!editId && (
                  <div>
                    <label className={lbl}>Project *</label>
                    <CustomSelect
                      className={inp}
                      value={form.projectId}
                      onChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
                      options={[
                        { value: "", label: "Select project" },
                        ...projects.map((p) => ({ value: p.id, label: p.name })),
                      ]}
                    />
                  </div>
                )}
                <div className={editId ? "col-span-2" : ""}>
                  <label className={lbl}>Priority</label>
                  <CustomSelect
                    className={inp}
                    value={form.priority}
                    onChange={(v) => setForm((f) => ({ ...f, priority: v as ItemForm["priority"] }))}
                    options={[
                      { value: "low", label: "Low" },
                      { value: "medium", label: "Medium" },
                      { value: "high", label: "High" },
                    ]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Assign To</label>
                  <CustomSelect
                    className={inp}
                    value={form.assignedToId}
                    onChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}
                    options={[
                      { value: "", label: "Select worker" },
                      ...workers.map((w) => ({ value: w.id, label: w.name })),
                    ]}
                  />
                </div>
                <div>
                  <label className={lbl}>Due Date</label>
                  <input className={inp} type="date" value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={lbl}>Location</label>
                <input className={inp} placeholder="e.g. Building A, 3rd Floor"
                  value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setShowModal(false); setEditId(null); }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!form.title.trim() || (!editId && !form.projectId)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editId ? "Save Changes" : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Punch Item"
        body="Delete this punch list item? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) deletePunchItem(deleteConfirm); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}
