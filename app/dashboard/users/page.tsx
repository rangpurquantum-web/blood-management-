import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@/generated/branch";
import { Shield } from "lucide-react";
import { UserManagementView } from "@/features/users/components/user-management-view";

export const metadata: Metadata = {
title: "User Management — BloodManager",
description: "Create and manage system user accounts",
};

export default async function UsersPage() {
const session = await auth();
if (!session?.user) redirect("/login");
if (session.user.role !== Role.ADMIN) redirect("/dashboard");

const currentUserId = Number(session.user.id);

return (
<div className="space-y-6 max-w-4xl mx-auto">
{/* Page Header */}
<div className="flex items-center gap-3">
<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
<Shield className="h-5 w-5 text-red-600" />
</div>
<div>
<h1 className="text-2xl font-bold tracking-tight">User Management</h1>
<p className="text-sm text-muted-foreground">
Admin only — create accounts and view all system users
</p>
</div>
</div>

<UserManagementView currentUserId={currentUserId} />  
</div>

);
}