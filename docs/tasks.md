# Document Metadata: Implementation Checklists (tasks.md)

*   **Purpose:** Outlines developer implementation steps, sprint checklists, and validation phases.
*   **Information Contained:** Database setup checklists, backend integration modules, security checkpoints, and verification instructions.
*   **Recommended Headings:** `# Document Metadata`, `# Developer Implementation Checklist`, `## Phase 1: Control Database & Security Setup`, `## Phase 2: Dynamic Connection Router & Caching`, `## 3. Phase 3: Super Admin Branch Provisioning Panel`, `## Phase 4: Cross-Branch Permission Grants & UI`, `## Phase 5: Verification & System Audit`.
*   **Dependencies:** [user-story.md](file:///d:/blood%20donetion%20softwere/docs/user-story.md) (translates user stories into actionable sprint tickets).

---

# Developer Implementation Checklist

This checklist tracks developer tasks for implementing the **Multi-Branch Database Architecture (Update 1)**.

---

## Phase 1: Control Database & Security Setup

Initialize system configurations and secure properties:
*   [ ] **Create Control DB Schema:** Write `control.schema` in `prisma/` containing `SuperAdmin`, `Branch`, `User`, `PermissionGrant`, and `AuditLogCentral` tables.
*   [ ] **Generate Types:** Configure schema generator hooks for Control DB Prisma client compilation.
*   [ ] **Setup Encryption Helper:** Create `lib/crypto.ts` with AES-256-GCM encryption/decryption utilities.
*   [ ] **Configure Environment Variables:** Add `CONTROL_DATABASE_URL` and `ENCRYPTION_KEY` checks.
*   [ ] **Write Database Migrations Runner:** Create a script (`npm run db:migrate:all`) that:
    *   Iterates through all branches in the Control DB.
    *   Decrypts target connection URLs.
    *   Runs migrations schema against each reachable instance.

---

## Phase 2: Dynamic Connection Router & Caching

Implement the routing layer to handle database context switches:
*   [ ] **Create LRU Client Cache:** Write `lib/tenant-db.ts` to manage active Prisma clients.
*   [ ] **Define Context Resolver Middleware:**
    *   Extract active session token cookies.
    *   Map default `branchId` or override target context ID.
    *   Verify access permissions against the `PermissionGrant` table.
*   [ ] **Configure Context Switcher Cookie Handler:** Route dynamic path queries through context selectors.

---

## Phase 3: Super Admin Branch Provisioning Panel

Develop tools for database provisioning:
*   [ ] **Build Create Branch Form:**
    *   Create input form fields in `/dashboard/branches`.
    *   Configure test connection button hooks.
*   [ ] **Implement Connection Validator API:**
    *   Validate PostgreSQL strings.
    *   Run schema pushes upon successful connections.
    *   Save branch profile status as `connected` in Control DB.
*   [ ] **Create Credential Inspection Tool:**
    *   Build secure credential inspection views with authorization checks.
    *   Log inspections to the centralized audit trail.

---

## Phase 4: Cross-Branch Permission Grants & UI

Develop user access controls:
*   [ ] **Implement Grants Form API:**
    *   Build CRUD forms to map user permissions to branch profiles.
*   [ ] **Build Sidebar Branch Switcher:**
    *   Add conditional dropdown controls for users with active permission grants.
    *   Hook dropdown selections to trigger query cache invalidations.

---

## Phase 5: Verification & System Audit

Validate security and routing isolation:
*   [ ] **Run Database Isolation Tests:** Verify connection blocks when resolving unauthorized branch IDs.
*   [ ] **Run Performance Benchmarks:** Check database query response times.
*   [ ] **Review Centralized Audit Trail Logs:** Confirm logs match branch creations and credential reveals.
