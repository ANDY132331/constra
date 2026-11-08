"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronRight, MapPinOff } from "lucide-react";
import { useStore } from "@/lib/store";
import { isForemanOrAbove } from "@/lib/permissions";
import { fmtDistance, siteMoves } from "@/lib/site-presence";
import { ink } from "@/lib/utils";

const time = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/**
 * Today's departures from job sites, newest first: who, which job, the exact time they left, how far
 * away, and when they came back. Someone still away stays at the top in red.
 */
export function SiteAlerts() {
  const { clockEntries, currentUser, getWorkerById, getProjectById } = useStore();

  const rows = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const out: { id: string; workerId: string; projectId: string; left: Date; metres?: number; back?: Date; stillOn: boolean }[] = [];
    for (const e of clockEntries) {
      const moves = siteMoves(e);
      moves.forEach((m, i) => {
        if (m.kind !== "left" || m.at < start) return;
        const back = moves.slice(i + 1).find((n) => n.kind === "returned");
        out.push({ id: `${e.id}-${i}`, workerId: e.workerId, projectId: e.projectId, left: m.at, metres: m.metres, back: back?.at, stillOn: !e.clockOut });
      });
    }
    // Away right now first, then newest
    return out.sort((a, b) => Number(!a.back && a.stillOn) === Number(!b.back && b.stillOn)
      ? b.left.getTime() - a.left.getTime()
      : Number(!b.back && b.stillOn) - Number(!a.back && a.stillOn));
  }, [clockEntries]);

  if (!isForemanOrAbove(currentUser.role) || rows.length === 0) return null;
  const awayNow = rows.filter((r) => !r.back && r.stillOn).length;

  return (
    <section aria-label="Site alerts today" className={`rounded-2xl border overflow-hidden ${awayNow ? "bg-red-500/[0.06] border-red-500/25" : "bg-[#111111] border-white/[0.07]"}`}>
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-2">
          <MapPinOff size={15} className={awayNow ? "text-red-400" : "text-white/50"} />
          <h3 className="text-[14px] font-bold text-white">Site alerts today</h3>
        </div>
        {awayNow > 0 && <span className="text-[11px] font-bold text-red-400">{awayNow} away now</span>}
      </div>
      <ul>
        {rows.slice(0, 6).map((r) => {
          const w = getWorkerById(r.workerId);
          const p = getProjectById(r.projectId);
          const away = !r.back && r.stillOn;
          return (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-white/[0.05]">
              <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-black"
                style={{ backgroundColor: (w?.color ?? "#888888") + "22", color: ink(w?.color) }}>
                {w?.initials ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{w?.name ?? "Someone"} <span className="text-white/50 font-normal">left {p?.name ?? "the site"}</span></p>
                <p className="text-[12px] text-white/55 tabular-nums">
                  {time(r.left)}{r.metres != null && ` · ${fmtDistance(r.metres)} away`}
                  {r.back ? <> · <span className="text-green-400">back {time(r.back)}</span></> : !r.stillOn ? " · clocked out" : ""}
                </p>
              </div>
              {away && <span className="crew-pulse w-2 h-2 rounded-full bg-red-400 flex-shrink-0" aria-label="Still away" />}
            </li>
          );
        })}
      </ul>
      <Link href="/time-tracking" className="flex items-center justify-center gap-1.5 min-h-[44px] border-t border-white/[0.05] text-[12px] font-semibold text-white/60 hover:text-white transition-colors">
        See it on Time <ChevronRight size={13} />
      </Link>
    </section>
  );
}
