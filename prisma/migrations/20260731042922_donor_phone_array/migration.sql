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
