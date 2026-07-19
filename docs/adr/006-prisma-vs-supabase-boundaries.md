# ADR 006: Split Prisma and Supabase Responsibilities

## Status
Accepted

## Context
ShopCity needs a database layer and an auth layer, but those concerns should not collapse into one abstraction. The backend also needs a predictable migration path and a clear boundary for operational versus identity responsibilities.

## Decision
Use Supabase for authentication and auth-adjacent service access, and use Prisma for application-owned data access, schema control, and migrations.

## Consequences
- Auth concerns stay in the Supabase boundary.
- Application data access stays in the Prisma boundary.
- Migration rules remain centralized and auditable.
- Future extraction stays easier because the boundary is explicit.
