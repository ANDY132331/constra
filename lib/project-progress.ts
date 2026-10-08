// How far through a project is, from its own tasks.
//
// project.progress is stored, set to 0 when a project is created, has no field in the
// project form, and is never recomputed when a task moves. So every card read "Overall
// Progress 0%" while the same project's tasks sat at 100%, 65% and 15% on the Gantt — and
// the public share page showed the client 0% for the life of the job.
//
// Each task counts in proportion to how long it is scheduled to take: finishing a two-day
// punch walk should not move the needle as far as finishing six weeks of framing. A task
// with no usable dates counts as one day. With no tasks at all, whatever was stored stands.
//
// Pure, with no store access, so the server-rendered share page can use it too.

type TaskLike = {
  progress?: number | string | null;
  status?: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  start_date?: string | null;
  end_date?: string | null;
};
type ProjectLike = { progress?: number | string | null; tasks?: TaskLike[] | null };

const DAY = 86_400_000;
const num = (v: unknown) => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};
const clampPct = (n: number) => Math.min(100, Math.max(0, n));

function taskPct(t: TaskLike): number {
  // A task marked complete is complete, even if its slider was never dragged to 100.
  if (t.status === "completed") return 100;
  return clampPct(num(t.progress));
}

function taskWeight(t: TaskLike): number {
  const s = new Date((t.startDate ?? t.start_date) as string).getTime();
  const e = new Date((t.endDate ?? t.end_date) as string).getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return 1;
  return Math.max(1, (e - s) / DAY);
}

export function projectProgress(p: ProjectLike): number {
  const tasks = p.tasks ?? [];
  if (tasks.length === 0) return Math.round(clampPct(num(p.progress)));
  let done = 0, total = 0;
  for (const t of tasks) {
    const w = taskWeight(t);
    done += w * taskPct(t);
    total += w;
  }
  return total > 0 ? Math.round(done / total) : 0;
}
