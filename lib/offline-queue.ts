import type { SupabaseClient } from "@supabase/supabase-js";

const QUEUE_KEY = "constra_offline_queue";

export type QueuedOp = {
  id: string;
  table: string;
  op: "insert" | "update" | "delete";
  data?: Record<string, unknown>;
  eqId?: string;
  timestamp: number;
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
  const queue = getQueue();
  queue.push({ ...op, id: crypto.randomUUID(), timestamp: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function queueLength(): number {
  return getQueue().length;
}

export async function flushQueue(client: SupabaseClient): Promise<number> {
  const queue = getQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedOp[] = [];
  let synced = 0;

  for (const entry of queue) {
    try {
      let error: unknown = null;
      if (entry.op === "insert") {
        ({ error } = await client.from(entry.table).insert(entry.data!));
      } else if (entry.op === "update" && entry.eqId) {
        ({ error } = await client.from(entry.table).update(entry.data!).eq("id", entry.eqId));
      } else if (entry.op === "delete" && entry.eqId) {
        ({ error } = await client.from(entry.table).delete().eq("id", entry.eqId));
      }
      if (error) {
        console.warn("[offline-queue] op failed, keeping:", entry, error);
        remaining.push(entry);
      } else {
        synced++;
      }
    } catch {
      remaining.push(entry);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return synced;
}
