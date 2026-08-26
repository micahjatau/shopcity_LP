# ShopCity Loyalty Platform

ShopCity is a production-oriented **loyalty store-credit platform for retail operations**. It runs alongside an existing point-of-sale system and provides a controlled source of truth for customer loyalty balances, receipt-linked earning, redemption, approvals, expiry, fraud monitoring, offline capture, device attribution, audit history, and operational reporting.

The platform includes role-specific web applications for **Cashiers, Supervisors, and Administrators**, backed by a NestJS API, PostgreSQL ledger, Supabase authentication, Redis-backed background processing, and an OpenAPI-generated frontend client.

> **Project status:** release-candidate / controlled-pilot validation. Core application, financial workflows, CI, security gates, and deployment infrastructure are in place. Production certification still requires final authenticated business-flow benchmarks, pilot-device proof, backup/restore evidence, and release approval.

## Product Overview

ShopCity is designed for supermarkets and other high-volume retail environments that want to introduce loyalty credit without replacing their existing POS.

A typical checkout flow is:

```text
Customer presents loyalty card
        ↓
Cashier scans or enters card number
        ↓
ShopCity verifies customer + card + eligibility
        ↓
Cashier records the POS receipt and paid amount
        ↓
Backend applies loyalty policy and approval rules
        ↓
Credit is confirmed or routed for approval
        ↓
Customer balance, ledger, audit trail, reports, and notifications update
```

ShopCity never treats the browser as the financial source of truth. Loyalty calculations, eligibility, idempotency, approval decisions, ledger mutations, expiry, and redemption allocation are enforced by the backend.

## Core Capabilities

### Cashier

- Focused card scanner/manual lookup directly from the Cashier workspace
- Role-safe customer verification with masked phone, card status, eligibility, and balance
- Receipt-linked loyalty Earn workflow
- Loyalty credit Redemption workflow
- Server-authoritative transaction confirmation
- Cashier-scoped recent transaction activity
- Offline Earn queue with IndexedDB persistence and later reconciliation
- Explicit offline Redemption blocking
- Device-bound transaction attribution and sync

### Supervisor

- Customer and card management
- Transaction review
- Approval queues
- Fraud-flag review
- Branch-scoped reporting
- Operational oversight for cashier activity

### Administrator

- Cross-branch operational views
- Customer, card, user, device, and branch administration
- Adjustments and reversals
- Audit reporting
- Device provisioning, attestation-secret rotation, activation, and revocation
- Pilot-health and operational monitoring
- Reporting and reconciliation workflows

## Loyalty & Financial Integrity

The loyalty engine is designed around an append-only, auditable financial model.

Key controls include:

- Integer-kobo financial values — no floating-point balance storage
- Backend-authoritative Earn and Redeem calculations
- Receipt uniqueness by tenant, branch, receipt week, and normalized receipt number
- Idempotency for financial and other retry-sensitive mutations
- Staff/customer eligibility enforcement
- Approval thresholds for exceptional transactions
- Append-only ledger entries with compensating reversals instead of destructive edits
- FIFO-style credit-lot allocation for redemption
- Credit expiry and expiry reminders
- Device, cashier, branch, receipt, and session attribution
- Audit logging for privileged and financial actions

## Offline Model

ShopCity uses a deliberately conservative offline policy:

- **Earn may be captured offline** when a valid provisioned device and authenticated Cashier context are available.
- Offline Earn records are stored in IndexedDB with their original idempotency key and required transaction context.
- The backend revalidates customer, card, device, branch, receipt-week, duplicate-receipt, policy, and actor rules during sync.
- **Redemption is never allowed offline**, preventing a stale device from spending loyalty credit without authoritative balance validation.

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Web App                         │
│       Cashier · Supervisor · Administrator workflows       │
└───────────────────────────┬─────────────────────────────────┘
                            │ same-origin /api/v1 proxy
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  NestJS + Fastify API                       │
│ Auth · Loyalty · Receipts · Cards · Approvals · Reports    │
│ Fraud · Audit · Devices · Notifications · Offline Sync     │
└───────────────┬───────────────────────┬─────────────────────┘
                │                       │
                ▼                       ▼
┌─────────────────────────┐   ┌───────────────────────────────┐
│ PostgreSQL + Prisma     │   │ Redis / background workers  │
│ Ledger + domain state   │   │ outbox · SMS · expiry jobs  │
└─────────────────────────┘   └───────────────────────────────┘
                │
                ▼
┌─────────────────────────┐
│ Supabase Auth           │
│ Staff identity/password │
└─────────────────────────┘
```

The application is intentionally a **modular monolith**, not a microservice system. REST/OpenAPI is the integration boundary.

## Repository Layout

```text
apps/web/                 Next.js role-based frontend

src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── branches/
│   ├── customers/
│   ├── cards/
│   ├── loyalty/
│   ├── receipts/
│   ├── approvals/
│   ├── notifications/
│   ├── audit/
│   ├── fraud/
│   └── reports/
├── common/               Shared policies, auth, validation, utilities
├── config/               Runtime configuration
├── database/             Prisma/database infrastructure
└── jobs/                 Background and scheduled work

prisma/                   Schema, migrations, seed data
docs/                     TRD, architecture, API, runbooks, release evidence
openspec/                 Change specifications and implementation tracking
client/                   Generated API client artifacts
```

## Technology Stack

### Backend

- NestJS
- Fastify
- PostgreSQL
- Prisma
- Supabase Auth
- Redis / Upstash-compatible Redis
- BullMQ/background workers
- Pino structured logging

### Frontend

- Next.js App Router
- TypeScript
- Role-aware application shells
- Generated OpenAPI client via Orval
- IndexedDB for durable offline Earn storage
- Jest + Testing Library
- Playwright
- Accessibility and visual-regression testing

### Contracts & Quality

- Swagger / `@nestjs/swagger`
- OpenAPI
- Spectral
- Orval
- OAS diff checks
- Bruno API collections
- GitHub Actions
- CodeQL
- Gitleaks
- Trivy
- ZAP baseline scanning
- CodeRabbit review

## Application Routes

### Cashier

```text
/cashier
/cashier/lookup
/cashier/earn
/cashier/redeem
/cashier/customers
/cashier/sync
```

### Supervisor

```text
/supervisor
/supervisor/customers
/supervisor/cards
/supervisor/transactions
/supervisor/approvals
/supervisor/fraud
/supervisor/reports
```

### Administrator

```text
/admin
/admin/operations
/admin/customers
/admin/cards
/admin/transactions
/admin/approvals
/admin/fraud
/admin/adjustments
/admin/reports
/admin/audit
/admin/users
/admin/devices
/admin/branches
```

## Security Model

ShopCity applies security controls at the backend boundary rather than relying on frontend visibility alone.

Implemented controls include:

- Role-based access control for Cashier, Supervisor, and Admin roles
- Secure application sessions backed by server-side session records
- Role-aware inactivity expiration and absolute session expiry
- CSRF protection
- Secure cookie-based browser session transport
- Device attestation and nonce replay protection
- Device/session revocation
- Tenant and branch scoping
- Cashier-specific PII minimization
- Content Security Policy and other browser security headers
- Login throttling and request throttling for sensitive operations
- Audit logging for privileged actions
- Automated CodeQL, Gitleaks, Trivy, and ZAP security gates

## API & Source of Truth

The technical requirements document is the architecture baseline:

```text
docs/TRD.md
```

The generated OpenAPI contract is the canonical frontend/backend integration surface:

```text
docs/api/openapi.json
```

Generated client output should not be hand-edited. Backend contract changes should flow through:

```text
NestJS DTO/controller
      ↓
OpenAPI generation
      ↓
contract validation
      ↓
Orval client generation
      ↓
frontend integration
```

## Local Development

### Prerequisites

- Node.js 18+
- Docker
- Supabase CLI
- PostgreSQL/Supabase local stack
- Redis or compatible Redis endpoint

### Bootstrap

```bash
npm install
npm run prisma:generate
npx supabase start
npx supabase status
docker compose up -d
npx prisma migrate deploy
npm run prisma:seed
npm run test:integration
npm run start:dev
```

Run the frontend separately with:

```bash
npm --prefix apps/web run dev
```

The seed workflow provisions local tenant/branch data and development identities for Admin, Cashier, and Supervisor roles. Configure the local Supabase URL and keys before seeding, and use a strong `DEFAULT_ADMIN_PASSWORD` outside tests.

## Common Commands

```bash
# Backend
npm run build
npm run typecheck
npm run lint
npm run test
npm run test:integration
npm run test:e2e
npm run test:cov

# Contract
npm run openapi:lint
npm run openapi:diff

# Full development stack
npm run dev:full

# Frontend
npm --prefix apps/web run build
npm --prefix apps/web run lint
npm --prefix apps/web run typecheck
npm --prefix apps/web run a11y:test
npm --prefix apps/web run critical:test
npm --prefix apps/web run visual:test
npm --prefix apps/web run live:test
```

## Backend-Connected Frontend E2E

Prepare and run the live backend-connected frontend suite:

```bash
npm run e2e:live:prepare
npm run e2e:live:test
```

Or run the complete backend + frontend + Playwright flow:

```bash
npm run e2e:live:full
```

## Deployment

The current deployment architecture places the latency-sensitive runtime components in **Frankfurt**:

```text
Vercel frontend / Next.js proxy  → Frankfurt
Vercel backend API               → Frankfurt
Supabase/PostgreSQL              → Frankfurt
```

Static frontend assets remain CDN-delivered while server/API/database traffic stays geographically close.

Production deployments are expected to pass protected-branch CI and security gates before promotion.

## Release Readiness

The platform is currently in release-candidate stabilization.

Completed foundations include:

- Core Cashier, Supervisor, and Admin workflows
- Loyalty ledger and credit-lot model
- Earn, Redeem, approvals, reversals, expiry, and fraud handling
- Offline Earn reconciliation
- Device provisioning and attestation lifecycle
- Role-safe customer projections
- Reporting and pilot-health surfaces
- Protected `master` branch
- Exact-head CI and security workflows
- Vercel frontend/backend deployment pipeline

Remaining release-certification work is tracked in OpenSpec and includes authenticated production business-flow benchmarks, real pilot-device proof, backup/restore drill evidence, and final exact-head release approval.

## Engineering Rules

- Keep financial authority on the backend.
- Store money as integer kobo.
- Do not mutate historical ledger entries; use compensating entries.
- Preserve idempotency keys across retries for retry-sensitive operations.
- Keep feature code within `src/modules/<feature>/`.
- Keep shared policies and helpers in `src/common/`.
- Keep persistence concerns in `src/database/`.
- Keep background work in `src/jobs/`.
- Do not hand-edit generated OpenAPI/client artifacts.
- Run impact analysis before broad architectural changes.

## Key Environment Variables

Core runtime configuration includes:

```text
PORT
DATABASE_URL
REDIS_URL
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
SESSION_SECRET
CSRF_SECRET
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MIN_REDEMPTION_KOBO
PURCHASE_FLAG_THRESHOLD_KOBO
PURCHASE_APPROVAL_THRESHOLD_KOBO
PURCHASE_AMOUNT_CEILING_KOBO
REDEMPTION_APPROVAL_THRESHOLD_KOBO
DEFAULT_EARN_RATE_BPS
SHOPCITY_TIMEZONE
RECEIPT_WEEK_START_DAY
SMS_PROVIDER_MODE
SENTRY_DSN
```

See `.env.example` and the configuration modules for the complete current set.

## Documentation

Useful starting points:

- `docs/TRD.md` — product and technical requirements
- `docs/architecture/` — architectural decisions and invariants
- `docs/api/` — OpenAPI and API-contract artifacts
- `docs/runbooks/` — operational procedures
- `docs/database/` — migration and database operations
- `docs/development/` — engineering and release evidence
- `docs/frontend/design-system/` — frontend design, accessibility, and workflow standards
- `openspec/changes/` — active specifications and release-certification work

---

**ShopCity Loyalty Platform** — auditable, POS-adjacent loyalty credit for retail operations.
