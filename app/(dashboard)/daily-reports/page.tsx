"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAdminOrAbove, isForemanOrAbove } from "@/lib/permissions";
import {
  Plus, Search, FileText, Cloud, Thermometer, Users, Trash2, X,
  ChevronRight, Download, Calendar, ClipboardList, Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { DailyReport } from "@/lib/mock-data";

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

const WEATHER_OPTIONS = ["Clear", "Partly Cloudy", "Overcast", "Rainy", "Thunderstorm", "Foggy", "Windy", "Snowing"];

function wmoToWeather(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2)  return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 67 || (code >= 80 && code <= 82)) return "Rainy";
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "Snowing";
  if (code >= 95) return "Thunderstorm";
  return "Partly Cloudy";
}

type ReportForm = {
  projectId: string;
  date: string;
  weather: string;
  temperatureF: string;
  crewCount: string;
  crewOnSite: string;
  workCompleted: string;
  delays: string;
  materialsUsed: string;
  visitorLog: string;
  notes: string;
};

const emptyForm = (): ReportForm => ({
  projectId: "",
  date: new Date().toISOString().slice(0, 10),
  weather: "Clear",
  temperatureF: "72",
  crewCount: "",
  crewOnSite: "",
  workCompleted: "",
  delays: "",
  materialsUsed: "",
  visitorLog: "",
  notes: "",
});

export default function DailyReportsPage() {
  const router = useRouter();
  const { currentUser, projects, workers, dailyReports, addDailyReport, deleteDailyReport } = useStore();
  const isForeman = isForemanOrAbove(currentUser.role);

  if (!isForeman) {
    router.replace("/dashboard");
    return null;
  }

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [selected, setSelected] = useState<DailyReport | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ReportForm>(emptyForm());
  const [pdfLoading, setPdfLoading] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  const fetchWeather = useCallback(() => {
    if (!navigator.geolocation) return;
    setFetchingWeather(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords;
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=fahrenheit`
        )
          .then((r) => r.json())
          .then((d) => {
            const cw = d.current_weather;
            setForm((f) => ({
              ...f,
              weather: wmoToWeather(cw.weathercode),
              temperatureF: String(Math.round(cw.temperature)),
            }));
          })
          .catch(() => {})
          .finally(() => setFetchingWeather(false));
      },
      () => setFetchingWeather(false)
    );
  }, []);

  const filtered = dailyReports.filter((r) => {
    if (projectFilter !== "all" && r.projectId !== projectFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const proj = projects.find((p) => p.id === r.projectId);
      if (!proj?.name.toLowerCase().includes(q) && !r.workCompleted.toLowerCase().includes(q) && !r.notes.toLowerCase().includes(q)) return false;
    }
    return true;
  }).sort((a, b) => b.date.getTime() - a.date.getTime());

  const handleSubmit = useCallback(() => {
    if (!form.projectId || !form.date || !form.workCompleted.trim()) return;
    addDailyReport({
      projectId: form.projectId,
      date: new Date(form.date + "T12:00:00"),
      weather: form.weather,
      temperatureF: Number(form.temperatureF) || 0,
      crewCount: Number(form.crewCount) || 0,
      crewOnSite: form.crewOnSite.split("\n").map((s) => s.trim()).filter(Boolean),
      workCompleted: form.workCompleted.trim(),
      delays: form.delays.trim(),
      materialsUsed: form.materialsUsed.trim(),
      visitorLog: form.visitorLog.trim(),
      notes: form.notes.trim(),
      submittedById: currentUser.id,
    });
    setForm(emptyForm());
    setShowForm(false);
  }, [form, addDailyReport, currentUser.id]);

  const handleExportPdf = useCallback(async (report: DailyReport) => {
    setPdfLoading(true);
    try {
      const { exportDailyReportPdf } = await import("@/lib/pdf-export");
      const project = projects.find((p) => p.id === report.projectId);
      const submitter = workers.find((w) => w.id === report.submittedById);
      await exportDailyReportPdf({ report, projectName: project?.name ?? "Unknown", submitterName: submitter?.name ?? "Unknown" });
    } finally {
      setPdfLoading(false);
    }
  }, [projects, workers]);

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const workerMap = new Map(workers.map((w) => [w.id, w]));

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left list */}
      <div className={`flex flex-col ${selected ? "hidden lg:flex" : "flex"} w-full lg:w-[360px] lg:min-w-[360px] border-r border-white/[0.06]`}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <div className="flex-1 flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
            <Search size={13} className="text-white/30 flex-shrink-0" />
            <input
              className="flex-1 bg-transparent text-[13px] text-white/80 placeholder:text-white/25 outline-none"
              placeholder="Search reports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setForm(emptyForm()); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[12px] font-bold px-3 py-2 rounded-lg transition-colors flex-shrink-0"
          >
            <Plus size={13} /> New
          </button>
        </div>

        {/* Project filter */}
        <div className="px-4 py-2 border-b border-white/[0.06]">
          <select
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-white/60 outline-none"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="all">All projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {/* Summary stat */}
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={14} className="text-amber-400" />
            <span className="text-[12px] text-white/50">{filtered.length} report{filtered.length !== 1 ? "s" : ""}</span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
              <FileText size={32} className="text-white/10" />
              <p className="text-[13px] text-white/30">No daily reports yet</p>
              <p className="text-[11px] text-white/20">Create your first report to get started</p>
            </div>
          ) : (
            filtered.map((report) => {
              const proj = projectMap.get(report.projectId);
              const isActive = selected?.id === report.id;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelected(report)}
                  className={`w-full text-left px-4 py-3 border-b border-white/[0.04] transition-colors ${isActive ? "bg-amber-500/8" : "hover:bg-white/[0.03]"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold text-white/80">
                      {report.date.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <ChevronRight size={12} className="text-white/20" />
                  </div>
                  <p className="text-[11px] text-white/40 mb-1">{proj?.name ?? "Unknown project"}</p>
                  <p className="text-[11px] text-white/50 line-clamp-2">{report.workCompleted}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                      <Cloud size={10} /> {report.weather}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-white/30">
                      <Users size={10} /> {report.crewCount} crew
                    </span>
                    {report.temperatureF > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-white/30">
                        <Thermometer size={10} /> {report.temperatureF}°F
                      </span>
                    )}
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
              <h2 className="text-[15px] font-bold text-white/90">
                {selected.date.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </h2>
              <p className="text-[12px] text-white/40 mt-0.5">
                {projectMap.get(selected.projectId)?.name ?? "Unknown project"} · Submitted by {workerMap.get(selected.submittedById)?.name ?? "Unknown"}
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
              {isAdminOrAbove(currentUser.role) && (
                <button
                  onClick={() => { if (confirm("Delete this report?")) { deleteDailyReport(selected.id); setSelected(null); } }}
                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors lg:hidden">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Conditions */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
                <Cloud size={14} className="text-blue-400" />
                <span className="text-[13px] text-white/70">{selected.weather}</span>
              </div>
              {selected.temperatureF > 0 && (
                <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
                  <Thermometer size={14} className="text-orange-400" />
                  <span className="text-[13px] text-white/70">{selected.temperatureF}°F</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
                <Users size={14} className="text-emerald-400" />
                <span className="text-[13px] text-white/70">{selected.crewCount} crew on site</span>
              </div>
            </div>

            <Section title="Work Completed" content={selected.workCompleted} />
            {selected.crewOnSite.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Crew on Site</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.crewOnSite.map((name, i) => (
                    <span key={i} className="text-[11px] bg-white/[0.06] text-white/60 px-2.5 py-1 rounded-full">{name}</span>
                  ))}
                </div>
              </div>
            )}
            {selected.materialsUsed && <Section title="Materials Used" content={selected.materialsUsed} />}
            {selected.delays && <Section title="Delays / Issues" content={selected.delays} color="amber" />}
            {selected.visitorLog && <Section title="Visitor Log" content={selected.visitorLog} />}
            {selected.notes && <Section title="Notes" content={selected.notes} />}
          </div>
        </div>
      )}

      {/* Empty state when nothing selected on desktop */}
      {!selected && (
        <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-3 text-center">
          <FileText size={40} className="text-white/10" />
          <p className="text-[14px] text-white/30">Select a report to view details</p>
        </div>
      )}

      {/* New Report Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/[0.08] rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h3 className="text-[14px] font-bold text-white/90">New Daily Report</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"><X size={14} /></button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Project *</label>
                  <select className={inp} value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
                    <option value="">Select project…</option>
                    {projects.filter((p) => p.status === "active").map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Date *</label>
                  <input className={inp} type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={lbl} style={{ marginBottom: 0 }}>Weather</span>
                    <button
                      type="button"
                      onClick={fetchWeather}
                      disabled={fetchingWeather}
                      className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 disabled:opacity-40 transition-colors"
                    >
                      <Zap size={9} className={fetchingWeather ? "animate-pulse" : ""} />
                      {fetchingWeather ? "Fetching…" : "Auto-fill"}
                    </button>
                  </div>
                  <select className={inp} value={form.weather} onChange={(e) => setForm((f) => ({ ...f, weather: e.target.value }))}>
                    {WEATHER_OPTIONS.map((w) => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Temp (°F)</label>
                  <input className={inp} type="number" placeholder="72" value={form.temperatureF} onChange={(e) => setForm((f) => ({ ...f, temperatureF: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Crew Count</label>
                  <input className={inp} type="number" placeholder="0" value={form.crewCount} onChange={(e) => setForm((f) => ({ ...f, crewCount: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={lbl}>Crew on Site (one per line)</label>
                <textarea className={`${inp} resize-none`} rows={3} placeholder="John Smith&#10;Maria Garcia" value={form.crewOnSite} onChange={(e) => setForm((f) => ({ ...f, crewOnSite: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Work Completed *</label>
                <textarea className={`${inp} resize-none`} rows={4} placeholder="Describe work completed today…" value={form.workCompleted} onChange={(e) => setForm((f) => ({ ...f, workCompleted: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Materials Used</label>
                <textarea className={`${inp} resize-none`} rows={2} placeholder="Concrete, rebar, lumber…" value={form.materialsUsed} onChange={(e) => setForm((f) => ({ ...f, materialsUsed: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Delays / Issues</label>
                <textarea className={`${inp} resize-none`} rows={2} placeholder="Any delays or issues encountered…" value={form.delays} onChange={(e) => setForm((f) => ({ ...f, delays: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Visitor Log</label>
                <input className={inp} placeholder="Inspector, owner, etc." value={form.visitorLog} onChange={(e) => setForm((f) => ({ ...f, visitorLog: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Notes</label>
                <textarea className={`${inp} resize-none`} rows={2} placeholder="Additional notes…" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-[13px] text-white/50 hover:text-white/80 rounded-lg hover:bg-white/[0.05] transition-colors">Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={!form.projectId || !form.date || !form.workCompleted.trim()}
                className="px-4 py-2 text-[13px] font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black rounded-lg transition-colors"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, content, color }: { title: string; content: string; color?: "amber" }) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${color === "amber" ? "text-amber-400/60" : "text-white/25"}`}>{title}</p>
      <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${color === "amber" ? "text-amber-300/80" : "text-white/65"}`}>{content}</p>
    </div>
  );
}
