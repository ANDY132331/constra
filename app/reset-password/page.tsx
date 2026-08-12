"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { HardHat, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { getClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);

  useEffect(() => {
    const supabase = getClient();

    // PKCE: Supabase puts ?code= in the URL when redirected directly here.
    // Exchange it client-side so PASSWORD_RECOVERY event fires properly.
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.toString());
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setTokenExpired(true);
        else setSessionReady(true);
      });
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(true);
      }
    });
    // Fallback: if there's already an active session (e.g. server-side exchange)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    // If nothing resolves in 8s, treat link as expired
    const timeout = setTimeout(() => {
      setSessionReady((current) => {
        if (!current) setTokenExpired(true);
        return current;
      });
    }, 8000);
    return () => { subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      setStatus("error");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords don't match.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    const supabase = getClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("success");
      setTimeout(() => router.push("/dashboard"), 2500);
    }
  }

  const inp = "w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:border-amber-500/50 transition-colors placeholder:text-white/25";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
            <HardHat size={18} className="text-black" />
          </div>
          <div>
            <p className="font-bold text-white text-[17px] tracking-tight leading-tight">Constra</p>
            <p className="text-[10px] text-white/30 tracking-widest font-medium">WORKFORCE OS</p>
          </div>
        </div>

        <div className="bg-[#111] border border-white/[0.07] rounded-2xl p-7">
          <h1 className="text-[20px] font-bold text-white mb-1">Set new password</h1>
          <p className="text-[13px] text-white/40 mb-6">Choose a strong password for your account.</p>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 size={40} className="text-green-400" />
              <p className="text-[15px] font-semibold text-white">Password updated!</p>
              <p className="text-[12px] text-white/40">Redirecting you to the dashboard…</p>
            </div>
          ) : tokenExpired ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <AlertCircle size={36} className="text-red-400" />
              <div>
                <p className="text-[14px] font-semibold text-white mb-1">Link expired or invalid</p>
                <p className="text-[12px] text-white/40">Password reset links expire after 1 hour. Request a new one.</p>
              </div>
              <Link href="/login" className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[14px] rounded-xl transition-colors text-center block">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!sessionReady && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
                  <p className="text-[12px] text-amber-300">Verifying reset link…</p>
                </div>
              )}

              <div>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password (min 8 characters)"
                    required
                    disabled={!sessionReady}
                    className={inp}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password.length > 0 && (() => {
                  const score = [password.length >= 8, /[0-9]/.test(password), /[^a-zA-Z0-9]/.test(password), password.length >= 12].filter(Boolean).length;
                  const levels = [
                    { label: "Too short", color: "#ef4444", bars: 1 },
                    { label: "Weak",      color: "#F5C400", bars: 1 },
                    { label: "Fair",      color: "#F5C400", bars: 2 },
                    { label: "Good",      color: "#22c55e", bars: 3 },
                    { label: "Strong",    color: "#10b981", bars: 4 },
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

              <input
                type={showPw ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm new password"
                required
                disabled={!sessionReady}
                className={inp}
              />

              {status === "error" && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                  <p className="text-[12px] text-red-300">{errorMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading" || !sessionReady}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-[14px] rounded-xl transition-colors"
              >
                {status === "loading" ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-5 text-[12px] text-white/30">
          <Link href="/login" className="text-amber-400 hover:text-amber-300 transition-colors">← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
