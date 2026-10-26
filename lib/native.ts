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
