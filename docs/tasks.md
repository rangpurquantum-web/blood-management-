# Document Metadata: Implementation Tasks & Sprint Checklists (tasks.md)

*   **Purpose:** Provides developers with sequential development checklists broken down by system module and milestone phase.
*   **Information Contained:** System configuration deliverables, validation schemas, frontend component tasks, and test automation tasks.
*   **Recommended Headings:** `# Document Metadata`, `# Implementation Sprint Checklists`, `## Phase 1: Environment & Database Foundations`, `## Phase 2: Authentication & RBAC Guard`, `## Phase 3: Shared UI Components (shadcn/ui)`, `## Phase 4: Donor Management Module`, `## Phase 5: Donation History & Eligibility Logs`, `## Phase 6: Blood Request Management`, `## Phase 7: Administrative Tools & Spreadsheet Operations`, `## Phase 8: Testing & Ops Deployment`.
*   **Dependencies:** [user-story.md](file:///d:/blood%20donetion%20softwere/docs/user-story.md) (breaks stories down into logical developer code tasks).

---

# Implementation Sprint Checklists

This checklist tracks development deliverables needed to build the Internal Blood Management System.

---

## Phase 1: Environment & Database Foundations
*   [ ] Configure local PostgreSQL instance.
*   [ ] Initialize Next.js project with App Router, TypeScript, and Tailwind CSS.
*   [ ] Install Prisma ORM. Define models (`User`, `Donor`, `DonationHistory`, `BloodRequest`, `AuditLog`) in the schema file.
*   [ ] Run initial migration scripts to create tables and seed admin credentials.
*   [ ] Create shared cached Prisma client in [lib/db.ts](file:///d:/blood%20donetion%20softwere/lib/db.ts).

---

## Phase 2: Authentication & RBAC Guard
*   [ ] Setup Auth.js (NextAuth) credential validation login flows.
*   [ ] Implement middleware route guards protecting `/donors`, `/requests`, and `/logs`.
*   [ ] Build user session stores using **Zustand**.
*   [ ] Verify role verification layers (`Staff` vs. `Admin`) on API Route Handlers.

---

## Phase 3: Shared UI Components (shadcn/ui)
*   [ ] Initialize **shadcn/ui** CLI configurations.
*   [ ] Install required shadcn base component UI primitives (Button, Input, Form, Toast, Select, Dialog).
*   [ ] Configure the global Next.js page layout shell.
*   [ ] Install and configure **TanStack Query** (React Query) wrapper providers.

---

## Phase 4: Donor Management Module
*   [ ] Write donor validation schemas using **Zod** (checking unique email, phone formats, age >= 18).
*   [ ] Build the donor registration form using **React Hook Form** and Zod validation schemas.
*   [ ] Implement `POST /api/donors` API Route Handlers.
*   [ ] Build the Donor Directory list using **TanStack Table** with pagination, sorting, and name filtering.
*   [ ] Develop the Donor Profile detail view displaying histories.

---

## Phase 5: Donation History & Eligibility Logs
*   [ ] Build the **Record Donation History** modal form (vitals are out of scope, fields: patient, hospital, date, notes).
*   [ ] Implement API Route Handler `POST /api/donors/[id]/history` to record histories.
*   [ ] Write database transaction logic to update the donor's `isEligible` to `false` and calculate the `deferredUntil` date (+56 days).
*   [ ] Configure TanStack Query invalidation to automatically refresh donor profile details upon successful registry.

---

## Phase 6: Blood Request Management
*   [ ] Build the **Create Blood Request** form using React Hook Form and Zod schemas.
*   [ ] Implement API Route Handler `POST /api/requests` with status set to `'Pending'` by default.
*   [ ] Create the requests tracking list grid using TanStack Table.
*   [ ] Add the status update toggle action (Pending ➡️ Fulfilled / Cancelled) with TanStack Query mutations.

---

## Phase 7: Administrative Tools & Spreadsheet Operations
*   [ ] Implement spreadsheet parsing utility hooks using **papaparse** (for CSVs) and **xlsx** (for Excel sheets).
*   [ ] Write validation checkers validating spreadsheet rows against Zod donor schemas.
*   [ ] Create route handler `POST /api/donors/import` to insert spreadsheet data.
*   [ ] Implement search query results downloader to export CSV spreadsheets.
*   [ ] Build the **Activity Audit Log** page grid (TanStack Table, restricted to admins).

---

## Phase 8: Testing & Ops Deployment
*   [ ] Configure **Jest** and **React Testing Library** for component unit checks.
*   [ ] Write **Playwright** integration scripts testing forms, imports, and request state changes.
*   [ ] Write a production-ready **Docker** configuration file.
*   [ ] Set up reverse proxies for target VPS deployment environments.
