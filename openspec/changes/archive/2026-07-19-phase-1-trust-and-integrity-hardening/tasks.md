## 1. Auth and Session Hardening

- [x] 1.1 Update login resolution to require a Supabase-linked local user and reject ambiguous username fallback.
- [x] 1.2 Make session rotation atomic, remove `refreshTokenHash` usage, and enforce tenant/branch eligibility checks in authenticated context loading.
- [x] 1.3 Update auth-facing API contracts and session responses to match the new rotation model.
- [x] 1.4 Add integration coverage for concurrent session rotation and suspended tenant or inactive branch access.

## 2. Card Invariants

- [x] 2.1 Add a partial unique index so each customer can have at most one active card.
- [x] 2.2 Update card create, replace, and status flows to honor the database invariant and preserve replacement history.
- [x] 2.3 Add concurrency tests for duplicate card creation and replacement races.

## 3. Bootstrap and Provisioning

- [x] 3.1 Implement a usable administrator bootstrap flow that provisions Supabase and Prisma state together.
- [x] 3.2 Add compensating deletion and idempotent failure handling for bootstrap/provisioning errors.
- [x] 3.3 Update seed instructions, local setup docs, and the migration tracker to describe the real bootstrap path.
- [x] 3.4 Add a fresh-install test that proves the administrator can log in through the real auth flow.

## 4. Public Configuration Source of Truth

- [x] 4.1 Change the public configuration endpoint to read branch metadata from PostgreSQL instead of env-only values.
- [x] 4.2 Add a test that proves public config reflects branch edits stored in the database.

## 5. Verification and Contract Hygiene

- [x] 5.1 Remove the unused session refresh-token column from the Prisma schema and migration path after code no longer depends on it.
- [x] 5.2 Update OpenAPI and README references that describe the session and bootstrap behavior.
- [x] 5.3 Run the relevant migration, auth, card, bootstrap, and configuration integration checks and record the outcome.
