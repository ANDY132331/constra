"use client";

import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAdminOrAbove } from "@/lib/permissions";
import QRCode from "qrcode";
import {
  UserPlus, Search, Mail, Clock, CheckCircle2,
  Copy, Check, X, Pencil, Trash2, Upload, Camera,
  Plus, Minus, History, AlertTriangle, QrCode, Users, ChevronRight, MessageSquare, Phone, Send,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { getCurrencySymbol } from "@/lib/currency";
import { useSearchPrefill } from "@/lib/use-search-prefill";
import type { ClockEntry, Worker, HoursAdjustment, WorkerCertification } from "@/lib/mock-data";
import { hoursBetween } from "@/lib/hours";
import { shareInvite } from "@/lib/invite";
import { ConfirmModal } from "@/components/confirm-modal";
import { EmptyState } from "@/components/empty-state";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";
import { toast } from "sonner";
import { toLocalDateString, endOfDay, ink } from "@/lib/utils";

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  Admin: { label: "Admin", className: "bg-purple-500/15 text-purple-400" },
  "Project Manager": { label: "Project Manager", className: "bg-blue-500/15 text-blue-400" },
  Foreman: { label: "Foreman", className: "bg-amber-500/12 text-amber-400" },
  Worker: { label: "Worker", className: "bg-white/8 text-white/50" },
};

const COLORS = ["#F5C400","#3b82f6","#8b5cf6","#22c55e","#ef4444","#06b6d4","#ec4899","#f97316","#84cc16","#a78bfa"];

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

type FormState = {
  name: string; customRole: string; role: Worker["role"];
  email: string; phone: string; color: string; hourlyRate: string; photo: string;
};

const blank: FormState = {
  name: "", customRole: "", role: "Worker",
  email: "", phone: "", color: "#3b82f6", hourlyRate: "", photo: "",
};

// Hours Adjustment Modal
function HoursModal({
  worker,
  totalHours,
  adjustments,
  currentUser,
  onAdjust,
  onClose,
}: {
  worker: Worker;
  totalHours: number;
  adjustments: HoursAdjustment[];
  currentUser: Worker;
  onAdjust: (delta: number, reason: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"adjust" | "history">("adjust");
  const [mode, setMode] = useState<"add" | "subtract">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const workerAdjustments = adjustments
    .filter((a) => a.workerId === worker.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleSubmit = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { setError("Enter a valid number of hours."); return; }
    if (val > 999) { setError("Maximum adjustment is 999 hours at once."); return; }
    if (!reason.trim()) { setError("A reason is required for all adjustments."); return; }
    const delta = mode === "add" ? val : -val;
    if (totalHours + delta < 0) { setError("Cannot reduce hours below 0."); return; }
    onAdjust(delta, reason.trim());
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setAmount(""); setReason(""); setError(""); }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="sheet bg-[#161616] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-[15px] font-bold text-white">Manage Hours</h3>
            <p className="text-[11px] text-white/40 mt-0.5">{worker.name}</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/5 active:bg-white/10 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Current hours display */}
        <div className="mx-6 mt-5 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400/80">Total Hours</p>
            <p className="text-[32px] font-black text-amber-400">{totalHours.toFixed(1)}<span className="text-[16px] font-normal text-amber-400/80">h</span></p>
          </div>
          <Clock size={28} className="text-amber-400/30" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mx-6 mt-5 bg-[#0d0d0d] border border-white/[0.06] rounded-full p-1">
          {(["adjust", "history"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-[12px] font-bold transition-colors ${tab === t ? "bg-amber-500 text-black" : "text-white/35 hover:text-white/55"}`}>
              {t === "adjust" ? <><Plus size={12} />Adjust</> : <><History size={12} />History</>}
            </button>
          ))}
        </div>

        {tab === "adjust" && (
          <div className="flex-1 overflow-y-scroll overscroll-y-contain p-6 space-y-4" style={{touchAction:"pan-y"}}>
            {/* Add / Subtract toggle */}
            <div className="flex gap-2">
              <button onClick={() => setMode("add")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13px] font-bold border transition-colors ${mode === "add" ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-white/[0.03] border-white/[0.07] text-white/35 hover:text-white/55"}`}>
                <Plus size={13} /> Add Hours
              </button>
              <button onClick={() => setMode("subtract")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-[13px] font-bold border transition-colors ${mode === "subtract" ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-white/[0.03] border-white/[0.07] text-white/35 hover:text-white/55"}`}>
                <Minus size={13} /> Remove Hours
              </button>
            </div>

            <div>
              <label className={lbl}>Hours to {mode === "add" ? "Add" : "Remove"}</label>
              <input className={inp} type="number" inputMode="decimal" min="0.1" step="0.5" placeholder="e.g. 8"
                value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>

            <div>
              <label className={lbl}>Reason <span className="text-red-400">*</span></label>
              <textarea className={`${inp} resize-none`} rows={3}
                placeholder="e.g. Correction for missed punch-out on July 15"
                value={reason} onChange={(e) => setReason(e.target.value)} />
              <p className="text-[10px] text-white/20 mt-1">Required. Saved to audit log with your name.</p>
            </div>

            {error && (
              <p className="text-[12px] text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={12} /> {error}
              </p>
            )}

            {success ? (
              <div className="flex items-center justify-center gap-2 py-3 text-green-400 text-[13px] font-bold">
                <CheckCircle2 size={16} /> Adjustment saved
              </div>
            ) : (
              <button onClick={handleSubmit}
                className={`w-full py-3 rounded-xl text-[13px] font-bold transition-colors ${mode === "add" ? "bg-green-500/15 hover:bg-green-500/20 border border-green-500/30 text-green-400" : "bg-red-500/15 hover:bg-red-500/20 border border-red-500/30 text-red-400"}`}>
                {mode === "add" ? `Add ${amount || "0"}h to ${worker.name}` : `Remove ${amount || "0"}h from ${worker.name}`}
              </button>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="p-6">
            {workerAdjustments.length === 0 ? (
              <div className="text-center py-10 text-white/25 text-[12px]">
                No manual adjustments yet
              </div>
            ) : (
              <div className="space-y-3">
                {workerAdjustments.map((adj) => (
                  <div key={adj.id} className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <span className={`text-[15px] font-black ${adj.deltaHours > 0 ? "text-green-400" : "text-red-400"}`}>
                        {adj.deltaHours > 0 ? "+" : ""}{adj.deltaHours.toFixed(1)}h
                      </span>
                      <span className="text-[10px] text-white/30">
                        {new Date(adj.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}{new Date(adj.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[12px] text-white/60 leading-snug">{adj.reason}</p>
                    <p className="text-[10px] text-white/25 mt-2">By {adj.adminName}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000)); // a phone clock running ahead must never read negative
  const h = Math.floor(minutes / 60);
  return h > 0 ? `${h}h ${minutes % 60}m` : `${minutes}m`;
}

function weekHoursOf(workerId: string, entries: ClockEntry[], now: number): number {
  const monday = new Date(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return entries
    .filter((e) => e.workerId === workerId && new Date(e.clockIn) >= monday)
    .reduce((sum, e) => sum + hoursBetween(e.clockIn, e.clockOut ?? new Date(now)), 0);
}

function certAlert(worker: Worker, now: number): "expired" | "soon" | null {
  const dates = (worker.certifications ?? []).filter((c) => c.expiryDate).map((c) => endOfDay(c.expiryDate!).getTime());
  if (dates.some((d) => d < now)) return "expired";
  return dates.some((d) => d - now < 30 * 86_400_000) ? "soon" : null;
}

function CrewAvatar({ worker, large }: { worker: Worker; large?: boolean }) {
  const size = large ? "w-16 h-16 text-[20px]" : "w-11 h-11 text-[14px]";
  return (
    <span
      className={`${size} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-bold ring-2 ring-offset-2 ring-offset-[#111111] ${worker.clockedIn ? "ring-green-500" : "ring-white/10"}`}
      style={{ backgroundColor: worker.color + "20", color: ink(worker.color) }}
    >
      {worker.photo ? <img src={worker.photo} alt="" className="w-full h-full object-cover" /> : worker.initials}
    </span>
  );
}

function WorkerRow({ worker, now, weekHours, selected, onSelect }: {
  worker: Worker; now: number; weekHours: number; selected: boolean; onSelect: () => void;
}) {
  const alert = certAlert(worker, now);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected || undefined}
      className={`crew-row w-full min-h-[68px] flex items-center gap-3 px-4 py-3 text-left transition-colors ${selected ? "bg-amber-500/[0.08]" : "hover:bg-white/[0.03] active:bg-white/[0.06]"}`}
    >
      <CrewAvatar worker={worker} />
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-semibold text-white truncate">{worker.name}</span>
        <span className="flex items-center gap-1.5 text-[12px] text-white/60 min-w-0">
          <span className="truncate">{worker.customRole || worker.role}</span>
          {alert && (
            <span className={`flex-shrink-0 inline-flex items-center gap-0.5 font-semibold ${alert === "expired" ? "text-red-400" : "text-amber-400"}`}>
              <AlertTriangle size={11} /> {alert === "expired" ? "Cert expired" : "Cert expiring"}
            </span>
          )}
        </span>
      </span>
      <span className="flex-shrink-0 text-right">
        {worker.clockedIn && worker.clockInTime ? (
          <span className="block text-[14px] font-bold text-green-400 tabular-nums">{formatDuration(now - new Date(worker.clockInTime).getTime())}</span>
        ) : (
          <span className="block text-[14px] font-semibold text-white/70 tabular-nums">{weekHours.toFixed(1)}h</span>
        )}
        <span className="block text-[11px] text-white/50">{worker.clockedIn ? "this shift" : "this week"}</span>
      </span>
      <ChevronRight size={16} className="text-white/30 flex-shrink-0 lg:hidden" />
    </button>
  );
}

function WorkerDetail({ worker, now, weekHours, totalHours, rate, canEdit, canRemove, onClose, onEdit, onHours, onRemove }: {
  worker: Worker; now: number; weekHours: number; totalHours: number; rate: string | null;
  canEdit: boolean; canRemove: boolean; onClose?: () => void;
  onEdit: () => void; onHours: () => void; onRemove: () => void;
}) {
  const roleCfg = ROLE_CONFIG[worker.role] ?? ROLE_CONFIG.Worker;
  const phone = worker.phone?.replace(/[^\d+]/g, "");
  const contact = [
    phone && { href: `tel:${phone}`, label: "Call", icon: Phone },
    phone && { href: `sms:${phone}`, label: "Text", icon: MessageSquare },
    worker.email && { href: `mailto:${worker.email}`, label: "Email", icon: Mail },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Phone }[];
  const stats = [
    worker.clockedIn && worker.clockInTime ? { label: "This shift", value: formatDuration(now - new Date(worker.clockInTime).getTime()) } : null,
    { label: "This week", value: `${weekHours.toFixed(1)}h` },
    { label: "All time", value: `${totalHours.toFixed(1)}h` },
    rate ? { label: "Rate", value: rate } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="p-5">
      <div className="flex items-start gap-4">
        <CrewAvatar worker={worker} large />
        <div className="flex-1 min-w-0 pt-1">
          <h3 className="text-[17px] font-bold text-white leading-tight break-words">{worker.name}</h3>
          <p className="text-[13px] text-white/60 mt-0.5 truncate">{worker.customRole || worker.role}</p>
          <div className="flex items-center flex-wrap gap-2 mt-2">
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${roleCfg.className}`}>{roleCfg.label}</span>
            <span className={`text-[11px] font-semibold ${worker.clockedIn ? "text-green-400" : "text-white/50"}`}>
              {worker.clockedIn ? "On site" : "Off site"}
            </span>
          </div>
        </div>
        {onClose && (
          <button type="button" aria-label="Close" onClick={onClose} className="w-11 h-11 -mt-2 -mr-2 flex-shrink-0 flex items-center justify-center rounded-full text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {contact.length > 0 && (
        <div className="grid gap-2 mt-5" style={{ gridTemplateColumns: `repeat(${contact.length}, minmax(0, 1fr))` }}>
          {contact.map(({ href, label, icon: Icon }) => (
            <a key={label} href={href} aria-label={`${label} ${worker.name}`} className="flex flex-col items-center justify-center gap-1 min-h-[60px] rounded-xl bg-white/[0.05] hover:bg-white/[0.08] active:bg-white/[0.12] text-white/80 text-[12px] font-semibold transition-colors">
              <Icon size={17} className="text-amber-400" /> {label}
            </a>
          ))}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-px mt-5 rounded-xl overflow-hidden border border-white/[0.06] bg-white/[0.06]">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#161616] px-3.5 py-3">
            <dt className="text-[11px] text-white/50">{s.label}</dt>
            <dd className="text-[17px] font-bold text-white tabular-nums mt-0.5">{s.value}</dd>
          </div>
        ))}
      </dl>

      {(worker.certifications?.length ?? 0) > 0 && (
        <div className="mt-5">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">Certifications</h4>
          <ul className="space-y-1.5">
            {worker.certifications!.map((c) => {
              const end = c.expiryDate ? endOfDay(c.expiryDate).getTime() : null;
              const expired = end !== null && end < now;
              const soon = end !== null && !expired && end - now < 30 * 86_400_000;
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-white/80 min-w-0 truncate">{c.name}</span>
                  {c.expiryDate && (
                    <span className={`flex-shrink-0 text-[12px] font-semibold tabular-nums ${expired ? "text-red-400" : soon ? "text-amber-400" : "text-white/50"}`}>
                      {expired ? "Expired " : "Exp. "}{new Date(c.expiryDate).toLocaleDateString("en-CA", { month: "short", year: "2-digit" })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {canEdit && (
        <div className="mt-5 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onHours} className="flex items-center justify-center gap-1.5 min-h-[48px] rounded-full bg-white/[0.05] hover:bg-white/[0.08] text-white/80 text-[13px] font-bold transition-colors">
              <Clock size={14} /> Manage hours
            </button>
            <button type="button" onClick={onEdit} className="flex items-center justify-center gap-1.5 min-h-[48px] rounded-full bg-white/[0.05] hover:bg-white/[0.08] text-white/80 text-[13px] font-bold transition-colors">
              <Pencil size={14} /> Edit
            </button>
          </div>
          {canRemove && (
            <button type="button" onClick={onRemove} className="w-full flex items-center justify-center gap-1.5 min-h-[48px] mt-4 rounded-full text-red-400 hover:bg-red-500/[0.08] text-[13px] font-bold transition-colors">
              <Trash2 size={14} /> Remove from crew
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CrewPage() {
  const {
    workers, addWorker, updateWorker, deleteWorker,
    currentUser, hoursAdjustments, addHoursAdjustment, getWorkerTotalHours,
    currency, inviteCode, companyName, clockEntries,
  } = useStore();
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (!isAdminOrAbove(currentUser.role)) router.replace("/dashboard");
  }, [currentUser.role, router]);

  const prefill = useSearchPrefill("/crew");
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const searchParams = useSearchParams();
  useEffect(() => { if (searchParams.get("new") === "1") { setEditId(null); setForm(blank); setCertifications([]); setSaveError(""); setShowModal(true); } }, [searchParams]);
  const [hoursWorker, setHoursWorker] = useState<Worker | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // Shift timers only show minutes, so this doesn't need to run any faster
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const isDesktop = useSyncExternalStore(
    (notify) => { const q = window.matchMedia("(min-width: 1024px)"); q.addEventListener("change", notify); return () => q.removeEventListener("change", notify); },
    () => window.matchMedia("(min-width: 1024px)").matches,
    () => false,
  );
  const [certifications, setCertifications] = useState<WorkerCertification[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (prefill) setSearch(prefill); }, [prefill]);

  const handleShowQR = useCallback(async () => {
    if (!qrDataUrl && inviteCode) {
      const joinUrl = `${window.location.origin}/login?join=${inviteCode}`;
      const url = await QRCode.toDataURL(joinUrl, { width: 256, margin: 2, color: { dark: "#ffffff", light: "#161616" } });
      setQrDataUrl(url);
    }
    setShowQR(true);
  }, [qrDataUrl, inviteCode]);

  const filtered = workers.filter((w) => {
    const q = search.toLowerCase();
    const matchSearch =
      (w.name ?? "").toLowerCase().includes(q) ||
      (w.role ?? "").toLowerCase().includes(q) ||
      (w.customRole ?? "").toLowerCase().includes(q) ||
      (w.email ?? "").toLowerCase().includes(q) ||
      (w.phone ?? "").includes(search);
    const matchRole = filterRole === "all" || w.role === filterRole;
    return matchSearch && matchRole;
  });

  const clockedIn = workers.filter((w) => w.clockedIn).length;
  const isAdmin = isAdminOrAbove(currentUser.role);
  const canSeeFinancials = currentUser.role === "Admin" || currentUser.role === "Project Manager";
  const canEdit = currentUser.role === "Admin" || currentUser.role === "Project Manager";

  const openAdd = () => { setForm(blank); setEditId(null); setCertifications([]); setSaveError(""); setShowModal(true); };
  const openEdit = (w: Worker) => {
    setForm({
      name: w.name, customRole: w.customRole, role: w.role,
      email: w.email, phone: w.phone, color: w.color,
      hourlyRate: w.hourlyRate ? String(w.hourlyRate) : "", photo: w.photo ?? "",
    });
    setCertifications(w.certifications ? [...w.certifications] : []);
    setEditId(w.id);
    setSaveError("");
    setShowModal(true);
  };

  const handlePhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, photo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaveError("");

    if (editId) {
      // Edit existing worker — update profile in DB via store (works fine, no FK issue)
      const initials = form.name.trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
      updateWorker(editId, {
        name: form.name.trim(),
        initials,
        customRole: form.customRole.trim() || form.role,
        role: form.role,
        email: form.email.trim(),
        phone: form.phone.trim(),
        color: form.color,
        photo: form.photo || undefined,
        hourlyRate: parseFloat(form.hourlyRate) || 0,
        certifications: certifications.length > 0 ? certifications : undefined,
      });
      toast.success(`${form.name.trim()} updated`);
      setShowModal(false);
    } else {
      // New worker — use server API to create a real auth user + profile
      setSaving(true);
      try {
        const res = await fetch("/api/create-worker", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            role: form.role,
            customRole: form.customRole.trim() || form.role,
            email: form.email.trim() || null,
            phone: form.phone.trim(),
            color: form.color,
            photo: form.photo || null,
            hourlyRate: form.hourlyRate,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setSaveError(data.error ?? "Failed to create worker");
          return;
        }
        // Realtime subscription will add the worker to state automatically.
        // As a fallback, optimistically add with the real ID returned.
        const initials = data.initials ?? form.name.trim().split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
        addWorker({
          id: data.id,
          name: form.name.trim(),
          initials,
          customRole: form.customRole.trim() || form.role,
          role: form.role,
          email: form.email.trim(),
          phone: form.phone.trim(),
          color: form.color,
          photo: form.photo || undefined,
          hourlyRate: parseFloat(form.hourlyRate) || 0,
          certifications: certifications.length > 0 ? certifications : undefined,
          projectIds: [],
          clockedIn: false,
        } as Worker);
        const hasEmail = !!form.email.trim();
        toast.success(
          `${form.name.trim()} added${hasEmail ? " — password reset email sent" : " — share the invite code so they can sign up"}`,
          { duration: 5000 }
        );
        setShowModal(false);
      } catch (err) {
        console.error("Create worker failed:", err);
        setSaveError("Network error — please try again");
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDelete = (id: string) => {
    if (id === currentUser.id) return;
    setDeleteConfirm(id);
  };

  const handleCopy = (fullUrl = false) => {
    const text = fullUrl
      ? `${window.location.origin}/login?join=${inviteCode}`
      : inviteCode;
    navigator.clipboard.writeText(text).then(() => toast.success(fullUrl ? "Invite link copied" : "Invite code copied")).catch(() => toast.error("Copy failed — please copy manually"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHoursAdjust = (worker: Worker, delta: number, reason: string) => {
    addHoursAdjustment({
      workerId: worker.id,
      adminId: currentUser.id,
      adminName: currentUser.name,
      deltaHours: delta,
      reason,
      createdAt: new Date(),
    });
  };

  const onSite = filtered.filter((w) => w.clockedIn);
  const offSite = filtered.filter((w) => !w.clockedIn);
  const panelWorker = filtered.find((w) => w.id === selectedId) ?? filtered[0];
  const sheetWorker = !isDesktop ? workers.find((w) => w.id === selectedId) : undefined;
  const onSitePct = workers.length ? Math.round((clockedIn / workers.length) * 100) : 0;

  const roleCount = (role: string) => workers.filter((w) => w.role === role).length;
  const detailFor = (worker: Worker, onClose?: () => void) => (
    <WorkerDetail
      worker={worker}
      now={now}
      weekHours={weekHoursOf(worker.id, clockEntries, now)}
      totalHours={getWorkerTotalHours(worker.id)}
      rate={canSeeFinancials && worker.hourlyRate > 0 ? `${getCurrencySymbol(currency)}${worker.hourlyRate}/hr` : null}
      canEdit={canEdit}
      canRemove={canEdit && worker.id !== currentUser.id}
      onClose={onClose}
      onEdit={() => { if (!isDesktop) setSelectedId(null); openEdit(worker); }}
      onHours={() => { if (!isDesktop) setSelectedId(null); setHoursWorker(worker); }}
      onRemove={() => { if (!isDesktop) setSelectedId(null); handleDelete(worker.id); }}
    />
  );
  const rows = (list: Worker[]) => (
    <ul className="bg-[#111111] border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.06]">
      {list.map((worker) => (
        <li key={worker.id}>
          <WorkerRow
            worker={worker}
            now={now}
            weekHours={weekHoursOf(worker.id, clockEntries, now)}
            selected={isDesktop && panelWorker?.id === worker.id}
            onSelect={() => setSelectedId(worker.id)}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <>
    <div className="pb-10 max-w-[1180px]">
      <div className="flex items-center justify-between lg:justify-end gap-3 mb-4">
        <h2 className="text-[22px] font-bold text-white lg:sr-only">Crew</h2>
        {canEdit && (
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 min-h-[44px] bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-[13px] px-4 rounded-full transition-colors"
          >
            <UserPlus size={15} />
            Add Member
          </button>
        )}
      </div>

      {/* On site now, and the way to get more of the crew on */}
      <section aria-label="Crew summary" className="bg-[#111111] border border-white/[0.07] rounded-2xl p-4 mb-4 lg:flex lg:items-center lg:gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-bold text-white leading-none tabular-nums">{clockedIn}</span>
            <span className="text-[14px] font-semibold text-white/60 tabular-nums">of {workers.length} on site now</span>
          </div>
          <div className="h-1.5 mt-3 rounded-full bg-white/[0.08] overflow-hidden" role="presentation">
            <div className="crew-bar h-full rounded-full bg-green-500" style={{ width: `${onSitePct}%` }} />
          </div>
        </div>
        {canEdit && inviteCode && (
          <div className="flex items-center gap-2 mt-4 lg:mt-0 flex-shrink-0">
            <button
              onClick={() => shareInvite(inviteCode, companyName)}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 min-h-[44px] px-3 lg:px-4 whitespace-nowrap rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-400 border border-amber-500/20 text-[13px] font-bold transition-colors"
            >
              <Send size={14} /> Invite crew
            </button>
            <button
              onClick={() => handleCopy()}
              aria-label={`Copy invite code ${inviteCode}`}
              className="flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-full bg-white/[0.05] hover:bg-white/[0.08] text-white/70 text-[12px] font-mono font-bold tracking-wider transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} className="hidden sm:block" />}
              {inviteCode}
            </button>
            <button
              aria-label="Show invite QR code"
              onClick={handleShowQR}
              className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-full bg-white/[0.05] hover:bg-white/[0.08] text-white/60 transition-colors"
            >
              <QrCode size={15} />
            </button>
          </div>
        )}
      </section>

      <label className="flex items-center gap-2.5 bg-[#111111] border border-white/[0.07] rounded-xl px-3.5 py-3 mb-3 focus-within:border-amber-500/30 transition-colors cursor-text">
        <Search size={14} className="text-white/40 flex-shrink-0" />
        <input
          placeholder={`${t.common.search} crew…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off" spellCheck={false} maxLength={100}
          className="bg-transparent text-[14px] text-white/80 placeholder:text-white/40 outline-none flex-1 min-w-0"
        />
      </label>
      <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-1 mb-4">
        {(["all", "Admin", "Project Manager", "Foreman", "Worker"] as const).map((role) => (
          <button
            key={role}
            onClick={() => setFilterRole(role)}
            aria-pressed={filterRole === role}
            className={`flex-shrink-0 min-h-[40px] px-3.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors ${
              filterRole === role ? "bg-amber-500 text-black" : "bg-[#111111] border border-white/[0.07] text-white/60 hover:text-white/80"
            }`}
          >
            {role === "all" ? "All" : role}
            <span className="ml-1.5 opacity-60 tabular-nums">{role === "all" ? workers.length : roleCount(role)}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={workers.length === 0 ? "No crew members yet" : "No crew members found"}
          body={workers.length === 0
            ? "Add your crew to track hours, assign tasks, and manage roles across your projects."
            : "Try changing your search or role filter."}
          action={workers.length === 0 && isAdmin ? { label: "Add Crew Member", onClick: openAdd } : undefined}
          isFiltered={workers.length > 0}
        />
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-5 lg:items-start">
          <div className="space-y-5 min-w-0">
            {onSite.length > 0 && (
              <section aria-label="On site">
                <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-green-400 mb-2">
                  <span className="crew-pulse w-1.5 h-1.5 rounded-full bg-green-400" /> On site
                </h3>
                {rows(onSite)}
              </section>
            )}
            {offSite.length > 0 && (
              <section aria-label="Off site">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-white/50 mb-2">Off site</h3>
                {rows(offSite)}
              </section>
            )}
          </div>
          {isDesktop && panelWorker && (
            <aside aria-label={`${panelWorker.name} details`} className="crew-panel sticky top-0 max-h-[calc(100dvh-8.5rem)] overflow-y-auto overscroll-contain bg-[#111111] border border-white/[0.07] rounded-2xl">
              {detailFor(panelWorker)}
            </aside>
          )}
        </div>
      )}
    </div>

    {/* Phone: details slide up over the list */}
    {sheetWorker && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}>
        <div className="sheet bg-[#161616] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto overscroll-y-contain">
          {detailFor(sheetWorker, () => setSelectedId(null))}
        </div>
      </div>
    )}

    {/* ── MODALS (work on both breakpoints) ── */}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="sheet bg-[#161616] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl p-8 flex flex-col items-center gap-5 w-full sm:w-72">
            <div className="flex items-center justify-between w-full">
              <h3 className="text-[15px] font-bold text-white">Invite Workers</h3>
              <button aria-label="Close" onClick={() => setShowQR(false)} className="w-11 h-11 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/5 active:bg-white/10">
                <X size={16} />
              </button>
            </div>
            {qrDataUrl && <img src={qrDataUrl} alt="Invite QR code" className="w-48 h-48 rounded-xl" />}
            <div className="text-center space-y-1">
              <p className="text-[13px] font-bold text-white/70">Scan to join workspace</p>
              <p className="text-[11px] text-white/30">Or share code: <span className="font-mono font-bold text-amber-400">{inviteCode}</span></p>
            </div>
            <button onClick={() => handleCopy(true)} className="w-full py-2.5 rounded-full text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 active:bg-amber-600 transition-colors flex items-center justify-center gap-2">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Link Copied!" : "Copy Invite Link"}
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Worker Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="sheet bg-[#161616] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">{editId ? "Edit Worker" : "Add Worker"}</h3>
              <button aria-label="Close" type="button" onClick={() => setShowModal(false)}
                className="w-11 h-11 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/5 active:bg-white/10 transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-scroll overscroll-y-contain p-6 space-y-5" style={{touchAction:"pan-y"}}>
              {/* Photo */}
              <div className="flex flex-col items-center gap-3">
                <div className="w-20 h-20 rounded-2xl overflow-hidden cursor-pointer relative group"
                  style={{ backgroundColor: form.color + "20" }}
                  onClick={() => fileRef.current?.click()}>
                  {form.photo ? (
                    <>
                      <img src={form.photo} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera size={20} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ color: ink(form.color) }}>
                      <Upload size={18} /><span className="text-[9px] font-bold">PHOTO</span>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                <p className="text-[11px] text-white/30">Click to upload photo</p>
              </div>

              <div>
                <label className={lbl}>Full Name *</label>
                <input className={inp} placeholder="e.g. John Smith" maxLength={80}
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>System Role</label>
                  <CustomSelect
                    className={inp}
                    value={form.role}
                    onChange={(v) => setForm((f) => ({ ...f, role: v as Worker["role"] }))}
                    options={[
                      { value: "Admin", label: "Admin" },
                      { value: "Project Manager", label: "Project Manager" },
                      { value: "Foreman", label: "Foreman" },
                      { value: "Worker", label: "Worker" },
                    ]}
                  />
                </div>
                <div>
                  <label className={lbl}>Job Title</label>
                  <input className={inp} placeholder="e.g. Pipe Layer" maxLength={80}
                    value={form.customRole} onChange={(e) => setForm((f) => ({ ...f, customRole: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Email</label>
                  <input className={inp} type="email" placeholder="email@company.com"
                    value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Phone</label>
                  <input className={inp} placeholder="+1 (416) 555-0100" maxLength={20}
                    value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className={lbl}>Hourly Rate ({getCurrencySymbol(currency)})</label>
                <input className={inp} type="number" inputMode="decimal" min="0" placeholder="0"
                  value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} />
              </div>

              <div>
                <label className={lbl}>Accent Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button type="button" key={c} aria-label={`Colour ${c}`} aria-pressed={form.color === c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                      style={{ backgroundColor: c, outline: form.color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={lbl} style={{ marginBottom: 0 }}>Certifications</label>
                  <button type="button"
                    onClick={() => setCertifications((prev) => [...prev, { id: `cert-${Date.now()}`, name: "" }])}
                    className="flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 transition-colors">
                    <Plus size={11} /> Add
                  </button>
                </div>
                {certifications.length === 0 ? (
                  <p className="text-[11px] text-white/20 py-2">No certifications added</p>
                ) : (
                  <div className="space-y-2">
                    {certifications.map((cert, idx) => (
                      <div key={cert.id} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            className={`${inp} flex-1`}
                            placeholder="Certification name (e.g. WHMIS 2015)"
                            maxLength={100}
                            value={cert.name}
                            onChange={(e) => setCertifications((prev) => prev.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))} />
                          <button aria-label="Remove certification" type="button"
                            onClick={() => setCertifications((prev) => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 rounded hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-all flex-shrink-0">
                            <X size={13} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-bold text-white/25 uppercase tracking-wider mb-1">Issued</label>
                            <input
                              className={inp}
                              type="date"
                              value={cert.issuedDate ? toLocalDateString(cert.issuedDate) : ""}
                              onChange={(e) => setCertifications((prev) => prev.map((c, i) => i === idx ? { ...c, issuedDate: e.target.value ? new Date(e.target.value + "T12:00:00") : undefined } : c))} />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-white/25 uppercase tracking-wider mb-1">Expires</label>
                            <input
                              className={inp}
                              type="date"
                              value={cert.expiryDate ? toLocalDateString(cert.expiryDate) : ""}
                              onChange={(e) => setCertifications((prev) => prev.map((c, i) => i === idx ? { ...c, expiryDate: e.target.value ? new Date(e.target.value + "T12:00:00") : undefined } : c))} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {saveError && (
              <p className="mx-6 mb-2 text-[12px] text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={12} /> {saveError}
              </p>
            )}
            <div className="flex-shrink-0 flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06]">
              <button type="button" onClick={() => { setShowModal(false); setSaveError(""); }}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={!form.name.trim() || saving}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {saving ? "Adding…" : editId ? "Save Changes" : "Add Worker"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hours Management Modal */}
      {hoursWorker && (
        <HoursModal
          worker={hoursWorker}
          totalHours={getWorkerTotalHours(hoursWorker.id)}
          adjustments={hoursAdjustments}
          currentUser={currentUser}
          onAdjust={(delta, reason) => handleHoursAdjust(hoursWorker, delta, reason)}
          onClose={() => setHoursWorker(null)}
        />
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        title="Remove Crew Member"
        body={(() => {
          const w = workers.find((w) => w.id === deleteConfirm);
          return w
            ? `Remove ${w.name} from your workspace? They will lose access immediately.`
            : "Remove this worker from your workspace? They will lose access immediately.";
        })()}
        confirmLabel="Remove"
        onConfirm={() => {
          if (deleteConfirm) {
            const name = workers.find((w) => w.id === deleteConfirm)?.name;
            deleteWorker(deleteConfirm);
            if (name) toast.success(`${name} removed from workspace`);
          }
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </>
  );
}






