"use client";

import { Capacitor } from "@capacitor/core";

/** True inside the Constra iOS/Android shell (Capacitor), false in a browser or installed PWA. */
export function isNativeApp(): boolean {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
}

export function geolocationAvailable(): boolean {
  return isNativeApp() || (typeof navigator !== "undefined" && !!navigator.geolocation);
}

type Success = (pos: GeolocationPosition) => void;
type Failure = (err: GeolocationPositionError) => void;

/**
 * Drop-in for navigator.geolocation.getCurrentPosition. In the native app it goes through the
 * Capacitor Geolocation plugin, which owns the iOS permission prompt (the WebView's own prompt
 * shows the bare domain and can be suppressed after one denial); elsewhere it is the browser API.
 */
export function getCurrentPosition(success: Success, failure?: Failure, options?: PositionOptions): void {
  if (!isNativeApp()) {
    navigator.geolocation.getCurrentPosition(success, failure, options);
    return;
  }
  void (async () => {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const perm = await Geolocation.checkPermissions().catch(() => null);
      if (perm && perm.location !== "granted") {
        const asked = await Geolocation.requestPermissions({ permissions: ["location"] });
        if (asked.location !== "granted") throw Object.assign(new Error("Location permission denied"), { code: 1 });
      }
      const p = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 15000,
        maximumAge: options?.maximumAge ?? 0,
      });
      success(p as unknown as GeolocationPosition);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = (e as { code?: number })?.code ?? (/denied|permission/i.test(msg) ? 1 : /timeout/i.test(msg) ? 3 : 2);
      failure?.({ code, message: msg, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
    }
  })();
}

/**
 * Save a generated file. Browsers get a normal download; the iOS WebView can't download, so the
 * native app writes the file to the cache and opens the share sheet (Save to Files, Mail, AirDrop).
 */
export async function saveFile(data: Blob | string, filename: string): Promise<void> {
  if (!isNativeApp()) {
    const url = typeof data === "string" ? data : URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    if (typeof data !== "string") setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }
  const blob = typeof data === "string" ? await fetch(data).then((r) => r.blob()) : data;
  const base64 = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
  const safe = filename.replace(/[\/:*?"<>|]+/g, "-");
  const { uri } = await Filesystem.writeFile({ path: safe, data: base64, directory: Directory.Cache });
  await Share.share({ title: safe, files: [uri] }).catch((e) => {
    // Closing the share sheet without picking anything is not an error.
    if (!/cancel/i.test(String(e?.message ?? e))) throw e;
  });
}

/** Keeps the iPhone clock and battery readable: dark text on the light theme, light text on dark. */
export function setNativeStatusBar(theme: "dark" | "light"): void {
  if (!isNativeApp()) return;
  void import("@capacitor/status-bar")
    .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: theme === "light" ? Style.Light : Style.Dark }))
    .catch(() => {});
}
