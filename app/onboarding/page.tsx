"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HardHat, Globe, Check, ArrowRight, ChevronLeft,
  Search, Building2, Users, Key, Briefcase, Eye, EyeOff, Loader2,
} from "lucide-react";
import { getClient, SUPABASE_ENABLED } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";
import type { CurrencyCode } from "@/lib/currency";

// ─── Data ─────────────────────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "US", name: "United States",   currency: "USD", flag: "🇺🇸" },
  { code: "CA", name: "Canada",          currency: "CAD", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom",  currency: "GBP", flag: "🇬🇧" },
  { code: "AU", name: "Australia",       currency: "AUD", flag: "🇦🇺" },
  { code: "NZ", name: "New Zealand",     currency: "NZD", flag: "🇳🇿" },
  { code: "DE", name: "Germany",         currency: "EUR", flag: "🇩🇪" },
  { code: "FR", name: "France",          currency: "EUR", flag: "🇫🇷" },
  { code: "ES", name: "Spain",           currency: "EUR", flag: "🇪🇸" },
  { code: "IT", name: "Italy",           currency: "EUR", flag: "🇮🇹" },
  { code: "NL", name: "Netherlands",     currency: "EUR", flag: "🇳🇱" },
  { code: "PL", name: "Poland",          currency: "PLN", flag: "🇵🇱" },
  { code: "IN", name: "India",           currency: "INR", flag: "🇮🇳" },
  { code: "AE", name: "UAE",             currency: "AED", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia",    currency: "SAR", flag: "🇸🇦" },
  { code: "ZA", name: "South Africa",    currency: "ZAR", flag: "🇿🇦" },
  { code: "BR", name: "Brazil",          currency: "BRL", flag: "🇧🇷" },
  { code: "MX", name: "Mexico",          currency: "MXN", flag: "🇲🇽" },
  { code: "SG", name: "Singapore",       currency: "SGD", flag: "🇸🇬" },
  { code: "JP", name: "Japan",           currency: "JPY", flag: "🇯🇵" },
  { code: "KR", name: "South Korea",     currency: "KRW", flag: "🇰🇷" },
  { code: "CN", name: "China",           currency: "CNY", flag: "🇨🇳" },
  { code: "HK", name: "Hong Kong",       currency: "HKD", flag: "🇭🇰" },
  { code: "TW", name: "Taiwan",          currency: "TWD", flag: "🇹🇼" },
  { code: "NG", name: "Nigeria",         currency: "NGN", flag: "🇳🇬" },
  { code: "KE", name: "Kenya",           currency: "KES", flag: "🇰🇪" },
  { code: "CH", name: "Switzerland",     currency: "CHF", flag: "🇨🇭" },
  { code: "SE", name: "Sweden",          currency: "SEK", flag: "🇸🇪" },
  { code: "NO", name: "Norway",          currency: "NOK", flag: "🇳🇴" },
  { code: "TR", name: "Turkey",          currency: "TRY", flag: "🇹🇷" },
  { code: "PH", name: "Philippines",     currency: "PHP", flag: "🇵🇭" },
  { code: "MY", name: "Malaysia",        currency: "MYR", flag: "🇲🇾" },
  { code: "ID", name: "Indonesia",       currency: "IDR", flag: "🇮🇩" },
  { code: "TH", name: "Thailand",        currency: "THB", flag: "🇹🇭" },
];

const INDUSTRIES = [
  "General Contracting", "Civil / Utilities", "Electrical", "Plumbing", "HVAC",
  "Roofing", "Concrete", "Masonry", "Steel / Structural", "Framing", "Drywall",
  "Flooring", "Painting", "Excavation", "Landscaping", "Insulation",
  "Demolition", "Waterproofing", "Solar / Renewables", "Fire Protection",
  "Glazing / Windows", "Maintenance", "Security", "Manufacturing", "Warehousing",
  "Logistics / Delivery", "Other",
];

const SIZES = [
  { label: "Solo / Owner", sub: "Just me" },
  { label: "Small",        sub: "2–10 workers" },
  { label: "Medium",       sub: "11–50 workers" },
  { label: "Large",        sub: "50+ workers" },
];

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp = "w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/40 rounded-lg px-3.5 py-3 text-[13px] text-white placeholder:text-white/20 outline-none transition-colors";
const lbl = "text-[11px] font-bold text-white/35 uppercase tracking-wide block mb-1.5";

// ─── Main component ───────────────────────────────────────────────────────────

type Mode = "choose" | "create" | "join";

export default function OnboardingPage() {
  const router = useRouter();
  const { setCompanyName, setCurrency, setIndustry, setOnboarded, updateWorker, workers } = useStore();

  const [mode, setMode] = useState<Mode>("choose");
  const [step, setStep] = useState(1);

  // Country / location
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<(typeof COUNTRIES)[0] | null>(null);

  // Company
  const [company, setCompany] = useState("");
  const [size, setSize] = useState("");
  const [industry, setIndustryVal] = useState("Construction");
  const [industrySearch, setIndustrySearch] = useState("");

  // Profile
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // Join flow
  const [inviteCode, setInviteCode] = useState("");
  const [joinFirstName, setJoinFirstName] = useState("");
  const [joinLastName, setJoinLastName] = useState("");
  const [joinEmail, setJoinEmail] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [showJoinPw, setShowJoinPw] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.currency.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const filteredIndustries = INDUSTRIES.filter((i) =>
    i.toLowerCase().includes(industrySearch.toLowerCase()),
  );

  // Demo / no-Supabase finish
  function finishLocally() {
    if (company) setCompanyName(company);
    if (selectedCountry) setCurrency(selectedCountry.currency as CurrencyCode);
    setIndustry(industry);
    if (firstName && workers[0]) {
      const full = [firstName, lastName].filter(Boolean).join(" ");
      updateWorker(workers[0].id, {
        name: full,
        initials: [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase(),
        email,
      });
    }
    setOnboarded(true);
    router.push("/dashboard");
  }

  async function handleCreate() {
    if (!firstName || !email || !password) {
      setError("First name, email, and password are required.");
      return;
    }
    setError(""); setLoading(true);

    if (!SUPABASE_ENABLED) {
      finishLocally();
      return;
    }

    const res = await fetch("/api/create-company", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        companyName: company,
        currency: selectedCountry?.currency ?? "USD",
        language: "en",
        industry,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Failed to create account.");
      return;
    }

    // Sign in immediately after account creation
    const supabase = getClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInErr) { setError(signInErr.message); return; }

    router.push("/dashboard");
  }

  async function handleJoin() {
    if (!inviteCode.trim()) { setError("Please enter an invite code."); return; }
    if (!joinFirstName || !joinEmail || !joinPassword) {
      setError("Name, email, and password are required.");
      return;
    }
    setError(""); setLoading(true);

    if (!SUPABASE_ENABLED) {
      setOnboarded(true);
      router.push("/dashboard");
      return;
    }

    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inviteCode: inviteCode.trim().toUpperCase(),
        email: joinEmail,
        password: joinPassword,
        firstName: joinFirstName,
        lastName: joinLastName,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Failed to join workspace.");
      return;
    }

    const supabase = getClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: joinEmail,
      password: joinPassword,
    });
    setLoading(false);
    if (signInErr) { setError(signInErr.message); return; }

    router.push("/dashboard");
  }

  // ── Step indicator ──
  const Dot = ({ n }: { n: number }) => (
    <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-[11px] font-bold transition-colors ${
      step >= n ? (step > n ? "bg-green-500 text-black" : "bg-amber-500 text-black") : "bg-white/10 text-white/25"
    }`}>
      {step > n ? <Check size={11} /> : n}
    </span>
  );

  // ── Choose mode ──────────────────────────────────────────────────────────────
  if (mode === "choose") {
    return (
      <Shell>
        <div className="space-y-5">
          <div className="text-center">
            <h2 className="text-[20px] font-bold text-white mb-1">How would you like to start?</h2>
            <p className="text-[13px] text-white/40">Set up your workspace in under a minute.</p>
          </div>

          <button
            onClick={() => setMode("create")}
            className="w-full text-left p-5 rounded-2xl border border-white/[0.08] hover:border-amber-500/30 hover:bg-amber-500/[0.04] transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <Building2 size={20} className="text-amber-400" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-white mb-0.5">Create a Team</p>
                <p className="text-[12px] text-white/40">Set up a new workspace for your company. You&apos;ll be the owner and admin.</p>
              </div>
              <ArrowRight size={16} className="text-white/20 mt-1 flex-shrink-0 group-hover:text-amber-400 transition-colors" />
            </div>
          </button>

          <button
            onClick={() => setMode("join")}
            className="w-full text-left p-5 rounded-2xl border border-white/[0.08] hover:border-white/15 hover:bg-white/[0.02] transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Users size={20} className="text-white/50" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-white mb-0.5">Join a Team</p>
                <p className="text-[12px] text-white/40">Have an invite code? Join your team&apos;s existing workspace.</p>
              </div>
              <ArrowRight size={16} className="text-white/20 mt-1 flex-shrink-0 group-hover:text-white/50 transition-colors" />
            </div>
          </button>
        </div>
      </Shell>
    );
  }

  // ── Join flow ─────────────────────────────────────────────────────────────────
  if (mode === "join") {
    return (
      <Shell>
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <button onClick={() => { setMode("choose"); setError(""); }} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
              <ChevronLeft size={16} />
            </button>
            <div>
              <h2 className="text-[18px] font-bold text-white">Join a Team</h2>
              <p className="text-[12px] text-white/40">Enter the invite code from your admin.</p>
            </div>
          </div>

          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-[12px] text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className={lbl}>Invite Code</label>
            <input
              className={`${inp} font-mono tracking-widest text-center text-amber-400 placeholder:font-sans placeholder:tracking-normal placeholder:text-white/20`}
              placeholder="CN-XXXX-XXXX"
              value={inviteCode}
              onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setError(""); }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>First Name *</label>
              <input className={inp} placeholder="Jane" value={joinFirstName} onChange={(e) => setJoinFirstName(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Last Name</label>
              <input className={inp} placeholder="Smith" value={joinLastName} onChange={(e) => setJoinLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>Work Email *</label>
            <input type="email" className={inp} placeholder="you@company.com" value={joinEmail} onChange={(e) => setJoinEmail(e.target.value)} />
          </div>

          <div>
            <label className={lbl}>Password *</label>
            <div className="relative">
              <input
                type={showJoinPw ? "text" : "password"}
                className={`${inp} pr-10`}
                placeholder="At least 8 characters"
                value={joinPassword}
                onChange={(e) => setJoinPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowJoinPw(!showJoinPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showJoinPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {joinPassword.length > 0 && (() => {
              const score = [joinPassword.length >= 8, /[0-9]/.test(joinPassword), /[^a-zA-Z0-9]/.test(joinPassword), joinPassword.length >= 12].filter(Boolean).length;
              const levels = [
                { label: "Too short", color: "#ef4444", bars: 1 },
                { label: "Weak", color: "#f97316", bars: 1 },
                { label: "Fair", color: "#f59e0b", bars: 2 },
                { label: "Good", color: "#22c55e", bars: 3 },
                { label: "Strong", color: "#10b981", bars: 4 },
              ];
              const lvl = levels[Math.min(score, 4)];
              return (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ backgroundColor: i <= lvl.bars ? lvl.color : "rgba(255,255,255,0.08)" }} />
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold" style={{ color: lvl.color }}>{lvl.label}</p>
                </div>
              );
            })()}
          </div>

          <button
            onClick={handleJoin}
            disabled={loading || !inviteCode.trim()}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {loading ? "Joining…" : "Join Workspace"}
          </button>
        </div>
      </Shell>
    );
  }

  // ── Create flow ───────────────────────────────────────────────────────────────
  return (
    <Shell>
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3].map((n, i) => (
          <div key={n} className="flex items-center gap-2">
            <Dot n={n} />
            <span className={`text-[11px] font-semibold ${step === n ? "text-amber-400" : step > n ? "text-green-400" : "text-white/25"}`}>
              {["Location", "Company", "Account"][i]}
            </span>
            {i < 2 && <div className={`w-8 h-px ${step > n ? "bg-green-500/40" : "bg-white/10"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 — Country */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setMode("choose")} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all">
              <ChevronLeft size={16} />
            </button>
            <div>
              <h2 className="text-[18px] font-bold text-white">Where are you based?</h2>
              <p className="text-[12px] text-white/40">Sets your default currency and date format.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2">
            <Search size={13} className="text-white/30" />
            <input
              className="bg-transparent text-[13px] text-white placeholder:text-white/20 outline-none flex-1"
              placeholder="Search countries…"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
            {filteredCountries.map((c) => (
              <button key={c.code} onClick={() => setSelectedCountry(c)}
                className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                  selectedCountry?.code === c.code
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-white/[0.06] hover:border-white/12 hover:bg-white/[0.03]"
                }`}
              >
                <span className="text-lg">{c.flag}</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-white/80 truncate">{c.name}</p>
                  <p className="text-[10px] text-white/35">{c.currency}</p>
                </div>
                {selectedCountry?.code === c.code && <Check size={12} className="text-amber-400 ml-auto flex-shrink-0" />}
              </button>
            ))}
          </div>

          <button onClick={() => selectedCountry && setStep(2)} disabled={!selectedCountry}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
            Continue <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2 — Company */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[18px] font-bold text-white mb-1">Set up your company</h2>
            <p className="text-[12px] text-white/40">{selectedCountry?.flag} {selectedCountry?.name} · {selectedCountry?.currency}</p>
          </div>

          <div>
            <label className={lbl}>Company Name *</label>
            <input className={inp} placeholder="Acme Services Ltd." value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>

          <div>
            <label className={lbl}>Industry</label>
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 mb-2">
              <Briefcase size={13} className="text-white/30" />
              <input
                className="bg-transparent text-[12px] text-white placeholder:text-white/20 outline-none flex-1"
                placeholder="Search industries…"
                value={industrySearch}
                onChange={(e) => setIndustrySearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
              {filteredIndustries.map((ind) => (
                <button key={ind} onClick={() => setIndustryVal(ind)}
                  className={`px-3 py-2 rounded-lg border text-left text-[12px] transition-all ${
                    industry === ind
                      ? "border-amber-500/50 bg-amber-500/10 text-amber-300 font-semibold"
                      : "border-white/[0.06] text-white/50 hover:border-white/12 hover:text-white/70"
                  }`}>
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={lbl}>Company Size</label>
            <div className="grid grid-cols-2 gap-2">
              {SIZES.map((s) => (
                <button key={s.label} onClick={() => setSize(s.label)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    size === s.label ? "border-amber-500/50 bg-amber-500/10" : "border-white/[0.06] hover:border-white/12"
                  }`}>
                  <p className="text-[12px] font-bold text-white/80">{s.label}</p>
                  <p className="text-[10px] text-white/35">{s.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-[13px] font-semibold text-white/40 hover:text-white/60 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors">
              <ChevronLeft size={15} /> Back
            </button>
            <button onClick={() => company && setStep(3)} disabled={!company}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              Continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Account */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-[18px] font-bold text-white mb-1">Create your account</h2>
            <p className="text-[12px] text-white/40">You&apos;ll be the Admin for {company}.</p>
          </div>

          {error && (
            <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-[12px] text-red-400">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>First Name *</label>
              <input className={inp} placeholder="Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Last Name</label>
              <input className={inp} placeholder="Smith" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>Work Email *</label>
            <input type="email" className={inp} placeholder="jane@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div>
            <label className={lbl}>Password *</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                className={`${inp} pr-10`}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {password.length > 0 && (() => {
              const score = [password.length >= 8, /[0-9]/.test(password), /[^a-zA-Z0-9]/.test(password), password.length >= 12].filter(Boolean).length;
              const levels = [
                { label: "Too short", color: "#ef4444", bars: 1 },
                { label: "Weak", color: "#f97316", bars: 1 },
                { label: "Fair", color: "#f59e0b", bars: 2 },
                { label: "Good", color: "#22c55e", bars: 3 },
                { label: "Strong", color: "#10b981", bars: 4 },
              ];
              const lvl = levels[Math.min(score, 4)];
              return (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all" style={{ backgroundColor: i <= lvl.bars ? lvl.color : "rgba(255,255,255,0.08)" }} />
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold" style={{ color: lvl.color }}>{lvl.label}</p>
                </div>
              );
            })()}
          </div>

          <p className="text-[10px] text-white/25 leading-relaxed">
            By creating an account you agree to the{" "}
            <Link href="/terms" target="_blank" className="text-amber-400/70 hover:text-amber-400 underline underline-offset-2">Terms of Service</Link> and{" "}
            <Link href="/privacy" target="_blank" className="text-amber-400/70 hover:text-amber-400 underline underline-offset-2">Privacy Policy</Link>.
          </p>

          <div className="flex gap-3">
            <button onClick={() => { setStep(2); setError(""); }} disabled={loading} className="flex items-center gap-1.5 text-[13px] font-semibold text-white/40 hover:text-white/60 disabled:opacity-30 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors">
              <ChevronLeft size={15} /> Back
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !firstName || !email || !password}
              className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {loading ? "Creating…" : "Create Account"}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

// ─── Shell wrapper ─────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col lg:flex-row">

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden bg-[#0a0800]">
        {/* Blueprint grid */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(245,158,11,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.6) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        {/* Amber glow */}
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-amber-600/5 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <HardHat size={22} className="text-black" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">Constra</span>
          </div>

          {/* Main copy */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-end gap-3 mb-10 opacity-20">
              <div className="w-2 bg-amber-500 rounded-t" style={{height:40}} />
              <div className="w-2 bg-amber-500 rounded-t" style={{height:72}} />
              <div className="w-2 bg-amber-500 rounded-t" style={{height:56}} />
              <div className="w-1 bg-amber-400 rounded-t" style={{height:32}} />
              <div className="w-3 bg-amber-500 rounded-t" style={{height:96}} />
              <div className="w-2 bg-amber-500 rounded-t" style={{height:64}} />
              <div className="w-2 bg-amber-500 rounded-t" style={{height:48}} />
              <div className="w-1 bg-amber-400 rounded-t" style={{height:80}} />
              <div className="w-2 bg-amber-500 rounded-t" style={{height:56}} />
              <div className="w-3 bg-amber-500 rounded-t" style={{height:112}} />
              <div className="w-2 bg-amber-500 rounded-t" style={{height:72}} />
              <div className="w-1 bg-amber-400 rounded-t" style={{height:40}} />
            </div>

            <h2 className="text-[38px] font-black text-white leading-[1.05] tracking-tight mb-4">
              3 steps to running<br />
              your job site<br />
              <span className="text-amber-400">the right way.</span>
            </h2>
            <p className="text-white/40 text-[15px] leading-relaxed max-w-xs mb-10">
              Set up your company, add your crew, and you&apos;re live. No training, no IT, no onboarding calls.
            </p>

            {/* Setup steps */}
            <div className="space-y-5">
              {[
                { n: "01", title: "Pick your location & industry", sub: "Sets your currency and relevant defaults" },
                { n: "02", title: "Name your company", sub: "Create your workspace in seconds" },
                { n: "03", title: "Create your account", sub: "You're the admin — invite crew after" },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-black text-amber-400">{s.n}</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white/80">{s.title}</p>
                    <p className="text-[11px] text-white/35">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom */}
          <div className="flex items-center gap-2 pt-6 border-t border-white/[0.06]">
            <Key size={12} className="text-white/20" />
            <p className="text-[11px] text-white/25">Your data is encrypted and never shared with third parties.</p>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 lg:max-w-[480px] overflow-y-auto">
        {/* Mobile background */}
        <div className="absolute inset-0 lg:hidden opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(245,158,11,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,1) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

        <div className="min-h-full flex items-center justify-center p-6 relative">
          <div className="w-full max-w-md">
            {/* Logo (mobile only) */}
            <div className="flex items-center gap-3 mb-8 justify-center lg:hidden">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <HardHat size={22} className="text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Constra</h1>
                <p className="text-[10px] text-white/30 tracking-widest uppercase">Field Workforce Management</p>
              </div>
            </div>

            <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6 md:p-7">
              {children}
            </div>
            <p className="text-center text-[10px] text-white/15 mt-5 flex items-center justify-center gap-1.5">
              <Globe size={10} />
              Already have an account?{" "}
              <Link href="/login" className="text-amber-400/60 hover:text-amber-400 ml-0.5">Sign in</Link>
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
