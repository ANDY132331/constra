export type UserRole = "owner" | "admin" | "foreman" | "employee";

export type Permission =
  | "manage_billing"
  | "manage_workers"
  | "kick_workers"
  | "manage_projects"
  | "delete_projects"
  | "approve_projects"
  | "manage_hours"
  | "adjust_hours"
  | "view_reports"
  | "export_reports"
  | "manage_rfis"
  | "manage_invoices"
  | "manage_estimates"
  | "manage_equipment"
  | "manage_safety"
  | "manage_schedule"
  | "manage_punch_list"
  | "upload_photos"
  | "delete_photos"
  | "view_finance"
  | "manage_settings"
  | "clock_in_out";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    "manage_billing", "manage_workers", "kick_workers", "manage_projects",
    "delete_projects", "approve_projects", "manage_hours", "adjust_hours",
    "view_reports", "export_reports", "manage_rfis", "manage_invoices",
    "manage_estimates", "manage_equipment", "manage_safety", "manage_schedule",
    "manage_punch_list", "upload_photos", "delete_photos", "view_finance",
    "manage_settings", "clock_in_out",
  ],
  admin: [
    "manage_workers", "kick_workers", "manage_projects", "delete_projects",
    "approve_projects", "manage_hours", "adjust_hours", "view_reports",
    "export_reports", "manage_rfis", "manage_invoices", "manage_estimates",
    "manage_equipment", "manage_safety", "manage_schedule", "manage_punch_list",
    "upload_photos", "delete_photos", "view_finance", "manage_settings", "clock_in_out",
  ],
  // Foreman: field supervisor — can create (pending approval), manage site operations,
  // but has no access to finance, billing, crew management, or reports
  foreman: [
    "manage_projects",   // creates projects, but they go pending until admin approves
    "manage_hours", "manage_rfis", "manage_safety", "manage_schedule",
    "manage_punch_list", "upload_photos", "manage_equipment", "clock_in_out",
  ],
  // Worker: basic field access only
  employee: [
    "upload_photos", "manage_safety", "clock_in_out",
  ],
};

/** Maps the Worker.role string to the internal UserRole. */
export function legacyRoleToUserRole(role: string): UserRole {
  switch (role) {
    case "Admin":
    case "Project Manager":
      return "admin";
    case "Foreman":
      return "foreman";
    default:
      return "employee";
  }
}

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canRole(roleName: string, permission: Permission): boolean {
  return can(legacyRoleToUserRole(roleName), permission);
}

/** Numeric hierarchy: higher = more access. */
export function getRoleLevel(roleName: string): number {
  const levels: Record<UserRole, number> = { owner: 4, admin: 3, foreman: 2, employee: 0 };
  return levels[legacyRoleToUserRole(roleName)] ?? 0;
}

export function isAdminOrAbove(roleName: string): boolean {
  return getRoleLevel(roleName) >= 3;
}

export function isForemanOrAbove(roleName: string): boolean {
  return getRoleLevel(roleName) >= 2;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Administrator",
  foreman: "Foreman",
  employee: "Worker",
};
