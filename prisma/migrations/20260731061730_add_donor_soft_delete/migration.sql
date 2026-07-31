-- AlterTable
ALTER TABLE "Donor" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Donor_isDeleted_idx" ON "Donor"("isDeleted");
