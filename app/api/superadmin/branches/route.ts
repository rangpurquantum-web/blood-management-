import { NextRequest } from "next/server";
import { z } from "zod";
import { centralPrisma } from "@/lib/central-db";
import { Role } from "@/generated/branch";
import {
  withAuth,
  apiError,
  apiSuccess,
  validationError,
  writeAuditLog,
} from "@/lib/api-helpers";

const createBranchSchema = z.object({
  name: z.string().min(2, "Branch name is required"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  databaseUrlSecret: z.string().min(10, "Encrypted database URL is required"),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/branches — create a new branch (SuperAdmin only)
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(
  async (req: NextRequest, session) => {
    if (!session.isSuperAdmin) {
      return apiError("Forbidden — SuperAdmin access required", 403);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = createBranchSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const { name, slug, databaseUrlSecret } = parsed.data;

    const existing = await centralPrisma.branch.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (existing) {
      return apiError("A branch with this slug already exists", 409);
    }

    const branch = await centralPrisma.branch.create({
      data: {
        name,
        slug,
        databaseUrlSecret,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
    });

    await writeAuditLog(
      session.userId,
      "BRANCH_CREATED",
      `Created new branch "${name}" (slug: ${slug})`,
      branch.id,
      branch.slug,
    );

    return apiSuccess({ branch }, 201);
  },
  { roles: [Role.ADMIN] }, // isSuperAdmin bypass in withAuth still applies
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/superadmin/branches — list all branches (SuperAdmin only)
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(
  async (req: NextRequest, session) => {
    if (!session.isSuperAdmin) {
      return apiError("Forbidden — SuperAdmin access required", 403);
    }

    const branches = await centralPrisma.branch.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });

    return apiSuccess({ branches });
  },
);