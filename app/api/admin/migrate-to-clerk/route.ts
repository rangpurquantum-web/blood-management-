import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

import { centralPrisma } from "@/lib/central-db";

export const maxDuration = 60;

function tokenOk(provided: string | null) {
  const expected = process.env.MIGRATION_TOKEN;
  if (!expected || expected.length < 20 || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Row = {
  type: "SUPER_ADMIN" | "BRANCH_USER";
  id: number;
  name: string;
  email: string;
  passwordHash: string;
};

// ONE-TIME TOOL. Dry run by default; add &confirm=1 to actually create users.
export async function GET(req: Request) {
  const url = new URL(req.url);

  if (!tokenOk(url.searchParams.get("token"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const confirm = url.searchParams.get("confirm") === "1";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 10) || 10, 25);

  const [admins, members] = await Promise.all([
    centralPrisma.superAdmin.findMany({
      where: { isActive: true, identity: { is: null } },
    }),
    centralPrisma.branchUser.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        identity: { is: null },
        branch: { isActive: true },
      },
    }),
  ]);

  const rows: Row[] = [
    ...admins.map((a) => ({
      type: "SUPER_ADMIN" as const,
      id: a.id,
      name: a.name,
      email: a.email,
      passwordHash: a.passwordHash,
    })),
    ...members.map((m) => ({
      type: "BRANCH_USER" as const,
      id: m.id,
      name: m.name,
      email: m.email,
      passwordHash: m.passwordHash,
    })),
  ];

  const client = await clerkClient();
  const results: { email: string; status: string; detail?: string }[] = [];
  let handled = 0;
  let reached = 0;

  for (const row of rows) {
    if (handled >= limit) break;
    reached++;

    const email = row.email.trim().toLowerCase();

    try {
      const existing = await client.users.getUserList({ emailAddress: [email] });
      if (existing.totalCount > 0) {
        results.push({ email, status: "already_in_clerk" });
        continue;
      }

      handled++;

      if (!confirm) {
        results.push({ email, status: "would_create" });
        continue;
      }

      const created = await client.users.createUser({
        emailAddress: [email],
        firstName: row.name,
        externalId: `${row.type === "SUPER_ADMIN" ? "sa" : "bu"}-${row.id}`,
        passwordDigest: row.passwordHash,
        passwordHasher: "bcrypt",
      });

      await centralPrisma.userIdentity.create({
        data: {
          clerkUserId: created.id,
          userType: row.type,
          superAdminId: row.type === "SUPER_ADMIN" ? row.id : null,
          branchUserId: row.type === "BRANCH_USER" ? row.id : null,
        },
      });

      results.push({ email, status: "created" });
    } catch (e) {
      results.push({
        email,
        status: "error",
        detail: e instanceof Error ? e.message : "unknown",
      });
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  return NextResponse.json({
    mode: confirm ? "LIVE" : "DRY_RUN",
    candidates: rows.length,
    processed: reached,
    remaining: rows.length - reached,
    results,
  });
}
