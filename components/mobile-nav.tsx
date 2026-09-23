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
  const { currentUser } = useStore();

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
        background: "rgba(7,7,7,0.96)",
        backdropFilter: "blur(40px) saturate(200%) brightness(0.92)",
        WebkitBackdropFilter: "blur(40px) saturate(200%) brightness(0.92)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 -1px 0 rgba(255,255,255,0.06), 0 -2px 0 rgba(245,196,0,0.04), 0 -24px 72px rgba(0,0,0,0.92)",
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
                {/* Glow halo */}
                <div
                  className="absolute rounded-full blur-xl pointer-events-none"
                  style={{
                    width: 64, height: 64,
                    background: clockedIn
                      ? "rgba(34,197,94,0.35)"
                      : "rgba(245,196,0,0.28)",
                    marginTop: -9,
                  }}
                />
                {/* Pulse ring when clocked in */}
                {clockedIn && (
                  <div
                    className="absolute rounded-full animate-ping pointer-events-none"
                    style={{ width: 58, height: 58, background: "rgba(34,197,94,0.18)", marginTop: -9 }}
                  />
                )}
                {/* Button disc */}
                <div
                  className="relative flex items-center justify-center rounded-[22px] shadow-2xl"
                  style={{
                    width: 54, height: 54,
                    background: clockedIn
                      ? "linear-gradient(145deg, #22c55e, #16a34a)"
                      : "linear-gradient(145deg, #F5C400, #d4a900)",
                    boxShadow: clockedIn
                      ? "0 8px 28px rgba(34,197,94,0.5), 0 2px 6px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)"
                      : "0 8px 28px rgba(245,196,0,0.45), 0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
                  }}
                >
                  <Icon size={22} className="text-black" strokeWidth={2.5} />
                </div>
                <span
                  className="text-[9px] font-black uppercase tracking-wider mt-2"
                  style={{ color: clockedIn ? "#4ade80" : "#F5C400" }}
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
                className="flex-1 flex flex-col items-center justify-center gap-[5px] transition-opacity duration-100"
                style={{ color: "rgba(255,255,255,0.28)" }}
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
              style={{ color: active ? "#F5C400" : "rgba(255,255,255,0.28)" }}
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
                    background: "linear-gradient(90deg, #F5C400, #fada4a)",
                    boxShadow: "0 1px 8px rgba(245,196,0,0.7)",
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
