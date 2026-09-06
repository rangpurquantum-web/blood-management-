# Document Metadata: System Architecture (architecture.md)

*   **Purpose:** Explains the design patterns, codebase directory structures, component routing layers, data access, and authorization boundaries.
*   **Information Contained:** Component layer layouts (Server vs. Client Components), Feature-Sliced design patterns (`features/`), Zustand store configurations, TanStack Query states, and NextAuth session guards.
*   **Recommended Headings:** `# Document Metadata`, `# System Architecture Specification`, `## 1. High-Level Architectural Layout`, `## 2. Codebase Organization & Directory Structure`, `## 3. Dynamic Database Connection & Routing Architecture`, `## 4. State Management & Data Fetching Patterns`, `## 5. Security & Authorization Architecture`.
*   **Dependencies:** [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md) (uses its ERD database models), [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) (incorporates security privilege definitions).

---

# System Architecture Specification

This document details the code layers, rendering paradigms, state patterns, and authorization check boundaries implemented in the Internal Blood Management System, updated for the **Multi-Branch Database Architecture (Update 1)**.

---

## 1. High-Level Architectural Layout

The system utilizes a hybrid multi-tenant structure where global administrative resources are unified under a single Control Database, and donor PII data is isolated into multiple independent PostgreSQL databases (one per branch).

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
   (Resolves context,     (Zustand state store,    (Validates payload,
    decrypts DB URL)      React Hook Form UI)      resolves tenant DB)
        │                        │                        │
        │ (Dynamic PrismaClient) │ (TanStack Query hooks) │ (Dynamic PrismaClient)
        │                        └───────────┬────────────┘
        │                                    ▼
        └────────────────────────┬───────────┘
                                 │
                                 ▼
                     [ DYNAMIC CONNECTION REGISTRY ]
                                 │ (LRU Connection Cache)
                                 ├───► [ Control Database ] (Metadata & Users)
                                 └───► [ Branch A Database ] (Donor PII data)
                                 └───► [ Branch B Database ] (Donor PII data)
```

---

## 2. Codebase Organization & Directory Structure

The project implements a clean feature-centric structure separating global assets and shared configurations from feature-sliced modules:

```text
project-root/
├── app/               # Next.js App Router root layout & views
│   ├── api/           # Auth.js routes & JSON API Route Handlers
│   └── dashboard/     # Multi-Branch Dashboard pages & sub-panels
├── components/        # Shared presentation wrappers (shadcn/ui wrappers)
│   ├── layout/        # Sidebar navigation and branch contextual switchers
│   └── ui/            # Accessible shadcn component primitives
├── features/          # Feature-sliced modules (encapsulates logic)
│   ├── donors/        # Donor search, registry forms, profile cards
│   ├── donations/     # Donation intake records, wait-period indicators
│   ├── audit-logs/    # Local audit log list viewers
│   └── branches/      # Super Admin branch database provisioning panel
├── lib/               # Global utility connections & client instances
│   ├── db.ts          # Control Database PrismaClient singleton connection
│   ├── tenant-db.ts   # Dynamic connection registry (LRU client pool cache)
│   └── query.ts       # Shared TanStack Query client instance
├── prisma/            # Relational database models & migration scripts
│   ├── control.schema # Prisma schema definition for Control Database
│   └── branch.schema  # Replicated schema definition for Branch Databases
├── public/            # Static media resources and mockups
├── tests/             # Playwright end-to-end integration test files
├── types/             # Common TypeScript interfaces & schemas
├── docs/              # System specifications index
└── package.json       # Node package manager declarations
```

---

## 3. Dynamic Database Connection & Routing Architecture

To keep memory footprint low and prevent PostgreSQL connection limits from locking up, database connections are resolved dynamically at runtime.

### 3.1 Connection Registry & Decryption
*   When a request hits a branch-specific route, the route handler extracts the tenant context.
*   The system queries `Branch.dbUrlEncrypted` in the Control Database.
*   The URL string is decrypted on the fly using `crypto.createDecipheriv` (AES-256-GCM).

### 3.2 LRU Client Pooling
*   Rather than creating a new `PrismaClient` connection on every request, connections are stored in an LRU (Least Recently Used) cache:
```typescript
import { PrismaClient } from "@prisma/client";
import { LRUCache } from "lru-cache";

// Pool size capped at ~20 clients to respect free-tier database connections
const clientCache = new LRUCache<string, PrismaClient>({
  max: 20,
  dispose: (client) => {
    client.$disconnect();
  }
});
```
*   Connections that have been idle for a long period are cleaned up automatically.

---

## 4. State Management & Data Fetching Patterns

*   **Global UI Context (Zustand):** Manages layout variables such as active sidebar toggles or context-switching selectors.
*   **Data Synchronization (TanStack Query):** Caches API request outputs. When a user switches branch databases, the query keys are invalidated and updated to fetch the new context branch records.

---

## 5. Security & Authorization Architecture

*   **Middleware Guard Filters:** App Router middleware monitors routes. Gated URLs (e.g. `/dashboard/branches`) block unauthorized access contexts.
*   **Database Isolation Rules:** Users cannot access data outside their branch. Super Admins configure access rules via the `PermissionGrant` registry, which is validated before resolving database URLs.
