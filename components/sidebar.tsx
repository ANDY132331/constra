"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Clock, FolderKanban, CheckSquare, Calculator, Receipt,
  ClipboardList, Images, CalendarDays, ShieldAlert, Truck, MessageSquare,
  BarChart3, Settings, Search, HardHat, ChevronRight, Users, X,
  Package, FolderOpen, MessagesSquare, FileText, GitPullRequest, Layers,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { isForemanOrAbove, isAdminOrAbove } from "@/lib/permissions";

type NavDef = {
  href: string;
  labelKey: keyof ReturnType<typeof useT>["nav"];
  icon: React.ComponentType<{ size?: number; className?: string }>;
  /** Minimum access level required. Omit = everyone. */
  minLevel?: "foreman" | "admin";
  badge?: (pendingCount: number) => string | undefined;
};

const NAV_ITEMS: NavDef[] = [
  { href: "/dashboard",     labelKey: "dashboard",    icon: LayoutDashboard },
  { href: "/time-tracking", labelKey: "timeTracking", icon: Clock },
  { href: "/schedule",      labelKey: "schedule",     icon: CalendarDays },
  { href: "/safety",        labelKey: "safety",       icon: ShieldAlert },
  { href: "/messages",      labelKey: "messages",     icon: MessagesSquare },
  { href: "/photos",        labelKey: "photos",       icon: Images },
  // Foreman and above
  { href: "/projects",      labelKey: "projects",     icon: FolderKanban,  minLevel: "foreman",
    badge: (n) => n > 0 ? String(n) : undefined },
  { href: "/tasks",         labelKey: "tasks",        icon: CheckSquare,   minLevel: "foreman" },
  { href: "/punch-list",    labelKey: "punchList",    icon: ClipboardList, minLevel: "foreman" },
  { href: "/rfis",          labelKey: "rfis",         icon: MessageSquare, minLevel: "foreman" },
  { href: "/equipment",     labelKey: "equipment",    icon: Truck,         minLevel: "foreman" },
  { href: "/materials",     labelKey: "materials",    icon: Package,       minLevel: "foreman" },
  { href: "/documents",     labelKey: "documents",    icon: FolderOpen,    minLevel: "foreman" },
  // Admin only
  { href: "/crew",          labelKey: "crew",         icon: Users,         minLevel: "admin" },
  { href: "/reports",       labelKey: "reports",      icon: BarChart3,     minLevel: "admin" },
];

const FINANCE_ITEMS: NavDef[] = [
  { href: "/estimates", labelKey: "estimates", icon: Calculator, minLevel: "admin" },
  { href: "/invoices",  labelKey: "invoices",  icon: Receipt,    minLevel: "admin" },
];

// Hardcoded field ops items (avoids updating all 15 i18n locales)
const OPS_ITEMS: { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; minLevel?: "foreman" | "admin" }[] = [
  { href: "/blueprints",    label: "Blueprints",    icon: Layers,         minLevel: "foreman" },
  { href: "/daily-reports", label: "Daily Reports", icon: FileText,       minLevel: "foreman" },
  { href: "/change-orders", label: "Change Orders", icon: GitPullRequest, minLevel: "admin" },
];

export function Sidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { currentUser, projects } = useStore();
  const t = useT();

  const roleStr = currentUser.role;
  const isForeman = isForemanOrAbove(roleStr);
  const isAdmin = isAdminOrAbove(roleStr);

  const pendingCount = projects.filter((p) => p.pendingApproval).length;

  const canSee = (item: { href: string; minLevel?: "foreman" | "admin" }): boolean => {
    // If admin granted specific pages to this worker, use that list
    if (currentUser.grantedPages !== undefined) {
      return currentUser.grantedPages.includes(item.href);
    }
    // Otherwise fall back to role-based defaults
    if (!item.minLevel) return true;
    if (item.minLevel === "foreman") return isForeman;
    if (item.minLevel === "admin") return isAdmin;
    return true;
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const NavItem = ({
    href,
    label,
    icon: Icon,
    badge,
  }: {
    href: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badge?: string;
  }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        onClick={onClose}
        className={`group flex items-center gap-3 py-2 rounded-lg text-[13px] transition-all mb-0.5 ${
          active
            ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-400/70 pl-[10px] pr-3"
            : "text-white/45 hover:text-white/80 hover:bg-white/5 px-3"
        }`}
      >
        <Icon
          size={15}
          className={active ? "text-amber-400" : "text-white/30 group-hover:text-white/60 transition-colors"}
        />
        <span className="flex-1 font-medium">{label}</span>
        {badge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            active ? "bg-amber-500/25 text-amber-300" : "bg-amber-500/20 text-amber-400"
          }`}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const visibleNav = NAV_ITEMS.filter(canSee);
  const visibleFinance = FINANCE_ITEMS.filter(canSee);

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-50 flex flex-col w-[240px] min-w-[240px] h-full
      bg-[#0d0d0d] border-r border-white/[0.06] overflow-hidden
      transition-transform duration-200
      lg:static lg:translate-x-0 lg:z-auto
      ${open ? "translate-x-0" : "-translate-x-full"}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <HardHat size={15} className="text-black" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-white text-[15px] tracking-tight">Constra</span>
            <span className="text-[10px] text-white/30 font-medium tracking-wide">WORKFORCE OS</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-all"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-3 border-b border-white/[0.06] flex-shrink-0">
        <button
          onClick={() => {
            onClose?.();
            window.dispatchEvent(new CustomEvent("open-search"));
          }}
          className="w-full flex items-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.07] rounded-lg px-3 py-2 transition-colors text-left"
        >
          <Search size={13} className="text-white/30 flex-shrink-0" />
          <span className="text-[12px] text-white/25 flex-1">{t.common.search}…</span>
          <span className="text-[10px] bg-white/8 text-white/25 px-1.5 py-0.5 rounded font-mono hidden sm:block">⌘K</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.12em] px-3 mb-2">
          {t.nav.mainMenu}
        </p>
        {visibleNav.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={t.nav[item.labelKey]}
            icon={item.icon}
            badge={item.badge?.(pendingCount)}
          />
        ))}

        {visibleFinance.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/[0.06]">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.12em] px-3 mb-2">
              {t.nav.finance}
            </p>
            {visibleFinance.map((item) => (
              <NavItem key={item.href} href={item.href} label={t.nav[item.labelKey]} icon={item.icon} />
            ))}
          </div>
        )}

        {(() => {
          const visibleOps = OPS_ITEMS.filter(canSee);
          if (visibleOps.length === 0) return null;
          return (
            <div className="mt-4 pt-3 border-t border-white/[0.06]">
              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.12em] px-3 mb-2">Field Ops</p>
              {visibleOps.map((item) => (
                <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} />
              ))}
            </div>
          );
        })()}

        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <NavItem href="/settings" label={t.nav.settings} icon={Settings} />
        </div>
      </nav>

      {/* Role indicator */}
      <div className="px-4 py-2 flex-shrink-0">
        <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md w-fit ${
          isAdmin
            ? "bg-amber-500/15 text-amber-400"
            : isForeman
            ? "bg-blue-500/15 text-blue-400"
            : "bg-white/[0.05] text-white/30"
        }`}>
          {isAdmin ? "Admin" : isForeman ? "Foreman" : "Worker"}
        </div>
      </div>

      {/* User profile */}
      <div className="border-t border-white/[0.06] p-3 flex-shrink-0">
        <Link href="/settings" className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors">
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: currentUser.color + "33", color: currentUser.color }}
          >
            {currentUser.photo
              ? <img src={currentUser.photo} alt={currentUser.name} className="w-full h-full object-cover" />
              : currentUser.initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-semibold text-white/85 truncate">{currentUser.name}</p>
            <p className="text-[11px] text-white/35 truncate">{currentUser.customRole}</p>
          </div>
          <Settings size={13} className="text-white/20 flex-shrink-0" />
        </Link>
      </div>
    </aside>
  );
}
