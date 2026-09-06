# Document Metadata: API Routes Spec (api-spec.md)

*   **Purpose:** Outlines Next.js API endpoints, request/response headers, body inputs, schema checks, and response status codes.
*   **Information Contained:** REST Endpoint routes, payload specifications (Zod check keys), role access checks, and database resolution schemes.
*   **Recommended Headings:** `# Document Metadata`, `# API Specifications & Endpoint Schema Map`, `## 1. Authentication & Session Resolution`, `## 2. Central Control Routes`, `### 2.1 Branch Management`, `### 2.2 Dynamic Access Grants`, `## 3. Dynamic Branch-Specific Routes`, `### 3.1 Donor Directory API`, `### 3.2 Donation History Logging API`, `### 3.3 Blood Requests API`, `### 3.4 Import & Audit Logging APIs`.
*   **Dependencies:** [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) (implements routes for defined operational features).

---

# API Specifications & Endpoint Schema Map

This document describes the REST API specifications for the Internal Blood Management System, updated for the **Multi-Branch Database Architecture (Update 1)**.

---

## 1. Authentication & Session Resolution

All backend REST operations are gated by JWT session cookies signed by **Auth.js**:
*   **Active Tenant Determination:** For each request, the backend reads the caller's session. It resolves the user's `branchId` (or overrides it using context switcher cookies if a `PermissionGrant` exists) to establish the targeted branch context.
*   **Prisma Client Lifecycle:** The resolved branch context fetches the encrypted URL from the Control Database, decrypts it, and returns the appropriate client instance.

---

## 2. Central Control Routes

These API endpoints run exclusively against the single **Control Database**.

### 2.1 Branch Management

#### POST `/api/branches`
Creates and provisions a new branch database instance.
*   **Access:** Gated to roles: `SUPER_ADMIN` with permission `branchCreate`.
*   **Request Body (JSON):**
    ```json
    {
      "name": "Rangpur Branch",
      "location": "Rangpur City Center",
      "dbUrl": "postgresql://user:pass@host:5432/dbname?sslmode=require"
    }
    ```
*   **Response (Success - 201 Created):**
    ```json
    {
      "success": true,
      "branchId": 5,
      "status": "connected"
    }
    ```
*   **Errors:** `400 Bad Request` (Failed connection test or invalid parameters), `403 Forbidden` (Insufficient role privileges).

#### POST `/api/branches/[id]/reveal`
Inspects the decrypted connection string for a branch.
*   **Access:** Gated to roles: `SUPER_ADMIN` with permission `branchCredentialView`.
*   **Response (Success - 200 OK):**
    ```json
    {
      "branchId": 5,
      "decryptedDbUrl": "postgresql://user:pass@host:5432/dbname?sslmode=require"
    }
    ```
*   **Side-Effect:** Appends an immutable log to `AuditLogCentral`.

---

### 2.2 Dynamic Access Grants

#### POST `/api/grants`
Authorizes cross-branch access contexts for staff.
*   **Access:** Gated to roles: `SUPER_ADMIN` with permission `crossBranchGrant`.
*   **Request Body (JSON):**
    ```json
    {
      "userId": 12,
      "branchId": 3,
      "accessLevel": "READ"
    }
    ```
*   **Response (Success - 200 OK):**
    ```json
    {
      "success": true,
      "grantId": 45
    }
    ```

---

## 3. Dynamic Branch-Specific Routes

These endpoints dynamically resolve their database connection based on the caller's target branch context.

### 3.1 Donor Directory API

#### GET `/api/donors`
Retrieves a paginated list of donors in the active branch database.
*   **Query Parameters:**
    *   `search` (string) - Filters `fullName` and phone numbers.
    *   `bloodType` (string) - Filters by blood group.
    *   `page` (int) - Default: `1`.
*   **Response (200 OK):**
    ```json
    {
      "donors": [
        {
          "id": 14,
          "fullName": "Karim Rahman",
          "bloodType": "A+",
          "isEligible": true,
          "deferredUntil": null,
          "status": "APPROVED",
          "phones": [
            { "number": "01712345678", "label": "Mobile", "isPrimary": true }
          ]
        }
      ],
      "totalPages": 3
    }
    ```

#### POST `/api/donors`
Registers a new individual donor profile.
*   **Request Body (JSON validated via Zod):**
    ```json
    {
      "fullName": "Karim Rahman",
      "dob": "1995-04-12T00:00:00.000Z",
      "gender": "Male",
      "bloodType": "A+",
      "email": "karim@example.com",
      "address": "Sadar, Rangpur",
      "phones": [
        { "number": "01712345678", "label": "Mobile", "isPrimary": true }
      ]
    }
    ```
*   **Response (Success - 201 Created):**
    ```json
    { "success": true, "donorId": 14 }
    ```

---

### 3.2 Donation History Logging API

#### POST `/api/donations`
Logs a historical donation occurrence.
*   **Request Body (JSON):**
    ```json
    {
      "donorId": 14,
      "patientName": "Anowar Hossein",
      "hospitalName": "Rangpur Medical College",
      "donationDate": "2026-08-01T10:00:00.000Z",
      "notes": "Emergency blood replenishment"
    }
    ```
*   **System Action:** Resolves the dynamic connection, logs the history, updates the donor's `deferredUntil` (+56 days), and invalidates query caches.
*   **Response (200 OK):**
    ```json
    { "success": true, "historyId": 89, "deferredUntil": "2026-09-26T10:00:00.000Z" }
    ```

---

### 3.3 Blood Requests API

#### POST `/api/requests`
Registers a local blood request requirement.
*   **Request Body (JSON):**
    ```json
    {
      "patientName": "Amina Begum",
      "bloodGroup": "O-",
      "requiredUnits": 2,
      "requiredDate": "2026-08-20T00:00:00.000Z",
      "contactPerson": "Rafiq Begum",
      "contactNumber": "01812345678",
      "notes": "Operation scheduled for morning"
    }
    ```
*   **Response (210 Created):**
    ```json
    { "success": true, "requestId": 12 }
    ```

#### PATCH `/api/requests/[id]`
Modifies request completion status.
*   **Request Body (JSON):**
    ```json
    {
      "status": "Fulfilled" // "Pending" | "Fulfilled" | "Cancelled"
    }
    ```
*   **Response (200 OK):**
    ```json
    { "success": true, "status": "Fulfilled" }
    ```

---

### 3.4 Import & Audit Logging APIs

#### POST `/api/donors/import`
Parses and batch-inserts validated donor lists.
*   **Request Body (JSON):** Array of donor structures.
*   **System Action:** Executes all inserts inside a single database transaction. Logs imported counts.
*   **Response (200 OK):**
    ```json
    { "success": true, "importedCount": 47 }
    ```
*   **Validation Error (422 Unprocessable Entity):** Returns row-by-row Zod issues.

#### GET `/api/audit-logs`
Retrieves a local audit history list from the active branch.
*   **Response (200 OK):** Array of local action timestamps and user actions.
