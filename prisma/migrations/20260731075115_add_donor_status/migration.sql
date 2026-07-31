-- CreateEnum
CREATE TYPE "DonorStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Donor" ADD COLUMN     "status" "DonorStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE INDEX "Donor_status_idx" ON "Donor"("status");
