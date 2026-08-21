"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Edit,
  Trash2,
  KeyRound,
  Snowflake,
  Flame,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  DEFAULT_PERMISSIONS,
  PermissionKey,
  UserRole,
  hasPermission,
} from "@/lib/permissions";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SystemUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  permissions: Record<string, boolean> | null;
  isActive: boolean;
  createdAt: string;
}

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  donorView: "Donor দেখা (View)",
  donorAdd: "Donor Add",
  donorEdit: "Donor Edit",
  donorDelete: "Donor Delete",
  approveReject: "Approve/Reject Registration",
  notesEdit: "Notes Edit",
  reportsExport: "Reports Export & PDF",
  userManagement: "User Management (Admin Page)",
};

const PERMISSION_KEYS =
  Object.keys(PERMISSION_LABELS) as PermissionKey[];

// ─────────────────────────────────────────────────────────────────────────────
// Role Badge
// ─────────────────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "ADMIN") {
    return (
      <Badge className="bg-red-50 text-red-700 border border-red-200 font-semibold text-xs">
        Admin
      </Badge>
    );
  }

  if (role === "COORDINATOR") {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs">
        Coordinator
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs">
      Volunteer
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create User Modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: UserRole;
  }>({
    name: "",
    email: "",
    password: "",
    role: "VOLUNTEER",
  });

  const [perms, setPerms] = useState<
    Record<PermissionKey, boolean>
  >(DEFAULT_PERMISSIONS.VOLUNTEER);

  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  // ───────────────────────────────────────────────────────────────────────────
  // Role Change
  // ───────────────────────────────────────────────────────────────────────────

  const handleRoleChange = (selectedRole: UserRole) => {
    setForm((prev) => ({
      ...prev,
      role: selectedRole,
    }));

    setPerms({
      ...DEFAULT_PERMISSIONS[selectedRole],
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Permission Checkbox
  // ───────────────────────────────────────────────────────────────────────────

  const handleCheckboxChange = (
    key: PermissionKey
  ) => {
    setPerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Reset
  // ───────────────────────────────────────────────────────────────────────────

  const reset = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "VOLUNTEER",
    });

    setPerms({
      ...DEFAULT_PERMISSIONS.VOLUNTEER,
    });

    setShow(false);
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Create
  // ───────────────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }

    if (form.password.length < 8) {
      toast.error(
        "Password must be at least 8 characters"
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          permissions: perms,
        }),
      });

      const json = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        toast.error(
          json?.error ?? "Failed to create user"
        );
        return;
      }

      toast.success(
        `User "${form.name}" created successfully`
      );

      reset();

      onCreated();
      onClose();
    } catch {
      toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Create New User
          </DialogTitle>

          <DialogDescription>
            Add a new account with role and custom permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cu-name">
                Full Name
              </Label>

              <Input
                id="cu-name"
                placeholder="e.g. Rahim Uddin"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cu-email">
                Email Address
              </Label>

              <Input
                id="cu-email"
                type="email"
                placeholder="staff@qblood.org"
                value={form.email}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                disabled={loading}
              />
            </div>
          </div>

          {/* Password + Role */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cu-password">
                Password
              </Label>

              <div className="relative">
                <Input
                  id="cu-password"
                  type={
                    show ? "text" : "password"
                  }
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="pr-10"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShow((prev) => !prev)
                  }
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {show ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cu-role">
                Role
              </Label>

              <Select
                value={form.role}
                onValueChange={(value) =>
                  handleRoleChange(
                    value as UserRole
                  )
                }
                disabled={loading}
              >
                <SelectTrigger id="cu-role">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="VOLUNTEER">
                    Volunteer
                  </SelectItem>

                  <SelectItem value="COORDINATOR">
                    Coordinator
                  </SelectItem>

                  <SelectItem value="ADMIN">
                    Admin
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2 border-t pt-3 mt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Custom Permissions
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {PERMISSION_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none py-1 hover:bg-muted/30 px-2 rounded-md transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(perms[key])}
                    onChange={() =>
                      handleCheckboxChange(key)
                    }
                    disabled={loading}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />

                  <span>
                    {PERMISSION_LABELS[key]}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            onClick={handleCreate}
            disabled={loading}
            className="gap-2"
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit User Modal
// ─────────────────────────────────────────────────────────────────────────────

function EditUserModal({
  user,
  open,
  onClose,
  onUpdated,
  currentUserId,
}: {
  user: SystemUser | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  currentUserId: number;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] =
    useState<UserRole>("VOLUNTEER");

  const [perms, setPerms] = useState<
    Record<PermissionKey, boolean>
  >(DEFAULT_PERMISSIONS.VOLUNTEER);

  const [loading, setLoading] = useState(false);

  const isSelf =
    user?.id === currentUserId;

  // ───────────────────────────────────────────────────────────────────────────
  // Load user data
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    setName(user.name);
    setEmail(user.email);
    setRole(user.role);

    const initialPerms = {
      ...DEFAULT_PERMISSIONS[user.role],
    };

    if (
      user.permissions &&
      typeof user.permissions === "object" &&
      !Array.isArray(user.permissions)
    ) {
      for (const key of PERMISSION_KEYS) {
        if (
          user.permissions[key] !== undefined
        ) {
          initialPerms[key] =
            Boolean(user.permissions[key]);
        }
      }
    }

    setPerms(initialPerms);
  }, [user]);

  // ───────────────────────────────────────────────────────────────────────────
  // Role change
  // ───────────────────────────────────────────────────────────────────────────

  const handleRoleChange = (
    selectedRole: UserRole
  ) => {
    setRole(selectedRole);

    setPerms({
      ...DEFAULT_PERMISSIONS[selectedRole],
    });
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Permission change
  // ───────────────────────────────────────────────────────────────────────────

  const handleCheckboxChange = (
    key: PermissionKey
  ) => {
    // User cannot remove own userManagement permission
    if (
      isSelf &&
      key === "userManagement"
    ) {
      return;
    }

    setPerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ───────────────────────────────────────────────────────────────────────────
  // Update
  // ───────────────────────────────────────────────────────────────────────────

  const handleUpdate = async () => {
    if (!user) return;

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }

    setLoading(true);

    try {
      const body: Record<
        string,
        unknown
      > = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        permissions: perms,
      };

      // Never send own role
      if (!isSelf) {
        body.role = role;
      }

      const res = await fetch(
        `/api/users/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const json = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        toast.error(
          json?.error ??
            "Failed to update user"
        );
        return;
      }

      toast.success(
        "User updated successfully"
      );

      onUpdated();
      onClose();
    } catch {
      toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Edit User Profile
          </DialogTitle>

          <DialogDescription>
            Modify profile information, role and permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="eu-name">
                Full Name
              </Label>

              <Input
                id="eu-name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eu-email">
                Email Address
              </Label>

              <Input
                id="eu-email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                disabled={loading}
              />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="eu-role">
              Role
            </Label>

            <Select
              value={role}
              onValueChange={(value) =>
                handleRoleChange(
                  value as UserRole
                )
              }
              disabled={
                loading || isSelf
              }
            >
              <SelectTrigger id="eu-role">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="VOLUNTEER">
                  Volunteer
                </SelectItem>

                <SelectItem value="COORDINATOR">
                  Coordinator
                </SelectItem>

                <SelectItem value="ADMIN">
                  Admin
                </SelectItem>
              </SelectContent>
            </Select>

            {isSelf && (
              <p className="text-[10px] text-muted-foreground">
                You cannot change your own role.
              </p>
            )}
          </div>

          {/* Permissions */}
          <div className="space-y-2 border-t pt-3 mt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Custom Permissions
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {PERMISSION_KEYS.map(
                (key) => {
                  const disabled =
                    loading ||
                    (isSelf &&
                      key ===
                        "userManagement");

                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 text-sm select-none py-1 px-2 rounded-md transition-colors ${
                        disabled
                          ? "opacity-60 cursor-not-allowed"
                          : "cursor-pointer hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(
                          perms[key]
                        )}
                        onChange={() =>
                          handleCheckboxChange(
                            key
                          )
                        }
                        disabled={disabled}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />

                      <span>
                        {
                          PERMISSION_LABELS[
                            key
                          ]
                        }
                      </span>
                    </label>
                  );
                }
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            onClick={handleUpdate}
            disabled={loading}
            className="gap-2"
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset Password Modal
// ─────────────────────────────────────────────────────────────────────────────

function ResetPasswordModal({
  user,
  open,
  onClose,
}: {
  user: SystemUser | null;
  open: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] =
    useState("");

  const [show, setShow] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const handleReset = async () => {
    if (!user) return;

    if (password.length < 8) {
      toast.error(
        "Password must be at least 8 characters"
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `/api/users/${user.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            newPassword: password,
          }),
        }
      );

      const json = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        toast.error(
          json?.error ??
            "Failed to reset password"
        );
        return;
      }

      toast.success(
        `Password reset for ${user.email}`
      );

      setPassword("");
      setShow(false);
      onClose();
    } catch {
      toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          setPassword("");
          setShow(false);
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Reset Password
          </DialogTitle>

          <DialogDescription>
            Set a new password for{" "}
            <span className="font-semibold">
              {user?.email}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reset-pw">
            New Password
          </Label>

          <div className="relative">
            <Input
              id="reset-pw"
              type={
                show ? "text" : "password"
              }
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              placeholder="Min 8 characters"
              className="pr-10"
              disabled={loading}
            />

            <button
              type="button"
              onClick={() =>
                setShow((prev) => !prev)
              }
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              {show ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            onClick={handleReset}
            disabled={
              loading ||
              password.length < 8
            }
            className="gap-2"
          >
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            Reset Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main User Management View
// ─────────────────────────────────────────────────────────────────────────────

export function UserManagementView({
  currentUserId,
}: {
  currentUserId: number;
}) {
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] =
    useState(false);

  const [editTarget, setEditTarget] =
    useState<SystemUser | null>(null);

  const [resetTarget, setResetTarget] =
    useState<SystemUser | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Users Query
  // ───────────────────────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<
    { users: SystemUser[] },
    Error
  >({
    queryKey: ["system-users"],

    queryFn: async () => {
      const res = await fetch(
        "/api/users",
        {
          cache: "no-store",
        }
      );

      const json = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          json?.error ??
            "Failed to load users"
        );
      }

      return json;
    },
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Delete
  // ───────────────────────────────────────────────────────────────────────────

  const deleteMutation =
    useMutation({
      mutationFn: async (
        id: number
      ) => {
        const res = await fetch(
          `/api/users/${id}`,
          {
            method: "DELETE",
          }
        );

        const json = await res
          .json()
          .catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            json?.error ??
              "Delete failed"
          );
        }
      },

      onSuccess: () => {
        toast.success(
          "User deleted successfully"
        );

        qc.invalidateQueries({
          queryKey: ["system-users"],
        });
      },

      onError: (err: Error) => {
        toast.error(err.message);
      },
    });

  // ───────────────────────────────────────────────────────────────────────────
  // Freeze / Unfreeze
  // ───────────────────────────────────────────────────────────────────────────

  const freezeMutation =
    useMutation({
      mutationFn: async ({
        id,
        isActive,
      }: {
        id: number;
        isActive: boolean;
      }) => {
        const res = await fetch(
          `/api/users/${id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              isActive,
            }),
          }
        );

        const json = await res
          .json()
          .catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            json?.error ??
              "Failed to update account"
          );
        }

        return isActive;
      },

      onSuccess: (isActive) => {
        toast.success(
          isActive
            ? "Account activated"
            : "Account frozen"
        );

        qc.invalidateQueries({
          queryKey: ["system-users"],
        });
      },

      onError: (err: Error) => {
        toast.error(err.message);
      },
    });

  const users =
    data?.users ?? [];

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>

          <div>
            <p className="font-semibold text-sm">
              System Accounts
            </p>

            <p className="text-xs text-muted-foreground">
              {isLoading
                ? "Loading…"
                : `${users.length} user${
                    users.length !== 1
                      ? "s"
                      : ""
                  } registered`}
            </p>
          </div>
        </div>

        <Button
          id="open-create-user"
          size="sm"
          className="gap-2"
          onClick={() =>
            setCreateOpen(true)
          }
        >
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-muted bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>
                Name
              </TableHead>

              <TableHead>
                Email
              </TableHead>

              <TableHead>
                Role
              </TableHead>

              <TableHead>
                Permissions Enabled
              </TableHead>

              <TableHead className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Loading */}
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            )}

            {/* Error */}
            {isError && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-destructive"
                >
                  Failed to load users:{" "}
                  {error?.message ??
                    "Unknown error"}
                </TableCell>
              </TableRow>
            )}

            {/* Empty */}
            {!isLoading &&
              !isError &&
              users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}

            {/* Users */}
            {!isLoading &&
              !isError &&
              users.map((u) => {
                const enabledCount =
                  PERMISSION_KEYS.filter(
                    (key) =>
                      hasPermission(
                        u,
                        key
                      )
                  ).length;

                return (
                  <TableRow
                    key={u.id}
                    className={`hover:bg-muted/20 transition-colors ${
                      !u.isActive
                        ? "bg-blue-50/40 dark:bg-blue-950/20"
                        : ""
                    }`}
                  >
                    {/* Name */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                            !u.isActive
                              ? "bg-blue-100 text-blue-600"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {u.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium leading-none">
                              {u.name}
                            </p>

                            {!u.isActive && (
                              <Badge className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700 border-blue-200 font-semibold">
                                <Snowflake className="h-2.5 w-2.5 mr-0.5" />
                                Frozen
                              </Badge>
                            )}
                          </div>

                          {u.id ===
                            currentUserId && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              You
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Email */}
                    <TableCell className="text-sm text-muted-foreground">
                      {u.email}
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <RoleBadge
                        role={u.role}
                      />
                    </TableCell>

                    {/* Permission Count */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-xs bg-slate-50 text-slate-700"
                      >
                        {enabledCount} of{" "}
                        {PERMISSION_KEYS.length}{" "}
                        Enabled
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {/* Edit */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            setEditTarget(u)
                          }
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>

                        {/* Reset Password */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs text-slate-700"
                          onClick={() =>
                            setResetTarget(
                              u
                            )
                          }
                        >
                          <KeyRound className="h-3 w-3 mr-1" />
                          Reset PW
                        </Button>

                        {/* Freeze / Unfreeze */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            u.id ===
                              currentUserId ||
                            freezeMutation.isPending
                          }
                          className={`h-7 text-xs ${
                            u.isActive
                              ? "text-blue-600 border-blue-300 hover:bg-blue-50"
                              : "text-green-600 border-green-300 hover:bg-green-50"
                          }`}
                          onClick={() =>
                            freezeMutation.mutate(
                              {
                                id: u.id,
                                isActive:
                                  !u.isActive,
                              }
                            )
                          }
                        >
                          {u.isActive ? (
                            <>
                              <Snowflake className="h-3 w-3 mr-1" />
                              Freeze
                            </>
                          ) : (
                            <>
                              <Flame className="h-3 w-3 mr-1" />
                              Unfreeze
                            </>
                          )}
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            u.id ===
                              currentUserId ||
                            deleteMutation.isPending
                          }
                          className="h-7 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                          onClick={() => {
                            const confirmed =
                              window.confirm(
                                `Delete user account "${u.name}"?\n\nThis will deactivate the account.`
                              );

                            if (
                              confirmed
                            ) {
                              deleteMutation.mutate(
                                u.id
                              );
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* Create Modal */}
      <CreateUserModal
        open={createOpen}
        onClose={() =>
          setCreateOpen(false)
        }
        onCreated={() =>
          qc.invalidateQueries({
            queryKey: ["system-users"],
          })
        }
      />

      {/* Edit Modal */}
      <EditUserModal
        user={editTarget}
        open={!!editTarget}
        onClose={() =>
          setEditTarget(null)
        }
        onUpdated={() =>
          qc.invalidateQueries({
            queryKey: ["system-users"],
          })
        }
        currentUserId={currentUserId}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        user={resetTarget}
        open={!!resetTarget}
        onClose={() =>
          setResetTarget(null)
        }
      />
    </div>
  );
}