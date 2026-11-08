"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BellRing, Copy, MapPin, Navigation, Plus, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { isForemanOrAbove } from "@/lib/permissions";
import { ink } from "@/lib/utils";
import { NeedsUpdate } from "@/components/needs-update";
import { addDaysIso, fromIsoDay, isoDay, notifyTeam } from "@/lib/team-notify";
import type { Worker } from "@/lib/mock-data";

const dayChip = (iso: string, today: string) =>
  iso === today ? "Today" : iso === addDaysIso(today, 1) ? "Tomorrow" : fromIsoDay(iso).toLocaleDateString(undefined, { weekday: "short" });
const dayLong = (iso: string) => fromIsoDay(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
const mapsUrl = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

function Avatar({ w, size = 36 }: { w?: Worker; size?: number }) {
  return (
    <div className="rounded-xl flex-shrink-0 flex items-center justify-center text-[11px] font-black overflow-hidden"
      style={{ width: size, height: size, backgroundColor: (w?.color ?? "#888888") + "22", color: ink(w?.color) }}>
      {w?.photo ? <img src={w.photo} alt="" className="w-full h-full object-cover" /> : w?.initials ?? "?"}
    </div>
  );
}

export default function CrewPlanPage() {
  const {
    workers, projects, crewAssignments, timeOffRequests, currentUser, db015,
    assignCrew, unassignCrew, getWorkerById, getProjectById,
  } = useStore();
  const isBoss = isForemanOrAbove(currentUser.role);
  const today = isoDay(new Date());
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysIso(today, i)), [today]);
  const [date, setDate] = useState(() => addDaysIso(today, 1));
  const [picking, setPicking] = useState<string | null>(null); // project id whose people sheet is open

  const offOn = (workerId: string, d: string) =>
    timeOffRequests.some((r) => r.workerId === workerId && r.status === "approved" && r.startDate <= d && r.endDate >= d);
  const dayPlan = crewAssignments.filter((a) => a.workDate === date);
  const jobs = projects.filter((p) => p.status === "active");
  const crew = [...workers].sort((a, b) => a.name.localeCompare(b.name));
  const placed = new Set(dayPlan.map((a) => a.workerId));
  const off = crew.filter((w) => offOn(w.id, date));
  const unplaced = crew.filter((w) => !placed.has(w.id) && !offOn(w.id, date));
  const prevPlan = crewAssignments.filter((a) => a.workDate === addDaysIso(date, -1));

  if (db015 === false) {
    return (
      <div className="max-w-3xl mx-auto space-y-5 pb-36 lg:pb-12">
        <h2 className="text-2xl font-bold text-white">Crew plan</h2>
        <NeedsUpdate feature="The crew plan" />
      </div>
    );
  }

  // ── A worker sees their own week ───────────────────────────────────────────
  if (!isBoss) {
    return (
      <div className="max-w-2xl mx-auto space-y-5 pb-36 lg:pb-12">
        <div>
          <h2 className="text-2xl font-bold text-white">My plan</h2>
          <p className="text-[13px] text-white/60 mt-1">Where you&apos;re working this week. You get a notification when your foreman sends it.</p>
        </div>
        <ul className="space-y-2.5">
          {days.map((d) => {
            const a = crewAssignments.find((x) => x.workerId === currentUser.id && x.workDate === d);
            const p = a ? getProjectById(a.projectId) : undefined;
            const isOff = offOn(currentUser.id, d);
            return (
              <li key={d} className={`rounded-2xl border p-4 ${a ? "bg-[#111111] border-white/[0.08]" : "bg-transparent border-white/[0.05]"}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className={`text-[13px] font-bold ${d === today ? "text-amber-400" : "text-white/70"}`}>{dayChip(d, today)}<span className="text-white/45 font-normal ml-2">{fmtShort(d)}</span></p>
                  {a?.startTime && <p className="text-[14px] font-bold text-white tabular-nums">{a.startTime}</p>}
                </div>
                {a && p ? (
                  <>
                    <p className="text-[16px] font-bold text-white mt-1">{p.name}</p>
                    {p.address && (
                      <a href={mapsUrl(p.address)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 min-h-[40px] text-[13px] text-sky-400">
                        <Navigation size={13} /> {p.address}
                      </a>
                    )}
                    {a.note && <p className="text-[13px] text-white/70">{a.note}</p>}
                  </>
                ) : (
                  <p className="text-[13px] text-white/45 mt-1">{isOff ? "Time off" : "Nothing planned yet"}</p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ── Foreman and up plan the day ────────────────────────────────────────────
  const setStart = (projectId: string, startTime: string) => {
    for (const a of dayPlan.filter((x) => x.projectId === projectId)) assignCrew({ ...a, startTime });
  };
  const copyPrev = () => {
    let n = 0;
    for (const a of prevPlan) {
      if (placed.has(a.workerId) || offOn(a.workerId, date)) continue;
      assignCrew({ projectId: a.projectId, workerId: a.workerId, workDate: date, startTime: a.startTime, note: a.note });
      n++;
    }
    toast.success(n ? `Copied ${n} ${n === 1 ? "person" : "people"} from ${dayChip(addDaysIso(date, -1), today).toLowerCase()}` : "Everyone's already placed");
  };
  const sendPlan = () => {
    const people = [...new Set(dayPlan.map((a) => a.workerId))];
    people.forEach((workerId) => notifyTeam({ event: "crew-plan", workerId, date }));
    toast.success(`Sent to ${people.length} ${people.length === 1 ? "person" : "people"}`, { description: "Each gets a notification with their job, start time and address." });
  };

  const pickingJob = picking ? getProjectById(picking) : undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-36 lg:pb-12">
      <div>
        <h2 className="text-2xl font-bold text-white">Crew plan</h2>
        <p className="text-[13px] text-white/60 mt-1">Put people on jobs, then send it. Everyone gets their job, start time and address.</p>
      </div>

      {/* Days */}
      <div className="flex gap-2 overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0 scrollbar-none" role="radiogroup" aria-label="Day">
        {days.map((d) => {
          const count = new Set(crewAssignments.filter((a) => a.workDate === d).map((a) => a.workerId)).size;
          return (
            <button key={d} type="button" role="radio" aria-checked={date === d} onClick={() => setDate(d)}
              className={`flex-shrink-0 min-h-[52px] min-w-[72px] px-3.5 rounded-2xl text-center transition-colors ${date === d ? "bg-amber-500 text-black" : "bg-white/[0.06] text-white/75 hover:bg-white/[0.1]"}`}>
              <span className="block text-[13px] font-bold">{dayChip(d, today)}</span>
              <span className={`block text-[11px] tabular-nums ${date === d ? "text-black/70" : "text-white/45"}`}>{count ? `${count} placed` : fmtShort(d)}</span>
            </button>
          );
        })}
      </div>

      {/* Day summary and actions */}
      <section aria-label="Plan summary" className="bg-[#111111] border border-white/[0.07] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-white">{dayLong(date)}</p>
          <p className="text-[12px] text-white/60 tabular-nums">{placed.size} of {crew.length - off.length} placed{off.length ? ` · ${off.length} off` : ""}</p>
        </div>
        <div className="flex gap-2">
          {prevPlan.length > 0 && placed.size < crew.length - off.length && (
            <button type="button" onClick={copyPrev} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white text-[13px] font-semibold">
              <Copy size={14} /> Copy {dayChip(addDaysIso(date, -1), today).toLowerCase()}
            </button>
          )}
          <button type="button" onClick={sendPlan} disabled={!dayPlan.length}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[13px] font-bold disabled:opacity-40 disabled:pointer-events-none">
            <BellRing size={14} /> Send to crew
          </button>
        </div>
      </section>

      {/* Jobs */}
      {jobs.length === 0 ? (
        <p className="text-[13px] text-white/60 text-center py-8">Add an active job first, then plan who goes there.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {jobs.map((p) => {
            const here = dayPlan.filter((a) => a.projectId === p.id);
            return (
              <li key={p.id} className="bg-[#111111] border border-white/[0.07] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-white truncate">{p.name}</p>
                    {p.address && <p className="text-[12px] text-white/55 truncate flex items-center gap-1"><MapPin size={11} /> {p.address}</p>}
                  </div>
                  {here.length > 0 && (
                    <input
                      id={`start-${p.id}`}
                      aria-label={`Start time at ${p.name}`}
                      placeholder="Start"
                      defaultValue={here[0].startTime}
                      key={`${date}-${here[0].startTime}`}
                      onBlur={(e) => { const v = e.target.value.trim().slice(0, 10); if (v !== here[0].startTime) setStart(p.id, v); }}
                      className="w-[92px] min-h-[40px] bg-[#1a1a1a] border border-white/[0.1] rounded-lg px-2.5 text-[13px] text-white text-center tabular-nums placeholder:text-white/35"
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {here.map((a) => {
                    const w = getWorkerById(a.workerId);
                    return (
                      <span key={a.id} className="inline-flex items-center gap-2 pl-1 pr-1 py-1 rounded-full bg-white/[0.06]">
                        <Avatar w={w} size={28} />
                        <span className="text-[13px] text-white">{w?.name.split(" ")[0] ?? "Someone"}</span>
                        <button type="button" onClick={() => unassignCrew(a.id)} aria-label={`Take ${w?.name ?? "them"} off ${p.name}`}
                          className="w-8 h-8 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/[0.08]">
                          <X size={14} />
                        </button>
                      </span>
                    );
                  })}
                  <button type="button" onClick={() => setPicking(p.id)}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-full border border-dashed border-white/[0.18] text-[13px] font-semibold text-white/70 hover:text-white hover:border-white/30">
                    <Plus size={14} /> {here.length ? "Add" : "Add people"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(unplaced.length > 0 || off.length > 0) && (
        <section aria-label="Not placed" className="bg-[#111111] border border-white/[0.07] rounded-2xl p-4">
          {unplaced.length > 0 && (
            <>
              <p className="text-[13px] font-bold text-white">Not placed <span className="text-white/45 font-normal">{unplaced.length}</span></p>
              <div className="flex flex-wrap gap-2 mt-2.5">
                {unplaced.map((w) => <span key={w.id} className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/[0.04]"><Avatar w={w} size={26} /><span className="text-[13px] text-white/75">{w.name}</span></span>)}
              </div>
            </>
          )}
          {off.length > 0 && (
            <p className={`text-[12px] text-white/55 ${unplaced.length ? "mt-3" : ""}`}>Off: {off.map((w) => w.name).join(", ")}</p>
          )}
        </section>
      )}

      {/* Pick people for a job */}
      {picking && pickingJob && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setPicking(null)} />
          <div className="sheet relative w-full sm:max-w-md bg-[#141414] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl max-h-[85dvh] flex flex-col">
            <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-white truncate">{pickingJob.name}</h3>
                <p className="text-[12px] text-white/55">{dayLong(date)}</p>
              </div>
              <button type="button" onClick={() => setPicking(null)} className="min-h-[44px] px-4 rounded-full bg-amber-500 text-black text-[13px] font-bold">Done</button>
            </div>
            <ul className="overflow-y-auto px-2 pb-6">
              {crew.map((w) => {
                const mine = dayPlan.find((a) => a.workerId === w.id);
                const here = mine?.projectId === picking;
                const elsewhere = mine && !here ? getProjectById(mine.projectId)?.name : undefined;
                const isOff = offOn(w.id, date);
                return (
                  <li key={w.id}>
                    <button
                      type="button"
                      disabled={isOff}
                      aria-pressed={here}
                      onClick={() => {
                        if (here) unassignCrew(mine!.id);
                        else assignCrew({ projectId: picking, workerId: w.id, workDate: date, startTime: dayPlan.find((a) => a.projectId === picking)?.startTime ?? "", note: "" });
                      }}
                      className={`w-full flex items-center gap-3 min-h-[56px] px-3 rounded-xl text-left transition-colors ${here ? "bg-amber-500/10" : "hover:bg-white/[0.04]"} disabled:opacity-40`}
                    >
                      <Avatar w={w} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[14px] font-semibold text-white truncate">{w.name}</span>
                        <span className="block text-[12px] text-white/50 truncate">{isOff ? "Time off" : elsewhere ? `At ${elsewhere}, tap to move here` : w.customRole || w.role}</span>
                      </span>
                      <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${here ? "bg-amber-500 border-amber-500" : "border-white/25"}`}>
                        {here && <span className="w-2.5 h-2.5 rounded-full bg-black" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtShort(iso: string) {
  return fromIsoDay(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
