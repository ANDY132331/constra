"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HardHat, Eye, EyeOff, ArrowRight, Globe, Loader2, WifiOff, MapPin, Zap } from "lucide-react";
import Link from "next/link";
import { getClient, SUPABASE_ENABLED } from "@/lib/supabase/client";
import { useStore } from "@/lib/store";

const inp = "w-full bg-white/[0.04] border border-white/[0.08] focus:border-amber-500/40 rounded-lg px-3.5 py-3 text-[13px] text-white placeholder:text-white/20 outline-none transition-colors";
const lbl = "text-[11px] font-bold text-white/35 uppercase tracking-wide block mb-1.5";

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

  const [mode, setMode] = useState<"login" | "join">("login");

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Auto-switch to join tab if ?join=CODE is in the URL (from QR code scan)
  // Also surface auth callback errors (e.g. expired magic links)
  useEffect(() => {
    const code = searchParams.get("join");
    if (code) { setMode("join"); setJoinCode(code.toUpperCase()); }
    const err = searchParams.get("error");
    if (err === "auth_callback_failed") setError("The sign-in link has expired. Please try again.");
  }, [searchParams]);

  // Join state
  const [joinCode, setJoinCode] = useState("");
  const [joinEmail, setJoinEmail] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinFirstName, setJoinFirstName] = useState("");
  const [joinLastName, setJoinLastName] = useState("");
  const [showJoinPw, setShowJoinPw] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) { setError("Please enter your email and password."); return; }
    setError(""); setLoading(true);

    if (!SUPABASE_ENABLED) {
      // Demo mode: skip real auth
      setOnboarded(true);
      router.push("/dashboard");
      return;
    }

    const supabase = getClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) { setLoading(false); setError(err.message); return; }
    router.push("/dashboard");
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
    setError(""); setLoading(true);

    if (!SUPABASE_ENABLED) {
      setOnboarded(true);
      router.push("/dashboard");
      return;
    }

    // Create account via server-side route (needs service role to bypass RLS)
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

    // Sign in with the just-created credentials
    const supabase = getClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: joinEmail,
      password: joinPassword,
    });
    setLoading(false);
    if (signInErr) { setError(signInErr.message); return; }
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
            <HardHat size={22} className="text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Constra</h1>
            <p className="text-[10px] text-white/30 tracking-widest uppercase">Workforce OS</p>
          </div>
        </div>

        <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-7">
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
                  {forgotSent ? (
                    <span className="text-[11px] text-green-400">Reset link sent — check your inbox.</span>
                  ) : (
                    <button
                      onClick={handleForgotPassword}
                      className="text-[11px] text-amber-400/70 hover:text-amber-400"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                {loading ? "Signing in…" : "Sign In"}
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
              </div>
              <button
                onClick={handleJoin}
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black font-bold text-[14px] py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
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
        </div>

        <div className="flex items-center justify-center gap-3 mt-5 flex-wrap">
          {[
            { icon: WifiOff, label: "Works offline" },
            { icon: MapPin, label: "GPS verified" },
            { icon: Zap, label: "Free during beta" },
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
  );
}
