# Document Metadata: Architectural Decision Records (decisions.md)

*   **Purpose:** Logs structural design choices, scoping constraints, architectural directions, and technical trade-offs agreed on by product owners and architects.
*   **Information Contained:** Architecture Decision Records (ADRs) detailing constraints, contexts, decisions made, and post-implementation consequences.
*   **Recommended Headings:** `# Document Metadata`, `# Architectural Decision Records (ADRs)`, `## ADR-001: Complete Exclusion of Physical Inventory Tracking`, `## ADR-002: Restricted Access Bounds (Internal Management Only)`, `## ADR-003: Unified Next.js API Routes (No Python/FastAPI)`, `## ADR-004: shadcn/ui & TanStack Table for Client Interfaces`, `## ADR-005: Zustand for Client State Management`, `## ADR-006: React Hook Form & Zod for Validation`, `## ADR-007: Playwright for Integration Testing`.
*   **Dependencies:** None (provides historical context for decisions made).

---

# Architectural Decision Records (ADRs)

This document serves as an audit trail of design choices, scope definitions, and technical decisions made for the Internal Blood Management System.

---

## ADR-001: Complete Exclusion of Physical Inventory Tracking

### Status
**Accepted**

### Context
Initial designs included complex features for blood bag locations, volume tracking, storage temperatures, shelf-life alerts, and hospital dispatches. However, physical blood bag logistics increase security risks and demand strict regulatory compliance.

### Decision
To keep the application highly focused and minimize security overhead, we decided to completely exclude physical inventory, storage locations, bag IDs, and disposal workflows. The application functions purely as a metadata management database tracking donor records, donation event history log entries, and blood request coordination details.

---

## ADR-002: Restricted Access Bounds (Internal Management Only)

### Status
**Accepted**

### Context
Allowing public access, donor logins, and clinic/hospital user request submissions exposes sensitive medical history details and PII, necessitating complex security compliance.

### Decision
The system is scoped as a closed, internal administrative portal. Only authorized management team members can log in. All database records (including external requests and donation occurrences) are entered manually by this internal team.

---

## ADR-003: Unified Next.js API Routes (No Python/FastAPI)

### Status
**Accepted**

### Context
Using a separate backend engine (like FastAPI or Flask with Python) requires orchestrating multiple repositories, handling cross-origin resource sharing (CORS) credentials, managing double deployments, and replicating type definitions.

### Decision
We decided to use Next.js API Route Handlers for the backend REST layer. This ensures a single codebase, unified TS types across frontend/backend, and single-container deployments. No Python or FastAPI backend configurations are allowed.

---

## ADR-004: shadcn/ui & TanStack Table for Client Interfaces

### Status
**Accepted**

### Context
Building administrative grids with custom column sorting, pagination, and multi-field filtering from scratch is labor-intensive and error-prone.

### Decision
We selected **shadcn/ui** for core UI widgets and **TanStack Table** for data directory grids. TanStack Table provides headless sorting, pagination, and search APIs, while shadcn/ui components styling is unified with Tailwind CSS.

---

## ADR-005: Zustand for Client State Management

### Status
**Accepted**

### Context
Redux or complex state managers introduce verbose boilerplates. React Context, while built-in, causes unnecessary re-renders of nested trees for unrelated state updates.

### Decision
We selected **Zustand** as the primary client-side state container. It is fast, lightweight, uses simple hook bindings, and supports decoupled updates.

---

## ADR-006: React Hook Form & Zod for Validation

### Status
**Accepted**

### Context
Manual form handling leads to performance lags in React. Sharing field validation rules between client forms and server API routes is difficult without a common schema library.

### Decision
We chose **React Hook Form** to manage form fields, integrated with **Zod** schema schemas for verification. Zod schemas validate parameters on the frontend before submission, and are reused in Next.js Route Handlers to validate server payloads.

---

## ADR-007: Playwright for Integration Testing

### Status
**Accepted**

### Context
Unit tests are insufficient to guarantee that complex, multi-page data flows (like bulk importing spreadsheets and updating request statuses) render correctly in different web browsers.

### Decision
We selected **Playwright** as the E2E and integration testing suite. It runs tests in headless chromium/firefox contexts, validating form states, redirects, and file uploads.
