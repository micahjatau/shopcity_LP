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

The bootstrap admin is `admin@shopcity.local` and requires a strong `DEFAULT_ADMIN_PASSWORD` outside tests, not the repository placeholder. If `SUPABASE_URL`, `SUPABASE_ANON_KEY`, or `SUPABASE_SERVICE_ROLE_KEY` is missing, seeding fails immediately.

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

If Pi does not discover Graphiti automatically, see `docs/development/graphiti-workaround.md`.
