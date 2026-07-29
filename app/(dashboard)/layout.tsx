"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { SearchModal } from "@/components/search-modal";
import { ErrorBoundary } from "@/components/error-boundary";
import { OfflineBanner } from "@/components/offline-banner";
import { NotifPermissionPrompt } from "@/components/notif-permission-prompt";
import { useStore } from "@/lib/store";
import { I18nProvider } from "@/lib/i18n";
import { RTL_LOCALES } from "@/lib/i18n/locales";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { language, onboarded, isLoading } = useStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect to onboarding only after Supabase finishes loading (avoids false redirects)
  useEffect(() => {
    if (!isLoading && !onboarded) router.push("/onboarding");
  }, [onboarded, isLoading, router]);

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
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0a0a0a]">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>
        </div>
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
