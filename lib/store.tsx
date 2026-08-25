"use client";

import {
  createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode,
} from "react";
import type {
  Worker, Project, Task, ClockEntry, PunchItem, SafetyIncident,
  Equipment, RFI, Invoice, Estimate, PhotoEntry, ActivityEvent, HoursAdjustment,
  MaterialType, MaterialEntry, ProjectDocument, Message,
  DailyReport, ChangeOrder, BlueprintPin, BudgetLine,
} from "./mock-data";
import type { Locale } from "./i18n/locales";
import type { CurrencyCode } from "./currency";
import { getClient, SUPABASE_ENABLED } from "@/lib/supabase/client";
import { enqueue, flushQueue, queueLength } from "@/lib/offline-queue";
import type { QueuedOp } from "@/lib/offline-queue";
import {
  notifyClockIn, notifyClockOut, notifySafetyIncident,
  notifyNewRFI, notifyTaskAssigned, notifyTaskDone,
  notifyNewPunchItem, notifyPhotoUploaded, notifyProjectStatusChange,
} from "@/lib/notifications";
import {
  dbToWorker, workerToDb,
  dbToProject, projectToDb, dbToTask, taskToDb,
  dbToClockEntry, clockEntryToDb,
  dbToPunchItem, punchItemToDb,
  dbToSafetyIncident, safetyIncidentToDb,
  dbToEquipment, equipmentToDb,
  dbToRFI, rfiToDb,
  dbToInvoice, invoiceToDb,
  dbToEstimate, estimateToDb,
  dbToPhoto, photoToDb,
  dbToActivity, activityToDb,
  dbToHoursAdjustment, hoursAdjustmentToDb,
  dbToMessage, messageToDb,
  dbToMaterialType, materialTypeToDb,
  dbToMaterialEntry, materialEntryToDb,
  dbToDocument, documentToDb,
  dbToDailyReport, dailyReportToDb,
  dbToChangeOrder, changeOrderToDb,
  dbToBlueprintPin, blueprintPinToDb,
  dbToBudgetLine, budgetLineToDb,
  type DbTask, type DbMessage, type DbMaterialType, type DbMaterialEntry, type DbDocument,
  type DbDailyReport, type DbChangeOrder, type DbBlueprintPin, type DbBudgetLine,
} from "@/lib/supabase/db";

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
}

export function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

type StoreState = {
  companyId: string | null;
  authUserId: string | null;
  isLoading: boolean;
  isOnline: boolean;
  pendingSync: number;
  isRealtimeConnected: boolean;
  isSaving: boolean;
  savedRecently: boolean;
  companyName: string;
  isPro: boolean;
  language: Locale;
  currency: CurrencyCode;
  industry: string;
  onboarded: boolean;
  workers: Worker[];
  hoursAdjustments: HoursAdjustment[];
  projects: Project[];
  clockEntries: ClockEntry[];
  punchItems: PunchItem[];
  safetyIncidents: SafetyIncident[];
  equipment: Equipment[];
  rfis: RFI[];
  invoices: Invoice[];
  estimates: Estimate[];
  photos: PhotoEntry[];
  activityFeed: ActivityEvent[];
  materialTypes: MaterialType[];
  materialEntries: MaterialEntry[];
  documents: ProjectDocument[];
  messages: Message[];
  dailyReports: DailyReport[];
  changeOrders: ChangeOrder[];
  blueprintPins: BlueprintPin[];
  budgetLines: BudgetLine[];
  customRoles: string[];
  companyAddress: string;
  businessNumber: string;
  defaultTaxRate: number;
  overtimeEnabled: boolean;
  overtimeDailyThreshold: number | null;
  overtimeWeeklyThreshold: number | null;
  overtimeMultiplier: number;
  inviteCode: string;
  companyLogo: string;
  permissionsPin: string;
  theme: "dark" | "light";
};

type StoreCtx = StoreState & {
  isOnline: boolean;
  pendingSync: number;
  isRealtimeConnected: boolean;
  isSaving: boolean;
  savedRecently: boolean;
  addWorker: (w: Omit<Worker, "id">) => void;
  updateWorker: (id: string, u: Partial<Worker>) => void;
  deleteWorker: (id: string) => void;

  addProject: (p: Omit<Project, "id" | "tasks">) => void;
  updateProject: (id: string, u: Partial<Omit<Project, "id" | "tasks">>) => void;
  deleteProject: (id: string) => void;
  approveProject: (id: string) => void;

  addTask: (projectId: string, t: Omit<Task, "id" | "projectId">) => void;
  updateTask: (projectId: string, taskId: string, u: Partial<Task>) => void;
  deleteTask: (projectId: string, taskId: string) => void;

  addClockEntry: (e: Omit<ClockEntry, "id">) => string;
  updateClockEntry: (id: string, u: Partial<ClockEntry>) => void;
  deleteClockEntry: (id: string) => void;

  addPunchItem: (p: Omit<PunchItem, "id">) => void;
  updatePunchItem: (id: string, u: Partial<PunchItem>) => void;
  deletePunchItem: (id: string) => void;

  addSafetyIncident: (s: Omit<SafetyIncident, "id">) => void;
  updateSafetyIncident: (id: string, u: Partial<SafetyIncident>) => void;
  deleteSafetyIncident: (id: string) => void;

  addEquipment: (e: Omit<Equipment, "id">) => void;
  updateEquipment: (id: string, u: Partial<Equipment>) => void;
  deleteEquipment: (id: string) => void;

  addRFI: (r: Omit<RFI, "id">) => void;
  updateRFI: (id: string, u: Partial<RFI>) => void;
  deleteRFI: (id: string) => void;

  addInvoice: (i: Omit<Invoice, "id">) => void;
  updateInvoice: (id: string, u: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  addEstimate: (e: Omit<Estimate, "id">) => void;
  updateEstimate: (id: string, u: Partial<Estimate>) => void;
  deleteEstimate: (id: string) => void;

  addPhoto: (p: Omit<PhotoEntry, "id">) => void;
  deletePhoto: (id: string) => void;

  addActivity: (a: Omit<ActivityEvent, "id">) => void;

  addHoursAdjustment: (a: Omit<HoursAdjustment, "id">) => void;
  getWorkerTotalHours: (workerId: string) => number;

  addMaterialType: (m: Omit<MaterialType, "id" | "useCount">) => MaterialType;
  updateMaterialType: (id: string, u: Partial<MaterialType>) => void;
  deleteMaterialType: (id: string) => void;
  incrementMaterialUse: (id: string) => void;

  addMaterialEntry: (e: Omit<MaterialEntry, "id">) => void;
  deleteMaterialEntry: (id: string) => void;

  addBlueprintPin: (pin: Omit<BlueprintPin, "id" | "createdAt">) => void;
  updateBlueprintPin: (id: string, u: Partial<BlueprintPin>) => void;
  deleteBlueprintPin: (id: string) => void;

  addBudgetLine: (b: Omit<BudgetLine, "id" | "createdAt">) => void;
  updateBudgetLine: (id: string, u: Partial<BudgetLine>) => void;
  deleteBudgetLine: (id: string) => void;

  addDocument: (d: Omit<ProjectDocument, "id">) => void;
  deleteDocument: (id: string) => void;
  addDocumentVersion: (id: string, dataUrl: string, sizeBytes: number, uploadedById: string, note?: string) => void;

  addMessage: (m: Omit<Message, "id">) => void;
  deleteMessage: (id: string) => void;

  addDailyReport: (r: Omit<DailyReport, "id" | "createdAt">) => void;
  updateDailyReport: (id: string, u: Partial<DailyReport>) => void;
  deleteDailyReport: (id: string) => void;

  addChangeOrder: (c: Omit<ChangeOrder, "id" | "createdAt">) => void;
  updateChangeOrder: (id: string, u: Partial<ChangeOrder>) => void;
  deleteChangeOrder: (id: string) => void;

  addCustomRole: (role: string) => void;
  deleteCustomRole: (role: string) => void;
  setCompanyAddress: (a: string) => void;
  setBusinessNumber: (b: string) => void;
  setDefaultTaxRate: (r: number) => void;
  setOvertimeSettings: (s: { enabled: boolean; dailyThreshold: number | null; weeklyThreshold: number | null; multiplier: number }) => void;
  setPermissionsPin: (hashedPin: string) => void;

  setCompanyName: (name: string) => void;
  setCompanyLogo: (dataUrl: string) => void;
  setIsPro: (v: boolean) => void;
  setLanguage: (l: Locale) => void;
  setCurrency: (c: CurrencyCode) => void;
  setIndustry: (i: string) => void;
  setOnboarded: (v: boolean) => void;
  getWorkerById: (id: string) => Worker | undefined;
  getProjectById: (id: string) => Project | undefined;
  signOut: () => Promise<void>;
  currentUser: Worker;
  /** "dark" (default) or "light" */
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
};

const STORAGE_KEY = "constra_v1";

function defaultState(): StoreState {
  return {
    companyId: null,
    authUserId: null,
    isLoading: SUPABASE_ENABLED,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    pendingSync: 0,
    isRealtimeConnected: false,
    isSaving: false,
    savedRecently: false,
    companyName: "",
    isPro: true,
    language: "en",
    currency: "CAD",
    industry: "",
    onboarded: false,
    workers: [],
    hoursAdjustments: [],
    projects: [],
    clockEntries: [],
    punchItems: [],
    safetyIncidents: [],
    equipment: [],
    rfis: [],
    invoices: [],
    estimates: [],
    photos: [],
    activityFeed: [],
    materialTypes: [],
    materialEntries: [],
    documents: [],
    messages: [],
    dailyReports: [],
    changeOrders: [],
    blueprintPins: [],
    budgetLines: [],
    customRoles: [],
    companyAddress: "",
    businessNumber: "",
    defaultTaxRate: 13,
    overtimeEnabled: false,
    overtimeDailyThreshold: null,
    overtimeWeeklyThreshold: 40,
    overtimeMultiplier: 1.5,
    inviteCode: "",
    companyLogo: "",
    permissionsPin: "",
    theme: (typeof window !== "undefined" ? (localStorage.getItem("constra_theme") as "dark" | "light" | null) : null) ?? "dark",
  };
}

function loadState(): StoreState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw, reviveDates) as StoreState;
    // Merge with defaults so old cached data missing new fields stays valid
    return {
      ...defaultState(),
      ...parsed,
      isLoading: SUPABASE_ENABLED,
      onboarded: parsed.onboarded ?? false,
      companyId: parsed.companyId ?? null,
      authUserId: parsed.authUserId ?? null,
      hoursAdjustments: parsed.hoursAdjustments ?? [],
      materialTypes: parsed.materialTypes ?? [],
      materialEntries: parsed.materialEntries ?? [],
      documents: parsed.documents ?? [],
      messages: parsed.messages ?? [],
      dailyReports: parsed.dailyReports ?? [],
      changeOrders: parsed.changeOrders ?? [],
      blueprintPins: parsed.blueprintPins ?? [],
      budgetLines: parsed.budgetLines ?? [],
      customRoles: parsed.customRoles ?? [],
      companyAddress: parsed.companyAddress ?? "",
      businessNumber: parsed.businessNumber ?? "",
      defaultTaxRate: parsed.defaultTaxRate ?? 13,
      overtimeEnabled: parsed.overtimeEnabled ?? false,
      overtimeDailyThreshold: parsed.overtimeDailyThreshold ?? null,
      overtimeWeeklyThreshold: parsed.overtimeWeeklyThreshold ?? 40,
      overtimeMultiplier: parsed.overtimeMultiplier ?? 1.5,
      inviteCode: parsed.inviteCode ?? "",
      permissionsPin: parsed.permissionsPin ?? "",
    };
  } catch {
    return defaultState();
  }
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>(() => loadState());
  // Keep a ref so action callbacks can read current state without stale closure
  const stateRef = useRef(state);
  const companyIdRef = useRef<string | null>(null);
  const isOnlineRef = useRef(typeof navigator !== "undefined" ? navigator.onLine : true);
  const savingCountRef = useRef(0);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stateRef.current = state;
    companyIdRef.current = state.companyId ?? null;
    isOnlineRef.current = state.isOnline;
  }, [state]);

  // Persist to localStorage (keep as offline cache)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }, [state]);

  // Track online/offline and flush queued ops when reconnected
  useEffect(() => {
    const goOnline = async () => {
      setState((s) => ({ ...s, isOnline: true, pendingSync: queueLength() }));
      if (SUPABASE_ENABLED) {
        const synced = await flushQueue(getClient());
        if (synced > 0) setState((s) => ({ ...s, pendingSync: 0 }));
      }
    };
    const goOffline = () => setState((s) => ({ ...s, isOnline: false }));
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Supabase boot ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!SUPABASE_ENABLED) return;

    const supabase = getClient();

    async function loadAllData(companyId: string, userId: string) {
      const [
        { data: profilesData },
        { data: companiesData },
        { data: projectsData },
        { data: tasksData },
        { data: clockData },
        { data: punchData },
        { data: safetyData },
        { data: equipData },
        { data: rfisData },
        { data: invoicesData },
        { data: estimatesData },
        { data: photosData },
        { data: activityData },
        { data: adjustmentsData },
        { data: messagesData },
        { data: materialTypesData },
        { data: materialEntriesData },
        { data: documentsData },
        { data: dailyReportsData },
        { data: changeOrdersData },
        { data: blueprintPinsData },
        { data: budgetLinesData },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("company_id", companyId),
        supabase.from("companies").select("*").eq("id", companyId).single(),
        supabase.from("projects").select("*").eq("company_id", companyId),
        supabase.from("tasks").select("*").eq("company_id", companyId),
        supabase.from("clock_entries").select("*").eq("company_id", companyId)
          .order("clock_in", { ascending: false }).limit(500),
        supabase.from("punch_items").select("*").eq("company_id", companyId),
        supabase.from("safety_incidents").select("*").eq("company_id", companyId),
        supabase.from("equipment").select("*").eq("company_id", companyId),
        supabase.from("rfis").select("*").eq("company_id", companyId),
        supabase.from("invoices").select("*").eq("company_id", companyId),
        supabase.from("estimates").select("*").eq("company_id", companyId),
        supabase.from("photos").select("*").eq("company_id", companyId)
          .order("uploaded_at", { ascending: false }).limit(200),
        supabase.from("activity_feed").select("*").eq("company_id", companyId)
          .order("timestamp", { ascending: false }).limit(50),
        supabase.from("hours_adjustments").select("*").eq("company_id", companyId),
        supabase.from("crew_messages").select("*").eq("company_id", companyId)
          .order("timestamp", { ascending: true }).limit(500),
        supabase.from("material_types").select("*").eq("company_id", companyId),
        supabase.from("material_entries").select("*").eq("company_id", companyId),
        supabase.from("documents").select("*").eq("company_id", companyId)
          .order("uploaded_at", { ascending: false }).limit(200),
        supabase.from("daily_reports").select("*").eq("company_id", companyId)
          .order("date", { ascending: false }).limit(200),
        supabase.from("change_orders").select("*").eq("company_id", companyId)
          .order("submitted_at", { ascending: false }),
        supabase.from("blueprint_pins").select("*").eq("company_id", companyId),
        supabase.from("budget_lines").select("*").eq("company_id", companyId).order("created_at", { ascending: true }),
      ]);

      // Group tasks by project_id for efficient lookup
      const tasksByProject: Record<string, DbTask[]> = {};
      (tasksData ?? []).forEach((t) => {
        if (!tasksByProject[t.project_id]) tasksByProject[t.project_id] = [];
        tasksByProject[t.project_id].push(t as DbTask);
      });

      const co = companiesData as { name: string; plan: string; subscription_status?: string; trial_ends_at?: string; language: string; currency: string; industry: string; invite_code?: string; address?: string; business_number?: string; logo?: string; default_tax_rate?: number; overtime_enabled?: boolean; overtime_daily_threshold?: number | null; overtime_weekly_threshold?: number | null; overtime_multiplier?: number } | null;

      const isPro = true; // free during launch period

      setState((s) => ({
        ...s,
        companyId,
        authUserId: userId,
        isLoading: false,
        onboarded: true,
        companyName: co?.name ?? s.companyName,
        isPro,
        language: (co?.language ?? s.language) as Locale,
        currency: (co?.currency ?? s.currency) as CurrencyCode,
        industry: co?.industry ?? s.industry,
        workers: (profilesData ?? []).map(dbToWorker),
        projects: (projectsData ?? []).map((p) => dbToProject(p, tasksByProject[p.id] ?? [])),
        clockEntries: (clockData ?? []).map(dbToClockEntry),
        punchItems: (punchData ?? []).map(dbToPunchItem),
        safetyIncidents: (safetyData ?? []).map(dbToSafetyIncident),
        equipment: (equipData ?? []).map(dbToEquipment),
        rfis: (rfisData ?? []).map(dbToRFI),
        invoices: (invoicesData ?? []).map(dbToInvoice),
        estimates: (estimatesData ?? []).map(dbToEstimate),
        photos: (photosData ?? []).map(dbToPhoto),
        activityFeed: (activityData ?? []).map(dbToActivity),
        hoursAdjustments: (adjustmentsData ?? []).map(dbToHoursAdjustment),
        messages: (messagesData ?? []).map((m) => dbToMessage(m as DbMessage)),
        materialTypes: (materialTypesData ?? []).map((m) => dbToMaterialType(m as DbMaterialType)),
        materialEntries: (materialEntriesData ?? []).map((e) => dbToMaterialEntry(e as DbMaterialEntry)),
        documents: (documentsData ?? []).map((d) => dbToDocument(d as DbDocument)),
        dailyReports: (dailyReportsData ?? []).map((r) => dbToDailyReport(r as DbDailyReport)),
        changeOrders: (changeOrdersData ?? []).map((c) => dbToChangeOrder(c as DbChangeOrder)),
        blueprintPins: (blueprintPinsData ?? []).map((p) => dbToBlueprintPin(p as DbBlueprintPin)),
        budgetLines: (budgetLinesData ?? []).map((b) => dbToBudgetLine(b as DbBudgetLine)),
        inviteCode: co?.invite_code ?? "",
        companyAddress: co?.address ?? "",
        businessNumber: co?.business_number ?? "",
        defaultTaxRate: co?.default_tax_rate ?? 13,
        overtimeEnabled: co?.overtime_enabled ?? false,
        overtimeDailyThreshold: co?.overtime_daily_threshold ?? null,
        overtimeWeeklyThreshold: co?.overtime_weekly_threshold ?? 40,
        overtimeMultiplier: co?.overtime_multiplier ?? 1.5,
        companyLogo: co?.logo ?? s.companyLogo,
      }));
    }

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    function setupRealtime(companyId: string) {
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);

      realtimeChannel = supabase
        .channel(`company:${companyId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") setState((s) => ({ ...s, workers: [...s.workers.filter(w => w.id !== (p.new as {id:string}).id), dbToWorker(p.new as Parameters<typeof dbToWorker>[0])] }));
          else if (p.eventType === "UPDATE") setState((s) => ({ ...s, workers: s.workers.map(w => w.id === (p.new as {id:string}).id ? dbToWorker(p.new as Parameters<typeof dbToWorker>[0]) : w) }));
          else if (p.eventType === "DELETE") setState((s) => ({ ...s, workers: s.workers.filter(w => w.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "projects", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") setState((s) => ({ ...s, projects: [...s.projects.filter(x => x.id !== (p.new as {id:string}).id), dbToProject(p.new as Parameters<typeof dbToProject>[0])] }));
          else if (p.eventType === "UPDATE") {
            const newProj = p.new as { id: string; name: string; status: string };
            const prevProj = stateRef.current.projects.find(x => x.id === newProj.id);
            setState((s) => ({ ...s, projects: s.projects.map(x => x.id === newProj.id ? dbToProject(p.new as Parameters<typeof dbToProject>[0], stateRef.current.projects.find(pr => pr.id === newProj.id)?.tasks.map(t => ({ id: t.id, project_id: t.projectId, company_id: companyId, name: t.name, progress: t.progress, worker_id: t.workerId ?? null, start_date: t.startDate.toISOString(), end_date: t.endDate.toISOString(), status: t.status, created_at: undefined } as DbTask)) ?? []) : x) }));
            if (prevProj && prevProj.status !== newProj.status) {
              notifyProjectStatusChange(newProj.name, newProj.status, newProj.id);
            }
          } else if (p.eventType === "DELETE") setState((s) => ({ ...s, projects: s.projects.filter(x => x.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT" || p.eventType === "UPDATE") {
            const task = dbToTask(p.new as DbTask);
            const pr = stateRef.current.projects.find(pr => pr.id === task.projectId);
            setState((s) => ({ ...s, projects: s.projects.map(pr => pr.id === task.projectId ? { ...pr, tasks: [...pr.tasks.filter(t => t.id !== task.id), task] } : pr) }));
            if (p.eventType === "INSERT" && task.workerId === stateRef.current.authUserId && pr) {
              notifyTaskAssigned(task.name, pr.name, task.id);
            }
            if (p.eventType === "UPDATE" && task.status === "completed" && pr) {
              const prev = stateRef.current.projects.find(x => x.id === task.projectId)?.tasks.find(t => t.id === task.id);
              if (prev && prev.status !== "completed") notifyTaskDone(task.name, pr.name, task.id);
            }
          } else if (p.eventType === "DELETE") {
            const old = p.old as { id: string; project_id: string };
            setState((s) => ({ ...s, projects: s.projects.map(pr => pr.id === old.project_id ? { ...pr, tasks: pr.tasks.filter(t => t.id !== old.id) } : pr) }));
          }
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "clock_entries", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") {
            const entry = dbToClockEntry(p.new as Parameters<typeof dbToClockEntry>[0]);
            setState((s) => ({ ...s, clockEntries: [entry, ...s.clockEntries.filter(e => e.id !== entry.id)] }));
            const w = stateRef.current.workers.find(w => w.id === entry.workerId);
            const pr = stateRef.current.projects.find(p => p.id === entry.projectId);
            if (w && pr) notifyClockIn(w.name, pr.name, entry.id);
          } else if (p.eventType === "UPDATE") {
            const entry = dbToClockEntry(p.new as Parameters<typeof dbToClockEntry>[0]);
            setState((s) => ({ ...s, clockEntries: s.clockEntries.map(e => e.id === entry.id ? entry : e) }));
            if (entry.clockOut) {
              const w = stateRef.current.workers.find(w => w.id === entry.workerId);
              const pr = stateRef.current.projects.find(p => p.id === entry.projectId);
              if (w && pr) {
                const hrs = ((entry.clockOut.getTime() - entry.clockIn.getTime()) / 3600000).toFixed(1) + "h";
                notifyClockOut(w.name, pr.name, hrs, entry.id);
              }
            }
          } else if (p.eventType === "DELETE") setState((s) => ({ ...s, clockEntries: s.clockEntries.filter(e => e.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "punch_items", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") {
            const item = dbToPunchItem(p.new as Parameters<typeof dbToPunchItem>[0]);
            setState((s) => ({ ...s, punchItems: [...s.punchItems.filter(x => x.id !== item.id), item] }));
            const pr = stateRef.current.projects.find(pr => pr.id === item.projectId);
            notifyNewPunchItem(item.title, pr?.name ?? "Unknown Project", item.id);
          } else if (p.eventType === "UPDATE") setState((s) => ({ ...s, punchItems: s.punchItems.map(x => x.id === (p.new as {id:string}).id ? dbToPunchItem(p.new as Parameters<typeof dbToPunchItem>[0]) : x) }));
          else if (p.eventType === "DELETE") setState((s) => ({ ...s, punchItems: s.punchItems.filter(x => x.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "safety_incidents", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") {
            const incident = dbToSafetyIncident(p.new as Parameters<typeof dbToSafetyIncident>[0]);
            setState((s) => ({ ...s, safetyIncidents: [...s.safetyIncidents.filter(x => x.id !== incident.id), incident] }));
            const pr = stateRef.current.projects.find(pr => pr.id === incident.projectId);
            notifySafetyIncident(incident.description, pr?.name ?? "Unknown Project", incident.severity, incident.id);
          } else if (p.eventType === "UPDATE") setState((s) => ({ ...s, safetyIncidents: s.safetyIncidents.map(x => x.id === (p.new as {id:string}).id ? dbToSafetyIncident(p.new as Parameters<typeof dbToSafetyIncident>[0]) : x) }));
          else if (p.eventType === "DELETE") setState((s) => ({ ...s, safetyIncidents: s.safetyIncidents.filter(x => x.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "equipment", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") setState((s) => ({ ...s, equipment: [...s.equipment.filter(x => x.id !== (p.new as {id:string}).id), dbToEquipment(p.new as Parameters<typeof dbToEquipment>[0])] }));
          else if (p.eventType === "UPDATE") setState((s) => ({ ...s, equipment: s.equipment.map(x => x.id === (p.new as {id:string}).id ? dbToEquipment(p.new as Parameters<typeof dbToEquipment>[0]) : x) }));
          else if (p.eventType === "DELETE") setState((s) => ({ ...s, equipment: s.equipment.filter(x => x.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "rfis", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") {
            const rfi = dbToRFI(p.new as Parameters<typeof dbToRFI>[0]);
            setState((s) => ({ ...s, rfis: [...s.rfis.filter(x => x.id !== rfi.id), rfi] }));
            const pr = stateRef.current.projects.find(pr => pr.id === rfi.projectId);
            notifyNewRFI(rfi.subject, pr?.name ?? "Unknown Project", rfi.id);
          } else if (p.eventType === "UPDATE") setState((s) => ({ ...s, rfis: s.rfis.map(x => x.id === (p.new as {id:string}).id ? dbToRFI(p.new as Parameters<typeof dbToRFI>[0]) : x) }));
          else if (p.eventType === "DELETE") setState((s) => ({ ...s, rfis: s.rfis.filter(x => x.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "invoices", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") setState((s) => ({ ...s, invoices: [...s.invoices.filter(x => x.id !== (p.new as {id:string}).id), dbToInvoice(p.new as Parameters<typeof dbToInvoice>[0])] }));
          else if (p.eventType === "UPDATE") setState((s) => ({ ...s, invoices: s.invoices.map(x => x.id === (p.new as {id:string}).id ? dbToInvoice(p.new as Parameters<typeof dbToInvoice>[0]) : x) }));
          else if (p.eventType === "DELETE") setState((s) => ({ ...s, invoices: s.invoices.filter(x => x.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "estimates", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") setState((s) => ({ ...s, estimates: [...s.estimates.filter(x => x.id !== (p.new as {id:string}).id), dbToEstimate(p.new as Parameters<typeof dbToEstimate>[0])] }));
          else if (p.eventType === "UPDATE") setState((s) => ({ ...s, estimates: s.estimates.map(x => x.id === (p.new as {id:string}).id ? dbToEstimate(p.new as Parameters<typeof dbToEstimate>[0]) : x) }));
          else if (p.eventType === "DELETE") setState((s) => ({ ...s, estimates: s.estimates.filter(x => x.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "photos", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") {
            const photo = dbToPhoto(p.new as Parameters<typeof dbToPhoto>[0]);
            setState((s) => ({ ...s, photos: [photo, ...s.photos.filter(x => x.id !== photo.id)] }));
            const uploader = stateRef.current.workers.find(w => w.id === photo.uploadedById);
            const pr = stateRef.current.projects.find(pr => pr.id === photo.projectId);
            if (uploader && pr && uploader.id !== stateRef.current.authUserId) {
              notifyPhotoUploaded(uploader.name, pr.name, photo.id);
            }
          } else if (p.eventType === "DELETE") setState((s) => ({ ...s, photos: s.photos.filter(x => x.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "activity_feed", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") setState((s) => ({ ...s, activityFeed: [dbToActivity(p.new as Parameters<typeof dbToActivity>[0]), ...s.activityFeed].slice(0, 50) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "hours_adjustments", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") setState((s) => ({ ...s, hoursAdjustments: [...s.hoursAdjustments, dbToHoursAdjustment(p.new as Parameters<typeof dbToHoursAdjustment>[0])] }));
        })
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "crew_messages", filter: `company_id=eq.${companyId}` }, (p) => {
          const msg = dbToMessage(p.new as DbMessage);
          setState((s) => {
            if (s.messages.some((m) => m.id === msg.id)) return s;
            return { ...s, messages: [...s.messages, msg] };
          });
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "daily_reports", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") setState((s) => ({ ...s, dailyReports: [dbToDailyReport(p.new as DbDailyReport), ...s.dailyReports.filter(x => x.id !== (p.new as {id:string}).id)] }));
          else if (p.eventType === "UPDATE") setState((s) => ({ ...s, dailyReports: s.dailyReports.map(x => x.id === (p.new as {id:string}).id ? dbToDailyReport(p.new as DbDailyReport) : x) }));
          else if (p.eventType === "DELETE") setState((s) => ({ ...s, dailyReports: s.dailyReports.filter(x => x.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "change_orders", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") setState((s) => ({ ...s, changeOrders: [dbToChangeOrder(p.new as DbChangeOrder), ...s.changeOrders.filter(x => x.id !== (p.new as {id:string}).id)] }));
          else if (p.eventType === "UPDATE") setState((s) => ({ ...s, changeOrders: s.changeOrders.map(x => x.id === (p.new as {id:string}).id ? dbToChangeOrder(p.new as DbChangeOrder) : x) }));
          else if (p.eventType === "DELETE") setState((s) => ({ ...s, changeOrders: s.changeOrders.filter(x => x.id !== (p.old as {id:string}).id) }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "blueprint_pins", filter: `company_id=eq.${companyId}` }, (p) => {
          if (p.eventType === "INSERT") setState((s) => ({ ...s, blueprintPins: [...s.blueprintPins.filter(x => x.id !== (p.new as {id:string}).id), dbToBlueprintPin(p.new as DbBlueprintPin)] }));
          else if (p.eventType === "UPDATE") setState((s) => ({ ...s, blueprintPins: s.blueprintPins.map(x => x.id === (p.new as {id:string}).id ? dbToBlueprintPin(p.new as DbBlueprintPin) : x) }));
          else if (p.eventType === "DELETE") setState((s) => ({ ...s, blueprintPins: s.blueprintPins.filter(x => x.id !== (p.old as {id:string}).id) }));
        })
        .subscribe((status) => {
          setState((s) => ({ ...s, isRealtimeConnected: status === "SUBSCRIBED" }));
        });
    }

    async function boot() {
      try {
        // Guard against a network call that never resolves or rejects (slow/dead
        // connection, cold-starting backend) — without this, a genuine hang here
        // would leave the splash screen spinning forever with no way out. Cached
        // local data (already hydrated via loadState() above) still renders once
        // isLoading flips false, so this is a pure safety net, not a behavior change
        // on the happy path.
        const BOOT_TIMEOUT_MS = 15000;
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("boot-timeout")), BOOT_TIMEOUT_MS)
        );

        await Promise.race([
          (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              setState((s) => ({ ...s, isLoading: false }));
              return;
            }
            const { data: profile } = await supabase
              .from("profiles").select("company_id").eq("id", user.id).single();
            if (!profile) {
              setState((s) => ({ ...s, isLoading: false }));
              return;
            }
            const companyId = profile.company_id as string;
            await loadAllData(companyId, user.id);
            setupRealtime(companyId);
          })(),
          timeout,
        ]);
      } catch {
        setState((s) => ({ ...s, isLoading: false }));
      }
    }

    boot();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) boot();
      if (event === "SIGNED_OUT") {
        if (realtimeChannel) supabase.removeChannel(realtimeChannel);
        setState({ ...defaultState(), isLoading: false });
      }
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, []);

  // Service worker registration is handled in components/pwa-install.tsx

  const up = useCallback((fn: (s: StoreState) => StoreState) => setState(fn), []);

  // Fire-and-forget background Supabase write.
  // Uses `any` because PostgrestFilterBuilder is thenable but not a full Promise.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function bg(fn: () => any, label: string, queuedOp?: Omit<QueuedOp, "id" | "timestamp">) {
    if (!SUPABASE_ENABLED || !companyIdRef.current) return;
    if (!isOnlineRef.current) {
      if (queuedOp) {
        enqueue(queuedOp);
        setState((s) => ({ ...s, pendingSync: queueLength() }));
      }
      return;
    }
    savingCountRef.current++;
    setState((s) => ({ ...s, isSaving: true, savedRecently: false }));
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    Promise.resolve(fn()).then((result: { error: unknown } | null) => {
      if (result?.error) console.error(`[store:${label}]`, result.error);
    }).finally(() => {
      savingCountRef.current = Math.max(0, savingCountRef.current - 1);
      if (savingCountRef.current === 0) {
        setState((s) => ({ ...s, isSaving: false, savedRecently: true }));
        savedTimerRef.current = setTimeout(() => setState((s) => ({ ...s, savedRecently: false })), 2000);
      }
    });
  }

  // ── Workers ──────────────────────────────────────────────────────────────────

  const addWorker = useCallback((w: Omit<Worker, "id">) => {
    const worker = { ...w, id: genId() };
    up((s) => ({ ...s, workers: [...s.workers, worker] }));
    bg(() => getClient().from("profiles").insert(workerToDb(worker, companyIdRef.current!)), "addWorker");
  }, [up]);

  const updateWorker = useCallback((id: string, u: Partial<Worker>) => {
    up((s) => ({ ...s, workers: s.workers.map((w) => w.id === id ? { ...w, ...u } : w) }));
    bg(() => {
      const merged = stateRef.current.workers.find((w) => w.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("profiles").update(workerToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updateWorker");
  }, [up]);

  const deleteWorker = useCallback((id: string) => {
    up((s) => ({ ...s, workers: s.workers.filter((w) => w.id !== id) }));
    // Delete the Supabase auth user (and their profile) via server route — auth.admin requires service role
    fetch("/api/delete-worker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: id }),
    }).catch((err) => console.error("deleteWorker API error:", err));
  }, [up]);

  // ── Projects ─────────────────────────────────────────────────────────────────

  const addProject = useCallback((p: Omit<Project, "id" | "tasks">) => {
    const project = { ...p, id: genId(), tasks: [] };
    up((s) => ({ ...s, projects: [...s.projects, project] }));
    bg(() => getClient().from("projects").insert(projectToDb(project, companyIdRef.current!)), "addProject");
  }, [up]);

  const updateProject = useCallback((id: string, u: Partial<Omit<Project, "id" | "tasks">>) => {
    up((s) => ({ ...s, projects: s.projects.map((p) => p.id === id ? { ...p, ...u } : p) }));
    bg(() => {
      const merged = stateRef.current.projects.find((p) => p.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("projects").update(projectToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updateProject");
  }, [up]);

  const deleteProject = useCallback((id: string) => {
    up((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) }));
    bg(() => getClient().from("projects").delete().eq("id", id), "deleteProject");
  }, [up]);

  const approveProject = useCallback((id: string) => {
    up((s) => ({ ...s, projects: s.projects.map((p) => p.id === id ? { ...p, pendingApproval: false } : p) }));
    bg(() => getClient().from("projects").update({ pending_approval: false }).eq("id", id), "approveProject");
  }, [up]);

  // ── Tasks ─────────────────────────────────────────────────────────────────────

  const addTask = useCallback((projectId: string, t: Omit<Task, "id" | "projectId">) => {
    const task = { ...t, id: genId(), projectId };
    up((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, tasks: [...p.tasks, task] } : p),
    }));
    bg(() => getClient().from("tasks").insert(taskToDb(task, companyIdRef.current!)), "addTask");
    // Email the assigned worker
    if (t.workerId) {
      const worker = stateRef.current.workers.find((w) => w.id === t.workerId);
      const project = stateRef.current.projects.find((p) => p.id === projectId);
      const assigner = stateRef.current.workers.find((w) => w.id === stateRef.current.authUserId);
      if (worker?.email && project) {
        fetch("/api/notify/task-assigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: worker.email,
            taskName: t.name,
            projectName: project.name,
            assigneeName: worker.name,
            assignerName: assigner?.name ?? "Your manager",
            dueDate: t.endDate?.toLocaleDateString("en-CA"),
            companyName: (stateRef.current as { companyName?: string }).companyName ?? "",
          }),
        }).catch(() => {});
      }
    }
  }, [up]);

  const updateTask = useCallback((projectId: string, taskId: string, u: Partial<Task>) => {
    // Fire assignment notification if workerId changed
    if (u.workerId && companyIdRef.current) {
      const project = stateRef.current.projects.find((p) => p.id === projectId);
      const task = project?.tasks.find((t) => t.id === taskId);
      if (project && task && u.workerId !== task.workerId) {
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "task_assigned",
            companyId: companyIdRef.current,
            data: {
              assigneeUserId: u.workerId,
              assignerName: stateRef.current.workers.find((w) => w.id === stateRef.current.authUserId) ?? stateRef.current.workers[0].name,
              taskName: task.name,
              projectName: project.name,
              dueDate: u.endDate ? new Date(u.endDate).toLocaleDateString() : (task.endDate ? new Date(task.endDate).toLocaleDateString() : ""),
            },
          }),
        }).catch(() => {});
      }
    }
    up((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, tasks: p.tasks.map((t) => t.id === taskId ? { ...t, ...u } : t) }
          : p),
    }));
    bg(() => {
      const project = stateRef.current.projects.find((p) => p.id === projectId);
      const task = project?.tasks.find((t) => t.id === taskId);
      if (!task) return Promise.resolve({ error: null });
      return getClient().from("tasks").update(taskToDb({ ...task, ...u }, companyIdRef.current!)).eq("id", taskId);
    }, "updateTask");
  }, [up]);

  const deleteTask = useCallback((projectId: string, taskId: string) => {
    up((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId) } : p),
    }));
    bg(() => getClient().from("tasks").delete().eq("id", taskId), "deleteTask");
  }, [up]);

  // ── Clock entries ─────────────────────────────────────────────────────────────

  const addClockEntry = useCallback((e: Omit<ClockEntry, "id">): string => {
    const id = genId();
    const entry = { ...e, id };
    up((s) => ({ ...s, clockEntries: [...s.clockEntries, entry] }));
    const dbRow = companyIdRef.current ? clockEntryToDb(entry, companyIdRef.current) : null;
    bg(
      () => getClient().from("clock_entries").insert(dbRow!),
      "addClockEntry",
      dbRow ? { table: "clock_entries", op: "insert", data: dbRow as Record<string, unknown> } : undefined,
    );
    const w = stateRef.current.workers.find(w => w.id === e.workerId);
    const pr = stateRef.current.projects.find(p => p.id === e.projectId);
    if (w && pr) notifyClockIn(w.name, pr.name, id);
    return id;
  }, [up]);

  const updateClockEntry = useCallback((id: string, u: Partial<ClockEntry>) => {
    up((s) => ({ ...s, clockEntries: s.clockEntries.map((e) => e.id === id ? { ...e, ...u } : e) }));
    bg(() => {
      const merged = stateRef.current.clockEntries.find((e) => e.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("clock_entries").update(clockEntryToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updateClockEntry", (() => {
      const merged = stateRef.current.clockEntries.find((e) => e.id === id);
      if (!merged || !companyIdRef.current) return undefined;
      return { table: "clock_entries", op: "update" as const, data: clockEntryToDb({ ...merged, ...u }, companyIdRef.current) as Record<string, unknown>, eqId: id };
    })());
  }, [up]);

  const deleteClockEntry = useCallback((id: string) => {
    up((s) => ({ ...s, clockEntries: s.clockEntries.filter((e) => e.id !== id) }));
    bg(() => getClient().from("clock_entries").delete().eq("id", id), "deleteClockEntry",
      { table: "clock_entries", op: "delete" as const, data: {}, eqId: id });
  }, [up]);

  // ── Punch items ───────────────────────────────────────────────────────────────

  const addPunchItem = useCallback((p: Omit<PunchItem, "id">) => {
    const item = { ...p, id: genId() };
    up((s) => ({ ...s, punchItems: [...s.punchItems, item] }));
    bg(() => getClient().from("punch_items").insert(punchItemToDb(item, companyIdRef.current!)), "addPunchItem");
  }, [up]);

  const updatePunchItem = useCallback((id: string, u: Partial<PunchItem>) => {
    up((s) => ({ ...s, punchItems: s.punchItems.map((p) => p.id === id ? { ...p, ...u } : p) }));
    bg(() => {
      const merged = stateRef.current.punchItems.find((p) => p.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("punch_items").update(punchItemToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updatePunchItem");
  }, [up]);

  const deletePunchItem = useCallback((id: string) => {
    up((s) => ({ ...s, punchItems: s.punchItems.filter((p) => p.id !== id) }));
    bg(() => getClient().from("punch_items").delete().eq("id", id), "deletePunchItem");
  }, [up]);

  // ── Safety incidents ──────────────────────────────────────────────────────────

  const addSafetyIncident = useCallback((s2: Omit<SafetyIncident, "id">) => {
    const item = { ...s2, id: genId() };
    up((s) => ({ ...s, safetyIncidents: [...s.safetyIncidents, item] }));
    bg(() => getClient().from("safety_incidents").insert(safetyIncidentToDb(item, companyIdRef.current!)), "addSafetyIncident");
    const pr = stateRef.current.projects.find(p => p.id === item.projectId);
    notifySafetyIncident(item.description, pr?.name ?? "Unknown Project", item.severity, item.id);
    if (companyIdRef.current) {
      const reporter = stateRef.current.workers.find((w) => w.id === stateRef.current.authUserId) ?? stateRef.current.workers[0];
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "safety_incident",
          companyId: companyIdRef.current,
          data: {
            reporterUserId: reporter.id,
            reporterName: reporter.name,
            projectName: pr?.name ?? "Unknown Project",
            description: item.description,
            severity: item.severity ?? "",
          },
        }),
      }).catch(() => {});
    }
  }, [up]);

  const updateSafetyIncident = useCallback((id: string, u: Partial<SafetyIncident>) => {
    up((s) => ({ ...s, safetyIncidents: s.safetyIncidents.map((x) => x.id === id ? { ...x, ...u } : x) }));
    bg(() => {
      const merged = stateRef.current.safetyIncidents.find((x) => x.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("safety_incidents").update(safetyIncidentToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updateSafetyIncident");
  }, [up]);

  // ── Equipment ─────────────────────────────────────────────────────────────────

  const addEquipment = useCallback((e: Omit<Equipment, "id">) => {
    const item = { ...e, id: genId() };
    up((s) => ({ ...s, equipment: [...s.equipment, item] }));
    bg(() => getClient().from("equipment").insert(equipmentToDb(item, companyIdRef.current!)), "addEquipment");
  }, [up]);

  const updateEquipment = useCallback((id: string, u: Partial<Equipment>) => {
    up((s) => ({ ...s, equipment: s.equipment.map((e) => e.id === id ? { ...e, ...u } : e) }));
    bg(() => {
      const merged = stateRef.current.equipment.find((e) => e.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("equipment").update(equipmentToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updateEquipment");
  }, [up]);

  const deleteEquipment = useCallback((id: string) => {
    up((s) => ({ ...s, equipment: s.equipment.filter((e) => e.id !== id) }));
    bg(() => getClient().from("equipment").delete().eq("id", id), "deleteEquipment");
  }, [up]);

  const deleteSafetyIncident = useCallback((id: string) => {
    up((s) => ({ ...s, safetyIncidents: s.safetyIncidents.filter((x) => x.id !== id) }));
    bg(() => getClient().from("safety_incidents").delete().eq("id", id), "deleteSafetyIncident",
      { table: "safety_incidents", op: "delete" as const, data: {}, eqId: id });
  }, [up]);

  // ── RFIs ──────────────────────────────────────────────────────────────────────

  const addRFI = useCallback((r: Omit<RFI, "id">) => {
    const item = { ...r, id: genId() };
    up((s) => ({ ...s, rfis: [...s.rfis, item] }));
    bg(() => getClient().from("rfis").insert(rfiToDb(item, companyIdRef.current!)), "addRFI");
  }, [up]);

  const updateRFI = useCallback((id: string, u: Partial<RFI>) => {
    up((s) => ({ ...s, rfis: s.rfis.map((r) => r.id === id ? { ...r, ...u } : r) }));
    bg(() => {
      const merged = stateRef.current.rfis.find((r) => r.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("rfis").update(rfiToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updateRFI");
  }, [up]);

  const deleteRFI = useCallback((id: string) => {
    up((s) => ({ ...s, rfis: s.rfis.filter((r) => r.id !== id) }));
    bg(() => getClient().from("rfis").delete().eq("id", id), "deleteRFI",
      { table: "rfis", op: "delete" as const, data: {}, eqId: id });
  }, [up]);

  // ── Invoices ──────────────────────────────────────────────────────────────────

  const addInvoice = useCallback((i: Omit<Invoice, "id">) => {
    const item = { ...i, id: genId() };
    up((s) => ({ ...s, invoices: [...s.invoices, item] }));
    bg(() => getClient().from("invoices").insert(invoiceToDb(item, companyIdRef.current!)), "addInvoice");
  }, [up]);

  const updateInvoice = useCallback((id: string, u: Partial<Invoice>) => {
    up((s) => ({ ...s, invoices: s.invoices.map((i) => i.id === id ? { ...i, ...u } : i) }));
    bg(() => {
      const merged = stateRef.current.invoices.find((i) => i.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("invoices").update(invoiceToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updateInvoice");
  }, [up]);

  const deleteInvoice = useCallback((id: string) => {
    up((s) => ({ ...s, invoices: s.invoices.filter((i) => i.id !== id) }));
    bg(() => getClient().from("invoices").delete().eq("id", id), "deleteInvoice");
  }, [up]);

  // ── Estimates ─────────────────────────────────────────────────────────────────

  const addEstimate = useCallback((e: Omit<Estimate, "id">) => {
    const item = { ...e, id: genId() };
    up((s) => ({ ...s, estimates: [...s.estimates, item] }));
    bg(() => getClient().from("estimates").insert(estimateToDb(item, companyIdRef.current!)), "addEstimate");
  }, [up]);

  const updateEstimate = useCallback((id: string, u: Partial<Estimate>) => {
    up((s) => ({ ...s, estimates: s.estimates.map((e) => e.id === id ? { ...e, ...u } : e) }));
    bg(() => {
      const merged = stateRef.current.estimates.find((e) => e.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("estimates").update(estimateToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updateEstimate");
  }, [up]);

  const deleteEstimate = useCallback((id: string) => {
    up((s) => ({ ...s, estimates: s.estimates.filter((e) => e.id !== id) }));
    bg(() => getClient().from("estimates").delete().eq("id", id), "deleteEstimate");
  }, [up]);

  // ── Photos ────────────────────────────────────────────────────────────────────

  const addPhoto = useCallback((p: Omit<PhotoEntry, "id">) => {
    const item = { ...p, id: genId() };
    up((s) => ({ ...s, photos: [...s.photos, item] }));
    bg(() => getClient().from("photos").insert(photoToDb(item, companyIdRef.current!)), "addPhoto");
  }, [up]);

  const deletePhoto = useCallback((id: string) => {
    up((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) }));
    bg(() => getClient().from("photos").delete().eq("id", id), "deletePhoto");
  }, [up]);

  // ── Activity ──────────────────────────────────────────────────────────────────

  const addActivity = useCallback((a: Omit<ActivityEvent, "id">) => {
    const item = { ...a, id: genId() };
    up((s) => ({ ...s, activityFeed: [item, ...s.activityFeed].slice(0, 50) }));
    bg(() => getClient().from("activity_feed").insert(activityToDb(item, companyIdRef.current!)), "addActivity");
  }, [up]);

  // ── Hours adjustments ─────────────────────────────────────────────────────────

  const addHoursAdjustment = useCallback((a: Omit<HoursAdjustment, "id">) => {
    const item = { ...a, id: genId() };
    up((s) => ({ ...s, hoursAdjustments: [...(s.hoursAdjustments ?? []), item] }));
    bg(() => getClient().from("hours_adjustments").insert(hoursAdjustmentToDb(item, companyIdRef.current!)), "addHoursAdjustment");
  }, [up]);

  const getWorkerTotalHours = useCallback((workerId: string): number => {
    const fromEntries = (state.clockEntries ?? [])
      .filter((e) => e.workerId === workerId && e.clockOut)
      .reduce((sum, e) => sum + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0);
    const fromAdjustments = (state.hoursAdjustments ?? [])
      .filter((a) => a.workerId === workerId)
      .reduce((sum, a) => sum + a.deltaHours, 0);
    return Math.max(0, fromEntries + fromAdjustments);
  }, [state.clockEntries, state.hoursAdjustments]);

  // ── Material types ────────────────────────────────────────────────────────────

  const addMaterialType = useCallback((m: Omit<MaterialType, "id" | "useCount">): MaterialType => {
    const item: MaterialType = { ...m, id: genId(), useCount: 0 };
    up((s) => ({ ...s, materialTypes: [...s.materialTypes, item] }));
    bg(() => getClient().from("material_types").insert(materialTypeToDb(item, companyIdRef.current!)), "addMaterialType");
    return item;
  }, [up]);

  const updateMaterialType = useCallback((id: string, u: Partial<MaterialType>) => {
    up((s) => ({ ...s, materialTypes: s.materialTypes.map((m) => m.id === id ? { ...m, ...u } : m) }));
    bg(() => {
      const updated = stateRef.current.materialTypes.find((m) => m.id === id);
      if (updated) return getClient().from("material_types").update(materialTypeToDb(updated, companyIdRef.current!)).eq("id", id);
    }, "updateMaterialType");
  }, [up]);

  const deleteMaterialType = useCallback((id: string) => {
    up((s) => ({ ...s, materialTypes: s.materialTypes.filter((m) => m.id !== id) }));
    bg(() => getClient().from("material_types").delete().eq("id", id), "deleteMaterialType");
  }, [up]);

  const incrementMaterialUse = useCallback((id: string) => {
    up((s) => ({ ...s, materialTypes: s.materialTypes.map((m) => m.id === id ? { ...m, useCount: m.useCount + 1 } : m) }));
    bg(() => getClient().from("material_types").update({ use_count: (stateRef.current.materialTypes.find(m => m.id === id)?.useCount ?? 1) }).eq("id", id), "incrementMaterialUse");
  }, [up]);

  // ── Material entries ──────────────────────────────────────────────────────────

  const addMaterialEntry = useCallback((e: Omit<MaterialEntry, "id">) => {
    const item: MaterialEntry = { ...e, id: genId() };
    up((s) => ({ ...s, materialEntries: [...s.materialEntries, item] }));
    incrementMaterialUse(e.materialTypeId);
    bg(() => getClient().from("material_entries").insert(materialEntryToDb(item, companyIdRef.current!)), "addMaterialEntry");
  }, [up, incrementMaterialUse]);

  const deleteMaterialEntry = useCallback((id: string) => {
    up((s) => ({ ...s, materialEntries: s.materialEntries.filter((e) => e.id !== id) }));
    bg(() => getClient().from("material_entries").delete().eq("id", id), "deleteMaterialEntry");
  }, [up]);

  // ── Documents ─────────────────────────────────────────────────────────────────

  const addDocument = useCallback((d: Omit<ProjectDocument, "id">) => {
    const item: ProjectDocument = { ...d, id: genId() };
    up((s) => ({ ...s, documents: [item, ...s.documents] }));
    bg(() => getClient().from("documents").insert(documentToDb(item, companyIdRef.current!)), "addDocument");
  }, [up]);

  const deleteDocument = useCallback((id: string) => {
    up((s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) }));
    bg(() => getClient().from("documents").delete().eq("id", id), "deleteDocument");
  }, [up]);

  const addDocumentVersion = useCallback((id: string, dataUrl: string, sizeBytes: number, uploadedById: string, note?: string) => {
    up((s) => ({
      ...s,
      documents: s.documents.map((d) => {
        if (d.id !== id) return d;
        const prevVersion = { versionedAt: d.uploadedAt, uploadedById: d.uploadedById, sizeBytes: d.sizeBytes, dataUrl: d.dataUrl, note };
        return { ...d, dataUrl, sizeBytes, uploadedAt: new Date(), uploadedById, versions: [prevVersion, ...(d.versions ?? [])] };
      }),
    }));
    bg(() => {
      const doc = stateRef.current.documents.find((d) => d.id === id);
      if (doc) return getClient().from("documents").update(documentToDb(doc, companyIdRef.current!)).eq("id", id);
    }, "addDocumentVersion");
  }, [up]);

  // ── Messages ──────────────────────────────────────────────────────────────────

  const addMessage = useCallback((m: Omit<Message, "id">) => {
    const item: Message = { ...m, id: genId() };
    up((s) => ({ ...s, messages: [...s.messages, item] }));
    bg(() => getClient().from("crew_messages").insert(messageToDb(item, companyIdRef.current!)), "addMessage");
    const project = stateRef.current.projects.find((p) => p.id === m.projectId);
    if (companyIdRef.current && project) {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "crew_message",
          companyId: companyIdRef.current,
          data: { senderUserId: m.senderId, senderName: m.senderName, projectName: project.name, message: m.text },
        }),
      }).catch(() => {});
    }
  }, [up]);

  const deleteMessage = useCallback((id: string) => {
    up((s) => ({ ...s, messages: s.messages.filter((m) => m.id !== id) }));
    bg(() => getClient().from("crew_messages").delete().eq("id", id), "deleteMessage");
  }, [up]);

  // ── Daily Reports ─────────────────────────────────────────────────────────────

  const addDailyReport = useCallback((r: Omit<DailyReport, "id" | "createdAt">) => {
    const report: DailyReport = { ...r, id: genId(), createdAt: new Date() };
    up((s) => ({ ...s, dailyReports: [report, ...s.dailyReports] }));
    bg(() => getClient().from("daily_reports").insert(dailyReportToDb(report, companyIdRef.current!)), "addDailyReport");
  }, [up]);

  const updateDailyReport = useCallback((id: string, u: Partial<DailyReport>) => {
    up((s) => ({ ...s, dailyReports: s.dailyReports.map((r) => r.id === id ? { ...r, ...u } : r) }));
    bg(() => {
      const merged = stateRef.current.dailyReports.find((r) => r.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("daily_reports").update(dailyReportToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updateDailyReport");
  }, [up]);

  const deleteDailyReport = useCallback((id: string) => {
    up((s) => ({ ...s, dailyReports: s.dailyReports.filter((r) => r.id !== id) }));
    bg(() => getClient().from("daily_reports").delete().eq("id", id), "deleteDailyReport");
  }, [up]);

  // ── Change Orders ─────────────────────────────────────────────────────────────

  const addChangeOrder = useCallback((c: Omit<ChangeOrder, "id" | "createdAt">) => {
    const order: ChangeOrder = { ...c, id: genId(), createdAt: new Date() };
    up((s) => ({ ...s, changeOrders: [order, ...s.changeOrders] }));
    bg(() => getClient().from("change_orders").insert(changeOrderToDb(order, companyIdRef.current!)), "addChangeOrder");
  }, [up]);

  const updateChangeOrder = useCallback((id: string, u: Partial<ChangeOrder>) => {
    up((s) => ({ ...s, changeOrders: s.changeOrders.map((c) => c.id === id ? { ...c, ...u } : c) }));
    bg(() => {
      const merged = stateRef.current.changeOrders.find((c) => c.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("change_orders").update(changeOrderToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updateChangeOrder");
  }, [up]);

  const deleteChangeOrder = useCallback((id: string) => {
    up((s) => ({ ...s, changeOrders: s.changeOrders.filter((c) => c.id !== id) }));
    bg(() => getClient().from("change_orders").delete().eq("id", id), "deleteChangeOrder");
  }, [up]);

  // ── Blueprint pins ────────────────────────────────────────────────────────────

  const addBlueprintPin = useCallback((pin: Omit<BlueprintPin, "id" | "createdAt">) => {
    const newPin: BlueprintPin = { ...pin, id: genId(), createdAt: new Date() };
    up((s) => ({ ...s, blueprintPins: [...s.blueprintPins, newPin] }));
    bg(() => getClient().from("blueprint_pins").insert(blueprintPinToDb(newPin, companyIdRef.current!)), "addBlueprintPin");
  }, [up]);

  const updateBlueprintPin = useCallback((id: string, u: Partial<BlueprintPin>) => {
    up((s) => ({ ...s, blueprintPins: s.blueprintPins.map((p) => p.id === id ? { ...p, ...u } : p) }));
    bg(() => {
      const pin = stateRef.current.blueprintPins.find((p) => p.id === id);
      if (pin) return getClient().from("blueprint_pins").update(blueprintPinToDb({ ...pin, ...u } as BlueprintPin, companyIdRef.current!)).eq("id", id);
    }, "updateBlueprintPin");
  }, [up]);

  const deleteBlueprintPin = useCallback((id: string) => {
    up((s) => ({ ...s, blueprintPins: s.blueprintPins.filter((p) => p.id !== id) }));
    bg(() => getClient().from("blueprint_pins").delete().eq("id", id), "deleteBlueprintPin");
  }, [up]);

  // ── Budget Lines ──────────────────────────────────────────────────────────────

  const addBudgetLine = useCallback((b: Omit<BudgetLine, "id" | "createdAt">) => {
    const line: BudgetLine = { ...b, id: genId(), createdAt: new Date() };
    up((s) => ({ ...s, budgetLines: [...s.budgetLines, line] }));
    bg(() => getClient().from("budget_lines").insert(budgetLineToDb(line, companyIdRef.current!)), "addBudgetLine");
  }, [up]);

  const updateBudgetLine = useCallback((id: string, u: Partial<BudgetLine>) => {
    up((s) => ({ ...s, budgetLines: s.budgetLines.map((b) => b.id === id ? { ...b, ...u } : b) }));
    bg(() => {
      const merged = stateRef.current.budgetLines.find((b) => b.id === id);
      if (!merged) return Promise.resolve({ error: null });
      return getClient().from("budget_lines").update(budgetLineToDb({ ...merged, ...u }, companyIdRef.current!)).eq("id", id);
    }, "updateBudgetLine");
  }, [up]);

  const deleteBudgetLine = useCallback((id: string) => {
    up((s) => ({ ...s, budgetLines: s.budgetLines.filter((b) => b.id !== id) }));
    bg(() => getClient().from("budget_lines").delete().eq("id", id), "deleteBudgetLine");
  }, [up]);

  // ── Custom roles ──────────────────────────────────────────────────────────────

  const addCustomRole = useCallback((role: string) => {
    up((s) => ({ ...s, customRoles: [...s.customRoles.filter((r) => r !== role), role] }));
  }, [up]);

  const deleteCustomRole = useCallback((role: string) => {
    up((s) => ({ ...s, customRoles: s.customRoles.filter((r) => r !== role) }));
  }, [up]);

  // ── Company extended fields ───────────────────────────────────────────────────

  const setCompanyAddress = useCallback((a: string) => {
    up((s) => ({ ...s, companyAddress: a }));
    bg(() => getClient().from("companies").update({ address: a }).eq("id", companyIdRef.current!), "setCompanyAddress");
  }, [up]);

  const setBusinessNumber = useCallback((b: string) => {
    up((s) => ({ ...s, businessNumber: b }));
    bg(() => getClient().from("companies").update({ business_number: b }).eq("id", companyIdRef.current!), "setBusinessNumber");
  }, [up]);

  const setDefaultTaxRate = useCallback((r: number) => {
    up((s) => ({ ...s, defaultTaxRate: r }));
    bg(() => getClient().from("companies").update({ default_tax_rate: r }).eq("id", companyIdRef.current!), "setDefaultTaxRate");
  }, [up]);

  const setOvertimeSettings = useCallback((
    s2: { enabled: boolean; dailyThreshold: number | null; weeklyThreshold: number | null; multiplier: number },
  ) => {
    up((s) => ({
      ...s,
      overtimeEnabled: s2.enabled,
      overtimeDailyThreshold: s2.dailyThreshold,
      overtimeWeeklyThreshold: s2.weeklyThreshold,
      overtimeMultiplier: s2.multiplier,
    }));
    bg(() => getClient().from("companies").update({
      overtime_enabled: s2.enabled,
      overtime_daily_threshold: s2.dailyThreshold,
      overtime_weekly_threshold: s2.weeklyThreshold,
      overtime_multiplier: s2.multiplier,
    }).eq("id", companyIdRef.current!), "setOvertimeSettings");
  }, [up]);

  const setPermissionsPin = useCallback((hashedPin: string) => {
    up((s) => ({ ...s, permissionsPin: hashedPin }));
  }, [up]);

  // ── Company settings ──────────────────────────────────────────────────────────

  const setCompanyName = useCallback((name: string) => {
    up((s) => ({ ...s, companyName: name }));
    bg(() => getClient().from("companies").update({ name }).eq("id", companyIdRef.current!), "setCompanyName");
  }, [up]);

  const setCompanyLogo = useCallback((dataUrl: string) => {
    up((s) => ({ ...s, companyLogo: dataUrl }));
    bg(() => getClient().from("companies").update({ logo: dataUrl }).eq("id", companyIdRef.current!), "setCompanyLogo");
  }, [up]);

  const setIsPro = useCallback((v: boolean) => {
    up((s) => ({ ...s, isPro: v }));
    bg(() => getClient().from("companies").update({ plan: v ? "pro" : "free" }).eq("id", companyIdRef.current!), "setIsPro");
  }, [up]);

  const setLanguage = useCallback((l: Locale) => {
    up((s) => ({ ...s, language: l }));
    bg(() => getClient().from("companies").update({ language: l }).eq("id", companyIdRef.current!), "setLanguage");
  }, [up]);

  const setCurrency = useCallback((c: CurrencyCode) => {
    up((s) => ({ ...s, currency: c }));
    bg(() => getClient().from("companies").update({ currency: c }).eq("id", companyIdRef.current!), "setCurrency");
  }, [up]);

  const setIndustry = useCallback((i: string) => {
    up((s) => ({ ...s, industry: i }));
    bg(() => getClient().from("companies").update({ industry: i }).eq("id", companyIdRef.current!), "setIndustry");
  }, [up]);

  const setTheme = useCallback((t: "dark" | "light") => {
    up((s) => ({ ...s, theme: t }));
    if (typeof window !== "undefined") localStorage.setItem("constra_theme", t);
  }, [up]);

  const setOnboarded = useCallback((v: boolean) =>
    up((s) => ({ ...s, onboarded: v })), [up]);

  const getWorkerById = useCallback((id: string) => state.workers.find((w) => w.id === id), [state.workers]);
  const getProjectById = useCallback((id: string) => state.projects.find((p) => p.id === id), [state.projects]);

  const signOut = useCallback(async () => {
    if (SUPABASE_ENABLED) await getClient().auth.signOut();
    setState({ ...defaultState(), isLoading: false });
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const currentUser: Worker =
    (state.authUserId ? state.workers.find((w) => w.id === state.authUserId) : undefined) ??
    state.workers[0] ?? {
      id: "admin", name: "Admin", initials: "AD", role: "Admin",
      customRole: "Admin / Owner", email: "", phone: "", color: "#F5C400",
      projectIds: [], clockedIn: false, hourlyRate: 0,
    };

  return (
    <Ctx.Provider value={{
      ...state,
      hoursAdjustments: state.hoursAdjustments ?? [],
      isPro: state.isPro ?? false,
      language: state.language ?? "en",
      currency: state.currency ?? "USD",
      industry: state.industry ?? "Construction",
      onboarded: state.onboarded ?? false,
      addWorker, updateWorker, deleteWorker,
      addProject, updateProject, deleteProject, approveProject,
      addTask, updateTask, deleteTask,
      addClockEntry, updateClockEntry, deleteClockEntry,
      addPunchItem, updatePunchItem, deletePunchItem,
      addSafetyIncident, updateSafetyIncident, deleteSafetyIncident,
      addEquipment, updateEquipment, deleteEquipment,
      addRFI, updateRFI, deleteRFI,
      addInvoice, updateInvoice, deleteInvoice,
      addEstimate, updateEstimate, deleteEstimate,
      addPhoto, deletePhoto,
      addActivity,
      addHoursAdjustment,
      getWorkerTotalHours,
      addMaterialType, updateMaterialType, deleteMaterialType, incrementMaterialUse,
      addMaterialEntry, deleteMaterialEntry,
      addBlueprintPin, updateBlueprintPin, deleteBlueprintPin,
      addBudgetLine, updateBudgetLine, deleteBudgetLine,
      addDocument, deleteDocument, addDocumentVersion,
      addMessage, deleteMessage,
      addDailyReport, updateDailyReport, deleteDailyReport,
      addChangeOrder, updateChangeOrder, deleteChangeOrder,
      addCustomRole, deleteCustomRole,
      setCompanyAddress, setBusinessNumber, setDefaultTaxRate, setOvertimeSettings, setPermissionsPin,
      setCompanyName, setCompanyLogo, setIsPro,
      setLanguage, setCurrency, setIndustry, setOnboarded,
      getWorkerById, getProjectById,
      signOut,
      currentUser,
      theme: state.theme,
      setTheme,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}
