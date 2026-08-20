import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/central";

const centralPrisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding central database...");

  const passwordHash = await bcrypt.hash("SuperAdmin@2026!", 10);

  const superAdmin = await centralPrisma.superAdmin.upsert({
    where: { email: "superadmin@qblood.org" },
    update: {},
    create: {
      email: "superadmin@qblood.org",
      passwordHash,
      name: "Super Administrator",
    },
  });

  console.log(`✅ SuperAdmin ready: ${superAdmin.email}`);
}

main()
  .catch((e) => {
    console.error("❌ Central seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await centralPrisma.$disconnect();
  });