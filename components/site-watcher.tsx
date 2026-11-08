"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { getCurrentPosition, geolocationAvailable, isNativeApp } from "@/lib/native";
import { isAwayFromSite, leftFlag, metresBetween, returnedFlag } from "@/lib/site-presence";

/** How often to check while the app is open */
const CHECK_EVERY_MS = 3 * 60_000;
/** Two readings outside, this far apart, before calling it a departure: one bad GPS fix isn't */
const CONFIRM_AFTER_MS = 60_000;

/**
 * Notices when the person clocked in on this phone leaves their job's circle, and when they come
 * back. It runs while Constra is open or was recently, which is all a web app is allowed; a phone
 * with the app fully closed can't be followed, and the owner's view says so rather than implying
 * otherwise.
 */
export function SiteWatcher() {
  const { currentUser, clockEntries, projects, updateClockEntry } = useStore();
  const firstOutside = useRef<number | null>(null);
  const busy = useRef(false);

  const open = clockEntries
    .filter((e) => e.workerId === currentUser.id && !e.clockOut)
    .sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())[0];
  const project = open ? projects.find((p) => p.id === open.projectId) : undefined;
  const site = project?.gps;
  const radius = project?.geofenceRadius ?? 500;

  // Keep the latest values for the timer without restarting it on every store change
  const latest = useRef({ open, project, site, radius, updateClockEntry });
  useEffect(() => { latest.current = { open, project, site, radius, updateClockEntry }; });

  const watching = !!open && !!site;

  useEffect(() => {
    if (!watching || !geolocationAvailable()) return;
    firstOutside.current = null;

    const check = async () => {
      if (busy.current || document.visibilityState !== "visible") return;
      busy.current = true;
      // Never prompt from a background timer: only look if location is already allowed
      if (!(await locationAllowed())) { busy.current = false; return; }
      getCurrentPosition(
        (pos) => {
          busy.current = false;
          const { open, project, site, radius, updateClockEntry } = latest.current;
          if (!open || !project || !site) return;
          const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const metres = metresBetween(here, site);
          // A fuzzy fix gets the benefit of the doubt, up to 200 m of it
          const slack = Math.min(pos.coords.accuracy || 0, 200);
          const outside = metres > radius + slack;
          const away = isAwayFromSite(open);
          const now = Date.now();

          if (outside && !away) {
            const clearlyGone = metres > radius * 2 + slack + 500;
            if (firstOutside.current === null && !clearlyGone) { firstOutside.current = now; return; }
            if (!clearlyGone && now - (firstOutside.current ?? now) < CONFIRM_AFTER_MS) return;
            firstOutside.current = null;
            const at = new Date();
            updateClockEntry(open.id, { verificationFlags: [...(open.verificationFlags ?? []), leftFlag(project.name, metres, at)] });
            fetch("/api/push/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ event: "left-site", workerId: open.workerId, projectId: project.id, metres: Math.round(metres), at: at.toISOString(), clock: at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }),
            }).catch(() => {});
          } else if (!outside) {
            firstOutside.current = null;
            if (away) {
              const at = new Date();
              updateClockEntry(open.id, { verificationFlags: [...(open.verificationFlags ?? []), returnedFlag(project.name, at)] });
              fetch("/api/push/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event: "returned-site", workerId: open.workerId, projectId: project.id, at: at.toISOString(), clock: at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) }),
              }).catch(() => {});
            }
          }
        },
        () => { busy.current = false; },
        // A fresh fix every time: a cached one can be from before they walked off
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
      );
    };

    const run = () => { void check(); };
    const first = setTimeout(run, 15_000);
    const id = setInterval(run, CHECK_EVERY_MS);
    const confirm = setInterval(() => { if (firstOutside.current !== null) run(); }, CONFIRM_AFTER_MS + 5_000);
    const onVisible = () => { if (document.visibilityState === "visible") run(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(first); clearInterval(id); clearInterval(confirm);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [watching]);

  return null;
}

async function locationAllowed(): Promise<boolean> {
  try {
    if (isNativeApp()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      return (await Geolocation.checkPermissions()).location === "granted";
    }
    if (!navigator.permissions?.query) return false;
    return (await navigator.permissions.query({ name: "geolocation" })).state === "granted";
  } catch {
    return false;
  }
}
