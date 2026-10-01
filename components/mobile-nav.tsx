"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Clock, MessagesSquare,
  CalendarDays, FolderKanban, CheckSquare,
  Receipt, MoreHorizontal,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { isForemanOrAbove, isAdminOrAbove } from "@/lib/permissions";

type NavTab = {
  href?: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  isClockBtn?: boolean;
  isMore?: boolean;
};

export function MobileNav() {
  const pathname = usePathname();
  const { currentUser, theme } = useStore();
  const dk = theme !== "light";
  const idle = dk ? "rgba(236,234,229,0.5)" : "#5B5D60";
  const activeColor = dk ? "#F5C400" : "#151617";

  const isForeman = isForemanOrAbove(currentUser.role);
  const isAdmin = isAdminOrAbove(currentUser.role);
  const clockedIn = currentUser.clockedIn ?? false;

  const clockTab: NavTab = {
    href: "/time-tracking",
    icon: Clock,
    label: clockedIn ? "On Site" : "Clock In",
    isClockBtn: true,
  };
  const moreTab: NavTab = { icon: MoreHorizontal, label: "More", isMore: true };

  let tabs: NavTab[];
  if (isAdmin) {
    tabs = [
      { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
      { href: "/invoices",  icon: Receipt,         label: "Invoices" },
      clockTab,
      { href: "/projects",  icon: FolderKanban,    label: "Projects" },
      moreTab,
    ];
  } else if (isForeman) {
    tabs = [
      { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
      { href: "/tasks",     icon: CheckSquare,     label: "Tasks" },
      clockTab,
      { href: "/projects",  icon: FolderKanban,    label: "Projects" },
      moreTab,
    ];
  } else {
    tabs = [
      { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
      { href: "/messages",  icon: MessagesSquare,  label: "Chat" },
      clockTab,
      { href: "/projects",  icon: FolderKanban,    label: "Projects" },
      moreTab,
    ];
  }

  const openSidebar = () => window.dispatchEvent(new CustomEvent("open-sidebar"));

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40"
      style={{
        background: dk ? "rgba(20,21,22,0.97)" : "rgba(245,244,241,0.97)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderTop: dk ? "1px solid rgba(236,234,229,0.08)" : "1px solid rgba(21,22,23,0.14)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-stretch" style={{ height: 62 }}>
        {tabs.map(({ href, icon: Icon, label, isClockBtn, isMore }) => {
          const active = href
            ? pathname === href || pathname.startsWith(href + "/")
            : false;

          /* ── Centre clock/clock-out button ── */
          if (isClockBtn && href) {
            return (
              <Link
                key={label}
                href={href}
                className="flex-1 flex flex-col items-center justify-center"
                style={{ marginTop: -18 }}
              >
                {/* Pulse ring when clocked in */}
                {clockedIn && (
                  <div
                    className="absolute rounded-full animate-ping pointer-events-none"
                    style={{ width: 58, height: 58, background: "rgba(34,197,94,0.18)", marginTop: -9 }}
                  />
                )}
                {/* Button disc */}
                <div
                  className="relative flex items-center justify-center rounded-[14px]"
                  style={{
                    width: 54, height: 54,
                    background: clockedIn ? "#22c55e" : "#F5C400",
                    boxShadow: "inset 0 0 0 1.5px #1A1600, 0 3px 0 #1A1600",
                  }}
                >
                  <Icon size={22} className="text-black" strokeWidth={2.5} />
                </div>
                <span
                  className="text-[9px] font-black uppercase tracking-wider mt-2"
                  style={{ color: clockedIn ? "#16a34a" : activeColor }}
                >
                  {label}
                </span>
              </Link>
            );
          }

          /* ── More / sidebar button ── */
          if (isMore) {
            return (
              <button
                key={label}
                onClick={openSidebar}
                aria-label="Open menu"
                className="flex-1 flex flex-col items-center justify-center gap-[5px] transition-opacity duration-100"
                style={{ color: idle }}
              >
                <Icon size={22} strokeWidth={1.6} />
                <span className="text-[9px] font-semibold uppercase tracking-wider">{label}</span>
              </button>
            );
          }

          /* ── Regular tab ── */
          return (
            <Link
              key={label}
              href={href!}
              className="flex-1 flex flex-col items-center justify-center gap-[5px] relative transition-all duration-150 active:scale-95 active:opacity-70"
              style={{ color: active ? activeColor : idle }}
            >
              {/* Active indicator — thin line at top */}
              {active && (
                <span
                  className="absolute top-0 rounded-b-full"
                  style={{
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 28,
                    height: 3,
                    background: "#F5C400",
                  }}
                />
              )}
              <span
                className="transition-transform duration-150 flex"
                style={{ transform: active ? "scale(1.08)" : "scale(1)" }}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
              </span>
              <span
                className="text-[9px] uppercase tracking-wider transition-all duration-150"
                style={{ fontWeight: active ? 800 : 500 }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
