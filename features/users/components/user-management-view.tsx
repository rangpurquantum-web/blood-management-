"use client";

import { useEffect, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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
  Crown,
  UserCog,
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
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type PermissionKey,
  type UserRole,
  hasPermission,
} from "@/lib/permissions";

import { UserQrCode } from "@/components/user-qr-code";

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

// ─────────────────────────────────────────────────────────────────────────────
// Role Badge
// ─────────────────────────────────────────────────────────────────────────────

function RoleBadge({
  role,
}: {
  role: UserRole;
}) {
  if (role === "ADMIN") {
    return (
      <Badge className="bg-red-50 text-red-700 border border-red-200 font-semibold text-xs gap-1">
        <Crown className="h-3 w-3" />
        Admin
      </Badge>
    );
  }

  if (role === "COORDINATOR") {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-xs gap-1">
        <UserCog className="h-3 w-3" />
        Coordinator
      </Badge>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="text-xs"
    >
      Volunteer
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission Checkboxes
// ─────────────────────────────────────────────────────────────────────────────

function PermissionCheckboxes({
  permissions,
  setPermissions,
  disabled,
  currentUser,
}: {
  permissions: Record<PermissionKey, boolean>;
  setPermissions: React.Dispatch<
    React.SetStateAction<Record<PermissionKey, boolean>>
  >;
  disabled?: boolean;
  currentUser?: boolean;
}) {
  const toggle = (key: PermissionKey) => {
    if (
      currentUser &&
      key === "userManagement"
    ) {
      return;
    }

    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="space-y-2 border-t pt-3 mt-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Custom Permissions
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {PERMISSION_KEYS.map((key) => {
          const checkboxDisabled =
            disabled ||
            (currentUser &&
              key === "userManagement");

          return (
            <label
              key={key}
              className={`flex items-center gap-2 text-sm select-none py-1.5 px-2 rounded-md transition-colors ${
                checkboxDisabled
                  ? "opacity-60 cursor-not-allowed"
                  : "cursor-pointer hover:bg-muted/30"
              }`}
            >
              <input
                type="checkbox"
                checked={!!permissions[key]}
                onChange={() => toggle(key)}
                disabled={checkboxDisabled}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />

              <span>
                {PERMISSION_LABELS[key]}
              </span>
            </label>
          );
        })}
      </div>
    </div>
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
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "VOLUNTEER" as UserRole,
  });

  const [permissions, setPermissions] =
    useState<Record<PermissionKey, boolean>>(
      DEFAULT_PERMISSIONS.VOLUNTEER
    );

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const handleRoleChange = (
    selectedRole: UserRole
  ) => {
    setForm((prev) => ({
      ...prev,
      role: selectedRole,
    }));

    setPermissions({
      ...DEFAULT_PERMISSIONS[selectedRole],
    });
  };

  const reset = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "VOLUNTEER",
    });

    setPermissions({
      ...DEFAULT_PERMISSIONS.VOLUNTEER,
    });

    setShowPassword(false);
  };

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
      const res = await fetch(
        "/api/users",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
            permissions,
          }),
        }
      );

      const json = await res
        .json()
        .catch(() => ({}));

      if (!res.ok) {
        toast.error(
          json?.error ??
            "Failed to create user"
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Create New User
          </DialogTitle>

          <DialogDescription>
            Create an account and assign role-based permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Name / Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          {/* Password / Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cu-password">
                Password
              </Label>

              <div className="relative">
                <Input
                  id="cu-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      password:
                        e.target.value,
                    }))
                  }
                  className="pr-10"
                  disabled={loading}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (prev) => !prev
                    )
                  }
                  className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
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

          <PermissionCheckboxes
            permissions={permissions}
            setPermissions={setPermissions}
            disabled={loading}
          />
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
  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [role, setRole] =
    useState<UserRole>("VOLUNTEER");

  const [permissions, setPermissions] =
    useState<Record<PermissionKey, boolean>>(
      DEFAULT_PERMISSIONS.VOLUNTEER
    );

  const [loading, setLoading] =
    useState(false);

  const isSelf =
    user?.id === currentUserId;

  useEffect(() => {
    if (!user) return;

    setName(user.name);
    setEmail(user.email);
    setRole(user.role);

    const defaults = {
      ...DEFAULT_PERMISSIONS[user.role],
    };

    if (
      user.permissions &&
      typeof user.permissions === "object"
    ) {
      for (const key of PERMISSION_KEYS) {
        if (
          user.permissions[key] !==
          undefined
        ) {
          defaults[key] =
            !!user.permissions[key];
        }
      }
    }

    setPermissions(defaults);
  }, [user]);

  const handleRoleChange = (
    selectedRole: UserRole
  ) => {
    setRole(selectedRole);

    setPermissions({
      ...DEFAULT_PERMISSIONS[selectedRole],
    });
  };

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
        email: email.trim(),
        permissions,
      };

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
        if (!value) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-primary" />
            Edit User
          </DialogTitle>

          <DialogDescription>
            Update account details, role and permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Full Name
              </Label>

              <Input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Email Address
              </Label>

              <Input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
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
              <SelectTrigger>
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

          <PermissionCheckboxes
            permissions={permissions}
            setPermissions={setPermissions}
            disabled={loading}
            currentUser={isSelf}
          />
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
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>
            New Password
          </Label>

          <div className="relative">
            <Input
              type={
                show
                  ? "text"
                  : "password"
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
                setShow(
                  (prev) => !prev
                )
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
// Main User Management
// ─────────────────────────────────────────────────────────────────────────────

export function UserManagementView({
  currentUserId,
}: {
  currentUserId: number;
}) {
  const queryClient =
    useQueryClient();

  const [createOpen, setCreateOpen] =
    useState(false);

  const [editTarget, setEditTarget] =
    useState<SystemUser | null>(null);

  const [resetTarget, setResetTarget] =
    useState<SystemUser | null>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch users
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
        "/api/users"
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

        queryClient.invalidateQueries({
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

        queryClient.invalidateQueries({
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
      <div className="flex items-center justify-between gap-4">
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

      {/* Table */}
      <div className="rounded-2xl border border-muted bg-card shadow-sm overflow-x-auto">
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
                Permissions
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
                  className="py-10 text-center"
                >
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            )}

            {/* Error */}
            {!isLoading &&
              isError && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-destructive"
                  >
                    Failed to load users:{" "}
                    {error?.message}
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
              users.map((user) => {
                const enabledCount =
                  PERMISSION_KEYS.filter(
                    (key) =>
                      hasPermission(
                        user,
                        key
                      )
                  ).length;

                return (
                  <TableRow
                    key={user.id}
                    className={`hover:bg-muted/20 transition-colors ${
                      !user.isActive
                        ? "bg-blue-50/40 dark:bg-blue-950/20"
                        : ""
                    }`}
                  >

                    {/* Name */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                            !user.isActive
                              ? "bg-blue-100 text-blue-600"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {user.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium leading-none">
                              {user.name}
                            </p>

                            {!user.isActive && (
                              <Badge className="text-[9px] px-1 py-0 bg-blue-100 text-blue-700 border-blue-200 font-semibold">
                                <Snowflake className="h-2.5 w-2.5 mr-0.5" />
                                Frozen
                              </Badge>
                            )}
                          </div>

                          {user.id ===
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
                      {user.email}
                    </TableCell>

                    {/* Role */}
                    <TableCell>
                      <RoleBadge
                        role={user.role}
                      />
                    </TableCell>

                    {/* Permissions */}
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

                        {/* QR Login */}
                        <UserQrCode
                          userId={user.id}
                          userName={user.name}
                        />

                        {/* Edit */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            setEditTarget(
                              user
                            )
                          }
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>

                        {/* Reset Password */}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() =>
                            setResetTarget(
                              user
                            )
                          }
                        >
                          <KeyRound className="h-3 w-3 mr-1" />
                          Reset PW
                        </Button>

                        {/* Freeze */}
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            user.id ===
                              currentUserId ||
                            freezeMutation.isPending
                          }
                          className={`h-7 text-xs ${
                            user.isActive
                              ? "text-blue-600 border-blue-300 hover:bg-blue-50"
                              : "text-green-600 border-green-300 hover:bg-green-50"
                          }`}
                          onClick={() =>
                            freezeMutation.mutate(
                              {
                                id: user.id,
                                isActive:
                                  !user.isActive,
                              }
                            )
                          }
                        >
                          {user.isActive ? (
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
                          className="h-7 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                          disabled={
                            user.id ===
                              currentUserId ||
                            deleteMutation.isPending
                          }
                          onClick={() => {
                            const confirmed =
                              window.confirm(
                                `Delete user account "${user.name}"?`
                              );

                            if (
                              confirmed
                            ) {
                              deleteMutation.mutate(
                                user.id
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

      {/* Create */}
      <CreateUserModal
        open={createOpen}
        onClose={() =>
          setCreateOpen(false)
        }
        onCreated={() =>
          queryClient.invalidateQueries(
            {
              queryKey: [
                "system-users",
              ],
            }
          )
        }
      />

      {/* Edit */}
      <EditUserModal
        user={editTarget}
        open={!!editTarget}
        onClose={() =>
          setEditTarget(null)
        }
        onUpdated={() =>
          queryClient.invalidateQueries(
            {
              queryKey: [
                "system-users",
              ],
            }
          )
        }
        currentUserId={
          currentUserId
        }
      />

      {/* Reset Password */}
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
