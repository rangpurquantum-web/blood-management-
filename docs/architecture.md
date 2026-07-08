# Document Metadata: System Architecture (architecture.md)

*   **Purpose:** Explains the design patterns, codebase directory structures, component routing layers, data access, and authorization boundaries.
*   **Information Contained:** Component layer layouts (Server vs. Client Components), Feature-Sliced design patterns (`features/`), Zustand store configurations, TanStack Query states, and NextAuth session guards.
*   **Recommended Headings:** `# Document Metadata`, `# System Architecture Specification`, `## 1. High-Level Architectural Layout`, `## 2. Codebase Organization & Directory Structure`, `## 3. Component Architecture & Rendering Boundaries`, `## 4. State Management & Data Fetching Patterns`, `## 5. Security & Authorization Architecture`.
*   **Dependencies:** [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md) (uses its ERD database models), [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) (incorporates security privilege definitions).

---

# System Architecture Specification

This document details the code layers, rendering paradigms, state patterns, and authorization check boundaries implemented in the Internal Blood Management System.

---

## 1. High-Level Architectural Layout

The system is designed as a secure internal Next.js fullstack application. All UI logic, endpoint route handling, validation layers, and database queries are unified under a single runtime process, avoiding mixed frameworks or external backends.

```text
       [ AUTHORIZED ADMINISTRATIVE CLIENT (WEB BROWSER) ]
                                │
                                │  HTTPS Requests (HTML pages / API calls)
                                ▼
            [ NEXT.JS FULLSTACK FRAMEWORK (APP ROUTER) ]
       ┌────────────────────────┼────────────────────────┐
       │ (Server Rendering)     │ (Client Interactivity) │ (REST APIs)
       ▼                        ▼                        ▼
  [ SERVER PAGES ]      [ CLIENT COMPONENTS ]    [ ROUTE HANDLERS ]
  (Fetch direct database (Zustand state store,    (Zod payload check,
   via Prisma client)    React Hook Form UI)      Prisma db write)
       │                        │                        │
       │ (Prisma Client)        │ (TanStack Query hooks) │ (Prisma Client)
       │                        └───────────┬────────────┘
       │                                    ▼
       └────────────────────────┬───────────┘
                                │
                                ▼
                       [ PRISMA CLIENT ORM ]
                                │
                                ▼
                     [ POSTGRESQL DATABASE ]
```

---

## 2. Codebase Organization & Directory Structure

The project implements a clean feature-centric structure separating global assets and shared configurations from feature-sliced modules:

```text
project-root/
├── app/               # Next.js App Router root layout & views
│   ├── api/           # Auth.js routes & JSON API Route Handlers
│   └── page.tsx       # System Dashboard Server Component
├── components/        # Shared presentation wrappers (shadcn/ui wrappers)
│   └── ui/            # Accessible shadcn component primitives
├── features/          # Feature-sliced modules (encapsulates logic)
│   ├── donors/        # Donor search, registry forms, profile cards
│   ├── requests/      # Request intake, status toggles, grids
│   └── audit-logs/    # Admin audit list view components
├── lib/               # Global utility connections & client instances
│   ├── db.ts          # Cached Prisma client connection
│   └── query.ts       # Shared TanStack Query client instance
├── prisma/            # Relational database models & migration scripts
├── public/            # Static media resources
├── tests/             # Playwright end-to-end integration test files
├── types/             # Common TypeScript interfaces & schemas
├── docs/              # System specifications index
└── package.json       # Node package manager declarations
```

---

## 3. Component Architecture & Rendering Boundaries

To maintain high load speeds and type safety, rendering boundaries are strictly enforced:

*   **Server Components (Default):** Pages read data directly from the Prisma Client database layer on the server, completely eliminating internal REST loops for initial renders.
*   **Client Components (`'use client'`):** Stateful widgets are isolated as Client Components. This includes validation input fields (React Hook Form + Zod), table listings with paging/sorting features (TanStack Table), and analytics dashboards (Recharts).

---

## 4. State Management & Data Fetching Patterns

The system divides dynamic client-side state variables into two categories:

### 4.1 Global Client State (Zustand)
Used for transient UI states (such as sidebar toggle triggers, profile card view options, or filter settings). The Zustand store is fast, lightweight, and requires no React Context provider nesting:
```typescript
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
```

### 4.2 Server Cache Synchronization (TanStack Query)
Coordinates local client caches with the Next.js backend API routes.
*   **Queries:** TanStack Query handles caching, automatic background updates, and request loading indicators.
*   **Mutations:** Creating a donation history log or changing a blood request's status triggers a TanStack Query cache invalidation (invalidation of target cache keys), forcing a clean data refetch.

---

## 5. Security & Authorization Architecture

*   **Session Management (Auth.js):** Session context cookies are signed, encrypted, and guarded against client-side browser script queries.
*   **Role Middleware Checks:** The App Router middleware reads the Auth.js session token. Administrative routes (such as bulk data imports and the audit logs list viewer) block standard `Staff` users at both the router layer and the API endpoint validation layer.
