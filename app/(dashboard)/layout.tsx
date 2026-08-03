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
import { useStore } from "@/lib/store";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { RefreshCw } from "lucide-react";
import { I18nProvider } from "@/lib/i18n";
import { RTL_LOCALES } from "@/lib/i18n/locales";
import { isForemanOrAbove, isAdminOrAbove } from "@/lib/permissions";

// Pages that are always accessible regardless of role/grants
const ALWAYS_ALLOWED = ["/dashboard", "/time-tracking", "/safety", "/messages", "/photos", "/settings"];

// Default role-based access for pages that require elevation
const PAGE_MIN_LEVEL: Record<string, "foreman" | "admin"> = {
  "/schedule": "foreman", "/projects": "foreman", "/tasks": "foreman",
  "/punch-list": "foreman", "/rfis": "foreman", "/equipment": "foreman",
  "/materials": "foreman", "/documents": "foreman", "/blueprints": "foreman",
  "/daily-reports": "foreman",
  "/crew": "admin", "/reports": "admin", "/estimates": "admin",
  "/invoices": "admin", "/change-orders": "admin",
};

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { language, onboarded, isLoading, currentUser } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const handleRefresh = useCallback(async () => {
    await new Promise<void>((r) => setTimeout(r, 500));
    window.location.reload();
  }, []);
  const { pullY, refreshing } = usePullToRefresh(mainRef, handleRefresh);

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

  if (isLoading) return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#0a0a0a]">
      {/* Sidebar skeleton */}
      <div className="hidden lg:flex flex-col w-56 border-r border-white/[0.05] p-4 gap-3 shrink-0">
        <div className="h-9 w-32 bg-white/[0.04] rounded-xl mb-4 animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 bg-white/[0.03] rounded-lg animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
        ))}
      </div>
      {/* Main area skeleton */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="h-14 border-b border-white/[0.05] bg-[#0d0d0d] px-6 flex items-center gap-3">
          <div className="h-7 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="ml-auto h-7 w-7 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>
        <div className="flex-1 p-6 space-y-4">
          <div className="h-8 w-40 bg-white/[0.04] rounded-xl animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-white/[0.03] rounded-xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
          <div className="h-48 bg-white/[0.03] rounded-xl animate-pulse" />
          <div className="h-32 bg-white/[0.03] rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );

  if (!onboarded) return null;

  return (
    <I18nProvider locale={language}>
      <div className="flex h-[100dvh] w-screen overflow-hidden bg-[#0a0a0a]">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
          <main ref={mainRef} className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 lg:pb-6 bg-[#0a0a0a]">
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
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
        <MobileNav />
        <SearchModal />
        <OfflineBanner />
        <NotifPermissionPrompt />
      </div>
    </I18nProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <LayoutInner>{children}</LayoutInner>;
}
