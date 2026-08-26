import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { centralPrisma } from "@/lib/central-db";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET!;
const TOKEN_EXPIRY = "30d";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email এবং Password দিন" },
        { status: 400 },
      );
    }

    // ─────────────────────────────────────────
    // 1. Check SuperAdmin
    // ─────────────────────────────────────────
    const superAdmin = await centralPrisma.superAdmin.findUnique({
      where: { email },
    });

    if (superAdmin) {
      if (!superAdmin.isActive) {
        return NextResponse.json(
          { success: false, error: "Account inactive" },
          { status: 403 },
        );
      }

      const passwordMatch = await bcrypt.compare(
        password,
        superAdmin.passwordHash,
      );

      if (!passwordMatch) {
        return NextResponse.json(
          { success: false, error: "ভুল ইমেইল বা পাসওয়ার্ড" },
          { status: 401 },
        );
      }

      const tokenPayload = {
        id: superAdmin.id,
        email: superAdmin.email,
        role: "ADMIN",
        branchId: null,
        isSuperAdmin: true,
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: TOKEN_EXPIRY,
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

    // ─────────────────────────────────────────
    // 2. Check BranchUser
    // ─────────────────────────────────────────
    const branchUser = await centralPrisma.branchUser.findUnique({
      where: { email },
      include: {
        branch: {
          select: { id: true, slug: true, isActive: true },
        },
      },
    });

    if (!branchUser) {
      return NextResponse.json(
        { success: false, error: "ভুল ইমেইল বা পাসওয়ার্ড" },
        { status: 401 },
      );
    }

    if (!branchUser.isActive) {
      return NextResponse.json(
        { success: false, error: "Account inactive" },
        { status: 403 },
      );
    }

    if (!branchUser.branch.isActive) {
      return NextResponse.json(
        { success: false, error: "Branch inactive" },
        { status: 403 },
      );
    }

    const passwordMatch = await bcrypt.compare(
      password,
      branchUser.passwordHash,
    );

    if (!passwordMatch) {
      return NextResponse.json(
        { success: false, error: "ভুল ইমেইল বা পাসওয়ার্ড" },
        { status: 401 },
      );
    }

    const tokenPayload = {
      id: branchUser.id,
      email: branchUser.email,
      role: branchUser.role,
      branchId: branchUser.branch.id,
      isSuperAdmin: false,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: TOKEN_EXPIRY,
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
  } catch (err) {
    console.error("Mobile login error:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}