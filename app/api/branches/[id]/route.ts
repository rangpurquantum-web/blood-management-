import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { centralPrisma } from "@/lib/central-db";
import { disconnectBranchDb } from "@/lib/branch-db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type UpdateBranchBody = {
  name?: string;
  slug?: string;
  location?: string | null;
  databaseUrlSecret?: string;
  isActive?: boolean;
};

function parseBranchId(value: string): number | null {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

export async function GET(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const params = await context.params;
    const branchId = parseBranchId(params.id);

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "Invalid branch ID" },
        { status: 400 },
      );
    }

    const branch = await centralPrisma.branch.findUnique({
      where: {
        id: branchId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        location: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, error: "Branch not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      branch,
    });
  } catch (error) {
    console.error("GET /api/branches/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load branch",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const params = await context.params;
    const branchId = parseBranchId(params.id);

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "Invalid branch ID" },
        { status: 400 },
      );
    }

    const body = (await req.json()) as UpdateBranchBody;

    const existingBranch = await centralPrisma.branch.findUnique({
      where: {
        id: branchId,
      },
    });

    if (!existingBranch) {
      return NextResponse.json(
        { success: false, error: "Branch not found" },
        { status: 404 },
      );
    }

    const data: UpdateBranchBody = {};

    if (body.name !== undefined) {
      const name = body.name.trim();

      if (!name) {
        return NextResponse.json(
          {
            success: false,
            error: "Branch name cannot be empty",
          },
          { status: 400 },
        );
      }

      data.name = name;
    }

    if (body.slug !== undefined) {
      const slug = body.slug.trim().toLowerCase();

      if (!slug) {
        return NextResponse.json(
          {
            success: false,
            error: "Branch slug cannot be empty",
          },
          { status: 400 },
        );
      }

      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Slug may contain only lowercase letters, numbers, and hyphens",
          },
          { status: 400 },
        );
      }

      data.slug = slug;
    }

    if (body.location !== undefined) {
      data.location = body.location?.trim() || null;
    }

    if (body.databaseUrlSecret !== undefined) {
      const databaseUrl = body.databaseUrlSecret.trim();

      if (!databaseUrl) {
        return NextResponse.json(
          {
            success: false,
            error: "Database URL cannot be empty",
          },
          { status: 400 },
        );
      }

      data.databaseUrlSecret = databaseUrl;
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    const duplicate = await centralPrisma.branch.findFirst({
      where: {
        id: {
          not: branchId,
        },
        OR: [
          ...(data.name
            ? [
                {
                  name: data.name,
                },
              ]
            : []),
          ...(data.slug
            ? [
                {
                  slug: data.slug,
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          error:
            duplicate.name === data.name
              ? "A branch with this name already exists"
              : "A branch with this slug already exists",
        },
        { status: 409 },
      );
    }

    const branch = await centralPrisma.branch.update({
      where: {
        id: branchId,
      },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        location: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // If the database URL or active state changed,
    // remove the cached Prisma client.
    await disconnectBranchDb(branchId);

    return NextResponse.json({
      success: true,
      message: "Branch updated successfully",
      branch,
    });
  } catch (error) {
    console.error("PATCH /api/branches/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to update branch",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const params = await context.params;
    const branchId = parseBranchId(params.id);

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "Invalid branch ID" },
        { status: 400 },
      );
    }

    const branch = await centralPrisma.branch.findUnique({
      where: {
        id: branchId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, error: "Branch not found" },
        { status: 404 },
      );
    }

    await disconnectBranchDb(branchId);

    await centralPrisma.branch.delete({
      where: {
        id: branchId,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Branch "${branch.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("DELETE /api/branches/[id] error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete branch",
      },
      { status: 500 },
    );
  }
}