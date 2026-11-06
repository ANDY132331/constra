import type { SupabaseClient } from "@supabase/supabase-js";
import { dataUrlToBlob } from "@/lib/supabase/storage";

// Everything changed without a connection waits here, oldest first, and is replayed in order.
// Kept in IndexedDB: queued photos and files would blow localStorage's ~5 MB limit within a day
// on site. `memory` mirrors it because screens need the pending count synchronously.

const LEGACY_KEY = "constra_offline_queue";
const DB_NAME = "constra-offline";
const STORE = "ops";

export type QueuedOp = {
  id: string;
  /** Replay order. */
  seq: number;
  /** A database table, or the /api route for op "post". */
  table: string;
  op: "insert" | "update" | "delete" | "post";
  data?: Record<string, unknown>;
  eqId?: string;
  timestamp: number;
  attempts?: number;
};

export type NewOp = Pick<QueuedOp, "table" | "op" | "data" | "eqId">;

// Columns that hold a file. A value still in data: form was captured offline: it goes to Storage
// first and the row gets the link, so the database never fills up with base64.
const FILE_COLUMNS: Record<string, { column: string; bucket: string }> = {
  clock_entries: { column: "clock_in_photo_url", bucket: "clock-photos" },
  photos: { column: "url", bucket: "photos" },
  documents: { column: "data_url", bucket: "documents" },
};

function fileField(op: Pick<QueuedOp, "table" | "data">) {
  const field = FILE_COLUMNS[op.table];
  const value = field && op.data?.[field.column];
  return typeof value === "string" && value.startsWith("data:") ? { ...field, value } : null;
}

/** True when this write carries a file that must reach Storage before the row is written. */
export function hasUnsentFile(op: NewOp): boolean {
  return fileField(op) !== null;
}

// ── Storage ───────────────────────────────────────────────────────────────────

let memory: QueuedOp[] = [];
let lastSeq = 0;
let loading: Promise<void> | null = null;
/** Queued this moment and not on disk yet, so a re-read mustn't mistake them for already sent. */
const saving = new Set<string>();

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: "id" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const saveOp = (op: QueuedOp) => withStore("readwrite", (s) => s.put(op));
const savedOps = () => withStore("readonly", (s) => s.getAll() as IDBRequest<QueuedOp[]>);
const deleteOp = (id: string) => withStore("readwrite", (s) => s.delete(id)).catch(() => {});

/** Reads the saved queue. Safe to call repeatedly; the work happens once. */
export function loadQueue(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!loading) loading = (async () => {
    let saved: QueuedOp[] = [];
    try { saved = await savedOps(); } catch { /* unavailable */ }

    // Changes queued by the previous version of the app, which used localStorage
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? "[]") as Omit<QueuedOp, "seq">[];
      const moved = legacy.map((op, i) => ({ ...op, seq: op.timestamp * 1000 + i }));
      await Promise.all(moved.map(saveOp));
      saved = [...saved, ...moved];
      localStorage.removeItem(LEGACY_KEY);
    } catch { /* nothing to move, or it stays for next time */ }

    const queuedMeanwhile = memory.filter((m) => !saved.some((s) => s.id === m.id));
    memory = [...saved, ...queuedMeanwhile].sort((a, b) => a.seq - b.seq);
  })();
  return loading;
}

/** Resolves false when the change could not be stored — the caller must tell the user. */
export async function enqueue(op: NewOp): Promise<boolean> {
  lastSeq = Math.max(Date.now() * 1000, lastSeq + 1);
  const entry: QueuedOp = { ...op, id: crypto.randomUUID(), seq: lastSeq, timestamp: Date.now() };
  memory.push(entry);
  saving.add(entry.id);
  // Ask the browser not to evict site data; on iPhone it can otherwise clear it after 7 idle days
  void navigator.storage?.persist?.().catch(() => {});
  try {
    await saveOp(entry);
    return true;
  } catch {
    // Out of storage or storage blocked. The change is only on screen, so it is gone.
    memory = memory.filter((m) => m.id !== entry.id);
    return false;
  } finally {
    saving.delete(entry.id);
  }
}

export function queueLength(): number {
  return memory.length;
}

// ── Capturing writes ──────────────────────────────────────────────────────────

/**
 * A stand-in for the Supabase client that notes the write a store action would make instead of
 * making it, so every action can be queued without its own queue code. `op()` is null for a call
 * shape it can't replay; the caller then says the change wasn't saved rather than losing it quietly.
 */
export function writeRecorder() {
  let recorded: NewOp | null = null;
  let replayable = true;
  const chain = {
    eq(column: string, value: string) {
      if (recorded && column === "id") recorded.eqId = value;
      else replayable = false;
      return chain;
    },
  };
  const client = {
    from: (table: string) => ({
      insert(data: Record<string, unknown>) { recorded = { table, op: "insert", data }; return chain; },
      update(data: Record<string, unknown>) {
        // Avatars aren't kept in the saved copy of the data either, so null here after an offline
        // reload means "not loaded", not "remove it"
        const { photo_url, ...rest } = data;
        recorded = { table, op: "update", data: table === "profiles" && photo_url == null ? rest : data };
        return chain;
      },
      delete() { recorded = { table, op: "delete" }; return chain; },
    }),
  };
  return { client, op: () => (replayable ? recorded : null) };
}

// ── Replaying ─────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
let flushing: Promise<FlushResult> | null = null;

export type FlushResult = {
  synced: number;
  /** Changes the server refused for good. These are lost, so the user has to be told. */
  dropped: { table: string; op: QueuedOp["op"]; reason: string }[];
};

// Only one flush at a time — overlapping flushes would replay the same inserts.
export function flushQueue(client: SupabaseClient): Promise<FlushResult> {
  if (!flushing) flushing = runFlush(client).finally(() => { flushing = null; });
  return flushing;
}

type Sent = { ok: true } | { wait: true } | { refused: string };

const isConnectionError = (message?: string) => /fetch|network|load failed|timeout|abort/i.test(message ?? "");

function classify(error: { code?: string; message?: string }): Sent {
  // No code, or an expired session: the server never judged the data, so nothing is lost by waiting
  if (!error.code || /^PGRST30/.test(error.code) || isConnectionError(error.message)) return { wait: true };
  return { refused: error.message ?? error.code };
}

async function send(client: SupabaseClient, entry: QueuedOp): Promise<Sent> {
  if (entry.op === "post") {
    const res = await fetch(entry.table, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry.data ?? {}) });
    if (res.ok) return { ok: true };
    return res.status === 401 || res.status >= 500 ? { wait: true } : { refused: `${entry.table} answered ${res.status}` };
  }
  if ((entry.op === "update" || entry.op === "delete") && !entry.eqId) return { refused: "missing row id" };

  const file = fileField(entry);
  if (file) {
    const { blob, mime } = dataUrlToBlob(file.value);
    const ext = mime.split("/")[1]?.split(/[+;]/)[0] ?? "bin";
    // Named after the queue entry so a retry finds the same file instead of uploading a copy
    const path = `${entry.data?.company_id}/offline-${entry.id}.${ext}`;
    const { error } = await client.storage.from(file.bucket).upload(path, blob, { contentType: mime, upsert: false });
    if (error && !/exists|duplicate/i.test(error.message)) {
      return isConnectionError(error.message) ? { wait: true } : { refused: error.message };
    }
    entry.data = { ...entry.data, [file.column]: client.storage.from(file.bucket).getPublicUrl(path).data.publicUrl };
    await saveOp(entry).catch(() => {});
  }

  let result: { error: { code?: string; message?: string } | null };
  if (entry.op === "insert") result = await client.from(entry.table).insert(entry.data!);
  else if (entry.op === "update") result = await client.from(entry.table).update(entry.data!).eq("id", entry.eqId!);
  else result = await client.from(entry.table).delete().eq("id", entry.eqId!);

  // 23505 = already inserted by an earlier attempt that lost its response
  if (!result.error || result.error.code === "23505") return { ok: true };
  return classify(result.error);
}

async function runFlush(client: SupabaseClient): Promise<FlushResult> {
  await loadQueue();
  // Another tab may have sent some of these; replaying its old updates would undo newer edits
  try {
    const onDisk = await savedOps();
    memory = [...onDisk, ...memory.filter((m) => saving.has(m.id) && !onDisk.some((d) => d.id === m.id))].sort((a, b) => a.seq - b.seq);
  } catch { /* unavailable: memory is all there is */ }
  const dropped: FlushResult["dropped"] = [];
  let synced = 0;
  const forget = async (id: string) => {
    memory = memory.filter((m) => m.id !== id);
    await deleteOp(id);
  };

  for (const entry of [...memory]) {
    let sent: Sent;
    try { sent = await send(client, entry); } catch { sent = { wait: true }; }

    if ("ok" in sent) { await forget(entry.id); synced++; continue; }
    // Later changes may build on this one (a task on a new project), so keep the order and stop
    if ("wait" in sent) break;

    entry.attempts = (entry.attempts ?? 0) + 1;
    if (entry.attempts >= MAX_ATTEMPTS) {
      console.error("[offline-queue] dropping change after repeated rejections:", entry.table, entry.op, sent.refused);
      dropped.push({ table: entry.table, op: entry.op, reason: sent.refused });
      await forget(entry.id);
    } else {
      await saveOp(entry).catch(() => {});
    }
  }
  return { synced, dropped };
}
