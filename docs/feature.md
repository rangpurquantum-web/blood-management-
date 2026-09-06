# Document Metadata: Feature Requirements (feature.md)

*   **Purpose:** Outlines the core functional requirements, validation constraints, and non-functional compliance standards for the software.
*   **Information Contained:** Specific validation rules (Zod constraints), field requirements, bulk data parsing tools (papaparse/xlsx), role-based privilege mappings, dashboard layout features, and database-per-branch provisioning tools.
*   **Recommended Headings:** `# Document Metadata`, `# Functional & Non-Functional Features`, `## 1. Functional Features`, `### 1.1 Authentication & Role-Based Access Control`, `### 1.2 Multi-Branch Management & Provisioning`, `### 1.3 Dashboard & Visual Analytics`, `### 1.4 Donor Registry & Search Grid`, `### 1.5 Donor Eligibility Verification`, `### 1.6 Donation History Logs`, `### 1.7 Blood Request Coordination`, `### 1.8 Bulk Excel & CSV Integrations`, `### 1.9 Administrative Audit Trails`, `## 2. Non-Functional Features`.
*   **Dependencies:** [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md) (relies on its database models and scoping).

---

# Functional & Non-Functional Features

This document outlines the core functional requirements and non-functional compliance standards for the Internal Blood Management System, updated for the **Multi-Branch Database Architecture (Update 1)**.

---

## 1. Functional Features

### 1.1 Authentication & Role-Based Access Control
Limits system access to authorized members of the organization using **Auth.js** and user credentials.
*   **Role Hierarchy:**
    *   `Volunteer`: Entry-level access. Can search donors, register profiles, and input donation logs within their assigned branch.
    *   `Admin`: Assigned to branch managers. Full management of users and donor records inside their branch, exports data, and reviews audit logs.
    *   `SuperAdmin`: System-wide administrator. Provision branches, configure databases, decrypt credentials, manage cross-branch grants.

### 1.2 Multi-Branch Management & Provisioning
Enables system scaling by isolating branch storage instances:
*   **Create Branch Screen:** (SuperAdmin only)
    *   Input: Branch Name, Location, and PostgreSQL connection URL.
    *   Validation: Tests the connection before writing to the database. If it fails, blocks creation.
    *   Execution: Decrypts and encrypts connection string via AES-256-GCM, runs branch database migration schema against it, registers the branch state as `connected` in the Control DB.
*   **Credential Reveal Security:** (SuperAdmin only)
    *   Decrypted database URLs are hidden at rest. A SuperAdmin can perform an explicit "reveal" action to inspect a connection string. This action is logged to `AuditLogCentral` for compliance.
*   **Cross-Branch Context Switching:**
    *   Users with standard access are locked into their default branch. Users with a record in the `PermissionGrant` table see a branch switcher dropdown in the sidebar to dynamically swap database contexts.

### 1.3 Dashboard & Visual Analytics
Renders key metrics client-side using **Recharts**, dynamically loaded from the active branch database:
*   **Analytics Visualizations:**
    *   Bar charts showing active donor distribution by blood type.
    *   Line charts tracing donation history counts over weekly/monthly intervals.
    *   Pie charts representing the proportions of "Pending" vs. "Fulfilled" blood requests.
*   **Quick Metrics:** Total registered donors, eligible donor counts, and recent local actions.

### 1.4 Donor Registry & Search Grid
Maintains detailed donor profiles, rendered in data grids powered by **TanStack Table** within the active branch DB.
*   **Registration Form Validation:** Managed via **React Hook Form** and validated client and server-side using **Zod**:
    *   *Full Name:* Required (min 2 characters).
    *   *Date of Birth:* Must represent an age $\ge 18$ years.
    *   *Gender:* Select dropdown (Male, Female, Other).
    *   *Blood Type:* Select dropdown (A+, A-, B+, B-, AB+, AB-, O+, O-).
    *   *Phone Number(s):* Multi-entry support (DonorPhone table). Custom labels (Mobile, Home) and a required `isPrimary` flag. Must be unique within the branch database.
    *   *Email Address:* Unique format, must be unique within the branch database.
    *   *Address:* Required string.
*   **Directory Grid:** Sorts, paginates, and searches (matches name or phone numbers) within the active branch database.

### 1.5 Donor Eligibility Verification
Calculates and updates donor eligibility status dynamically based on branch records.
*   **Eligibility Rules:**
    *   **56-Day Wait Time:** System checks for the donor's last donation date. If less than 56 days have passed, `isEligible` is set to `false`, and `deferredUntil` is calculated.
    *   **Manual Deferrals:** Admins can manually defer a donor by inputting a reason and choosing a deferral expiration date.

### 1.6 Donation History Logs
Logs donor donations within the active branch database:
*   **Donation Entry Form:** Fields: Donor, Patient Name (recipient), Hospital Name, Donation Date (DateTime picker), Notes.
*   **Sync Logic:** Saving a donation record automatically updates the donor's eligibility status (deferred for 56 days) within the branch database transactions.

### 1.7 Blood Request Coordination
Tracks urgent patient needs at the branch level:
*   **Request Entry Form:** Form inputs: Patient Name, Blood Group, Required Units (integer $\ge 1$), Required Date, Contact Person, Contact Number, Notes, and Status (Select: `Pending` | `Fulfilled` | `Cancelled`).
*   **Grids:** Active requests sorted by required date, updating local caches upon modifications.

### 1.8 Bulk Excel & CSV Integrations
Supports spreadsheet processing:
*   **Spreadsheet Parsing:**
    *   Admins drag-and-drop `.csv` or `.xlsx` files to register donors in bulk.
    *   Validates rows against the Donor Zod schema, reporting row failures before writing to the database.
*   **Export:** Allows downloading filtered donor searches or blood requests list tables as CSV files.

### 1.9 Administrative Audit Trails
*   **Central Audit Log:** Logs admin actions (branch creations, credentials reveals, cross-branch grant modifications) in the `AuditLogCentral` table of the Control Database.
*   **Branch Audit Log:** Automatically writes an entry to the local branch database `AuditLog` whenever donor data, donation logs, or requests are created or updated.

---

## 2. Non-Functional Features

### 2.1 Security & Compliance
*   **Dynamic Database Isolation:** A user session cannot resolve or load the database connection for a branch unless they have permissions (via `user.branchId` or `PermissionGrant`).
*   **AES Encryption:** Database connection URLs are encrypted at rest using AES-256-GCM.

### 2.2 Performance
*   **Connection Caching:** Dynamically resolved Prisma client instances are kept in an LRU connection cache to prevent PostgreSQL connection limit errors.
*   **Indexed Search Queries:** Lookups on search terms (donor phone/name) yield response times under 150ms.
