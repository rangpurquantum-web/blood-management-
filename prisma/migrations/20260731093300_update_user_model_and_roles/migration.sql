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
