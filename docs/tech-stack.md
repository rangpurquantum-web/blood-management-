# Document Metadata: Tech Stack Reference Guide (tech-stack.md)

*   **Purpose:** Outlines the technologies, runtimes, UI libraries, database clients, testing tools, and third-party packages configured in the codebase.
*   **Information Contained:** Specific language versions, library dependencies, styling setup parameters, database configurations, and test engines.
*   **Recommended Headings:** `# Document Metadata`, `# Tech Stack Reference Guide`, `## 1. Core Runtime & Language`, `## 2. Web Framework & Rendering Layer`, `## 3. UI Components & Layouts`, `## 4. State Management & Data Fetching`, `## 5. Forms & Input Validation`, `## 6. Storage, ORM & Caching Layers`, `## 7. Third-Party Utility Libraries`, `## 8. Development, Testing & Ops`.
*   **Dependencies:** None.

---

# Tech Stack Reference Guide

This document acts as the single source of truth for the platforms, frameworks, libraries, and tools utilized in the development and deployment of the Internal Blood Management System, updated for the **Multi-Branch Database Architecture (Update 1)**.

---

## 1. Core Runtime & Language

### 1.1 Node.js (v18+ LTS)
*   **Role:** Server runtime environment hosting the Next.js compilation, dev servers, and API runtime.

### 1.2 TypeScript (v5.0+)
*   **Role:** Strictly typed programming language transpiling to JavaScript for both server API endpoints and browser UI pages. Configured in strict mode.

---

## 2. Web Framework & Rendering Layer

### 2.1 Next.js (v15 App Router)
*   **Role:** React framework for client routing, server-rendered views, static layouts, middleware session validation, and backend route handlers.
*   **Dynamic Routing:** Next.js middleware decrypts connection credentials and dynamically resolves active branch routing.

### 2.2 React.js (v19)
*   **Role:** Core UI component render engine.

---

## 3. UI Components & Layouts

### 3.1 Styling: Tailwind CSS v4
*   **Role:** Utility-first CSS library. Configured using modern CSS-based imports and `@theme` declarations, supporting fluid OKLCH color palettes and system dark modes.

### 3.2 Typography
*   **Fonts:** Custom Bengali and English type rendering utilizing *Siam Rupali* and *Noto Sans Bengali* Google Fonts.

### 3.3 Component Library: shadcn/ui
*   **Role:** Accessible, customizable UI components built on Radix UI primitives.

### 3.4 Data Grids: TanStack Table (React Table)
*   **Role:** Headless grid engine providing sorting, pagination, and multi-field search filters for donor list records.

### 3.5 Data Visualizations: Recharts
*   **Role:** Analytics charts rendering active donor distributions and weekly/monthly donation timelines.

---

## 4. State Management & Data Fetching

### 4.1 Client-Side State: Zustand
*   **Role:** Lightweight state container sharing global client variables (such as active sidebar toggles or branch context selection status).

### 4.2 Data Fetching & Caching: TanStack Query (React Query)
*   **Role:** Coordinates local client caches with the Next.js API endpoints. Handles automated query invalidations upon mutation actions.

---

## 5. Forms & Input Validation

### 5.1 Form Controller: React Hook Form
*   **Role:** High-performance form state tracking.

### 5.2 Schema Validation: Zod
*   **Role:** Type-safe validation schemas. Defines structural validation rules (DOB checks $\ge 18$, standard email regex, phone formatting rules) enforced on both client forms and Route Handler endpoints.

---

## 6. Storage, ORM & Caching Layers

### 6.1 Database: PostgreSQL (v14+)
*   **Control Database:** Stores global branch records, encrypted credentials, user accounts, cross-branch permissions, and central audit trails.
*   **Branch Databases:** Individual PostgreSQL instances (one per branch). Uniquely houses donor records, logs, and audit trails.

### 6.2 ORM & Dynamic Connection: Prisma ORM (v5+)
*   **Prisma Client Registry:** Dynamically constructs and caches `PrismaClient` instances.
*   **LRU Cache Pool:** Keeps active client connections pooled using an LRU cache (capped at ~20 clients) to release idle database connections automatically, preventing connection exhaustion.
*   **Data Decryption:** Uses `crypto` (AES-256-GCM) to decrypt `Branch.dbUrlEncrypted` connection strings on the fly on the server.

---

## 7. Third-Party Utility Libraries

*   **Excel Operations:** `xlsx` (SheetJS) for parsing Excel file uploads and compiling reports.
*   **CSV Operations:** `papaparse` for processing stream-based CSV uploads and downloads.
*   **Authentication:** `Auth.js` (NextAuth v5) for credentials login, JWT cookies, and role-based route middleware protection.

---

## 8. Development, Testing & Ops

### 8.1 Testing Suites
*   **Unit Tests:** Jest & React Testing Library (RTL).
*   **End-to-End Tests:** Playwright for testing browser flows (intake, database isolation, PWA behaviors).

### 8.2 Deployment & Ops
*   **Containers:** Docker configurations.
*   **Migrations Runner:** Custom PowerShell and Shell scripts (`db:migrate:all`) that iterate over each active branch connection in the Control Database to apply schema migrations in batch transactions.
