"use client";

import Link from "next/link";
import { CalendarOff, CalendarRange, ChevronRight, Navigation } from "lucide-react";
import { useStore } from "@/lib/store";
import { isForemanOrAbove } from "@/lib/permissions";
import { addDaysIso, isoDay } from "@/lib/team-notify";

/**
 * The two things from the crew plan and time off worth seeing on the home screen: where you're
 * working next, and (for the office) requests waiting for a yes or no. Shows nothing otherwise.
 */
export function TeamNotices() {
  const { crewAssignments, timeOffRequests, currentUser, getProjectById } = useStore();
  const today = isoDay(new Date());
  const tomorrow = addDaysIso(today, 1);
  const next = [today, tomorrow]
    .map((d) => ({ d, a: crewAssignments.find((x) => x.workerId === currentUser.id && x.workDate === d) }))
    .find((x) => x.a);
  const p = next?.a ? getProjectById(next.a.projectId) : undefined;
  const waiting = isForemanOrAbove(currentUser.role) ? timeOffRequests.filter((r) => r.status === "pending").length : 0;

  if (!p && !waiting) return null;

  return (
    <div className="space-y-2.5">
      {p && next?.a && (
        <Link href="/crew-plan" className="flex items-center gap-3 bg-[#111111] border border-white/[0.07] rounded-2xl p-4 hover:border-white/[0.14] transition-colors">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center flex-shrink-0"><CalendarRange size={18} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white/55">{next.d === today ? "Today" : "Tomorrow"}{next.a.startTime ? ` · ${next.a.startTime}` : ""}</p>
            <p className="text-[15px] font-bold text-white truncate">{p.name}</p>
            {p.address && <p className="text-[12px] text-white/55 truncate flex items-center gap-1"><Navigation size={11} /> {p.address}</p>}
          </div>
          <ChevronRight size={16} className="text-white/40 flex-shrink-0" />
        </Link>
      )}
      {waiting > 0 && (
        <Link href="/time-off" className="flex items-center gap-3 bg-amber-500/[0.06] border border-amber-500/25 rounded-2xl p-4 hover:border-amber-500/40 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center flex-shrink-0"><CalendarOff size={18} /></div>
          <p className="flex-1 text-[14px] font-semibold text-white">{waiting} time-off request{waiting === 1 ? "" : "s"} waiting for you</p>
          <ChevronRight size={16} className="text-white/40 flex-shrink-0" />
        </Link>
      )}
    </div>
  );
}
