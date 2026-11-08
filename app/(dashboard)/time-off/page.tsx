"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarOff, Check, Loader2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { isForemanOrAbove } from "@/lib/permissions";
import { ink } from "@/lib/utils";
import { NeedsUpdate } from "@/components/needs-update";
import { addDaysIso, fromIsoDay, isoDay, notifyTeam } from "@/lib/team-notify";
import type { TimeOffRequest } from "@/lib/mock-data";

const fmtDay = (iso: string) => fromIsoDay(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
const fmtRange = (r: Pick<TimeOffRequest, "startDate" | "endDate">) => r.startDate === r.endDate ? fmtDay(r.startDate) : `${fmtDay(r.startDate)} – ${fmtDay(r.endDate)}`;
const daysIn = (r: Pick<TimeOffRequest, "startDate" | "endDate">) => Math.round((fromIsoDay(r.endDate).getTime() - fromIsoDay(r.startDate).getTime()) / 86_400_000) + 1;

const STATUS = {
  pending: { label: "Waiting", cls: "bg-amber-500/15 text-amber-400" },
  approved: { label: "Approved", cls: "bg-green-500/15 text-green-400" },
  declined: { label: "Declined", cls: "bg-red-500/15 text-red-400" },
} as const;

export default function TimeOffPage() {
  const { timeOffRequests, currentUser, getWorkerById, requestTimeOff, decideTimeOff, withdrawTimeOff, db015 } = useStore();
  const isBoss = isForemanOrAbove(currentUser.role);
  const today = isoDay(new Date());

  const [from, setFrom] = useState(() => addDaysIso(today, 1));
  const [to, setTo] = useState(() => addDaysIso(today, 1));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { waiting, upcoming, mine, past } = useMemo(() => {
    const sorted = [...timeOffRequests].sort((a, b) => a.startDate.localeCompare(b.startDate));
    return {
      waiting: sorted.filter((r) => r.status === "pending"),
      upcoming: sorted.filter((r) => r.status === "approved" && r.endDate >= today),
      mine: sorted.filter((r) => r.workerId === currentUser.id).reverse(),
      past: sorted.filter((r) => r.endDate < today || r.status === "declined").reverse().slice(0, 20),
    };
  }, [timeOffRequests, today, currentUser.id]);

  if (db015 === false) {
    return (
      <div className="max-w-2xl mx-auto space-y-5 pb-36 lg:pb-12">
        <h2 className="text-2xl font-bold text-white">Time off</h2>
        <NeedsUpdate feature="Time off" />
      </div>
    );
  }

  const submit = () => {
    if (busy) return;
    if (to < from) { toast.error("The last day is before the first day"); return; }
    if (from < today) { toast.error("Pick today or a day ahead"); return; }
    setBusy(true);
    const id = requestTimeOff({ workerId: currentUser.id, startDate: from, endDate: to, reason: reason.trim().slice(0, 500) });
    notifyTeam({ event: "time-off-request", requestId: id });
    toast.success("Request sent", { description: isBoss ? undefined : "Your foreman gets a notification." });
    setReason("");
    setBusy(false);
  };

  const decide = (r: TimeOffRequest, status: "approved" | "declined") => {
    decideTimeOff(r.id, status);
    notifyTeam({ event: "time-off-decision", requestId: r.id });
    toast.success(status === "approved" ? "Approved" : "Declined", { description: `${getWorkerById(r.workerId)?.name ?? "They"} will get a notification.` });
  };

  const Person = ({ id }: { id: string }) => {
    const w = getWorkerById(id);
    return (
      <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-[12px] font-black"
        style={{ backgroundColor: (w?.color ?? "#888888") + "22", color: ink(w?.color) }}>
        {w?.initials ?? "?"}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-36 lg:pb-12">
      <div>
        <h2 className="text-2xl font-bold text-white">Time off</h2>
        <p className="text-[13px] text-white/60 mt-1">{isBoss ? "Approve requests and see who's away." : "Ask for days off. You'll get a notification when it's decided."}</p>
      </div>

      {/* Needs a decision */}
      {isBoss && waiting.length > 0 && (
        <section aria-label="Waiting for you" className="bg-amber-500/[0.06] border border-amber-500/25 rounded-2xl overflow-hidden">
          <h3 className="text-[14px] font-bold text-white px-4 pt-4 pb-2">Waiting for you <span className="text-amber-400">{waiting.length}</span></h3>
          <ul>
            {waiting.map((r) => (
              <li key={r.id} className="px-4 py-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <Person id={r.workerId} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white truncate">{getWorkerById(r.workerId)?.name ?? "Someone"}</p>
                    <p className="text-[12px] text-white/60 tabular-nums">{fmtRange(r)} · {daysIn(r)} day{daysIn(r) === 1 ? "" : "s"}</p>
                  </div>
                </div>
                {r.reason && <p className="text-[13px] text-white/75 mt-2 ml-[52px]">&ldquo;{r.reason}&rdquo;</p>}
                <div className="flex gap-2 mt-3 ml-[52px]">
                  <button type="button" onClick={() => decide(r, "approved")}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-full bg-green-500 hover:bg-green-400 text-black text-[13px] font-bold">
                    <Check size={15} /> Approve
                  </button>
                  <button type="button" onClick={() => decide(r, "declined")}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white text-[13px] font-bold ml-2">
                    <X size={15} /> Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ask */}
      <section aria-label="Ask for time off" className="bg-[#111111] border border-white/[0.07] rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="text-[15px] font-bold text-white">Ask for time off</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] font-semibold text-white/55 uppercase tracking-wider">First day</span>
            <input id="off-from" type="date" value={from} min={today}
              onChange={(e) => { const v = e.target.value; if (!v) return; setFrom(v); if (to < v) setTo(v); }}
              className="mt-1 w-full min-h-[48px] bg-[#1a1a1a] border border-white/[0.1] rounded-xl px-3 text-[14px] text-white" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-white/55 uppercase tracking-wider">Last day</span>
            <input id="off-to" type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)}
              className="mt-1 w-full min-h-[48px] bg-[#1a1a1a] border border-white/[0.1] rounded-xl px-3 text-[14px] text-white" />
          </label>
        </div>
        <label className="block">
          <span className="text-[11px] font-semibold text-white/55 uppercase tracking-wider">Reason (optional)</span>
          <input id="off-reason" type="text" value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} placeholder="Family, appointment, holiday…"
            className="mt-1 w-full min-h-[48px] bg-[#1a1a1a] border border-white/[0.1] rounded-xl px-3.5 text-[14px] text-white placeholder:text-white/35" />
        </label>
        <button type="button" onClick={submit} disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[14px] font-bold disabled:opacity-40">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <CalendarOff size={16} />}
          Send request{from && to ? ` · ${daysIn({ startDate: from, endDate: to })} day${daysIn({ startDate: from, endDate: to }) === 1 ? "" : "s"}` : ""}
        </button>
      </section>

      {/* Who's away */}
      {isBoss && (
        <section aria-label="Coming up" className="bg-[#111111] border border-white/[0.07] rounded-2xl overflow-hidden">
          <h3 className="text-[14px] font-bold text-white px-4 pt-4 pb-2">Who&apos;s away</h3>
          {upcoming.length === 0 ? (
            <p className="text-[13px] text-white/55 px-4 pb-4">Nobody has approved time off coming up.</p>
          ) : (
            <ul>
              {upcoming.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3 border-t border-white/[0.06]">
                  <Person id={r.workerId} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white truncate">{getWorkerById(r.workerId)?.name ?? "Someone"}</p>
                    <p className="text-[12px] text-white/60 tabular-nums">{fmtRange(r)}{r.startDate <= today ? " · away now" : ""}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Your requests */}
      {mine.length > 0 && (
        <section aria-label="Your requests" className="bg-[#111111] border border-white/[0.07] rounded-2xl overflow-hidden">
          <h3 className="text-[14px] font-bold text-white px-4 pt-4 pb-2">Your requests</h3>
          <ul>
            {mine.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-3 border-t border-white/[0.06]">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-white tabular-nums">{fmtRange(r)}</p>
                  {r.reason && <p className="text-[12px] text-white/55 truncate">{r.reason}</p>}
                </div>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                {r.status === "pending" && (
                  <button type="button" onClick={() => { withdrawTimeOff(r.id); toast.success("Request withdrawn"); }}
                    aria-label={`Withdraw request for ${fmtRange(r)}`}
                    className="min-h-[44px] px-3 text-[12px] font-semibold text-white/60 hover:text-white">
                    Withdraw
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isBoss && past.length > 0 && (
        <details className="bg-[#111111] border border-white/[0.07] rounded-2xl overflow-hidden group">
          <summary className="px-4 min-h-[48px] flex items-center text-[13px] font-semibold text-white/70 cursor-pointer">Past and declined</summary>
          <ul>
            {past.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-white/[0.06]">
                <p className="flex-1 min-w-0 text-[13px] text-white/75 truncate">{getWorkerById(r.workerId)?.name ?? "Someone"} · <span className="tabular-nums">{fmtRange(r)}</span></p>
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
