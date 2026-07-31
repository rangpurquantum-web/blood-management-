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
