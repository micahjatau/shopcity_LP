# Local Setup

## Prerequisites
- Node.js
- Docker Compose
- Supabase CLI

## Setup
1. Copy `.env.example` to `.env`.
2. Start Supabase locally with `supabase start`.
3. Start local services with Docker Compose.
4. Generate the Prisma client.
5. Run `npx prisma migrate deploy`.
6. Run `npm run prisma:seed` to seed the foundation data and bootstrap the admin login.
7. Run the app in watch mode.

The bootstrap admin is `admin@shopcity.local` and requires a strong `DEFAULT_ADMIN_PASSWORD` outside tests.

## Useful Commands
- `npm run prisma:generate`
- `docker compose up -d`
- `npm run start:dev`
