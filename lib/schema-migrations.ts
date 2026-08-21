// ─────────────────────────────────────────────────────────────────────────────
// Combined branch DB schema migrations, in order.
// Each migration is a list of individual SQL statements — required because
// Prisma's $executeRawUnsafe cannot run multiple semicolon-separated
// statements in a single prepared-statement call (especially over pgbouncer).
// ─────────────────────────────────────────────────────────────────────────────

export const SCHEMA_MIGRATIONS: { name: string; statements: string[] }[] = [
  {
    name: "init",
    statements: [
      `CREATE TYPE "Role" AS ENUM ('Admin', 'Staff')`,
      `CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'Staff',
    "fullName" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
)`,
      `CREATE TABLE "Donor" (
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
)`,
      `CREATE TABLE "DonationHistory" (
    "id" SERIAL NOT NULL,
    "donorId" INTEGER NOT NULL,
    "patientName" TEXT NOT NULL,
    "hospitalName" TEXT NOT NULL,
    "donationDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DonationHistory_pkey" PRIMARY KEY ("id")
)`,
      `CREATE TABLE "BloodRequest" (
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
)`,
      `CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
)`,
      `CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`,
      `CREATE UNIQUE INDEX "Donor_phone_key" ON "Donor"("phone")`,
      `CREATE UNIQUE INDEX "Donor_email_key" ON "Donor"("email")`,
      `CREATE INDEX "Donor_fullName_idx" ON "Donor"("fullName")`,
      `CREATE INDEX "Donor_phone_idx" ON "Donor"("phone")`,
      `CREATE INDEX "BloodRequest_status_requiredDate_idx" ON "BloodRequest"("status", "requiredDate")`,
      `ALTER TABLE "DonationHistory" ADD CONSTRAINT "DonationHistory_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE`,
    ],
  },
  {
    name: "donor_phone_array",
    statements: [
      `CREATE TABLE "DonorPhone" (
    "id" SERIAL NOT NULL,
    "donorId" INTEGER NOT NULL,
    "number" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL,

    CONSTRAINT "DonorPhone_pkey" PRIMARY KEY ("id")
)`,
      `CREATE INDEX "DonorPhone_number_idx" ON "DonorPhone"("number")`,
      `ALTER TABLE "DonorPhone" ADD CONSTRAINT "DonorPhone_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "Donor"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
      `INSERT INTO "DonorPhone" ("donorId", "number", "label", "isPrimary")
SELECT "id", "phone", 'Primary', true FROM "Donor"
WHERE "phone" IS NOT NULL AND "phone" != ''`,
      `DROP INDEX "Donor_phone_idx"`,
      `DROP INDEX "Donor_phone_key"`,
      `ALTER TABLE "Donor" DROP COLUMN "phone"`,
    ],
  },
  {
    name: "add_donor_soft_delete",
    statements: [
      `ALTER TABLE "Donor" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false`,
      `CREATE INDEX "Donor_isDeleted_idx" ON "Donor"("isDeleted")`,
    ],
  },
  {
    name: "add_donor_status",
    statements: [
      `CREATE TYPE "DonorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED')`,
      `ALTER TABLE "Donor" ADD COLUMN     "status" "DonorStatus" NOT NULL DEFAULT 'APPROVED'`,
      `CREATE INDEX "Donor_status_idx" ON "Donor"("status")`,
    ],
  },
  {
    name: "add_donor_notes",
    statements: [`ALTER TABLE "Donor" ADD COLUMN     "notes" TEXT`],
  },
  {
    name: "add_donor_createdAt",
    statements: [
      `ALTER TABLE "Donor" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ],
  },
  {
    name: "update_user_model",
    statements: [
      `ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT`,
      `ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT`,
      `UPDATE "User" SET "role" = 'ADMIN' WHERE "role" = 'Admin'`,
      `UPDATE "User" SET "role" = 'VOLUNTEER' WHERE "role" = 'Staff'`,
      `DROP TYPE "Role"`,
      `CREATE TYPE "Role" AS ENUM ('ADMIN', 'VOLUNTEER')`,
      `ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::"Role")`,
      `ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VOLUNTEER'::"Role"`,
      `ALTER TABLE "User" RENAME COLUMN "fullName" TO "name"`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    ],
  },
  {
    name: "add_user_permissions",
    statements: [
      `ALTER TABLE "User" ADD COLUMN "permissions" JSONB`,
      `UPDATE "User"
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
WHERE "role" = 'ADMIN'`,
      `UPDATE "User"
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
WHERE "role" = 'VOLUNTEER'`,
    ],
  },
  {
    name: "add_user_active_deleted",
    statements: [
      `ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false`,
    ],
  },
  {
    name: "remove_blood_request",
    statements: [`DROP TABLE "BloodRequest"`],
  },
  {
    name: "add_donor_public_token",
    statements: [
      `ALTER TABLE "Donor" ADD COLUMN "publicToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text`,
      `CREATE UNIQUE INDEX "Donor_publicToken_key" ON "Donor"("publicToken")`,
      `CREATE INDEX "Donor_publicToken_idx" ON "Donor"("publicToken")`,
    ],
  },
  {
    name: "make_donation_history_patient_hospital_optional",
    statements: [
      `ALTER TABLE "DonationHistory" ALTER COLUMN "patientName" DROP NOT NULL`,
      `ALTER TABLE "DonationHistory" ALTER COLUMN "hospitalName" DROP NOT NULL`,
    ],
  },
];