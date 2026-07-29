"use client";

import { useState } from "react";
import { ShieldAlert, Plus, Search, AlertTriangle, Info, Zap, User, Building2, X, Trash2, Pencil, FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { ConfirmModal } from "@/components/confirm-modal";
import { useT } from "@/lib/i18n";

const TYPE_CONFIG = {
  "near-miss": { label: "Near Miss", icon: AlertTriangle, color: "#f59e0b" },
  injury: { label: "Injury", icon: Zap, color: "#ef4444" },
  "property-damage": { label: "Property Damage", icon: Building2, color: "#8b5cf6" },
  environmental: { label: "Environmental", icon: Info, color: "#06b6d4" },
};

const SEVERITY_CONFIG = {
  low: { label: "LOW", className: "bg-blue-500/10 text-blue-400" },
  medium: { label: "MEDIUM", className: "bg-amber-500/12 text-amber-400" },
  high: { label: "HIGH", className: "bg-orange-500/15 text-orange-400" },
  critical: { label: "CRITICAL", className: "bg-red-500/15 text-red-400" },
};

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

type IncidentForm = {
  projectId: string;
  type: "near-miss" | "injury" | "property-damage" | "environmental";
  severity: "low" | "medium" | "high" | "critical";
  description: string; actionTaken: string;
  reportedById: string; injuredId: string;
  date: string; reportedToOSHA: boolean;
};

const blank: IncidentForm = {
  projectId: "", type: "near-miss", severity: "low",
  description: "", actionTaken: "",
  reportedById: "", injuredId: "",
  date: new Date().toISOString().split("T")[0], reportedToOSHA: false,
};

export default function SafetyPage() {
  const { safetyIncidents, projects, workers, addSafetyIncident, updateSafetyIncident, deleteSafetyIncident, getWorkerById, getProjectById } = useStore();
  const t = useT();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<IncidentForm>(blank);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = safetyIncidents.filter((i) => {
    if (typeFilter !== "all" && i.type !== typeFilter) return false;
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    if (search) {
      const project = getProjectById(i.projectId);
      if (!i.description.toLowerCase().includes(search.toLowerCase()) &&
        !project?.name.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const openEdit = (incident: typeof safetyIncidents[0]) => {
    setEditId(incident.id);
    setForm({
      projectId: incident.projectId,
      type: incident.type,
      severity: incident.severity,
      description: incident.description,
      actionTaken: incident.actionTaken,
      reportedById: incident.reportedById,
      injuredId: incident.injuredId ?? "",
      date: incident.date.toISOString().split("T")[0],
      reportedToOSHA: incident.reportedToOSHA,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.description.trim()) return;
    if (editId) {
      updateSafetyIncident(editId, {
        type: form.type,
        severity: form.severity,
        description: form.description.trim(),
        actionTaken: form.actionTaken.trim(),
        injuredId: form.injuredId || undefined,
        date: form.date ? new Date(form.date) : new Date(),
        reportedToOSHA: form.reportedToOSHA,
      });
    } else {
      addSafetyIncident({
        projectId: form.projectId || (projects[0]?.id ?? ""),
        type: form.type,
        severity: form.severity,
        description: form.description.trim(),
        actionTaken: form.actionTaken.trim(),
        reportedById: form.reportedById || (workers[0]?.id ?? ""),
        injuredId: form.injuredId || undefined,
        date: form.date ? new Date(form.date) : new Date(),
        reportedToOSHA: form.reportedToOSHA,
      });
    }
    setForm(blank);
    setEditId(null);
    setShowModal(false);
  };

  const daysWithoutInjury = (() => {
    const injuries = safetyIncidents.filter((i) => i.type === "injury").map((i) => i.date);
    if (injuries.length === 0) return null;
    const last = new Date(Math.max(...injuries.map((d) => d.getTime())));
    return Math.floor((Date.now() - last.getTime()) / 86400000);
  })();

  const exportPdf = (incident: typeof safetyIncidents[0]) => {
    const project = getProjectById(incident.projectId);
    const reporter = getWorkerById(incident.reportedById);
    const injured = incident.injuredId ? getWorkerById(incident.injuredId) : null;
    const typeCfg = TYPE_CONFIG[incident.type];
    const sevCfg = SEVERITY_CONFIG[incident.severity];
    const dateStr = incident.date.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Incident Report — ${dateStr}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; color: #111; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .meta { color: #555; font-size: 13px; margin-bottom: 24px; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-right: 6px; }
  .badge-sev { background: #fef3c7; color: #92400e; }
  .badge-osha { background: #fee2e2; color: #991b1b; }
  .section { margin-top: 18px; }
  .label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 4px; }
  .value { font-size: 14px; color: #111; line-height: 1.5; }
  .action { background: #f0fdf4; border-left: 3px solid #16a34a; padding: 10px 14px; margin-top: 10px; border-radius: 4px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  .footer { font-size: 11px; color: #9ca3af; margin-top: 32px; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>Safety Incident Report</h1>
<div class="meta">Generated ${new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })} · Constra Workforce OS</div>
<hr>
<div><span class="badge badge-sev">${typeCfg.label} · ${sevCfg.label}</span>${incident.reportedToOSHA ? '<span class="badge badge-osha">OSHA REPORTED</span>' : ""}</div>
<div class="section"><div class="label">Date of Incident</div><div class="value">${dateStr}</div></div>
<div class="section"><div class="label">Project</div><div class="value">${project?.name ?? "—"}</div></div>
<div class="section"><div class="label">Description</div><div class="value">${incident.description}</div></div>
${incident.actionTaken ? `<div class="action"><div class="label">Corrective Action Taken</div><div class="value">${incident.actionTaken}</div></div>` : ""}
${reporter ? `<div class="section"><div class="label">Reported By</div><div class="value">${reporter.name}</div></div>` : ""}
${injured ? `<div class="section"><div class="label">Injured Worker</div><div class="value">${injured.name}</div></div>` : ""}
${incident.reportedToOSHA ? `<div class="section"><div class="label">OSHA Reporting Status</div><div class="value">Reported to OSHA as required</div></div>` : ""}
<hr>
<div class="footer">This document was generated from the Constra safety log. Keep a signed copy for compliance records.</div>
<script>window.onload = function() { window.print(); }<\/script>
</body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div className="space-y-5 max-w-[1000px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Safety Log</h2>
          <p className="text-white/35 text-sm mt-0.5">
            {safetyIncidents.length} incidents logged · OSHA reporting required for injuries
          </p>
        </div>
        <button onClick={() => { setEditId(null); setForm({ ...blank, date: new Date().toISOString().split("T")[0] }); setShowModal(true); }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} />
          Log Incident
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["near-miss", "injury", "property-damage", "environmental"] as const).map((type) => {
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          const count = safetyIncidents.filter((i) => i.type === type).length;
          return (
            <button key={type} onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
              className={`bg-[#111111] border rounded-xl p-4 text-left transition-all ${typeFilter === type ? "border-amber-500/40" : "border-white/[0.06] hover:border-white/10"}`}>
              <span style={{ color: cfg.color }} className="mb-2 block"><Icon size={18} /></span>
              <p className="text-2xl font-bold text-white">{count}</p>
              <p className="text-[11px] text-white/40 mt-0.5">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5 flex items-center gap-6">
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-full border-4 border-green-500/30 flex items-center justify-center">
            <span className="text-xl font-black text-green-400">
              {Math.max(0, 100 - safetyIncidents.filter((i) => i.severity === "critical" || i.severity === "high").length * 5)}
            </span>
          </div>
          <p className="text-[10px] text-white/30 text-center mt-1.5">Safety Score</p>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-4">
          <div>
            <p className="text-[11px] text-white/30 mb-1">Days without injury</p>
            {daysWithoutInjury === null
              ? <p className="text-2xl font-bold text-green-400">∞</p>
              : <p className="text-2xl font-bold text-green-400">{daysWithoutInjury}</p>}
          </div>
          <div>
            <p className="text-[11px] text-white/30 mb-1">OSHA Recordables YTD</p>
            <p className="text-2xl font-bold text-white">{safetyIncidents.filter((i) => i.reportedToOSHA).length}</p>
          </div>
          <div>
            <p className="text-[11px] text-white/30 mb-1">Total Incidents</p>
            <p className="text-2xl font-bold text-white">{safetyIncidents.length}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-2 max-w-64">
          <Search size={13} className="text-white/30" />
          <input className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1"
            placeholder={`${t.common.search} incidents…`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-[#111111] border border-white/[0.06] text-white/60 text-[12px] rounded-lg px-3 py-2 outline-none cursor-pointer"
        >
          <option value="all">All Severities</option>
          {(["low", "medium", "high", "critical"] as const).map((s) => (
            <option key={s} value={s}>{SEVERITY_CONFIG[s].label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {safetyIncidents.length === 0 && (
          <div className="text-center py-16 text-white/25 space-y-2">
            <ShieldAlert size={36} className="mx-auto opacity-30" />
            <p className="text-[14px]">No incidents logged</p>
            <button onClick={() => setShowModal(true)} className="text-amber-400 text-[12px] hover:text-amber-300 transition-colors">
              + Log an incident
            </button>
          </div>
        )}
        {filtered.map((incident) => {
          const project = getProjectById(incident.projectId);
          const reporter = getWorkerById(incident.reportedById);
          const injured = incident.injuredId ? getWorkerById(incident.injuredId) : null;
          const typeCfg = TYPE_CONFIG[incident.type];
          const sevCfg = SEVERITY_CONFIG[incident.severity];
          const TypeIcon = typeCfg.icon;

          return (
            <div key={incident.id} className="bg-[#111111] border border-white/[0.06] rounded-xl p-5 hover:border-white/10 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: typeCfg.color + "18" }}>
                  <span style={{ color: typeCfg.color }}><TypeIcon size={18} /></span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-white/80">{typeCfg.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sevCfg.className}`}>{sevCfg.label}</span>
                      {incident.reportedToOSHA && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">OSHA REPORTED</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-white/30">
                        {incident.date.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <button onClick={() => exportPdf(incident)} title="Export PDF"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/8 text-white/20 hover:text-amber-400 transition-all">
                        <FileText size={12} />
                      </button>
                      <button onClick={() => openEdit(incident)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/8 text-white/20 hover:text-white/60 transition-all">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => setDeleteConfirm(incident.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[13px] text-white/70 mb-3 leading-relaxed">{incident.description}</p>
                  {incident.actionTaken && (
                    <div className="bg-green-500/[0.07] border border-green-500/15 rounded-lg px-3 py-2 mb-3">
                      <p className="text-[10px] font-bold text-green-400 uppercase tracking-wide mb-1">Corrective Action Taken</p>
                      <p className="text-[12px] text-white/55">{incident.actionTaken}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-4 flex-wrap text-[11px] text-white/30">
                    {project && <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: project.color }} /><span>{project.name}</span></div>}
                    {reporter && <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold" style={{ backgroundColor: reporter.color + "25", color: reporter.color }}>{reporter.initials}</div><span>Reported by {reporter.name}</span></div>}
                    {injured && <div className="flex items-center gap-1 text-red-400/70"><User size={10} /><span>Injured: {injured.name}</span></div>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">{editId ? "Edit Incident" : "Log Incident"}</h3>
              <button onClick={() => { setShowModal(false); setEditId(null); }} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Type</label>
                  <select className={inp} value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as IncidentForm["type"] }))}>
                    <option value="near-miss">Near Miss</option>
                    <option value="injury">Injury</option>
                    <option value="property-damage">Property Damage</option>
                    <option value="environmental">Environmental</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Severity</label>
                  <select className={inp} value={form.severity}
                    onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as IncidentForm["severity"] }))}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={lbl}>Description *</label>
                <textarea className={inp + " resize-none"} rows={3} placeholder="Describe what happened..."
                  value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Corrective Action Taken</label>
                <textarea className={inp + " resize-none"} rows={2} placeholder="What was done to address this..."
                  value={form.actionTaken} onChange={(e) => setForm((f) => ({ ...f, actionTaken: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!editId && (
                  <div>
                    <label className={lbl}>Project</label>
                    <select className={inp} value={form.projectId}
                      onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
                      <option value="">Select project</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                <div className={editId ? "col-span-2" : ""}>
                  <label className={lbl}>Date</label>
                  <input className={inp} type="date" value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Reported By</label>
                  <select className={inp} value={form.reportedById}
                    onChange={(e) => setForm((f) => ({ ...f, reportedById: e.target.value }))}>
                    <option value="">Select worker</option>
                    {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Injured Worker</label>
                  <select className={inp} value={form.injuredId}
                    onChange={(e) => setForm((f) => ({ ...f, injuredId: e.target.value }))}>
                    <option value="">None</option>
                    {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.reportedToOSHA}
                    onChange={(e) => setForm((f) => ({ ...f, reportedToOSHA: e.target.checked }))}
                    className="w-4 h-4 accent-amber-500" />
                  <span className="text-[13px] text-white/60">Reported to OSHA</span>
                </label>
                <p className="text-[11px] text-white/30 pl-7 leading-relaxed">
                  Federally required for work-related fatalities (within 8 hrs) and in-patient hospitalizations, amputations, or loss of an eye (within 24 hrs). Consult your local authority for additional thresholds.
                </p>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setShowModal(false); setEditId(null); }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">{t.common.cancel}</button>
              <button onClick={handleSave} disabled={!form.description.trim()}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editId ? "Save Changes" : "Log Incident"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Delete Incident Log"
        body="Delete this safety incident log? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteConfirm) deleteSafetyIncident(deleteConfirm); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
