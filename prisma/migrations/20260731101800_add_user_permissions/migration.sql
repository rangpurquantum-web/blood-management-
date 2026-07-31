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
