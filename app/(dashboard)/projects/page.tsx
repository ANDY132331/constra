"use client";

import { useState, useRef, useEffect } from "react";
import { BarChart2, List, CalendarDays, Plus, Search, MapPin, ArrowUpRight, X, CheckCircle2, Clock, AlertCircle, Circle, Map, Trash2, Pencil, ShieldCheck, Share2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { GanttChart, type GanttProject } from "@/components/gantt-chart";
import { UpgradeGate, UsageBadge } from "@/components/upgrade-gate";
import { formatCurrencyCompact } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { MapView } from "@/components/map-view";
import { isAdminOrAbove, isForemanOrAbove } from "@/lib/permissions";
import { ConfirmModal } from "@/components/confirm-modal";

type View = "gantt" | "table" | "cards" | "map";

const COLORS = ["#f59e0b","#3b82f6","#8b5cf6","#22c55e","#ef4444","#06b6d4","#ec4899","#f97316"];
const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

function StatusBadge({ status, pending }: { status: string; pending?: boolean }) {
  if (pending) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Pending Approval</span>;
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-green-500/15 text-green-400" },
    upcoming: { label: "Upcoming", className: "bg-blue-500/15 text-blue-400" },
    completed: { label: "Completed", className: "bg-white/8 text-white/40" },
  };
  const s = map[status] ?? map.active;
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.className}`}>{s.label}</span>;
}

const taskStatusIcon = {
  completed: <CheckCircle2 size={13} className="text-green-400" />,
  "in-progress": <Clock size={13} className="text-amber-400" />,
  "not-started": <Circle size={13} className="text-white/20" />,
  delayed: <AlertCircle size={13} className="text-red-400" />,
};

type FormState = {
  name: string; client: string; address: string;
  gpsLat: string; gpsLng: string;
  status: "active" | "upcoming" | "completed";
  startDate: string; endDate: string;
  budget: string; color: string; managerId: string;
};

const blank: FormState = {
  name: "", client: "", address: "", gpsLat: "", gpsLng: "",
  status: "active", startDate: "", endDate: "", budget: "", color: "#f59e0b", managerId: "",
};

export default function ProjectsPage() {
  const { projects, workers, addProject, updateProject, deleteProject, approveProject, getWorkerById, currency, currentUser, updateTask } = useStore();
  const isAdmin = isAdminOrAbove(currentUser.role);
  const isForeman = isForemanOrAbove(currentUser.role);
  const t = useT();
  const [view, setView] = useState<View>("gantt");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  type GeoResult = { display_name: string; lat: string; lon: string };
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoQuery, setGeoQuery] = useState("");
  const [geoConfirmed, setGeoConfirmed] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState<string | null>(null);

  const copyShare = (projectId: string) => {
    const url = `${window.location.origin}/share/${projectId}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(projectId);
      setTimeout(() => setShareCopied(null), 2000);
    });
  };
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openEdit = (project: typeof projects[0]) => {
    setEditId(project.id);
    setForm({
      name: project.name,
      client: project.client,
      address: project.address,
      gpsLat: project.gps?.lat.toString() ?? "",
      gpsLng: project.gps?.lng.toString() ?? "",
      status: project.status,
      startDate: project.startDate.toISOString().split("T")[0],
      endDate: project.endDate.toISOString().split("T")[0],
      budget: project.budget.toString(),
      color: project.color,
      managerId: project.managerId,
    });
    if (project.gps) setGeoConfirmed(project.address || `${project.gps.lat.toFixed(5)}, ${project.gps.lng.toFixed(5)}`);
    setShowModal(true);
  };

  const handleGeoSearch = (q: string) => {
    setGeoQuery(q);
    setGeoConfirmed("");
    if (geoTimer.current) clearTimeout(geoTimer.current);
    if (!q.trim()) { setGeoResults([]); return; }
    geoTimer.current = setTimeout(async () => {
      setGeoLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const data: GeoResult[] = await res.json();
        setGeoResults(data);
      } catch { setGeoResults([]); }
      setGeoLoading(false);
    }, 350);
  };

  const handleGeoSelect = (r: GeoResult) => {
    setForm((f) => ({ ...f, gpsLat: r.lat, gpsLng: r.lon }));
    setGeoConfirmed(r.display_name);
    setGeoQuery("");
    setGeoResults([]);
  };

  // Pending projects go to an approval section for admins; foremen see their own in normal list
  const pendingProjects = isAdmin ? projects.filter((p) => p.pendingApproval) : [];
  const filtered = projects.filter((p) => {
    if (p.pendingApproval && isAdmin) return false; // admins see pending in a separate section
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.client.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const ganttProjects: GanttProject[] = filtered
    .filter((p) => p.status !== "completed")
    .map((p) => ({
      id: p.id,
      name: p.name,
      clientName: p.client,
      accentColor: p.color,
      tasks: p.tasks.map((t) => {
        const worker = getWorkerById(t.workerId);
        return {
          id: t.id, name: t.name, progress: t.progress,
          workerName: worker?.name ?? "Unassigned",
          workerColor: worker?.color ?? "#666",
          workerInitials: worker?.initials ?? "??",
          startDate: t.startDate, endDate: t.endDate, color: p.color, status: t.status, dependsOn: t.dependsOn,
        };
      }),
    }));

  const VIEWS: { id: View; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { id: "gantt", label: "Gantt", icon: BarChart2 },
    { id: "table", label: "Table", icon: List },
    { id: "cards", label: "Cards", icon: CalendarDays },
    { id: "map", label: "Map", icon: Map },
  ];

  const mapPins = filtered
    .filter((p) => p.gps)
    .map((p) => ({
      lat: p.gps!.lat,
      lng: p.gps!.lng,
      label: p.name,
      sublabel: p.client || p.status,
      color: p.color,
    }));

  const handleSave = () => {
    setFormError("");
    if (!form.name.trim()) return;
    if (form.startDate && form.endDate && new Date(form.endDate) <= new Date(form.startDate)) {
      setFormError("End date must be after start date.");
      return;
    }
    const lat = parseFloat(form.gpsLat);
    const lng = parseFloat(form.gpsLng);
    const gps = !isNaN(lat) && !isNaN(lng) ? { lat, lng, accuracy: 0 } : undefined;
    const payload = {
      name: form.name.trim(),
      client: form.client.trim(),
      address: form.address.trim(),
      gps,
      status: form.status,
      startDate: form.startDate ? new Date(form.startDate) : new Date(),
      endDate: form.endDate ? new Date(form.endDate) : new Date(Date.now() + 90 * 86400000),
      budget: parseFloat(form.budget) || 0,
      color: form.color,
      managerId: form.managerId,
    };
    if (editId) {
      updateProject(editId, payload);
    } else {
      addProject({
        ...payload,
        progress: 0, spent: 0,
        workerIds: form.managerId ? [form.managerId] : [],
        pendingApproval: !isAdmin,
        createdBy: currentUser.id,
      });
    }
    setForm(blank);
    setEditId(null);
    setGeoQuery("");
    setGeoResults([]);
    setGeoConfirmed("");
    setShowModal(false);
  };

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* ── Pending Approval (admin only) ────────────────────────────────── */}
      {isAdmin && pendingProjects.length > 0 && (
        <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-amber-400 flex-shrink-0" />
            <h3 className="text-[13px] font-bold text-amber-400">
              {pendingProjects.length} project{pendingProjects.length !== 1 ? "s" : ""} awaiting your approval
            </h3>
          </div>
          {pendingProjects.map((p) => {
            const creator = workers.find((w) => w.id === p.createdBy);
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 bg-[#0d0d0d] border border-white/[0.06] rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{p.name}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {p.client ? `${p.client} · ` : ""}Submitted by {creator?.name ?? "Unknown"}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setDeleteConfirm(p.id)}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveProject(p.id)}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
                  >
                    Approve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Projects</h2>
            <UsageBadge feature="activeProjects" count={projects.filter((p) => p.status === "active").length} />
          </div>
          <p className="text-white/35 text-sm mt-0.5">
            {projects.filter((p) => p.status === "active" && !p.pendingApproval).length} active ·{" "}
            {projects.filter((p) => p.status === "upcoming" && !p.pendingApproval).length} upcoming ·{" "}
            {projects.filter((p) => p.status === "completed").length} completed
          </p>
        </div>
        {isForeman && (
          <UpgradeGate feature="activeProjects" currentCount={projects.filter((p) => p.status === "active").length} softWarn={false}>
            <button
              onClick={() => { setEditId(null); setForm(blank); setGeoConfirmed(""); setShowModal(true); }}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={15} />
              {isAdmin ? "New Project" : "Submit Project"}
            </button>
          </UpgradeGate>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-[#111111] border border-white/[0.06] rounded-lg p-0.5 gap-0.5">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                view === id ? "bg-amber-500 text-black" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}>
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-1.5 flex-1 max-w-64">
          <Search size={13} className="text-white/30 flex-shrink-0" />
          <input className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1"
            placeholder={`${t.common.search} projects or clients…`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-1">
          {["all", "active", "upcoming", "completed"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold capitalize transition-all ${
                statusFilter === s ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60 hover:bg-white/5"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {projects.length === 0 && (
        <div className="text-center py-20 space-y-3">
          <p className="text-white/20 text-[14px]">No projects yet</p>
          <button onClick={() => { setEditId(null); setForm(blank); setGeoConfirmed(""); setShowModal(true); }} className="text-amber-400 text-[13px] hover:text-amber-300 transition-colors">
            + Create your first project
          </button>
        </div>
      )}

      {view === "gantt" && (
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <GanttChart
                projects={ganttProjects}
                onTaskDatesChange={(projectId, taskId, startDate, endDate) =>
                  updateTask(projectId, taskId, { startDate, endDate })
                }
              />
          </div>
        </div>
      )}

      {view === "table" && (
        <div className="overflow-x-auto rounded-xl">
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden min-w-[760px]">
          <div className="grid text-[10px] font-bold uppercase tracking-widest text-white/25 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]"
            style={{ gridTemplateColumns: "2fr 1fr 80px 120px 100px 100px 80px 64px" }}>
            <span>Project</span><span>Client</span><span className="text-center">Status</span>
            <span>Progress</span><span>Budget</span><span>Deadline</span><span className="text-center">Team</span><span></span>
          </div>
          {filtered.map((project) => {
            const overBudget = project.spent > project.budget;
            return (
              <div key={project.id} className="grid items-center px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors group"
                style={{ gridTemplateColumns: "2fr 1fr 80px 120px 100px 100px 80px 64px" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-white/85 truncate">{project.name}</p>
                    <p className="text-[11px] text-white/30 truncate flex items-center gap-1">
                      <MapPin size={9} />{project.address.split(",")[0]}
                    </p>
                  </div>
                </div>
                <span className="text-[12px] text-white/50 truncate pr-2">{project.client}</span>
                <div className="flex justify-center"><StatusBadge status={project.status} /></div>
                <div className="pr-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-white/40">{project.progress}%</span>
                  </div>
                  <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
                  </div>
                </div>
                <div>
                  <p className={`text-[12px] font-semibold ${overBudget ? "text-red-400" : "text-white/70"}`}>
                    {formatCurrencyCompact(project.spent, currency as never)}
                  </p>
                  <p className="text-[10px] text-white/25">/ {formatCurrencyCompact(project.budget, currency as never)}</p>
                </div>
                <span className="text-[12px] text-white/45">
                  {project.endDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "2-digit" })}
                </span>
                <div className="flex justify-center items-center gap-1">
                  <div className="flex -space-x-1.5">
                    {project.workerIds.slice(0, 3).map((wid) => {
                      const w = getWorkerById(wid);
                      return w ? (
                        <div key={wid} className="w-6 h-6 rounded-full border border-[#111111] flex items-center justify-center text-[9px] font-bold overflow-hidden"
                          style={{ backgroundColor: w.color + "30", color: w.color }} title={w.name}>
                          {w.photo ? <img src={w.photo} alt={w.name} className="w-full h-full object-cover" /> : w.initials}
                        </div>
                      ) : null;
                    })}
                  </div>
                  {project.workerIds.length > 3 && <span className="text-[10px] text-white/30">+{project.workerIds.length - 3}</span>}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); copyShare(project.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-white/8 transition-all"
                    style={{ color: shareCopied === project.id ? "#34d399" : "rgba(255,255,255,0.3)" }}
                    title={shareCopied === project.id ? "Copied!" : "Copy client share link"}
                  >
                    <Share2 size={12} />
                  </button>
                  <button
                    onClick={() => openEdit(project)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-white/8 text-white/30 hover:text-white/70 transition-all"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(project.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {view === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => {
            const manager = getWorkerById(project.managerId);
            const activeTasks = project.tasks.filter((t) => t.status === "in-progress").length;
            const overBudget = project.spent > project.budget;
            const budgetPct = project.budget > 0 ? Math.min(100, (project.spent / project.budget) * 100) : 0;
            return (
              <div key={project.id} onClick={() => openEdit(project)} className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/10 transition-colors group cursor-pointer">
                <div className="h-1" style={{ backgroundColor: project.color }} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1"><StatusBadge status={project.status} /></div>
                      <h3 className="text-[14px] font-bold text-white group-hover:text-amber-300 transition-colors truncate">{project.name}</h3>
                      <p className="text-[12px] text-white/40 truncate">{project.client}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); copyShare(project.id); }}
                        className="p-1.5 rounded hover:bg-emerald-500/10 transition-colors"
                        style={{ color: shareCopied === project.id ? "#34d399" : "rgba(255,255,255,0.2)" }}
                        title={shareCopied === project.id ? "Copied!" : "Copy client share link"}
                      >
                        <Share2 size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project.id); }}
                        className="p-1 rounded hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-white/30 mb-4">
                    <MapPin size={10} /><span className="truncate">{project.address}</span>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/40">Overall Progress</span>
                      <span className="text-[13px] font-bold text-white">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center"><p className="text-[14px] font-bold text-white">{activeTasks}</p><p className="text-[10px] text-white/30">In Progress</p></div>
                    <div className="text-center border-x border-white/[0.06]"><p className="text-[14px] font-bold text-white">{project.tasks.length}</p><p className="text-[10px] text-white/30">Total Tasks</p></div>
                    <div className="text-center"><p className="text-[14px] font-bold text-white">{project.workerIds.length}</p><p className="text-[10px] text-white/30">Workers</p></div>
                  </div>
                  <div className="bg-white/[0.03] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-white/25">Budget</span>
                      <span className={`text-[10px] font-bold ${overBudget ? "text-red-400" : "text-white/40"}`}>
                        {overBudget ? "OVER BUDGET" : `${(100 - budgetPct).toFixed(0)}% remaining`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-white">{formatCurrencyCompact(project.spent, currency as never)}</span>
                      <span className="text-[11px] text-white/30">/ {formatCurrencyCompact(project.budget, currency as never)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2">
                      {manager && (
                        <>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold overflow-hidden"
                            style={{ backgroundColor: manager.color + "30", color: manager.color }}>
                            {manager.photo ? <img src={manager.photo} alt={manager.name} className="w-full h-full object-cover" /> : manager.initials}
                          </div>
                          <span className="text-[11px] text-white/35">{manager.name}</span>
                        </>
                      )}
                    </div>
                    <span className="text-[11px] text-white/30">
                      Due {project.endDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === "map" && (
        <div className="space-y-3">
          {mapPins.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                <Map size={20} className="text-white/25" />
              </div>
              <p className="text-white/40 text-[14px] font-medium">No GPS locations set</p>
              <p className="text-white/20 text-[12px] mt-1">Add latitude & longitude when creating a project to see it here.</p>
            </div>
          ) : (
            <>
              <div className="w-full rounded-xl overflow-hidden" style={{ height: 480 }}>
                <MapView pins={mapPins} className="w-full h-full" />
              </div>
              <p className="text-[11px] text-white/25 text-center">
                {mapPins.length} of {filtered.length} project{filtered.length !== 1 ? "s" : ""} have GPS coordinates
              </p>
            </>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">{editId ? "Edit Project" : "New Project"}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={lbl}>Project Name *</label>
                <input className={inp} placeholder="e.g. Riverside Apartment Complex"
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Client</label>
                  <input className={inp} placeholder="Client name"
                    value={form.client} onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Status</label>
                  <select className={inp} value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FormState["status"] }))}>
                    <option value="active">Active</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Site Address</label>
                <input className={inp} placeholder="123 Main St, City, Province"
                  value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="relative">
                <label className={lbl}>GPS Location <span className="text-white/20 normal-case font-normal">(optional)</span></label>
                <div className="relative">
                  <input
                    className={inp}
                    placeholder="Search address for GPS pin…"
                    value={geoQuery}
                    onChange={(e) => handleGeoSearch(e.target.value)}
                    autoComplete="off"
                  />
                  {geoLoading && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/30">Searching…</span>
                  )}
                </div>
                {geoResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl">
                    {geoResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleGeoSelect(r)}
                        className="w-full text-left px-4 py-2.5 hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0"
                      >
                        <p className="text-[12px] text-white/80 truncate">{r.display_name}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">{parseFloat(r.lat).toFixed(5)}, {parseFloat(r.lon).toFixed(5)}</p>
                      </button>
                    ))}
                  </div>
                )}
                {geoConfirmed && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-green-400">
                    <MapPin size={11} />
                    <span className="truncate">{geoConfirmed}</span>
                  </div>
                )}
                <p className="text-[10px] text-white/20 mt-1">Used for GPS off-site detection during clock-in verification.</p>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Budget ({currency})</label>
                  <input className={inp} type="number" placeholder="0"
                    value={form.budget} onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Project Manager</label>
                  <select className={inp} value={form.managerId}
                    onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}>
                    <option value="">Select manager</option>
                    {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Project Color</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                      style={{ backgroundColor: c, outline: form.color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
            </div>
            {formError && (
              <div className="mx-6 mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                <p className="text-[12px] text-red-300">{formError}</p>
              </div>
            )}
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setShowModal(false); setEditId(null); setGeoConfirmed(""); setFormError(""); }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
                {t.common.cancel}
              </button>
              <button onClick={handleSave} disabled={!form.name.trim()}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editId ? "Save Changes" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Project"
        body={(() => {
          const proj = projects.find((p) => p.id === deleteConfirm);
          return proj
            ? `Permanently delete "${proj.name}"? All tasks, time entries, and data for this project will be lost.`
            : "Delete this project? This cannot be undone.";
        })()}
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (deleteConfirm) { deleteProject(deleteConfirm); setDeleteConfirm(null); } }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
