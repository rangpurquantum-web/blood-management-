"use client";

import { useState } from "react";
import { MoreHorizontal, Users, Pencil, Trash2, Power } from "lucide-react";
import { toast } from "sonner";

import { useBranches, useDeleteBranch, useUpdateBranch, type Branch } from "@/features/branches/hooks";
import { BranchForm } from "@/features/branches/components/branch-form";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function ToggleActiveMenuItem({ branch }: { branch: Branch }) {
  const updateBranch = useUpdateBranch(branch.id);

  return (
    <DropdownMenuItem
      onClick={() =>
        updateBranch.mutate(
          { isActive: !branch.isActive },
          {
            onSuccess: () =>
              toast.success(
                branch.isActive ? "Branch deactivated" : "Branch activated",
              ),
            onError: (err: any) =>
              toast.error(err.error || "Failed to update branch"),
          },
        )
      }
    >
      <Power className="mr-2 h-4 w-4" />
      {branch.isActive ? "Deactivate" : "Activate"}
    </DropdownMenuItem>
  );
}

export function BranchTable() {
  const { data: branches, isLoading, isError } = useBranches();
  const deleteBranch = useDeleteBranch();
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;

    deleteBranch.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Branch "${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
      },
      onError: (err: any) => {
        toast.error(err.error || "Failed to delete branch");
      },
    });
  };

  return (
    <>
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Branch Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell />
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Error loading branches.
                </TableCell>
              </TableRow>
            ) : branches?.length ? (
              branches.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell className="font-medium">{branch.name}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{branch.slug}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {branch.location || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {branch._count?.users ?? 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    {branch.isActive ? (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <BranchForm
                          branch={branch}
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          }
                        />
                        <ToggleActiveMenuItem branch={branch} />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(branch)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No branches found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete branch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &ldquo;{deleteTarget?.name}&rdquo; and all its users from
              the system. The branch&apos;s donor database itself will NOT be deleted — only the
              reference to it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}