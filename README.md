# ShopCity Loyalty Platform Backend

Backend foundation for the ShopCity loyalty MVP.

## Source Of Truth

- `docs/TRD.md` is the technical requirements and architecture baseline.
- This repository is organized around the TRD foundation stack, not a flat controller/service layout.

## Current App

- App entrypoint: `src/main.ts`
- Default route: `GET /api/v1` in `src/app.controller.ts`
- Supabase identity/DB wiring: `src/supabase/`
- Tests: unit tests in `src/**/*.spec.ts`, e2e tests in `test/**/*.e2e-spec.ts`, integration tests in `test/**/*.int-spec.ts`

## Foundation Layout

```text
docs/
├── architecture/
├── api/
├── adr/
├── runbooks/
├── development/
└── database/

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
├── common/
├── config/
├── database/
└── jobs/
prisma/
└── migrations/
```

## Local Setup

```bash
npm install
npm run prisma:generate
docker compose up -d
npx prisma migrate deploy
npm run prisma:seed
npm run test:integration
npm run start:dev
```

The bootstrap path assumes a fresh database, applied migrations, and seeded foundation data before starting the app.

The seed step provisions the foundation tenant, branch, and a usable admin login. By default the bootstrap admin is `admin@shopcity.local` with password `password`, unless `DEFAULT_ADMIN_PASSWORD` is set.

## Common Commands

- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run test:cov`

## CLI Workflow

- Use local binaries via `npm exec` or `npx`.
- Available CLIs in this repo include `nest`, `supabase`, `prisma`, `spectral`, `orval`, `compodoc`, `oasdiff`, `bru`, `lint-staged`, and `commitlint`.
- Generate schemas, auth config, OpenAPI checks, frontend clients, and docs with the CLI that owns them; do not hand-edit generated outputs.
- Use `supabase` for identity/password workflows and generated types, `prisma` for schema and migrations, `spectral` and `oasdiff` for contract validation, `orval` for client generation, `compodoc` for NestJS docs, and `bru` for API collections.

## Foundation Stack

- NestJS with Fastify
- PostgreSQL + Prisma
- Docker Compose for local services
- Swagger/OpenAPI at `/docs`
- Pino structured logging
- Global validation and error handling
- Husky, lint-staged, and Commitlint
- Jest, Supertest, and Testcontainers
- GitHub Actions CI

## TRD Architecture Summary

- Backend-first, API-contract-first delivery.
- Modular monolith, not microservices.
- REST/OpenAPI is the integration boundary; no GraphQL for MVP.
- Financial values are stored as integer kobo only.
- The backend owns ledger integrity, approvals, expiry, fraud handling, application sessions, RBAC, and SMS background work.

## Module Boundary Rules

- Feature code stays inside `src/modules/<feature>/`.
- Shared helpers and policies stay in `src/common/`.
- Configuration stays in `src/config/`.
- Persistence stays in `src/database/`.
- Supabase integration stays in `src/supabase/`.
- Background work stays in `src/jobs/`.
- Feature modules may import only their own module plus approved cross-cutting modules such as audit/configuration.
- Shared layers must not import feature modules.

## Target Infrastructure

- Supabase for staff identity/password verification and Postgres-backed data services.
- Redis + BullMQ for queues and background jobs.
- Prisma for schema and migrations.
- OpenAPI, Spectral, Prism, Orval, Bruno, and `@nestjs/swagger` for contract-driven development.

## Environment

- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `SESSION_SECRET`
- `CSRF_SECRET`
- `MIN_REDEMPTION_KOBO`
- `PURCHASE_FLAG_THRESHOLD_KOBO`
- `PURCHASE_APPROVAL_THRESHOLD_KOBO`
- `REDEMPTION_APPROVAL_THRESHOLD_KOBO`
- `SWAGGER_ENABLED`
- `DEFAULT_PUBLIC_TENANT_ID`
- `DEFAULT_PUBLIC_BRANCH_ID`
- `SHOPCITY_TIMEZONE`
- `RECEIPT_WEEK_START_DAY`
- `DEFAULT_EARN_RATE_BPS`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
