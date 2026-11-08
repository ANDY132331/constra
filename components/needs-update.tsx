"use client";

import { DatabaseZap } from "lucide-react";

/** Shown in place of a feature whose tables aren't in this workspace's database yet */
export function NeedsUpdate({ feature }: { feature: string }) {
  return (
    <div className="bg-[#111111] border border-white/[0.07] rounded-2xl p-6 text-center">
      <DatabaseZap size={26} className="mx-auto text-amber-400" />
      <p className="text-[15px] font-bold text-white mt-3">{feature} is almost ready</p>
      <p className="text-[13px] text-white/60 mt-1 max-w-sm mx-auto">
        It needs one database update on this workspace first. Whoever set up Constra for your company can finish it in a minute.
      </p>
    </div>
  );
}
