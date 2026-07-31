// Web Push subscription helpers (client-side only)

const PUSH_SUB_KEY = "constra_push_sub";

export function getPushPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}

export async function getOrCreatePushSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  if (Notification.permission !== "granted") return null;

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(getPushPublicKey()),
    });
    return sub;
  } catch {
    return null;
  }
}

export async function subscribeToPush(companyId: string, userId: string): Promise<boolean> {
  const sub = await getOrCreatePushSubscription();
  if (!sub) return false;

  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), companyId, userId }),
    });
    if (res.ok) localStorage.setItem(PUSH_SUB_KEY, JSON.stringify(sub.toJSON()));
    return res.ok;
  } catch {
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  }
  localStorage.removeItem(PUSH_SUB_KEY);
}

export async function sendPushEvent(payload: {
  companyId?: string;
  title: string;
  body: string;
  url?: string;
}): Promise<void> {
  // Get local subscription for self-push (works even without Supabase storing it)
  let subscription: object | null = null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) subscription = sub.toJSON();
  } catch {}

  fetch("/api/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, subscription }),
  }).catch(() => {});
}
