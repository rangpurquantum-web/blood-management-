# Document Metadata: Tech Stack Reference Guide (tech-stack.md)

*   **Purpose:** Outlines the technologies, runtimes, UI libraries, database clients, testing tools, and third-party packages configured in the codebase.
*   **Information Contained:** Specific language versions, library dependencies, styling setup parameters, database configurations, and test engines.
*   **Recommended Headings:** `# Document Metadata`, `# Tech Stack Reference Guide`, `## 1. Core Runtime & Language`, `## 2. Web Framework & Rendering Layer`, `## 3. UI Components & Layouts`, `## 4. State Management & Data Fetching`, `## 5. Forms & Input Validation`, `## 6. Storage, ORM & Caching Layers`, `## 7. Third-Party Utility Libraries`, `## 8. Development, Testing & Ops`.
*   **Dependencies:** None.

---

# Tech Stack Reference Guide

This document acts as the single source of truth for the platforms, frameworks, libraries, and tools utilized in the development and deployment of the Internal Blood Management System.

---

## 1. Core Runtime & Language

### 1.1 Node.js (v18+ LTS)
*   **Role:** Server runtime environment hosting the Next.js compilation, dev servers, and API runtime.

### 1.2 TypeScript (v5.0+)
*   **Role:** Strictly typed programming language transpiling to Javascript for both server API endpoints and browser UI pages. Configured in strict mode.

---

## 2. Web Framework & Rendering Layer

### 2.1 Next.js (v14+ App Router)
*   **Role:** Unified React framework for client routing, server-rendered views, static layouts, middleware session validation, and backend route handlers.
*   **Backend Services:** Next.js Route Handlers serve as the sole REST API layer. No secondary backends (such as FastAPI or Python) are used.

### 2.2 React.js (v18+)
*   **Role:** Core UI component render engine.

---

## 3. UI Components & Layouts

### 3.1 Styling: Tailwind CSS
*   **Role:** Utility-first CSS library for styling responsive layouts.

### 3.2 Component Library: shadcn/ui
*   **Role:** Accessible, customizable UI components built on top of Radix UI primitives and styled with Tailwind CSS.

### 3.3 Data Grids: TanStack Table (React Table)
*   **Role:** Headless grid engine providing pagination, column sorting, and custom search filters for donor directories and request tables.

### 3.4 Data Visualizations: Recharts
*   **Role:** Composited charting library for dashboard reports (renders registered donor distributions and request statuses).

---

## 4. State Management & Data Fetching

### 4.1 Client-Side State: Zustand
*   **Role:** Lightweight, centralized state container for sharing global variables (such as UI sidebar states or search configurations).

### 4.2 Data Fetching & Caching: TanStack Query (React Query)
*   **Role:** Synchronizes client-side UI grids with backend Route Handler endpoints. Handles caching, background refetching, and mutations.

---

## 5. Forms & Input Validation

### 5.1 Form Controller: React Hook Form
*   **Role:** Performance-optimized form state tracker. Minimizes component re-renders during text input.

### 5.2 Schema Validation: Zod
*   **Role:** Type-safe schema validator. Defines shape structures and rules (e.g. minimum donor age of 18, email formats) enforced on both frontend forms and backend API routes.

---

## 6. Storage, ORM & Caching Layers

### 6.1 Database: PostgreSQL (v14+)
*   **Role:** Relational SQL database engine storing user records, donor profiles, histories, and audit records.

### 6.2 ORM: Prisma ORM (v5+)
*   **Role:** Type-safe Object-Relational Mapper (ORM) used to model data, handle database migrations, and perform database queries.

### 6.3 Cache Store: Redis (Optional, Phase 2 only)
*   **Role:** In-memory key-value cache layer used for query optimization in later dev phases.

---

## 7. Third-Party Utility Libraries

*   **Excel Operations:** `xlsx` (SheetJS) for parsing Excel file uploads and compiling reports.
*   **CSV Operations:** `papaparse` for processing stream-based CSV uploads and downloads.
*   **Authentication:** `Auth.js` (NextAuth) for credential-based logins, JWT cookies, and role-based route middleware protection.

---

## 8. Development, Testing & Ops

### 8.1 Testing Suites
*   **Unit Tests:** Jest & React Testing Library (RTL).
*   **End-to-End Tests:** Playwright for testing browser flows (intake, request life cycles).

### 8.2 Deployment & Ops
*   **Containers:** Docker configuration files.
*   **Hosting:** VPS hosting using reverse proxies.
