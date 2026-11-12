# Design: Admin Staff Directory and Profile Management

## User experience

Read this as an internal Admin account-management workspace. Reuse the Customer directory's ShopCity layout language: the shared centered page frame and `CashierPageHeader`, restrained white directory surface, soft search control, pill-shaped filter and primary Register action, compact table header, status badges, row-level **View profile** link, responsive mobile record cards, and five-row pagination. Keep the UI plain and task-focused; do not modify the shared Customer workflow or its existing styles.

Routes:

- `/admin/users`: searchable/filterable staff directory.
- `/admin/users/new`: staff registration form, matching the Customer registration page's dedicated-route pattern.
- `/admin/users/[userId]`: staff profile and role/status management.

All three routes remain covered by the existing `/admin/users` Operations Control route alias prefix and Admin shell authorization. No new sidebar item is added.

The directory will use the current Admin-only tenant-scoped `GET /users` contract. It will filter the returned staff locally and show five records per page, matching the current Customer directory's visible pagination behavior. Search terms are limited to in-memory values and are not added to browser storage. A status badge uses the actual backend status; missing old profile fields show **Not provided**.

Registration uses the existing Admin-only `POST /users` operation. The UI presents an **Email** label and maps it to the existing `username` API property. Required fields are first name, last name, email, phone, password, role, and branch. The role selector offers only `CASHIER`, `SUPERVISOR`, and `ADMIN`; the backend continues to reject `SYSTEM`. Branch options come from the existing tenant-scoped branch API and a branch is required, consistent with `UsersService.createUser`. On a confirmed create response with a non-empty ID, navigate to `/admin/users/{id}`. Never put the password in an API error message, UI summary, URL, persistent storage, or logging.

The profile loads the existing tenant-scoped Admin user list and matches the requested ID; no new backend detail endpoint is needed. It presents read-only identity/contact/branch/timestamp details, plus separate role and status controls that call the existing Admin-only endpoints with CSRF and idempotency keys. Keep the existing confirmation requirement. After a successful mutation, reload the tenant list and retain the requested profile ID; show accessible pending, success, error, and not-found states.

## Backend and data

Add nullable `firstName`, `lastName`, and `phoneNumber` columns to the Prisma `User` model. Nullability keeps existing staff accounts deployable without a backfill. `CreateUserDto` requires and validates those fields for new accounts; `UsersService.createUser` persists them with the existing tenant, branch, role, email, and Supabase Auth identity. Keep raw passwords solely in the existing request-to-Supabase Auth path; never add them to Prisma or audit data.

Make `UsersService.listUsers` tenant-scoped and explicitly select only directory/profile fields (ID, name, email/username, phone, role, status, branch ID, and account timestamps). Do not return `supabaseAuthId`. Record only role and branch in user-creation audit metadata so the newly stored name/phone do not add contact PII to audit records. Keep the existing roles, tenant scope, CSRF, idempotency, status/role endpoint semantics, audit behavior, and session revocation unchanged.

The migration is additive and non-destructive. Do not change Supabase schema/config or remote state. Record the migration and local fresh/upgrade evidence in `docs/database/migration-tracker.md`.

## Testing

- Frontend unit tests cover directory loading/search/filter/pagination, register navigation, required fields and role options, request payload, confirmed redirect, profile details, role/status mutations, refresh retention, and errors/not-found behavior.
- Backend service tests cover tenant-scoped safe list projection and account creation fields, Supabase email/password provisioning, absence of password in Prisma data, and privacy-minimized audit metadata. Keep `SYSTEM` rejection and branch validation covered.
- Verify the new nested routes through `matchShellRoute`/Admin shell coverage; do not add visible navigation links.
- Regenerate OpenAPI and clients from Nest DTOs; run Prisma validation and migration verification on disposable/local test infrastructure only.
- Run focused Jest, frontend typecheck/lint, Playwright route flow, backend tests, OpenSpec validation, and GitNexus diff detection. Static-analysis CLI is unavailable in this environment; record that limitation and perform targeted auth/data-flow review.
