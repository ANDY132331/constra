"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Download, X, Smartphone } from "lucide-react";

const PUBLIC_PREFIXES = ["/", "/login", "/onboarding", "/reset-password", "/terms", "/privacy", "/support", "/share", "/pay", "/delete-account", "/demo", "/co/"];
import { subscribeToPush } from "@/lib/push-client";
import { useStore } from "@/lib/store";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// ── Custom Tab / browser-mode detection banner ────────────────────────────────
// When the TWA's Digital Asset Link verification fails, Android falls back to
// Chrome Custom Tab (shows the X + URL bar). This banner detects that situation
// and guides users to add the real PWA to their home screen instead.
function CustomTabBanner() {
  const [visible, setVisible] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    try {
      const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
      const android = /Android/i.test(navigator.userAgent);
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as { standalone?: boolean }).standalone === true;
      const dismissed = localStorage.getItem("constra_ctab_v1") === "1";

      if (isMobile && !isStandalone && !dismissed) {
        // Delay so it doesn't flash during normal page load
        const t = setTimeout(() => { setIsAndroid(android); setVisible(true); }, 1800);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage blocked in some contexts
    }
  }, []);

  const dismiss = useCallback(() => {
    try { localStorage.setItem("constra_ctab_v1", "1"); } catch { /* */ }
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="pwa-banner fixed bottom-24 lg:bottom-6 left-4 right-4 z-[60] mx-auto max-w-sm">
      <div className="bg-[#1c1a18] border border-amber-500/25 rounded-2xl px-4 py-4 shadow-2xl shadow-black/60">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Smartphone size={16} className="text-black" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-white leading-tight mb-1">
              Get the full app experience
            </p>
            <p className="text-[11px] text-white/50 leading-snug mb-3">
              {isAndroid
                ? "Install the Android app for faster clock-ins and notifications."
                : "Add Constra to your home screen for the best experience."}
            </p>

            {isAndroid ? (
              <a
                href="https://play.google.com/store/apps/details?id=com.getconstra.app"
                target="_blank"
                rel="noopener noreferrer"
                onClick={dismiss}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-black bg-amber-500 hover:bg-amber-400 px-3 py-2 rounded-lg transition-colors"
              >
                Get it on Google Play
              </a>
            ) : (
              <p className="text-[11px] text-white/70">
                Tap <span className="font-bold text-white">Share</span> → <span className="font-bold text-white">Add to Home Screen</span> in Safari
              </p>
            )}
          </div>

          <button
            onClick={dismiss}
            className="w-9 h-9 flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.05] rounded-full transition-colors flex-shrink-0 -mt-1 -mr-1.5"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main install prompt (beforeinstallprompt — Chrome native) ─────────────────
export default function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { currentUser, companyId } = useStore();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV !== "production") {
        // Dev chunk URLs aren't content-hashed, so the SW's cache-first rule would serve stale CSS/JS.
        navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister())).catch(() => {});
        if ("caches" in window) caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      } else {
        navigator.serviceWorker.register("/sw.js").then(() => {
          if (typeof Notification !== "undefined" && Notification.permission === "granted" && companyId && currentUser?.id) {
            subscribeToPush(companyId, currentUser.id).catch(() => {});
          }
        }).catch(() => {});
      }
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [companyId, currentUser?.id]);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  }, [installPrompt]);

  const pathname = usePathname() ?? "/";
  const inApp = !PUBLIC_PREFIXES.some((p) => (p === "/" ? pathname === "/" : pathname.startsWith(p)));
  if (!inApp) return null;

  return (
    <>
      <CustomTabBanner />

      {/* Native Chrome install prompt (shown when app not yet installed) */}
      {!dismissed && installPrompt && (
        <div className="fixed bottom-24 lg:bottom-4 right-4 z-50 flex items-center gap-3 bg-[#1a1a1a] border border-white/[0.1] rounded-xl px-4 py-3 shadow-xl max-w-xs">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Download size={14} className="text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-white">Install Constra</p>
            <p className="text-[10px] text-white/40 mt-0.5">Add to home screen for quick access</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleInstall}
              className="text-[11px] font-bold text-black bg-amber-500 hover:bg-amber-400 px-2.5 py-1.5 rounded-lg transition-colors">
              Install
            </button>
            <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.05] rounded-full transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

