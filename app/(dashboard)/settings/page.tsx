"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users, Building2, Bell, BellOff, Shield, HardHat, Lock,
  Plus, Edit2, Trash2, Copy, CheckCircle2, Key, X, Check,
  Globe, Briefcase, DollarSign, Eye, EyeOff, AlertCircle,
  ShieldCheck, ChevronDown, Clock,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n/locales";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import {
  loadPrefs, savePrefs, getPermission, requestPermission,
  CATEGORY_LABELS, type NotifPrefs, type NotifCategory,
} from "@/lib/notifications";
import { subscribeToPush } from "@/lib/push-client";
import { getClient, SUPABASE_ENABLED } from "@/lib/supabase/client";
import { ConfirmModal } from "@/components/confirm-modal";
import { isAdminOrAbove } from "@/lib/permissions";

type Tab = "company" | "preferences" | "workers" | "roles" | "notifications" | "security" | "access";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; adminOnly?: boolean }[] = [
  { id: "company",       label: "Company",        icon: Building2,  adminOnly: true },
  { id: "preferences",   label: "Preferences",    icon: Globe },
  { id: "workers",       label: "Workers",         icon: Users,      adminOnly: true },
  { id: "roles",         label: "Custom Roles",    icon: HardHat,    adminOnly: true },
  { id: "notifications", label: "Notifications",   icon: Bell },
  { id: "security",      label: "Security",        icon: Shield },
  { id: "access",        label: "Access Control",  icon: ShieldCheck, adminOnly: true },
];

const INDUSTRIES = [
  "Construction", "Civil / Utilities", "Landscaping", "HVAC", "Plumbing", "Electrical",
  "Roofing", "Painting", "Concrete", "Framing", "Drywall",
  "Flooring", "Masonry", "Steel / Structural", "Siding",
  "Windows & Doors", "Insulation", "Excavation", "General Contracting",
  "Maintenance", "Other",
];

const ROLE_COLORS: Record<string, string> = {
  Admin: "#F5C400", "Project Manager": "#8b5cf6",
  Foreman: "#3b82f6", Worker: "#22c55e",
};

const inp = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-amber-500/40 transition-colors placeholder:text-white/20";
const lbl = "text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1.5";

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}

function SettingsInner() {
  const {
    workers, currentUser, companyName, setCompanyName, deleteWorker, updateWorker,
    language, setLanguage, currency, setCurrency, industry, setIndustry,
    customRoles, addCustomRole, deleteCustomRole,
    companyAddress, businessNumber, defaultTaxRate, inviteCode,
    setCompanyAddress, setBusinessNumber, setDefaultTaxRate,
    overtimeEnabled, overtimeDailyThreshold, overtimeWeeklyThreshold, overtimeMultiplier,
    setOvertimeSettings,
    companyLogo, setCompanyLogo,
    companyId, permissionsPin, setPermissionsPin,
    signOut,
  } = useStore();

  const searchParams = useSearchParams();
  const router = useRouter();
  const isAdmin = isAdminOrAbove(currentUser.role);
  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("tab");
    const valid = (t === "company" || t === "preferences" || t === "workers" ||
      t === "roles" || t === "notifications" || t === "security" || t === "access") ? t as Tab : null;
    if (valid && (isAdmin || valid === "preferences" || valid === "notifications" || valid === "security")) return valid;
    return isAdmin ? "company" : "preferences";
  });
  const [codeCopied, setCodeCopied] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: companyName,
    businessNumber: businessNumber,
    address: companyAddress,
    taxRate: String(defaultTaxRate),
  });

  // Sync form when store loads data (companyName/etc. arrive asynchronously from
  // Supabase after mount — this is re-hydrating local draft state from an external
  // source, not deriving it from a prop already available at render time).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompanyForm({ name: companyName, businessNumber, address: companyAddress, taxRate: String(defaultTaxRate) });
  }, [companyName, businessNumber, companyAddress, defaultTaxRate]);

  // ── Overtime form ─────────────────────────────────────────────────────────────
  const [overtimeForm, setOvertimeForm] = useState({
    enabled: overtimeEnabled,
    dailyThreshold: overtimeDailyThreshold != null ? String(overtimeDailyThreshold) : "",
    weeklyThreshold: overtimeWeeklyThreshold != null ? String(overtimeWeeklyThreshold) : "40",
    multiplier: String(overtimeMultiplier),
  });
  const [overtimeSaved, setOvertimeSaved] = useState(false);
  // Sync from store once Supabase data loads
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOvertimeForm({
      enabled: overtimeEnabled,
      dailyThreshold: overtimeDailyThreshold != null ? String(overtimeDailyThreshold) : "",
      weeklyThreshold: overtimeWeeklyThreshold != null ? String(overtimeWeeklyThreshold) : "40",
      multiplier: String(overtimeMultiplier),
    });
  }, [overtimeEnabled, overtimeDailyThreshold, overtimeWeeklyThreshold, overtimeMultiplier]);

  // ── Roles ─────────────────────────────────────────────────────────────────────
  const [newRole, setNewRole] = useState("");
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editRoleValue, setEditRoleValue] = useState("");

  // ── Notifications ─────────────────────────────────────────────────────────────
  const [notifPerms, setNotifPerms] = useState<NotificationPermission | "unsupported">("default");
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(() => loadPrefs());
  const [notifRequesting, setNotifRequesting] = useState(false);
  // Reading the browser's Notification.permission (external system) on mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setNotifPerms(getPermission()); }, []);

  // ── Security ──────────────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwStatus, setPwStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pwError, setPwError] = useState("");

  // ── Delete account ─────────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "loading" | "requested" | "error">("idle");
  const [deleteError, setDeleteError] = useState("");

  const handleRequestDeletion = async () => {
    setDeleteStatus("loading");
    setDeleteError("");
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(json.error || "Something went wrong. Please try again or email support@getconstra.com.");
        setDeleteStatus("error");
        return;
      }
      setDeleteStatus("requested");
      setTimeout(async () => {
        await signOut();
        router.push("/login");
      }, 4000);
    } catch {
      setDeleteError("Network error. Please try again or email support@getconstra.com.");
      setDeleteStatus("error");
    }
  };

  // ── Logo upload ────────────────────────────────────────────────────────────────
  const [logoSaving, setLogoSaving] = useState(false);
  const [logoStatus, setLogoStatus] = useState<"idle" | "saved" | "error">("idle");

  const handleLogoUpload = async (file: File) => {
    setLogoSaving(true);
    setLogoStatus("idle");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const raw = ev.target?.result as string;
          if (!raw) { reject(new Error("FileReader returned empty")); return; }
          const img = new Image();
          img.onload = () => {
            const MAX = 300;
            const scale = Math.min(1, MAX / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) { reject(new Error("Canvas context unavailable")); return; }
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", 0.70));
          };
          img.onerror = () => reject(new Error("Image failed to load"));
          img.src = raw;
        };
        reader.onerror = () => reject(new Error("FileReader error"));
        reader.readAsDataURL(file);
      });

      // Update local/cached state immediately
      setCompanyLogo(dataUrl);

      // Explicitly save to Supabase with feedback
      if (SUPABASE_ENABLED && companyId) {
        const { error } = await getClient()
          .from("companies")
          .update({ logo: dataUrl })
          .eq("id", companyId);
        if (error) {
          console.error("[settings] logo save failed:", error);
          setLogoStatus("error");
          return;
        }
      }
      setLogoStatus("saved");
      setTimeout(() => setLogoStatus("idle"), 3000);
    } catch (err) {
      console.error("[settings] logo upload error:", err);
      setLogoStatus("error");
    } finally {
      setLogoSaving(false);
    }
  };

  // ── Invite code ───────────────────────────────────────────────────────────────
  const [displayCode, setDisplayCode] = useState(inviteCode || "CN-XXXX-XXXX");
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState("");
  // inviteCode arrives asynchronously from the store; displayCode is also set
  // independently after regenerating a code (see handleRegenerateCode below),
  // so it can't be purely derived — this effect just re-syncs it once the store loads.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (inviteCode) setDisplayCode(inviteCode); }, [inviteCode]);

  // ── Confirmation dialogs ──────────────────────────────────────────────────────
  const [kickConfirm, setKickConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const saveCompany = () => {
    setCompanyName(companyForm.name);
    setCompanyAddress(companyForm.address);
    setBusinessNumber(companyForm.businessNumber);
    const parsedRate = parseFloat(companyForm.taxRate);
    if (!isNaN(parsedRate)) setDefaultTaxRate(Math.min(100, Math.max(0, parsedRate)));
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const saveOvertime = () => {
    const daily = overtimeForm.dailyThreshold === "" ? null : parseFloat(overtimeForm.dailyThreshold);
    const weekly = overtimeForm.weeklyThreshold === "" ? null : parseFloat(overtimeForm.weeklyThreshold);
    const mult = parseFloat(overtimeForm.multiplier);
    setOvertimeSettings({
      enabled: overtimeForm.enabled,
      dailyThreshold: daily != null && !isNaN(daily) ? daily : null,
      weeklyThreshold: weekly != null && !isNaN(weekly) ? weekly : null,
      multiplier: !isNaN(mult) && mult > 0 ? mult : 1.5,
    });
    setOvertimeSaved(true);
    setTimeout(() => setOvertimeSaved(false), 2500);
  };

  const [linkCopied, setLinkCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(displayCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/login?join=${displayCode}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const regenerateCode = async () => {
    if (!companyId || regenerating) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/regenerate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const json = await res.json();
      if (!res.ok || !json.inviteCode) throw new Error(json.error ?? "Failed to regenerate");
      setDisplayCode(json.inviteCode);
      setRegenError("");
    } catch (err: unknown) {
      setRegenError(err instanceof Error ? err.message : "Could not regenerate invite code. Please try again.");
    }
    setRegenerating(false);
  };

  const handleKick = (id: string, name: string) => {
    if (id === currentUser.id) return;
    setKickConfirm({ id, name });
  };

  const toggleNotifPref = (cat: NotifCategory) => {
    const next = { ...notifPrefs, [cat]: !notifPrefs[cat] };
    setNotifPrefs(next);
    savePrefs(next);
  };

  const enableNotifs = async () => {
    setNotifRequesting(true);
    const result = await requestPermission();
    setNotifPerms(result);
    // Subscribe to Web Push so notifications arrive even when tab is closed
    if (result === "granted" && companyId && currentUser.id) {
      subscribeToPush(companyId, currentUser.id).catch(() => {});
    }
    setNotifRequesting(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (pwForm.next.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Passwords don't match."); return; }
    setPwStatus("loading");

    if (!SUPABASE_ENABLED) {
      setPwStatus("success");
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwStatus("idle"), 3000);
      return;
    }

    try {
      // First re-authenticate with current password
      const supabase = getClient();
      const email = currentUser.email;
      if (!email || !pwForm.current) { setPwError("Cannot verify your identity — please re-log in."); setPwStatus("error"); return; }
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pwForm.current });
      if (signInErr) { setPwError("Current password is incorrect."); setPwStatus("error"); return; }
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) { setPwError(error.message); setPwStatus("error"); return; }
      setPwStatus("success");
      setPwForm({ current: "", next: "", confirm: "" });
      setTimeout(() => setPwStatus("idle"), 3000);
    } catch {
      setPwError("Something went wrong. Please try again.");
      setPwStatus("error");
    }
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newRole.trim();
    if (!trimmed) return;
    addCustomRole(trimmed);
    setNewRole("");
  };

  const handleSaveEditRole = (oldRole: string) => {
    const trimmed = editRoleValue.trim();
    if (!trimmed || trimmed === oldRole) { setEditingRole(null); return; }
    deleteCustomRole(oldRole);
    addCustomRole(trimmed);
    setEditingRole(null);
  };

  return (
    <div className="space-y-4">
    <div className="flex flex-col sm:flex-row gap-6 max-w-[1100px]">
      {/* Sidebar tabs — horizontal scroll on mobile */}
      <div className="w-full sm:w-48 flex-shrink-0">
        <div className="flex sm:flex-col gap-1 overflow-x-auto pb-1 sm:pb-0">
          {TABS.filter((t) => !t.adminOnly || isAdmin).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-[13px] font-medium transition-colors text-left whitespace-nowrap ${tab === id ? "bg-amber-500/12 text-amber-400" : "text-white/45 hover:text-white/70 hover:bg-white/5"}`}>
              <Icon size={14} className={tab === id ? "text-amber-400" : "text-white/30"} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0">

        {/* ── COMPANY ── */}
        {tab === "company" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-white">Company Settings</h3>
              {savedBanner && (
                <span className="flex items-center gap-1.5 text-[12px] text-green-400 font-semibold bg-green-500/10 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 size={13} /> Saved!
                </span>
              )}
            </div>
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5 space-y-4">
              {/* Logo upload */}
              <div>
                <label className={lbl}>Company Logo</label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center overflow-hidden flex-shrink-0">
                    {companyLogo
                      ? <img src={companyLogo} alt="Company logo" className="w-full h-full object-contain p-1" />
                      : <Building2 size={24} className="text-white/20" />}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={`cursor-pointer inline-flex items-center gap-2 border text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${logoSaving ? "opacity-50 cursor-wait bg-white/[0.04] border-white/[0.06] text-white/40" : "bg-white/[0.06] hover:bg-white/[0.10] border-white/[0.08] text-white/70"}`}>
                      {logoSaving ? "Saving…" : "Upload Logo"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={logoSaving}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          e.target.value = "";
                          handleLogoUpload(file);
                        }}
                      />
                    </label>
                    {logoStatus === "saved" && (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-green-400">
                        <CheckCircle2 size={11} /> Logo saved!
                      </span>
                    )}
                    {logoStatus === "error" && (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400">
                        <AlertCircle size={11} /> Save failed — run migration 005 in Supabase
                      </span>
                    )}
                    {companyLogo && logoStatus === "idle" && (
                      <button onClick={() => setCompanyLogo("")} className="text-[11px] text-white/30 hover:text-red-400 transition-colors text-left">
                        Remove logo
                      </button>
                    )}
                    <p className="text-[10px] text-white/25">PNG or JPG · Used on invoices & PDFs</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Company Name</label>
                  <input className={inp} value={companyForm.name} placeholder="Your company name"
                    onChange={(e) => setCompanyForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Business / Tax Number</label>
                  <input className={inp} value={companyForm.businessNumber} placeholder="e.g. 123456789"
                    onChange={(e) => setCompanyForm((f) => ({ ...f, businessNumber: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Default Tax Rate (%)</label>
                  <input className={inp} type="number" min="0" max="100" step="0.01" value={companyForm.taxRate}
                    placeholder="13"
                    onChange={(e) => setCompanyForm((f) => ({ ...f, taxRate: e.target.value }))} />
                  <p className="text-[10px] text-white/25 mt-1">Pre-fills new invoices &amp; estimates — still editable per document.</p>
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Business Address</label>
                  <input className={inp} value={companyForm.address} placeholder="Street, City, Province, Postal Code"
                    onChange={(e) => setCompanyForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
              <button onClick={saveCompany} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors">
                Save Changes
              </button>
            </div>

            {/* ── Overtime Rules ── */}
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-amber-400" />
                  <div>
                    <h4 className="text-[14px] font-bold text-white">Overtime Rules</h4>
                    <p className="text-[11px] text-white/35">Applied to payroll exports and reports.</p>
                  </div>
                </div>
                {overtimeSaved && (
                  <span className="flex items-center gap-1.5 text-[12px] text-green-400 font-semibold bg-green-500/10 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 size={13} /> Saved!
                  </span>
                )}
              </div>

              {/* Enable toggle */}
              <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                <div>
                  <p className="text-[13px] font-semibold text-white">Enable Overtime Tracking</p>
                  <p className="text-[11px] text-white/35 mt-0.5">When off, all hours are treated as regular pay.</p>
                </div>
                <button
                  onClick={() => setOvertimeForm((f) => ({ ...f, enabled: !f.enabled }))}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${overtimeForm.enabled ? "bg-amber-500" : "bg-white/10"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${overtimeForm.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {overtimeForm.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Daily Threshold (hrs)</label>
                    <input
                      className={inp}
                      type="number"
                      min="1"
                      step="0.5"
                      value={overtimeForm.dailyThreshold}
                      placeholder="e.g. 8 (leave blank to skip)"
                      onChange={(e) => setOvertimeForm((f) => ({ ...f, dailyThreshold: e.target.value }))}
                    />
                    <p className="text-[10px] text-white/25 mt-1">Hours/day before daily OT kicks in. Leave blank to disable.</p>
                  </div>
                  <div>
                    <label className={lbl}>Weekly Threshold (hrs)</label>
                    <input
                      className={inp}
                      type="number"
                      min="1"
                      step="0.5"
                      value={overtimeForm.weeklyThreshold}
                      placeholder="e.g. 40 (leave blank to skip)"
                      onChange={(e) => setOvertimeForm((f) => ({ ...f, weeklyThreshold: e.target.value }))}
                    />
                    <p className="text-[10px] text-white/25 mt-1">Regular hours/week after daily OT removed. Leave blank to disable.</p>
                  </div>
                  <div>
                    <label className={lbl}>Overtime Multiplier</label>
                    <input
                      className={inp}
                      type="number"
                      min="1"
                      step="0.25"
                      value={overtimeForm.multiplier}
                      placeholder="1.5"
                      onChange={(e) => setOvertimeForm((f) => ({ ...f, multiplier: e.target.value }))}
                    />
                    <p className="text-[10px] text-white/25 mt-1">e.g. 1.5 = time-and-a-half, 2.0 = double time.</p>
                  </div>
                </div>
              )}

              <button onClick={saveOvertime} className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors">
                Save Overtime Rules
              </button>
            </div>

            <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
              <h4 className="text-[14px] font-bold text-white mb-1">Team Invite Code</h4>
              <p className="text-[12px] text-white/40 mb-4">Share this code so workers can join your workspace from the sign-in page.</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-4 py-3 font-mono text-[18px] font-bold tracking-[0.2em] text-amber-400">
                  {displayCode}
                </div>
                <button onClick={copyCode}
                  className="flex items-center gap-2 bg-white/8 hover:bg-white/12 text-white/70 text-[12px] font-semibold px-3 py-3 rounded-lg transition-colors">
                  {codeCopied ? <CheckCircle2 size={15} className="text-green-400" /> : <Copy size={15} />}
                  {codeCopied ? "Copied!" : "Copy Code"}
                </button>
                <button onClick={copyLink}
                  className="flex items-center gap-2 bg-white/8 hover:bg-white/12 text-white/70 text-[12px] font-semibold px-3 py-3 rounded-lg transition-colors">
                  {linkCopied ? <CheckCircle2 size={15} className="text-green-400" /> : <Copy size={15} />}
                  {linkCopied ? "Copied!" : "Copy Link"}
                </button>
                <button onClick={regenerateCode} disabled={regenerating}
                  className="flex items-center gap-2 bg-white/8 hover:bg-white/12 disabled:opacity-50 text-white/70 text-[12px] font-semibold px-3 py-3 rounded-lg transition-colors">
                  <Key size={15} className={regenerating ? "animate-spin" : ""} />
                  {regenerating ? "…" : "Regenerate"}
                </button>
              </div>
              {regenError && (
                <p className="text-[11px] text-red-400 mt-2 flex items-center gap-1.5">
                  <AlertCircle size={11} /> {regenError}
                </p>
              )}
              <p className="text-[11px] text-white/25 mt-3">
                Regenerating creates a new code. The old code stops working immediately.
              </p>
            </div>
          </div>
        )}

        {/* ── PREFERENCES ── */}
        {tab === "preferences" && (
          <div className="space-y-5">
            <h3 className="text-[17px] font-bold text-white">App Preferences</h3>

            <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Globe size={16} className="text-amber-400" />
                <div>
                  <h4 className="text-[14px] font-bold text-white">Language</h4>
                  <p className="text-[11px] text-white/35">Display language for the entire app.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(LOCALE_LABELS) as [Locale, string][]).map(([code, name]) => (
                  <button key={code} onClick={() => setLanguage(code)}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all ${language === code ? "border-amber-500/50 bg-amber-500/10" : "border-white/[0.06] hover:border-white/12 hover:bg-white/[0.02]"}`}>
                    <p className={`text-[13px] font-semibold ${language === code ? "text-amber-300" : "text-white/70"}`}>{name}</p>
                    <p className="text-[10px] text-white/30 uppercase">{code}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign size={16} className="text-amber-400" />
                <div>
                  <h4 className="text-[14px] font-bold text-white">Currency</h4>
                  <p className="text-[11px] text-white/35">Used for estimates, invoices, and reports.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {CURRENCIES.map((c) => (
                  <button key={c.code} onClick={() => setCurrency(c.code as CurrencyCode)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${currency === c.code ? "border-amber-500/50 bg-amber-500/10" : "border-white/[0.06] hover:border-white/12 hover:bg-white/[0.02]"}`}>
                    <span className="text-lg">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-semibold truncate ${currency === c.code ? "text-amber-300" : "text-white/70"}`}>{c.code} — {c.symbol}</p>
                      <p className="text-[10px] text-white/30 truncate">{c.name}</p>
                    </div>
                    {currency === c.code && <Check size={12} className="text-amber-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <Briefcase size={16} className="text-amber-400" />
                <div>
                  <h4 className="text-[14px] font-bold text-white">Industry</h4>
                  <p className="text-[11px] text-white/35">Customizes terminology and features for your trade.</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {INDUSTRIES.map((ind) => (
                  <button key={ind} onClick={() => setIndustry(ind)}
                    className={`px-3 py-2.5 rounded-xl border text-left text-[12px] font-medium transition-all ${industry === ind ? "border-amber-500/50 bg-amber-500/10 text-amber-300" : "border-white/[0.06] text-white/50 hover:border-white/12 hover:text-white/70"}`}>
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── WORKERS ── */}
        {tab === "workers" && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-white">Workers & Crew</h3>
              <Link href="/crew" className="text-[12px] text-amber-400 hover:text-amber-300 transition-colors">
                + Add new worker →
              </Link>
            </div>
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="grid text-[10px] font-bold uppercase tracking-widest text-white/25 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]"
                style={{ gridTemplateColumns: "2fr 1fr 120px 80px" }}>
                <span>Worker</span><span>Contact</span><span>Role</span><span className="text-right">Action</span>
              </div>
              {workers.map((worker) => {
                const roleColor = ROLE_COLORS[worker.role] ?? "#64748b";
                const isMe = worker.id === currentUser.id;
                return (
                  <div key={worker.id} className="grid items-center px-5 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    style={{ gridTemplateColumns: "2fr 1fr 120px 80px" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ backgroundColor: worker.color + "25", color: worker.color }}>
                        {worker.photo ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" /> : worker.initials}
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white/80">{worker.name}{isMe && <span className="ml-1.5 text-[10px] text-amber-400 font-normal">(you)</span>}</p>
                        <p className="text-[11px] text-white/35">{worker.customRole}</p>
                      </div>
                    </div>
                    <div className="text-[11px] text-white/35 truncate pr-2">{worker.email || "—"}</div>
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: roleColor + "18", color: roleColor }}>{worker.role}</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      {!isMe ? (
                        <button onClick={() => handleKick(worker.id, worker.name)}
                          className="flex items-center gap-1 text-[11px] font-bold text-red-400/70 hover:text-red-400 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-all">
                          <Trash2 size={11} /> Kick
                        </button>
                      ) : (
                        <span className="text-[11px] text-white/20">You</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {workers.length === 0 && (
                <div className="px-5 py-8 text-center text-white/25 text-[12px]">
                  No workers yet — <Link href="/crew" className="text-amber-400 hover:text-amber-300">add from Crew page</Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ROLES ── */}
        {tab === "roles" && (
          <div className="space-y-5">
            <div>
              <h3 className="text-[17px] font-bold text-white">Custom Labour Roles</h3>
              <p className="text-[12px] text-white/40 mt-0.5">Add any trade or position that fits your company. These appear when adding crew members.</p>
            </div>

            {/* System roles */}
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/25 mb-3">System Roles (read-only)</p>
              <div className="grid grid-cols-2 gap-2">
                {["Admin / Owner", "Project Manager", "Foreman / Supervisor", "Worker / Labourer"].map((role) => (
                  <div key={role} className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.05] rounded-lg px-3 py-2.5">
                    <Lock size={12} className="text-white/20 flex-shrink-0" />
                    <span className="text-[13px] text-white/60">{role}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom roles */}
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/25 mb-3">Your Custom Roles</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {customRoles.length === 0 && (
                  <p className="col-span-2 text-[12px] text-white/25 italic py-1">No custom roles yet.</p>
                )}
                {customRoles.map((role) => (
                  <div key={role} className="flex items-center gap-2 bg-amber-500/[0.05] border border-amber-500/15 rounded-lg px-3 py-2.5 group hover:border-amber-500/25 transition-colors">
                    <HardHat size={12} className="text-amber-400/50 flex-shrink-0" />
                    {editingRole === role ? (
                      <>
                        <input
                          autoFocus
                          value={editRoleValue}
                          onChange={(e) => setEditRoleValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEditRole(role);
                            if (e.key === "Escape") setEditingRole(null);
                          }}
                          className="flex-1 bg-transparent text-[13px] text-white outline-none border-b border-amber-500/40"
                        />
                        <button onClick={() => handleSaveEditRole(role)} className="text-amber-400 hover:text-amber-300"><Check size={13} /></button>
                        <button onClick={() => setEditingRole(null)} className="text-white/30 hover:text-white/60"><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <span className="text-[13px] text-white/70 flex-1">{role}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingRole(role); setEditRoleValue(role); }}
                            className="w-5 h-5 flex items-center justify-center text-white/30 hover:text-white/60 rounded"><Edit2 size={10} /></button>
                          <button onClick={() => setDeleteRoleConfirm(role)}
                            className="w-5 h-5 flex items-center justify-center text-white/20 hover:text-red-400 rounded"><Trash2 size={10} /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Add role form */}
              <form onSubmit={handleAddRole} className="flex items-center gap-2">
                <input
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g. Pipe Layer, Grade Man, Operator…"
                  className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-amber-500/40 placeholder:text-white/20"
                />
                <button type="submit" disabled={!newRole.trim()}
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-[12px] px-3 py-2.5 rounded-lg transition-colors">
                  <Plus size={13} /> Add
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {tab === "notifications" && (
          <div className="space-y-5">
            <h3 className="text-[17px] font-bold text-white">Notification Preferences</h3>
            {notifPerms === "unsupported" ? (
              <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5 flex items-center gap-4">
                <BellOff size={20} className="text-white/20 flex-shrink-0" />
                <p className="text-[13px] text-white/40">Your browser doesn&apos;t support notifications.</p>
              </div>
            ) : notifPerms === "denied" ? (
              <div className="bg-[#111111] border border-red-500/20 rounded-xl p-5 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <BellOff size={16} className="text-red-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white/80">Notifications blocked</p>
                  <p className="text-[11px] text-white/40 mt-1">Click the lock icon in your browser&apos;s address bar and allow notifications for this site.</p>
                </div>
              </div>
            ) : notifPerms === "default" ? (
              <div className="bg-[#111111] border border-amber-500/20 rounded-xl p-5 flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Bell size={16} className="text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-white/80">Notifications not yet enabled</p>
                  <p className="text-[11px] text-white/40 mt-0.5">Get real-time alerts for clock-ins, safety incidents, new tasks, and more.</p>
                </div>
                <button onClick={enableNotifs} disabled={notifRequesting}
                  className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black text-[12px] font-bold px-4 py-2 rounded-lg transition-colors">
                  {notifRequesting ? "Requesting…" : "Enable"}
                </button>
              </div>
            ) : (
              <div className="bg-[#111111] border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-[13px] text-green-400 font-medium">Browser notifications are active</p>
              </div>
            )}

            <div className="bg-[#111111] border border-white/[0.06] rounded-xl divide-y divide-white/[0.05]">
              {(Object.keys(CATEGORY_LABELS) as NotifCategory[]).map((cat) => {
                const { label, description } = CATEGORY_LABELS[cat];
                const on = notifPrefs[cat];
                const disabled = notifPerms !== "granted";
                return (
                  <div key={cat} className={`flex items-center justify-between gap-4 px-5 py-4 ${disabled ? "opacity-40" : ""}`}>
                    <div>
                      <p className="text-[13px] font-semibold text-white/80">{label}</p>
                      <p className="text-[11px] text-white/35 mt-0.5">{description}</p>
                    </div>
                    <button onClick={() => !disabled && toggleNotifPref(cat)} disabled={disabled} aria-label={`Toggle ${label}`}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${on ? "bg-amber-500" : "bg-white/10"} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-4" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SECURITY ── */}
        {tab === "security" && (
          <div className="space-y-5">
            <h3 className="text-[17px] font-bold text-white">Security</h3>

            {/* Change password */}
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
              <h4 className="text-[14px] font-bold text-white mb-1">Change Password</h4>
              <p className="text-[12px] text-white/40 mb-4">Must be at least 8 characters.</p>

              {pwStatus === "success" ? (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <CheckCircle2 size={15} className="text-green-400" />
                  <span className="text-[13px] text-green-300 font-semibold">Password updated successfully.</span>
                </div>
              ) : (
                <form onSubmit={handlePasswordChange} className="space-y-3 max-w-sm">
                  {[
                    { key: "current" as const, label: "Current Password" },
                    { key: "next" as const, label: "New Password" },
                    { key: "confirm" as const, label: "Confirm New Password" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className={lbl}>{label}</label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          value={pwForm[key]}
                          onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 pr-9 text-[13px] text-white outline-none focus:border-amber-500/40"
                        />
                        {key === "confirm" && (
                          <button type="button" onClick={() => setShowPw(!showPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {pwStatus === "error" && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                      <p className="text-[12px] text-red-300">{pwError}</p>
                    </div>
                  )}

                  <button type="submit" disabled={pwStatus === "loading"}
                    className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors">
                    {pwStatus === "loading" ? "Updating…" : "Update Password"}
                  </button>
                </form>
              )}
            </div>

            {/* 2FA — informational only for now */}
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
              <h4 className="text-[14px] font-bold text-white mb-1">Two-Factor Authentication</h4>
              <p className="text-[12px] text-white/40 mb-4">
                2FA is managed through Supabase Auth. Contact your account admin or visit the Supabase dashboard to enable TOTP-based 2FA for your organisation.
              </p>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg inline-flex w-fit">
                <Shield size={13} className="text-white/30" />
                <span className="text-[12px] text-white/40">Managed via Supabase Auth settings</span>
              </div>
            </div>

            {/* Danger zone */}
            <div className="bg-[#111111] border border-red-500/15 rounded-xl p-5">
              <h4 className="text-[14px] font-bold text-red-400 mb-1">Danger Zone</h4>
              {isAdminOrAbove(currentUser.role) ? (
                <p className="text-[12px] text-white/40 mb-4">
                  Deleting your account permanently deletes your entire <strong className="text-white/60">{companyName || "company"}</strong> workspace — every worker, project, and record. All crew members will lose access. You&apos;ll get an email with 7 days to cancel before it&apos;s permanent.
                </p>
              ) : (
                <p className="text-[12px] text-white/40 mb-4">
                  Permanently delete your account, profile, and personal data. You&apos;ll get an email with 7 days to cancel before it&apos;s permanent.
                </p>
              )}
              <button
                onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(""); setDeleteStatus("idle"); setDeleteError(""); }}
                className="inline-flex items-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-[12px] px-4 py-2 rounded-lg transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Delete account confirmation modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
            <div className="bg-[#1a1a1a] border border-red-500/20 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              {deleteStatus === "requested" ? (
                <>
                  <div className="w-11 h-11 rounded-full bg-green-500/15 flex items-center justify-center mb-3">
                    <CheckCircle2 size={20} className="text-green-400" />
                  </div>
                  <h3 className="text-[15px] font-bold text-white mb-2">Check your email</h3>
                  <p className="text-[13px] text-white/50 leading-relaxed">
                    We&apos;ve sent a confirmation to your email with a link to cancel if you change your mind. Deletion happens automatically in 7 days if you don&apos;t. You&apos;ll be signed out shortly.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="text-[15px] font-bold text-white leading-snug">Delete your account?</h3>
                    <button onClick={() => setShowDeleteModal(false)} className="p-0.5 text-white/25 hover:text-white/60 transition-colors flex-shrink-0 mt-0.5">
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-[13px] text-white/50 mb-4 leading-relaxed">
                    {isAdminOrAbove(currentUser.role)
                      ? <>This deletes the entire <strong className="text-red-400">{companyName || "company"}</strong> workspace — every worker, project, and record — after a 7-day grace period. All crew members lose access. This cannot be undone after 7 days.</>
                      : <>Your account and personal data will be deleted after a 7-day grace period. This cannot be undone after that.</>}
                  </p>
                  <label className="block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5">
                    Type DELETE to confirm
                  </label>
                  <input
                    autoFocus
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full bg-white/[0.04] border border-red-500/20 rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-red-500/50 mb-3"
                  />
                  {deleteStatus === "error" && (
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg mb-3">
                      <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                      <p className="text-[12px] text-red-300">{deleteError}</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white/70 font-semibold text-[13px] py-2.5 rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRequestDeletion}
                      disabled={deleteConfirmText !== "DELETE" || deleteStatus === "loading"}
                      className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-[13px] py-2.5 rounded-xl transition-colors"
                    >
                      {deleteStatus === "loading" ? "Requesting…" : "Delete Account"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── BILLING ── */}
        {tab === "access" && (
          <AccessControlTab
            workers={workers}
            currentUser={currentUser}
            permissionsPin={permissionsPin}
            setPermissionsPin={setPermissionsPin}
            updateWorker={updateWorker}
          />
        )}

      </div>

      <ConfirmModal
        open={!!kickConfirm}
        title="Remove Worker"
        body={kickConfirm ? `Remove ${kickConfirm.name} from your workspace? They will lose access immediately.` : ""}
        confirmLabel="Remove"
        danger
        onConfirm={() => { if (kickConfirm) { deleteWorker(kickConfirm.id); setKickConfirm(null); } }}
        onCancel={() => setKickConfirm(null)}
      />

      <ConfirmModal
        open={!!deleteRoleConfirm}
        title="Delete Role"
        body={deleteRoleConfirm ? `Delete "${deleteRoleConfirm}"? Workers assigned this role will keep their current label but won't be able to select it again.` : ""}
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (deleteRoleConfirm) { deleteCustomRole(deleteRoleConfirm); setDeleteRoleConfirm(null); } }}
        onCancel={() => setDeleteRoleConfirm(null)}
      />
    </div>
    </div>
  );
}

// ── Access Control Tab ────────────────────────────────────────────────────────

type ControllablePage = { href: string; label: string; group: "Core" | "Field Ops" | "Admin" | "Finance"; alwaysOn?: boolean };

const ALL_CONTROLLABLE_PAGES: ControllablePage[] = [
  { href: "/dashboard",     label: "Dashboard",      group: "Core",      alwaysOn: true },
  { href: "/time-tracking", label: "Time Tracking",  group: "Core",      alwaysOn: true },
  { href: "/safety",        label: "Safety Log",     group: "Core" },
  { href: "/messages",      label: "Messages",       group: "Core" },
  { href: "/photos",        label: "Photos",         group: "Core" },
  { href: "/schedule",      label: "Schedule",       group: "Field Ops" },
  { href: "/projects",      label: "Projects",       group: "Field Ops" },
  { href: "/tasks",         label: "Tasks",          group: "Field Ops" },
  { href: "/punch-list",    label: "Punch List",     group: "Field Ops" },
  { href: "/rfis",          label: "RFIs",           group: "Field Ops" },
  { href: "/equipment",     label: "Equipment",      group: "Field Ops" },
  { href: "/materials",     label: "Materials",      group: "Field Ops" },
  { href: "/documents",     label: "Documents",      group: "Field Ops" },
  { href: "/blueprints",    label: "Blueprints",     group: "Field Ops" },
  { href: "/daily-reports", label: "Daily Reports",  group: "Field Ops" },
  { href: "/crew",          label: "Crew",           group: "Admin" },
  { href: "/reports",       label: "Reports",        group: "Admin" },
  { href: "/estimates",     label: "Estimates",      group: "Finance" },
  { href: "/invoices",      label: "Invoices",       group: "Finance" },
  { href: "/change-orders", label: "Change Orders",  group: "Finance" },
];

const PAGE_GROUPS = ["Core", "Field Ops", "Admin", "Finance"] as const;

// Default granted pages by role (for initial toggle state)
function defaultPagesForRole(role: string): string[] {
  if (role === "Foreman") {
    return ALL_CONTROLLABLE_PAGES.filter((p) => p.group === "Core" || p.group === "Field Ops").map((p) => p.href);
  }
  // Worker gets Core only
  return ALL_CONTROLLABLE_PAGES.filter((p) => p.group === "Core").map((p) => p.href);
}

async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode("constra_pin_v1_" + pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Worker = import("@/lib/mock-data").Worker;

function AccessControlTab({
  workers, currentUser, permissionsPin, setPermissionsPin, updateWorker,
}: {
  workers: Worker[];
  currentUser: Worker;
  permissionsPin: string;
  setPermissionsPin: (h: string) => void;
  updateWorker: (id: string, u: Partial<Worker>) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftPages, setDraftPages] = useState<Record<string, string[]>>({});
  const [pinModal, setPinModal] = useState<{ workerId: string; action: "save" | "reset" } | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinVerifying, setPinVerifying] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  // PIN setup state
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinSetupError, setPinSetupError] = useState("");
  const [pinSetupSuccess, setPinSetupSuccess] = useState(false);

  const controllableWorkers = workers.filter(
    (w) => w.id !== currentUser.id && w.role !== "Admin" && w.role !== "Project Manager"
  );

  const getDraft = (worker: Worker) => {
    if (draftPages[worker.id] !== undefined) return draftPages[worker.id];
    return worker.grantedPages ?? defaultPagesForRole(worker.role);
  };

  const togglePage = (workerId: string, href: string, currentDraft: string[]) => {
    const page = ALL_CONTROLLABLE_PAGES.find((p) => p.href === href);
    if (page?.alwaysOn) return;
    const next = currentDraft.includes(href)
      ? currentDraft.filter((p) => p !== href)
      : [...currentDraft, href];
    setDraftPages((d) => ({ ...d, [workerId]: next }));
  };

  const handleSaveClick = (workerId: string) => {
    if (!permissionsPin) { setPinModal({ workerId, action: "save" }); return; }
    setPinModal({ workerId, action: "save" });
    setPinInput("");
    setPinError("");
  };

  const handleResetClick = (workerId: string) => {
    if (!permissionsPin) { setPinModal({ workerId, action: "reset" }); return; }
    setPinModal({ workerId, action: "reset" });
    setPinInput("");
    setPinError("");
  };

  const verifyAndApply = async () => {
    if (!pinModal) return;
    if (!permissionsPin) {
      setPinError("Set a Permissions PIN first using the button above.");
      return;
    }
    setPinVerifying(true);
    const hashed = await hashPin(pinInput);
    if (hashed !== permissionsPin) {
      setPinError("Incorrect PIN. Please try again.");
      setPinVerifying(false);
      return;
    }
    // PIN verified
    const { workerId, action } = pinModal;
    if (action === "save") {
      updateWorker(workerId, { grantedPages: getDraft(workers.find((w) => w.id === workerId)!) });
    } else {
      updateWorker(workerId, { grantedPages: undefined });
      setDraftPages((d) => { const n = { ...d }; delete n[workerId]; return n; });
    }
    setSuccessId(workerId);
    setTimeout(() => setSuccessId(null), 2500);
    setPinModal(null);
    setPinInput("");
    setPinVerifying(false);
  };

  const savePin = async () => {
    setPinSetupError("");
    if (newPin.length < 4) { setPinSetupError("PIN must be at least 4 digits."); return; }
    if (!/^\d+$/.test(newPin)) { setPinSetupError("PIN must be digits only."); return; }
    if (newPin !== confirmPin) { setPinSetupError("PINs don't match."); return; }
    const hashed = await hashPin(newPin);
    setPermissionsPin(hashed);
    setNewPin(""); setConfirmPin(""); setPinSetupSuccess(true);
    setTimeout(() => { setPinSetupSuccess(false); setShowPinSetup(false); }, 2000);
  };

  const inpCls = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-amber-500/40 transition-colors placeholder:text-white/25";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[17px] font-bold text-white">Access Control</h3>
        <p className="text-[12px] text-white/35 mt-0.5">Choose exactly which pages each worker can see. Changes require your Permissions PIN.</p>
      </div>

      {/* Permissions PIN section */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-bold text-white">Permissions PIN</p>
            <p className="text-[11px] text-white/40 mt-0.5">Required to apply any access changes</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {permissionsPin
              ? <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-lg"><Check size={11} /> PIN Set</span>
              : <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg"><AlertCircle size={11} /> No PIN</span>
            }
            <button
              onClick={() => setShowPinSetup((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] font-bold bg-white/[0.06] hover:bg-white/[0.10] active:bg-white/[0.14] border border-white/[0.08] text-white/60 hover:text-white px-3 py-2 rounded-lg transition-all"
            >
              <Key size={13} />
              {permissionsPin ? "Change PIN" : "Set PIN"}
              <ChevronDown size={11} className={`transition-transform ${showPinSetup ? "rotate-180" : ""}`} />
            </button>
          </div>
        </div>

        {showPinSetup && (
          <div className="border-t border-white/[0.06] pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wide block mb-1.5">New PIN (digits only)</label>
                <input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="••••" className={inpCls} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wide block mb-1.5">Confirm PIN</label>
                <input type="password" inputMode="numeric" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="••••" className={inpCls} onKeyDown={(e) => e.key === "Enter" && savePin()} />
              </div>
            </div>
            {pinSetupError && <p className="text-[12px] text-red-400">{pinSetupError}</p>}
            {pinSetupSuccess && <p className="text-[12px] text-green-400 font-semibold flex items-center gap-1.5"><Check size={12} /> PIN saved!</p>}
            <button onClick={savePin} className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors">
              Save PIN
            </button>
          </div>
        )}
      </div>

      {/* Worker list */}
      {controllableWorkers.length === 0 ? (
        <div className="text-center py-12 text-white/25 space-y-2">
          <Users size={32} className="mx-auto opacity-30" />
          <p className="text-[13px]">No workers or foremen yet</p>
          <p className="text-[11px]">Add crew members to manage their page access</p>
        </div>
      ) : (
        <div className="space-y-3">
          {controllableWorkers.map((worker) => {
            const draft = getDraft(worker);
            const isExpanded = expandedId === worker.id;
            const hasCustom = worker.grantedPages !== undefined;
            const isSuccess = successId === worker.id;

            return (
              <div key={worker.id} className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden">
                {/* Worker row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : worker.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-[12px] font-bold"
                    style={{ backgroundColor: worker.color + "22", color: worker.color }}>
                    {worker.photo ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" /> : worker.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-white">{worker.name}</p>
                    <p className="text-[11px] text-white/40">{worker.customRole || worker.role}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isSuccess && <span className="text-[11px] text-green-400 font-semibold flex items-center gap-1"><CheckCircle2 size={11} /> Saved</span>}
                    {hasCustom
                      ? <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Custom Access</span>
                      : <span className="text-[10px] font-bold text-white/30 bg-white/[0.05] px-2 py-0.5 rounded-full">Role Default</span>
                    }
                    <ChevronDown size={14} className={`text-white/30 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {/* Expanded permission editor */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] p-4 space-y-4">
                    {PAGE_GROUPS.map((group) => {
                      const pages = ALL_CONTROLLABLE_PAGES.filter((p) => p.group === group);
                      return (
                        <div key={group}>
                          <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2">{group}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {pages.map((page) => {
                              const on = draft.includes(page.href);
                              const locked = page.alwaysOn;
                              return (
                                <button
                                  key={page.href}
                                  onClick={() => togglePage(worker.id, page.href, draft)}
                                  disabled={locked}
                                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-[12px] font-semibold transition-all text-left ${
                                    on
                                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                                      : "bg-white/[0.03] border-white/[0.06] text-white/35"
                                  } ${locked ? "opacity-60 cursor-not-allowed" : "hover:border-white/10 active:scale-[0.97]"}`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${on ? "bg-amber-500 border-amber-500" : "border-white/20"}`}>
                                    {on && <Check size={9} className="text-black font-black" />}
                                  </div>
                                  {page.label}
                                  {locked && <Lock size={9} className="ml-auto text-white/20" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                      <button
                        onClick={() => handleSaveClick(worker.id)}
                        className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-[13px] px-5 py-2.5 rounded-lg transition-colors"
                      >
                        Save Access
                      </button>
                      {hasCustom && (
                        <button
                          onClick={() => handleResetClick(worker.id)}
                          className="text-[12px] text-white/35 hover:text-white/60 active:text-white/80 transition-colors"
                        >
                          Reset to role defaults
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PIN verification modal */}
      {pinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="bg-[#161616] border border-white/[0.10] rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="h-1 bg-amber-500 rounded-t-2xl" />
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={18} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-white">Confirm Permission Change</h3>
                  <p className="text-[11px] text-white/40 mt-0.5">
                    {pinModal.action === "save" ? "Applying new access for" : "Resetting to role defaults for"}{" "}
                    <span className="text-white/70 font-semibold">{workers.find((w) => w.id === pinModal.workerId)?.name}</span>
                  </p>
                </div>
              </div>

              {!permissionsPin ? (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-[12px] text-amber-300">
                  Set a Permissions PIN first using the button above before applying access changes.
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-white/35 uppercase tracking-wide block mb-2">Enter Permissions PIN</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      value={pinInput}
                      onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 8)); setPinError(""); }}
                      onKeyDown={(e) => e.key === "Enter" && verifyAndApply()}
                      placeholder="••••"
                      autoFocus
                      className="w-full bg-[#0d0d0d] border border-white/[0.10] rounded-xl px-4 py-3 text-[20px] tracking-[0.3em] text-white text-center outline-none focus:border-amber-500/50 transition-colors placeholder:text-white/20 placeholder:tracking-normal placeholder:text-[14px]"
                    />
                    {pinError && <p className="text-[12px] text-red-400 mt-2">{pinError}</p>}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { setPinModal(null); setPinInput(""); setPinError(""); }}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 active:bg-white/10 transition-colors">
                      Cancel
                    </button>
                    <button onClick={verifyAndApply} disabled={pinVerifying || !pinInput}
                      className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 transition-colors">
                      {pinVerifying ? "Verifying…" : "Verify & Save"}
                    </button>
                  </div>
                </>
              )}

              {!permissionsPin && (
                <button onClick={() => setPinModal(null)} className="w-full py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
