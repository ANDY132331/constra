"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { CheckCircle2, Clock, Circle, AlertCircle, MapPin, Calendar, Building2, Loader2, HardHat } from "lucide-react";

type SharedTask = {
  id: string; name: string; status: string; progress: number;
  startDate: string; endDate: string;
};

type SharedProject = {
  id: string; name: string; client: string; address: string;
  status: string; progress: number; color: string;
  startDate: string; endDate: string;
  companyName: string; tasks: SharedTask[];
};

const TASK_STATUS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  completed:    { label: "Completed",   icon: <CheckCircle2 size={13} />, color: "#22c55e" },
  "in-progress":{ label: "In Progress", icon: <Clock size={13} />,        color: "#F5C400" },
  "not-started":{ label: "Not Started", icon: <Circle size={13} />,       color: "#6b7280" },
  delayed:      { label: "Delayed",     icon: <AlertCircle size={13} />,  color: "#ef4444" },
};

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [project, setProject] = useState<SharedProject | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setProject)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={24} className="text-gray-300 dark:text-white/30 animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="text-[40px]">🔒</div>
        <h1 className="text-[20px] font-bold text-gray-900 dark:text-white">Project not found</h1>
        <p className="text-gray-500 dark:text-white/40 text-[14px] max-w-sm">
          This share link may have expired, or the project doesn&apos;t exist.
        </p>
      </div>
    );
  }

  const completed = project.tasks.filter((t) => t.status === "completed").length;
  const inProgress = project.tasks.filter((t) => t.status === "in-progress").length;
  const delayed = project.tasks.filter((t) => t.status === "delayed").length;
  const burnColor = project.progress > 90 ? "#22c55e" : project.progress > 60 ? "#F5C400" : "#3b82f6";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-white/[0.06] px-6 py-4 flex items-center justify-between bg-white dark:bg-transparent">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center flex-shrink-0">
            <HardHat size={13} className="text-black" />
          </div>
          <span className="font-black text-[15px] tracking-tight">Constra</span>
          <span className="text-gray-400 dark:text-white/25 text-[13px]">· Project Status</span>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-white/20">Shared view · Read-only</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        {/* Project hero */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
            <span className={`text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
              project.status === "active"
                ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                : project.status === "completed"
                ? "bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-white/40"
                : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
            }`}>
              {project.status}
            </span>
          </div>
          <h1 className="text-[28px] font-black tracking-tight mt-2">{project.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-[13px] text-gray-500 dark:text-white/50">
            <div className="flex items-center gap-1.5">
              <Building2 size={13} className="text-gray-400 dark:text-white/30" />
              {project.client}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-gray-400 dark:text-white/30" />
              {project.address.split(",")[0]}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400 dark:text-white/30" />
              {new Date(project.endDate).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-gray-500 dark:text-white/60">Overall Progress</span>
            <span className="text-[28px] font-black">{project.progress}%</span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-white/[0.06] rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${project.progress}%`, backgroundColor: burnColor }}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Completed", value: completed, color: "#22c55e" },
              { label: "In Progress", value: inProgress, color: "#F5C400" },
              { label: "Delayed", value: delayed, color: "#ef4444" },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center bg-gray-50 dark:bg-white/[0.03] rounded-xl py-3">
                <p className="text-[22px] font-black" style={{ color }}>{value}</p>
                <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5 font-semibold uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Task list */}
        {project.tasks.length > 0 && (
          <div>
            <h2 className="text-[13px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest mb-3">Work Items</h2>
            <div className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-white/[0.06] rounded-xl divide-y divide-gray-50 dark:divide-white/[0.04]">
              {project.tasks.map((task) => {
                const s = TASK_STATUS[task.status] ?? TASK_STATUS["not-started"];
                return (
                  <div key={task.id} className="flex items-center gap-3 px-4 py-3">
                    <span style={{ color: s.color }} className="flex-shrink-0">{s.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-gray-800 dark:text-white/80 font-medium truncate">{task.name}</p>
                      <p className="text-[10px] text-gray-400 dark:text-white/30 mt-0.5">
                        {new Date(task.startDate).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        {" → "}
                        {new Date(task.endDate).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-16 h-1.5 bg-gray-100 dark:bg-white/[0.07] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${task.progress}%`, backgroundColor: s.color }} />
                      </div>
                      <span className="text-[11px] font-bold w-7 text-right" style={{ color: s.color }}>{task.progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-center text-[11px] text-gray-400 dark:text-white/20 pt-4 pb-8">
          Powered by{" "}
          <a href="/" className="text-amber-500/80 hover:text-amber-500 transition-colors">Constra</a>
          {" "}· {project.companyName}
        </div>
      </div>
    </div>
  );
}
