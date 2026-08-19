import { execSync } from "child_process";

const databaseUrl = process.env.BRANCH_DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "❌ BRANCH_DATABASE_URL environment variable is required.",
  );

  process.exit(1);
}

console.log("────────────────────────────────────────────");
console.log("Branch Database Schema Deployment");
console.log("────────────────────────────────────────────");

console.log("🔄 Deploying Prisma migrations...");

try {
  execSync(
    "npx prisma migrate deploy --schema=prisma/schema.prisma",
    {
      stdio: "inherit",

      env: {
        ...process.env,

        DATABASE_URL: databaseUrl,
      },
    },
  );

  console.log("────────────────────────────────────────────");
  console.log("✅ Branch database schema is ready.");
  console.log("────────────────────────────────────────────");

  process.exit(0);
} catch (error) {
  console.error("────────────────────────────────────────────");
  console.error("❌ Failed to deploy branch database schema.");
  console.error("────────────────────────────────────────────");

  console.error(error);

  process.exit(1);
}