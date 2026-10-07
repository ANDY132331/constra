"use client";

import { toast } from "sonner";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Clock, Camera, Search, MapPin, LogIn, LogOut, Edit2, X, AlertTriangle, WifiOff, ChevronRight, Loader2, ShieldAlert, Navigation, Download, BarChart3 } from "lucide-react";
import { ConfirmModal } from "@/components/confirm-modal";
import { EmptyState } from "@/components/empty-state";
import { useStore } from "@/lib/store";
const CameraCapture = dynamic(
  () => import("@/components/camera-capture").then((m) => ({ default: m.CameraCapture })),
  { ssr: false },
);
import type { Worker, GpsLocation, VerificationFlag } from "@/lib/mock-data";
import { runVerification } from "@/lib/verification";
import { uploadPhoto } from "@/lib/supabase/storage";
import { SUPABASE_ENABLED } from "@/lib/supabase/client";
import { useFileUrl } from "@/lib/supabase/signed-url";

// Small inline thumbnail for the worker avatar (a few KB instead of the full selfie)
function thumbnail(dataUrl: string, size = 96): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = size / Math.max(img.width, img.height);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function ClockPhoto({ src, className }: { src: string; className?: string }) {
  const { url } = useFileUrl(src);
  if (!url) return <div className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={className} />;
}
import { sendPushEvent } from "@/lib/push-client";
import { CustomSelect } from "@/components/ui/custom-select";
import { isForemanOrAbove } from "@/lib/permissions";
import { hoursBetween, elapsedLabel } from "@/lib/hours";

const elapsed = (start: Date, end?: Date): string => elapsedLabel(start, end);

/** Past this many hours an open shift is almost certainly a forgotten clock-out. */
const LONG_SHIFT_HOURS = 16;

function fmt(date: Date | string) {
  return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// Edit entry modal
type EditEntryState = {
  id: string;
  workerId?: string;
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="sheet bg-[#161616] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-[15px] font-bold text-white">Edit Time Entry</h3>
            <p className="text-[11px] text-white/35 mt-0.5">{entry.workerName}</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/5 active:bg-white/10 transition-all">
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
              className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 transition-colors">
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
  recentProjectId,
  onSelect,
  onClose,
}: {
  worker: Worker;
  projects: { id: string; name: string; color: string; client?: string }[];
  recentProjectId?: string;
  onSelect: (projectId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Escape closes; the page behind doesn't scroll while the sheet is up
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const main = document.querySelector<HTMLElement>("main");
    const prev = main?.style.overflow ?? "";
    if (main) main.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); if (main) main.style.overflow = prev; };
  }, [onClose]);

  // Last-used site first, then the worker's assigned projects, then everything else
  const ordered = useMemo(() => {
    const assigned = new Set(worker.projectIds ?? []);
    const rank = (id: string) => (id === recentProjectId ? 0 : assigned.has(id) ? 1 : 2);
    return [...projects].sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
  }, [projects, worker.projectIds, recentProjectId]);

  const q = query.trim().toLowerCase();
  const shown = q ? ordered.filter((p) => p.name.toLowerCase().includes(q) || (p.client ?? "").toLowerCase().includes(q)) : ordered;

  const sheet = (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pick-project-title"
        className="sheet bg-[#161616] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-sm flex flex-col max-h-[85dvh] sm:max-h-[80vh] overflow-hidden"
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-6 pb-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="min-w-0">
            <h3 id="pick-project-title" className="text-[16px] font-bold text-white">Which site?</h3>
            <p className="text-[12px] text-white/40 mt-0.5 truncate">Clocking in {worker.name}</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 active:bg-white/10 transition-all">
            <X size={18} />
          </button>
        </div>

        {projects.length > 6 && (
          <div className="px-5 pt-3 flex-shrink-0">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" aria-hidden />
              <input
                id="pick-project-search"
                aria-label="Search projects"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2.5 text-[14px] text-white placeholder:text-white/30 outline-none focus:border-amber-500/50"
              />
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-3 space-y-2">
          {projects.length === 0 ? (
            <p className="text-[13px] text-white/40 text-center py-6">No active projects. Add a project first.</p>
          ) : shown.length === 0 ? (
            <p className="text-[13px] text-white/40 text-center py-6">No projects match “{query}”.</p>
          ) : (
            shown.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className="w-full min-h-[56px] flex items-center gap-3 px-4 py-3 rounded-xl border border-white/[0.08] hover:border-amber-500/40 hover:bg-amber-500/[0.05] active:bg-amber-500/10 transition-all text-left"
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-semibold text-white/85 truncate">{p.name}</span>
                  {(p.id === recentProjectId || p.client) && (
                    <span className="block text-[11.5px] text-white/40 truncate">
                      {p.id === recentProjectId ? "Last site" : p.client}
                    </span>
                  )}
                </span>
                <ChevronRight size={16} className="text-white/30 flex-shrink-0" />
              </button>
            ))
          )}
        </div>

        <div className="px-5 pt-2 pb-4 flex-shrink-0 border-t border-white/[0.06]">
          <p className="text-[11.5px] text-white/40 text-center py-2">Tap a site to take your clock-in photo</p>
        </div>
      </div>
    </div>
  );

  return mounted ? createPortal(sheet, document.body) : null;
}

function haversineM(a: GpsLocation, b: GpsLocation): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function fmtDist(m: number) {
  if (m < 0) return "Unknown";
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

/** Try to get the device's current position once, with the given timeout. */
function tryGetPosition(timeoutMs: number): Promise<GeolocationPosition | null> {
  return new Promise((res) => {
    if (!("geolocation" in navigator)) return res(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => res(pos),
      () => res(null),
      { timeout: timeoutMs, maximumAge: 15_000, enableHighAccuracy: true },
    );
  });
}

/**
 * Check whether the device is within `radiusM` metres of `projectGps`.
 * Makes up to two attempts so transient failures don't block clock-in:
 *   • First pass: 10 s timeout, high-accuracy mode
 *   • Retry if failed or accuracy is worse than 3× the radius (for small sites)
 */
async function getGeofenceResult(
  projectGps: GpsLocation,
  radiusM: number,
): Promise<{ ok: boolean; distanceM: number; accuracyM: number }> {
  let pos = await tryGetPosition(10_000);

  // Retry when: no fix yet, or accuracy is so bad it's meaningless for small sites
  const accuracyTooCoarse = pos && pos.coords.accuracy > radiusM * 3 && radiusM < 2_000;
  if (!pos || accuracyTooCoarse) {
    pos = await tryGetPosition(15_000);
  }

  if (!pos) return { ok: false, distanceM: -1, accuracyM: -1 };

  const accuracyM = pos.coords.accuracy ?? 0;
  const distanceM = haversineM(
    { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: accuracyM },
    projectGps,
  );
  // Worker is "ok" if they're within radius; accuracy blur is acceptable on large sites
  return { ok: distanceM <= radiusM, distanceM, accuracyM };
}

type GeofenceWarning = {
  worker: Worker;
  projectId: string;
  projectName: string;
  distanceM: number;
  accuracyM: number;
  radiusM: number;
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/75 backdrop-blur-sm">
      <div className="sheet bg-[#161616] border border-amber-500/25 rounded-t-2xl sm:rounded-2xl w-full max-w-sm shadow-2xl">
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
              <span className="text-[13px] font-black text-amber-400">{fmtDist(warning.distanceM)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-white/40">Allowed radius</span>
              <span className="text-[12px] text-white/60">{fmtDist(warning.radiusM)}</span>
            </div>
            {warning.accuracyM > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-white/40">GPS accuracy</span>
                <span className={`text-[12px] font-semibold ${warning.accuracyM > warning.radiusM ? "text-red-400" : "text-white/60"}`}>
                  ±{fmtDist(warning.accuracyM)}
                </span>
              </div>
            )}
            {warning.distanceM > 0 && (
              <div className="mt-2">
                <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${Math.min(100, (warning.radiusM / warning.distanceM) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-white/25">Site boundary</span>
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
              className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onOverride}
              className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition-colors flex items-center justify-center gap-2"
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
    getWorkerById, getProjectById, companyId, companyName,
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
  const [photoView, setPhotoView] = useState<{ src: string; caption: string } | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Reading navigator.onLine (external system) on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // Suppress unused tick warning
  void tick;

  // Workers (employees) only see their own data
  const isEmployee = !isForemanOrAbove(currentUser.role);

  const activeProjects = useMemo(() => projects.filter((p) => p.status === "active"), [projects]);

  const todayStart = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  // Recompute when tick fires (which happens every 30s — cheap date reset)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // Cross-check: only show worker as "live" if they have an actual open clock entry (no clockOut).
  const clockedIn = useMemo(() => (isEmployee
    ? workers.filter((w) => w.clockedIn && w.id === currentUser.id)
    : workers.filter((w) => w.clockedIn)
  ).filter((w) => clockEntries.some((e) => e.workerId === w.id && !e.clockOut)),
  [isEmployee, workers, currentUser.id, clockEntries]);

  const workerMatches = useCallback((w: Worker) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return w.name.toLowerCase().includes(q) || (w.customRole ?? w.role ?? "").toLowerCase().includes(q);
  }, [search]);
  /** Crew shown in the lists — the counts above them stay on the whole crew. */
  const clockedInShown = useMemo(() => clockedIn.filter(workerMatches), [clockedIn, workerMatches]);
  const availableShown = useMemo(() => workers.filter((w) => !w.clockedIn && workerMatches(w)), [workers, workerMatches]);

  const todayHours = useMemo(() => clockEntries
    .filter((e) => e.clockOut && new Date(e.clockIn) >= todayStart)
    .reduce((s, e) => s + hoursBetween(e.clockIn, e.clockOut!), 0),
  [clockEntries, todayStart]);

  // tick drives live-elapsed recomputation every 30s
  const liveHours = useMemo(() => clockedIn.reduce((s, w) => {
    if (!w.clockInTime) return s;
    return s + hoursBetween(w.clockInTime);
  }, 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [clockedIn, tick]);

  const todayTotal = (todayHours + liveHours).toFixed(1);

  const proceedToCamera = useCallback(async (worker: Worker, projectId: string) => {
    const project = getProjectById(projectId);
    if (project?.gps) {
      setGeofenceChecking(true);
      const radiusM = project.geofenceRadius ?? 500;
      const { ok, distanceM, accuracyM } = await getGeofenceResult(project.gps, radiusM);
      setGeofenceChecking(false);
      if (!ok) {
        setGeofenceWarning({ worker, projectId, projectName: project.name, distanceM, accuracyM, radiusM });
        return;
      }
    }
    setCameraTarget({ worker, projectId });
  }, [getProjectById]);

  const clockingInRef = useRef(false);

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
    if (!cameraTarget || clockingInRef.current) return;
    const { worker, projectId } = cameraTarget;
    // A second open shift would be paid twice once both are closed
    if (clockEntries.some((e) => e.workerId === worker.id && !e.clockOut)) {
      setCameraTarget(null);
      toast.error(`${worker.name} is already clocked in`);
      return;
    }
    clockingInRef.current = true;
    try {
    const now = new Date();
    const deviceInfo = navigator.userAgent.slice(0, 200);

    // Store the selfie in the private bucket and keep only its link on the entry; fall back to
    // the inline image when offline so the clock-in still records a photo.
    const storedUrl = SUPABASE_ENABLED && companyId && navigator.onLine
      ? await Promise.race([
          uploadPhoto(dataUrl, "clock-photos", companyId, `${worker.id}/${now.getTime()}.jpg`),
          new Promise<null>((r) => setTimeout(() => r(null), 8000)),
        ])
      : null;
    const avatar = await thumbnail(dataUrl);

    const newEntry = { workerId: worker.id, projectId, clockIn: now, clockInPhoto: storedUrl ?? dataUrl, gps, deviceInfo };
    const entryId = addClockEntry(newEntry);
    updateWorker(worker.id, { clockedIn: true, clockInTime: now, photo: avatar, clockInGps: gps });

    // Fire push notification to all subscribed devices
    void sendPushEvent({ event: "clock-in", workerId: worker.id, projectId });

    // Update device history
    const existing = worker.deviceHistory ?? [];
    const matched = existing.find((d) => d.ua === deviceInfo);
    const updatedHistory = matched
      ? existing.map((d) => d.ua === deviceInfo ? { ...d, lastSeen: now } : d)
      : [...existing, { ua: deviceInfo, firstSeen: now, lastSeen: now }];
    updateWorker(worker.id, { deviceHistory: updatedHistory });

    setCameraTarget(null);
    toast.success(`${worker.name} clocked in`);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([80, 30, 80]);

    // Run background verification silently after UI is updated
    const project = getProjectById(projectId);
    try {
      const flags = await runVerification({ entry: { ...newEntry, clockInPhoto: dataUrl }, worker, project, pastEntries: clockEntries });
      if (flags.length > 0) {
        updateClockEntry(entryId, { verificationFlags: flags });
      }
    } catch (e) {
      console.error("[time-tracking] runVerification failed:", e);
    }
    } finally {
      clockingInRef.current = false;
    }
  }, [cameraTarget, clockEntries, addClockEntry, updateClockEntry, updateWorker, getProjectById, companyId]);

  const handleClockOut = useCallback((workerId: string) => {
    const now = new Date();
    // Find ALL open entries for this worker and close them all (prevents orphaned running timers)
    const openEntries = clockEntries.filter((e) => e.workerId === workerId && !e.clockOut);
    const entry = openEntries.reduce<typeof openEntries[0] | undefined>((latest, e) =>
      !latest || new Date(e.clockIn) > new Date(latest.clockIn) ? e : latest, undefined);
    // Close every open entry (defensive: should only ever be one)
    openEntries.forEach((e) => updateClockEntry(e.id, { clockOut: now }));
    if (entry) {
      const worker = getWorkerById(workerId);
      const hrs = hoursBetween(entry.clockIn, now).toFixed(1);
      void sendPushEvent({ event: "clock-out", workerId: entry.workerId, projectId: entry.projectId, hours: Number(hrs) });
      toast.success(`${worker?.name ?? "Worker"} clocked out — ${hrs}h logged`);
    }
    // Always clear the worker's live status, even if no open entry was found (fixes stale Supabase state)
    updateWorker(workerId, { clockedIn: false, clockInTime: undefined, clockInGps: undefined });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(60);
  }, [clockEntries, updateClockEntry, updateWorker, getWorkerById, getProjectById, companyId]);

  const handleEditSave = useCallback((id: string, clockIn: Date, clockOut: Date | undefined) => {
    updateClockEntry(id, { clockIn, clockOut });
    setEditEntry(null);
    toast.success("Time entry updated");
  }, [updateClockEntry]);

  const handleEditDelete = useCallback((id: string) => {
    deleteClockEntry(id);
    setEditEntry(null);
    toast.success("Time entry deleted");
  }, [deleteClockEntry]);

  const isCurrentUserClockedIn = currentUser.clockedIn;

  const exportCsv = () => {
    const rows = [
      ["Worker", "Role", "Project", "Date", "Clock In", "Clock Out", "Hours"],
    ];
    const fmt12 = (d: Date | string) => new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    // A shift still running has no clock-out, so it cannot be exported as hours worked.
    // That is correct, but it used to happen silently: export at 3pm with the crew on site
    // and the file quietly came back without them.
    const done = clockEntries.filter((e) => e.clockOut && new Date(e.clockOut).getTime() !== 0);
    const stillOn = clockEntries.length - done.length;
    if (done.length === 0) {
      toast.error(
        stillOn > 0
          ? "Nothing to export yet — every shift is still running. Clock out first."
          : "Nothing to export yet — no completed shifts.",
      );
      return;
    }
    done
      .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
      .forEach((e) => {
        const w = getWorkerById(e.workerId);
        const p = getProjectById(e.projectId);
        const hrs = (hoursBetween(e.clockIn, e.clockOut!)).toFixed(2);
        rows.push([
          w?.name ?? e.workerId,
          w?.customRole || w?.role || "",
          p?.name ?? e.projectId,
          new Date(e.clockIn).toLocaleDateString("en-CA"),
          fmt12(e.clockIn),
          fmt12(e.clockOut!),
          hrs,
        ]);
      });
    // Leading ' stops spreadsheets running cell text as a formula; BOM makes Excel read UTF-8 names
    const cell = (c: unknown) => { const s = String(c); return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`; };
    const csv = "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `constra-time-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      stillOn > 0
        ? `Exported ${done.length} ${done.length === 1 ? "entry" : "entries"} — ${stillOn} still on site, not included`
        : `Exported ${done.length} ${done.length === 1 ? "entry" : "entries"}`,
    );
  };

  const allEntries = [
    ...clockedIn.map((w) => {
      const activeEntry = [...clockEntries].reverse().find((e) => e.workerId === w.id && !e.clockOut);
      return {
        id: `live-${w.id}`,
        workerId: w.id,
        // Prefer the actual clock entry projectId; fall back to worker's primary project
        projectId: activeEntry?.projectId ?? w.projectIds[0] ?? "",
        // Prefer the actual clock entry clockIn timestamp — w.clockInTime can be stale
        clockIn: activeEntry?.clockIn ?? w.clockInTime ?? new Date(),
        clockOut: undefined as Date | undefined,
        live: true,
        verificationFlags: activeEntry?.verificationFlags,
        clockInPhoto: activeEntry?.clockInPhoto,
      };
    }),
    ...clockEntries
      .filter((e) => {
        if (e.clockOut && new Date(e.clockOut).getTime() !== 0) return true;
        // Orphaned active entry: no clockOut but worker is no longer clocked in — show in table
        return !clockedIn.some((w) => w.id === e.workerId);
      })
      .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime()),
  ].filter((e) => {
    const worker = getWorkerById(e.workerId);
    if (!worker) return false;
    // Employees only see their own entries
    if (isEmployee && e.workerId !== currentUser.id) return false;
    if (search) {
      const q = search.toLowerCase();
      const proj = getProjectById(e.projectId);
      if (!worker.name.toLowerCase().includes(q) && !(proj?.name.toLowerCase().includes(q))) return false;
    }
    if (selectedProject !== "all" && e.projectId !== selectedProject) return false;
    return true;
  });

  return (
    <>
    {/* ── MOBILE ── */}
    <div className="lg:hidden -mx-5 -mt-5 pb-6">
      {!isOnline && (
        <div className="mx-4 mt-4 mb-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[12px] font-semibold px-4 py-2.5 rounded-xl">
          <WifiOff size={14} />
          You&apos;re offline — clock-ins queued.
        </div>
      )}

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="text-[22px] font-bold text-white">Time</h2>
        <div className="flex items-center gap-2">
          {clockEntries.filter((e) => e.clockOut).length > 0 && !isEmployee && (
            <button onClick={exportCsv} className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.08] text-white/50 text-[12px] font-bold px-2.5 py-1.5 rounded-full">
              <Download size={12} /> CSV
            </button>
          )}
          {clockedIn.length > 1 && (currentUser.role === "Admin" || currentUser.role === "Project Manager") && (
            <button onClick={() => setClockOutAllConfirm(true)} className="flex items-center gap-1 bg-white/[0.06] border border-white/[0.08] text-white/50 text-[12px] font-bold px-2.5 py-1.5 rounded-full">
              <LogOut size={12} /> All Out
            </button>
          )}
          {/* Small clock-in button shown only for admin/foreman in top bar */}
          {!isEmployee && !isCurrentUserClockedIn && (
            <button
              aria-label="Clock in"
              onClick={() => requestClockIn(currentUser)}
              className="flex items-center gap-1.5 bg-amber-500 active:bg-amber-600 text-black font-bold text-[13px] px-3.5 py-2 rounded-full transition-colors"
            >
              <LogIn size={14} />
              Clock In
            </button>
          )}
        </div>
      </div>

      {/* ── Big hero clock-in / clock-out card — employees & foremen ── */}
      <div className="px-5 pb-5">
        <div className={`rounded-3xl overflow-hidden border transition-all relative ${
          isCurrentUserClockedIn
            ? "border-green-500/25"
            : "border-amber-500/20"
        }`} style={{
          background: isCurrentUserClockedIn
            ? "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.03) 100%)"
            : "linear-gradient(135deg, rgba(245,196,0,0.08) 0%, rgba(245,196,0,0.03) 100%)"
        }}>
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: isCurrentUserClockedIn
              ? "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(34,197,94,0.12) 0%, transparent 100%)"
              : "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,196,0,0.10) 0%, transparent 100%)"
          }} />

          <div className="relative p-5">
            {isCurrentUserClockedIn ? (
              <div className="flex items-center gap-4 mb-5">
                <div className="relative flex-shrink-0">
                  <div className="absolute -inset-2 rounded-full bg-green-500/15 animate-ping" style={{animationDuration:"2.5s"}} />
                  <div className="relative w-14 h-14 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                    <span className="w-4 h-4 bg-green-400 rounded-full" style={{boxShadow:"0 0 12px rgba(34,197,94,0.6)"}} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold text-green-400/80 uppercase tracking-widest">On Site</span>
                  </div>
                  <p className="text-[28px] font-black text-green-400 leading-none tracking-tight tabular-nums">
                    {elapsed(currentUser.clockInTime ?? new Date())}
                  </p>
                  {(() => {
                    const myEntry = [...clockEntries].reverse().find((e) => e.workerId === currentUser.id && !e.clockOut);
                    const proj = myEntry ? getProjectById(myEntry.projectId) : null;
                    return proj ? (
                      <p className="text-[12px] text-white/40 mt-1 flex items-center gap-1">
                        <MapPin size={10} className="flex-shrink-0 text-white/25" />
                        <span className="truncate">{proj.name}</span>
                      </p>
                    ) : null;
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-center mb-5 pt-2">
                <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mx-auto mb-3">
                  <LogIn size={28} className="text-amber-400" strokeWidth={2} />
                </div>
                <p className="text-[17px] font-bold text-white">Ready to start your shift?</p>
                <p className="text-[12px] text-white/35 mt-1">GPS + photo verification</p>
              </div>
            )}

            {isCurrentUserClockedIn ? (
              <button
                onClick={() => handleClockOut(currentUser.id)}
                className="w-full py-4 rounded-2xl text-[17px] font-black text-white transition-all flex items-center justify-center gap-2.5 active:scale-[0.97]"
                style={{
                  background: "linear-gradient(145deg, #ef4444, #dc2626)",
                  boxShadow: "0 6px 28px rgba(239,68,68,0.30), inset 0 1px 0 rgba(255,255,255,0.12)"
                }}
              >
                <LogOut size={20} strokeWidth={2.5} />
                Clock Out
              </button>
            ) : (
              <button
                onClick={() => requestClockIn(currentUser)}
                disabled={geofenceChecking}
                className="w-full py-4 rounded-2xl text-[17px] font-black text-black disabled:opacity-60 transition-all flex items-center justify-center gap-2.5 active:scale-[0.97]"
                style={{
                  background: geofenceChecking ? "rgba(245,196,0,0.5)" : "linear-gradient(145deg, #F5C400, #d4a900)",
                  boxShadow: geofenceChecking ? "none" : "0 6px 28px rgba(245,196,0,0.30), inset 0 1px 0 rgba(255,255,255,0.20)"
                }}
              >
                {geofenceChecking ? (
                  <><Loader2 size={20} className="animate-spin" /> Checking location…</>
                ) : (
                  <><LogIn size={20} strokeWidth={2.5} /> Clock In</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search + project filter — foreman/admin only */}
      {!isEmployee && (
        <div className="flex gap-2 px-5 pb-4">
          <label className="flex items-center gap-2 bg-[#131110] border border-white/[0.07] rounded-xl px-3.5 py-3 flex-1 cursor-text">
            <Search size={14} className="text-white/30 flex-shrink-0" />
            <input className="bg-transparent text-[14px] text-white/80 placeholder:text-white/25 outline-none flex-1 min-w-0"
              placeholder="Search workers…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <CustomSelect
            className="bg-[#131110] border border-white/[0.07] text-white/60 text-[12px] rounded-xl px-3 py-2 outline-none cursor-pointer"
            value={selectedProject}
            onChange={(v) => setSelectedProject(v)}
            options={[{ value: "all", label: "All" }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
          />
        </div>
      )}

      {/* Overtime alert — foreman/admin only */}
      {/* Shifts left running — a forgotten clock-out otherwise gets paid in full */}
      {!isEmployee && (() => {
        const stale = clockEntries
          .filter((e) => !e.clockOut && hoursBetween(e.clockIn) >= LONG_SHIFT_HOURS)
          .map((e) => ({ entry: e, worker: getWorkerById(e.workerId), hours: hoursBetween(e.clockIn) }))
          .sort((a, b) => b.hours - a.hours);
        if (stale.length === 0) return null;
        return (
          <div className="mx-4 mb-3 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3 text-[12px] text-red-300">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle size={13} className="flex-shrink-0 text-red-400" />
              {stale.length === 1 ? "A shift is still running" : `${stale.length} shifts are still running`}
            </div>
            <p className="text-red-300/70 mt-1 leading-snug">Check before payroll — these keep adding hours until someone clocks out.</p>
            <div className="mt-2 flex flex-col gap-2">
              {stale.slice(0, 3).map(({ entry, worker, hours }) => (
                <div key={entry.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold text-red-200">{worker?.name ?? "Unknown"}</span>
                    <span className="text-red-300/70"> · {hours.toFixed(1)}h</span>
                  </span>
                  {isForemanOrAbove(currentUser.role) && (
                    <button
                      type="button"
                      onClick={() => setEditEntry({ id: entry.id, workerId: entry.workerId, workerName: worker?.name ?? "", clockIn: entry.clockIn, clockOut: entry.clockOut })}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/30 text-red-200 font-semibold"
                    >
                      Fix times
                    </button>
                  )}
                </div>
              ))}
              {stale.length > 3 && <span className="text-red-300/60">and {stale.length - 3} more</span>}
            </div>
          </div>
        );
      })()}

      {!isEmployee && (() => {
        const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0,0,0,0);
        const ot = workers.filter((w) => {
          const wEntries = clockEntries.filter((e) => e.workerId === w.id && e.clockOut);
          const todayHrs = wEntries.filter((e) => new Date(e.clockIn) >= todayStart).reduce((s,e) => s + hoursBetween(e.clockIn, e.clockOut!), 0);
          const weekHrs = wEntries.filter((e) => new Date(e.clockIn) >= weekStart).reduce((s,e) => s + hoursBetween(e.clockIn, e.clockOut!), 0);
          return todayHrs > 8 || weekHrs > 44;
        });
        if (ot.length === 0) return null;
        return (
          <div className="mx-4 mb-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[12px] font-semibold px-4 py-2.5 rounded-xl">
            <AlertTriangle size={13} className="flex-shrink-0 text-amber-400" />
            Overtime: {ot.map(w => w.name).join(", ")}
          </div>
        );
      })()}

      {/* Flag banner */}
      {(currentUser.role === "Admin" || currentUser.role === "Project Manager") && (() => {
        const flagged = clockEntries.filter((e) => e.verificationFlags && e.verificationFlags.length > 0);
        if (flagged.length === 0) return null;
        const hasHigh = flagged.some((e) => e.verificationFlags!.some((f) => f.severity === "high"));
        return (
          <div className={`mx-4 mb-3 flex items-center gap-2 text-[12px] font-semibold px-4 py-2.5 rounded-xl border ${hasHigh ? "bg-red-500/[0.06] border-red-500/25 text-red-300" : "bg-amber-500/[0.06] border-amber-500/20 text-amber-300"}`}>
            <AlertTriangle size={13} className="flex-shrink-0" />
            {flagged.length} clock-in{flagged.length !== 1 ? "s" : ""} flagged — tap row for details
          </div>
        );
      })()}

      {/* Stats row */}
      <div className="flex gap-3 px-5 pb-5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
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
            <p className="text-[20px] font-bold text-white leading-none">{clockEntries.filter((e) => new Date(e.clockIn) >= todayStart).length}</p>
            <p className="text-[11px] text-amber-400 font-semibold mt-0.5">Entries</p>
          </div>
        </div>
      </div>

      {/* Clocked In Now */}
      {clockedInShown.length > 0 && (
        <div className="px-5 mb-5">
          <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Clocked In Now
          </p>
          {clockedInShown.map((worker) => {
            const activeEntry = clockEntries.find((e) => e.workerId === worker.id && !e.clockOut);
            const project = getProjectById(activeEntry?.projectId ?? worker.projectIds[0] ?? "");
            const ci = worker.clockInTime ?? new Date();
            return (
              <div key={worker.id} className="bg-[#131110] border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3 mb-3">
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
      {isForemanOrAbove(currentUser.role) && availableShown.length > 0 && (
        <div className="px-5 mb-5">
          <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest mb-3">Clock In Worker</p>
          <div className="bg-[#131110] border border-white/[0.07] rounded-2xl overflow-hidden">
            {availableShown.map((worker, idx, arr) => (
              <div key={worker.id} className={`flex items-center gap-3 px-4 py-3.5 ${idx < arr.length - 1 ? "border-b border-white/[0.05]" : ""}`}>
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

      {/* Timesheet — day-grouped, professional layout */}
      {allEntries.length > 0 && (() => {
        const completedEntries = allEntries.filter((e) => e.clockOut);
        const totalH = completedEntries.reduce(
          (s, e) => s + hoursBetween(e.clockIn, e.clockOut!), 0
        );

        // Group by date string (allEntries is newest-first, so Map insertion order = newest day first)
        const dayMap = new Map<string, typeof allEntries>();
        for (const entry of allEntries) {
          const key = new Date(entry.clockIn).toLocaleDateString("en-CA");
          if (!dayMap.has(key)) dayMap.set(key, []);
          dayMap.get(key)!.push(entry);
        }

        return (
          <div className="px-5">
            {/* Company header */}
            {companyName && (
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-black text-[11px] font-black flex-shrink-0" style={{ background: "#F5C400" }}>
                  {companyName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white leading-none">{companyName}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">Timesheet</p>
                </div>
              </div>
            )}
            {/* Section header + period total */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-white/35 uppercase tracking-widest">
                {companyName ? "All Entries" : "Timesheet"}
              </p>
              {totalH > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-1">
                  <Clock size={10} className="text-amber-400" />
                  <span className="text-[11px] font-black text-amber-400">{totalH.toFixed(1)}h total</span>
                </div>
              )}
            </div>

            {[...dayMap.entries()].map(([dateKey, dayEntries]) => {
              const dayCompleted = dayEntries.filter((e) => e.clockOut);
              const dayTotal = dayCompleted.reduce(
                (s, e) => s + hoursBetween(e.clockIn, e.clockOut!), 0
              );
              const todayKey = new Date().toLocaleDateString("en-CA");
              const dayLabel = dateKey === todayKey
                ? "Today"
                : new Date(dayEntries[0].clockIn).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });

              return (
                <div key={dateKey} className="mb-3">
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[12px] font-bold text-white/50">{dayLabel}</span>
                    {dayTotal > 0 && (
                      <span className="text-[11px] font-semibold text-white/25">
                        {dayCompleted.length} session{dayCompleted.length !== 1 ? "s" : ""} · {dayTotal.toFixed(1)}h
                      </span>
                    )}
                  </div>

                  {/* Entries card */}
                  <div className="bg-[#131110] border border-white/[0.07] rounded-2xl overflow-hidden">
                    {dayEntries.map((entry, idx, arr) => {
                      const worker = getWorkerById(entry.workerId);
                      const project = getProjectById(entry.projectId);
                      if (!worker) return null;
                      const isLive = !!(entry as { live?: boolean }).live;
                      const entryFlags: VerificationFlag[] = (entry as { verificationFlags?: VerificationFlag[] }).verificationFlags || [];
                      const worstSev = entryFlags.some((f) => f.severity === "high") ? "high" : entryFlags.some((f) => f.severity === "medium") ? "medium" : entryFlags.length > 0 ? "low" : null;
                      const flagCol = worstSev === "high" ? "text-red-400" : worstSev === "medium" ? "text-amber-400" : "text-blue-400/70";
                      const hasGps = !isLive && (entry as { gps?: GpsLocation }).gps;
                      const hrs = entry.clockOut ? (hoursBetween(entry.clockIn, entry.clockOut)).toFixed(1) : null;

                      return (
                        <div key={entry.id} className={`px-4 py-4 ${idx < arr.length - 1 ? "border-b border-white/[0.05]" : ""} ${worstSev === "high" ? "bg-red-500/[0.03]" : ""}`}>
                          <div className="flex items-center gap-3">
                            {/* Avatar — square */}
                            {entry.clockInPhoto && !isEmployee ? (
                              <button
                                type="button"
                                aria-label={`View ${worker.name}'s clock-in photo`}
                                onClick={() => setPhotoView({
                                  src: entry.clockInPhoto!,
                                  caption: `${worker.name} · clocked in ${fmt(entry.clockIn)}${project ? ` · ${project.name}` : ""}`,
                                })}
                                className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-green-500/40"
                              >
                                <ClockPhoto src={entry.clockInPhoto} className="w-full h-full object-cover" />
                              </button>
                            ) : (
                              <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-[11px] font-black"
                                style={{ backgroundColor: worker.color + "22", color: worker.color }}>
                                {worker.photo ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" /> : worker.initials}
                              </div>
                            )}

                            {/* Name + project */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2.5">
                                {isLive && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse flex-shrink-0" />}
                                <p className="text-[13px] font-bold text-white/85 truncate">{worker.name}</p>
                                {worstSev && (
                                  <button aria-label={`Show verification flags for ${worker.name}`} onClick={() => setFlagDetailId(flagDetailId === entry.id ? null : entry.id)} className={`flex-shrink-0 inline-flex items-center justify-center min-w-[36px] min-h-[36px] p-2 -m-2 ${flagCol}`}>
                                    <AlertTriangle size={13} />
                                  </button>
                                )}
                                {hasGps && (
                                  <a href={`https://www.google.com/maps?q=${(entry as { gps?: GpsLocation }).gps!.lat},${(entry as { gps?: GpsLocation }).gps!.lng}`}
                                    target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                    aria-label={`Open ${worker.name}'s clock-in location in Maps`}
                                    className="text-green-400/70 hover:text-green-400 flex-shrink-0 inline-flex items-center justify-center min-w-[36px] min-h-[36px] p-2 -m-2">
                                    <MapPin size={13} />
                                  </a>
                                )}
                              </div>
                              <p className="text-[11px] text-white/35 truncate mt-0.5">{project?.name ?? "—"}</p>
                            </div>

                            {/* Time range + hours */}
                            <div className="flex-shrink-0 text-right">
                              <p className="text-[11px] text-white/40 tabular-nums">
                                {fmt(entry.clockIn)}{" – "}{entry.clockOut ? fmt(entry.clockOut) : <span className="text-amber-400 font-semibold">Now</span>}
                              </p>
                              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                <span className={`text-[13px] font-black tabular-nums ${hrs ? "text-white" : "text-amber-400"}`}>
                                  {hrs ? `${hrs}h` : elapsed(entry.clockIn)}
                                </span>
                                {!isLive && !isEmployee && (
                                  <button aria-label={`Edit ${worker.name}'s times`}
                                    onClick={() => { const w = getWorkerById(entry.workerId); setEditEntry({ id: entry.id, workerId: entry.workerId, workerName: w?.name ?? "", clockIn: entry.clockIn, clockOut: entry.clockOut }); }}
                                    className="text-white/35 hover:text-white/70 active:text-white/80 inline-flex items-center justify-center min-w-[36px] min-h-[36px] p-2 -my-2 -mr-1 ml-0.5"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Flag detail expand */}
                          {flagDetailId === entry.id && entryFlags.length > 0 && (
                            <div className="mt-2.5 pt-2.5 border-t border-white/[0.05] space-y-1">
                              {entryFlags.map((f, i) => (
                                <div key={i} className="flex items-start gap-1.5">
                                  <AlertTriangle size={10} className={`flex-shrink-0 mt-0.5 ${f.severity === "high" ? "text-red-400" : f.severity === "medium" ? "text-amber-400" : "text-blue-400/70"}`} />
                                  <p className="text-[10px] text-white/40">{f.note}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* View Reports link */}
            <Link
              href="/reports"
              className="flex items-center justify-center gap-1.5 mt-4 mb-1 py-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] text-[12px] font-semibold text-white/40 active:bg-white/[0.06]"
            >
              <BarChart3 size={12} className="text-amber-400/70" />
              View full report &amp; export payroll
              <ChevronRight size={12} className="text-white/25" />
            </Link>
          </div>
        );
      })()}
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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {clockEntries.filter((e) => e.clockOut).length > 0 && (
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/50 hover:text-white font-bold text-[13px] px-4 py-2 rounded-full transition-all"
            >
              <Download size={14} />
              Export CSV
            </button>
          )}
          <div className="hidden sm:flex items-center gap-2">
          {clockedIn.length > 1 && (currentUser.role === "Admin" || currentUser.role === "Project Manager") && (
            <button
              onClick={() => setClockOutAllConfirm(true)}
              className="flex items-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/50 hover:text-white font-bold text-[13px] px-4 py-2 rounded-full transition-all"
            >
              <LogOut size={14} />
              Clock Out All ({clockedIn.length})
            </button>
          )}
          {isCurrentUserClockedIn ? (
            <button onClick={() => handleClockOut(currentUser.id)}
              className="flex items-center gap-2 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold text-[13px] px-4 py-2 rounded-full transition-all">
              <LogOut size={14} />
              Clock Out
            </button>
          ) : (
            <button onClick={() => requestClockIn(currentUser)}
              className="flex items-center gap-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-400 font-bold text-[13px] px-4 py-2 rounded-full transition-all">
              <LogIn size={14} />
              Clock In
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          // Classes, not inline hex: an inline colour is invisible to the light-theme remap,
          // so these labels sat at 1.5-2.1:1 on the light card — the hi-vis one unreadable.
          { label: "On Site Now", value: clockedIn.length, sub: "workers live", tone: "text-green-400" },
          { label: "Hours Today", value: `${todayTotal}h`, sub: "all workers combined", tone: "text-blue-400" },
          { label: "Total Sessions", value: clockEntries.filter((e) => e.clockOut && new Date(e.clockOut).getTime() !== 0).length, sub: "completed all time", tone: "text-amber-400" },
          { label: "Active Projects", value: activeProjects.length, sub: "currently running", tone: "text-purple-400" },
        ].map(({ label, value, sub, tone }) => (
          <div key={label} className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className={`text-[12px] font-semibold mt-0.5 ${tone}`}>{label}</p>
            <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Currently clocked in */}
      {clockedInShown.length > 0 && (
        <div>
          <h3 className="text-[14px] font-bold text-white mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Currently On Site
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {clockedInShown.map((worker) => {
              const activeEntry = clockEntries.find((e) => e.workerId === worker.id && !e.clockOut);
              const project = getProjectById(activeEntry?.projectId ?? worker.projectIds[0] ?? "");
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
                      className="flex items-center gap-1 text-[10px] text-green-400/80 hover:text-green-400 mb-2 transition-colors"
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
                      className="mt-3 w-full text-[11px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/15 py-1.5 rounded-full transition-colors">
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
      {availableShown.length > 0 && (
        <div>
          <h3 className="text-[14px] font-bold text-white/50 mb-3">Off Site</h3>
          <div className="flex gap-2 flex-wrap">
            {availableShown.map((worker) => (
              <button key={worker.id} onClick={() => requestClockIn(worker)} disabled={geofenceChecking}
                className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] hover:border-green-500/30 hover:bg-green-500/[0.04] rounded-full px-3 py-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed">
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
        <label className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-2 flex-1 max-w-56 cursor-text">
          <Search size={13} className="text-white/30" />
          <input className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1"
            placeholder="Search workers…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
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

      {/* Shifts left running — a forgotten clock-out otherwise gets paid in full */}
      {(() => {
        const stale = clockEntries
          .filter((e) => !e.clockOut && hoursBetween(e.clockIn) >= LONG_SHIFT_HOURS)
          .map((e) => ({ entry: e, worker: getWorkerById(e.workerId), hours: hoursBetween(e.clockIn) }))
          .sort((a, b) => b.hours - a.hours);
        if (stale.length === 0) return null;
        return (
          <div className="flex items-start gap-3 px-4 py-3 mb-3 rounded-xl border border-red-500/30 bg-red-500/8 text-[12px] text-red-300">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5 text-red-400" />
            <div className="min-w-0 flex-1">
              <span className="font-bold">
                {stale.length === 1 ? "A shift is still running" : `${stale.length} shifts are still running`}
              </span>
              <span className="text-red-300/70 ml-2">
                Check before payroll — these keep adding hours until someone clocks out.
              </span>
              <div className="mt-2 flex flex-col gap-1.5">
                {stale.slice(0, 4).map(({ entry, worker, hours }) => (
                  <div key={entry.id} className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-red-200">{worker?.name ?? "Unknown"}</span>
                    <span className="text-red-300/70">{hours.toFixed(1)}h since {fmt(entry.clockIn)}</span>
                    {isForemanOrAbove(currentUser.role) && (
                      <button
                        type="button"
                        onClick={() => setEditEntry({ id: entry.id, workerId: entry.workerId, workerName: worker?.name ?? "", clockIn: entry.clockIn, clockOut: entry.clockOut })}
                        className="px-2.5 py-1 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-200 font-semibold"
                      >
                        Fix times
                      </button>
                    )}
                  </div>
                ))}
                {stale.length > 4 && <span className="text-red-300/60">and {stale.length - 4} more</span>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Overtime alerts */}
      {(() => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const overtimeWorkers: { name: string; reason: string }[] = [];
        workers.forEach((w) => {
          const wEntries = clockEntries.filter((e) => e.workerId === w.id && e.clockOut);
          const todayHrs = wEntries
            .filter((e) => new Date(e.clockIn) >= todayStart)
            .reduce((s, e) => s + hoursBetween(e.clockIn, e.clockOut!), 0);
          const weekHrs = wEntries
            .filter((e) => new Date(e.clockIn) >= weekStart)
            .reduce((s, e) => s + hoursBetween(e.clockIn, e.clockOut!), 0);
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
        <EmptyState
          icon={Clock}
          title="No time entries yet"
          body="Use the Clock In button above to start tracking time for your crew."
        />
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
              ? (hoursBetween(entry.clockIn, entry.clockOut)).toFixed(1)
              : null;
            const isLive = !!(entry as { live?: boolean }).live;
            const hasGps = !isLive && (entry as { gps?: GpsLocation }).gps;
            const flags: VerificationFlag[] = (entry as { verificationFlags?: VerificationFlag[] }).verificationFlags || [];
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
                          className="-m-2 p-2 inline-flex text-green-400/80 hover:text-green-400 transition-colors"
                        >
                          <MapPin size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-[12px] text-white/45 truncate pr-2">{project?.name ?? "—"}</span>
                <span className="text-[12px] text-white/45">
                  {new Date(entry.clockIn).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                </span>
                <span className="text-[12px] text-green-400 font-semibold">{fmt(entry.clockIn)}</span>
                <span className={`text-[12px] font-semibold ${entry.clockOut ? "text-white/50" : "text-amber-400"}`}>
                  {entry.clockOut ? fmt(entry.clockOut) : "Live"}
                </span>
                <span className={`text-right text-[13px] font-bold ${entry.clockOut ? "text-white/70" : "text-amber-400"}`}>
                  {entry.clockOut ? `${hrs}h` : elapsed(entry.clockIn)}
                </span>
                <div className="flex items-center justify-end gap-2">
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
                  {!isLive && !isEmployee && (
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
                      aria-label="Edit time entry"
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
        recentProjectId={clockEntries
          .filter((e) => e.workerId === projectPickerTarget.id)
          .reduce<{ at: number; id?: string }>((best, e) => {
            const at = new Date(e.clockIn).getTime();
            return at > best.at ? { at, id: e.projectId } : best;
          }, { at: 0 }).id}
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

    {photoView && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85" onClick={() => setPhotoView(null)} role="dialog" aria-label="Clock-in photo">
        <div className="max-w-md w-full" onClick={(e) => e.stopPropagation()}>
          <ClockPhoto src={photoView.src} className="w-full rounded-lg min-h-[200px] bg-white/5" />
          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-[13px] text-white/80">{photoView.caption}</p>
            <button onClick={() => setPhotoView(null)} className="text-[13px] font-semibold text-white px-3 py-1.5 rounded-md bg-white/10">Close</button>
          </div>
        </div>
      </div>
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
      onConfirm={() => { const count = clockedIn.length; clockedIn.forEach((w) => handleClockOut(w.id)); setClockOutAllConfirm(false); toast.success(`${count} workers clocked out`); }}
      onCancel={() => setClockOutAllConfirm(false)}
    />
    </>
  );
}





