"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "constra_v1";

function buildDemoState() {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 20);
  const fourMonths = new Date(now.getFullYear(), now.getMonth() + 4, 30);
  const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 30, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0, 0);
  const lastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 8, 0, 0);
  const lastWeekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 17, 0, 0);

  const projectId = "demo-proj-1";
  const worker1Id = "demo-worker-1"; // Foreman
  const worker2Id = "demo-worker-2"; // Worker

  return {
    companyName: "Constra Demo",
    onboarded: true,
    isPro: true,
    currency: "CAD",
    language: "en",
    industry: "general",
    companyId: "demo",
    authUserId: worker1Id,
    companyAddress: "100 Construction Way, Toronto, ON",
    businessNumber: "",
    companyLogo: "",
    inviteCode: "DEMO2024",
    permissionsPin: "",
    defaultTaxRate: 13,
    overtimeEnabled: false,
    overtimeDailyThreshold: null,
    overtimeWeeklyThreshold: 40,
    overtimeMultiplier: 1.5,
    isOnline: true,
    isRealtimeConnected: false,
    pendingSync: 0,
    isSaving: false,
    savedRecently: false,
    customRoles: [],
    theme: "dark",

    workers: [
      {
        id: worker1Id,
        name: "Mike Thompson",
        initials: "MT",
        role: "Admin",
        customRole: "",
        email: "mike@constrademo.com",
        phone: "647-555-0100",
        color: "#f59e0b",
        projectIds: [projectId],
        clockedIn: false,
        hourlyRate: 38,
        certifications: [],
      },
      {
        id: worker2Id,
        name: "Sarah Chen",
        initials: "SC",
        role: "Worker",
        customRole: "",
        email: "sarah@constrademo.com",
        phone: "647-555-0101",
        color: "#3b82f6",
        projectIds: [projectId],
        clockedIn: false,
        hourlyRate: 29,
        certifications: [],
      },
    ],

    projects: [
      {
        id: projectId,
        name: "Downtown Office Renovation",
        client: "Apex Properties Inc.",
        status: "active",
        startDate: lastMonth.toISOString(),
        endDate: fourMonths.toISOString(),
        progress: 42,
        budget: 250000,
        spent: 127500,
        committed: 145000,
        forecast: 248000,
        address: "123 King St W, Toronto, ON",
        color: "#f59e0b",
        managerId: worker1Id,
        workerIds: [worker1Id, worker2Id],
        pendingApproval: false,
        tasks: [
          {
            id: "demo-task-1",
            projectId,
            name: "Install drywall — Floor 2",
            progress: 60,
            workerId: worker1Id,
            startDate: lastMonth.toISOString(),
            endDate: nextWeek.toISOString(),
            status: "in-progress",
          },
          {
            id: "demo-task-2",
            projectId,
            name: "Paint interior walls",
            progress: 0,
            workerId: worker2Id,
            startDate: nextWeek.toISOString(),
            endDate: nextMonth.toISOString(),
            status: "not-started",
          },
        ],
      },
    ],

    clockEntries: [
      {
        id: "demo-clock-1",
        workerId: worker1Id,
        projectId,
        clockIn: todayStart.toISOString(),
        clockOut: todayEnd.toISOString(),
      },
      {
        id: "demo-clock-2",
        workerId: worker2Id,
        projectId,
        clockIn: lastWeek.toISOString(),
        clockOut: lastWeekEnd.toISOString(),
      },
    ],

    invoices: [
      {
        id: "demo-invoice-1",
        number: "INV-2024-001",
        clientName: "Apex Properties Inc.",
        clientEmail: "billing@apexproperties.ca",
        clientAddress: "123 King St W, Toronto, ON M5H 1J1",
        issueDate: lastMonth.toISOString(),
        dueDate: nextMonth.toISOString(),
        status: "sent",
        items: [
          { description: "Phase 1 — Demolition & Framing", qty: 1, rate: 45000 },
        ],
        taxRate: 13,
        notes: "Net 30 payment terms apply.",
      },
    ],

    safetyIncidents: [
      {
        id: "demo-safety-1",
        projectId,
        type: "near-miss",
        severity: "low",
        description: "Minor slip near loading dock — wet floor, no injury reported.",
        reportedById: worker2Id,
        date: lastMonth.toISOString(),
        reportedToOSHA: false,
        actionTaken: "Placed wet floor signs and improved drainage around loading area.",
      },
    ],

    equipment: [
      {
        id: "demo-equip-1",
        name: "Scissor Lift — JLG 2630ES",
        type: "Aerial Work Platform",
        status: "in-use",
        projectId,
        lastService: lastMonth.toISOString(),
        nextService: nextMonth.toISOString(),
        dailyRate: 220,
      },
    ],

    dailyReports: [
      {
        id: "demo-report-1",
        projectId,
        date: now.toISOString(),
        weather: "Partly cloudy, 12°C",
        temperatureF: 54,
        crewCount: 4,
        crewOnSite: [worker1Id, worker2Id],
        workCompleted: "Completed framing on east wall. Drywall delivery received and staged on floor 2.",
        delays: "",
        materialsUsed: "24 sheets drywall 1/2\", joint compound (3 buckets)",
        visitorLog: "",
        notes: "Drywall taping scheduled to begin tomorrow morning.",
        submittedById: worker1Id,
        createdAt: now.toISOString(),
      },
    ],

    // Empty arrays for the rest
    punchItems: [],
    rfis: [],
    estimates: [],
    photos: [],
    activityFeed: [],
    hoursAdjustments: [],
    messages: [],
    materialTypes: [],
    materialEntries: [],
    documents: [],
    changeOrders: [],
    blueprintPins: [],
    budgetLines: [],
  };
}

export default function DemoPage() {
  const router = useRouter();
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function setup() {
      // Sign out any existing Supabase session so the store boots into demo mode
      try {
        const mod = await import("@/lib/supabase/client");
        if (mod.SUPABASE_ENABLED) {
          const supabase = mod.getClient();
          await supabase.auth.signOut({ scope: "local" });
        }
      } catch {
        /* ignore — demo still works without network */
      }

      // Seed demo data into localStorage — the store reads this on next load
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(buildDemoState()));
      } catch {
        /* ignore */
      }

      // Brief pause so the screen doesn't flash, then go to dashboard
      await new Promise((r) => setTimeout(r, 1400));
      router.push("/dashboard");
    }

    setup();
  }, [router]);

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "#0e0e0e",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "4px",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: "#f59e0b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
          }}
        >
          🏗️
        </div>
        <span
          style={{
            color: "#ffffff",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.5px",
          }}
        >
          Constra
        </span>
        <span
          style={{
            backgroundColor: "rgba(245,158,11,0.15)",
            color: "#f59e0b",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 20,
            border: "1px solid rgba(245,158,11,0.3)",
            letterSpacing: "0.5px",
            textTransform: "uppercase" as const,
          }}
        >
          Beta
        </span>
      </div>

      {/* Spinner */}
      <div
        style={{
          width: 28,
          height: 28,
          border: "2.5px solid rgba(255,255,255,0.08)",
          borderTop: "2.5px solid #f59e0b",
          borderRadius: "50%",
          animation: "spin 0.75s linear infinite",
        }}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <p
        style={{
          color: "rgba(255,255,255,0.55)",
          fontSize: 15,
          margin: 0,
          fontWeight: 500,
        }}
      >
        Setting up Constra Demo{dots}
      </p>
      <p
        style={{
          color: "rgba(255,255,255,0.2)",
          fontSize: 12,
          margin: 0,
        }}
      >
        Loading sample data for beta testing
      </p>
    </div>
  );
}
