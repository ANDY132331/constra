"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Camera, Search, MapPin, LogIn, LogOut, Edit2, X, AlertTriangle, WifiOff, ChevronRight, Loader2, ShieldAlert, Navigation, Download } from "lucide-react";
import { ConfirmModal } from "@/components/confirm-modal";
import { useStore } from "@/lib/store";
import { CameraCapture } from "@/components/camera-capture";
import type { Worker, GpsLocation, VerificationFlag } from "@/lib/mock-data";
import { runVerification } from "@/lib/verification";
import { sendPushEvent } from "@/lib/push-client";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";

function elapsed(start: Date, end?: Date): string {
  const ms = (end ?? new Date()).getTime() - start.getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

function fmt(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// Edit entry modal
type EditEntryState = {
  id: string;
  workerName: string;
  clockIn: Date;
  clockOut: Date | undefined;
};

function EditEntryModal({
  entry,
  onSave,
  onDelete,
  onClose,
}: {
  entry: EditEntryState;
  onSave: (id: string, clockIn: Date, clockOut: Date | undefined) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [inVal, setInVal] = useState(toLocal(entry.clockIn));
  const [outVal, setOutVal] = useState(entry.clockOut ? toLocal(entry.clockOut) : "");
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleSave = () => {
    const ci = new Date(inVal);
    const co = outVal ? new Date(outVal) : undefined;
    if (isNaN(ci.getTime())) { setError("Invalid clock-in time."); return; }
    if (co && isNaN(co.getTime())) { setError("Invalid clock-out time."); return; }
    if (co && co <= ci) { setError("Clock-out must be after clock-in."); return; }
    onSave(entry.id, ci, co);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-[15px] font-bold text-white">Edit Time Entry</h3>
            <p className="text-[11px] text-white/35 mt-0.5">{entry.workerName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-white/35 uppercase tracking-wider block mb-1.5">Clock In</label>
            <input type="datetime-local" value={inVal} onChange={(e) => setInVal(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-amber-500/40 [color-scheme:dark]" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-white/35 uppercase tracking-wider block mb-1.5">Clock Out</label>
            <input type="datetime-local" value={outVal} onChange={(e) => setOutVal(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-amber-500/40 [color-scheme:dark]" />
            <p className="text-[10px] text-white/25 mt-1">Leave blank for an open/live entry.</p>
          </div>
          {error && (
            <p className="text-[12px] text-red-400 flex items-center gap-1.5">
              <AlertTriangle size={12} /> {error}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setDeleteConfirm(true)}
              className="px-3 py-2.5 rounded-xl text-[12px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors">
              Delete
            </button>
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 transition-colors">
              Save
            </button>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={deleteConfirm}
        title="Delete Time Entry"
        body="Delete this time entry permanently? This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { onDelete(entry.id); setDeleteConfirm(false); }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}

// Project picker shown before camera
function ProjectPickerModal({
  worker,
  projects,
  onSelect,
  onClose,
}: {
  worker: Worker;
  projects: { id: string; name: string; color: string }[];
  onSelect: (projectId: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(projects[0]?.id ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-[15px] font-bold text-white">Select Project</h3>
            <p className="text-[11px] text-white/35 mt-0.5">Clocking in {worker.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-2">
          {projects.length === 0 ? (
            <p className="text-[13px] text-white/35 text-center py-4">No active projects. Add a project first.</p>
          ) : (
            projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  selected === p.id
                    ? "border-amber-500/50 bg-amber-500/[0.06]"
                    : "border-white/[0.07] hover:border-white/[0.12] hover:bg-white/[0.03]"
                }`}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-[13px] font-semibold text-white/80 flex-1">{p.name}</span>
                {selected === p.id && <ChevronRight size={13} className="text-amber-400 flex-shrink-0" />}
              </button>
            ))
          )}
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected || projects.length === 0}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continue to Photo
          </button>
        </div>
      </div>
    </div>
  );
}

const GEOFENCE_RADIUS_M = 200;

function haversineM(a: GpsLocation, b: GpsLocation): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

async function getGeofenceResult(projectGps: GpsLocation): Promise<{ ok: boolean; distanceM: number }> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve({ ok: true, distanceM: 0 });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distanceM = haversineM(
          { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy ?? 0 },
          projectGps,
        );
        resolve({ ok: distanceM <= GEOFENCE_RADIUS_M, distanceM });
      },
      () => resolve({ ok: false, distanceM: -1 }), // denied / unavailable → show warning
      { timeout: 6000, maximumAge: 30_000 },
    );
  });
}

type GeofenceWarning = {
  worker: Worker;
  projectId: string;
  projectName: string;
  distanceM: number;
};

function GeofenceWarningModal({
  warning,
  onOverride,
  onCancel,
}: {
  warning: GeofenceWarning;
  onOverride: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="bg-[#161616] border border-amber-500/25 rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Top amber bar */}
        <div className="h-1 bg-amber-500 rounded-t-2xl" />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Navigation size={18} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-white">{warning.distanceM === -1 ? "GPS Unavailable" : "Outside Site Boundary"}</h3>
              <p className="text-[11px] text-white/40 mt-0.5">{warning.distanceM === -1 ? "Location permission denied" : "GPS verification failed"}</p>
            </div>
          </div>

          <div className="bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-4 mb-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-white/40">Worker</span>
              <span className="text-[12px] font-semibold text-white">{warning.worker.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-white/40">Project site</span>
              <span className="text-[12px] font-semibold text-white truncate max-w-[180px]">{warning.projectName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-white/40">Your distance</span>
              <span className="text-[13px] font-black text-amber-400">{warning.distanceM === -1 ? "Unknown" : fmtDist(warning.distanceM)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-white/40">Allowed radius</span>
              <span className="text-[12px] text-white/60">{fmtDist(GEOFENCE_RADIUS_M)}</span>
            </div>
            {warning.distanceM > 0 && (
              <div className="mt-2">
                <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${Math.min(100, (GEOFENCE_RADIUS_M / warning.distanceM) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-white/25">Site</span>
                  <span className="text-[9px] text-white/25">You are here</span>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-white/35 mb-5 leading-relaxed">
            {warning.distanceM === -1
              ? "GPS location permission was denied. Location cannot be verified. You can override — this clock-in will be flagged for review."
              : "This worker appears to be outside the project boundary. You can override this check — the discrepancy will be flagged for review."}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onOverride}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <ShieldAlert size={13} className="text-amber-400" />
              Override & Clock In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TimeTrackingPage() {
  const {
    workers, clockEntries, projects, currentUser,
    addClockEntry, updateClockEntry, deleteClockEntry, updateWorker,
    getWorkerById, getProjectById, companyId,
  } = useStore();

  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("all");
  const [tick, setTick] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Step 1: project picker
  const [projectPickerTarget, setProjectPickerTarget] = useState<Worker | null>(null);
  // Step 1.5: geofence check (between picker and camera)
  const [geofenceChecking, setGeofenceChecking] = useState(false);
  const [geofenceWarning, setGeofenceWarning] = useState<GeofenceWarning | null>(null);
  // Step 2: camera (worker + chosen project)
  const [cameraTarget, setCameraTarget] = useState<{ worker: Worker; projectId: string } | null>(null);

  // Edit entry state
  const [editEntry, setEditEntry] = useState<EditEntryState | null>(null);
  const [clockOutAllConfirm, setClockOutAllConfirm] = useState(false);

  // Flag detail expansion (for touch/mobile accessibility)
  const [flagDetailId, setFlagDetailId] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // Suppress unused tick warning
  void tick;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const clockedIn = workers.filter((w) => w.clockedIn);

  const todayHours = clockEntries
    .filter((e) => e.clockOut && e.clockIn >= todayStart)
    .reduce((s, e) => s + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0);

  const liveHours = clockedIn.reduce((s, w) => {
    if (!w.clockInTime) return s;
    return s + (Date.now() - w.clockInTime.getTime()) / 3600000;
  }, 0);

  const todayTotal = (todayHours + liveHours).toFixed(1);

  const activeProjects = projects.filter((p) => p.status === "active");

  const proceedToCamera = useCallback(async (worker: Worker, projectId: string) => {
    const project = getProjectById(projectId);
    if (project?.gps) {
      setGeofenceChecking(true);
      const { ok, distanceM } = await getGeofenceResult(project.gps);
      setGeofenceChecking(false);
      if (!ok) {
        setGeofenceWarning({ worker, projectId, projectName: project.name, distanceM });
        return;
      }
    }
    setCameraTarget({ worker, projectId });
  }, [getProjectById]);

  const requestClockIn = useCallback((worker: Worker) => {
    if (activeProjects.length === 1) {
      proceedToCamera(worker, activeProjects[0].id);
    } else {
      setProjectPickerTarget(worker);
    }
  }, [activeProjects, proceedToCamera]);

  const handleProjectSelected = useCallback((projectId: string) => {
    if (!projectPickerTarget) return;
    const worker = projectPickerTarget;
    setProjectPickerTarget(null);
    proceedToCamera(worker, projectId);
  }, [projectPickerTarget, proceedToCamera]);

  const handlePhotoConfirmed = useCallback(async (dataUrl: string, gps?: GpsLocation) => {
    if (!cameraTarget) return;
    const { worker, projectId } = cameraTarget;
    const now = new Date();
    const deviceInfo = navigator.userAgent.slice(0, 200);

    const newEntry = { workerId: worker.id, projectId, clockIn: now, clockInPhoto: dataUrl, gps, deviceInfo };
    const entryId = addClockEntry(newEntry);
    updateWorker(worker.id, { clockedIn: true, clockInTime: now, photo: dataUrl, clockInGps: gps });

    // Fire push notification to all subscribed devices
    const proj = getProjectById(projectId);
    sendPushEvent({
      companyId: companyId ?? undefined,
      title: `${worker.name} clocked in`,
      body: `Working on ${proj?.name ?? "a project"}`,
      url: "/time-tracking",
    });

    // Update device history
    const existing = worker.deviceHistory ?? [];
    const matched = existing.find((d) => d.ua === deviceInfo);
    const updatedHistory = matched
      ? existing.map((d) => d.ua === deviceInfo ? { ...d, lastSeen: now } : d)
      : [...existing, { ua: deviceInfo, firstSeen: now, lastSeen: now }];
    updateWorker(worker.id, { deviceHistory: updatedHistory });

    setCameraTarget(null);

    // Run background verification silently after UI is updated
    const project = getProjectById(projectId);
    const flags = await runVerification({ entry: newEntry, worker, project, pastEntries: clockEntries });
    if (flags.length > 0) {
      updateClockEntry(entryId, { verificationFlags: flags });
    }
  }, [cameraTarget, clockEntries, addClockEntry, updateClockEntry, updateWorker, getProjectById]);

  const handleClockOut = useCallback((workerId: string) => {
    const entry = [...clockEntries].reverse().find((e) => e.workerId === workerId && !e.clockOut);
    const now = new Date();
    if (entry) {
      updateClockEntry(entry.id, { clockOut: now });
      const worker = getWorkerById(workerId);
      const project = getProjectById(entry.projectId);
      const hrs = ((now.getTime() - entry.clockIn.getTime()) / 3600000).toFixed(1);
      sendPushEvent({
        companyId: companyId ?? undefined,
        title: `${worker?.name ?? "Worker"} clocked out`,
        body: `${hrs}h on ${project?.name ?? "project"}`,
        url: "/time-tracking",
      });
    }
    updateWorker(workerId, { clockedIn: false, clockInTime: undefined, clockInGps: undefined });
  }, [clockEntries, updateClockEntry, updateWorker, getWorkerById, getProjectById, companyId]);

  const handleEditSave = useCallback((id: string, clockIn: Date, clockOut: Date | undefined) => {
    updateClockEntry(id, { clockIn, clockOut });
    setEditEntry(null);
  }, [updateClockEntry]);

  const handleEditDelete = useCallback((id: string) => {
    deleteClockEntry(id);
    setEditEntry(null);
  }, [deleteClockEntry]);

  const isCurrentUserClockedIn = currentUser.clockedIn;

  const exportCsv = () => {
    const rows = [
      ["Worker", "Role", "Project", "Date", "Clock In", "Clock Out", "Hours"],
    ];
    const fmt12 = (d: Date) => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    clockEntries
      .filter((e) => e.clockOut && e.clockOut.getTime() !== 0)
      .sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime())
      .forEach((e) => {
        const w = getWorkerById(e.workerId);
        const p = getProjectById(e.projectId);
        const hrs = ((e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000).toFixed(2);
        rows.push([
          w?.name ?? e.workerId,
          w?.customRole ?? "",
          p?.name ?? e.projectId,
          e.clockIn.toLocaleDateString("en-CA"),
          fmt12(e.clockIn),
          fmt12(e.clockOut!),
          hrs,
        ]);
      });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `constra-time-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allEntries = [
    ...clockedIn.map((w) => ({
      id: `live-${w.id}`,
      workerId: w.id,
      projectId: w.projectIds[0] ?? "",
      clockIn: w.clockInTime ?? new Date(),
      clockOut: undefined as Date | undefined,
      live: true,
    })),
    ...clockEntries
      .filter((e) => e.clockOut && e.clockOut.getTime() !== 0)
      .sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime()),
  ].filter((e) => {
    const worker = getWorkerById(e.workerId);
    if (!worker) return false;
    if (search && !worker.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedProject !== "all" && e.projectId !== selectedProject) return false;
    return true;
  });

  return (
    <>
    {/* ── MOBILE ── */}
    <div className="lg:hidden -mx-4 -mt-4 pb-6">
      {!isOnline && (
        <div className="mx-4 mt-4 mb-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[12px] font-semibold px-4 py-2.5 rounded-xl">
          <WifiOff size={14} />
          You&apos;re offline — clock-ins queued.
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h2 className="text-[18px] font-bold text-white tracking-tight">Time Tracking</h2>
        <button
          onClick={() => requestClockIn(currentUser)}
          className="flex items-center gap-1.5 bg-amber-500 active:bg-amber-600 text-black font-bold text-[13px] px-3.5 py-2 rounded-xl transition-colors"
        >
          <LogIn size={14} />
          Clock In
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 px-4 pb-4 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3 flex items-center gap-2.5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
          <div>
            <p className="text-[20px] font-bold text-white leading-none">{clockedIn.length}</p>
            <p className="text-[11px] text-green-400 font-semibold mt-0.5">On Site</p>
          </div>
        </div>
        <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3 flex items-center gap-2.5">
          <Clock size={15} className="text-sky-400 flex-shrink-0" />
          <div>
            <p className="text-[20px] font-bold text-white leading-none">{todayTotal}h</p>
            <p className="text-[11px] text-sky-400 font-semibold mt-0.5">Today</p>
          </div>
        </div>
        <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3 flex items-center gap-2.5">
          <LogIn size={15} className="text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-[20px] font-bold text-white leading-none">{clockEntries.filter((e) => e.clockIn >= todayStart).length}</p>
            <p className="text-[11px] text-amber-400 font-semibold mt-0.5">Entries</p>
          </div>
        </div>
      </div>

      {/* Clocked In Now */}
      {clockedIn.length > 0 && (
        <div className="px-4 mb-4">
          <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Clocked In Now
          </p>
          {clockedIn.map((worker) => {
            const project = getProjectById(worker.projectIds[0]);
            const ci = worker.clockInTime ?? new Date();
            return (
              <div key={worker.id} className="bg-[#131110] border border-white/[0.07] rounded-xl p-4 flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-[13px] font-bold"
                  style={{ backgroundColor: worker.color + "25", color: worker.color }}>
                  {worker.photo
                    ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" />
                    : worker.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white truncate">{worker.name}</p>
                  <p className="text-[11px] text-white/40 truncate">{project?.name ?? "No project"}</p>
                </div>
                <span className="text-[12px] font-bold text-amber-400 flex-shrink-0 mr-1">{elapsed(ci)}</span>
                <button
                  onClick={() => handleClockOut(worker.id)}
                  className="flex-shrink-0 bg-red-500/15 text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5 text-[12px] font-bold active:bg-red-500/25 transition-colors"
                >
                  Out
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Clock In Worker (admin / PM / foreman only) */}
      {(currentUser.role === "Admin" || currentUser.role === "Project Manager" || currentUser.role === "Foreman") && workers.filter((w) => !w.clockedIn).length > 0 && (
        <div className="px-4 mb-4">
          <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest mb-2.5">Clock In Worker</p>
          <div className="bg-[#131110] border border-white/[0.07] rounded-xl overflow-hidden">
            {workers.filter((w) => !w.clockedIn).map((worker, idx, arr) => (
              <div key={worker.id} className={`flex items-center gap-3 px-4 py-2.5 ${idx < arr.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
                  style={{ backgroundColor: worker.color + "25", color: worker.color }}>
                  {worker.photo
                    ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" />
                    : worker.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white/80 truncate">{worker.name}</p>
                  <p className="text-[11px] text-white/35 truncate">{worker.customRole}</p>
                </div>
                <button
                  onClick={() => requestClockIn(worker)}
                  className="flex-shrink-0 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-lg px-3 py-1.5 text-[12px] font-bold active:bg-amber-500/25 transition-colors"
                >
                  Clock In
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Entries */}
      {clockEntries.length > 0 && (
        <div className="px-4">
          <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest mb-2.5">Recent Entries</p>
          <div className="bg-[#131110] border border-white/[0.07] rounded-xl overflow-hidden">
            {[...clockEntries]
              .sort((a, b) => b.clockIn.getTime() - a.clockIn.getTime())
              .slice(0, 10)
              .map((entry, idx, arr) => {
                const worker = getWorkerById(entry.workerId);
                const project = getProjectById(entry.projectId);
                if (!worker) return null;
                return (
                  <div key={entry.id} className={`flex items-center gap-3 px-4 py-3 ${idx < arr.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{ backgroundColor: worker.color + "25", color: worker.color }}>
                      {worker.photo
                        ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" />
                        : worker.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-white/80 truncate">{worker.name}</p>
                      <p className="text-[10px] text-white/35 truncate">{project?.name ?? "—"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] text-green-400">{fmt(entry.clockIn)}</p>
                      <p className={`text-[11px] ${entry.clockOut ? "text-white/40" : "text-amber-400"}`}>
                        {entry.clockOut ? fmt(entry.clockOut) : "Active"}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>

    {/* ── DESKTOP ── */}
    <div className="hidden lg:block">
    <div className="space-y-5 max-w-[1200px]">
      {/* Offline banner */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[12px] font-semibold px-4 py-2.5 rounded-xl">
          <WifiOff size={14} />
          You&apos;re offline — clock-ins will be queued and synced when reconnected.
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Time Tracking</h2>
          <p className="text-white/35 text-sm mt-0.5">
            {clockedIn.length} worker{clockedIn.length !== 1 ? "s" : ""} on site · {todayTotal}h logged today
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {clockEntries.filter((e) => e.clockOut).length > 0 && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/50 hover:text-white font-bold text-[13px] px-4 py-2 rounded-lg transition-all"
            >
              <Download size={14} />
              Export CSV
            </button>
          )}
          {clockedIn.length > 1 && (currentUser.role === "Admin" || currentUser.role === "Project Manager") && (
            <button
              onClick={() => setClockOutAllConfirm(true)}
              className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/50 hover:text-white font-bold text-[13px] px-4 py-2 rounded-lg transition-all"
            >
              <LogOut size={14} />
              Clock Out All ({clockedIn.length})
            </button>
          )}
          {isCurrentUserClockedIn ? (
            <button onClick={() => handleClockOut(currentUser.id)}
              className="flex items-center gap-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-[13px] px-4 py-2 rounded-lg transition-all">
              <LogOut size={14} />
              Clock Out
            </button>
          ) : (
            <button onClick={() => requestClockIn(currentUser)}
              className="flex items-center gap-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 font-bold text-[13px] px-4 py-2 rounded-lg transition-all">
              <LogIn size={14} />
              Clock In
            </button>
          )}
        </div>
      </div>

      {/* Mobile hero clock-in card */}
      <div className="sm:hidden">
        {isCurrentUserClockedIn ? (
          <div className="bg-[#0f1a0f] border border-green-500/30 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-green-400">You&apos;re clocked in</p>
              {currentUser.clockInTime && (
                <p className="text-[12px] text-white/40 mt-0.5">Since {currentUser.clockInTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
              )}
            </div>
            <button
              onClick={() => handleClockOut(currentUser.id)}
              className="flex flex-col items-center gap-1 bg-red-500/15 active:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-[12px] px-4 py-3 rounded-xl transition-all"
            >
              <LogOut size={18} />
              Clock Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => requestClockIn(currentUser)}
            className="w-full bg-green-500/10 active:bg-green-500/20 border-2 border-green-500/40 text-green-400 rounded-2xl py-6 flex flex-col items-center gap-2 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <LogIn size={28} />
            </div>
            <span className="text-[18px] font-black tracking-tight">Clock In</span>
            <span className="text-[12px] text-green-400/60">Tap to start your shift</span>
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "On Site Now", value: clockedIn.length, sub: "workers live", color: "#22c55e" },
          { label: "Hours Today", value: `${todayTotal}h`, sub: "all workers combined", color: "#3b82f6" },
          { label: "Total Sessions", value: clockEntries.filter((e) => e.clockOut && e.clockOut.getTime() !== 0).length, sub: "completed all time", color: "#f59e0b" },
          { label: "Active Projects", value: activeProjects.length, sub: "currently running", color: "#8b5cf6" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-[12px] font-semibold mt-0.5" style={{ color }}>{label}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Currently clocked in */}
      {clockedIn.length > 0 && (
        <div>
          <h3 className="text-[14px] font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Currently On Site
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {clockedIn.map((worker) => {
              const project = getProjectById(worker.projectIds[0]);
              const ci = worker.clockInTime ?? new Date();
              return (
                <div key={worker.id} className="bg-[#111111] border border-green-500/20 rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500/30" />
                  <div className="w-full h-24 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden"
                    style={{ background: `${worker.color}12` }}>
                    {worker.photo
                      ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover rounded-lg" />
                      : <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: worker.color + "30", color: worker.color }}>{worker.initials}</div>
                    }
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/60 text-[9px] text-white/70 px-1.5 py-0.5 rounded">
                      <Camera size={8} />
                      {worker.photo ? "Clock-in photo" : "No photo"}
                    </div>
                  </div>
                  <p className="text-[13px] font-bold text-white">{worker.name}</p>
                  <p className="text-[11px] text-white/40 mb-2">{worker.customRole}</p>
                  <div className="flex items-center gap-1 text-[11px] text-white/30 mb-1">
                    <MapPin size={9} />
                    <span className="truncate">{project?.name ?? "No project assigned"}</span>
                  </div>
                  {worker.clockInGps ? (
                    <a
                      href={`https://www.google.com/maps?q=${worker.clockInGps.lat},${worker.clockInGps.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-green-400/60 hover:text-green-400 mb-2 transition-colors"
                    >
                      <Navigation size={8} />
                      <span>{worker.clockInGps.lat.toFixed(5)}, {worker.clockInGps.lng.toFixed(5)}</span>
                    </a>
                  ) : (
                    <div className="mb-2" />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/30">Since {fmt(ci)}</span>
                    <span className="text-amber-400 text-[12px] font-bold">{elapsed(ci)}</span>
                  </div>
                  {worker.id !== currentUser.id && (
                    <button onClick={() => handleClockOut(worker.id)}
                      className="mt-3 w-full text-[11px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/15 py-1.5 rounded-lg transition-colors">
                      Clock Out
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Off site — quick clock in buttons */}
      {workers.filter((w) => !w.clockedIn).length > 0 && (
        <div>
          <h3 className="text-[14px] font-bold text-white/50 mb-3">Off Site</h3>
          <div className="flex gap-2 flex-wrap">
            {workers.filter((w) => !w.clockedIn).map((worker) => (
              <button key={worker.id} onClick={() => requestClockIn(worker)}
                className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] hover:border-green-500/30 hover:bg-green-500/[0.04] rounded-lg px-3 py-2 transition-all group">
                <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                  style={{ backgroundColor: worker.color + "25", color: worker.color }}>
                  {worker.photo
                    ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" />
                    : worker.initials}
                </div>
                <span className="text-[12px] text-white/50 group-hover:text-white/70 transition-colors">{worker.name}</span>
                <LogIn size={11} className="text-white/20 group-hover:text-green-400 transition-colors ml-1" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-2 flex-1 max-w-56">
          <Search size={13} className="text-white/30" />
          <input className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1"
            placeholder="Search workers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <CustomSelect
          className="bg-[#111111] border border-white/[0.06] text-white/60 text-[12px] rounded-lg px-3 py-2 outline-none cursor-pointer"
          value={selectedProject}
          onChange={(v) => setSelectedProject(v)}
          options={[
            { value: "all", label: "All Projects" },
            ...projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      {/* Overtime alerts */}
      {(() => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const overtimeWorkers: { name: string; reason: string }[] = [];
        workers.forEach((w) => {
          const wEntries = clockEntries.filter((e) => e.workerId === w.id && e.clockOut);
          const todayHrs = wEntries
            .filter((e) => e.clockIn >= todayStart)
            .reduce((s, e) => s + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0);
          const weekHrs = wEntries
            .filter((e) => e.clockIn >= weekStart)
            .reduce((s, e) => s + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0);
          if (todayHrs > 8) overtimeWorkers.push({ name: w.name, reason: `${todayHrs.toFixed(1)}h today` });
          else if (weekHrs > 44) overtimeWorkers.push({ name: w.name, reason: `${weekHrs.toFixed(1)}h this week` });
        });
        if (overtimeWorkers.length === 0) return null;
        return (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/25 bg-amber-500/8 text-[12px] text-amber-300">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-amber-400" />
            <div>
              <span className="font-bold">Overtime detected:</span>
              <span className="text-amber-300/70 ml-2">
                {overtimeWorkers.map((o) => `${o.name} (${o.reason})`).join(" · ")}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Verification flags summary — Admin/PM only */}
      {(currentUser.role === "Admin" || currentUser.role === "Project Manager") && (() => {
        const flaggedEntries = clockEntries.filter(
          (e) => e.verificationFlags && e.verificationFlags.length > 0
        );
        const highCount = flaggedEntries.filter((e) =>
          e.verificationFlags!.some((f) => f.severity === "high")
        ).length;
        if (flaggedEntries.length === 0) return null;
        return (
          <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-[12px] ${
            highCount > 0
              ? "bg-red-500/[0.06] border-red-500/25 text-red-300"
              : "bg-amber-500/[0.06] border-amber-500/20 text-amber-300"
          }`}>
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                {flaggedEntries.length} clock-in{flaggedEntries.length !== 1 ? "s" : ""} flagged
                {highCount > 0 && ` (${highCount} high severity)`}
              </span>
              <span className="text-white/40 ml-2">— tap the flag icon on a row to see details</span>
            </div>
          </div>
        );
      })()}

      {/* Entries table */}
      {allEntries.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <Clock size={32} className="text-white/10" />
          <p className="text-[13px] text-white/25">No time entries yet.</p>
          <p className="text-[12px] text-white/20">Use the Clock In button above to start tracking time.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl">
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden min-w-[700px]">
          <div className="grid text-[10px] font-bold uppercase tracking-widest text-white/25 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]"
            style={{ gridTemplateColumns: "2fr 1fr 100px 100px 100px 80px 64px" }}>
            <span>Worker</span><span>Project</span><span>Date</span>
            <span>Clock In</span><span>Clock Out</span><span className="text-right">Hours</span><span className="text-right">Flags</span>
          </div>

          {allEntries.map((entry) => {
            const worker = getWorkerById(entry.workerId);
            const project = getProjectById(entry.projectId);
            if (!worker) return null;
            const hrs = entry.clockOut
              ? ((entry.clockOut.getTime() - entry.clockIn.getTime()) / 3600000).toFixed(1)
              : null;
            const isLive = !!(entry as { live?: boolean }).live;
            const hasGps = !isLive && (entry as { gps?: GpsLocation }).gps;
            const flags: VerificationFlag[] = (!isLive && (entry as { verificationFlags?: VerificationFlag[] }).verificationFlags) || [];
            const worstSeverity = flags.some((f) => f.severity === "high")
              ? "high"
              : flags.some((f) => f.severity === "medium")
              ? "medium"
              : flags.length > 0 ? "low" : null;
            const flagColor = worstSeverity === "high" ? "text-red-400" : worstSeverity === "medium" ? "text-amber-400" : "text-blue-400/70";
            return (
              <div key={entry.id} className={`border-b border-white/[0.04] last:border-0 ${worstSeverity === "high" ? "bg-red-500/[0.03]" : ""}`}>
              <div className={`grid items-center px-5 py-3 hover:bg-white/[0.02] transition-colors group`}
                style={{ gridTemplateColumns: "2fr 1fr 100px 100px 100px 80px 64px" }}>
                <div className="flex items-center gap-3">
                  {isLive && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0" />}
                  <div className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: worker.color + "25", color: worker.color }}>
                    {worker.photo
                      ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" />
                      : worker.initials}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-white/85">{worker.name}</p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] text-white/35">{worker.customRole}</p>
                      {hasGps && (
                        <a
                          href={`https://www.google.com/maps?q=${(entry as { gps?: GpsLocation }).gps!.lat},${(entry as { gps?: GpsLocation }).gps!.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View clock-in location on Google Maps"
                          onClick={(e) => e.stopPropagation()}
                          className="text-green-400/60 hover:text-green-400 transition-colors"
                        >
                          <MapPin size={9} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[12px] text-white/45 truncate pr-2">{project?.name ?? "—"}</span>
                <span className="text-[12px] text-white/45">
                  {entry.clockIn.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                </span>
                <span className="text-[12px] text-green-400 font-semibold">{fmt(entry.clockIn)}</span>
                <span className={`text-[12px] font-semibold ${entry.clockOut ? "text-white/50" : "text-amber-400"}`}>
                  {entry.clockOut ? fmt(entry.clockOut) : "Live"}
                </span>
                <span className={`text-right text-[13px] font-bold ${entry.clockOut ? "text-white/70" : "text-amber-400"}`}>
                  {entry.clockOut ? `${hrs}h` : elapsed(entry.clockIn)}
                </span>
                <div className="flex items-center justify-end gap-1">
                  {worstSeverity && (
                    <button
                      onClick={() => setFlagDetailId(flagDetailId === entry.id ? null : entry.id)}
                      className={`flex items-center gap-0.5 ${flagColor} opacity-80 hover:opacity-100 transition-opacity`}
                      aria-label={`${flags.length} verification flag${flags.length !== 1 ? "s" : ""} — tap for details`}
                    >
                      <AlertTriangle size={12} />
                      {flags.length > 1 && <span className="text-[9px] font-bold">{flags.length}</span>}
                    </button>
                  )}
                  {!isLive && (
                    <button
                      onClick={() => {
                        const w = getWorkerById(entry.workerId);
                        setEditEntry({
                          id: entry.id,
                          workerName: w?.name ?? "Worker",
                          clockIn: entry.clockIn,
                          clockOut: entry.clockOut,
                        });
                      }}
                      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/5 rounded transition-all"
                    >
                      <Edit2 size={11} />
                    </button>
                  )}
                </div>
              </div>
              {flagDetailId === entry.id && flags.length > 0 && (
                <div className="px-5 pb-3 space-y-1.5">
                  {flags.map((f, i) => (
                    <div key={i} className={`flex items-start gap-2 text-[11px] px-3 py-2 rounded-lg ${f.severity === "high" ? "bg-red-500/10 text-red-300" : f.severity === "medium" ? "bg-amber-500/10 text-amber-300" : "bg-blue-500/10 text-blue-300"}`}>
                      <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                      <span><span className="font-bold uppercase text-[9px] tracking-wider mr-1.5">{f.severity}</span>{f.note}</span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            );
          })}
        </div>
        </div>
      )}

    </div>
    </div>{/* end desktop */}

    {/* ── MODALS (work on both breakpoints) ── */}
    {projectPickerTarget && (
      <ProjectPickerModal
        worker={projectPickerTarget}
        projects={activeProjects}
        onSelect={handleProjectSelected}
        onClose={() => setProjectPickerTarget(null)}
      />
    )}

    {geofenceChecking && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <div className="bg-[#161616] border border-white/[0.08] rounded-2xl px-8 py-7 flex flex-col items-center gap-4 shadow-2xl">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Navigation size={22} className="text-amber-400" />
            </div>
            <Loader2 size={14} className="text-amber-400 animate-spin absolute -bottom-1 -right-1" />
          </div>
          <div className="text-center">
            <p className="text-[14px] font-bold text-white">Checking location…</p>
            <p className="text-[11px] text-white/35 mt-1">Verifying you&apos;re on site</p>
          </div>
        </div>
      </div>
    )}

    {geofenceWarning && (
      <GeofenceWarningModal
        warning={geofenceWarning}
        onOverride={() => {
          const { worker, projectId } = geofenceWarning;
          setGeofenceWarning(null);
          setCameraTarget({ worker, projectId });
        }}
        onCancel={() => setGeofenceWarning(null)}
      />
    )}

    {cameraTarget && (
      <CameraCapture
        workerName={cameraTarget.worker.name}
        onCapture={handlePhotoConfirmed}
        onClose={() => setCameraTarget(null)}
      />
    )}

    {editEntry && (
      <EditEntryModal
        entry={editEntry}
        onSave={handleEditSave}
        onDelete={handleEditDelete}
        onClose={() => setEditEntry(null)}
      />
    )}

    <ConfirmModal
      open={clockOutAllConfirm}
      title={`Clock Out All Workers`}
      body={`Clock out all ${clockedIn.length} workers currently on site? This cannot be undone.`}
      confirmLabel="Clock Out All"
      danger={false}
      onConfirm={() => { clockedIn.forEach((w) => handleClockOut(w.id)); setClockOutAllConfirm(false); }}
      onCancel={() => setClockOutAllConfirm(false)}
    />
    </>
  );
}
