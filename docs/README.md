# Internal Blood Management System - Documentation Index

Welcome to the project documentation index. This folder contains all the architectural, specification, and product definitions for the Internal Blood Management System.

---

## 1. Project Directory Structure

```text
project-root/
├── app/          # Next.js App Router (pages and route layouts)
├── components/   # Shared presentation elements (shadcn/ui wrappers)
├── features/     # Feature-sliced application modules (donors, requests, logs)
├── lib/          # Global client instances (Prisma, TanStack Query, Redis)
├── prisma/       # Relational models and SQL database schema migration scripts
├── public/       # Static media assets and templates
├── types/        # Global TypeScript structures and schema typings
├── docs/         # Product specs, API charts, and decisions log
├── tests/        # Playwright end-to-end integration test suites
├── package.json  # NPM application script setups
├── tsconfig.json # TypeScript strict compiler settings
└── README.md     # Gateway README
```

---

## 2. Documentation Directory Map

| File Name | Purpose | Key Content | Dependencies |
| :--- | :--- | :--- | :--- |
| 📄 **[README.md](file:///d:/blood%20donetion%20softwere/docs/README.md)** | Index of documentation | Map and cross-references of all docs | None |
| 📄 **[idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md)** | Scoping & Core Vision | Overview, database schema ERD, scope exclusions | None |
| 📄 **[tech-stack.md](file:///d:/blood%20donetion%20softwere/docs/tech-stack.md)** | Technology Stack | Approved platforms, libraries, forms, tables, and test engines | None |
| 📄 **[feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md)** | Feature Requirements | Functional features (donors, history, requests) and non-functional requirements | [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md) |
| 📄 **[user-story.md](file:///d:/blood%20donetion%20softwere/docs/user-story.md)** | User Stories & ACs | Dev-ready user stories with acceptance criteria | [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) |
| 📄 **[user-flow.md](file:///d:/blood%20donetion%20softwere/docs/user-flow.md)** | Visual Workflows | Mermaid flowcharts and step-by-step user paths | [user-story.md](file:///d:/blood%20donetion%20softwere/docs/user-story.md) |
| 📄 **[database.md](file:///d:/blood%20donetion%20softwere/docs/database.md)** | Database Schema Spec | Detailed table descriptions, columns, keys, indexes, and migrations | [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md) |
| 📄 **[api-spec.md](file:///d:/blood%20donetion%20softwere/docs/api-spec.md)** | API Routes Spec | Endpoint schemas, request/response headers, body inputs, and status codes | [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) |
| 📄 **[architecture.md](file:///d:/blood%20donetion%20softwere/docs/architecture.md)** | System Architecture | App Router layout, data access layer, role permissions security matrix | [idea.md](file:///d:/blood%20donetion%20softwere/docs/idea.md), [feature.md](file:///d:/blood%20donetion%20softwere/docs/feature.md) |
| 📄 **[tasks.md](file:///d:/blood%20donetion%20softwere/docs/tasks.md)** | Implementation Checklists | Step-by-step sprint checklists for engineers | [user-story.md](file:///d:/blood%20donetion%20softwere/docs/user-story.md) |
| 📄 **[decisions.md](file:///d:/blood%20donetion%20softwere/docs/decisions.md)** | Architecture Decisions (ADRs) | Historic log of design choices and scoping constraints | None |

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
