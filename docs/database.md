# Document Metadata: Database Schema Specification (database.md)

*   **Purpose:** Outlines the relational database layout, tables, schemas, indexes, and migrations for developer implementation.
*   **Information Contained:** Table descriptions, columns, data types, constraints (PK, FK, Unique), index choices for query optimization, and Prisma representation structure.
*   **Recommended Headings:** `# Document Metadata`, `# Database Schema Specification`, `## 1. Entity-Relationship Overview`, `## 2. Table Specifications`, `### 2.1 User Table`, `### 2.2 Donor Table`, `### 2.3 DonationHistory Table`, `### 2.4 BloodRequest Table`, `### 2.5 AuditLog Table`, `## 3. Indexes & Constraints`, `## 4. Prisma Schema Design`.
*   **Dependencies:** [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md) (implements the high-level schema design defined in the scoping ERD).

---

# Database Schema Specification

This document details the database schema configuration and constraints for the Internal Blood Management System.

---

## 1. Entity-Relationship Overview

The database uses five core relational tables optimized for fast query retrieval and strict data integrity. Physical inventory, blood bag tracking, and location tables are excluded.

---

## 2. Table Specifications

### 2.1 User Table
Stores administrative credentials and roles for internal management staff.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `email` | String | Unique, Not Null | Admin/Staff login address |
| `passwordHash` | String | Not Null | Hashed credentials |
| `role` | Enum / String | Not Null | `'Admin'` or `'Staff'` roles |
| `fullName` | String | Not Null | Display name |

### 2.2 Donor Table
Maintains records and eligibility status for blood donors.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `fullName` | String | Not Null | Donor's full name |
| `dob` | Date | Not Null | Date of birth (Min age: 18) |
| `gender` | String | Not Null | Gender identity |
| `bloodType` | Enum / String | Not Null | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-` |
| `phone` | String | Unique, Not Null | Contact phone number |
| `email` | String | Unique, Not Null | Contact email address |
| `address` | String | Not Null | Physical mailing address |
| `isEligible` | Boolean | Default: `true` | Calculated field |
| `deferralReason` | String | Nullable | Medical/travel deferral details |
| `deferredUntil` | DateTime | Nullable | End date of temporary deferrals |

### 2.3 DonationHistory Table
Records past donation events manually entered by staff.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `donorId` | Int | FK ➡️ `Donor.id`, Cascade | Associated donor |
| `patientName` | String | Not Null | Recipient patient |
| `hospitalName` | String | Not Null | Donation location |
| `donationDate` | DateTime | Not Null | Date/time of donation |
| `notes` | String | Nullable | Health/administrative remarks |

### 2.4 BloodRequest Table
Logs coordinate records for blood requests.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `patientName` | String | Not Null | Patient needing blood |
| `bloodGroup` | String | Not Null | Target blood type required |
| `requiredUnits` | Int | Not Null | Quantity required |
| `requiredDate` | DateTime | Not Null | Target date for request fulfillment |
| `contactPerson` | String | Not Null | Name of representative |
| `contactNumber` | String | Not Null | Representative phone number |
| `notes` | String | Nullable | Coordination remarks |
| `status` | String | Default: `'Pending'` | `'Pending'`, `'Fulfilled'`, `'Cancelled'` |

### 2.5 AuditLog Table
Immutable trail of data modifications.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `userId` | Int | FK ➡️ `User.id`, Set Null | Creator of the log action |
| `action` | String | Not Null | Description of action (e.g., `'Donor Import'`) |
| `details` | String | Not Null | Detailed diff, row size, or specific field changes |
| `timestamp` | DateTime | Default: `now()` | Action timestamp |

---

## 3. Indexes & Constraints

*   **Primary Key Indexes:** Created automatically on `id` fields.
*   **Search Optimization Indexes (PostgreSQL):**
    *   Index on `Donor(fullName)` for case-insensitive lookup.
    *   Index on `Donor(phone)` for quick search query responses.
    *   Index on `BloodRequest(status, requiredDate)` to fetch pending orders.
*   **Referential Integrity Constraints:**
    *   If a `User` is deleted, related `AuditLog` rows set their `userId` to `Null` to preserve history records.
    *   If a `Donor` is deleted, their associated `DonationHistory` records are cascade deleted.

---

## 4. Prisma Schema Design

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  Admin
  Staff
}

model User {
  id           Int        @id @default(autoincrement())
  email        String     @unique
  passwordHash String
  role         Role       @default(Staff)
  fullName     String
  auditLogs    AuditLog[]
}

model Donor {
  id             Int               @id @default(autoincrement())
  fullName       String
  dob            DateTime
  gender         String
  bloodType      String
  phone          String            @unique
  email          String            @unique
  address        String
  isEligible     Boolean           @default(true)
  deferralReason String?
  deferredUntil  DateTime?
  donations      DonationHistory[]
}

model DonationHistory {
  id           Int      @id @default(autoincrement())
  donorId      Int
  donor        Donor    @relation(fields: [donorId], onDelete: Cascade)
  patientName  String
  hospitalName String
  donationDate DateTime
  notes        String?
}

model BloodRequest {
  id            Int      @id @default(autoincrement())
  patientName   String
  bloodGroup    String
  requiredUnits Int
  requiredDate  DateTime
  contactPerson String
  contactNumber String
  notes         String?
  status        String   @default("Pending")
}

model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int?
  user      User?    @relation(fields: [userId], onDelete: SetNull)
  action    String
  details   String
  timestamp DateTime @default(now())
}
```
