"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Clock, MessagesSquare, ShieldAlert, LifeBuoy,
} from "lucide-react";
import { useStore } from "@/lib/store";

const ITEMS = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Home"    },
  { href: "/time-tracking", icon: Clock,           label: "Clock"   },
  { href: "/messages",      icon: MessagesSquare,  label: "Chat"    },
  { href: "/safety",        icon: ShieldAlert,     label: "Safety"  },
  { href: "/support",       icon: LifeBuoy,        label: "Support" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { workers, currentUser } = useStore();

  const clockedIn = workers.find((w) => w.id === currentUser.id)?.clockedIn ?? false;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch"
      style={{
        background: "rgba(7, 7, 7, 0.97)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderTop: "1px solid rgba(245, 158, 11, 0.14)",
        boxShadow: "0 -12px 48px rgba(0,0,0,0.75), 0 -1px 0 rgba(245,158,11,0.05)",
      }}
    >
      {ITEMS.map(({ href, icon: Icon, label }, i) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        const isClockBtn = i === 1;

        if (isClockBtn) {
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center py-2 -mt-4">
              <div className="relative">
                {/* Outer glow ring */}
                <div
                  className={`absolute -inset-1.5 rounded-[18px] blur-sm transition-all ${
                    clockedIn ? "bg-green-500/30" : "bg-amber-500/25"
                  }`}
                />
                {/* Pulsing ring when clocked in */}
                {clockedIn && (
                  <div className="absolute -inset-1 rounded-2xl animate-ping bg-green-500/20" />
                )}
                <div
                  className={`relative w-[54px] h-[54px] rounded-2xl flex items-center justify-center shadow-xl transition-all ${
                    clockedIn
                      ? "bg-green-500 shadow-green-500/40"
                      : active
                      ? "bg-amber-500 shadow-amber-500/50"
                      : "bg-amber-500 shadow-amber-500/30"
                  }`}
                >
                  <Icon size={24} className="text-black" strokeWidth={2.5} />
                </div>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-wider mt-1.5 ${
                clockedIn ? "text-green-400" : "text-amber-400/70"
              }`}>
                {clockedIn ? "On Site" : "Clock"}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all relative ${
              active ? "text-amber-400" : "text-white/25"
            }`}
          >
            {/* Pill background for active state */}
            {active && (
              <span className="absolute inset-x-2.5 top-2 bottom-2 rounded-xl bg-amber-500/10 border border-amber-500/15 -z-10" />
            )}
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            <span className={`text-[9px] uppercase tracking-wider ${active ? "font-black" : "font-semibold"}`}>{label}</span>
          </Link>
        );
      })}
      {/* iOS safe area */}
      <div className="absolute inset-x-0 -bottom-0 bg-[#070707]" style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
