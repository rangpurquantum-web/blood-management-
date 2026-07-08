# Internal Blood Management System

A secure internal web application used by the management team to manage blood donors, blood requests, and donation history.

---

## 1. Project Directory Structure

```text
project-root/
├── app/          # Next.js App Router root pages and layouts
├── components/   # Shared presentation elements (shadcn/ui wrappers)
├── features/     # Feature-sliced application modules (donors, requests, logs)
├── lib/          # Cached client instances (Prisma, TanStack Query)
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

## 2. Technical Stack Quick Reference

*   **Runtime:** Node.js (v18+)
*   **Language:** TypeScript (Strict Mode)
*   **Frontend Framework:** Next.js App Router / React
*   **UI Primitives:** shadcn/ui
*   **Data Grids:** TanStack Table
*   **Data Fetching:** TanStack Query
*   **State Store:** Zustand
*   **Validation:** Zod
*   **Forms Handler:** React Hook Form
*   **Database / ORM:** PostgreSQL / Prisma
*   **Spreadsheet Parsing:** xlsx / papaparse
*   **Auth Middleware:** Auth.js (NextAuth)
*   **E2E Testing:** Playwright
*   **Deployment:** Docker / VPS

---

## 3. Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- PostgreSQL 14+
- npm

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client (migrations in Phase 2)
npm run db:generate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with Turbopack |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Jest unit tests |
| `npm run test:e2e` | Playwright E2E tests |

---

## 4. Documentation
