export type PermissionKey =
  // ── Donor & Donation operations (all roles) ────────────────────────────
  | "donorView"
  | "donorAdd"
  | "donorEdit"
  | "donorDelete"
  | "approveReject"
  | "notesEdit"
  | "reportsExport"
  | "userManagement"
  // ── Multi-branch / Super Admin operations (Update 1) ──────────────────
  | "branchCreate"          // Create a branch + provision its database
  | "branchCredentialView"  // Reveal a branch's decrypted DB URL (logged to AuditLogCentral)
  | "crossBranchGrant";     // Grant another user visibility into a different branch

export const DEFAULT_PERMISSIONS: Record<
  "SUPER_ADMIN" | "ADMIN" | "VOLUNTEER",
  Record<PermissionKey, boolean>
> = {
  SUPER_ADMIN: {
    donorView: true,
    donorAdd: true,
    donorEdit: true,
    donorDelete: true,
    approveReject: true,
    notesEdit: true,
    reportsExport: true,
    userManagement: true,
    branchCreate: true,
    branchCredentialView: true,
    crossBranchGrant: true,
  },
  ADMIN: {
    donorView: true,
    donorAdd: true,
    donorEdit: true,
    donorDelete: true,
    approveReject: true,
    notesEdit: true,
    reportsExport: true,
    userManagement: true,
    branchCreate: false,
    branchCredentialView: false,
    crossBranchGrant: false,
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
    branchCreate: false,
    branchCredentialView: false,
    crossBranchGrant: false,
  },
};

/**
 * Checks if a user has a specific permission.
 * Priority: custom JSON permissions on the user row → role-based defaults.
 */
export function hasPermission(
  user: { role?: string; permissions?: unknown } | null | undefined,
  permission: PermissionKey,
): boolean {
  if (!user) return false;

  // 1. Check per-user custom overrides stored in User.permissions JSON
  const perms = user.permissions;
  if (perms && typeof perms === "object") {
    const custom = perms as Record<string, unknown>;
    if (custom[permission] !== undefined) {
      return !!custom[permission];
    }
  }

  // 2. Fall back to role defaults
  const role = (user.role || "VOLUNTEER") as "SUPER_ADMIN" | "ADMIN" | "VOLUNTEER";
  const defaults =
    DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS.VOLUNTEER;
  return !!defaults[permission];
}
