export type PermissionKey =
  | "donorView"
  | "donorAdd"
  | "donorEdit"
  | "donorDelete"
  | "approveReject"
  | "notesEdit"
  | "reportsExport"
  | "userManagement";

export const DEFAULT_PERMISSIONS: Record<"ADMIN" | "VOLUNTEER", Record<PermissionKey, boolean>> = {
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

/**
 * Checks if a user has a specific permission.
 * Cascades from user's custom JSON permissions -> role-based default permissions.
 */
export function hasPermission(
  user: { role?: string; permissions?: any } | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;

  const perms = user.permissions;
  if (perms && typeof perms === "object") {
    const custom = perms as Record<string, any>;
    if (custom[permission] !== undefined) {
      return !!custom[permission];
    }
  }

  const role = (user.role || "VOLUNTEER") as "ADMIN" | "VOLUNTEER";
  const defaults = DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.VOLUNTEER;
  return !!defaults[permission];
}
