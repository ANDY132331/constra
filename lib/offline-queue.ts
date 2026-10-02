import type { SupabaseClient } from "@supabase/supabase-js";

const QUEUE_KEY = "constra_offline_queue";

export type QueuedOp = {
  id: string;
  table: string;
  op: "insert" | "update" | "delete";
  data?: Record<string, unknown>;
  eqId?: string;
  timestamp: number;
  attempts?: number;
};

export function getQueue(): QueuedOp[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function enqueue(op: Omit<QueuedOp, "id" | "timestamp">): void {
  try {
    const queue = getQueue();
    queue.push({ ...op, id: crypto.randomUUID(), timestamp: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch { /* silently drop if storage is unavailable */ }
}

export function queueLength(): number {
  return getQueue().length;
}

const MAX_ATTEMPTS = 5;
let flushing: Promise<number> | null = null;

// Only one flush at a time — overlapping flushes would replay the same inserts.
export function flushQueue(client: SupabaseClient): Promise<number> {
  if (!flushing) flushing = runFlush(client).finally(() => { flushing = null; });
  return flushing;
}

async function runFlush(client: SupabaseClient): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedOp[] = [];
  let synced = 0;

  for (const entry of queue) {
    if ((entry.op === "update" || entry.op === "delete") && !entry.eqId) continue; // malformed, can never apply
    try {
      let error: { code?: string; message?: string } | null = null;
      if (entry.op === "insert") {
        ({ error } = await client.from(entry.table).insert(entry.data!));
      } else if (entry.op === "update") {
        ({ error } = await client.from(entry.table).update(entry.data!).eq("id", entry.eqId!));
      } else {
        ({ error } = await client.from(entry.table).delete().eq("id", entry.eqId!));
      }
      // 23505 = already inserted by an earlier attempt
      if (!error || error.code === "23505") { synced++; continue; }
      // A Postgres error code means the data itself is rejected; give up after a few tries.
      // No code = network/auth hiccup, keep retrying.
      const attempts = (entry.attempts ?? 0) + (/^\d{5}$/.test(error.code ?? "") ? 1 : 0);
      if (attempts >= MAX_ATTEMPTS) {
        console.error("[offline-queue] dropping op after repeated rejections:", entry.table, entry.op, error);
        continue;
      }
      remaining.push({ ...entry, attempts });
    } catch {
      remaining.push(entry);
    }
  }

  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining)); } catch { /* storage unavailable */ }
  return synced;
}
