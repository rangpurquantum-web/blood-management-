# Blood Donation Software

Project context for AI coding assistants working in this repository.

## Overview

This project is an **internal blood management system**. It helps the management team maintain a donor database, track donation history logs, and coordinate blood requests.

## Goals

- Register and manage blood donors in a centralized database
- Record and track donation history logs
- Track and manage blood requests (patient name, required units, status)
- Generate reports and stats, and import/export donor data via Excel/CSV
- Maintain immutable activity audit logs

## Tech Stack

- **Runtime:** Node.js 18+
- **Language:** TypeScript (strict mode)
- **Framework:** Next.js 15 (App Router)
- **UI:** Tailwind CSS v4, shadcn/ui
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Auth.js (NextAuth v5)
- **Validation:** Zod
- **Forms:** React Hook Form
- **Tables:** TanStack Table
- **State:** Zustand
- **Data Fetching:** TanStack Query
- **Charts:** Recharts
- **Import/Export:** xlsx, papaparse
- **Testing:** Jest, React Testing Library, Playwright
- **Deployment:** Docker (Phase 8)

## Project Structure

```
blood-management-system/
├── app/                    # Next.js App Router pages & API routes
│   ├── api/auth/           # Auth.js route handlers
│   ├── dashboard/          # Dashboard (Phase 4)
│   └── login/              # Login page (Phase 3)
├── components/
│   ├── providers/          # TanStack Query provider
│   └── ui/                 # shadcn/ui components
├── features/               # Feature-sliced modules
│   ├── auth/
│   ├── donors/
│   ├── donations/
│   ├── requests/
│   ├── dashboard/
│   ├── reports/
│   ├── import-export/
│   └── audit-logs/
├── lib/
│   ├── db.ts               # Prisma client singleton
│   ├── query.ts            # TanStack Query client factory
│   ├── stores/             # Zustand stores
│   └── utils.ts            # Shared utilities (cn)
├── prisma/
│   └── schema.prisma       # Database schema
├── tests/
│   ├── e2e/                # Playwright tests
│   └── unit/               # Jest + RTL tests
├── types/                  # Shared TypeScript types
├── docs/                   # Product specifications
├── auth.ts                 # Auth.js configuration
└── middleware.ts           # Route protection (Phase 3)
```

## Commands

| Action        | Command              |
|---------------|----------------------|
| Install deps  | `npm install`        |
| Run dev       | `npm run dev`        |
| Build         | `npm run build`      |
| Run prod      | `npm start`          |
| Type check    | `npm run typecheck`  |
| Lint          | `npm run lint`       |
| Format        | `npm run format`     |
| Unit tests    | `npm test`           |
| E2E tests     | `npm run test:e2e`   |
| DB migrate    | `npm run db:migrate` |
| DB seed       | `npm run db:seed`    |

## Coding Conventions

- Use TypeScript strictly; avoid `any` unless necessary
- Prefer Next.js App Router patterns (`app/`, Server Components, Route Handlers)
- Keep changes focused and minimal
- Match existing patterns in the codebase
- Use clear names for donors, donations, blood types, and requests
- Validate user input on forms and APIs
- Do not log or expose sensitive personal or medical data

## Security & Privacy

- Treat donor data as sensitive (PII / health-related)
- Never commit secrets, API keys, or real donor records
- Use environment variables for configuration
- Follow least-privilege access for admin vs staff roles

## Testing

- Add tests for critical flows: donor registration, donation history recording, request creation and updates
- Run the test suite before marking work complete

## Notes for Agents

- Prefer extending existing modules over duplicating logic
- Ask before large architectural changes if requirements are unclear
- Update this file when stack, structure, or commands change
