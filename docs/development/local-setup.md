# Local Setup

## Prerequisites

- Node.js
- Docker Compose
- Supabase CLI

## Setup

1. Copy `.env.example` to `.env`.
2. Start Supabase locally with `supabase start`.
3. Run `supabase status` and copy the reported `API URL`, `anon key`, and `service_role key` into `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
   Also set `DEVICE_ATTESTATION_KEK` to a long random secret for local backend startup.
4. Start local services with Docker Compose.
5. Generate the Prisma client.
6. Run `npx prisma migrate deploy`.
7. Run `npm run prisma:seed` to seed the foundation data and bootstrap the admin login.
8. Run the app in watch mode.
9. Before live frontend E2E, run `npm run e2e:live:prepare` to apply migrations and seed the foundation tenant/admin login.

The seed step also provisions `cashier@shopcity.local` and `supervisor@shopcity.local` in Supabase Auth so the local shell has immediate cashier and supervisor sign-in paths. The bootstrap admin is `admin@shopcity.local` and requires a strong `DEFAULT_ADMIN_PASSWORD` outside tests, not the repository placeholder; the same bootstrap password is reused for the seeded demo cashier and supervisor accounts. If `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` is missing, seeding fails immediately.

### Production bootstrap credentials

Never commit or paste live bootstrap passwords into repository documentation. Retrieve the sensitive Vercel production value only when needed:

```bash
npm exec -- vercel env run --cwd /tmp --environment production --project shopcity-api -- sh -c 'printf "%s\\n" "$DEFAULT_ADMIN_PASSWORD"'
```

The seeded `admin@shopcity.local` and `supervisor@shopcity.local` accounts use the bootstrap password. Rotate `DEFAULT_ADMIN_PASSWORD` after operational smoke tests and update both Supabase Auth identities; do not reuse local development credentials in production.

Receipt capture now requires a physical POS receipt number, an active device, and branch context derived from the authenticated cashier or bound device. Stale or future transaction timestamps require an explicit supervisor override reason and are audited, and purchase amounts must stay within the configured approval threshold.

## Useful Commands

- `npm run prisma:generate`
- `docker compose up -d`
- `npm run start:dev`
- `npm run dev:full`
- `npm run e2e:live:prepare`
- `npm run e2e:live:test`
- `npm run e2e:live`
- `npm run e2e:live:full`

### Playwright against the running local frontend

When `shopcity-next.service` is already serving the app on port `6767`, reuse it for browser tests instead of starting a second Next.js dev server from the same checkout. Concurrent dev servers share `apps/web/.next` by default and can trigger Fast Refresh reloads or aborted route navigation.

```bash
cd apps/web
PLAYWRIGHT_BASE_URL=http://127.0.0.1:6767 \
PLAYWRIGHT_REUSE_EXISTING_SERVER=true \
npx playwright test --config ./playwright.config.ts tests/workflow-routes.spec.ts \
  -g 'verifies copy hierarchy, Cashier header typography'
```

This command requires the local frontend on port `6767` to be running. Without it, leave the default Playwright server configuration in place; do not change production configuration to work around local test-server collisions.

If Pi does not discover Graphiti automatically, see `docs/development/graphiti-workaround.md`.
