/**
 * scripts/migrate-all-branches.ts  — db:migrate:all runner (Update 1)
 *
 * Iterates every Branch in the Control DB and runs `prisma db push` against
 * each branch's decrypted connection URL using the branch.schema.prisma schema.
 *
 * Behaviour:
 *  - Skips (does NOT fail) branches with dbStatus = "unreachable".
 *  - Marks a branch "unreachable" in the Control DB if the push fails.
 *  - Marks a branch "connected" if it succeeds.
 *
 * Run with: npm run db:migrate:all
 *
 * Requirements:
 *  - CONTROL_DATABASE_URL and ENCRYPTION_KEY must be set in the environment.
 *  - The prisma CLI must be available (it is — it's in devDependencies).
 */

import { execSync } from "child_process";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { decryptDatabaseUrl as decrypt } from "../lib/crypto";

// Load .env
import { config } from "dotenv";
config();

const controlPrisma = new PrismaClient();
const BRANCH_SCHEMA = path.resolve(__dirname, "../prisma/branch.schema.prisma");

async function main() {
  console.log("🔄 Running migrations for all branch databases...\n");

  const branches = await controlPrisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, dbUrlEncrypted: true, dbStatus: true },
  });

  if (branches.length === 0) {
    console.log("ℹ️  No active branches found in the Control DB. Nothing to migrate.");
    return;
  }

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const branch of branches) {
    if (branch.dbStatus === "unreachable") {
      console.log(`⏭️  [${branch.name}] Skipping — marked unreachable.`);
      skipped++;
      continue;
    }

    let dbUrl: string;
    try {
      dbUrl = decrypt(branch.dbUrlEncrypted);
    } catch {
      console.error(`❌ [${branch.name}] Failed to decrypt dbUrlEncrypted.`);
      failed++;
      continue;
    }

    console.log(`⏳ [${branch.name}] Pushing schema...`);
    try {
      execSync(
        `npx prisma db push --schema="${BRANCH_SCHEMA}" --skip-generate`,
        {
          env: { ...process.env, BRANCH_DATABASE_URL: dbUrl },
          stdio: "inherit",
        },
      );

      // Mark as connected on success
      await controlPrisma.branch.update({
        where: { id: branch.id },
        data: { dbStatus: "connected" },
      });

      console.log(`✅ [${branch.name}] Migration complete.\n`);
      succeeded++;
    } catch (err) {
      console.error(`❌ [${branch.name}] Migration failed — marking unreachable.`);
      console.error(err);

      await controlPrisma.branch.update({
        where: { id: branch.id },
        data: { dbStatus: "unreachable" },
      });

      failed++;
    }
  }

  console.log("\n─── Summary ─────────────────────────────────");
  console.log(`   ✅ Succeeded : ${succeeded}`);
  console.log(`   ⏭️  Skipped   : ${skipped}`);
  console.log(`   ❌ Failed    : ${failed}`);
  console.log("─────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await controlPrisma.$disconnect();
  });
