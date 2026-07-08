# Document Metadata: Feature Requirements (feature.md)

*   **Purpose:** Outlines the core functional requirements, validation constraints, and non-functional compliance standards for the software.
*   **Information Contained:** Specific validation rules (Zod constraints), field requirements, bulk data parsing tools (papaparse/xlsx), role-based privilege mappings, and dashboard layout features.
*   **Recommended Headings:** `# Document Metadata`, `# Functional & Non-Functional Features`, `## 1. Functional Features`, `### 1.1 Authentication & Role-Based Access Control`, `### 1.2 Dashboard & Visual Analytics`, `### 1.3 Donor Registry & Search Grid`, `### 1.4 Donor Eligibility Verification`, `### 1.5 Donation History Logs`, `### 1.6 Blood Request Coordination`, `### 1.7 Bulk Excel & CSV Integrations`, `### 1.8 Administrative Audit Trails`, `## 2. Non-Functional Features`.
*   **Dependencies:** [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md) (relies on its database models and scoping).

---

# Functional & Non-Functional Features

This document outlines the core functional requirements and non-functional compliance standards for the Internal Blood Management System.

---

## 1. Functional Features

### 1.1 Authentication & Role-Based Access Control
Limits system access to authorized members of the organization's management team using **Auth.js**.
*   **Credential Verification:** Staff log in with secure email and password credentials.
*   **Role Assignment:** Users have one of two roles:
    *   `Staff`: Permissions to search donors, enter donation history, and log blood requests.
    *   `Admin`: Full permissions, including bulk imports/exports, record deletions, and audit log access.

### 1.2 Dashboard & Visual Analytics
Renders key operational metrics client-side using **Recharts**.
*   **Analytics Visualizations:**
    *   Bar charts showing active donor distribution by blood type.
    *   Line charts tracing donation history counts over weekly/monthly intervals.
    *   Pie charts representing the proportions of "Pending" vs. "Fulfilled" blood requests.
*   **Quick Metrics:** Total registered donors count, active request counts, and recent system actions.

### 1.3 Donor Registry & Search Grid
Maintains detailed donor profiles, rendered in data grids powered by **TanStack Table**.
*   **Donor Registration Form:** Managed via **React Hook Form** and validated client-side and server-side using **Zod**. Required fields:
    *   Full Name (min 2 characters)
    *   Date of Birth (Zod age validation: must be >= 18 years old)
    *   Gender (select dropdown)
    *   Blood Type (dropdown: A+, A-, B+, B-, AB+, AB-, O+, O-)
    *   Phone Number (unique, standard format)
    *   Email Address (unique, valid email format)
    *   Address (string)
*   **Directory Grid:** Offers sorting, pagination, and multi-field text search (matches name or phone number) via TanStack Table APIs.

### 1.4 Donor Eligibility Verification
Calculates and updates donor eligibility status dynamically.
*   **Eligibility Rules:**
    *   **56-Day Wait Time:** System checks the database for the donor's last donation date. If less than 56 days (8 weeks) have passed, `isEligible` is set to `false`, and `deferredUntil` is populated.
    *   **Manual Deferrals:** Admins can manually defer a donor by inputting a reason (e.g. temporary travel/health issues) and selecting a deferral expiration date.

### 1.5 Donation History Logs
Maintains timeline logs of past donor donations without physical stock inventory representations.
*   **Donation Entry Form:** Fields:
    *   Donor (referenced relation)
    *   Patient Name (recipient)
    *   Hospital Name (where donation occurred)
    *   Donation Date (DateTime picker)
    *   Notes (string, nullable)
*   **Sync Logic:** Saving a donation history record immediately updates the donor's eligibility status (marking them deferred for 56 days).

### 1.6 Blood Request Coordination
Enables tracking of coordinates for pending patient needs.
*   **Request Entry Form:** Form inputs:
    *   Patient Name
    *   Blood Group Required (A+, A-, etc.)
    *   Required Units (integer, min 1)
    *   Required Date (target date)
    *   Contact Person
    *   Contact Number
    *   Notes (nullable)
    *   Status (Select: `Pending` | `Fulfilled` | `Cancelled`, defaults to `Pending`)
*   **Search & Filters:** TanStack Table displaying active requests sorted by the required date.

### 1.7 Bulk Excel & CSV Integrations
Supports bulk uploading and compiling reports.
*   **Spreadsheet Parsing (papaparse & xlsx):**
    *   Admins can drop `.csv` files (parsed client-side by papaparse) or `.xlsx` files (parsed by xlsx) to register donors in bulk.
    *   Validates rows against the Donor Zod schema, reporting failures row-by-row before performing database inserts.
*   **Export:** Allows download of filtered donor searches or blood requests list tables as CSV files.

### 1.8 Administrative Audit Trails
Ensures comprehensive system accountability.
*   **Immutable Logging:**
    *   Automatically logs a record to the `AuditLog` table whenever a donor profile is added/modified, a donation history is logged, a request is updated, or a bulk spreadsheet action is performed.
    *   Fields captured: User ID, Action description, Details, and Timestamp.

---

## 2. Non-Functional Features

### 2.1 Security & Compliance
*   **Role Route Guards:** Frontend route handlers and API endpoints verify the `Auth.js` token session and check role privileges.
*   **Validation Constraints:** Input parsing is wrapped with Zod schemas to protect against SQL injections and malformed payloads.

### 2.2 Performance
*   **TanStack Query Caching:** Fetches from Next.js API endpoints are cached by TanStack Query.
*   **Optimized Queries:** Indexed search fields (donor phone/name) yield query response times under 150ms.
