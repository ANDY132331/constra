"use client";

import { useState, useEffect } from "react";
import {
  Users, Clock, FolderKanban, ClipboardList,
  TrendingUp, TrendingDown, ArrowRight, MapPin, Calendar,
  AlertTriangle, CheckCircle2, Circle, Timer,
  Activity, MessageSquare, FileText, Image as ImageIcon, Camera,
  RefreshCw, Mail, DollarSign, Cloud, Sun, CloudRain, Wind,
  Plus, GitPullRequest, Zap, BanknoteIcon, ReceiptText,
  LogIn, LogOut,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { formatCurrencyCompact } from "@/lib/currency";
import type { Worker, Project, Invoice } from "@/lib/mock-data";
import Link from "next/link";
import { DailyBriefCard } from "@/components/daily-brief-card";
import { ErrorBoundary } from "@/components/error-boundary";
import { isForemanOrAbove } from "@/lib/permissions";

// ── Weather ────────────────────────────────────────────────────────────────────

type ForecastDay = { date: string; code: number; high: number; low: number; rainChance: number };
type WeatherData = { temp: number; code: number; windspeed: number; forecast: ForecastDay[] } | null;

function weatherMeta(code: number): { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string } {
  if (code === 0)                                                return { label: "Clear",        icon: Sun,       color: "#f59e0b" };
  if (code <= 3)                                                 return { label: "Partly Cloudy",icon: Cloud,     color: "#94a3b8" };
  if (code <= 48)                                                return { label: "Foggy",        icon: Cloud,     color: "#6b7280" };
  if (code <= 67 || (code >= 80 && code <= 82))                 return { label: "Rain",         icon: CloudRain, color: "#60a5fa" };
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { label: "Snow",         icon: Cloud,     color: "#bfdbfe" };
  return                                                               { label: "Thunderstorm",  icon: Zap,       color: "#a78bfa" };
}

function useWeather(useFahrenheit: boolean): WeatherData {
  const [weather, setWeather] = useState<WeatherData>(null);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const { latitude: lat, longitude: lon } = coords;
      const unit = useFahrenheit ? "&temperature_unit=fahrenheit&wind_speed_unit=mph" : "";
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto${unit}`
      )
        .then((r) => r.json())
        .then((d) => {
          const daily = d.daily ?? {};
          const forecast: ForecastDay[] = (daily.time ?? []).map((date: string, i: number) => ({
            date,
            code: daily.weathercode?.[i] ?? 0,
            high: Math.round(daily.temperature_2m_max?.[i] ?? 0),
            low: Math.round(daily.temperature_2m_min?.[i] ?? 0),
            rainChance: daily.precipitation_probability_max?.[i] ?? 0,
          }));
          setWeather({
            temp: Math.round(d.current_weather.temperature),
            code: d.current_weather.weathercode,
            windspeed: Math.round(d.current_weather.windspeed),
            forecast: forecast.slice(0, 7),
          });
        })
        .catch(() => {});
    }, () => {});
  }, [useFahrenheit]);
  return weather;
}

// ── Invoice helper ─────────────────────────────────────────────────────────────

function invoiceTotal(inv: Invoice): number {
  const sub = inv.items.reduce((s, i) => s + i.qty * i.rate, 0);
  return sub * (1 + inv.taxRate / 100);
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, iconColor, trend, href,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconColor: string;
  trend?: { direction: "up" | "down"; value: string; positive?: boolean };
  href?: string;
}) {
  const inner = (
    <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-colors overflow-hidden relative">
      <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-xl opacity-40" style={{ backgroundColor: iconColor }} />
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconColor + "18" }}>
          <span style={{ color: iconColor }}><Icon size={17} /></span>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[11px] font-semibold ${
            trend.direction === "up"
              ? trend.positive !== false ? "text-green-400" : "text-red-400"
              : trend.positive === false ? "text-green-400" : "text-red-400"
          }`}>
            {trend.direction === "up" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.value}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-[12px] text-white/45 mt-0.5 font-medium">{label}</p>
      {sub && <p className="text-[11px] text-white/25 mt-1">{sub}</p>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Activity icons ─────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; color: string; href: string }> = {
  "clock-in":       { icon: Clock,         color: "#22c55e", href: "/time-tracking" },
  "clock-out":      { icon: Clock,         color: "#94a3b8", href: "/time-tracking" },
  "punch-added":    { icon: AlertTriangle, color: "#ef4444", href: "/punch-list"    },
  "rfi-submitted":  { icon: MessageSquare, color: "#3b82f6", href: "/rfis"          },
  "invoice-sent":   { icon: FileText,      color: "#f59e0b", href: "/invoices"      },
  "task-updated":   { icon: CheckCircle2,  color: "#8b5cf6", href: "/tasks"         },
  "photo-uploaded": { icon: ImageIcon,     color: "#06b6d4", href: "/photos"        },
};

function timeAgo(date: Date): string {
  const ms = Date.now() - date.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Worker card ───────────────────────────────────────────────────────────────

function WorkerCard({ worker }: { worker: Worker }) {
  const { getProjectById } = useStore();
  const project = getProjectById(worker.projectIds[0]);
  const clockIn = worker.clockInTime ?? new Date();
  const elapsed = new Date().getTime() - clockIn.getTime();
  const hours = Math.floor(elapsed / 3600000);
  const mins = Math.floor((elapsed % 3600000) / 60000);

  return (
    <Link href="/crew" className="block bg-[#111111] border border-white/[0.06] rounded-xl p-4 hover:border-amber-500/20 transition-colors group">
      <div className="w-full h-28 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden"
        style={{ background: `${worker.color}15` }}>
        {worker.photo ? (
          <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: worker.color + "30", color: worker.color }}>
            {worker.initials}
          </div>
        )}
        <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          LIVE
        </div>
        {worker.photo && (
          <div className="absolute bottom-2 left-2 bg-black/60 text-white/80 text-[10px] px-2 py-1 rounded flex items-center gap-1">
            <Camera size={9} />
            Clock-in photo
          </div>
        )}
      </div>
      <p className="text-[13px] font-bold text-white">{worker.name}</p>
      <p className="text-[11px] text-white/40 mb-2">{worker.customRole}</p>
      <div className="flex items-center gap-1.5 text-[11px] text-white/40 mb-1">
        <MapPin size={10} />
        <span className="truncate">{project?.name ?? "—"}</span>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="text-[11px] text-white/30">
          Since {clockIn.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-amber-400 text-[12px] font-bold">{hours}h {mins}m</div>
      </div>
    </Link>
  );
}

// ── Project card ───────────────────────────────────────────────────────────────

function ProjectStatusCard({ project, currency, showFinancials }: { project: Project; currency: string; showFinancials: boolean }) {
  const spent = project.spent;
  const budget = project.budget;
  const overBudget = spent > budget;
  const budgetPct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  const burnColor = budgetPct > 90 ? "#ef4444" : budgetPct > 70 ? "#f59e0b" : "#22c55e";
  return (
    <Link href="/projects" className="block bg-[#111111] border border-white/[0.06] rounded-xl p-4 hover:border-white/10 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-1.5 h-12 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: project.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-white truncate">{project.name}</p>
          <p className="text-[11px] text-white/40 truncate">{project.client}</p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-white/30">
            <MapPin size={9} />
            <span className="truncate">{project.address.split(",")[0]}</span>
          </div>
        </div>
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-white/40">Progress</span>
          <span className="text-[12px] font-bold text-white">{project.progress}%</span>
        </div>
        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, backgroundColor: project.color }} />
        </div>
      </div>
      {showFinancials && (
        <>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-white/30">Budget Burn</span>
            <span className={overBudget ? "text-red-400 font-semibold" : "text-white/40"}>
              {overBudget ? "Over budget" : `${(100 - budgetPct).toFixed(0)}% left`}
            </span>
          </div>
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mb-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${budgetPct}%`, backgroundColor: burnColor }} />
          </div>
          <div className="text-[10px] text-white/25">{formatCurrencyCompact(spent, currency as never)} of {formatCurrencyCompact(budget, currency as never)}</div>
        </>
      )}
    </Link>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const {
    workers, projects, punchItems, clockEntries, activityFeed,
    currentUser, getWorkerById, getProjectById, currency,
    invoices, changeOrders, updateWorker, updateClockEntry,
  } = useStore();
  const t = useT();
  const useFahrenheit = currency === "USD";
  const weather = useWeather(useFahrenheit);
  const [refreshing, setRefreshing] = useState(false);
  const [liveTime, setLiveTime] = useState(new Date());
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const now = liveTime;
  const greeting = now.getHours() < 12 ? t.dashboard.goodMorning : now.getHours() < 17 ? t.dashboard.goodAfternoon : t.dashboard.goodEvening;

  useEffect(() => {
    const id = setInterval(() => setLiveTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => window.location.reload(), 600);
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const clockedInWorkers = workers.filter((w) => w.clockedIn);
  const canSeeFinancials = currentUser.role === "Admin" || currentUser.role === "Project Manager";
  const activeProjects = projects.filter((p) => p.status === "active");
  const upcomingProjects = projects.filter((p) => p.status === "upcoming");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const openPunchItems = punchItems.filter((p) => p.status !== "resolved");
  const highPriority = openPunchItems.filter((p) => p.priority === "high");

  const weeklyHours = clockEntries
    .filter((e) => e.clockOut)
    .reduce((sum, e) => sum + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0);
  const todayActiveHours = clockedInWorkers.reduce((sum, w) => {
    if (!w.clockInTime) return sum;
    return sum + (Date.now() - w.clockInTime.getTime()) / 3600000;
  }, 0);

  // Financial stats
  const totalBilled = invoices.reduce((s, inv) => s + invoiceTotal(inv), 0);
  const totalPaid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + invoiceTotal(i), 0);
  const totalOutstanding = invoices.filter((i) => i.status === "sent").reduce((s, i) => s + invoiceTotal(i), 0);
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const pendingCOs = changeOrders.filter((co) => co.status === "pending");
  const overdueTasks = projects.flatMap((p) =>
    p.tasks.filter((t) => t.status !== "completed" && t.endDate < now)
  );

  // Urgent alerts (max 6)
  const urgentItems: { id: string; label: string; href: string; color: string }[] = [
    ...overdueInvoices.map((i) => ({
      id: i.id,
      label: `Invoice ${i.number} overdue — ${formatCurrencyCompact(invoiceTotal(i), currency as never)}`,
      href: "/invoices",
      color: "#ef4444",
    })),
    ...pendingCOs.map((co) => ({
      id: co.id,
      label: `Change Order ${co.number}: ${co.title} pending approval`,
      href: "/change-orders",
      color: "#f59e0b",
    })),
    ...overdueTasks.slice(0, 3).map((t) => ({
      id: t.id,
      label: `Task overdue: ${t.name}`,
      href: "/tasks",
      color: "#f97316",
    })),
  ].slice(0, 6);

  // ── Worker simplified view ─────────────────────────────────────────────────
  const isWorker = !isForemanOrAbove(currentUser.role);
  if (isWorker) {
    const myEntries = clockEntries.filter((e) => e.workerId === currentUser.id);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay()); weekStart.setHours(0, 0, 0, 0);
    const myWeekHours = myEntries
      .filter((e) => e.clockOut && e.clockIn >= weekStart)
      .reduce((s, e) => s + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0);
    const myTodayHours = myEntries
      .filter((e) => e.clockOut && e.clockIn >= new Date(now.toDateString()))
      .reduce((s, e) => s + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0);
    const liveElapsed = currentUser.clockedIn && currentUser.clockInTime
      ? (now.getTime() - currentUser.clockInTime.getTime()) / 3600000
      : 0;
    const myProject = getProjectById(currentUser.projectIds?.[0] ?? "");

    const handleWorkerClockOut = () => {
      const entry = [...clockEntries].reverse().find((e) => e.workerId === currentUser.id && !e.clockOut);
      if (entry) updateClockEntry(entry.id, { clockOut: new Date() });
      updateWorker(currentUser.id, { clockedIn: false, clockInTime: undefined });
    };

    return (
      <div className="space-y-5 max-w-lg mx-auto">
        {/* Greeting */}
        <div>
          <h2 className="text-xl font-bold text-white">{greeting}, {currentUser.name.split(" ")[0]}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {weather && (() => {
              const meta = weatherMeta(weather.code);
              const WeatherIcon = meta.icon;
              return (
                <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1 text-[12px]" style={{ color: meta.color }}>
                  <WeatherIcon size={13} />
                  <span className="font-semibold">{weather.temp}{useFahrenheit ? "°F" : "°C"}</span>
                </div>
              );
            })()}
            {myProject && (
              <div className="flex items-center gap-1.5 text-[12px] text-white/35">
                <MapPin size={11} />
                {myProject.name}
              </div>
            )}
          </div>
        </div>

        {/* Clock in/out hero */}
        {currentUser.clockedIn ? (
          <div className="bg-[#0a1a0a] border border-green-500/25 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                <span className="w-4 h-4 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-[18px] font-black text-green-400">On Site</p>
                {currentUser.clockInTime && (
                  <p className="text-[13px] text-white/50 mt-0.5">
                    Since {currentUser.clockInTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} · {liveElapsed.toFixed(1)}h elapsed
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleWorkerClockOut}
              className="w-full py-4 rounded-xl bg-red-500/15 hover:bg-red-500/25 active:bg-red-500/30 border border-red-500/30 text-red-400 font-black text-[16px] flex items-center justify-center gap-3 transition-all"
            >
              <LogOut size={20} />
              Clock Out
            </button>
          </div>
        ) : (
          <Link href="/time-tracking" className="block bg-[#0a140a] border-2 border-green-500/30 rounded-2xl p-6 active:border-green-500/50 transition-all">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
                <LogIn size={34} className="text-green-400" />
              </div>
              <p className="text-[22px] font-black text-green-400">Clock In</p>
              <p className="text-[13px] text-green-400/50">Tap to start your shift</p>
            </div>
          </Link>
        )}

        {/* Today's hours */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
            <p className="text-2xl font-black text-white">{(myTodayHours + liveElapsed).toFixed(1)}h</p>
            <p className="text-[12px] font-semibold text-blue-400 mt-0.5">Today</p>
            <p className="text-[11px] text-white/30 mt-0.5">hours logged</p>
          </div>
          <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
            <p className="text-2xl font-black text-white">{(myWeekHours + liveElapsed).toFixed(1)}h</p>
            <p className="text-[12px] font-semibold text-amber-400 mt-0.5">This Week</p>
            <p className="text-[11px] text-white/30 mt-0.5">hours logged</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/messages", label: "Messages", icon: MessageSquare, color: "#3b82f6" },
            { href: "/photos", label: "Photos", icon: ImageIcon, color: "#06b6d4" },
            { href: "/safety", label: "Safety Log", icon: AlertTriangle, color: "#f59e0b" },
            { href: "/time-tracking", label: "My Hours", icon: Clock, color: "#22c55e" },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 bg-[#111111] border border-white/[0.06] hover:border-white/10 active:bg-white/[0.04] rounded-xl p-4 transition-all">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + "18" }}>
                <Icon size={17} style={{ color }} />
              </div>
              <span className="text-[13px] font-semibold text-white/75">{label}</span>
              <ArrowRight size={13} className="text-white/20 ml-auto" />
            </Link>
          ))}
        </div>

        {/* Recent activity */}
        {activityFeed.length > 0 && (
          <div>
            <h3 className="text-[14px] font-bold text-white mb-3">Recent Activity</h3>
            <div className="bg-[#111111] border border-white/[0.06] rounded-xl divide-y divide-white/[0.04]">
              {activityFeed.slice(0, 5).map((event) => {
                const iconDef = ACTIVITY_ICONS[event.type] ?? ACTIVITY_ICONS["task-updated"];
                const Icon = iconDef.icon;
                return (
                  <div key={event.id} className="flex gap-3 p-3">
                    <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5" style={{ backgroundColor: iconDef.color + "18" }}>
                      <span style={{ color: iconDef.color }}><Icon size={13} /></span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-white/70 leading-snug">{event.description}</p>
                      <p className="text-[10px] text-white/25 mt-1">{timeAgo(event.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
    {/* ── MOBILE DASHBOARD ──────────────────────────────────────────────── */}
    <div className="lg:hidden -mx-4 -mt-4 pb-2">

      {/* Hero panel — edge-to-edge, amber glow, blueprint grid */}
      <div
        className="relative overflow-hidden px-5 pt-6 pb-7"
        style={{
          background: "linear-gradient(155deg, #3d2200 0%, #1e1000 45%, #0a0600 100%)",
          borderBottom: "1px solid rgba(245,158,11,0.18)",
        }}
      >
        {/* Blueprint grid — clearly visible */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(245,158,11,0.13) 0px, rgba(245,158,11,0.13) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(0deg, rgba(245,158,11,0.13) 0px, rgba(245,158,11,0.13) 1px, transparent 1px, transparent 48px)",
          }}
        />
        {/* Diagonal accent cut — bottom-right triangle */}
        <div
          className="absolute bottom-0 right-0 pointer-events-none"
          style={{
            width: 0,
            height: 0,
            borderBottom: "72px solid rgba(245,158,11,0.07)",
            borderLeft: "220px solid transparent",
          }}
        />
        {/* Amber radial glow — strong, bottom-left */}
        <div
          className="absolute -bottom-16 -left-10 w-80 h-80 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.22) 0%, rgba(217,119,6,0.06) 50%, transparent 70%)" }}
        />
        {/* Secondary glow — top-right accent */}
        <div
          className="absolute -top-12 -right-12 w-56 h-56 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(234,88,12,0.10) 0%, transparent 65%)" }}
        />
        {/* Top hazard stripe */}
        <div
          className="absolute top-0 inset-x-0 h-[3px] pointer-events-none"
          style={{
            background: "repeating-linear-gradient(90deg, #f59e0b 0px, #f59e0b 14px, rgba(0,0,0,0) 14px, rgba(0,0,0,0) 28px)",
          }}
        />

        {/* Greeting + live clock */}
        <div className="relative flex items-start justify-between mb-5">
          <div>
            <p className="text-[11px] font-black text-amber-500/60 uppercase tracking-[0.14em] mb-0.5">
              {greeting.split(",")[0]}
            </p>
            <h2 className="text-[24px] font-black text-white tracking-tight leading-tight">
              {currentUser.name.split(" ")[0]}
            </h2>
          </div>
          <div className="text-right mt-0.5">
            <p className="text-[22px] font-black text-white tabular-nums leading-none">
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-[11px] text-white/35 mt-1">
              {now.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Big stat tiles */}
        <div className="relative flex gap-3 mb-5">
          <div className="flex-1 bg-white/[0.05] border border-amber-500/15 rounded-2xl p-4">
            <div className="flex items-end gap-1 mb-1">
              <span className="text-[44px] font-black text-white leading-none tabular-nums">{clockedInWorkers.length}</span>
              <span className="text-[14px] font-bold text-amber-400/50 mb-2">/{workers.length}</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-500/70">Crew on Site</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-green-400 font-bold">Live</span>
            </div>
          </div>
          <div className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4">
            <span className="text-[44px] font-black text-white leading-none tabular-nums block mb-1">{activeProjects.length}</span>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/40">Active Jobs</p>
            <p className="text-[10px] text-white/30 mt-2">{upcomingProjects.length} upcoming</p>
          </div>
        </div>

        {/* Weather + urgent badge */}
        <div className="relative flex items-center gap-2 flex-wrap">
          {weather && (() => {
            const wMeta = weatherMeta(weather.code);
            const WIcon = wMeta.icon;
            return (
              <div
                className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.07] rounded-lg px-3 py-1.5"
                style={{ color: wMeta.color }}
              >
                <WIcon size={12} />
                <span className="text-[12px] font-bold">{weather.temp}{useFahrenheit ? "°F" : "°C"}</span>
                <span className="text-[11px] text-white/30 ml-0.5">{wMeta.label}</span>
              </div>
            );
          })()}
          {urgentItems.length > 0 && (
            <Link
              href={urgentItems[0].href}
              className="flex items-center gap-1.5 bg-red-500/[0.12] border border-red-500/25 rounded-lg px-3 py-1.5"
            >
              <AlertTriangle size={11} className="text-red-400" />
              <span className="text-[11px] font-bold text-red-400">{urgentItems.length} urgent</span>
            </Link>
          )}
        </div>
      </div>

      {/* Stat chips — horizontal scroll */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {(([
            { label: "Hours/Week",    value: `${(weeklyHours + todayActiveHours).toFixed(0)}h`, color: "#0ea5e9" },
            { label: "Open Issues",   value: openPunchItems.length, color: "#f97316" },
            { label: "High Priority", value: highPriority.length, color: "#ef4444" },
            ...(canSeeFinancials
              ? [
                  { label: "Collected",   value: formatCurrencyCompact(totalPaid, currency as never), color: "#22c55e" },
                  { label: "Outstanding", value: formatCurrencyCompact(totalOutstanding, currency as never), color: "#f59e0b" },
                ]
              : []),
          ]) as { label: string; value: string | number; color: string }[]).map((chip) => (
            <div
              key={chip.label}
              className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3"
            >
              <p className="text-[20px] font-black tabular-nums" style={{ color: chip.color }}>{chip.value}</p>
              <p className="text-[10px] text-white/35 font-semibold mt-0.5 whitespace-nowrap">{chip.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions — 2×2 grid */}
      <div className="px-4 pt-4">
        <p className="text-[10px] font-black text-white/25 uppercase tracking-[0.14em] mb-3">Quick Add</p>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Daily Report",  icon: FileText,      href: "/daily-reports",  color: "#22c55e" },
            { label: "Change Order",  icon: GitPullRequest, href: "/change-orders", color: "#f59e0b" },
            { label: "Invoice",       icon: ReceiptText,   href: "/invoices",       color: "#0ea5e9" },
            { label: "Punch Item",    icon: AlertTriangle, href: "/punch-list",     color: "#ef4444" },
          ].map(({ label, icon: Icon, href, color }) => (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3.5 active:bg-white/[0.04] transition-colors"
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color + "18" }}
              >
                <Icon size={15} style={{ color }} />
              </div>
              <div>
                <p className="text-[12px] font-bold text-white/80 leading-tight">{label}</p>
                <p className="text-[10px] text-white/30 mt-0.5">Add new</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* AI Daily Brief */}
      <div className="px-4 pt-4">
        <ErrorBoundary fallback={
          <div className="bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3 text-[12px] text-white/30">
            AI Brief unavailable
          </div>
        }>
          <DailyBriefCard />
        </ErrorBoundary>
      </div>

      {/* Crew on site — horizontal avatar scroll */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-black text-white">Crew on Site</h3>
            {clockedInWorkers.length > 0 && (
              <span className="flex items-center gap-1 text-[10px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                {clockedInWorkers.length} live
              </span>
            )}
          </div>
          <Link href="/time-tracking" className="text-[11px] text-amber-400/70 flex items-center gap-1">
            All <ArrowRight size={11} />
          </Link>
        </div>
        {clockedInWorkers.length === 0 ? (
          <div className="bg-[#131110] border border-white/[0.07] rounded-2xl p-6 text-center">
            <Timer size={22} className="text-white/15 mx-auto mb-2" />
            <p className="text-[12px] text-white/30">No one clocked in yet</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            {clockedInWorkers.slice(0, 6).map((w) => {
              const hoursOn = w.clockInTime ? (Date.now() - w.clockInTime.getTime()) / 3600000 : 0;
              return (
                <Link
                  key={w.id}
                  href="/time-tracking"
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 bg-[#131110] border border-white/[0.07] rounded-2xl p-3 w-[84px] active:bg-white/[0.04]"
                >
                  <div className="relative">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-[13px] font-black"
                      style={{ backgroundColor: w.color + "28", color: w.color }}
                    >
                      {w.photo
                        ? <img src={w.photo} alt={w.name} className="w-full h-full rounded-full object-cover" />
                        : w.initials}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[#131110]" />
                  </div>
                  <p className="text-[11px] font-bold text-white/80 text-center truncate w-full">{w.name.split(" ")[0]}</p>
                  <p className="text-[10px] text-green-400 font-bold">{hoursOn.toFixed(1)}h</p>
                </Link>
              );
            })}
            {clockedInWorkers.length > 6 && (
              <Link
                href="/time-tracking"
                className="flex-shrink-0 flex flex-col items-center justify-center gap-2 bg-[#131110] border border-white/[0.07] rounded-2xl p-3 w-[84px]"
              >
                <div className="w-11 h-11 rounded-full bg-white/[0.06] flex items-center justify-center">
                  <span className="text-[14px] font-black text-white/50">+{clockedInWorkers.length - 6}</span>
                </div>
                <p className="text-[11px] text-white/30">more</p>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Active projects */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-black text-white">Active Jobs</h3>
          <Link href="/projects" className="text-[11px] text-amber-400/70 flex items-center gap-1">
            All <ArrowRight size={11} />
          </Link>
        </div>
        {activeProjects.length === 0 ? (
          <Link href="/projects" className="flex items-center justify-center bg-[#131110] border border-white/[0.07] border-dashed rounded-2xl p-6">
            <p className="text-[12px] text-white/30">No active jobs · Tap to add one</p>
          </Link>
        ) : (
          <div className="space-y-2.5">
            {activeProjects.slice(0, 3).map((p) => {
              const doneTasks = p.tasks.filter((t) => t.status === "completed").length;
              const totalTasks = p.tasks.length;
              const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
              return (
                <Link
                  key={p.id}
                  href="/projects"
                  className="flex items-center gap-3.5 bg-[#131110] border border-white/[0.07] rounded-2xl p-4 active:bg-white/[0.04]"
                >
                  <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[13px] font-bold text-white truncate pr-2">{p.name}</p>
                      <span className="text-[11px] font-black text-white/50 flex-shrink-0">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                    </div>
                    <p className="text-[10px] text-white/30 mt-1.5">{p.client} · {doneTasks}/{totalTasks} tasks</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent activity */}
      {activityFeed.length > 0 && (
        <div className="px-4 pt-5 pb-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-black text-white">Recent Activity</h3>
            <div className="flex items-center gap-1 text-[10px] text-white/25">
              <Activity size={10} />
              Today
            </div>
          </div>
          <div className="bg-[#131110] border border-white/[0.07] rounded-2xl overflow-hidden divide-y divide-white/[0.05]">
            {activityFeed.slice(0, 5).map((event) => {
              const iconDef = ACTIVITY_ICONS[event.type] ?? ACTIVITY_ICONS["task-updated"];
              const AIcon = iconDef.icon;
              return (
                <Link key={event.id} href={iconDef.href} className="flex gap-3 p-3.5 active:bg-white/[0.03]">
                  <div
                    className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: iconDef.color + "18" }}
                  >
                    <span style={{ color: iconDef.color }}><AIcon size={13} /></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white/70 leading-snug">{event.description}</p>
                    <p className="text-[10px] text-white/25 mt-1">{timeAgo(event.timestamp)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>

    {/* ── DESKTOP DASHBOARD ─────────────────────────────────────────────── */}
    <div className="hidden lg:block space-y-6 max-w-[1400px]">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">{greeting}, {currentUser.name.split(" ")[0]}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-white/40 text-sm hidden sm:block">Here&apos;s what&apos;s happening across your projects today.</p>
            {weather && (() => {
              const meta = weatherMeta(weather.code);
              const WeatherIcon = meta.icon;
              return (
                <button
                  onClick={() => setWeatherExpanded(e => !e)}
                  className="flex items-center gap-1.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] hover:border-white/10 rounded-lg px-2.5 py-1 text-[12px] transition-all"
                  style={{ color: meta.color }}
                >
                  <WeatherIcon size={13} />
                  <span className="font-semibold">{weather.temp}{useFahrenheit ? "°F" : "°C"}</span>
                  <span className="text-white/30 hidden sm:inline">{meta.label}</span>
                  <Wind size={10} className="text-white/25 ml-0.5 hidden sm:inline" />
                  <span className="text-white/25 hidden sm:inline">{weather.windspeed} {useFahrenheit ? "mph" : "km/h"}</span>
                  <span className="text-white/20 hidden sm:inline ml-1">{weatherExpanded ? "▲" : "▼"}</span>
                </button>
              );
            })()}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 bg-[#111111] border border-white/[0.06] hover:border-white/10 rounded-xl px-3 py-2.5 text-[12px] text-white/40 hover:text-white/60 transition-all"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-amber-400" : ""} />
            <span className="hidden sm:inline">{refreshing ? `${t.common.refresh}…` : t.common.refresh}</span>
          </button>
          <div className="hidden sm:flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-white/50 font-mono text-[12px]">
              {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      </div>

      {/* 7-day weather forecast panel */}
      {weather && weatherExpanded && weather.forecast.length > 0 && (
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold text-white/50 uppercase tracking-widest">7-Day Forecast</span>
            <Link href="/schedule" className="text-[11px] text-amber-400/70 hover:text-amber-400 transition-colors flex items-center gap-1">
              Full schedule <ArrowRight size={10} />
            </Link>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weather.forecast.map((day, i) => {
              const meta = weatherMeta(day.code);
              const DayIcon = meta.icon;
              const date = new Date(day.date + "T12:00:00");
              const isToday = i === 0;
              return (
                <div key={day.date} className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors ${isToday ? "bg-white/[0.05] border border-white/[0.08]" : "hover:bg-white/[0.03]"}`}>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? "text-amber-400" : "text-white/30"}`}>
                    {isToday ? "Today" : date.toLocaleDateString("en-CA", { weekday: "short" })}
                  </span>
                  <span style={{ color: meta.color }}><DayIcon size={16} /></span>
                  {day.rainChance > 20 && (
                    <span className="text-[9px] text-blue-400 font-semibold">{day.rainChance}%</span>
                  )}
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px] font-bold text-white/80">{day.high}°</span>
                    <span className="text-[10px] text-white/25">{day.low}°</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New-user setup guide */}
      {projects.length === 0 && workers.length <= 1 && (
        <div className="bg-amber-500/[0.07] border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-amber-400" />
            <span className="text-[12px] font-black text-amber-400 uppercase tracking-widest">Get Started</span>
          </div>
          <p className="text-[14px] text-white/70 mb-4">Welcome to Constra! Complete these steps to set up your job site.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { n: "1", label: "Add your first project", sub: "Create a job site to track tasks, crew, and costs.", href: "/projects", done: projects.length > 0 },
              { n: "2", label: "Invite crew members", sub: "Share your invite code so workers can join.", href: "/settings", done: workers.length > 1 },
              { n: "3", label: "Clock in your first worker", sub: "Start tracking hours from the time tracking page.", href: "/time-tracking", done: workers.some((w) => w.clockedIn) },
            ].map((step) => (
              <Link key={step.n} href={step.href}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${step.done ? "border-green-500/20 bg-green-500/[0.05]" : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-black ${step.done ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"}`}>
                  {step.done ? <CheckCircle2 size={14} /> : step.n}
                </div>
                <div>
                  <p className={`text-[13px] font-semibold ${step.done ? "text-white/40 line-through" : "text-white/80"}`}>{step.label}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">{step.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-white/25 font-semibold uppercase tracking-widest mr-1">Quick add</span>
        {[
          { label: "Daily Report", icon: FileText, href: "/daily-reports", color: "#22c55e" },
          { label: "Change Order", icon: GitPullRequest, href: "/change-orders", color: "#f59e0b" },
          { label: "Invoice", icon: ReceiptText, href: "/invoices", color: "#3b82f6" },
          { label: "Punch Item", icon: AlertTriangle, href: "/punch-list", color: "#ef4444" },
        ].map(({ label, icon: Icon, href, color }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-1.5 bg-[#111111] border border-white/[0.06] hover:border-white/10 rounded-lg px-3 py-2 text-[12px] text-white/60 hover:text-white transition-all group"
          >
            <span style={{ color }} className="group-hover:scale-110 transition-transform"><Icon size={13} /></span>
            <Plus size={10} className="text-white/25" />
            {label}
          </Link>
        ))}
      </div>

      {/* AI Daily Brief */}
      <ErrorBoundary fallback={
        <div className="bg-[#111111] border border-white/[0.06] rounded-2xl px-5 py-4 text-[12px] text-white/30">
          AI Daily Brief unavailable — <button onClick={() => window.location.reload()} className="text-amber-400 hover:text-amber-300 underline">reload to retry</button>
        </div>
      }>
        <DailyBriefCard />
      </ErrorBoundary>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label={t.dashboard.workersOnSite} value={clockedInWorkers.length} sub={`of ${workers.length} total crew`} icon={Users} iconColor="#22c55e" href="/time-tracking" />
        <StatCard label={t.dashboard.hoursThisWeek} value={`${(weeklyHours + todayActiveHours).toFixed(0)}h`} sub={`${todayActiveHours.toFixed(1)}h active now`} icon={Clock} iconColor="#3b82f6" href="/time-tracking" />
        <StatCard label={t.dashboard.activeProjects} value={activeProjects.length} sub={`${upcomingProjects.length} upcoming · ${completedProjects.length} done`} icon={FolderKanban} iconColor="#f59e0b" href="/projects" />
        <StatCard label={t.dashboard.openIssues} value={openPunchItems.length} sub={`${highPriority.length} high priority`} icon={ClipboardList} iconColor="#ef4444" href="/punch-list" />
        {canSeeFinancials && (
          <>
            <StatCard
              label="Revenue Collected"
              value={formatCurrencyCompact(totalPaid, currency as never)}
              sub={`${formatCurrencyCompact(totalOutstanding, currency as never)} outstanding`}
              icon={BanknoteIcon}
              iconColor="#10b981"
              href="/invoices"
              trend={totalPaid > 0 ? { direction: "up", value: "Paid", positive: true } : undefined}
            />
            <StatCard
              label="Overdue Invoices"
              value={overdueInvoices.length}
              sub={overdueInvoices.length > 0 ? formatCurrencyCompact(overdueInvoices.reduce((s, i) => s + invoiceTotal(i), 0), currency as never) + " at risk" : "All clear"}
              icon={DollarSign}
              iconColor={overdueInvoices.length > 0 ? "#ef4444" : "#22c55e"}
              href="/invoices"
              trend={overdueInvoices.length > 0 ? { direction: "down", value: `${overdueInvoices.length} overdue`, positive: false } : undefined}
            />
          </>
        )}
      </div>

      {/* Urgent Items */}
      {urgentItems.length > 0 && (
        <div className="bg-[#0f0a0a] border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-[13px] font-bold text-red-400">Needs Attention</span>
            <span className="text-[11px] bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full font-semibold">{urgentItems.length}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {urgentItems.map((item) => (
              <Link key={item.id} href={item.href}
                className="flex items-center gap-2.5 bg-white/[0.03] hover:bg-white/[0.05] rounded-lg px-3 py-2 transition-colors group">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[12px] text-white/70 group-hover:text-white/90 transition-colors flex-1">{item.label}</span>
                <ArrowRight size={11} className="text-white/20 group-hover:text-white/40 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Workers on site */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-white">{t.dashboard.workersOnSite}</h3>
            <span className="flex items-center gap-1 text-[11px] bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              {clockedInWorkers.length} active
            </span>
          </div>
          <Link href="/time-tracking" className="text-[12px] text-white/35 hover:text-amber-400 flex items-center gap-1 transition-colors">
            {t.dashboard.viewAll} <ArrowRight size={12} />
          </Link>
        </div>
        {clockedInWorkers.length === 0 ? (
          <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-10 flex flex-col items-center gap-3 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
              <Timer size={20} className="text-white/20" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white/40">No one on site right now</p>
              <p className="text-[11px] text-white/20 mt-0.5">
                Workers will appear here when they clock in from the{" "}
                <Link href="/time-tracking" className="text-amber-400/60 hover:text-amber-400 transition-colors">time tracking</Link> page.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {clockedInWorkers.map((w) => <WorkerCard key={w.id} worker={w} />)}
            {workers.length > clockedInWorkers.length && (
              <div className="bg-[#111111] border border-white/[0.04] border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 min-h-[160px]">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
                  <Users size={16} className="text-white/20" />
                </div>
                <p className="text-[11px] text-white/25 text-center">{workers.length - clockedInWorkers.length} off-site</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Projects + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-white">{t.dashboard.projectStatus}</h3>
            <Link href="/projects" className="text-[12px] text-white/35 hover:text-amber-400 flex items-center gap-1 transition-colors">
              {t.dashboard.seeAll} <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex gap-1">
            {[
              { label: "Active",    count: activeProjects.length,    color: "#22c55e" },
              { label: "Upcoming",  count: upcomingProjects.length,  color: "#3b82f6" },
              { label: "Completed", count: completedProjects.length, color: "#666"    },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#111111] border border-white/[0.06]" style={{ color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
                <span className="ml-0.5 text-white/30">{count}</span>
              </div>
            ))}
          </div>
          {activeProjects.length === 0 && upcomingProjects.length === 0 ? (
            <div className="bg-[#111111] border border-white/[0.06] border-dashed rounded-xl p-8 text-center">
              <FolderKanban size={32} className="mx-auto text-white/15 mb-3" />
              <p className="text-white/30 text-[13px]">No projects yet</p>
              <Link href="/projects" className="text-amber-400 text-[12px] hover:text-amber-300 transition-colors mt-1 inline-block">
                {t.dashboard.addProject} →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeProjects.map((p) => <ProjectStatusCard key={p.id} project={p} currency={currency} showFinancials={canSeeFinancials} />)}
              {upcomingProjects.slice(0, 1).map((p) => (
                <Link key={p.id} href="/projects" className="block bg-[#111111] border border-white/[0.06] rounded-xl p-4 opacity-70 hover:opacity-90 hover:border-white/10 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-white truncate">{p.name}</p>
                      <p className="text-[11px] text-white/40">{p.client}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar size={9} className="text-blue-400" />
                        <span className="text-[10px] text-blue-400">
                          Starts {p.startDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {canSeeFinancials && (
                    <div className="text-[11px] text-white/30">Budget: {formatCurrencyCompact(p.budget, currency as never)}</div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-white">{t.dashboard.activity}</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[11px] text-white/30">
                <Activity size={11} />
                Today
              </div>
              {activityFeed.length > 8 && (
                <Link href="/reports" className="text-[11px] text-white/35 hover:text-amber-400 flex items-center gap-1 transition-colors">
                  View all <ArrowRight size={11} />
                </Link>
              )}
            </div>
          </div>
          <div className="bg-[#111111] border border-white/[0.06] rounded-xl divide-y divide-white/[0.04]">
            {activityFeed.length === 0 ? (
              <div className="p-8 flex flex-col items-center gap-2 text-center">
                <Activity size={22} className="text-white/15" />
                <p className="text-[12px] text-white/25">{t.dashboard.noActivity}</p>
              </div>
            ) : activityFeed.slice(0, 8).map((event) => {
              const iconDef = ACTIVITY_ICONS[event.type] ?? ACTIVITY_ICONS["task-updated"];
              const Icon = iconDef.icon;
              return (
                <Link key={event.id} href={iconDef.href} className="flex gap-3 p-3 hover:bg-white/[0.03] transition-colors group">
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5" style={{ backgroundColor: iconDef.color + "18" }}>
                    <span style={{ color: iconDef.color }}><Icon size={13} /></span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white/70 leading-snug group-hover:text-white/90 transition-colors">{event.description}</p>
                    <p className="text-[10px] text-white/25 mt-1">{timeAgo(event.timestamp)}</p>
                  </div>
                  <ArrowRight size={11} className="text-white/0 group-hover:text-white/25 transition-colors flex-shrink-0 self-center" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming tasks + punch items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-white">{t.dashboard.upcomingTasks ?? "Upcoming Tasks"}</h3>
            <Link href="/tasks" className="text-[12px] text-white/35 hover:text-amber-400 flex items-center gap-1 transition-colors">
              {t.dashboard.seeAll} <ArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-[#111111] border border-white/[0.06] rounded-xl divide-y divide-white/[0.04]">
            {projects.flatMap((p) =>
              p.tasks.filter((t) => t.status !== "completed").map((t) => ({ ...t, projectName: p.name, projectColor: p.color }))
            ).slice(0, 6).map((task) => {
              const worker = getWorkerById(task.workerId);
              const isLate = task.endDate < now && task.progress < 100;
              return (
                <Link key={task.id} href="/tasks" className="flex items-center gap-3 p-3 hover:bg-white/[0.03] transition-colors group">
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: task.projectColor }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white/80 font-medium truncate group-hover:text-white/95 transition-colors">{task.name}</p>
                    <p className="text-[10px] text-white/30 truncate">{task.projectName} · {worker?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-[11px] font-semibold ${isLate ? "text-red-400" : "text-white/40"}`}>
                      {task.endDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-[10px] text-white/25">{task.progress}%</p>
                  </div>
                  <ArrowRight size={10} className="text-white/0 group-hover:text-white/20 transition-colors flex-shrink-0 ml-1" />
                </Link>
              );
            })}
            {projects.flatMap((p) => p.tasks.filter((t) => t.status !== "completed")).length === 0 && (
              <div className="p-8 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 size={22} className="text-white/15" />
                <p className="text-[12px] text-white/25">{t.dashboard.noTasks}</p>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-white">{t.dashboard.priorityIssues ?? "Priority Issues"}</h3>
            <Link href="/punch-list" className="text-[12px] text-white/35 hover:text-amber-400 flex items-center gap-1 transition-colors">
              Punch list <ArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-[#111111] border border-white/[0.06] rounded-xl divide-y divide-white/[0.04]">
            {openPunchItems.sort((a, b) => a.priority === "high" ? -1 : b.priority === "high" ? 1 : 0).slice(0, 6).map((item) => {
              const prioColors: Record<string, string> = { high: "text-red-400 bg-red-500/12", medium: "text-amber-400 bg-amber-500/12", low: "text-white/40 bg-white/8" };
              const statusIcons: Record<string, React.ReactNode> = {
                open:        <Circle size={10} className="text-red-400" />,
                "in-progress": <Timer size={10} className="text-amber-400" />,
                resolved:    <CheckCircle2 size={10} className="text-green-400" />,
              };
              return (
                <Link key={item.id} href="/punch-list" className="flex items-center gap-3 p-3 hover:bg-white/[0.03] transition-colors group">
                  <div className="mt-0.5">{statusIcons[item.status]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-white/80 font-medium truncate group-hover:text-white/95 transition-colors">{item.title}</p>
                    <p className="text-[10px] text-white/30 truncate">{getProjectById(item.projectId)?.name ?? item.projectId}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${prioColors[item.priority]}`}>
                    {item.priority.toUpperCase()}
                  </span>
                  <ArrowRight size={10} className="text-white/0 group-hover:text-white/20 transition-colors flex-shrink-0" />
                </Link>
              );
            })}
            {openPunchItems.length === 0 && (
              <div className="p-8 flex flex-col items-center gap-2 text-center">
                <CheckCircle2 size={22} className="text-green-500/30" />
                <p className="text-[12px] text-white/25">{t.dashboard.noIssues}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Budget Variance */}
      {canSeeFinancials && activeProjects.some((p) => p.budget > 0) && (
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-white">Budget Health</h3>
              <p className="text-[11px] text-white/30 mt-0.5">Budget · Committed · Actual · Forecast per project</p>
            </div>
            <Link href="/projects" className="text-[11px] text-white/30 hover:text-amber-400 flex items-center gap-1 transition-colors">
              All projects <ArrowRight size={11} />
            </Link>
          </div>
          <div className="space-y-4">
            {activeProjects.filter((p) => p.budget > 0).map((p) => {
              const committed = p.committed ?? p.spent;
              const forecast = p.forecast ?? p.spent;
              const variance = p.budget - forecast;
              const overBudget = variance < 0;
              const commitPct = Math.min(100, (committed / p.budget) * 100);
              const spentPct = Math.min(100, (p.spent / p.budget) * 100);
              const forecastPct = Math.min(100, (forecast / p.budget) * 100);
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                      <span className="text-[12px] font-semibold text-white/70">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-white/35">Budget {formatCurrencyCompact(p.budget, currency as never)}</span>
                      <span className={`font-bold ${overBudget ? "text-red-400" : "text-green-400"}`}>
                        {overBudget ? "▲" : "▼"} {formatCurrencyCompact(Math.abs(variance), currency as never)} {overBudget ? "over" : "under"}
                      </span>
                    </div>
                  </div>
                  {/* Stacked bar: background = budget, layers = committed / spent */}
                  <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    {/* Committed */}
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${commitPct}%`, background: p.color + "50" }} />
                    {/* Actual spent */}
                    <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${spentPct}%`, background: p.color }} />
                    {/* Forecast marker */}
                    <div className="absolute inset-y-0 w-0.5 rounded-full" style={{ left: `${Math.min(99, forecastPct)}%`, background: overBudget ? "#ef4444" : "rgba(255,255,255,0.5)" }} />
                  </div>
                  <div className="flex gap-4 mt-1.5 text-[10px] text-white/25">
                    <span>Spent {formatCurrencyCompact(p.spent, currency as never)}</span>
                    <span>Committed {formatCurrencyCompact(committed, currency as never)}</span>
                    <span style={{ color: overBudget ? "#ef4444" : "#22c55e" }}>Forecast {formatCurrencyCompact(forecast, currency as never)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly Digest */}
      {canSeeFinancials && (
        <div className="bg-[#111111] border border-white/[0.06] rounded-xl p-5 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-bold text-white">Weekly Summary</h3>
              <p className="text-[11px] text-white/30 mt-0.5">A snapshot of this week&apos;s activity across all projects</p>
            </div>
            <button
              onClick={() => {
                const hrs = (weeklyHours + todayActiveHours).toFixed(0);
                const subject = encodeURIComponent(`Constra Weekly Digest — ${now.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}`);
                const body = encodeURIComponent([
                  `Weekly Summary — ${now.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}`,
                  "",
                  `Crew: ${clockedInWorkers.length} of ${workers.length} workers clocked in`,
                  `Hours logged this week: ${hrs}h`,
                  `Active projects: ${activeProjects.length}`,
                  `Open punch items: ${openPunchItems.length} (${highPriority.length} high priority)`,
                  `Revenue collected: ${formatCurrencyCompact(totalPaid, currency as never)}`,
                  `Outstanding invoices: ${formatCurrencyCompact(totalOutstanding, currency as never)}`,
                  overdueInvoices.length > 0 ? `⚠️ Overdue invoices: ${overdueInvoices.length}` : "",
                  pendingCOs.length > 0 ? `⚠️ Pending change orders: ${pendingCOs.length}` : "",
                  "",
                  "Projects in progress:",
                  activeProjects.map((p) => `  • ${p.name}`).join("\n"),
                  "",
                  "— Constra",
                ].filter(Boolean).join("\n"));
                window.open(`mailto:${currentUser.email ?? ""}?subject=${subject}&body=${body}`, "_self");
              }}
              className="flex items-center gap-2 text-[12px] font-bold text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.08] px-3 py-2 rounded-lg transition-colors"
            >
              <Mail size={13} />
              Email Digest
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Hours This Week",    value: `${(weeklyHours + todayActiveHours).toFixed(0)}h`, sub: `${clockedInWorkers.length} workers active` },
              { label: "Active Projects",    value: activeProjects.length, sub: `${upcomingProjects.length} upcoming` },
              { label: "Open Items",         value: openPunchItems.length, sub: `${highPriority.length} high priority` },
              { label: "Revenue Collected",  value: formatCurrencyCompact(totalPaid, currency as never), sub: `${formatCurrencyCompact(totalOutstanding, currency as never)} outstanding` },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/[0.03] rounded-lg px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-1">{stat.label}</p>
                <p className="text-[22px] font-black text-white">{stat.value}</p>
                <p className="text-[10px] text-white/30 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
