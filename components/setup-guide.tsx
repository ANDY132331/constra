"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Send, X } from "lucide-react";
import { shareInvite } from "@/lib/invite";
import { useStore } from "@/lib/store";

const DISMISSED_KEY = "constra_setup_guide_v1";

/**
 * The three things a new company has to do before Constra is useful to them. It stays until they're
 * done, because a crew that was never invited is the usual way this app ends up unused: the owner adds
 * a job, sees an empty screen and leaves.
 */
export function SetupGuide() {
  const { projects, workers, clockEntries, currentUser, inviteCode, companyName } = useStore();
  // The dashboard shell only renders after mount (see its layout), so storage is readable here
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED_KEY) === "1"; } catch { return false; }
  });

  const canSetUp = currentUser.role === "Admin" || currentUser.role === "Project Manager";
  const steps = [
    { done: projects.length > 0, label: "Add your first job", sub: "Crew clock in against a job, so this comes first." },
    { done: workers.length > 1, label: "Get your crew on Constra", sub: "Everyone needs it on their phone for it to work." },
    { done: clockEntries.length > 0, label: "Do your first clock-in", sub: "Try it yourself. It takes 20 seconds." },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (!canSetUp || dismissed || doneCount === steps.length) return null;
  const nextIndex = steps.findIndex((s) => !s.done);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch { /* private browsing: returns next visit */ }
  };

  const action = (index: number) => {
    const primary = "inline-flex items-center justify-center gap-1.5 min-h-[44px] mt-3 px-4 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[13px] font-bold transition-colors";
    if (index === 0) return <Link href="/projects?new=1" className={primary}>Add a job <ArrowRight size={14} /></Link>;
    if (index === 2) return <Link href="/time-tracking" className={primary}>Go to clock-in <ArrowRight size={14} /></Link>;
    // The code loads with the company; until then, the crew page has the same invite
    if (!inviteCode) return <Link href="/crew" className={primary}>Invite crew <ArrowRight size={14} /></Link>;
    return <button type="button" onClick={() => shareInvite(inviteCode, companyName)} className={primary}><Send size={14} /> Send invite</button>;
  };

  return (
    <section aria-label="Getting set up" className="bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-white">Set up your crew</h2>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[12px] font-semibold text-white/50 tabular-nums">{doneCount} of {steps.length}</span>
          <button type="button" onClick={dismiss} aria-label="Hide setup guide" className="w-11 h-11 -mr-2 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      <ol className="mt-2 space-y-3 lg:grid lg:grid-cols-3 lg:gap-4 lg:space-y-0">
        {steps.map((step, i) => (
          <li key={step.label} className="flex items-start gap-3">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold tabular-nums ${step.done ? "bg-green-500/20 text-green-400" : i === nextIndex ? "bg-amber-500 text-black" : "bg-white/[0.08] text-white/50"}`}>
              {step.done ? <Check size={14} aria-label="Done" /> : i + 1}
            </span>
            <div className="min-w-0">
              <p className={`text-[14px] font-semibold ${step.done ? "text-white/50" : "text-white"}`}>{step.label}</p>
              {!step.done && <p className="text-[12px] text-white/60 mt-0.5">{step.sub}</p>}
              {i === nextIndex && action(i)}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
