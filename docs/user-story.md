# Document Metadata: User Stories (user-story.md)

*   **Purpose:** Breaks functional requirements down into user-oriented narratives with strict Acceptance Criteria (AC).
*   **Information Contained:** Story definitions (As a..., I want to..., so that...), React Hook Form + Zod error validation criteria, TanStack Table sorting/filtering ACs, Excel/CSV upload checks.
*   **Recommended Headings:** `# Document Metadata`, `# MVP User Stories`, `## 1. Donor Management Stories`, `### US-1: Donor Registration Form`, `### US-2: Donor Directory Data Grid`, `### US-3: Eligibility Tracking`, `## 2. Donation & Request Stories`, `### US-4: Record Donation History`, `### US-5: Blood Request Management`, `## 3. Administration & Import/Export Stories`, `### US-6: Excel / CSV Data Operations`, `### US-7: System Activity Logs`.
*   **Dependencies:** [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) (translates feature specifications into stories).

---

# MVP User Stories

This document lists the user stories and acceptance criteria for the Internal Blood Management System. It specifies the requirements from the perspective of the organization's management team.

---

## 1. Donor Management Stories

### US-1: Donor Registration Form
**As a** Management Staff Member,  
**I want to** register new blood donors using a validated form,  
**so that** we enter correct donor details without typos or invalid records.

**Acceptance Criteria:**
*   [ ] The registration form is managed with **React Hook Form** and validated via **Zod**.
*   [ ] Real-time error messages are displayed below inputs when focus is lost if validation fails:
    *   *Full Name:* "Name must be at least 2 characters long."
    *   *DOB:* "Donor must be at least 18 years old."
    *   *Email:* "Invalid email address format."
    *   *Phone:* "Phone number format is incorrect."
*   [ ] Form submit button displays a loading spinner during API dispatch.
*   [ ] The system displays a success toast (from **shadcn/ui**) after successful registry.
*   [ ] Duplicate registrations (matching phone or email) block submission and display a conflict error message.

---

### US-2: Donor Directory Data Grid
**As a** Management Staff Member,  
**I want to** search and filter donors in an interactive grid,  
**so that** I can locate suitable donors by name, phone, or blood type.

**Acceptance Criteria:**
*   [ ] The directory grid is rendered using **TanStack Table**.
*   [ ] Staff can type in a search input to perform instant fuzzy filtering on donor names and phone numbers.
*   [ ] Staff can select a blood type dropdown to filter the table rows.
*   [ ] Clicking column headers (Name, DOB, Eligibility Status) sorts rows in ascending/descending order.
*   [ ] The grid displays paginated results (10 rows per page) with "Next" and "Previous" buttons.
*   [ ] Clicking a row opens the corresponding Donor Profile view.

---

### US-3: Eligibility Tracking
**As a** Management Staff Member,  
**I want the system to** calculate and display a donor's eligibility status,  
**so that** we know if they are eligible for donation requests.

**Acceptance Criteria:**
*   [ ] The system checks the database for the donor's last logged donation date.
*   [ ] If the last donation was less than 56 days ago, their profile status is marked "Deferred" with a count of remaining days.
*   [ ] Staff can input a manual deferral override (specifying a Zod-validated expiration date and reason).

---

## 2. Donation & Request Stories

### US-4: Record Donation History
**As a** Management Staff Member,  
**I want to** record a donor's historical donation event,  
**so that** their profile timeline is updated and their eligibility updates automatically.

**Acceptance Criteria:**
*   [ ] Staff can access the "Record Donation History" form modal from an eligible donor's profile.
*   [ ] Form inputs required: Patient Name, Hospital Name, Donation Date, and Notes.
*   [ ] Submitting the form writes a record to `DonationHistory` and sets the donor's `deferredUntil` date to exactly +56 days from the donation date.
*   [ ] TanStack Query invalidates the donor detail cache, triggering a background update to show their status as deferred.

---

### US-5: Blood Request Management
**As a** Management Staff Member,  
**I want to** log and coordinate incoming patient blood requests,  
**so that** we have a central listing of active patient needs.

**Acceptance Criteria:**
*   [ ] Staff can log a request with fields: Patient Name, Blood Group, Units, Required Date, Contact Person, Contact Number, Notes, and Status.
*   [ ] Standard status is set to "Pending".
*   [ ] Staff can update status ("Pending", "Fulfilled", "Cancelled") directly in the request row/detail modal.
*   [ ] Changing status invalidates the grid query cache (via TanStack Query), refreshing listings instantly.

---

## 3. Administration & Import/Export Stories

### US-6: Excel / CSV Data Operations
**As a** Management Admin,  
**I want to** batch-import donors and download data lists,  
**so that** we can handle large spreadsheet updates quickly.

**Acceptance Criteria:**
*   [ ] Admins can drag-and-drop a `.csv` or `.xlsx` spreadsheet into the upload field.
*   [ ] The system parses the file (using **papaparse** for CSV or **xlsx** for Excel).
*   [ ] The parser validates rows against the donor Zod schema and returns a list of row errors (e.g., "Row 15: Invalid Blood Group 'X+'") without modifying the DB.
*   [ ] If valid, records are bulk-saved in a single batch query, and an audit trail entry logs the imported count.
*   [ ] Admins can click "Export" to download filtered search grids as standard CSV files.

---

### US-7: System Activity Logs
**As a** Management Admin,  
**I want to** view a timeline of activity audit logs,  
**so that** we can track staff edits and exports for regulatory accountability.

**Acceptance Criteria:**
*   [ ] The logs viewer is restricted to the `Admin` role.
*   [ ] Displays timestamp, performer user ID, action category, and details (e.g., fields modified).
*   [ ] Uses pagination via TanStack Table to handle large logs tables.
