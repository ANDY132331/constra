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

/** Returns false when the change could not be stored — the caller must tell the user. */
export function enqueue(op: Omit<QueuedOp, "id" | "timestamp">): boolean {
  try {
    const queue = getQueue();
    queue.push({ ...op, id: crypto.randomUUID(), timestamp: Date.now() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    // Out of storage or storage blocked. The change is only on screen, so it is gone.
    return false;
  }
}

export function queueLength(): number {
  return getQueue().length;
}

const MAX_ATTEMPTS = 5;
let flushing: Promise<FlushResult> | null = null;

export type FlushResult = {
  synced: number;
  /** Changes the database refused for good. These are lost, so the user has to be told. */
  dropped: { table: string; op: QueuedOp["op"]; reason: string }[];
};

// Only one flush at a time — overlapping flushes would replay the same inserts.
export function flushQueue(client: SupabaseClient): Promise<FlushResult> {
  if (!flushing) flushing = runFlush(client).finally(() => { flushing = null; });
  return flushing;
}

async function runFlush(client: SupabaseClient): Promise<FlushResult> {
  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, dropped: [] };

  const remaining: QueuedOp[] = [];
  const dropped: FlushResult["dropped"] = [];
  let synced = 0;

  for (const entry of queue) {
    if ((entry.op === "update" || entry.op === "delete") && !entry.eqId) {
      dropped.push({ table: entry.table, op: entry.op, reason: "missing row id" });
      continue; // malformed, can never apply
    }
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
        dropped.push({ table: entry.table, op: entry.op, reason: error.message ?? "rejected" });
        continue;
      }
      remaining.push({ ...entry, attempts });
    } catch {
      remaining.push(entry);
    }
  }

  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining)); } catch { /* storage unavailable */ }
  return { synced, dropped };
}
