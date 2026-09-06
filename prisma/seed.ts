/**
 * prisma/seed.ts  — Control DB seed (Update 1)
 *
 * Seeds ONLY the first SuperAdmin account in the Control Database.
 * No branches, no donors — those are created through the app UI after setup.
 *
 * Run with: npm run db:seed
 */

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Control Database...");

  const superAdminHash = await bcrypt.hash("SuperAdmin@2026!", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@qblood.org" },
    update: {},
    create: {
      email: "superadmin@qblood.org",
      passwordHash: superAdminHash,
      role: "SUPER_ADMIN",
      name: "System Super Admin",
      isActive: true,
    },
  });

  console.log(`✅ SuperAdmin created: ${superAdmin.email}`);
  console.log("\n🎉 Control DB seed complete!");
  console.log("   SuperAdmin: superadmin@qblood.org / SuperAdmin@2026!");
  console.log("\n👉 Next steps:");
  console.log("   1. Log in as SuperAdmin.");
  console.log("   2. Go to Dashboard → Branches → Create Branch.");
  console.log("   3. Enter the branch name, location, and PostgreSQL URL.");
  console.log("   4. The system will test the connection, encrypt the URL, and run migrations.");
  console.log("   5. Create Admin/Volunteer user accounts and assign them to the branch.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
