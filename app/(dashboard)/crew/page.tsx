"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdminOrAbove } from "@/lib/permissions";
import QRCode from "qrcode";
import {
  UserPlus, Search, Mail, Clock, CheckCircle2,
  Copy, Check, X, Pencil, Trash2, Upload, Camera,
  Plus, Minus, History, AlertTriangle, QrCode,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { getCurrencySymbol } from "@/lib/currency";
import { useSearchPrefill } from "@/lib/use-search-prefill";
import type { Worker, HoursAdjustment, WorkerCertification } from "@/lib/mock-data";
import { ConfirmModal } from "@/components/confirm-modal";

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  Admin: { label: "Admin", className: "bg-purple-500/15 text-purple-400" },
  "Project Manager": { label: "Project Manager", className: "bg-blue-500/15 text-blue-400" },
  Foreman: { label: "Foreman", className: "bg-amber-500/12 text-amber-400" },
  Worker: { label: "Worker", className: "bg-white/8 text-white/50" },
};

const COLORS = ["#f59e0b","#3b82f6","#8b5cf6","#22c55e","#ef4444","#06b6d4","#ec4899","#f97316","#84cc16","#a78bfa"];

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
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-[15px] font-bold text-white">Manage Hours</h3>
            <p className="text-[11px] text-white/40 mt-0.5">{worker.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <X size={16} />
          </button>
        </div>

        {/* Current hours display */}
        <div className="mx-6 mt-5 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400/60">Total Hours</p>
            <p className="text-[32px] font-black text-amber-400">{totalHours.toFixed(1)}<span className="text-[16px] font-normal text-amber-400/60">h</span></p>
          </div>
          <Clock size={28} className="text-amber-400/30" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 mt-5 bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-1">
          {(["adjust", "history"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-bold transition-colors ${tab === t ? "bg-amber-500 text-black" : "text-white/35 hover:text-white/55"}`}>
              {t === "adjust" ? <><Plus size={12} />Adjust</> : <><History size={12} />History</>}
            </button>
          ))}
        </div>

        {tab === "adjust" && (
          <div className="p-6 space-y-4">
            {/* Add / Subtract toggle */}
            <div className="flex gap-2">
              <button onClick={() => setMode("add")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold border transition-colors ${mode === "add" ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-white/[0.03] border-white/[0.07] text-white/35 hover:text-white/55"}`}>
                <Plus size={13} /> Add Hours
              </button>
              <button onClick={() => setMode("subtract")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold border transition-colors ${mode === "subtract" ? "bg-red-500/15 border-red-500/30 text-red-400" : "bg-white/[0.03] border-white/[0.07] text-white/35 hover:text-white/55"}`}>
                <Minus size={13} /> Remove Hours
              </button>
            </div>

            <div>
              <label className={lbl}>Hours to {mode === "add" ? "Add" : "Remove"}</label>
              <input className={inp} type="number" min="0.1" step="0.5" placeholder="e.g. 8"
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
                        {adj.createdAt.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}{adj.createdAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
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

export default function CrewPage() {
  const {
    workers, addWorker, updateWorker, deleteWorker,
    currentUser, hoursAdjustments, addHoursAdjustment, getWorkerTotalHours,
    currency, inviteCode,
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
  const [hoursWorker, setHoursWorker] = useState<Worker | null>(null);
  const [certifications, setCertifications] = useState<WorkerCertification[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
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
    const matchSearch =
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.role.toLowerCase().includes(search.toLowerCase()) ||
      w.customRole.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || w.role === filterRole;
    return matchSearch && matchRole;
  });

  const clockedIn = workers.filter((w) => w.clockedIn).length;
  const canSeeFinancials = currentUser.role === "Admin" || currentUser.role === "Project Manager";
  const canEdit = currentUser.role === "Admin" || currentUser.role === "Project Manager";

  const openAdd = () => { setForm(blank); setEditId(null); setCertifications([]); setShowModal(true); };
  const openEdit = (w: Worker) => {
    setForm({
      name: w.name, customRole: w.customRole, role: w.role,
      email: w.email, phone: w.phone, color: w.color,
      hourlyRate: w.hourlyRate ? String(w.hourlyRate) : "", photo: w.photo ?? "",
    });
    setCertifications(w.certifications ? [...w.certifications] : []);
    setEditId(w.id);
    setShowModal(true);
  };

  const handlePhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, photo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  }, []);

  const handleSave = () => {
    if (!form.name.trim()) return;
    const initials = form.name.trim().split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
    const profileFields = {
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
    };
    if (editId) {
      updateWorker(editId, profileFields);
    } else {
      addWorker({ ...profileFields, projectIds: [], clockedIn: false });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (id === currentUser.id) return;
    setDeleteConfirm(id);
  };

  const handleCopy = (fullUrl = false) => {
    const text = fullUrl
      ? `${window.location.origin}/login?join=${inviteCode}`
      : inviteCode;
    navigator.clipboard.writeText(text);
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

  return (
    <div className="space-y-5 max-w-[1000px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Crew & Workers</h2>
          </div>
          <p className="text-white/35 text-sm mt-0.5">
            {workers.length} member{workers.length !== 1 ? "s" : ""} · {clockedIn} clocked in now
          </p>
        </div>
        {canEdit && (
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors">
            <UserPlus size={15} />
            Add Worker
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Crew", value: workers.length, color: "text-white" },
          { label: "Clocked In", value: clockedIn, color: "text-green-400" },
          { label: "Admins", value: workers.filter((w) => w.role === "Admin").length, color: "text-purple-400" },
          { label: "Workers", value: workers.filter((w) => w.role === "Worker").length, color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-white/35 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Invite code */}
      <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-400/70 mb-1">Company Invite Code</p>
          <p className="text-[13px] text-white/50">Share with workers so they can join your workspace</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <code className="text-lg font-black font-mono tracking-[0.15em] text-amber-400">{inviteCode}</code>
          <button onClick={handleShowQR}
            className="flex items-center gap-1.5 text-[12px] font-bold bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-400 px-3 py-2 rounded-lg transition-colors">
            <QrCode size={13} /> QR Code
          </button>
          <button onClick={() => handleCopy(false)}
            className="flex items-center gap-1.5 text-[12px] font-bold bg-amber-500/15 hover:bg-amber-500/25 active:bg-amber-500/35 text-amber-400 px-3 py-2 rounded-lg transition-colors">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl p-8 flex flex-col items-center gap-5 w-72">
            <div className="flex items-center justify-between w-full">
              <h3 className="text-[15px] font-bold text-white">Invite Workers</h3>
              <button onClick={() => setShowQR(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5">
                <X size={16} />
              </button>
            </div>
            {qrDataUrl && <img src={qrDataUrl} alt="Invite QR code" className="w-48 h-48 rounded-xl" />}
            <div className="text-center space-y-1">
              <p className="text-[13px] font-bold text-white/70">Scan to join workspace</p>
              <p className="text-[11px] text-white/30">Or share code: <span className="font-mono font-bold text-amber-400">{inviteCode}</span></p>
            </div>
            <button onClick={() => handleCopy(true)} className="w-full py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 active:bg-amber-600 transition-colors flex items-center justify-center gap-2">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Link Copied!" : "Copy Invite Link"}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-2">
          <Search size={13} className="text-white/30" />
          <input className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none w-48"
            placeholder={`${t.common.search} crew…`} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 bg-[#0d0d0d] border border-white/[0.06] rounded-xl p-1">
          {["all", "Admin", "Project Manager", "Foreman", "Worker"].map((r) => (
            <button key={r} onClick={() => setFilterRole(r)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors ${filterRole === r ? "bg-amber-500 text-black" : "text-white/35 hover:text-white/55"}`}>
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Worker grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((worker) => {
          const roleCfg = ROLE_CONFIG[worker.role] ?? ROLE_CONFIG.Worker;
          const totalHours = getWorkerTotalHours(worker.id);
          return (
            <div key={worker.id}
              className="bg-[#111111] border border-white/[0.06] hover:border-white/10 rounded-xl p-5 flex items-start gap-4 transition-colors group">
              {/* Avatar */}
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                {worker.photo ? (
                  <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[16px] font-black"
                    style={{ backgroundColor: worker.color + "20", color: worker.color }}>
                    {worker.initials}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="text-[14px] font-bold text-white/90">{worker.name}</p>
                    <p className="text-[11px] text-white/40">{worker.customRole}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleCfg.className}`}>
                      {roleCfg.label}
                    </span>
                    {canEdit && (
                      <button onClick={() => openEdit(worker)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/30 hover:text-white/70 transition-all">
                        <Pencil size={12} />
                      </button>
                    )}
                    {canEdit && worker.id !== currentUser.id && (
                      <button onClick={() => handleDelete(worker.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/30 hover:text-red-400 transition-all">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2.5">
                  {worker.clockedIn ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[11px] text-green-400 font-semibold">Clocked In</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                      <span className="text-[11px] text-white/30">Off Site</span>
                    </div>
                  )}
                  {canSeeFinancials && worker.hourlyRate > 0 && (
                    <>
                      <span className="text-white/[0.12]">·</span>
                      <span className="text-[11px] text-white/30">{getCurrencySymbol(currency)}{worker.hourlyRate}/hr</span>
                    </>
                  )}
                </div>

                {/* Hours row */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1.5">
                    <Clock size={10} className="text-white/25" />
                    <span className="text-[11px] text-white/40">
                      {totalHours > 0 ? `${totalHours.toFixed(1)}h total` : "No hours logged"}
                    </span>
                  </div>
                  {currentUser.role === "Admin" && (
                    <button onClick={() => setHoursWorker(worker)}
                      className="text-[10px] font-bold text-amber-400/60 hover:text-amber-400 bg-amber-500/[0.06] hover:bg-amber-500/10 px-2 py-0.5 rounded-lg transition-colors">
                      Manage Hours
                    </button>
                  )}
                </div>

                {worker.email && (
                  <div className="mt-3">
                    <a href={`mailto:${worker.email}`}
                      className="text-[11px] text-white/35 hover:text-white/60 flex items-center gap-1 transition-colors w-fit">
                      <Mail size={11} />
                      {worker.email}
                    </a>
                  </div>
                )}
                {worker.certifications && worker.certifications.length > 0 && (() => {
                  const now = Date.now();
                  const soon = 30 * 86400000;
                  return (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {worker.certifications.map((c) => {
                        const expired = c.expiryDate && c.expiryDate.getTime() < now;
                        const expiringSoon = !expired && c.expiryDate && (c.expiryDate.getTime() - now) < soon;
                        return (
                          <span key={c.id} className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${expired ? "bg-red-500/15 text-red-400" : expiringSoon ? "bg-amber-500/15 text-amber-400" : "bg-white/[0.06] text-white/40"}`}>
                            {(expired || expiringSoon) && <AlertTriangle size={8} />}
                            {c.name}
                            {c.expiryDate && <span className="opacity-60">· Exp. {c.expiryDate.toLocaleDateString("en-CA", { month: "short", year: "2-digit" })}</span>}
                          </span>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <p className="text-white/20 text-[13px]">No crew members found</p>
          {workers.length === 0 && (
            <button onClick={openAdd} className="text-amber-400 text-[12px] hover:text-amber-300 transition-colors">
              + Add your first crew member
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Worker Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">{editId ? "Edit Worker" : "Add Worker"}</h3>
              <button onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
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
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ color: form.color }}>
                      <Upload size={18} /><span className="text-[9px] font-bold">PHOTO</span>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                <p className="text-[11px] text-white/30">Click to upload photo</p>
              </div>

              <div>
                <label className={lbl}>Full Name *</label>
                <input className={inp} placeholder="e.g. John Smith"
                  value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>System Role</label>
                  <select className={inp} value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Worker["role"] }))}>
                    <option value="Admin">Admin</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Foreman">Foreman</option>
                    <option value="Worker">Worker</option>
                  </select>
                </div>
                <div>
                  <label className={lbl}>Job Title</label>
                  <input className={inp} placeholder="e.g. Pipe Layer"
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
                  <input className={inp} placeholder="+1 (416) 555-0100"
                    value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className={lbl}>Hourly Rate ({getCurrencySymbol(currency)})</label>
                <input className={inp} type="number" placeholder="0"
                  value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} />
              </div>

              <div>
                <label className={lbl}>Accent Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-lg transition-transform hover:scale-110"
                      style={{ backgroundColor: c, outline: form.color === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={lbl} style={{ marginBottom: 0 }}>Certifications</label>
                  <button
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
                            value={cert.name}
                            onChange={(e) => setCertifications((prev) => prev.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))} />
                          <button
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
                              value={cert.issuedDate ? cert.issuedDate.toISOString().split("T")[0] : ""}
                              onChange={(e) => setCertifications((prev) => prev.map((c, i) => i === idx ? { ...c, issuedDate: e.target.value ? new Date(e.target.value) : undefined } : c))} />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-white/25 uppercase tracking-wider mb-1">Expires</label>
                            <input
                              className={inp}
                              type="date"
                              value={cert.expiryDate ? cert.expiryDate.toISOString().split("T")[0] : ""}
                              onChange={(e) => setCertifications((prev) => prev.map((c, i) => i === idx ? { ...c, expiryDate: e.target.value ? new Date(e.target.value) : undefined } : c))} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!form.name.trim()}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editId ? "Save Changes" : "Add Worker"}
              </button>
            </div>
          </div>
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
        onConfirm={() => { if (deleteConfirm) deleteWorker(deleteConfirm); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
