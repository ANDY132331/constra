"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, Search, Plus, ChevronDown, FolderKanban, Users, ClipboardList,
  FileText, ShieldAlert, Truck, X, CheckCheck, Menu, Settings, LogOut,
  User, Moon, Sun,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { isAdminOrAbove, isForemanOrAbove } from "@/lib/permissions";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/time-tracking": "Time Tracking",
  "/projects": "Projects",
  "/tasks": "Task List",
  "/punch-list": "Punch List",
  "/photos": "Photos & Files",
  "/schedule": "Schedule",
  "/rfis": "RFIs",
  "/safety": "Safety Log",
  "/equipment": "Equipment",
  "/crew": "Crew & Workers",
  "/materials": "Materials",
  "/documents": "Documents",
  "/messages": "Messages",
  "/reports": "Reports",
  "/estimates": "Estimates",
  "/invoices": "Invoices",
  "/daily-reports": "Daily Reports",
  "/change-orders": "Change Orders",
  "/blueprints": "Blueprints",
  "/settings": "Settings",
};

const ALL_QUICK_ADD = [
  { label: "Log Incident",  icon: ShieldAlert,  href: "/safety",     minLevel: "all" as const },
  { label: "New Project",   icon: FolderKanban, href: "/projects",   minLevel: "foreman" as const },
  { label: "Add Punch Item",icon: ClipboardList,href: "/punch-list", minLevel: "foreman" as const },
  { label: "Add Equipment", icon: Truck,        href: "/equipment",  minLevel: "foreman" as const },
  { label: "Add Worker",    icon: Users,        href: "/crew",       minLevel: "admin" as const },
  { label: "New Invoice",   icon: FileText,     href: "/invoices",   minLevel: "admin" as const },
];

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const handler = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, cb]);
}

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, activityFeed, isRealtimeConnected, companyName, companyLogo, signOut, theme, setTheme } = useStore();
  const isAdmin = isAdminOrAbove(currentUser.role);
  const isForeman = isForemanOrAbove(currentUser.role);
  const QUICK_ADD = ALL_QUICK_ADD.filter(({ minLevel }) =>
    minLevel === "all" || (minLevel === "foreman" && isForeman) || (minLevel === "admin" && isAdmin)
  );

  const base = "/" + pathname.split("/")[1];
  const title = PAGE_TITLES[base] ?? "Constra";

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-CA", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const [showNew,   setShowNew]   = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showUser,  setShowUser]  = useState(false);
  const [readNotifs, setReadNotifs] = useState(false);

  const newRef   = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);

  useClickOutside(newRef,   () => setShowNew(false));
  useClickOutside(notifRef, () => setShowNotif(false));
  useClickOutside(userRef,  () => setShowUser(false));

  const openSearch = () => window.dispatchEvent(new Event("open-search"));

  const hasUnread = !readNotifs && activityFeed.length > 0;

  const handleSignOut = async () => {
    setShowUser(false);
    await signOut();
    window.location.href = "/login";
  };

  return (
    <header className="h-14 border-b border-white/[0.06] bg-[#0d0d0d] flex items-center px-4 md:px-6 gap-3 flex-shrink-0 relative z-30">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="lg:hidden w-11 h-11 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.05] active:bg-white/[0.08] rounded-xl transition-all flex-shrink-0 -ml-1"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-[15px] font-semibold text-white/90 leading-none truncate">{title}</h1>
        <p className="text-[11px] text-white/30 mt-0.5 hidden sm:block">{dateStr}</p>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Quick Add */}
        <div ref={newRef} className="relative">
          <button
            onClick={() => { setShowNew((v) => !v); setShowNotif(false); setShowUser(false); }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 active:bg-amber-600 text-black text-[13px] font-bold px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-lg transition-all duration-100"
          >
            <Plus size={15} className="sm:hidden" />
            <Plus size={13} className="hidden sm:block" />
            <span className="hidden sm:inline">New</span>
            <ChevronDown size={11} className={`transition-transform ${showNew ? "rotate-180" : ""}`} />
          </button>

          {showNew && (
            <div className="pop-in absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/[0.10] rounded-xl shadow-2xl overflow-hidden z-50">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 px-4 pt-3 pb-2">Quick Add</p>
              {QUICK_ADD.map(({ label, icon: Icon, href }) => (
                <button
                  key={label}
                  onClick={() => { router.push(href); setShowNew(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
                >
                  <Icon size={14} className="text-amber-400 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search — wired to search modal */}
        <button
          onClick={openSearch}
          title="Search (⌘K)"
          className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.05] active:bg-white/[0.08] rounded-xl sm:rounded-lg transition-all"
        >
          <Search size={16} className="sm:hidden" />
          <Search size={15} className="hidden sm:block" />
        </button>

        {/* Theme toggle — desktop only; on mobile it lives in the user dropdown */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="hidden sm:flex w-8 h-8 items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.05] active:bg-white/[0.08] rounded-lg transition-all"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setShowNotif((v) => !v); setShowNew(false); setShowUser(false); if (!readNotifs) setReadNotifs(true); }}
            className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.05] rounded-xl sm:rounded-lg transition-all relative"
          >
            <Bell size={15} />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full ring-1 ring-[#0d0d0d]" />
            )}
          </button>

          {showNotif && (
            <div className="pop-in absolute right-0 top-full mt-2 w-80 bg-[#1a1a1a] border border-white/[0.10] rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/[0.06]">
                <p className="text-[13px] font-bold text-white">Notifications</p>
                <button onClick={() => setShowNotif(false)} className="text-white/30 hover:text-white/60 transition-colors">
                  <X size={14} />
                </button>
              </div>
              {activityFeed.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-white/25">
                  <CheckCheck size={28} className="opacity-40" />
                  <p className="text-[13px]">All caught up</p>
                  <p className="text-[11px] text-white/20">Activity from your projects will show here</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {activityFeed.slice(0, 15).map((event) => (
                    <div key={event.id} className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-white/70 leading-snug">{event.description}</p>
                        <p className="text-[10px] text-white/30 mt-0.5">
                          {event.timestamp.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} ·{" "}
                          {event.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Realtime status pill */}
        <div
          title={isRealtimeConnected ? "Live updates active" : "Offline"}
          className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-full transition-all flex-shrink-0 ${
            isRealtimeConnected
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-white/[0.04] border border-white/[0.06]"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isRealtimeConnected ? "bg-green-400 animate-pulse" : "bg-white/20"}`} />
          <span className={`text-[10px] font-semibold ${isRealtimeConnected ? "text-green-400" : "text-white/25"}`}>
            {isRealtimeConnected ? "Live" : "Offline"}
          </span>
        </div>

        <div className="w-px h-5 bg-white/10 mx-0.5 flex-shrink-0" />

        {/* Profile dropdown */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => { setShowUser((v) => !v); setShowNew(false); setShowNotif(false); }}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors"
          >
            <div
              className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: currentUser.color + "33", color: currentUser.color }}
            >
              {currentUser.photo
                ? <img src={currentUser.photo} alt={currentUser.name} className="w-full h-full object-cover" />
                : currentUser.initials}
            </div>
            <ChevronDown size={11} className={`text-white/30 transition-transform flex-shrink-0 ${showUser ? "rotate-180" : ""}`} />
          </button>

          {showUser && (
            <div className="pop-in absolute right-0 top-full mt-2 w-56 bg-[#1a1a1a] border border-white/[0.10] rounded-xl shadow-2xl overflow-hidden z-50">
              {/* User identity */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
                {companyLogo ? (
                  <img src={companyLogo} alt={companyName} className="w-8 h-8 rounded-lg object-contain bg-white/5" />
                ) : (
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ backgroundColor: currentUser.color + "33", color: currentUser.color }}
                  >
                    {currentUser.initials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-white/40 truncate">{companyName}</p>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { router.push("/crew"); setShowUser(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
                >
                  <User size={14} className="text-white/30" />
                  My Profile
                </button>
                <button
                  onClick={() => { router.push("/settings"); setShowUser(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
                >
                  <Settings size={14} className="text-white/30" />
                  Settings
                </button>
                {/* Theme toggle — visible on mobile where header button is hidden */}
                <button
                  onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setShowUser(false); }}
                  className="sm:hidden w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
                >
                  {theme === "dark" ? <Sun size={14} className="text-white/30" /> : <Moon size={14} className="text-white/30" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
              </div>

              <div className="border-t border-white/[0.06] py-1">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/40 hover:text-red-400 hover:bg-red-500/[0.07] transition-colors text-left"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
