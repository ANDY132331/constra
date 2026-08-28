"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, AlertTriangle, Plus, Search, X, Pencil, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { format, isBefore } from "date-fns";
import { ConfirmModal } from "@/components/confirm-modal";
import { CustomSelect } from "@/components/ui/custom-select";

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  completed: { label: "Completed", icon: CheckCircle2, className: "text-green-400" },
  "in-progress": { label: "In Progress", icon: Clock, className: "text-amber-400" },
  "not-started": { label: "Not Started", icon: Circle, className: "text-blue-400" },
  delayed: { label: "Delayed", icon: AlertTriangle, className: "text-red-400" },
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "in-progress", label: "In Progress" },
  { key: "not-started", label: "Not Started" },
  { key: "delayed", label: "Delayed" },
  { key: "completed", label: "Completed" },
];

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

type TaskForm = {
  projectId: string; name: string; workerId: string;
  startDate: string; endDate: string;
  status: "not-started" | "in-progress" | "completed" | "delayed";
  progress: string;
};

const blankTask: TaskForm = {
  projectId: "", name: "", workerId: "", startDate: "", endDate: "", status: "not-started", progress: "0",
};

export default function TasksPage() {
  const { projects, workers, addTask, updateTask, deleteTask, getWorkerById, getProjectById } = useStore();
  const t = useT();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editTaskId, setEditTaskId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(blankTask);
  const [deleteTaskConfirm, setDeleteTaskConfirm] = useState<{ projectId: string; taskId: string; name: string } | null>(null);
  const today = new Date();

  const allTasks = projects.flatMap((p) =>
    p.tasks.map((t) => ({ ...t, projectId: p.id }))
  );

  const filtered = allTasks.filter((t) => {
    const worker = getWorkerById(t.workerId);
    const matchSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (worker?.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchProject = filterProject === "all" || t.projectId === filterProject;
    return matchSearch && matchStatus && matchProject;
  });

  const counts: Record<string, number> = { all: allTasks.length };
  FILTER_TABS.slice(1).forEach((tab) => {
    counts[tab.key] = allTasks.filter((t) => t.status === tab.key).length;
  });

  const openEdit = (task: typeof allTasks[0]) => {
    setEditTaskId(task.id);
    setEditProjectId(task.projectId);
    setForm({
      projectId: task.projectId,
      name: task.name,
      workerId: task.workerId,
      startDate: task.startDate.toISOString().split("T")[0],
      endDate: task.endDate.toISOString().split("T")[0],
      status: task.status,
      progress: task.progress.toString(),
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editTaskId && editProjectId) {
      updateTask(editProjectId, editTaskId, {
        name: form.name.trim(),
        workerId: form.workerId || undefined,
        startDate: form.startDate ? new Date(form.startDate) : undefined,
        endDate: form.endDate ? new Date(form.endDate) : undefined,
        status: form.status,
        progress: Math.min(100, Math.max(0, parseInt(form.progress) || 0)),
      });
    } else {
      if (!form.projectId) return;
      addTask(form.projectId, {
        name: form.name.trim(),
        workerId: form.workerId || (workers[0]?.id ?? ""),
        startDate: form.startDate ? new Date(form.startDate) : new Date(),
        endDate: form.endDate ? new Date(form.endDate) : new Date(Date.now() + 14 * 86400000),
        progress: 0,
        status: form.status,
      });
    }
    setForm(blankTask);
    setEditTaskId(null);
    setEditProjectId(null);
    setShowModal(false);
  };

  const handleDelete = (projectId: string, taskId: string, name: string) => {
    setDeleteTaskConfirm({ projectId, taskId, name });
  };

  const cycleStatus = (projectId: string, taskId: string, current: string) => {
    const cycle: Record<string, "not-started" | "in-progress" | "completed" | "delayed"> = {
      "not-started": "in-progress",
      "in-progress": "completed",
      "completed": "not-started",
      "delayed": "in-progress",
    };
    const next = cycle[current] ?? "in-progress";
    updateTask(projectId, taskId, { status: next });
  };

  return (
    <>
      {/* MOBILE */}
      <div className="lg:hidden -mx-4 -mt-4 pb-6">
        <div className="px-4 pt-5 pb-3 flex items-center justify-between">
          <h2 className="text-[22px] font-black text-white">Tasks</h2>
          <button
            onClick={() => { setEditTaskId(null); setEditProjectId(null); setForm(blankTask); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-amber-500 text-black font-bold text-[13px] px-4 py-2 rounded-xl"
          >
            <Plus size={15} /> New
          </button>
        </div>
        <div className="px-4 mb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
              className={`flex-shrink-0 text-[12px] font-bold px-3 py-1.5 rounded-full border transition-colors ${filterStatus === tab.key ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-[#131110] text-white/50 border-white/[0.07]"}`}>
              {tab.label} <span className="opacity-60">{counts[tab.key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="px-4 mb-3">
          <div className="flex items-center gap-2 bg-[#131110] border border-white/[0.07] rounded-xl px-4 py-3">
            <Search size={14} className="text-white/30" />
            <input className="bg-transparent text-[14px] text-white/80 placeholder:text-white/30 outline-none flex-1"
              placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="px-4 space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-white/25 text-[13px]">
              {allTasks.length === 0 ? "No tasks yet" : "No tasks match filters"}
            </div>
          )}
          {filtered.map((task) => {
            const mProject = getProjectById(task.projectId);
            const mWorker = getWorkerById(task.workerId);
            const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG["not-started"];
            const MIcon = cfg.icon;
            const isOverdueMobile = task.status !== "completed" && isBefore(task.endDate, today);
            return (
              <div key={task.id} className="bg-[#131110] border border-white/[0.07] rounded-xl p-4">
                <div className="flex items-start gap-3 mb-2">
                  <button onClick={() => cycleStatus(task.projectId, task.id, task.status)} className="mt-0.5 flex-shrink-0">
                    <MIcon size={16} className={cfg.className} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-white/90 leading-tight">{task.name}</p>
                    {mProject && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: mProject.color }} />
                        <span className="text-[12px] text-amber-400/80">{mProject.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {isOverdueMobile && <span className="text-[9px] font-bold bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full mr-1">OVERDUE</span>}
                    <button onClick={() => openEdit(task)} className="p-1.5 text-white/25 hover:text-white/60 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => handleDelete(task.projectId, task.id, task.name)} className="p-1.5 text-white/25 hover:text-red-400 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  {mWorker ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-black flex-shrink-0"
                        style={{ backgroundColor: mWorker.color + "25", color: mWorker.color }}>
                        {mWorker.photo ? <img src={mWorker.photo} alt={mWorker.name} className="w-full h-full object-cover" /> : mWorker.initials}
                      </div>
                      <span className="text-[11px] text-white/40">{mWorker.name.split(" ")[0]}</span>
                    </div>
                  ) : <span />}
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${task.progress}%`,
                        backgroundColor: task.status === "completed" ? "#22c55e" : task.status === "delayed" ? "#ef4444" : "#F5C400"
                      }} />
                    </div>
                    <span className="text-[10px] text-white/30">{task.progress}%</span>
                    <span className="text-[11px] text-white/25">{format(task.endDate, "MMM d")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block space-y-5 max-w-[1000px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Tasks</h2>
          <p className="text-white/35 text-sm mt-0.5">
            {allTasks.length} tasks across {projects.length} projects
          </p>
        </div>
        <button
          onClick={() => { setEditTaskId(null); setEditProjectId(null); setForm(blankTask); setShowModal(true); }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          New Task
        </button>
      </div>

      <div className="flex gap-1 bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-1 w-fit flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button key={tab.key} onClick={() => setFilterStatus(tab.key)}
            className={`text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors ${
              filterStatus === tab.key ? "bg-amber-500 text-black" : "text-white/40 hover:text-white/60"}`}>
            {tab.label} <span className="opacity-60">{counts[tab.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-2">
          <Search size={13} className="text-white/30" />
          <input className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none w-48"
            placeholder={`${t.common.search} tasks…`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <CustomSelect
          className="bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-white/60 outline-none"
          value={filterProject}
          onChange={(v) => setFilterProject(v)}
          options={[
            { value: "all", label: "All Projects" },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl">
      <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden min-w-[700px]">
        <div className="grid grid-cols-[1fr_160px_130px_120px_100px_80px_64px] text-[10px] font-bold uppercase tracking-widest text-white/25 px-5 py-3 border-b border-white/[0.05]">
          <span>Task</span><span>Project</span><span>Assigned To</span>
          <span>Due Date</span><span>Progress</span><span>Status</span><span></span>
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-white/25 text-[13px]">
            {allTasks.length === 0
              ? <span>No tasks yet — <button onClick={() => setShowModal(true)} className="text-amber-400 hover:text-amber-300">add one</button></span>
              : "No tasks match your filters"}
          </div>
        )}

        {filtered.map((task) => {
          const project = getProjectById(task.projectId);
          const worker = getWorkerById(task.workerId);
          const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG["not-started"];
          const Icon = cfg.icon;
          const isOverdue = task.status !== "completed" && isBefore(task.endDate, today);

          return (
            <div key={task.id} className="grid grid-cols-[1fr_160px_130px_120px_100px_80px_64px] items-center px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors last:border-0 group">
              <div className="flex items-center gap-3 min-w-0">
                <Icon size={15} className={cfg.className} />
                <span className="text-[13px] font-semibold text-white/80 truncate">{task.name}</span>
                {isOverdue && <span className="text-[9px] font-bold bg-red-500/15 text-red-400 px-1.5 py-0.5 rounded-full flex-shrink-0">OVERDUE</span>}
              </div>
              <div className="flex items-center gap-1.5 min-w-0">
                {project && <>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                  <span className="text-[12px] text-white/40 truncate">{project.name}</span>
                </>}
              </div>
              <div className="text-[12px] text-white/40 truncate">
                {worker ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center text-[7px] font-black flex-shrink-0"
                      style={{ backgroundColor: worker.color + "25", color: worker.color }}>
                      {worker.photo ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" /> : worker.initials}
                    </div>
                    <span>{worker.name.split(" ")[0]}</span>
                  </div>
                ) : "—"}
              </div>
              <div className="text-[12px] text-white/40">{format(task.endDate, "MMM d, yyyy")}</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${task.progress}%`,
                    backgroundColor: task.status === "completed" ? "#22c55e" : task.status === "delayed" ? "#ef4444" : "#F5C400",
                  }} />
                </div>
                <span className="text-[10px] text-white/30 w-8 text-right">{task.progress}%</span>
              </div>
              <button
                onClick={() => cycleStatus(task.projectId, task.id, task.status)}
                className="text-[10px] font-bold text-white/30 hover:text-amber-400 transition-colors text-center"
                title="Click to cycle status"
              >
                ↻
              </button>
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => openEdit(task)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-white/8 text-white/20 hover:text-white/60 transition-all">
                  <Pencil size={11} />
                </button>
                <button onClick={() => handleDelete(task.projectId, task.id, task.name)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/15 text-white/15 hover:text-red-400 transition-all">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      </div>

      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 sheet">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">{editTaskId ? "Edit Task" : "New Task"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!editTaskId && (
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
              <div>
                <label className={lbl}>Task Name *</label>
                <input className={inp} placeholder="e.g. Foundation Pour"
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Assign To</label>
                  <CustomSelect
                    className={inp}
                    value={form.workerId}
                    onChange={(v) => setForm((f) => ({ ...f, workerId: v }))}
                    options={[
                      { value: "", label: "Select worker" },
                      ...(() => {
                        const projectId = editProjectId ?? form.projectId;
                        const project = projects.find((p) => p.id === projectId);
                        const projectWorkerIds = project?.tasks.map((t) => t.workerId) ?? [];
                        const projectWorkers = workers.filter((w) => w.projectIds.includes(projectId) || projectWorkerIds.includes(w.id));
                        const list = projectWorkers.length > 0 ? projectWorkers : workers;
                        return list.map((w) => ({ value: w.id, label: w.name }));
                      })(),
                    ]}
                  />
                </div>
                <div>
                  <label className={lbl}>Status</label>
                  <CustomSelect
                    className={inp}
                    value={form.status}
                    onChange={(v) => setForm((f) => ({ ...f, status: v as TaskForm["status"] }))}
                    options={[
                      { value: "not-started", label: "Not Started" },
                      { value: "in-progress", label: "In Progress" },
                      { value: "delayed", label: "Delayed" },
                      { value: "completed", label: "Completed" },
                    ]}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Start Date</label>
                  <input className={inp} type="date" value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>End Date</label>
                  <input className={inp} type="date" value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={lbl}>Progress: {form.progress}%</label>
                <input
                  type="range" min="0" max="100" step="5"
                  value={form.progress}
                  onChange={(e) => setForm((f) => ({ ...f, progress: e.target.value }))}
                  className="w-full accent-amber-500"
                />
                <div className="flex justify-between text-[10px] text-white/25 mt-0.5">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setShowModal(false); setEditTaskId(null); setEditProjectId(null); }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
                {t.common.cancel}
              </button>
              <button onClick={handleSave} disabled={!editTaskId && (!form.projectId || !form.name.trim())}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editTaskId ? "Save Changes" : "Add Task"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTaskConfirm}
        title="Delete Task"
        body={deleteTaskConfirm ? `Delete "${deleteTaskConfirm.name}"? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={() => { if (deleteTaskConfirm) deleteTask(deleteTaskConfirm.projectId, deleteTaskConfirm.taskId); setDeleteTaskConfirm(null); }}
        onCancel={() => setDeleteTaskConfirm(null)}
      />
    </>
  );
}
