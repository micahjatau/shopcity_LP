# Local Setup

## Prerequisites

- Node.js
- Docker Compose
- Supabase CLI

## Setup

1. Copy `.env.example` to `.env`.
2. Start Supabase locally with `supabase start`.
3. Run `supabase status` and copy the reported `API URL`, `anon key`, and `service_role key` into `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
4. Start local services with Docker Compose.
5. Generate the Prisma client.
6. Run `npx prisma migrate deploy`.
7. Run `npm run prisma:seed` to seed the foundation data and bootstrap the admin login.
8. Run the app in watch mode.

The bootstrap admin is `admin@shopcity.local` and requires a strong `DEFAULT_ADMIN_PASSWORD` outside tests. If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing, seeding fails immediately.

## Useful Commands

- `npm run prisma:generate`
- `docker compose up -d`
- `npm run start:dev`
