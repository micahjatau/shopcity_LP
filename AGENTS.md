# AGENTS.md

## Source Of Truth

- `docs/TRD.md` is the architecture and requirements baseline.
- If repo docs conflict with `docs/TRD.md`, follow the TRD for product and architecture decisions.

## Repo Map

- Current app code lives in `src/`; tests are `src/**/*.spec.ts`, `test/**/*.ts`, and integration specs in `test/**/*.int-spec.ts`.
- Feature boundaries live under `src/modules/`; shared code lives under `src/common/`, `src/config/`, `src/database/`, and `src/jobs/`.
- `src/main.ts` boots Nest with Fastify and listens on `process.env.PORT ?? 3000`.
- The current root route is `GET /` in `src/app.controller.ts`.
- Supabase integration lives under `src/supabase/` and is the entrypoint for DB plus identity/password verification; application sessions and RBAC live in the backend.
- Prisma schema lives under `prisma/`; architecture notes belong in `docs/adr/`.
- Docs are organized under `docs/architecture/`, `docs/api/`, `docs/adr/`, `docs/runbooks/`, `docs/development/`, and `docs/database/`.
- The TRD target shape is a backend-first modular monolith with `apps/`, `packages/`, `prisma/`, and `docs/adr/`.

## Commands

- Use the npm scripts in `package.json` for verification.
- `npm run build` compiles the app.
- `npm run start:dev` runs watch mode.
- `npm run gitnexus:analyze` refreshes the GitNexus index for the repo.
- `npm run proposal:impact -- --file <path> <symbol>` runs GitNexus impact analysis before drafting a spec proposal.
- Record proposal-time GitNexus findings in `docs/development/gitnexus-impact-tracker.md`.
- `npm run prisma:generate` regenerates the Prisma client.
- `npm run test:integration` runs the Testcontainers-backed database check.
- `docker compose up -d` starts local Postgres and Redis.
- Use `npx supabase start`, `npx supabase status`, `npx supabase link --project-ref nmuedccamqacgszvosvm --password "$SUPABASE_DB_PASSWORD"`, and `npx supabase db push --linked` for Supabase local/remote schema work.
- `npm run lint` runs ESLint with `--fix`, so it can change files.
- `npm run test`, `npm run test:e2e`, and `npm run test:cov` run unit, e2e, and coverage suites.
- For one spec file, use `npx jest <path-to-spec> --runInBand`.

## CLI First

- Prefer the repo-local binaries through `npm exec` or `npx`.
- Installed CLIs here include `nest`, `supabase`, `prisma`, `spectral`, `orval`, `compodoc`, `oasdiff`, `bru`, `lint-staged`, and `commitlint`.
- Regenerate contract, schema, client, auth, and docs artifacts with the matching CLI instead of hand-editing generated output.
- Use `npx supabase` for local identity/password workflows, remote linking, and schema pushes; use `prisma` for schema/migration work, `spectral` and `oasdiff` for OpenAPI checks, `orval` for client generation, `compodoc` for Nest docs, and `bru` for API collections.
- Before creating a spec proposal, run `npm run proposal:impact -- --file <path> <symbol>` for the planned change surface and log the result in `docs/development/gitnexus-impact-tracker.md`.

## TRD Constraints

- Keep the backend API-first and REST/OpenAPI-focused; do not introduce GraphQL or microservices for the MVP.
- Treat money as integer kobo only; do not use floating point for financial logic.
- Preserve append-only financial history and auditability; do not delete or edit confirmed ledger entries.
- Keep frontend-submitted balances, roles, and approvals out of trust boundaries.
- Keep the repository modular: feature code belongs in `src/modules/`, shared code in `src/common/`, and infrastructure in `src/config/`, `src/database/`, `src/jobs/`, and `src/supabase/`.
- The target stack in the TRD includes Supabase/Postgres for database and identity verification, backend-owned sessions/RBAC, Redis/BullMQ, Prisma, OpenAPI, and background SMS processing.
- Keep a local migration/backup tracker in `docs/database/migration-tracker.md`; update it for schema changes, backup/restore checks, and every applied migration.
- Never edit a migration after it has been applied to a shared environment; use expand-and-contract changes and record destructive changes with a backup plan.

## Environment

- TRD environment variables include `DATABASE_URL`, `REDIS_URL=redis://127.0.0.1:6379`, `SESSION_SECRET`, `CSRF_SECRET`, `SHOPCITY_TIMEZONE`, `RECEIPT_WEEK_START_DAY`, and `DEFAULT_EARN_RATE_BPS`.
- Supabase workflows will also need `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; backend auth/session logic stays in `src/modules/auth/`.
- `dist/` is disposable because `nest-cli.json` sets `deleteOutDir: true`.
- The current local Supabase stack uses `http://127.0.0.1:55421` and `postgresql://postgres:postgres@127.0.0.1:55422/postgres`.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **shopcity_LP** (2118 symbols, 3341 relationships, 61 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/shopcity_LP/context` | Codebase overview, check index freshness |
| `gitnexus://repo/shopcity_LP/clusters` | All functional areas |
| `gitnexus://repo/shopcity_LP/processes` | All execution flows |
| `gitnexus://repo/shopcity_LP/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
