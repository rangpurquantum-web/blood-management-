export type PermissionKey =
  | "donorView"
  | "donorAdd"
  | "donorEdit"
  | "donorDelete"
  | "approveReject"
  | "notesEdit"
  | "reportsExport"
  | "userManagement";

export type UserRole =
  | "ADMIN"
  | "COORDINATOR"
  | "VOLUNTEER";

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

export function hasPermission(
  user:
    | {
        role?: string;
        permissions?: unknown;
      }
    | null
    | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;

  const perms = user.permissions;

  // Custom permissions have priority
  if (
    perms &&
    typeof perms === "object" &&
    !Array.isArray(perms)
  ) {
    const custom = perms as Record<string, unknown>;

    if (custom[permission] !== undefined) {
      return Boolean(custom[permission]);
    }
  }

  // Role-based default permissions
  const role: UserRole =
    user.role === "ADMIN" ||
    user.role === "COORDINATOR" ||
    user.role === "VOLUNTEER"
      ? user.role
      : "VOLUNTEER";

  return Boolean(
    DEFAULT_PERMISSIONS[role][permission]
  );
}