## Context

The current foundation is operational, but several critical guarantees are still enforced only by application code or not enforced at all: login can fall back to tenant-ambiguous usernames, session rotation stores an unused refresh-token hash, card creation/replacement is not protected by a database uniqueness rule, the seeded administrator is not actually usable through the real auth flow, and public branch config can drift from PostgreSQL.

This change hardens the pre-ledger boundary. It touches auth, users, cards, branches, configuration, seed/bootstrap, Prisma schema, and integration tests.

## Goals / Non-Goals

**Goals:**
- Make session rotation and revocation safe under concurrency.
- Remove tenant-ambiguous login resolution.
- Enforce active-card uniqueness at the database level.
- Make the first administrator usable after a fresh install.
- Ensure public branch config reflects database state.
- Reject protected access when the tenant or branch is not eligible.

**Non-Goals:**
- Implementing the loyalty ledger.
- Versioning all policy values into a new program-configuration table.
- Reworking every auth transport choice in the app.
- Building a full identity reconciliation worker.

## Decisions

### 1. Keep opaque session tokens and remove the unused refresh-token contract
The session model should remain opaque-session based rather than becoming a JWT/refresh-token family. The backend will stop depending on `refreshTokenHash` and will treat rotation as a single-session replacement flow.

Alternatives considered:
- Refresh-token family with token reuse detection.
- JWT-based access plus refresh tokens.

Why this path:
- The implementation already uses opaque hashed session tokens.
- The refresh-token column is currently dead weight and creates contract confusion.
- Removing it reduces model surface area before ledger work begins.

### 2. Resolve login only through `supabaseAuthId`
Login should authenticate the Supabase user first, then resolve exactly one local account by linked identity. Username fallback should not participate in login resolution.

Alternatives considered:
- Keep username fallback and add tenant scoping.
- Reconcile missing links during login.

Why this path:
- Username fallback is ambiguous across tenants if linkage is missing or stale.
- Login is the wrong place to repair identity drift.
- Hard rejection makes the trust boundary explicit.

### 3. Load tenant and branch eligibility as part of authenticated context
The auth context should include tenant and branch status checks so a suspended tenant or inactive branch cannot continue to use protected routes.

Alternatives considered:
- Check only user status.
- Defer tenant/branch checks to each feature service.

Why this path:
- A single auth boundary is easier to reason about and test.
- Feature-by-feature checks invite drift and missed edge cases.

### 4. Enforce one active card per customer in PostgreSQL
Use a partial unique index on active cards, then keep application checks for friendly errors. Replacement should flip the current card out of ACTIVE before inserting the replacement, and status reactivation must obey the same uniqueness rule.

Alternatives considered:
- Keep app-only validation.
- Use serializable isolation everywhere.
- Use row locks for all card mutations.

Why this path:
- The database must be the source of truth for uniqueness.
- The partial index is simple and directly expresses the invariant.
- Application checks still help with readable errors, but they are not the authority.

### 5. Add a real bootstrap path for the first administrator
The install path should provision a real Supabase identity and a linked local admin account, with a compensating deletion if the local transaction fails.

Alternatives considered:
- Keep the seed-only placeholder admin.
- Require manual Supabase CLI steps with no helper.
- Add a reconciliation job first.

Why this path:
- Fresh install must be immediately usable.
- A bootstrap command is more reliable than asking operators to manually stitch identities together.
- Compensating deletion keeps Supabase from accumulating orphaned admin identities.

### 6. Read public branch config from PostgreSQL
The public configuration endpoint should source branch timezone and receipt-week settings from the branch row in PostgreSQL instead of env-only values.

Alternatives considered:
- Keep env as the public source of truth.
- Introduce a versioned policy table now.

Why this path:
- Branch metadata is already editable in the database.
- Public config should reflect the authoritative runtime state.
- Policy versioning is bigger than this change and can land separately.

## Risks / Trade-offs

- [Risk] Dropping `refreshTokenHash` may require careful rollout ordering. → Mitigation: deploy code that stops relying on it before removing the column, and keep a backup of the pre-migration schema.
- [Risk] Existing data could violate the active-card uniqueness rule. → Mitigation: validate and clean duplicate active cards before applying the partial unique index.
- [Risk] Hard login rejection for missing `supabaseAuthId` can block stale accounts. → Mitigation: handle identity repair explicitly through the bootstrap/provisioning path rather than at login.
- [Risk] A bootstrap command adds one more operator workflow. → Mitigation: document it alongside seed and migration steps and keep it idempotent.
- [Risk] Reading branch config from PostgreSQL adds a query to a public endpoint. → Mitigation: keep the payload small and rely on the already indexed branch lookup path.

## Migration Plan

1. Add the database constraint for one active card per customer and clean any duplicate active-card data before enforcing it.
2. Update auth code to stop depending on `refreshTokenHash`, switch login resolution to `supabaseAuthId`, and include tenant/branch status checks in authenticated context loading.
3. Update card mutation flows so replacement and reactivation obey the new database invariant.
4. Add the administrator bootstrap flow that provisions Supabase and local Prisma state together, with compensating deletion on failure.
5. Update public configuration to read branch metadata from PostgreSQL.
6. Remove the unused `refreshTokenHash` column after the new code is deployed and verified.

Rollback strategy:
- Revert application code first if any runtime regression appears.
- Keep the schema backup so the removed session column can be restored if necessary.
- If the card uniqueness migration surfaces bad legacy data, restore from backup and clean the duplicate rows before retrying.

## Open Questions

- Should bearer auth remain supported for this phase, or should the session transport be narrowed later?
- Should the administrator bootstrap live as a dedicated CLI command, or stay as an enhanced seed workflow?
- Should policy values remain env-backed for now, or is there appetite to fold them into a later versioned configuration table?
