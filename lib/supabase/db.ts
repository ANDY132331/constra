// DB row types (snake_case) and mapper functions to/from our TypeScript domain types.

import type {
  Worker, Project, Task, ClockEntry, PunchItem, SafetyIncident,
  Equipment, RFI, Invoice, Estimate, PhotoEntry, ActivityEvent, HoursAdjustment,
  GpsLocation, VerificationFlag, Message, MaterialType, MaterialEntry, ProjectDocument,
  DailyReport, ChangeOrder,
} from "@/lib/mock-data";

// ── Geo helper ─────────────────────────────────────────────────────────────────

function gpsFromJson(v: unknown): GpsLocation | undefined {
  if (!v || typeof v !== "object") return undefined;
  const g = v as Record<string, unknown>;
  if (typeof g.lat === "number" && typeof g.lng === "number") {
    return { lat: g.lat, lng: g.lng, accuracy: typeof g.accuracy === "number" ? g.accuracy : 0 };
  }
  return undefined;
}

// ── Worker / Profile ───────────────────────────────────────────────────────────

export type DbProfile = {
  id: string;
  company_id: string;
  name: string;
  initials: string;
  role: "Admin" | "Project Manager" | "Foreman" | "Worker";
  custom_role: string;
  email: string;
  phone: string;
  color: string;
  photo_url: string | null;
  clocked_in: boolean;
  clock_in_time: string | null;
  hourly_rate: number;
  device_history: Array<{ ua: string; firstSeen: string; lastSeen: string }> | null;
  created_at?: string;
};

export function dbToWorker(row: DbProfile): Worker {
  return {
    id: row.id,
    name: row.name,
    initials: row.initials,
    role: row.role,
    customRole: row.custom_role,
    email: row.email,
    phone: row.phone,
    color: row.color,
    photo: row.photo_url ?? undefined,
    projectIds: [],
    clockedIn: row.clocked_in,
    clockInTime: row.clock_in_time ? new Date(row.clock_in_time) : undefined,
    hourlyRate: Number(row.hourly_rate),
    deviceHistory: row.device_history?.map((d) => ({
      ua: d.ua,
      firstSeen: new Date(d.firstSeen),
      lastSeen: new Date(d.lastSeen),
    })),
  };
}

export function workerToDb(w: Worker, companyId: string): Omit<DbProfile, "created_at"> {
  return {
    id: w.id,
    company_id: companyId,
    name: w.name,
    initials: w.initials,
    role: w.role,
    custom_role: w.customRole,
    email: w.email,
    phone: w.phone,
    color: w.color,
    photo_url: w.photo ?? null,
    clocked_in: w.clockedIn,
    clock_in_time: w.clockInTime?.toISOString() ?? null,
    hourly_rate: w.hourlyRate,
    device_history:
      w.deviceHistory?.map((d) => ({
        ua: d.ua,
        firstSeen: d.firstSeen.toISOString(),
        lastSeen: d.lastSeen.toISOString(),
      })) ?? null,
  };
}

// ── Project / Task ─────────────────────────────────────────────────────────────

export type DbProject = {
  id: string;
  company_id: string;
  name: string;
  client: string;
  status: "active" | "upcoming" | "completed";
  start_date: string;
  end_date: string;
  progress: number;
  budget: number;
  spent: number;
  address: string;
  gps: unknown;
  color: string;
  manager_id: string | null;
  worker_ids: string[];
  pending_approval?: boolean;
  created_by?: string | null;
  created_at?: string;
};

export type DbTask = {
  id: string;
  project_id: string;
  company_id: string;
  name: string;
  progress: number;
  worker_id: string | null;
  start_date: string;
  end_date: string;
  status: "not-started" | "in-progress" | "completed" | "delayed";
  created_at?: string;
};

export function dbToTask(row: DbTask): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    progress: row.progress,
    workerId: row.worker_id ?? "",
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    status: row.status,
  };
}

export function dbToProject(row: DbProject, tasks: DbTask[] = []): Project {
  return {
    id: row.id,
    name: row.name,
    client: row.client,
    status: row.status,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    progress: row.progress,
    budget: Number(row.budget),
    spent: Number(row.spent),
    address: row.address,
    gps: gpsFromJson(row.gps),
    color: row.color,
    managerId: row.manager_id ?? "",
    workerIds: row.worker_ids ?? [],
    tasks: tasks.map(dbToTask),
    pendingApproval: row.pending_approval ?? false,
    createdBy: row.created_by ?? undefined,
  };
}

export function projectToDb(
  p: Omit<Project, "tasks">,
  companyId: string,
): Omit<DbProject, "created_at"> {
  return {
    id: p.id,
    company_id: companyId,
    name: p.name,
    client: p.client,
    status: p.status,
    start_date: p.startDate.toISOString(),
    end_date: p.endDate.toISOString(),
    progress: p.progress,
    budget: p.budget,
    spent: p.spent,
    address: p.address,
    gps: p.gps ?? null,
    color: p.color,
    manager_id: p.managerId || null,
    worker_ids: p.workerIds,
    pending_approval: p.pendingApproval ?? false,
    created_by: p.createdBy ?? null,
  };
}

export function taskToDb(
  t: Task,
  companyId: string,
): Omit<DbTask, "created_at"> {
  return {
    id: t.id,
    project_id: t.projectId,
    company_id: companyId,
    name: t.name,
    progress: t.progress,
    worker_id: t.workerId || null,
    start_date: t.startDate.toISOString(),
    end_date: t.endDate.toISOString(),
    status: t.status,
  };
}

// ── ClockEntry ─────────────────────────────────────────────────────────────────

export type DbClockEntry = {
  id: string;
  company_id: string;
  worker_id: string;
  project_id: string | null;
  clock_in: string;
  clock_out: string | null;
  clock_in_photo_url: string | null;
  gps: unknown;
  device_info: string | null;
  verification_flags: unknown;
  created_at?: string;
};

export function dbToClockEntry(row: DbClockEntry): ClockEntry {
  return {
    id: row.id,
    workerId: row.worker_id,
    projectId: row.project_id ?? "",
    clockIn: new Date(row.clock_in),
    clockOut: row.clock_out ? new Date(row.clock_out) : undefined,
    clockInPhoto: row.clock_in_photo_url ?? undefined,
    gps: gpsFromJson(row.gps),
    deviceInfo: row.device_info ?? undefined,
    verificationFlags: Array.isArray(row.verification_flags)
      ? (row.verification_flags as Array<VerificationFlag & { detectedAt: string }>).map((f) => ({
          ...f,
          detectedAt: new Date(f.detectedAt),
        }))
      : undefined,
  };
}

export function clockEntryToDb(
  e: ClockEntry,
  companyId: string,
): Omit<DbClockEntry, "created_at"> {
  return {
    id: e.id,
    company_id: companyId,
    worker_id: e.workerId,
    project_id: e.projectId || null,
    clock_in: e.clockIn.toISOString(),
    clock_out: e.clockOut?.toISOString() ?? null,
    clock_in_photo_url: e.clockInPhoto ?? null,
    gps: e.gps ?? null,
    device_info: e.deviceInfo ?? null,
    verification_flags: e.verificationFlags ?? [],
  };
}

// ── PunchItem ─────────────────────────────────────────────────────────────────

export type DbPunchItem = {
  id: string;
  company_id: string;
  project_id: string | null;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved";
  priority: "low" | "medium" | "high";
  assigned_to_id: string | null;
  created_at: string;
  due_date: string | null;
  location: string | null;
};

export function dbToPunchItem(row: DbPunchItem): PunchItem {
  return {
    id: row.id,
    projectId: row.project_id ?? "",
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedToId: row.assigned_to_id ?? "",
    createdAt: new Date(row.created_at),
    dueDate: row.due_date ? new Date(row.due_date) : undefined,
    location: row.location ?? undefined,
  };
}

export function punchItemToDb(p: PunchItem, companyId: string): DbPunchItem {
  return {
    id: p.id,
    company_id: companyId,
    project_id: p.projectId || null,
    title: p.title,
    description: p.description,
    status: p.status,
    priority: p.priority,
    assigned_to_id: p.assignedToId || null,
    created_at: p.createdAt.toISOString(),
    due_date: p.dueDate?.toISOString() ?? null,
    location: p.location ?? null,
  };
}

// ── SafetyIncident ────────────────────────────────────────────────────────────

export type DbSafetyIncident = {
  id: string;
  company_id: string;
  project_id: string | null;
  type: "near-miss" | "injury" | "property-damage" | "environmental";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  reported_by_id: string | null;
  date: string;
  injured_id: string | null;
  reported_to_osha: boolean;
  action_taken: string;
  created_at?: string;
};

export function dbToSafetyIncident(row: DbSafetyIncident): SafetyIncident {
  return {
    id: row.id,
    projectId: row.project_id ?? "",
    type: row.type,
    severity: row.severity,
    description: row.description,
    reportedById: row.reported_by_id ?? "",
    date: new Date(row.date),
    injuredId: row.injured_id ?? undefined,
    reportedToOSHA: row.reported_to_osha,
    actionTaken: row.action_taken,
  };
}

export function safetyIncidentToDb(s: SafetyIncident, companyId: string): Omit<DbSafetyIncident, "created_at"> {
  return {
    id: s.id,
    company_id: companyId,
    project_id: s.projectId || null,
    type: s.type,
    severity: s.severity,
    description: s.description,
    reported_by_id: s.reportedById || null,
    date: s.date.toISOString(),
    injured_id: s.injuredId ?? null,
    reported_to_osha: s.reportedToOSHA,
    action_taken: s.actionTaken,
  };
}

// ── Equipment ─────────────────────────────────────────────────────────────────

export type DbEquipment = {
  id: string;
  company_id: string;
  name: string;
  type: string;
  status: "available" | "in-use" | "maintenance" | "off-site";
  project_id: string | null;
  last_service: string;
  next_service: string;
  cert_expiry: string | null;
  daily_rate: number;
  created_at?: string;
};

export function dbToEquipment(row: DbEquipment): Equipment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    projectId: row.project_id ?? undefined,
    lastService: new Date(row.last_service),
    nextService: new Date(row.next_service),
    certExpiry: row.cert_expiry ? new Date(row.cert_expiry) : undefined,
    dailyRate: Number(row.daily_rate),
  };
}

export function equipmentToDb(e: Equipment, companyId: string): Omit<DbEquipment, "created_at"> {
  return {
    id: e.id,
    company_id: companyId,
    name: e.name,
    type: e.type,
    status: e.status,
    project_id: e.projectId ?? null,
    last_service: e.lastService.toISOString(),
    next_service: e.nextService.toISOString(),
    cert_expiry: e.certExpiry?.toISOString() ?? null,
    daily_rate: e.dailyRate,
  };
}

// ── RFI ───────────────────────────────────────────────────────────────────────

export type DbRFI = {
  id: string;
  company_id: string;
  project_id: string | null;
  number: string;
  subject: string;
  question: string;
  submitted_by_id: string | null;
  assigned_to_id: string | null;
  status: "open" | "answered" | "closed";
  priority: "routine" | "urgent" | "critical";
  created_at: string;
  due_date: string;
  answer: string | null;
};

export function dbToRFI(row: DbRFI): RFI {
  return {
    id: row.id,
    projectId: row.project_id ?? "",
    number: row.number,
    subject: row.subject,
    question: row.question,
    submittedById: row.submitted_by_id ?? "",
    assignedToId: row.assigned_to_id ?? "",
    status: row.status,
    priority: row.priority,
    createdAt: new Date(row.created_at),
    dueDate: new Date(row.due_date),
    answer: row.answer ?? undefined,
  };
}

export function rfiToDb(r: RFI, companyId: string): DbRFI {
  return {
    id: r.id,
    company_id: companyId,
    project_id: r.projectId || null,
    number: r.number,
    subject: r.subject,
    question: r.question,
    submitted_by_id: r.submittedById || null,
    assigned_to_id: r.assignedToId || null,
    status: r.status,
    priority: r.priority,
    created_at: r.createdAt.toISOString(),
    due_date: r.dueDate.toISOString(),
    answer: r.answer ?? null,
  };
}

// ── Invoice ───────────────────────────────────────────────────────────────────

export type DbInvoice = {
  id: string;
  company_id: string;
  number: string;
  client_name: string;
  client_email: string;
  client_address: string;
  issue_date: string;
  due_date: string;
  status: "draft" | "sent" | "paid" | "overdue";
  items: { description: string; qty: number; rate: number }[];
  tax_rate: number;
  notes: string | null;
  created_at?: string;
};

export function dbToInvoice(row: DbInvoice): Invoice {
  return {
    id: row.id,
    number: row.number,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientAddress: row.client_address,
    issueDate: new Date(row.issue_date),
    dueDate: new Date(row.due_date),
    status: row.status,
    items: row.items,
    taxRate: Number(row.tax_rate),
    notes: row.notes ?? undefined,
  };
}

export function invoiceToDb(i: Invoice, companyId: string): Omit<DbInvoice, "created_at"> {
  return {
    id: i.id,
    company_id: companyId,
    number: i.number,
    client_name: i.clientName,
    client_email: i.clientEmail,
    client_address: i.clientAddress,
    issue_date: i.issueDate.toISOString(),
    due_date: i.dueDate.toISOString(),
    status: i.status,
    items: i.items,
    tax_rate: i.taxRate,
    notes: i.notes ?? null,
  };
}

// ── Estimate ──────────────────────────────────────────────────────────────────

export type DbEstimate = {
  id: string;
  company_id: string;
  number: string;
  project_name: string;
  client_name: string;
  client_email: string;
  issue_date: string;
  valid_until: string;
  status: "draft" | "sent" | "accepted" | "declined";
  items: { description: string; qty: number; rate: number; category: string }[];
  tax_rate: number;
  notes: string | null;
  created_at?: string;
};

export function dbToEstimate(row: DbEstimate): Estimate {
  return {
    id: row.id,
    number: row.number,
    projectName: row.project_name,
    clientName: row.client_name,
    clientEmail: row.client_email,
    issueDate: new Date(row.issue_date),
    validUntil: new Date(row.valid_until),
    status: row.status,
    items: row.items,
    taxRate: Number(row.tax_rate),
    notes: row.notes ?? undefined,
  };
}

export function estimateToDb(e: Estimate, companyId: string): Omit<DbEstimate, "created_at"> {
  return {
    id: e.id,
    company_id: companyId,
    number: e.number,
    project_name: e.projectName,
    client_name: e.clientName,
    client_email: e.clientEmail,
    issue_date: e.issueDate.toISOString(),
    valid_until: e.validUntil.toISOString(),
    status: e.status,
    items: e.items,
    tax_rate: e.taxRate,
    notes: e.notes ?? null,
  };
}

// ── Photo ─────────────────────────────────────────────────────────────────────

export type DbPhoto = {
  id: string;
  company_id: string;
  project_id: string | null;
  caption: string;
  uploaded_by_id: string | null;
  uploaded_at: string;
  tags: string[];
  url: string | null;
  gps: unknown;
  gradient: string;
  created_at?: string;
};

export function dbToPhoto(row: DbPhoto): PhotoEntry {
  return {
    id: row.id,
    projectId: row.project_id ?? "",
    caption: row.caption,
    uploadedById: row.uploaded_by_id ?? "",
    uploadedAt: new Date(row.uploaded_at),
    tags: row.tags,
    gradient: row.gradient,
    url: row.url ?? undefined,
    gps: gpsFromJson(row.gps),
  };
}

export function photoToDb(p: PhotoEntry, companyId: string): Omit<DbPhoto, "created_at"> {
  return {
    id: p.id,
    company_id: companyId,
    project_id: p.projectId || null,
    caption: p.caption,
    uploaded_by_id: p.uploadedById || null,
    uploaded_at: p.uploadedAt.toISOString(),
    tags: p.tags,
    url: p.url ?? null,
    gps: p.gps ?? null,
    gradient: p.gradient,
  };
}

// ── ActivityEvent ─────────────────────────────────────────────────────────────

export type DbActivityEvent = {
  id: string;
  company_id: string;
  type: string;
  description: string;
  worker_id: string | null;
  timestamp: string;
  created_at?: string;
};

export function dbToActivity(row: DbActivityEvent): ActivityEvent {
  return {
    id: row.id,
    type: row.type as ActivityEvent["type"],
    description: row.description,
    workerId: row.worker_id ?? "",
    timestamp: new Date(row.timestamp),
  };
}

export function activityToDb(a: ActivityEvent, companyId: string): Omit<DbActivityEvent, "created_at"> {
  return {
    id: a.id,
    company_id: companyId,
    type: a.type,
    description: a.description,
    worker_id: a.workerId || null,
    timestamp: a.timestamp.toISOString(),
  };
}

// ── HoursAdjustment ───────────────────────────────────────────────────────────

export type DbHoursAdjustment = {
  id: string;
  company_id: string;
  worker_id: string;
  admin_id: string;
  admin_name: string;
  delta_hours: number;
  reason: string;
  created_at: string;
};

export function dbToHoursAdjustment(row: DbHoursAdjustment): HoursAdjustment {
  return {
    id: row.id,
    workerId: row.worker_id,
    adminId: row.admin_id,
    adminName: row.admin_name,
    deltaHours: Number(row.delta_hours),
    reason: row.reason,
    createdAt: new Date(row.created_at),
  };
}

export function hoursAdjustmentToDb(
  a: HoursAdjustment,
  companyId: string,
): DbHoursAdjustment {
  return {
    id: a.id,
    company_id: companyId,
    worker_id: a.workerId,
    admin_id: a.adminId,
    admin_name: a.adminName,
    delta_hours: a.deltaHours,
    reason: a.reason,
    created_at: a.createdAt.toISOString(),
  };
}

// ── Crew Messages ──────────────────────────────────────────────────────────────

export type DbMessage = {
  id: string;
  company_id: string;
  project_id: string;
  sender_id: string;
  sender_name: string;
  sender_initials: string;
  sender_color: string;
  text: string;
  timestamp: string;
  attachment_name?: string | null;
  attachment_data?: string | null;
};

export function dbToMessage(row: DbMessage): Message {
  return {
    id: row.id,
    projectId: row.project_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderInitials: row.sender_initials,
    senderColor: row.sender_color,
    text: row.text,
    timestamp: new Date(row.timestamp),
    attachmentName: row.attachment_name ?? undefined,
    attachmentData: row.attachment_data ?? undefined,
  };
}

export function messageToDb(m: Message, companyId: string): DbMessage {
  return {
    id: m.id,
    company_id: companyId,
    project_id: m.projectId,
    sender_id: m.senderId,
    sender_name: m.senderName,
    sender_initials: m.senderInitials,
    sender_color: m.senderColor,
    text: m.text,
    timestamp: m.timestamp.toISOString(),
    attachment_name: m.attachmentName ?? null,
    attachment_data: m.attachmentData ?? null,
  };
}

// ── Material Types ─────────────────────────────────────────────────────────────

export type DbMaterialType = {
  id: string;
  company_id: string;
  name: string;
  unit: string;
  trade: string;
  use_count: number;
  is_custom: boolean;
  created_at?: string;
};

export function dbToMaterialType(row: DbMaterialType): MaterialType {
  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    trade: row.trade,
    useCount: row.use_count,
    isCustom: row.is_custom,
  };
}

export function materialTypeToDb(m: MaterialType, companyId: string): Omit<DbMaterialType, "created_at"> {
  return {
    id: m.id,
    company_id: companyId,
    name: m.name,
    unit: m.unit,
    trade: m.trade,
    use_count: m.useCount,
    is_custom: m.isCustom ?? false,
  };
}

// ── Material Entries ───────────────────────────────────────────────────────────

export type DbMaterialEntry = {
  id: string;
  company_id: string;
  project_id: string;
  material_type_id: string;
  material_name: string;
  unit: string;
  trade: string;
  quantity: number;
  type: "delivery" | "usage";
  date: string;
  note: string | null;
  created_at?: string;
};

export function dbToMaterialEntry(row: DbMaterialEntry): MaterialEntry {
  return {
    id: row.id,
    projectId: row.project_id,
    materialTypeId: row.material_type_id,
    materialName: row.material_name,
    unit: row.unit,
    trade: row.trade,
    quantity: Number(row.quantity),
    type: row.type,
    date: new Date(row.date),
    note: row.note ?? undefined,
  };
}

export function materialEntryToDb(e: MaterialEntry, companyId: string): Omit<DbMaterialEntry, "created_at"> {
  return {
    id: e.id,
    company_id: companyId,
    project_id: e.projectId,
    material_type_id: e.materialTypeId,
    material_name: e.materialName,
    unit: e.unit,
    trade: e.trade,
    quantity: e.quantity,
    type: e.type,
    date: e.date.toISOString(),
    note: e.note ?? null,
  };
}

// ── Documents ─────────────────────────────────────────────────────────────────

export type DbDocument = {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  category: "blueprint" | "permit" | "contract" | "inspection" | "safety" | "other";
  uploaded_at: string;
  uploaded_by_id: string;
  size_bytes: number;
  data_url: string | null;
  versions: unknown;
  created_at?: string;
};

export function dbToDocument(row: DbDocument): ProjectDocument {
  const versions = Array.isArray(row.versions)
    ? (row.versions as Array<{ versioned_at: string; uploaded_by_id: string; size_bytes: number; data_url?: string | null; note?: string | null }>).map((v) => ({
        versionedAt: new Date(v.versioned_at),
        uploadedById: v.uploaded_by_id,
        sizeBytes: v.size_bytes,
        dataUrl: v.data_url ?? undefined,
        note: v.note ?? undefined,
      }))
    : undefined;
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    category: row.category,
    uploadedAt: new Date(row.uploaded_at),
    uploadedById: row.uploaded_by_id,
    sizeBytes: row.size_bytes,
    dataUrl: row.data_url ?? undefined,
    versions,
  };
}

// ── DailyReport ───────────────────────────────────────────────────────────────

export type DbDailyReport = {
  id: string;
  company_id: string;
  project_id: string;
  date: string;
  weather: string | null;
  temperature_f: number | null;
  crew_count: number;
  crew_on_site: string[];
  work_completed: string;
  delays: string;
  materials_used: string;
  visitor_log: string;
  notes: string;
  submitted_by_id: string | null;
  created_at: string;
};

export function dbToDailyReport(row: DbDailyReport): DailyReport {
  return {
    id: row.id,
    projectId: row.project_id,
    date: new Date(row.date),
    weather: row.weather ?? "",
    temperatureF: row.temperature_f ?? 0,
    crewCount: row.crew_count ?? 0,
    crewOnSite: row.crew_on_site ?? [],
    workCompleted: row.work_completed ?? "",
    delays: row.delays ?? "",
    materialsUsed: row.materials_used ?? "",
    visitorLog: row.visitor_log ?? "",
    notes: row.notes ?? "",
    submittedById: row.submitted_by_id ?? "",
    createdAt: new Date(row.created_at),
  };
}

export function dailyReportToDb(r: DailyReport, companyId: string): Omit<DbDailyReport, "created_at"> {
  return {
    id: r.id,
    company_id: companyId,
    project_id: r.projectId,
    date: r.date.toISOString().slice(0, 10),
    weather: r.weather || null,
    temperature_f: r.temperatureF || null,
    crew_count: r.crewCount,
    crew_on_site: r.crewOnSite,
    work_completed: r.workCompleted,
    delays: r.delays,
    materials_used: r.materialsUsed,
    visitor_log: r.visitorLog,
    notes: r.notes,
    submitted_by_id: r.submittedById || null,
  };
}

// ── ChangeOrder ───────────────────────────────────────────────────────────────

export type DbChangeOrder = {
  id: string;
  company_id: string;
  project_id: string;
  number: string;
  title: string;
  description: string;
  reason: string;
  amount: number;
  status: string;
  submitted_at: string;
  approved_at: string | null;
  approved_by: string | null;
  submitted_by_id: string | null;
  created_at: string;
};

export function dbToChangeOrder(row: DbChangeOrder): ChangeOrder {
  return {
    id: row.id,
    projectId: row.project_id,
    number: row.number,
    title: row.title,
    description: row.description ?? "",
    reason: row.reason ?? "",
    amount: Number(row.amount) ?? 0,
    status: (row.status ?? "pending") as ChangeOrder["status"],
    submittedAt: new Date(row.submitted_at),
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    approvedBy: row.approved_by ?? undefined,
    submittedById: row.submitted_by_id ?? "",
    createdAt: new Date(row.created_at),
  };
}

export function changeOrderToDb(c: ChangeOrder, companyId: string): Omit<DbChangeOrder, "created_at"> {
  return {
    id: c.id,
    company_id: companyId,
    project_id: c.projectId,
    number: c.number,
    title: c.title,
    description: c.description,
    reason: c.reason,
    amount: c.amount,
    status: c.status,
    submitted_at: c.submittedAt.toISOString(),
    approved_at: c.approvedAt?.toISOString() ?? null,
    approved_by: c.approvedBy ?? null,
    submitted_by_id: c.submittedById || null,
  };
}

export function documentToDb(d: ProjectDocument, companyId: string): Omit<DbDocument, "created_at"> {
  const versions = d.versions?.map((v) => ({
    versioned_at: v.versionedAt.toISOString(),
    uploaded_by_id: v.uploadedById,
    size_bytes: v.sizeBytes,
    data_url: v.dataUrl ?? null,
    note: v.note ?? null,
  })) ?? [];
  return {
    id: d.id,
    company_id: companyId,
    project_id: d.projectId,
    name: d.name,
    category: d.category,
    uploaded_at: d.uploadedAt.toISOString(),
    uploaded_by_id: d.uploadedById,
    size_bytes: d.sizeBytes,
    data_url: d.dataUrl ?? null,
    versions,
  };
}
