"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Clock, MessagesSquare,
  CalendarDays, FolderKanban, ClipboardList, BarChart3,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { isForemanOrAbove, isAdminOrAbove } from "@/lib/permissions";

type NavTab = { href: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; label: string; isClockBtn?: boolean };

export function MobileNav() {
  const pathname = usePathname();
  const { currentUser } = useStore();

  const isForeman = isForemanOrAbove(currentUser.role);
  const isAdmin = isAdminOrAbove(currentUser.role);
  const clockedIn = currentUser.clockedIn ?? false;

  const clockTab: NavTab = { href: "/time-tracking", icon: Clock, label: clockedIn ? "On Site" : "Clock", isClockBtn: true };

  let tabs: NavTab[];
  if (isAdmin) {
    tabs = [
      { href: "/dashboard",  icon: LayoutDashboard, label: "Home" },
      { href: "/projects",   icon: FolderKanban,    label: "Projects" },
      clockTab,
      { href: "/reports",    icon: BarChart3,       label: "Reports" },
      { href: "/messages",   icon: MessagesSquare,  label: "Chat" },
    ];
  } else if (isForeman) {
    tabs = [
      { href: "/dashboard",  icon: LayoutDashboard, label: "Home" },
      { href: "/projects",   icon: FolderKanban,    label: "Projects" },
      clockTab,
      { href: "/punch-list", icon: ClipboardList,   label: "Punch" },
      { href: "/messages",   icon: MessagesSquare,  label: "Chat" },
    ];
  } else {
    tabs = [
      { href: "/dashboard",  icon: LayoutDashboard, label: "Home" },
      { href: "/schedule",   icon: CalendarDays,    label: "Schedule" },
      clockTab,
      { href: "/projects",   icon: FolderKanban,    label: "Projects" },
      { href: "/messages",   icon: MessagesSquare,  label: "Chat" },
    ];
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40"
      style={{
        background: "rgba(7,7,7,0.97)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderTop: "1px solid rgba(245,158,11,0.14)",
        boxShadow: "0 -12px 48px rgba(0,0,0,0.75)",
        // Grow to fill the bottom safe-area so there is NO gap on any phone
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-stretch h-16">
        {tabs.map(({ href, icon: Icon, label, isClockBtn }) => {
          const active = pathname === href || pathname.startsWith(href + "/");

          if (isClockBtn) {
            return (
              <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center -mt-5">
                <div className="relative">
                  <div className={`absolute -inset-1.5 rounded-[18px] blur-sm transition-all ${clockedIn ? "bg-green-500/30" : "bg-amber-500/25"}`} />
                  {clockedIn && <div className="absolute -inset-1 rounded-2xl animate-ping bg-green-500/20" />}
                  <div className={`relative w-[54px] h-[54px] rounded-2xl flex items-center justify-center shadow-xl transition-all ${
                    clockedIn ? "bg-green-500 shadow-green-500/40" : "bg-amber-500 shadow-amber-500/30"
                  }`}>
                    <Icon size={24} className="text-black" strokeWidth={2.5} />
                  </div>
                </div>
                <span className={`text-[9px] font-black uppercase tracking-wider mt-1.5 ${clockedIn ? "text-green-400" : "text-amber-400/70"}`}>
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 relative ${active ? "text-amber-400 scale-[1.04]" : "text-white/25"}`}
            >
              {active && (
                <span className="absolute inset-x-2.5 top-1.5 bottom-1.5 rounded-xl bg-amber-500/10 border border-amber-500/15 -z-10 animate-[page-in_0.2s_ease_both]" />
              )}
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
              <span className={`text-[9px] uppercase tracking-wider transition-all duration-200 ${active ? "font-black" : "font-semibold"}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
