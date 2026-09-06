# Implementation Plan: Update 1 — Multi-Branch Database Architecture

This plan implements the changes described in `update-1.md` as actual code changes.

---

## Summary of Changes

| # | Change | Files |
|---|--------|-------|
| 1 | Split `schema.prisma` → Control schema (keep current file, update models) | `prisma/schema.prisma` |
| 2 | New `prisma/branch.schema.prisma` — Branch DB schema (Donor, DonorPhone, DonationHistory, BloodRequest, AuditLog) | `prisma/branch.schema.prisma` [NEW] |
| 3 | AES-256-GCM encryption helper | `lib/crypto.ts` [NEW] |
| 4 | Dynamic Prisma connection registry with LRU cache | `lib/tenant-db.ts` [NEW] |
| 5 | Add 3 new permission keys + SUPER_ADMIN defaults to `permissions.ts` | `lib/permissions.ts` |
| 6 | Update `auth.config.ts` to include `branchId` in JWT/session | `auth.config.ts` |
| 7 | Update `types/next-auth.d.ts` to expose `branchId` on session | `types/next-auth.d.ts` |
| 8 | Update `auth.ts` to return `branchId` on login | `auth.ts` |
| 9 | Update `.env.example` → `CONTROL_DATABASE_URL` + `ENCRYPTION_KEY` | `.env.example` |
| 10 | Update `prisma/seed.ts` → seeds only the first SuperAdmin account | `prisma/seed.ts` |
| 11 | Add `db:migrate:all` script to `package.json` | `package.json` |
| 12 | New `scripts/migrate-all-branches.ts` — iterates Control DB branches and migrates each | `scripts/migrate-all-branches.ts` [NEW] |

---

## What Changes and Why

### Prisma Schemas
The current `schema.prisma` becomes the **Control DB schema**. We:
- Add `dbUrlEncrypted`, `dbStatus`, `PermissionGrant`, `AuditLogCentral` to it.
- Remove `donors` relation from `Branch` (donors no longer live in this DB).
- Remove `branchId` from `Donor` (removed from the main schema entirely).

A **new** `branch.schema.prisma` contains: `Donor`, `DonorPhone`, `DonationHistory`, `BloodRequest`, `AuditLog` — the same tables but without a `branchId` column on `Donor`.

### Crypto Helper (`lib/crypto.ts`)
AES-256-GCM encryption/decryption for `Branch.dbUrlEncrypted`. Uses `ENCRYPTION_KEY` env variable.

### Tenant DB (`lib/tenant-db.ts`)
An LRU cache (max 20 entries) that maps decrypted DB URLs → `PrismaClient` instances. Provides `getTenantPrisma(branchId)` which:
1. Looks up the branch in the Control DB.
2. Decrypts `dbUrlEncrypted`.
3. Returns the cached client or creates a new one.

### Permissions
Three new keys: `branchCreate`, `branchCredentialView`, `crossBranchGrant` — all `false` for ADMIN and VOLUNTEER, only `true` for SUPER_ADMIN.

### Auth & Session
`branchId` added to the JWT token and session so every request knows which branch DB to resolve without a Control DB lookup.

---

## Open Questions

> [!NOTE]
> The current single `prisma/schema.prisma` is used both for `prisma generate` and `prisma migrate`. After this change, the Control DB schema stays at `prisma/schema.prisma`. The Branch schema goes to `prisma/branch.schema.prisma` and is used **only** by the migration runner script — not by the app's Prisma client.

> [!IMPORTANT]
> **No existing app routes or feature code change in this PR.** The `lib/tenant-db.ts` helper is created so feature devs can import it for the next phase. Existing routes continue using the `prisma` singleton from `lib/db.ts` (Control DB) unchanged.

---

## Verification Plan

- `npm run typecheck` — TypeScript must compile cleanly.
- Manual: `node -e "require('./lib/crypto').encrypt('test')"` to verify crypto works.
