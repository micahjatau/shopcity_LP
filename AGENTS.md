# AGENTS.md

## Source Of Truth
- `docs/TRD.md` is the architecture and requirements baseline.
- If repo docs conflict with `docs/TRD.md`, follow the TRD for product and architecture decisions.

## Repo Map
- Current app code lives in `src/`; tests are `src/**/*.spec.ts`, `test/**/*.ts`, and integration specs in `test/**/*.int-spec.ts`.
- Feature boundaries live under `src/modules/`; shared code lives under `src/common/`, `src/config/`, `src/database/`, and `src/jobs/`.
- `src/main.ts` boots Nest with Fastify and listens on `process.env.PORT ?? 3000`.
- The current root route is `GET /` in `src/app.controller.ts`.
- Supabase integration lives under `src/supabase/` and is the entrypoint for DB/auth access.
- Prisma schema lives under `prisma/`; architecture notes belong in `docs/adr/`.
- Docs are organized under `docs/architecture/`, `docs/api/`, `docs/adr/`, `docs/runbooks/`, `docs/development/`, and `docs/database/`.
- The TRD target shape is a backend-first modular monolith with `apps/`, `packages/`, `prisma/`, and `docs/adr/`.

## Commands
- Use the npm scripts in `package.json` for verification.
- `npm run build` compiles the app.
- `npm run start:dev` runs watch mode.
- `npm run prisma:generate` regenerates the Prisma client.
- `npm run test:integration` runs the Testcontainers-backed database check.
- `docker compose up -d` starts local Postgres and Redis.
- `npm run lint` runs ESLint with `--fix`, so it can change files.
- `npm run test`, `npm run test:e2e`, and `npm run test:cov` run unit, e2e, and coverage suites.
- For one spec file, use `npx jest <path-to-spec> --runInBand`.

## CLI First
- Prefer the repo-local binaries through `npm exec` or `npx`.
- Installed CLIs here include `nest`, `supabase`, `prisma`, `spectral`, `orval`, `compodoc`, `oasdiff`, `bru`, `lint-staged`, and `commitlint`.
- Regenerate contract, schema, client, auth, and docs artifacts with the matching CLI instead of hand-editing generated output.
- Use `supabase` for local database/auth workflows and type generation, `prisma` for schema/migration work, `spectral` and `oasdiff` for OpenAPI checks, `orval` for client generation, `compodoc` for Nest docs, and `bru` for API collections.

## TRD Constraints
- Keep the backend API-first and REST/OpenAPI-focused; do not introduce GraphQL or microservices for the MVP.
- Treat money as integer kobo only; do not use floating point for financial logic.
- Preserve append-only financial history and auditability; do not delete or edit confirmed ledger entries.
- Keep frontend-submitted balances, roles, and approvals out of trust boundaries.
- Keep the repository modular: feature code belongs in `src/modules/`, shared code in `src/common/`, and infrastructure in `src/config/`, `src/database/`, `src/jobs/`, and `src/supabase/`.
- The target stack in the TRD includes Supabase/Postgres for database and auth, Redis/BullMQ, Prisma, OpenAPI, and background SMS processing.
- Keep a local migration/backup tracker in `docs/database/migration-tracker.md`; update it for schema changes, backup/restore checks, and every applied migration.
- Never edit a migration after it has been applied to a shared environment; use expand-and-contract changes and record destructive changes with a backup plan.

## Environment
- TRD environment variables include `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `CSRF_SECRET`, `SHOPCITY_TIMEZONE`, `RECEIPT_WEEK_START_DAY`, and `DEFAULT_EARN_RATE_BPS`.
- Supabase workflows will also need `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- `dist/` is disposable because `nest-cli.json` sets `deleteOutDir: true`.
