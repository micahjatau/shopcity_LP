# ADR 006: Split Prisma and Supabase Responsibilities

## Status
Accepted

## Context
ShopCity needs a database layer and an auth boundary, but those concerns should not collapse into one abstraction. The backend also needs a predictable migration path and a clear split between identity verification, application sessions, and application data ownership.

## Decision
Use Supabase for staff identity and password verification. Use the ShopCity backend for application sessions, CSRF enforcement, RBAC, suspension enforcement, throttling, and audit logging. Use Prisma for application-owned data access, schema control, and migrations.

## Consequences
- Supabase owns identity verification, but application session state is backend-owned.
- Session cookies, refresh rotation, and revocation stay in the ShopCity boundary.
- Role changes and suspension decisions invalidate or block access according to backend policy.
- `system` is reserved for backend automation and cannot be assigned to human users.
- Application data access stays in the Prisma boundary.
- Migration rules remain centralized and auditable.
- Future extraction stays easier because the boundary is explicit.
