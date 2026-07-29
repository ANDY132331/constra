"use client";

import Link from "next/link";
import { Zap, Lock } from "lucide-react";
import { useStore } from "@/lib/store";
import PLANS, { withinLimit, limitLabel } from "@/config/plans";

type GateProps = {
  feature: "workers" | "activeProjects";
  currentCount: number;
  children: React.ReactNode;
  /** If true, shows an inline banner above children instead of blocking them */
  softWarn?: boolean;
};

export function UpgradeGate({ feature, currentCount, children, softWarn = false }: GateProps) {
  const { isPro } = useStore();
  const plan = PLANS[isPro ? "pro" : "free"];
  const limit = plan.limits[feature];
  const within = withinLimit(currentCount, limit);

  // Pro has unlimited — never gate
  if (isPro || within) return <>{children}</>;

  if (softWarn) {
    return (
      <>
        <div className="mb-4 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl p-4 flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-amber-400">
              {feature === "workers" ? "Worker" : "Project"} limit reached
            </p>
            <p className="text-[12px] text-white/45">
              Free plan includes up to {limitLabel(limit)}{" "}
              {feature === "workers" ? "workers" : "active projects"}.
              Upgrade to Pro for unlimited.
            </p>
          </div>
          <Link
            href="/settings"
            className="flex-shrink-0 text-[12px] font-bold bg-amber-500 hover:bg-amber-400 text-black px-3 py-1.5 rounded-lg transition-colors"
          >
            Upgrade
          </Link>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <Lock size={22} className="text-amber-400" />
      </div>
      <div>
        <h3 className="text-[16px] font-bold text-white mb-1">
          {feature === "workers" ? "Worker" : "Project"} limit reached
        </h3>
        <p className="text-[13px] text-white/40 max-w-xs">
          You&apos;ve reached the {limitLabel(limit)}{" "}
          {feature === "workers" ? "worker" : "active project"} limit on the Free plan.
          Upgrade to Pro for unlimited access.
        </p>
      </div>
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[14px] px-5 py-2.5 rounded-xl transition-colors"
      >
        <Zap size={15} />
        Upgrade to Pro
      </Link>
      <p className="text-[11px] text-white/20">From $19/mo · Cancel anytime</p>
    </div>
  );
}

/** Simple inline badge showing current usage vs limit */
export function UsageBadge({ feature, count }: { feature: "workers" | "activeProjects"; count: number }) {
  const { isPro } = useStore();
  if (isPro) return null;
  const limit = PLANS.free.limits[feature];
  if (limit === "unlimited") return null;
  const pct = (count / (limit as number)) * 100;
  const near = pct >= 80;
  const at = count >= (limit as number);
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
      at ? "bg-red-500/15 text-red-400" :
      near ? "bg-amber-500/15 text-amber-400" :
      "bg-white/8 text-white/30"
    }`}>
      {count}/{limit}
    </span>
  );
}
