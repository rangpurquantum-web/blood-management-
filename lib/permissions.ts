// ─────────────────────────────────────────────────────────────────────────────
// Permission System
// ─────────────────────────────────────────────────────────────────────────────

export type PermissionKey =
  | "donorView"
  | "donorAdd"
  | "donorEdit"
  | "donorDelete"
  | "approveReject"
  | "notesEdit"
  | "reportsExport"
  | "userManagement";

export type UserRole = "ADMIN" | "COORDINATOR" | "VOLUNTEER";

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  donorView: "Donor View",
  donorAdd: "Donor Add",
  donorEdit: "Donor Edit",
  donorDelete: "Donor Delete",
  approveReject: "Approve / Reject Registration",
  notesEdit: "Notes Edit",
  reportsExport: "Reports Export & PDF",
  userManagement: "User Management",
};

export const PERMISSION_KEYS = Object.keys(
  PERMISSION_LABELS
) as PermissionKey[];

// ─────────────────────────────────────────────────────────────────────────────
// Default permissions by role
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_PERMISSIONS: Record<
  UserRole,
  Record<PermissionKey, boolean>
> = {
  ADMIN: {
    donorView: true,
    donorAdd: true,
    donorEdit: true,
    donorDelete: true,
    approveReject: true,
    notesEdit: true,
    reportsExport: true,
    userManagement: true,
  },

  COORDINATOR: {
    donorView: true,
    donorAdd: true,
    donorEdit: true,
    donorDelete: false,
    approveReject: true,
    notesEdit: true,
    reportsExport: true,
    userManagement: false,
  },

  VOLUNTEER: {
    donorView: true,
    donorAdd: true,
    donorEdit: false,
    donorDelete: false,
    approveReject: false,
    notesEdit: false,
    reportsExport: false,
    userManagement: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Check permission
// Custom JSON permission overrides role default.
// ─────────────────────────────────────────────────────────────────────────────

export function hasPermission(
  user:
    | {
        role?: string | null;
        permissions?: unknown;
      }
    | null
    | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;

  const role = normalizeRole(user.role);

  // ADMIN always has all permissions unless explicitly overridden
  // by a custom permission object.
  const customPermissions = user.permissions;

  if (
    customPermissions &&
    typeof customPermissions === "object" &&
    !Array.isArray(customPermissions)
  ) {
    const custom = customPermissions as Record<string, unknown>;

    if (custom[permission] !== undefined) {
      return Boolean(custom[permission]);
    }
  }

  return DEFAULT_PERMISSIONS[role][permission];
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalize role safely
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeRole(role?: string | null): UserRole {
  if (role === "ADMIN") return "ADMIN";
  if (role === "COORDINATOR") return "COORDINATOR";
  return "VOLUNTEER";
}

// ─────────────────────────────────────────────────────────────────────────────
// Get complete permissions for a user
// ─────────────────────────────────────────────────────────────────────────────

export function getUserPermissions(
  user:
    | {
        role?: string | null;
        permissions?: unknown;
      }
    | null
    | undefined
): Record<PermissionKey, boolean> {
  const role = normalizeRole(user?.role);

  const result: Record<PermissionKey, boolean> = {
    ...DEFAULT_PERMISSIONS[role],
  };

  if (
    user?.permissions &&
    typeof user.permissions === "object" &&
    !Array.isArray(user.permissions)
  ) {
    const custom = user.permissions as Record<string, unknown>;

    for (const key of PERMISSION_KEYS) {
      if (custom[key] !== undefined) {
        result[key] = Boolean(custom[key]);
      }
    }
  }

  return result;
}