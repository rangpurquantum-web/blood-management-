# Document Metadata: Database Schema Specification (database.md)

*   **Purpose:** Outlines the relational database layouts, tables, schemas, indexes, and migrations for developer implementation.
*   **Information Contained:** Table descriptions, columns, data types, constraints (PK, FK, Unique), index choices for query optimization, and Prisma representations for both the Control Database and the individual Branch Databases.
*   **Recommended Headings:** `# Document Metadata`, `# Database Schema Specification`, `## 1. Multi-Branch Entity-Relationship Overview`, `## 2. Control Database Tables`, `### 2.1 SuperAdmin Table`, `### 2.2 Branch Table`, `### 2.3 User Table`, `### 2.4 PermissionGrant Table`, `### 2.5 AuditLogCentral Table`, `## 3. Branch Database Tables`, `### 3.1 Donor Table`, `### 3.2 DonorPhone Table`, `### 3.3 DonationHistory Table`, `### 3.4 BloodRequest Table`, `### 3.5 AuditLog Table`, `## 4. Indexes & Constraints`, `## 5. Prisma Schemas`.
*   **Dependencies:** [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md) (implements the high-level schema design defined in the scoping ERD).

---

# Database Schema Specification

This document details the database schema configurations, constraints, and index optimizations for the Internal Blood Management System, updated for the **Multi-Branch Database Architecture (Update 1)**.

---

## 1. Multi-Branch Entity-Relationship Overview

The system architecture utilizes a split-database layout to support scaling on free-tier limits:
1.  **Control Database (Single Shared DB):** Maintains system user credentials, branch configuration details, cross-branch access grants, and global administrator logs.
2.  **Branch Databases (One DB Per Branch):** Replicates the donor, donation history, and blood request tables across independent PostgreSQL projects.

---

## 2. Control Database Tables

### 2.1 SuperAdmin Table
Stores credentials for root system administrators.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `name` | String | Not Null | Administrator name |
| `email` | String | Unique, Not Null | Admin email address |
| `passwordHash` | String | Not Null | Hashed credentials |
| `createdAt` | DateTime | Default: `now()` | Registration timestamp |

### 2.2 Branch Table
Stores metadata and credentials for system branch databases.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `name` | String | Unique, Not Null | Branch name |
| `location` | String | Nullable | Physical location description |
| `dbUrlEncrypted` | String | Not Null | AES-256 encrypted PostgreSQL URL |
| `dbStatus` | String | Default: `'connected'` | `'connected'`, `'unreachable'`, or `'migrating'` |
| `isActive` | Boolean | Default: `true` | Enable/disable flag |
| `createdAt` | DateTime | Default: `now()` | Registration timestamp |

### 2.3 User Table
Stores organizational user accounts.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `name` | String | Not Null | Display name |
| `email` | String | Unique, Not Null | Login email address |
| `passwordHash` | String | Not Null | Hashed credentials |
| `role` | String | Default: `'VOLUNTEER'` | `'SUPER_ADMIN'`, `'ADMIN'`, or `'VOLUNTEER'` |
| `permissions` | Json | Nullable | Custom user-specific overrides |
| `branchId` | Int | FK ➡️ `Branch.id`, Set Null | Default assigned branch |
| `isActive` | Boolean | Default: `true` | Account active state |
| `isDeleted` | Boolean | Default: `false` | Soft delete flag |
| `createdAt` | DateTime | Default: `now()` | Creation timestamp |

### 2.4 PermissionGrant Table
Maps cross-branch visibility permissions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `userId` | Int | FK ➡️ `User.id`, Cascade | Associated user account |
| `branchId` | Int | FK ➡️ `Branch.id`, Cascade | Authorized target branch |
| `accessLevel` | String | Not Null | `'READ'`, `'WRITE'`, etc. |
| `grantedAt` | DateTime | Default: `now()` | Grant timestamp |
| `grantedByAdminId`| Int | FK ➡️ `User.id`, Set Null | Admin who granted access |

### 2.5 AuditLogCentral Table
Tracks system-wide administrative changes.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `actorId` | Int | FK ➡️ `User.id`, Set Null | Performer of action |
| `action` | String | Not Null | Action description (e.g., `'Branch Create'`) |
| `targetBranchId` | Int | FK ➡️ `Branch.id`, Set Null | Target branch of action |
| `timestamp` | DateTime | Default: `now()` | Log timestamp |

---

## 3. Branch Database Tables

Each branch database houses identical tables containing local records only.

### 3.1 Donor Table
Maintains records and eligibility details for blood donors.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `fullName` | String | Not Null | Donor name |
| `dob` | DateTime | Nullable | Date of birth |
| `gender` | String | Not Null | Gender |
| `bloodType` | String | Not Null | Blood type |
| `email` | String | Unique, Not Null | Contact email address |
| `address` | String | Not Null | Home address |
| `isEligible` | Boolean | Default: `true` | Current eligibility status |
| `deferralReason` | String | Nullable | Reason for deferral |
| `deferredUntil` | DateTime | Nullable | Deferral end date |
| `status` | String | Default: `'APPROVED'` | `'PENDING'`, `'APPROVED'`, `'REJECTED'` |
| `isDeleted` | Boolean | Default: `false` | Soft delete flag |
| `createdAt` | DateTime | Default: `now()` | Profile creation date |
| `notes` | String | Nullable | Health notes |

### 3.2 DonorPhone Table
One-to-many phone listings for donors.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `donorId` | Int | FK ➡️ `Donor.id`, Cascade | Associated donor profile |
| `number` | String | Not Null | Phone number |
| `label` | String | Not Null | Label (e.g. `'Mobile'`) |
| `isPrimary` | Boolean | Default: `false` | Primary contact flag |

### 3.3 DonationHistory Table
Records past donation events.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `donorId` | Int | FK ➡️ `Donor.id`, Cascade | Associated donor |
| `patientName` | String | Not Null | Recipient patient |
| `hospitalName` | String | Not Null | Hospital location |
| `donationDate` | DateTime | Not Null | Date of donation |
| `notes` | String | Nullable | Additional notes |

### 3.4 BloodRequest Table
Logs local blood request coordination.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `patientName` | String | Not Null | Recipient patient |
| `bloodGroup` | String | Not Null | Blood type required |
| `requiredUnits` | Int | Not Null | Quantity required |
| `requiredDate` | DateTime | Not Null | Target fulfillment date |
| `contactPerson` | String | Not Null | Representative name |
| `contactNumber` | String | Not Null | Representative phone number |
| `notes` | String | Nullable | Coordination remarks |
| `status` | String | Default: `'Pending'` | `'Pending'`, `'Fulfilled'`, `'Cancelled'` |

### 3.5 AuditLog Table
Logs activities performed within the branch database context.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | Int | PK, Auto-increment | Unique identifier |
| `userId` | Int | Nullable | Operator user ID (Control DB sync) |
| `action` | String | Not Null | Action performed |
| `details` | String | Not Null | Modification details |
| `timestamp` | DateTime | Default: `now()` | Log timestamp |

---

## 4. Indexes & Constraints

### Control Database Indexes:
*   Index on `User(branchId)` to optimize branch routing queries.
*   Unique index on `User(email)` and `Branch(name)`.

### Branch Database Indexes:
*   Index on `Donor(fullName)` for text searches.
*   Index on `DonorPhone(number)` to speed up donor lookups.
*   Index on `BloodRequest(status, requiredDate)` to fetch urgent orders.

---

## 5. Prisma Schemas

### 5.1 Control DB Schema (`control-schema.prisma`)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("CONTROL_DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  SUPER_ADMIN
  ADMIN
  VOLUNTEER
}

model Branch {
  id              Int               @id @default(autoincrement())
  name            String            @unique
  location        String?
  dbUrlEncrypted  String
  dbStatus        String            @default("connected")
  isActive        Boolean           @default(true)
  createdAt       DateTime          @default(now())
  users           User[]
  permissionGrants PermissionGrant[]
  auditLogs       AuditLogCentral[]
}

model User {
  id               Int               @id @default(autoincrement())
  name             String
  email            String            @unique
  passwordHash     String
  role             Role              @default(VOLUNTEER)
  permissions      Json?
  branchId         Int?
  branch           Branch?           @relation(fields: [branchId], references: [id], onDelete: SetNull)
  isActive         Boolean           @default(true)
  isDeleted        Boolean           @default(false)
  createdAt        DateTime          @default(now())
  permissionGrants PermissionGrant[] @relation("UserGrants")
  grantedGrants    PermissionGrant[] @relation("GrantedBy")
  actorLogs        AuditLogCentral[]

  @@index([branchId])
}

model PermissionGrant {
  id               Int      @id @default(autoincrement())
  userId           Int
  user             User     @relation("UserGrants", fields: [userId], references: [id], onDelete: Cascade)
  branchId         Int
  branch           Branch   @relation(fields: [branchId], references: [id], onDelete: Cascade)
  accessLevel      String
  grantedAt        DateTime @default(now())
  grantedByAdminId Int?
  grantedByAdmin   User?    @relation("GrantedBy", fields: [grantedByAdminId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([branchId])
}

model AuditLogCentral {
  id             Int      @id @default(autoincrement())
  actorId        Int?
  actor          User?    @relation(fields: [actorId], references: [id], onDelete: SetNull)
  action         String
  targetBranchId Int?
  targetBranch   Branch?  @relation(fields: [targetBranchId], references: [id], onDelete: SetNull)
  timestamp      DateTime @default(now())
}
```

### 5.2 Branch DB Schema (`branch-schema.prisma`)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL") // Set dynamically at runtime by server resolver
}

generator client {
  provider = "prisma-client-js"
}

enum DonorStatus {
  PENDING
  APPROVED
  REJECTED
}

model Donor {
  id             Int               @id @default(autoincrement())
  fullName       String
  dob            DateTime?
  gender         String
  bloodType      String
  phone          DonorPhone[]
  email          String            @unique
  address        String
  isEligible     Boolean           @default(true)
  deferralReason String?
  deferredUntil  DateTime?
  status         DonorStatus       @default(APPROVED)
  isDeleted      Boolean           @default(false)
  createdAt      DateTime          @default(now())
  notes          String?
  donations      DonationHistory[]

  @@index([fullName])
  @@index([isDeleted])
  @@index([status])
}

model DonorPhone {
  id        Int     @id @default(autoincrement())
  donorId   Int
  donor     Donor   @relation(fields: [donorId], references: [id], onDelete: Cascade)
  number    String
  label     String
  isPrimary Boolean

  @@index([number])
}

model DonationHistory {
  id           Int      @id @default(autoincrement())
  donorId      Int
  donor        Donor    @relation(fields: [donorId], references: [id], onDelete: Cascade)
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

  @@index([status, requiredDate])
}

model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int?
  action    String
  details   String
  timestamp DateTime @default(now())
}
```
