import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { centralPrisma } from "@/lib/central-db";
import { generateMobileToken } from "@/lib/mobile-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 },
      );
    }

    // ─────────────────────────────────────────────
    // 1. Check SuperAdmin
    // ─────────────────────────────────────────────

    const superAdmin = await centralPrisma.superAdmin.findUnique({
      where: { email },
    });

    if (superAdmin) {
      if (!superAdmin.isActive) {
        return NextResponse.json(
          { success: false, error: "ACCOUNT_INACTIVE" },
          { status: 403 },
        );
      }

      const passwordMatch = await bcrypt.compare(
        password,
        superAdmin.passwordHash,
      );

      if (!passwordMatch) {
        return NextResponse.json(
          { success: false, error: "Invalid email or password" },
          { status: 401 },
        );
      }

      const token = generateMobileToken({
        userId: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: "ADMIN",
        branchId: null,
        branchSlug: null,
        isSuperAdmin: true,
      });

      return NextResponse.json({
        success: true,
        token,
        user: {
          id: superAdmin.id,
          email: superAdmin.email,
          name: superAdmin.name,
          role: "ADMIN",
          branchId: null,
          branchSlug: null,
          isSuperAdmin: true,
        },
      });
    }

    // ─────────────────────────────────────────────
    // 2. Check BranchUser
    // ─────────────────────────────────────────────

    const branchUser = await centralPrisma.branchUser.findUnique({
      where: { email },
      include: {
        branch: { select: { id: true, slug: true, isActive: true } },
      },
    });

    if (!branchUser) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    if (!branchUser.isActive) {
      return NextResponse.json(
        { success: false, error: "ACCOUNT_INACTIVE" },
        { status: 403 },
      );
    }

    if (!branchUser.branch.isActive) {
      return NextResponse.json(
        { success: false, error: "BRANCH_INACTIVE" },
        { status: 403 },
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      branchUser.passwordHash,
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const token = generateMobileToken({
      userId: branchUser.id,
      email: branchUser.email,
      name: branchUser.name,
      role: branchUser.role,
      branchId: branchUser.branch.id,
      branchSlug: branchUser.branch.slug,
      isSuperAdmin: false,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: branchUser.id,
        email: branchUser.email,
        name: branchUser.name,
        role: branchUser.role,
        branchId: branchUser.branch.id,
        branchSlug: branchUser.branch.slug,
        isSuperAdmin: false,
      },
    });
  } catch (error) {
    console.error("POST /api/mobile/login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}