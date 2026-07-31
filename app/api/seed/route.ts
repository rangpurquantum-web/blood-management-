import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const adminHash = await bcrypt.hash("Qblood@2026", 10);
    const staffHash = await bcrypt.hash("StaffPassword@2026!", 10);

    const admin = await prisma.user.upsert({
      where: { email: "admin@qblood.org" },
      update: {
        isActive: true,
        isDeleted: false,
        passwordHash: adminHash,
      },
      create: {
        email: "admin@qblood.org",
        passwordHash: adminHash,
        role: "ADMIN",
        name: "System Administrator",
        isActive: true,
        isDeleted: false,
      },
    });

    const staff = await prisma.user.upsert({
      where: { email: "staff@qblood.org" },
      update: {
        isActive: true,
        isDeleted: false,
        passwordHash: staffHash,
      },
      create: {
        email: "staff@qblood.org",
        passwordHash: staffHash,
        role: "VOLUNTEER",
        name: "Jane Cooper",
        isActive: true,
        isDeleted: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Database default accounts seeded successfully!",
      accounts: [
        { email: admin.email, role: admin.role, status: "Active" },
        { email: staff.email, role: staff.role, status: "Active" },
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to seed database";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
