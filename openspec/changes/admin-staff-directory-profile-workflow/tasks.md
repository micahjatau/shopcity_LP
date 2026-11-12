# Tasks: Admin Staff Directory and Profile Management

## 1. Backend profile contract

- [x] 1.1 Add nullable first/last name and phone fields to the Prisma User model and create an additive migration; preserve existing accounts.
- [x] 1.2 Require and validate first name, last name, and phone on new user creation; persist them through the existing Admin-only account-provisioning path.
- [x] 1.3 Return a tenant-scoped safe user projection without Supabase identity IDs; keep role/status/session/audit authorization backend-owned and minimize create-audit metadata.
- [x] 1.4 Add backend tests for list projection, creation fields, branch/role validation, password handling, and audit metadata.

## 2. Staff directory and registration

- [x] 2.1 Replace the inline Admin Users page with a customer-style responsive directory, search, status filter, empty/error/loading states, five-row pagination, and View profile links.
- [x] 2.2 Add `/admin/users/new` registration with first/last name, email, phone, password, supported role selection, and required tenant branch selection.
- [x] 2.3 Submit through the existing Admin API, avoid persisting/logging password state, and navigate only after a verified success response with a stable user ID.

## 3. Staff profile management

- [x] 3.1 Add `/admin/users/[userId]` with staff contact, role, status, branch, and available account timestamps.
- [x] 3.2 Reuse existing role/status APIs, explicit UPDATE confirmation, CSRF/idempotency headers, and preserve the selected profile after refresh.
- [x] 3.3 Cover loading, missing/out-of-tenant user, update success/error, and return-to-directory states.

## 4. Contract, migration, and verification

- [x] 4.1 Regenerate OpenAPI and typed clients from the updated Nest DTOs; update the migration tracker.
- [x] 4.2 Add focused frontend unit and Playwright coverage for the register → profile → role/status workflow and nested Admin route access.
- [x] 4.3 Run backend and web tests, typecheck, targeted lint/format, Prisma validation/integration migration checks, build, OpenSpec validation, and GitNexus staged/worktree detection; document unavailable static-analysis tools and preserve unrelated worktree edits.

## Verification notes

- The full integration run applied the new migration in disposable Testcontainers. Its initial run had 32 passing suites and two historical migration-cutoff fixture failures caused by the current Prisma client expecting the new nullable fields. The fixtures were changed to raw SQL for legacy user inserts, preserving their historical schemas; the two affected suites then passed in a focused rerun (3 passed, 1 skipped). The full suite was not rerun after that fixture-only fix.
- Semgrep is unavailable in this environment. TypeScript lint, typechecks, focused unit tests, Prisma validation, OpenAPI lint, and OpenSpec validation were run instead.
- The worktree-wide GitNexus scan reports HIGH risk across extensive pre-existing unrelated changes; no files were staged or committed.
