## 1. Policy and configuration

- [x] 1.1 Correct the kobo policy defaults in env validation and public configuration.
- [x] 1.2 Update `.env.example`, README environment notes, and public config docs to match the active policy values.
- [x] 1.3 Remove hardcoded public tenant/branch identifiers or replace them with a seed-backed source of truth.

## 2. Schema and deployability

- [x] 2.1 Create the Prisma migration for the Phase 1 schema.
- [x] 2.2 Add or update seed data for the foundation tenant, branch, admin, and public configuration.
- [x] 2.3 Record the migration and restore/backup verification in `docs/database/migration-tracker.md`.

## 3. Auth, session, and CSRF hardening

- [x] 3.1 Replace the unsafe auth response shape with a DTO that hides session hashes and internal identity records.
- [x] 3.2 Make session renewal semantics explicit and remove the misleading refresh-token contract.
- [x] 3.3 Require a valid CSRF header plus cookie match for unsafe requests.
- [x] 3.4 Mark production cookies `Secure` and keep the browser auth model consistent.

## 4. OpenAPI contract quality

- [x] 4.1 Add DTO metadata decorators so request schemas are populated in Swagger.
- [x] 4.2 Add explicit response DTOs or schema metadata for the main Phase 1 endpoints.
- [x] 4.3 Keep the runtime envelope documented for success and error responses.

## 5. Domain invariants and audit integrity

- [x] 5.1 Enforce customer phone and status invariants consistently with the database policy.
- [x] 5.2 Tighten card state transitions and blocked-customer lookup behavior.
- [x] 5.3 Validate branch, device, and user tenant scope before persistence.
- [x] 5.4 Move mutation and audit writes into a single transactional boundary where needed.

## 6. Integration tests and CI gates

- [x] 6.1 Replace the mocked Phase 1 integration coverage with real database-backed tests.
- [x] 6.2 Add tests for auth/session safety, CSRF behavior, and public configuration correctness.
- [x] 6.3 Restore the baseline CI checks for build, Prisma validation, architecture, OpenAPI linting, and contract drift.
