## 1. Storage and API

- [x] 1.1 Add the tenant/customer/branch/actor-scoped marketing-preference event model and additive append-only migration.
- [x] 1.2 Add an authenticated, branch-bound, idempotent withdrawal endpoint; commit the event, audit entry, and replay response atomically.
- [x] 1.3 Derive current preference from the immutable registration snapshot and later preference events; expose it with the authorized profile projection and generated OpenAPI/client artifacts.
- [x] 1.4 Update `docs/database/migration-tracker.md`; do not apply the migration to a shared environment.

## 2. In-store flow

- [x] 2.1 Add a cashier customer-profile action and confirmation flow that records only an in-person marketing request and plainly distinguishes it from account/data deletion.
- [x] 2.2 Show original registration choice separately from current preference/withdrawal time in the authorized customer profile.
- [x] 2.3 Keep transactional/service-message flows unchanged; tell staff to update any separate campaign list manually because automatic synchronization is not implemented.

## 3. Verification

- [x] 3.1 Add unit/controller tests for branch/tenant authorization, audit provenance, append-only writes, failure rollback, idempotent replay, changed-payload conflict, and original-consent immutability.
- [x] 3.2 Add frontend tests for explicit in-person confirmation, scope copy, success/retry/error states, and internal-ID privacy.
- [x] 3.3 Verify migration fresh deploy and append-only trigger in a disposable Testcontainers database; run Prisma validation/generation, OpenAPI/client generation, focused backend/web tests, lint/typecheck, and diff checks.
- [x] 3.4 Run OpenSpec validation and GitNexus detect-changes; preserve unrelated dirty worktree changes. GitNexus reported CRITICAL for the workspace-wide unstaged delta (61 files, 212 symbols, 33 flows); unrelated pre-existing changes were preserved and nothing was staged or committed.
