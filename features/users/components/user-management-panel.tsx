"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck, Users, Plus, Trash2, KeyRound, Loader2, Eye, EyeOff, Edit,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── Types ──────────────────────────────────────────────────────────────────

interface User {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "VOLUNTEER";
  createdAt: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function roleBadge(role: string) {
  return role === "ADMIN" ? (
    <Badge className="bg-red-100 text-red-700 border-red-200 text-xs font-semibold">Admin</Badge>
  ) : (
    <Badge variant="secondary" className="text-xs">Volunteer</Badge>
  );
}

// ─── Reset Password Modal ────────────────────────────────────────────────────

function ResetPasswordModal({
  user, open, onClose,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!user || password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error ?? "Failed"); return; }
      toast.success(`Password reset for ${user.email}`);
      setPassword("");
      onClose();
    } catch {
      toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPassword(""); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-semibold">{user?.email}</span>.<br />
            No current password verification required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reset-pw">New Password</Label>
          <div className="relative">
            <Input
              id="reset-pw"
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="pr-10"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleReset} disabled={loading || password.length < 8} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Reset Password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create User Modal ───────────────────────────────────────────────────────

function CreateUserModal({
  open, onClose, onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "VOLUNTEER" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.email || form.password.length < 8) {
      toast.error("Name, email and password (min 8 chars) required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error ?? "Failed"); return; }
      toast.success(`User ${form.email} created`);
      setForm({ name: "", email: "", password: "", role: "VOLUNTEER" });
      onCreated();
      onClose();
    } catch {
      toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Create User
          </DialogTitle>
          <DialogDescription>Add a new staff or admin account to the system.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Name</Label>
            <Input
              id="cu-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Full name"
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="staff@example.org"
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-pw">Password</Label>
            <div className="relative">
              <Input
                id="cu-pw"
                type={show ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Min 8 characters"
                className="pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}
              disabled={loading}
            >
              <SelectTrigger id="cu-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VOLUNTEER">Volunteer</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Role Modal ────────────────────────────────────────────────────────

function EditRoleModal({
  user, open, onClose, onUpdated,
}: {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [role, setRole] = useState<"ADMIN" | "VOLUNTEER">("VOLUNTEER");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role);
    }
  }, [user]);

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json?.error ?? "Failed"); return; }
      toast.success(`Role updated to ${role} for ${user.email}`);
      onUpdated();
      onClose();
    } catch {
      toast.error("Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Edit User Role
          </DialogTitle>
          <DialogDescription>
            Change role for <span className="font-semibold">{user?.email}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-role-select">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as any)}
              disabled={loading}
            >
              <SelectTrigger id="edit-role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VOLUNTEER">Volunteer</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect } from "react";

// ─── Main Component ──────────────────────────────────────────────────────────

export function UserManagementPanel({ currentUserId }: { currentUserId: number }) {
  const qc = useQueryClient();
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [editRoleTarget, setEditRoleTarget] = useState<User | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ["admin-users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j?.error ?? "Delete failed");
      }
    },
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const users = data?.users ?? [];

  return (
    <div className="space-y-6">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">System Users</h2>
            <p className="text-xs text-muted-foreground">{users.length} account{users.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button
          id="create-user-btn"
          size="sm"
          className="gap-2"
          onClick={() => setCreateOpen(true)}
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
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/20">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{u.name}</span>
                      {u.id === currentUserId && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">You</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{roleBadge(u.role)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        disabled={u.id === currentUserId}
                        onClick={() => setEditRoleTarget(u)}
                        title={u.id === currentUserId ? "Cannot change your own role" : "Edit Role"}
                      >
                        <Edit className="h-3 w-3" />
                        Edit Role
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={() => setResetTarget(u)}
                      >
                        <KeyRound className="h-3 w-3" />
                        Reset PW
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                        disabled={u.id === currentUserId || deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Delete user "${u.name}"? This cannot be undone.`)) {
                            deleteMutation.mutate(u.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      <ResetPasswordModal
        user={resetTarget}
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
      />
      <EditRoleModal
        user={editRoleTarget}
        open={!!editRoleTarget}
        onClose={() => setEditRoleTarget(null)}
        onUpdated={() => qc.invalidateQueries({ queryKey: ["admin-users"] })}
      />
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["admin-users"] })}
      />
    </div>
  );
}
