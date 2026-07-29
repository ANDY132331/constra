// Browser Notification API wrapper.
// Handles permission, dedup (tag-based auto-replace), and per-category prefs.

export type NotifCategory =
  | "clock"       // worker clocked in / out
  | "safety"      // safety incident logged
  | "rfi"         // new RFI submitted or updated
  | "task"        // task assigned or completed
  | "punch"       // new punch list item
  | "photo"       // photos uploaded
  | "project";    // project status changed

export type NotifPrefs = Record<NotifCategory, boolean>;

const PREFS_KEY = "constra_notif_prefs";
const SEEN_KEY  = "constra_notif_seen";

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_PREFS: NotifPrefs = {
  clock:   true,
  safety:  true,
  rfi:     true,
  task:    true,
  punch:   true,
  photo:   false,
  project: true,
};

export const CATEGORY_LABELS: Record<NotifCategory, { label: string; description: string }> = {
  clock:   { label: "Clock In / Out",     description: "When a worker clocks in or out" },
  safety:  { label: "Safety Incidents",   description: "When a safety incident is reported" },
  rfi:     { label: "RFIs",               description: "New requests for information" },
  task:    { label: "Task Updates",       description: "When a task is assigned to you or completed" },
  punch:   { label: "Punch List",         description: "New punch list items added" },
  photo:   { label: "Photos & Files",     description: "When new photos are uploaded" },
  project: { label: "Project Updates",    description: "Project status changes" },
};

// ── Prefs helpers ─────────────────────────────────────────────────────────────

export function loadPrefs(): NotifPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: NotifPrefs): void {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

// ── Dedup helpers ─────────────────────────────────────────────────────────────
// Prevent duplicate notifications when the same event arrives via Realtime
// shortly after the local optimistic update already fired a notification.

const DEDUP_TTL = 8_000; // 8 s

function hasSeen(id: string): boolean {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const ts = map[id];
    if (!ts) return false;
    if (Date.now() - ts > DEDUP_TTL) return false;
    return true;
  } catch {
    return false;
  }
}

function markSeen(id: string): void {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[id] = Date.now();
    // Prune old entries
    for (const k of Object.keys(map)) {
      if (Date.now() - map[k] > DEDUP_TTL * 10) delete map[k];
    }
    localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  } catch {}
}

// ── Permission ────────────────────────────────────────────────────────────────

export function getPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

// ── Core fire function ────────────────────────────────────────────────────────

export type NotifPayload = {
  category: NotifCategory;
  title: string;
  body: string;
  // tag: auto-replaces a notification with the same tag (prevents stacking)
  tag?: string;
  // dedupId: a stable ID used to suppress duplicate fires within DEDUP_TTL
  dedupId?: string;
  // requireInteraction: notification stays visible until dismissed (safety)
  requireInteraction?: boolean;
  // icon to show (defaults to /icon-192.png if present)
  icon?: string;
};

export function fireNotification(payload: NotifPayload): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  const prefs = loadPrefs();
  if (!prefs[payload.category]) return false;

  if (payload.dedupId) {
    if (hasSeen(payload.dedupId)) return false;
    markSeen(payload.dedupId);
  }

  try {
    const n = new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag ?? payload.category,
      requireInteraction: payload.requireInteraction ?? false,
      icon: payload.icon ?? "/icon-192.png",
      badge: "/icon-192.png",
      silent: false,
    });

    // Auto-close after 6 s (except safety which stays until dismissed)
    if (!payload.requireInteraction) {
      setTimeout(() => n.close(), 6_000);
    }

    // Click → focus the tab
    n.onclick = () => {
      window.focus();
      n.close();
    };

    return true;
  } catch {
    return false;
  }
}

// ── Typed helpers for each category ──────────────────────────────────────────

export function notifyClockIn(workerName: string, projectName: string, dedupId: string) {
  fireNotification({
    category: "clock",
    title: `${workerName} clocked in`,
    body: `Working on ${projectName}`,
    tag: `clock-in-${dedupId}`,
    dedupId: `ci-${dedupId}`,
  });
}

export function notifyClockOut(workerName: string, projectName: string, hoursStr: string, dedupId: string) {
  fireNotification({
    category: "clock",
    title: `${workerName} clocked out`,
    body: `${hoursStr} on ${projectName}`,
    tag: `clock-out-${dedupId}`,
    dedupId: `co-${dedupId}`,
  });
}

export function notifySafetyIncident(title: string, projectName: string, severity: string, dedupId: string) {
  fireNotification({
    category: "safety",
    title: `⚠️ Safety Incident: ${title}`,
    body: `${severity} · ${projectName}`,
    tag: `safety-${dedupId}`,
    dedupId: `safety-${dedupId}`,
    requireInteraction: true,
  });
}

export function notifyNewRFI(title: string, projectName: string, dedupId: string) {
  fireNotification({
    category: "rfi",
    title: `New RFI: ${title}`,
    body: `On project ${projectName}`,
    tag: `rfi-${dedupId}`,
    dedupId: `rfi-${dedupId}`,
  });
}

export function notifyTaskAssigned(taskName: string, projectName: string, dedupId: string) {
  fireNotification({
    category: "task",
    title: `Task assigned to you`,
    body: `"${taskName}" on ${projectName}`,
    tag: `task-${dedupId}`,
    dedupId: `task-${dedupId}`,
  });
}

export function notifyTaskDone(taskName: string, projectName: string, dedupId: string) {
  fireNotification({
    category: "task",
    title: `Task completed`,
    body: `"${taskName}" on ${projectName}`,
    tag: `task-done-${dedupId}`,
    dedupId: `task-done-${dedupId}`,
  });
}

export function notifyNewPunchItem(title: string, projectName: string, dedupId: string) {
  fireNotification({
    category: "punch",
    title: `New punch item`,
    body: `"${title}" on ${projectName}`,
    tag: `punch-${dedupId}`,
    dedupId: `punch-${dedupId}`,
  });
}

export function notifyPhotoUploaded(uploaderName: string, projectName: string, dedupId: string) {
  fireNotification({
    category: "photo",
    title: `New photos from ${uploaderName}`,
    body: `On project ${projectName}`,
    tag: `photo-${dedupId}`,
    dedupId: `photo-${dedupId}`,
  });
}

export function notifyProjectStatusChange(projectName: string, newStatus: string, dedupId: string) {
  fireNotification({
    category: "project",
    title: `Project status updated`,
    body: `${projectName} → ${newStatus}`,
    tag: `project-status-${dedupId}`,
    dedupId: `proj-${dedupId}`,
  });
}
