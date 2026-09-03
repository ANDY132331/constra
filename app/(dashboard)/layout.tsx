"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { SearchModal } from "@/components/search-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import { OfflineBanner } from "@/components/offline-banner";
import { NotifPermissionPrompt } from "@/components/notif-permission-prompt";
import { MobileNav } from "@/components/mobile-nav";
import { AIChatWidget } from "@/components/ai-chat-widget";
import { useStore } from "@/lib/store";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { RefreshCw } from "lucide-react";
import { I18nProvider } from "@/lib/i18n";
import { RTL_LOCALES } from "@/lib/i18n/locales";
import { isForemanOrAbove, isAdminOrAbove } from "@/lib/permissions";
import { SplashScreen } from "@/components/splash-screen";

// Pages that are always accessible regardless of role/grants
const ALWAYS_ALLOWED = ["/dashboard", "/time-tracking", "/safety", "/messages", "/photos", "/settings"];

// Default role-based access for pages that require elevation
// Workers can view: schedule, projects, punch-list (read-only enforced inside each page)
const PAGE_MIN_LEVEL: Record<string, "foreman" | "admin"> = {
  "/tasks": "foreman", "/rfis": "foreman", "/equipment": "foreman",
  "/materials": "foreman", "/documents": "foreman", "/blueprints": "foreman",
  "/daily-reports": "foreman",
  "/crew": "admin", "/reports": "admin", "/estimates": "admin",
  "/invoices": "admin", "/change-orders": "admin", "/budget": "admin",
};

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { language, onboarded, isLoading, currentUser, theme } = useStore();

  // Apply data-theme to <html> so CSS variables cascade everywhere
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    return () => { document.documentElement.removeAttribute("data-theme"); };
  }, [theme]);
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Allow MobileNav "More" tab to open sidebar via custom event
  useEffect(() => {
    const handler = () => setSidebarOpen(true);
    window.addEventListener("open-sidebar", handler);
    return () => window.removeEventListener("open-sidebar", handler);
  }, []);

  const handleRefresh = useCallback(async () => {
    await new Promise<void>((r) => setTimeout(r, 500));
    window.location.reload();
  }, []);
  const { pullY, refreshing } = usePullToRefresh(mainRef, handleRefresh);

  // ── Splash screen state ─────────────────────────────────────────────────────
  // Keep the SplashScreen mounted throughout loading so its CSS animation runs
  // continuously — no restart flash when auth resolves. When isLoading goes
  // false we wait ~900 ms (enough for the animation to finish its main beats)
  // then trigger the exit transition, and unmount 700 ms after that.
  const [splashExiting, setSplashExiting] = useState(false);
  const [splashGone,    setSplashGone]    = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const t1 = setTimeout(() => setSplashExiting(true), 900);
      const t2 = setTimeout(() => setSplashGone(true),    900 + 700);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isLoading]);
  // ───────────────────────────────────────────────────────────────────────────

  // Redirect to onboarding only after Supabase finishes loading (avoids false redirects)
  useEffect(() => {
    if (!isLoading && !onboarded) router.push("/onboarding");
  }, [onboarded, isLoading, router]);

  // Route guard — enforce grantedPages or role-based access
  useEffect(() => {
    if (isLoading || !onboarded) return;
    const base = "/" + pathname.split("/")[1];
    if (ALWAYS_ALLOWED.includes(base)) return;
    const isForeman = isForemanOrAbove(currentUser.role);
    const isAdmin = isAdminOrAbove(currentUser.role);
    if (isAdmin) return; // admins always have full access
    if (currentUser.grantedPages !== undefined) {
      if (!currentUser.grantedPages.includes(base)) router.replace("/dashboard");
      return;
    }
    const minLevel = PAGE_MIN_LEVEL[base];
    if (!minLevel) return;
    if (minLevel === "foreman" && !isForeman) router.replace("/dashboard");
    if (minLevel === "admin" && !isAdmin) router.replace("/dashboard");
  }, [pathname, isLoading, onboarded, currentUser, router]);

  // Set RTL direction on <html> element
  useEffect(() => {
    const dir = RTL_LOCALES.includes(language as never) ? "rtl" : "ltr";
    document.documentElement.setAttribute("dir", dir);
    return () => { document.documentElement.setAttribute("dir", "ltr"); };
  }, [language]);

  return (
    <>
      {/* ── App shell — only mount after auth resolves ── */}
      {!isLoading && onboarded && (
        <I18nProvider locale={language}>
          {pathname === "/messages" ? (
            /* ── Full-screen standalone messaging shell ── */
            <div className="h-[100dvh] w-screen overflow-hidden" style={{ background: "#070c18" }}>
              <ErrorBoundary>{children}</ErrorBoundary>
              <OfflineBanner />
              <NotifPermissionPrompt />
            </div>
          ) : (
            /* ── Standard dashboard shell ── */
            <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#0a0a0a]">
              {sidebarOpen && (
                <div
                  className="mobile-overlay fixed inset-0 z-40 bg-black/55 lg:hidden"
                  onClick={() => setSidebarOpen(false)}
                />
              )}
              <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
              <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
                <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-6 lg:pb-6 bg-[#0a0a0a]" style={{ paddingBottom: "calc(5rem + env(safe-area-inset-bottom))" }}>
                  {(pullY > 8 || refreshing) && (
                    <div
                      className="fixed left-0 right-0 z-30 flex items-center justify-center pointer-events-none lg:hidden"
                      style={{
                        top: 56,
                        transform: `translateY(${Math.min(pullY, 72) - 72}px)`,
                        opacity: Math.min(pullY / 36, 1),
                        transition: refreshing ? "none" : "transform 0.08s, opacity 0.08s",
                      }}
                    >
                      <div className="bg-[#1a1a1a] border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-2 shadow-xl">
                        <RefreshCw
                          size={13}
                          className={`text-amber-400 flex-shrink-0 ${refreshing ? "animate-spin" : ""}`}
                          style={{ transform: refreshing ? undefined : `rotate(${(pullY / 72) * 180}deg)` }}
                        />
                        <span className="text-[11px] text-white/50 font-medium">
                          {refreshing ? "Refreshing…" : pullY >= 72 ? "Release to refresh" : "Pull to refresh"}
                        </span>
                      </div>
                    </div>
                  )}
                  <div key={pathname} className="page-enter">
                    <ErrorBoundary>{children}</ErrorBoundary>
                  </div>
                </main>
              </div>
              <MobileNav />
              <AIChatWidget />
              <SearchModal />
              <OfflineBanner />
              <NotifPermissionPrompt />
            </div>
          )}
        </I18nProvider>
      )}

      {/* ── Splash overlay — stays mounted until exit animation completes ── */}
      {!splashGone && <SplashScreen exiting={splashExiting} />}
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <LayoutInner>{children}</LayoutInner>;
}
