"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Clock, MessagesSquare, Images, ShieldAlert,
} from "lucide-react";
import { useStore } from "@/lib/store";

const ITEMS = [
  { href: "/dashboard",     icon: LayoutDashboard, label: "Home"   },
  { href: "/time-tracking", icon: Clock,           label: "Clock"  },
  { href: "/messages",      icon: MessagesSquare,  label: "Chat"   },
  { href: "/photos",        icon: Images,          label: "Photos" },
  { href: "/safety",        icon: ShieldAlert,     label: "Safety" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { workers, currentUser } = useStore();

  const clockedIn = workers.find((w) => w.id === currentUser.id)?.clockedIn ?? false;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch"
      style={{ background: "#0d0d0d", borderTop: "1px solid rgba(255,255,255,0.07)" }}
    >
      {ITEMS.map(({ href, icon: Icon, label }, i) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        const isClockBtn = i === 1;

        if (isClockBtn) {
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center py-2 -mt-3">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                  clockedIn
                    ? "bg-green-500 shadow-green-500/30"
                    : active
                    ? "bg-amber-500 shadow-amber-500/30"
                    : "bg-amber-500/90 shadow-amber-500/20"
                }`}
              >
                <Icon size={26} className="text-black" />
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${
                clockedIn ? "text-green-400" : active ? "text-amber-400" : "text-amber-400/60"
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
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative ${
              active ? "text-amber-400" : "text-white/30"
            }`}
          >
            {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-amber-400" />}
            <Icon size={21} />
            <span className="text-[9px] font-semibold uppercase tracking-wider">{label}</span>
          </Link>
        );
      })}
      {/* iOS safe area */}
      <div className="absolute inset-x-0 -bottom-0 h-safe-bottom bg-[#0d0d0d]" style={{ height: "env(safe-area-inset-bottom)" }} />
    </nav>
  );
}
