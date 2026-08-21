// ─────────────────────────────────────────────────────────────────────────────
// Combined branch DB schema migrations, in order.
// Used by the "Initialize Schema" SuperAdmin action to set up a brand-new
// branch database from scratch, without needing terminal/Prisma CLI access.
// ─────────────────────────────────────────────────────────────────────────────

export const SCHEMA_MIGRATIONS: { name: string; sql: string }[] = [
  {
    name: "init",
    sql: `
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Admin', 'Staff');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'Staff',
    "fullName" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donor" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "bloodType" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "deferralReason" TEXT,
    "deferredUntil" TIMESTAMP(3),

    CONSTRAINT "Donor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationHistory" (
    "id" SERIAL NOT NULL,
    "donorId" INTEGER NOT NULL,
    "patientName" TEXT NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "donationDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DonationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodRequest" (
    "id" SERIAL NOT NULL,
    "patientName" TEXT NOT NULL,
    "bloodGroup" TEXT NOT NULL,
    "requiredUnits" INTEGER NOT NULL,
    "requiredDate" TIMESTAMP(3) NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactNumber" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Pending',

    CONSTRAINT "BloodRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Donor_phone_key" ON "Donor"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Donor_email_key" ON "Donor"("email");

-- CreateIndex
CREATE INDEX "Donor_fullName_idx" ON "Donor"("fullName");

-- CreateIndex
CREATE INDEX "Donor_phone_idx" ON "Donor"("phone");

-- CreateIndex
CREATE INDEX "BloodRequest_status_requiredDate_idx" ON "BloodRequest"("status", "requiredDate");

-- AddForeignKey
ALTER TABLE "DonationHistory" ADD CONSTRAINT "DonationHistory_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
`,
  },
  {
    name: "donor_phone_array",
    sql: `
-- CreateTable
CREATE TABLE "DonorPhone" (
    "id" SERIAL NOT NULL,
    "donorId" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL,

    CONSTRAINT "DonorPhone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DonorPhone_number_idx" ON "DonorPhone"("number");

-- AddForeignKey
ALTER TABLE "DonorPhone" ADD CONSTRAINT "DonorPhone_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill existing phone values into the new DonorPhone table
INSERT INTO "DonorPhone" ("donorId", "number", "label", "isPrimary")
SELECT "id", "phone", 'Primary', true FROM "Donor"
WHERE "phone" IS NOT NULL AND "phone" != '';

-- DropIndex
DROP INDEX "Donor_phone_idx";

-- DropIndex
DROP INDEX "Donor_phone_key";

-- AlterTable
ALTER TABLE "Donor" DROP COLUMN "phone";
`,
  },
  {
    name: "add_donor_soft_delete",
    sql: `
-- AlterTable
ALTER TABLE "Donor" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Donor_isDeleted_idx" ON "Donor"("isDeleted");
`,
  },
  {
    name: "add_donor_status",
    sql: `
-- CreateEnum
CREATE TYPE "DonorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Donor" ADD COLUMN     "status" "DonorStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "Donor_status_idx" ON "Donor"("status");
`,
  },
  {
    name: "add_donor_notes",
    sql: `
-- AlterTable
ALTER TABLE "Donor" ADD COLUMN     "notes" TEXT;
`,
  },
  {
    name: "add_donor_createdAt",
    sql: `
-- AlterTable
ALTER TABLE "Donor" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
`,
  },
  {
    name: "update_user_model",
    sql: `
-- Step 1: Temporarily convert User.role to text
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT;

-- Step 2: Update existing values in User table
UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'Admin';
UPDATE "User" SET "role" = 'VOLUNTEER' WHERE "role" = 'Staff';

-- Step 3: Recreate Role enum
DROP TYPE "Role";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VOLUNTEER');

-- Step 4: Convert User.role back to Role enum with default
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VOLUNTEER'::"Role";

-- Step 5: Rename fullName to name and add createdAt
ALTER TABLE "User" RENAME COLUMN "fullName" TO "name";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
`,
  },
  {
    name: "add_user_permissions",
    sql: `
-- AlterTable
ALTER TABLE "User" ADD COLUMN "permissions" JSONB;

-- Backfill existing ADMIN users with all permissions set to true
UPDATE "User"
SET "permissions" = '{
  "donorView":      true,
  "donorAdd":       true,
  "donorEdit":      true,
  "donorDelete":    true,
  "approveReject":  true,
  "notesEdit":      true,
  "reportsExport":  true,
  "userManagement": true
}'::jsonb
WHERE "role" = 'ADMIN';

-- Backfill existing VOLUNTEER users with default volunteer permissions
UPDATE "User"
SET "permissions" = '{
  "donorView":      true,
  "donorAdd":       true,
  "donorEdit":      false,
  "donorDelete":    false,
  "approveReject":  false,
  "notesEdit":      false,
  "reportsExport":  false,
  "userManagement": false
}'::jsonb
WHERE "role" = 'VOLUNTEER';
`,
  },
  {
    name: "add_user_active_deleted",
    sql: `
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;
`,
  },
  {
    name: "remove_blood_request",
    sql: `
-- DropTable
DROP TABLE "BloodRequest";
`,
  },
];