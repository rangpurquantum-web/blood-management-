# Update 1: Multi-Branch Database Architecture

## Goal
Convert the Quantum Blood Donor Pool from a single shared database into a **database-per-branch** architecture. Each branch gets its own independent PostgreSQL database (its own free-tier project), so branches don't compete for the same storage/row limit. A small central "Control" database holds only account/branch metadata — never donor data.

## Why
The current single-DB design shares one free-tier storage limit across all branches. Splitting each branch into its own database lets every branch use its own free limit independently.

---

## 1. Two Databases Instead of One

**Control Database** (one, small, never grows large):
- `SuperAdmin` — id, name, email (unique), passwordHash, createdAt
- `Branch` — id, name (unique), location, `dbUrlEncrypted`, `dbStatus` (`connected` | `unreachable` | `migrating`), isActive, createdAt
- `User` — id, name, email (unique), passwordHash, role, permissions (json), branchId (FK → Branch), isActive, isDeleted, createdAt
- `PermissionGrant` — id, userId (FK → User), branchId (FK → Branch), accessLevel, grantedAt, grantedByAdminId
- `AuditLogCentral` — id, actorId, action, targetBranchId, timestamp

**Branch Database** (one per branch, same schema replicated):
- `Donor` — same fields as before, **minus `branchId`** (no longer needed — the whole DB is the branch)
- `DonorPhone`
- `DonationHistory`
- `BloodRequest`
- `AuditLog`

Remove `branchId` from `Donor` and drop the old shared `Branch` table from the main schema — `Branch` now lives only in the Control DB.

---

## 2. Encrypted Connection Strings

- `Branch.dbUrlEncrypted` stores the branch's Postgres URL, AES-256 encrypted at rest.
- Never send the decrypted URL to the client except through an explicit "reveal" action gated by the `branchCredentialView` permission (Super Admin only), and log that reveal to `AuditLogCentral`.

---

## 3. Dynamic Prisma Connection Layer

Prisma normally uses one static `DATABASE_URL`. Add a small connection registry:

1. On each authenticated request, resolve the user's `branchId` from their session (Control DB).
2. Look up and decrypt that branch's `dbUrlEncrypted`.
3. Get-or-create a `PrismaClient` for that URL from an LRU cache (cap ~20 clients) so idle connections get released instead of exhausting each free-tier provider's connection limit.
4. Never combine two branch connections in a single query. A user with a `PermissionGrant` for another branch switches context explicitly (branch switcher in the sidebar) — one active branch connection at a time.

---

## 4. Branch Creation Flow

New Super-Admin-only screen: **Create Branch**

1. Enter branch name + location.
2. Enter database connection URL for that branch.
3. Test the connection. If it fails, block creation and show the error.
4. If it succeeds: encrypt and store the URL in `Branch.dbUrlEncrypted`, run the branch schema migration against it, set `dbStatus = connected`.
5. Only once a branch is `connected` can `User` accounts be created with that `branchId`.

Add `npm run db:migrate:all` — iterates every `Branch` in the Control DB and runs the standard branch-schema migration against each one's connection URL. Skip (don't fail) branches marked `unreachable`, and retry them on the next run.

---

## 5. Permissions

Add three new permission keys, Super Admin only by default:
- `branchCreate` — create a branch + provision its database
- `branchCredentialView` — reveal a branch's decrypted DB URL
- `crossBranchGrant` — grant another user visibility into a different branch via `PermissionGrant`

Isolation rule: a user with no `PermissionGrant` row for a branch must never be able to obtain a connection to that branch's database — enforce this at the connection-resolution step (§3), not just in queries or the UI.

---

## 6. Everything Else Stays the Same

No behavior change to:
- Donor registration/validation rules (18+, blood type enum, unique email/phone — now unique *within* a branch DB, not globally)
- 56-day wait rule / eligibility calculation
- Blood request workflow states
- CSV/XLSX bulk import + row validation flow

These just now run against whichever branch database is currently resolved for the request instead of a shared table filtered by `branchId`.

---

## 7. Env / Setup Changes

- `.env` should define `CONTROL_DATABASE_URL` only (the small control DB). Branch databases are **not** set via `.env` — they're added later through the Super Admin UI and stored encrypted in the Control DB.
- Update seed script to create the first `SuperAdmin` account only (no branches, no donors — those come from the app after setup).

---

## Reference

Full architecture writeup with ER diagrams and flowcharts: see `quantum-blood-donor-pool-spec-v2.md` (previous file) for the complete schema and diagrams this update is based on.
