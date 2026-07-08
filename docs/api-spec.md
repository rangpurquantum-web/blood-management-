# Document Metadata: API Specification (api-spec.md)

*   **Purpose:** Outlines the REST API schemas, request/response headers, body validation metrics, and response status codes.
*   **Information Contained:** Complete payload specifications for authentication, donor management, donation history, blood requests, spreadsheet imports, and administrative activity auditing.
*   **Recommended Headings:** `# Document Metadata`, `# API Route Specification`, `## 1. Request Headers & Global Policies`, `## 2. Authentication Route`, `## 3. Donor Management Routes`, `## 4. Donation History Routes`, `## 5. Blood Request Routes`, `## 6. Administrative Routes`.
*   **Dependencies:** [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) (defines parameters matching the system features).

---

# API Route Specification

This document defines the HTTP methods, URL pathways, query parameters, JSON request/response formats, and verification checks for the Internal Blood Management System's Next.js API Route Handlers.

---

## 1. Request Headers & Global Policies

All API endpoints (except public login) require the following request headers to verify authentication:

```text
Authorization: Bearer <session-jwt-token>
Content-Type: application/json
```

### Zod Validation Error Response
When a client sends a malformed body, the Route Handlers run Zod validation, returning a `400 Bad Request` with structured field errors:
```json
{
  "success": false,
  "error": "Validation failed",
  "issues": [
    {
      "field": "dob",
      "message": "Donor must be at least 18 years old"
    }
  ]
}
```

---

## 2. Authentication Route

### 2.1 POST `/api/auth/login`
*   **Access:** Unauthenticated (Open internally)
*   **Description:** Performs authentication validation and issues session tokens (managed under Auth.js).
*   **Request Schema:**
    ```json
    {
      "email": "staff.member@domain.org",
      "password": "securepassword"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 4,
        "fullName": "Jane Doe",
        "email": "staff.member@domain.org",
        "role": "Staff"
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Body missing `email` or `password`.
    *   `401 Unauthorized`: Invalid email or incorrect password.

---

## 3. Donor Management Routes

### 3.1 GET `/api/donors`
*   **Access:** Authenticated (Staff or Admin)
*   **Description:** Searches, filters, and paginates donor records (interfaced with TanStack Table).
*   **Query Parameters:**
    *   `q` (string, optional): Matches Donor Name or Phone Number.
    *   `bloodGroup` (string, optional): Matches blood group (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`).
    *   `eligible` (boolean, optional): Returns eligible (`true`) or deferred (`false`) donors.
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": 21,
        "fullName": "Marcus Brody",
        "dob": "1988-04-14T00:00:00.000Z",
        "gender": "Male",
        "bloodType": "A+",
        "phone": "+1555987654",
        "email": "marcus@domain.org",
        "isEligible": true,
        "deferredUntil": null
      }
    ]
    ```

### 3.2 POST `/api/donors`
*   **Access:** Authenticated (Staff or Admin)
*   **Description:** Registers a new donor in the database.
*   **Request Schema:**
    ```json
    {
      "fullName": "Sarah Connor",
      "dob": "1994-11-23T00:00:00.000Z",
      "gender": "Female",
      "bloodType": "O-",
      "phone": "+1555234567",
      "email": "sarah.connor@domain.org",
      "address": "742 Evergreen Terrace, Springfield"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "Donor registered successfully",
      "donorId": 142
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Zod validation errors (e.g. under 18 years old).
    *   `409 Conflict`: Phone number or Email matches an existing donor in the database.

---

## 4. Donation History Routes

### 4.1 GET `/api/donors/[id]/history`
*   **Access:** Authenticated (Staff or Admin)
*   **Description:** Retrieves all donation logs logged against a specific donor ID.
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": 14,
        "donorId": 21,
        "patientName": "Arthur Dent",
        "hospitalName": "St. Jude Hospital",
        "donationDate": "2026-04-10T09:00:00.000Z",
        "notes": "Regular volunteer"
      }
    ]
    ```
*   **Error Responses:**
    *   `404 Not Found`: Donor ID does not exist.

### 4.2 POST `/api/donors/[id]/history`
*   **Access:** Authenticated (Staff or Admin)
*   **Description:** Logs a donation history record and recalculates eligibility status.
*   **Request Schema (Validated by Zod):**
    ```json
    {
      "patientName": "Clark Kent",
      "hospitalName": "Metropolis General",
      "donationDate": "2026-06-28T08:00:00.000Z",
      "notes": "First donation of the year"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "Donation history recorded",
      "donationId": 98,
      "donorStatus": {
        "isEligible": false,
        "deferredUntil": "2026-08-23T08:00:00.000Z" // Exact donation date + 56 days
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Donor is currently deferred, or Zod validation checks failed.
    *   `404 Not Found`: Donor ID does not exist.

---

## 5. Blood Request Routes

### 5.1 GET `/api/requests`
*   **Access:** Authenticated (Staff or Admin)
*   **Description:** Retrieves list of blood requests.
*   **Query Parameters:**
    *   `status` (string, optional): Filter by status (`Pending`, `Fulfilled`, `Cancelled`).
    *   `bloodGroup` (string, optional): Filter by target group (`O-`, `A+`, etc.).
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": 3,
        "patientName": "Bruce Wayne",
        "bloodGroup": "O-",
        "requiredUnits": 3,
        "requiredDate": "2026-07-04T12:00:00.000Z",
        "contactPerson": "Alfred Pennyworth",
        "contactNumber": "+1555987654",
        "notes": "Emergency surgery support required",
        "status": "Pending"
      }
    ]
    ```

### 5.2 POST `/api/requests`
*   **Access:** Authenticated (Staff or Admin)
*   **Description:** Creates a new blood request.
*   **Request Schema (Validated by Zod):**
    ```json
    {
      "patientName": "Selina Kyle",
      "bloodGroup": "AB+",
      "requiredUnits": 1,
      "requiredDate": "2026-06-30T10:00:00.000Z",
      "contactPerson": "Alfred Pennyworth",
      "contactNumber": "+1555987654",
      "notes": "Standard preparation request"
    }
    ```
*   **Success Response (201 Created):**
    ```json
    {
      "success": true,
      "message": "Blood request logged",
      "requestId": 12
    }
    ```

### 5.3 PUT `/api/requests/[id]`
*   **Access:** Authenticated (Staff or Admin)
*   **Description:** Updates the status of an existing request.
*   **Request Schema (Validated by Zod):**
    ```json
    {
      "status": "Fulfilled" // Or "Cancelled", "Pending"
    }
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Request status updated",
      "requestId": 12,
      "newStatus": "Fulfilled"
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: Invalid status value.
    *   `404 Not Found`: Request ID does not exist.

---

## 6. Administrative Routes

### 6.1 POST `/api/donors/import`
*   **Access:** Authenticated Admin Only
*   **Description:** Imports donors from uploaded Excel/CSV files parsed by xlsx/papaparse.
*   **Request Schema:** JSON body containing parsed array of donor records.
    ```json
    [
      {
        "fullName": "Clara Oswald",
        "dob": "1992-06-11T00:00:00.000Z",
        "gender": "Female",
        "bloodType": "B-",
        "phone": "+1555098765",
        "email": "clara@domain.org",
        "address": "221B Baker St"
      }
    ]
    ```
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "importedCount": 1,
      "ignoredOrUpdatedCount": 0
    }
    ```
*   **Error Responses (400 Bad Request):**
    ```json
    {
      "success": false,
      "error": "Batch validation failed",
      "validationErrors": [
        { "row": 1, "column": "fullName", "message": "Name is required" }
      ]
    }
    ```

### 6.2 GET `/api/audit-logs`
*   **Access:** Authenticated Admin Only
*   **Description:** Retrieves administrative logs.
*   **Success Response (200 OK):**
    ```json
    [
      {
        "id": 412,
        "userId": 2,
        "userFullName": "Admin Supervisor",
        "action": "Donor Bulk Import",
        "details": "Imported 42 rows from spreadsheet",
        "timestamp": "2026-06-28T08:05:00.000Z"
      }
    ]
    ```
