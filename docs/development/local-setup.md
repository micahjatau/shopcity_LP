# Local Setup

## Prerequisites
- Node.js
- Docker Compose
- Supabase CLI

## Setup
1. Copy `.env.example` to `.env`.
2. Start local services with Docker Compose.
3. Generate the Prisma client.
4. Run `npm run prisma:seed` to seed the foundation data and bootstrap the admin login.
5. Run the app in watch mode.

The bootstrap admin is `admin@shopcity.local` and uses `password` unless `DEFAULT_ADMIN_PASSWORD` is set.

## Useful Commands
- `npm run prisma:generate`
- `docker compose up -d`
- `npm run start:dev`
