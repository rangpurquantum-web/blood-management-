# Document Metadata: User Stories (user-story.md)

*   **Purpose:** Breaks functional requirements down into user-oriented narratives with strict Acceptance Criteria (AC).
*   **Information Contained:** Story definitions (As a..., I want to..., so that...), React Hook Form + Zod error validation criteria, TanStack Table sorting/filtering ACs, Excel/CSV upload checks, and multi-branch database configuration actions.
*   **Recommended Headings:** `# Document Metadata`, `# MVP User Stories`, `## 1. Donor Management Stories`, `### US-1: Donor Registration Form`, `### US-2: Donor Directory Data Grid`, `### US-3: Eligibility Tracking`, `## 2. Donation & Request Stories`, `### US-4: Record Donation History`, `### US-5: Blood Request Management`, `## 3. Administration & Import/Export Stories`, `### US-6: Excel / CSV Data Operations`, `### US-7: System Activity Logs`, `## 4. Multi-Branch & Super Admin Stories`, `### US-8: Create & Configure Branch Database`, `### US-9: Cross-Branch Access Granting`, `### US-10: Branch Database Credential Reveal`.
*   **Dependencies:** [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) (translates feature specifications into stories).

---

# MVP User Stories

This document lists the user stories and acceptance criteria for the Internal Blood Management System, incorporating the **Multi-Branch Database Architecture (Update 1)**.

---

## 1. Donor Management Stories

### US-1: Donor Registration Form
**As a** Volunteer or Admin,  
**I want to** register new blood donors using a validated form,  
**so that** we enter correct donor details without typos or invalid records.

**Acceptance Criteria:**
*   [ ] The registration form is managed with **React Hook Form** and validated via **Zod**.
*   [ ] Real-time error messages are displayed below inputs:
    *   *Full Name:* "Name must be at least 2 characters long."
    *   *DOB:* "Donor must be at least 18 years old."
    *   *Email:* "Invalid email address format."
*   [ ] Phone numbers can be dynamically added as a list (DonorPhone) with custom labels and a required primary selection.
*   [ ] Form submit button displays a loading spinner during API dispatch.
*   [ ] The system displays a success toast after successful registry.
*   [ ] Duplicate registrations (matching phone or email) block submission and display a conflict error message *within the active branch database*.

---

### US-2: Donor Directory Data Grid
**As a** Volunteer or Admin,  
**I want to** search and filter donors in an interactive grid,  
**so that** I can locate suitable donors by name, phone, or blood type.

**Acceptance Criteria:**
*   [ ] The directory grid is rendered using **TanStack Table**.
*   [ ] Users can type in a search input to perform instant filtering on donor names and phone numbers.
*   [ ] Users can filter rows by blood type.
*   [ ] Clicking column headers sorts rows in ascending/descending order.
*   [ ] The grid displays paginated results (10 rows per page).
*   [ ] Clicking a row opens the corresponding Donor Profile view.

---

### US-3: Eligibility Tracking
**As a** Volunteer or Admin,  
**I want the system to** calculate and display a donor's eligibility status,  
**so that** we know if they are eligible for donation requests.

**Acceptance Criteria:**
*   [ ] The system checks the database for the donor's last logged donation date.
*   [ ] If the last donation was less than 56 days ago, their profile status is marked "Deferred" with a count of remaining days.
*   [ ] Admins can input a manual deferral override (specifying a Zod-validated expiration date and reason).

---

## 2. Donation & Request Stories

### US-4: Record Donation History
**As a** Volunteer or Admin,  
**I want to** record a donor's historical donation event,  
**so that** their profile timeline is updated and their eligibility updates automatically.

**Acceptance Criteria:**
*   [ ] Users can access the "Record Donation History" form modal from an eligible donor's profile.
*   [ ] Form inputs required: Patient Name, Hospital Name, Donation Date, and Notes.
*   [ ] Submitting the form writes a record to `DonationHistory` and sets the donor's `deferredUntil` date to exactly +56 days from the donation date.
*   [ ] TanStack Query invalidates the donor detail cache, triggering a background update to show their status as deferred.

---

### US-5: Blood Request Management
**As a** Volunteer or Admin,  
**I want to** log and coordinate incoming patient blood requests,  
**so that** we have a central listing of active patient needs.

**Acceptance Criteria:**
*   [ ] Users can log a request with fields: Patient Name, Blood Group, Units, Required Date, Contact Person, Contact Number, Notes, and Status.
*   [ ] Standard status is set to "Pending".
*   [ ] Users can update status ("Pending", "Fulfilled", "Cancelled") directly in the request row/detail modal.
*   [ ] Changing status invalidates the grid query cache (via TanStack Query), refreshing listings instantly.

---

## 3. Administration & Import/Export Stories

### US-6: Excel / CSV Data Operations
**As a** Admin,  
**I want to** batch-import donors and download data lists,  
**so that** we can handle large spreadsheet updates quickly.

**Acceptance Criteria:**
*   [ ] Admins can drag-and-drop a `.csv` or `.xlsx` spreadsheet into the upload field.
*   [ ] The system parses the file (using **papaparse** for CSV or **xlsx** for Excel).
*   [ ] The parser validates rows against the donor Zod schema and returns a list of row errors (e.g., "Row 15: Invalid Blood Group 'X+'") without modifying the DB.
*   [ ] If valid, records are bulk-saved in a single batch query, and an audit trail entry logs the imported count in the branch audit log.
*   [ ] Admins can click "Export" to download filtered search grids as standard CSV files.

---

### US-7: System Activity Logs
**As a** Admin,  
**I want to** view a timeline of activity audit logs,  
**so that** we can track staff edits and exports for regulatory accountability.

**Acceptance Criteria:**
*   [ ] The logs viewer is restricted to the `Admin` and `SuperAdmin` roles.
*   [ ] Displays timestamp, performer user ID, action category, and details (e.g., fields modified).
*   [ ] Uses pagination via TanStack Table to handle large logs tables.

---

## 4. Multi-Branch & Super Admin Stories

### US-8: Create & Configure Branch Database
**As a** Super Admin,  
**I want to** create a new branch profile and configure its PostgreSQL database URL,  
**so that** the new branch has isolated storage ready for user logins.

**Acceptance Criteria:**
*   [ ] Super Admin accesses the "Create Branch" form from the dashboard.
*   [ ] Form inputs required: Branch Name, Location, PostgreSQL Connection URL.
*   [ ] The backend tests the connection. If the connection fails, displays the error and blocks registration.
*   [ ] If successful, the system:
    *   Encrypts the database URL string via AES-256-GCM.
    *   Saves the branch record to the Control DB as `connected`.
    *   Executes database migration scripts (`prisma db push` or migrations runner) against the decrypted URL to configure the database schema.

---

### US-9: Cross-Branch Access Granting
**As a** Super Admin,  
**I want to** grant selected user profiles access to switch to other branch databases,  
**so that** central managers can support multiple branch databases.

**Acceptance Criteria:**
*   [ ] Super Admin can assign a new `PermissionGrant` record mapping a `User.id` to a target `Branch.id` with an access level tag.
*   [ ] The next time the user logs in, they see a branch switcher dropdown in the sidebar.
*   [ ] Selecting a branch dynamically swaps the active database context, loading only that branch's donor records and logs.

---

### US-10: Branch Database Credential Reveal
**As a** Super Admin,  
**I want to** securely reveal a branch's decrypted PostgreSQL connection string in the interface,  
**so that** I can debug configuration issues.

**Acceptance Criteria:**
*   [ ] The Super Admin clicks "Reveal Connection String" and passes a credential check.
*   [ ] The decrypted database URL is shown on-screen.
*   [ ] The action writes an immutable record to the `AuditLogCentral` table in the Control Database containing the actor ID, target branch ID, and timestamp.
