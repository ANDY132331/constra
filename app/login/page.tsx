"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  HardHat, Eye, EyeOff, ArrowRight, Globe, Loader2,
  WifiOff, MapPin, Zap, Mail, ArrowLeft, ShieldCheck, Lock,
} from "lucide-react";
import Link from "next/link";
import { getClient, SUPABASE_ENABLED } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";

const inp = "w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/40 rounded-lg px-3.5 py-3 text-[13px] text-white placeholder:text-white/20 outline-none transition-colors";
const lbl = "text-[11px] font-bold text-white/35 uppercase tracking-wide block mb-1.5";

// ── Password strength ─────────────────────────────────────────────────────────
function passwordScore(pw: string) {
  return [pw.length >= 8, /[0-9]/.test(pw), /[^a-zA-Z0-9]/.test(pw), pw.length >= 12].filter(Boolean).length;
}
const PW_LEVELS = [
  { label: "Too short", color: "#ef4444", bars: 1 },
  { label: "Weak",      color: "#f59e0b", bars: 1 },
  { label: "Fair",      color: "#f59e0b", bars: 2 },
  { label: "Good",      color: "#22c55e", bars: 3 },
  { label: "Strong",    color: "#10b981", bars: 4 },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password.length) return null;
  const score = passwordScore(password);
  const lvl = PW_LEVELS[Math.min(score, 4)];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= lvl.bars ? lvl.color : "rgba(255,255,255,0.08)" }} />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold" style={{ color: lvl.color }}>{lvl.label}</p>
        <div className="flex gap-2">
          {[
            { ok: password.length >= 8, label: "8+ chars" },
            { ok: /[0-9]/.test(password), label: "Number" },
            { ok: /[^a-zA-Z0-9]/.test(password), label: "Symbol" },
          ].map(r => (
            <span key={r.label} className="text-[9px] font-bold"
              style={{ color: r.ok ? "#10b981" : "rgba(255,255,255,0.2)" }}>
              {r.ok ? "✓" : "·"} {r.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Check-your-inbox card ─────────────────────────────────────────────────────
function InboxCard({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-2 text-center">
      {/* Animated mail icon */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Mail size={36} className="text-amber-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-[11px] font-black text-white">✓</span>
        </div>
      </div>

      <div>
        <h2 className="text-[18px] font-black text-white mb-1.5">Check your inbox</h2>
        <p className="text-[12px] text-white/40 leading-relaxed">
          We sent a password reset link to
        </p>
        <p className="text-[13px] font-bold text-amber-400 mt-1 break-all">{email}</p>
      </div>

      <div className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-left space-y-2">
        <p className="text-[11px] font-bold text-white/25 uppercase tracking-wide">What to do</p>
        {[
          "Open the email from Constra",
          "Click the reset link (expires in 1 hour)",
          "Set your new password",
        ].map((step, i) => (
          <div key={step} className="flex items-start gap-2.5">
            <span className="w-4 h-4 rounded-full bg-amber-500/15 border border-amber-500/25 flex-shrink-0 flex items-center justify-center text-[9px] font-black text-amber-400 mt-0.5">
              {i + 1}
            </span>
            <span className="text-[12px] text-white/50">{step}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-[12px] font-bold text-white/40 hover:text-white/70 transition-colors"
      >
        <ArrowLeft size={13} /> Back to sign in
      </button>

      <p className="text-[11px] text-white/20">
        Didn&apos;t receive it? Check your spam folder.
      </p>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setOnboarded } = useStore();

  const [mode, setMode] = useState<"login" | "join">(() => (searchParams.get("join") ? "join" : "login"));

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Login throttle — 5 failed attempts → 30s cooldown
  const failCount = useRef(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) { setLockedUntil(null); setLockCountdown(0); }
      else setLockCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  // Join state
  const [joinCode, setJoinCode] = useState(() => searchParams.get("join")?.toUpperCase() ?? "");
  const [joinEmail, setJoinEmail] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinFirstName, setJoinFirstName] = useState("");
  const [joinLastName, setJoinLastName] = useState("");
  const [showJoinPw, setShowJoinPw] = useState(false);

  const [error, setError] = useState(() =>
    searchParams.get("error") === "auth_callback_failed" ? "The sign-in link has expired. Please try again." : ""
  );
  const [loading, setLoading] = useState(false);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  async function handleSignIn() {
    if (isLocked) return;
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setError(""); setLoading(true);

    if (!SUPABASE_ENABLED) {
      setOnboarded(true);
      router.push("/dashboard");
      return;
    }

    const supabase = getClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setLoading(false);
      failCount.current += 1;
      if (failCount.current >= 5) {
        failCount.current = 0;
        setLockedUntil(Date.now() + 30_000);
        setError("Too many failed attempts. Wait 30 seconds before trying again.");
      } else {
        setError(err.message);
      }
      return;
    }
    window.location.href = "/dashboard";
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email address first."); return; }
    setError(""); setLoading(true);
    if (!SUPABASE_ENABLED) { setLoading(false); setForgotSent(true); return; }
    try {
      const supabase = getClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
    } catch { /* silently succeed — don't leak whether the email exists */ }
    setLoading(false);
    setForgotSent(true);
  }

  async function handleJoin() {
    if (!joinCode || !joinEmail || !joinPassword || !joinFirstName) {
      setError("Invite code, name, email, and password are required.");
      return;
    }
    if (joinPassword.length < 8) {
      setError("Password must be at least 8 characters.");
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
        inviteCode: joinCode,
        email: joinEmail,
        password: joinPassword,
        firstName: joinFirstName,
        lastName: joinLastName,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setLoading(false); setError(data.error ?? "Join failed."); return; }

    const supabase = getClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: joinEmail,
      password: joinPassword,
    });
    setLoading(false);
    if (signInErr) { setError(signInErr.message); return; }
    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col lg:flex-row">

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden bg-[#0a0800]">
        {/* Blueprint grid */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "linear-gradient(rgba(245,158,11,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />
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

          <div className="flex-1 flex flex-col justify-center">
            {/* Construction silhouette */}
            <div className="flex items-end gap-3 mb-10 opacity-20">
              {[40,72,56,32,96,64,48,80,56,112,72,40].map((h, i) => (
                <div key={i} className={`${i % 3 === 2 ? "w-1 bg-amber-400" : i % 4 === 0 ? "w-3 bg-amber-500" : "w-2 bg-amber-500"} rounded-t`} style={{ height: h }} />
              ))}
            </div>
            <h2 className="text-[38px] font-black text-white leading-[1.05] tracking-tight mb-4">
              Your crew.<br />
              Your projects.<br />
              <span className="text-amber-400">All under control.</span>
            </h2>
            <p className="text-white/40 text-[15px] leading-relaxed max-w-xs mb-10">
              The job site app that actually works — GPS clock-ins, safety logs, AI briefs, and invoices. One login.
            </p>
            <div className="space-y-3">
              {[
                { icon: "📍", text: "GPS-verified clock-ins with live selfie" },
                { icon: "🛡️", text: "Safety incident logs on the spot" },
                { icon: "⚡", text: "AI daily brief every morning" },
                { icon: "📄", text: "Invoices & payroll exports in one tap" },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <span className="text-[16px]">{f.icon}</span>
                  <span className="text-[13px] text-white/50">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security badge */}
          <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] w-fit">
            <ShieldCheck size={13} className="text-green-400" />
            <span className="text-[11px] text-white/30 font-medium">256-bit encrypted · SOC 2 ready</span>
          </div>

          <div className="flex items-center gap-6 pt-6 border-t border-white/[0.06]">
            {[
              { v: "18+", l: "Tools built in" },
              { v: "15",  l: "Languages" },
              { v: "100%", l: "Features free" },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-[18px] font-black text-amber-400">{s.v}</div>
                <div className="text-[10px] text-white/25 font-medium">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 lg:max-w-[440px] flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 lg:hidden opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(245,158,11,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />

        <div className="w-full max-w-sm relative">
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

          <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-7">

            {/* ── Forgot-password success: full card ── */}
            {forgotSent ? (
              <InboxCard email={email} onBack={() => { setForgotSent(false); setError(""); }} />
            ) : (
              <>
                {/* Tabs */}
                <div className="flex bg-white/[0.05] rounded-xl p-0.5 mb-6">
                  {(["login", "join"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setMode(tab); setError(""); }}
                      className={`flex-1 text-[13px] font-bold py-2 rounded-lg transition-colors ${
                        mode === tab ? "bg-amber-500 text-black" : "text-white/40 hover:text-white/60"
                      }`}
                    >
                      {tab === "login" ? "Sign In" : "Join Company"}
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-[12px] text-red-400">{error}</p>
                  </div>
                )}

                {/* Lockout banner */}
                {isLocked && (
                  <div className="mb-4 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                    <Lock size={13} className="text-amber-400 flex-shrink-0" />
                    <p className="text-[12px] text-amber-300">
                      Too many attempts. Try again in <span className="font-bold">{lockCountdown}s</span>.
                    </p>
                  </div>
                )}

                {mode === "login" ? (
                  <div className="space-y-4">
                    <div>
                      <label className={lbl}>Email</label>
                      <input
                        type="email"
                        className={inp}
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                      />
                    </div>
                    <div>
                      <label className={lbl}>Password</label>
                      <div className="relative">
                        <input
                          type={showPw ? "text" : "password"}
                          className={`${inp} pr-10`}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                        >
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      <div className="text-right mt-1.5">
                        <button
                          onClick={handleForgotPassword}
                          disabled={loading}
                          className="text-[11px] text-amber-400/70 hover:text-amber-400 transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleSignIn}
                      disabled={loading || isLocked}
                      className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                      {loading ? "Signing in…" : isLocked ? `Locked (${lockCountdown}s)` : "Sign In"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className={lbl}>Company Invite Code</label>
                      <input
                        className={`${inp} font-mono tracking-widest text-center text-amber-400 placeholder:font-sans placeholder:tracking-normal placeholder:text-white/20`}
                        placeholder="CN-XXXX-XXXX"
                        value={joinCode}
                        onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(""); }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={lbl}>First Name</label>
                        <input className={inp} placeholder="Jane" value={joinFirstName} onChange={(e) => setJoinFirstName(e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>Last Name</label>
                        <input className={inp} placeholder="Smith" value={joinLastName} onChange={(e) => setJoinLastName(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className={lbl}>Work Email</label>
                      <input type="email" className={inp} placeholder="you@company.com" value={joinEmail} onChange={(e) => setJoinEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className={lbl}>Password</label>
                      <div className="relative">
                        <input
                          type={showJoinPw ? "text" : "password"}
                          className={`${inp} pr-10`}
                          placeholder="At least 8 characters"
                          value={joinPassword}
                          onChange={(e) => setJoinPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowJoinPw(!showJoinPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                        >
                          {showJoinPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      <PasswordStrength password={joinPassword} />
                    </div>
                    <button
                      onClick={handleJoin}
                      disabled={loading || joinPassword.length < 8}
                      className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                      {loading ? "Joining…" : "Join Workspace"}
                    </button>
                  </div>
                )}

                <p className="text-center text-[11px] text-white/25 pt-4">
                  Don&apos;t have a company yet?{" "}
                  <Link href="/onboarding" className="text-amber-400/80 hover:text-amber-400 font-semibold">
                    Create one free
                  </Link>
                </p>
              </>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
            {[
              { icon: WifiOff,     label: "Works offline" },
              { icon: MapPin,      label: "GPS verified" },
              { icon: Zap,         label: "Get started free" },
              { icon: ShieldCheck, label: "Data encrypted" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] text-white/20">
                <Icon size={10} />
                {label}
              </div>
            ))}
          </div>
          <p className="text-center text-[10px] text-white/10 mt-3 flex items-center justify-center gap-1.5">
            <Globe size={10} />
            Available worldwide in any currency
          </p>
        </div>
      </div>
    </div>
  );
}
