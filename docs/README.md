# Internal Blood Management System - Documentation Index

Welcome to the project documentation index. This folder contains all the architectural, specification, and product definitions for the Internal Blood Management System, updated for the **Multi-Branch Database Architecture (Update 1)**.

---

## 1. Project Directory Structure

```text
project-root/
├── app/                  # Next.js App Router (Pages, Layouts, PWA offline, API Route Handlers)
│   ├── api/              # API Endpoints (Auth, Donors, Users, Reports, Audit Logs, Branch DB setup)
│   └── dashboard/        # Admin UI (Donors, Pending Approval, User Management, Reports, Import, Settings)
├── components/           # Shared UI components (shadcn/ui wrappers, Navbars, PWA install prompt)
├── features/             # Feature-sliced application modules (donors, donations, audit-logs, reports, users)
├── lib/                  # Application core utilities (tenant-db, crypto, api-helpers, permissions)
├── prisma/               # Central DB schema (schema.prisma) & Branch DB schema (branch.schema.prisma)
├── public/               # Static media assets, icons, and service worker (sw.js)
├── scripts/              # Migration scripts (migrate-all-branches.ts)
├── docs/                 # Product specs, API charts, decisions log (ADRs)
├── tests/                # E2E (Playwright) and Unit (Jest) testing suites
├── softwere.md           # Software specification & roadmap
├── update-1.md           # Multi-Branch Database Architecture design spec
├── package.json          # Application configuration and npm scripts
├── tsconfig.json         # TypeScript strict compiler settings
└── README.md             # Main Project README
```

---

## 2. Documentation Directory Map

| File Name | Purpose | Key Content | Dependencies |
| :--- | :--- | :--- | :--- |
| 📄 **[README.md](file:///d:/blood%20donetion%20softwere/docs/README.md)** | Index of documentation | Map and cross-references of all docs | None |
| 📄 **[idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md)** | Scoping & Core Vision | Overview, multi-branch DB ERD, scope exclusions | None |
| 📄 **[tech-stack.md](file:///d:/blood%20donetion%20softwere/docs/tech-stack.md)** | Technology Stack | Next.js 15, React 19, Tailwind CSS v4, dynamic Prisma pooling | None |
| 📄 **[feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md)** | Feature Requirements | Branch provisioning, donor intake, wait-period logic, audit trails | [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md) |
| 📄 **[user-story.md](file:///d:/blood%20donetion%20softwere/docs/user-story.md)** | User Stories & ACs | Multi-branch and administrative user stories with acceptance criteria | [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) |
| 📄 **[user-flow.md](file:///d:/blood%20donetion%20softwere/docs/user-flow.md)** | Visual Workflows | Dynamic connection resolution, branch creation and intake flows | [user-story.md](file:///d:/blood%20donetion%20softwere/docs/user-story.md) |
| 📄 **[database.md](file:///d:/blood%20donetion%20softwere/docs/database.md)** | Database Schema Spec | Control Database vs Branch Database tables, columns, indexes, and migrations | [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md) |
| 📄 **[api-spec.md](file:///d:/blood%20donetion%20softwere/docs/api-spec.md)** | API Routes Spec | Control route endpoints (branches, grants) and branch connection resolvers | [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) |
| 📄 **[architecture.md](file:///d:/blood%20donetion%20softwere/docs/architecture.md)** | System Architecture | Dynamic Prisma LRU cache registry, context switching, middleware guards | [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md), [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) |
| 📄 **[tasks.md](file:///d:/blood%20donetion%20softwere/docs/tasks.md)** | Implementation Checklists | Step-by-step sprint checklists for database routing, setup, and views | [user-story.md](file:///d:/blood%20donetion%20softwere/docs/user-story.md) |
| 📄 **[decisions.md](file:///d:/blood%20donetion%20softwere/docs/decisions.md)** | Architecture Decisions (ADRs) | Historic log of design choices including database isolation (ADR-008) | None |

---

## 3. Guide for Authors
When writing or modifying files in this folder, please prefix files with the standard metadata block:
```markdown
# Document Metadata: [Doc Name] ([filename])
* **Purpose:** [Brief summary]
* **Information Contained:** [Key bullets]
* **Recommended Headings:** [Heading hierarchy]
* **Dependencies:** [References]
```
