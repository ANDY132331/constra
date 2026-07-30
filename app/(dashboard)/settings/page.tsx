"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, Building2, Bell, BellOff, Shield, HardHat, Lock, CreditCard,
  Plus, Edit2, Trash2, Copy, CheckCircle2, Key, X, Check,
  Crown, Globe, Briefcase, DollarSign, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { LOCALE_LABELS, type Locale } from "@/lib/i18n/locales";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";
import {
  loadPrefs, savePrefs, getPermission, requestPermission,
  CATEGORY_LABELS, type NotifPrefs, type NotifCategory,
} from "@/lib/notifications";
import { getClient, SUPABASE_ENABLED } from "@/lib/supabase/client";
import { ConfirmModal } from "@/components/confirm-modal";

type Tab = "company" | "preferences" | "workers" | "roles" | "notifications" | "security" | "billing";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "company",       label: "Company",        icon: Building2 },
  { id: "preferences",   label: "Preferences",    icon: Globe },
  { id: "workers",       label: "Workers",         icon: Users },
  { id: "roles",         label: "Custom Roles",    icon: HardHat },
  { id: "notifications", label: "Notifications",   icon: Bell },
  { id: "security",      label: "Security",        icon: Shield },
  { id: "billing",       label: "Billing",         icon: CreditCard },
];

const INDUSTRIES = [
  "Construction", "Civil / Utilities", "Landscaping", "HVAC", "Plumbing", "Electrical",
  "Roofing", "Painting", "Concrete", "Framing", "Drywall",
  "Flooring", "Masonry", "Steel / Structural", "Siding",
  "Windows & Doors", "Insulation", "Excavation", "General Contracting",
  "Maintenance", "Other",
];

const ROLE_COLORS: Record<string, string> = {
  Admin: "#f97316", "Project Manager": "#8b5cf6",
  Foreman: "#3b82f6", Worker: "#22c55e",
};

const inp = "w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-[13px] text-white outline-none focus:border-amber-500/40 transition-colors placeholder:text-white/20";
const lbl = "text-[11px] font-semibold text-white/40 uppercase tracking-wide block mb-1.5";

export default function SettingsPage() {
  const {
    workers, currentUser, companyName, setCompanyName, deleteWorker,
    isPro, language, setLanguage, currency, setCurrency, industry, setIndustry,
    customRoles, addCustomRole, deleteCustomRole,
    companyAddress, businessNumber, inviteCode,
    setCompanyAddress, setBusinessNumber,
    companyLogo, setCompanyLogo,
    companyId,
  } = useStore();

  const [tab, setTab] = useState<Tab>("company");
  const [codeCopied, setCodeCopied] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: companyName,
    businessNumber: businessNumber,
    address: companyAddress,
  });

  // Sync form when store loads data
  useEffect(() => {
    setCompanyForm({ name: companyName, businessNumber, address: companyAddress });
  }, [companyName, businessNumber, companyAddress]);

  // ── Roles ─────────────────────────────────────────────────────────────────────
  const [newRole, setNewRole] = useState("");
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editRoleValue, setEditRoleValue] = useState("");

  // ── Notifications ─────────────────────────────────────────────────────────────
  const [notifPerms, setNotifPerms] = useState<NotificationPermission | "unsupported">("default");
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(() => loadPrefs());
  const [notifRequesting, setNotifRequesting] = useState(false);
  useEffect(() => { setNotifPerms(getPermission()); }, []);

  // ── Security ──────────────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwStatus, setPwStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pwError, setPwError] = useState("");

  // ── Invite code ───────────────────────────────────────────────────────────────
  const [displayCode, setDisplayCode] = useState(inviteCode || "CN-XXXX-XXXX");
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState("");
  useEffect(() => { if (inviteCode) setDisplayCode(inviteCode); }, [inviteCode]);

  // ── Confirmation dialogs ──────────────────────────────────────────────────────
  const [kickConfirm, setKickConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteRoleConfirm, setDeleteRoleConfirm] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const saveCompany = () => {
    setCompanyName(companyForm.name);
    setCompanyAddress(companyForm.address);
    setBusinessNumber(companyForm.businessNumber);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(displayCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
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
    } catch (err) {
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
    <div className="flex flex-col sm:flex-row gap-6 max-w-[1100px]">
      {/* Sidebar tabs — horizontal scroll on mobile */}
      <div className="w-full sm:w-48 flex-shrink-0">
        <div className="flex sm:flex-col gap-1 overflow-x-auto pb-1 sm:pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-shrink-0 sm:w-full flex items-center gap-2 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-lg text-[12px] sm:text-[13px] font-medium transition-colors text-left whitespace-nowrap ${tab === id ? "bg-amber-500/12 text-amber-400" : "text-white/45 hover:text-white/70 hover:bg-white/5"}`}>
              <Icon size={14} className={tab === id ? "text-amber-400" : "text-white/30"} />
              {label}
              {id === "billing" && isPro && <Crown size={11} className="ml-auto text-amber-400" />}
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
                    <label className="cursor-pointer inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-white/70 text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors">
                      Upload Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const result = ev.target?.result as string;
                            if (result) setCompanyLogo(result);
                          };
                          reader.readAsDataURL(file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {companyLogo && (
                      <button onClick={() => setCompanyLogo("")} className="text-[11px] text-white/30 hover:text-red-400 transition-colors text-left">
                        Remove logo
                      </button>
                    )}
                    <p className="text-[10px] text-white/25">PNG or SVG recommended · Used on invoices & PDFs</p>
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
                  {codeCopied ? "Copied!" : "Copy"}
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
              <p className="text-[12px] text-white/40 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
              <a
                href="mailto:prableensandhu19@gmail.com?subject=Account Deletion Request"
                className="inline-flex items-center bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold text-[12px] px-4 py-2 rounded-lg transition-colors">
                Request Account Deletion
              </a>
            </div>
          </div>
        )}

        {/* ── BILLING ── */}
        {tab === "billing" && (
          <BillingTab isPro={isPro} />
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
  );
}

// ── Billing Tab ───────────────────────────────────────────────────────────────
function BillingTab({ isPro: _isPro }: { isPro: boolean }) {
  const ALL_FEATURES = [
    "Unlimited projects & crew",
    "Invoices & estimates (PDF export)",
    "Payroll reports & exports",
    "Equipment management",
    "RFIs & punch lists",
    "Document vault",
    "Time tracking & GPS clock-in",
    "Scheduling & safety logs",
    "Crew messaging (real-time)",
    "AI Daily Brief",
    "Materials tracker",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[17px] font-bold text-white">Billing & Plan</h3>
        <p className="text-[12px] text-white/35 mt-0.5">Your current plan and features</p>
      </div>

      {/* Free launch banner */}
      <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/[0.03] border border-amber-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Crown size={18} className="text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-[15px] font-bold text-white">Everything is free — for now</p>
              <span className="text-[9px] font-black bg-amber-500 text-black px-2 py-0.5 rounded-full">LAUNCH PERIOD</span>
            </div>
            <p className="text-[12px] text-white/50 leading-relaxed">
              We&apos;re in early access. All features are unlocked at no cost while we grow.
              Pricing will be introduced later — and early users will get a discount.
            </p>
          </div>
        </div>
      </div>

      {/* What's included */}
      <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
        <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-4">Everything included, no limits</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ALL_FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2.5 text-[12px] text-white/65">
              <div className="w-4 h-4 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                <Check size={9} className="text-amber-400" />
              </div>
              {f}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-4 py-3">
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
        <p className="text-[12px] text-white/40">
          No credit card required · No trial expiry · Full access until pricing is announced
        </p>
      </div>
    </div>
  );
}
