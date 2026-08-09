# Latest `shopcity_LP` review

The current head is **`20a810c85b2bc51e8ce5a560ce64e7579b99aba3` — `chore: archive phase 1 foundation changes`**. It adds HTTP-level authentication coverage, adjusts session/CSRF handling and updates bootstrap documentation.

## Verdict

> **Phase 1 is now demonstrably runnable over HTTP, but the foundation is still not strong enough for the financial ledger.**

| Area                        | Maturity |
| --------------------------- | -------: |
| Runtime and CI foundation   |  **90%** |
| Auth/session implementation |  **75%** |
| Database deployability      |  **80%** |
| Customers/cards/master data |  **75%** |
| OpenAPI documentation       |  **70%** |
| Integration testing         |  **68%** |
| Loyalty ledger              | **0–5%** |
| Overall backend MVP         |  **50%** |

The latest change improves confidence in the application boundary. It does not resolve several concurrency, tenancy and bootstrap problems underneath that boundary.

---

# What improved

## Real HTTP integration coverage now exists

The new suite:

- Starts a real PostgreSQL Testcontainer

- Applies Prisma migrations

- Boots the Nest application

- Exercises login, `/auth/me`, CSRF rejection, session rotation, stale-session rejection and logout

- Verifies readiness over HTTP

This is a significant improvement over service-only integration tests.

## Session revocation and creation now share a transaction

The old session is revoked and the replacement session is created inside one Prisma transaction.

That removes the earlier failure mode where the old session could be revoked and new-session creation could fail in an unrelated transaction.

## Bootstrap instructions are clearer

The README now includes:

```bash
docker compose up -d
npx prisma migrate deploy
npm run prisma:seed
npm run test:integration
npm run start:dev
```

## The CSRF implementation is structurally better

Unsafe requests now resolve an authenticated context and still require:

- CSRF header
- CSRF cookie
- Matching values
- Matching server-side hash

---

# Critical blockers

## P0 — Concurrent session rotation is still unsafe

The rotation process currently:

1. Reads the session before starting the transaction.
2. Confirms that it is active.
3. Starts a transaction.
4. Updates the session by ID without requiring `status = ACTIVE`.
5. Creates a replacement session.

Two simultaneous requests can both read the same session as active. Both can then revoke it and both can create replacement sessions.

The fix should be an atomic conditional update:

```ts
const result = await tx.session.updateMany({
  where: {
    id: sessionId,
    status: SessionStatus.ACTIVE,
    expiresAt: { gt: new Date() },
  },
  data: {
    status: SessionStatus.REVOKED,
    revokedAt: new Date(),
  },
});

if (result.count !== 1) {
  throw new UnauthorizedException('Session already rotated');
}
```

Only then should the new session be created inside the same transaction.

The new HTTP test validates one normal rotation, but it does not test concurrent rotation.

---

## P0 — The unused refresh-token contract remains

The design says this is an opaque session-rotation model, not a refresh-token family. However, every new session still generates and stores a `refreshTokenHash`, even though the refresh token is never returned or used.

The schema still requires the field.

This should be removed through a migration. Otherwise, the database advertises a security mechanism that does not exist.

The endpoint should also be renamed from:

```http
POST /auth/refresh
```

to something clearer:

```http
POST /auth/session/rotate
```

The current controller still exposes `/auth/refresh`.

---

## P0 — Login can resolve the wrong tenant account

After Supabase authentication, the backend searches for a local user using:

```ts
OR: [{ supabaseAuthId: data.user.id }, { username }];
```

But usernames are only unique **within a tenant**, not globally.

If the Supabase identity linkage is missing or stale, the username fallback can match an arbitrary tenant’s user because no tenant is supplied to `findFirst`.

The safest policy is:

```text
Supabase identity ID → exactly one ShopCity user
```

Login should resolve only through `supabaseAuthId`. Identity linking should happen through an explicit provisioning or reconciliation process, not implicitly during login.

---

## P0 — The documented bootstrap still does not create a usable administrator

The README tells a new developer to migrate, seed and start the app.

But the seed creates only a local Prisma user with a placeholder Supabase ID:

```text
admin@shopcity.local
seed-admin-supabase-user
```

It does not create the corresponding Supabase Auth identity or password.

Therefore, after following the documented fresh-install steps, the administrator still cannot log in through the real authentication flow.

You need one of these:

1. A bootstrap command that creates both Supabase and Prisma identities.
2. A documented Supabase CLI command followed by a linking command.
3. A one-time administrator invitation/bootstrap token.

Until that exists, the setup is reproducible at the database layer but not operationally usable.

---

# Database integrity remains incomplete

## One-active-card-per-customer is still not enforced by PostgreSQL

The card service checks for an existing active card before creating one.

The database has only a normal index on tenant, customer and status. It has no uniqueness rule preventing two active cards.

Concurrent requests can still create two active cards.

Add:

```sql
CREATE UNIQUE INDEX "Card_one_active_per_customer"
ON "Card" ("tenantId", "customerId")
WHERE "status" = 'ACTIVE';
```

Card replacement must then lock or conditionally update the old card before inserting the new active card.

## Card replacement still has a concurrency race

Replacement currently:

1. Reads the card as active.
2. Creates the new card.
3. Updates the old card to `REPLACED`.

Two simultaneous replacements can both pass the initial status check and create separate active cards.

Use either:

- `SELECT ... FOR UPDATE`
- Serializable transaction isolation with retry
- Conditional `updateMany` against `status = ACTIVE`
- A database uniqueness constraint plus deterministic conflict handling

## Tenant consistency is still application-only

The database separately references:

- `tenantId`
- `branchId`
- `customerId`

But it does not guarantee that the branch or customer belongs to the same tenant.

This allows invalid states through imports, workers, raw scripts or future bugs even when current services validate correctly.

Composite tenancy foreign keys should be established before the ledger:

```text
Customer(branchId, tenantId) → Branch(id, tenantId)
Card(customerId, tenantId) → Customer(id, tenantId)
Device(branchId, tenantId) → Branch(id, tenantId)
User(branchId, tenantId) → Branch(id, tenantId)
```

---

# Authentication design issues

## Tenant and branch status are not checked

The session guard validates:

- Session status
- Session expiry
- User status

It loads only the user, not the tenant or branch.

A user may remain authenticated while:

- Their tenant is suspended
- Their branch is inactive

Authentication context should include tenant and branch status, and access should be rejected when either is unavailable for operations.

## Every authenticated request writes to the session table

The guard updates `lastUsedAt` on every request.

That creates unnecessary writes and row contention.

Only update when the timestamp is stale:

```text
Update lastUsedAt when older than five minutes
```

This can be done with a conditional `updateMany`.

## Bearer and cookie authentication remain inconsistent

The session guard accepts both bearer tokens and cookies.

But the CSRF guard requires a CSRF cookie and matching header for all unsafe authenticated requests.

Therefore, a bearer-authenticated API client cannot practically use POST/PATCH/DELETE without also behaving like a browser.

For this MVP, the cleaner model is probably:

> Cookie session authentication for the POS browser, with CSRF protection.

Remove bearer authentication unless a real non-browser API consumer exists.

---

# User provisioning remains non-atomic across systems

Creating a staff user still follows:

1. Create Supabase user.
2. Start Prisma transaction.
3. Create local user.
4. Create audit entry.

If the Prisma transaction fails, the Supabase identity is orphaned.

Add compensating deletion:

```text
Supabase create succeeds
Database transaction fails
→ delete newly created Supabase user
```

Also create a reconciliation report for:

- Supabase identities without local users
- Local users without Supabase identities

---

# Configuration still has two sources of truth

Public tenant, branch and policy configuration comes from environment variables and constants.

But branch configuration can be edited in PostgreSQL.

This means an administrator can change the branch timezone or receipt-week start in the database while the public configuration continues returning the old environment value.

The public configuration endpoint should read branch metadata from PostgreSQL.

Financial policies should also eventually live in a versioned `ProgramConfiguration` table rather than environmental configuration, particularly because policy changes need:

- Effective dates
- Audit records
- Historical reproducibility
- Controlled administrative approval

---

# Testing assessment

## Strong improvement

The HTTP integration test now genuinely proves:

- Nest application boot
- Route configuration
- Session cookies
- CSRF enforcement
- Session rotation
- Stale-session rejection
- Logout
- PostgreSQL migration deployment

## But Redis is still simulated

The test does not run Redis in Testcontainers. It creates a raw TCP server that replies `+PONG` to any input.

The migration tracker describes this as “Testcontainers-backed Postgres + Redis,” which is inaccurate.

Either:

- Use a real Redis container, or
- Rename the tracker entry to “PostgreSQL Testcontainer plus simulated Redis protocol endpoint.”

## Missing high-value tests

Add tests for:

- Concurrent session rotation
- Concurrent card assignment
- Concurrent card replacement
- Suspended tenant
- Inactive branch
- Bearer-authenticated unsafe request behavior
- Supabase provisioning compensation
- Initial-administrator bootstrap
- Cross-tenant relation rejection
- Audit records committed with the mutation

---

# Process concern: the changes were archived too early

The repository now marks the authentication/bootstrap hardening tasks complete and archives them.

But the implementation still has:

- Concurrent rotation race
- Unused refresh-token storage
- Incomplete authentication bootstrap
- No tenant/branch status enforcement
- Inconsistent bearer/CSRF behavior

The archive should represent verified completion, not merely the end of an implementation pass.

---

# CI visibility

The CI definition remains comprehensive, but no workflow runs were visible for the current commit through the repository connector.

That does not establish that CI failed, but the latest commit cannot be treated as independently verified from the available evidence.

---

# Recommended next sequence

## PR 1 — Session correctness

- Remove `refreshTokenHash`
- Rename rotation endpoint
- Make rotation conditionally atomic
- Add concurrent rotation test
- Check tenant and branch status
- Throttle `lastUsedAt`
- Choose cookie-only or dual authentication

## PR 2 — Database invariants

- Add composite tenant foreign keys
- Add one-active-card partial unique index
- Implement safe card state transitions
- Add concurrent card tests

## PR 3 — Bootstrap and provisioning

- Create a usable initial Supabase administrator
- Add provisioning compensation
- Add identity reconciliation
- Test a completely fresh installation

## PR 4 — Configuration source of truth

- Read branch configuration from PostgreSQL
- Lock launch redemption rules
- Introduce versioned program configuration

## PR 5 — Begin the ledger

Only after those are complete:

- Receipt-week derivation
- Receipt uniqueness
- Idempotency
- Immutable ledger
- Credit lots
- Transactional outbox

## Bottom line

The repository is moving in the right direction. The newest change adds the first meaningful end-to-end proof that authentication works through the actual Nest application.

But it mainly strengthens **test visibility**, not the underlying database invariants.

The backend should not begin recording money-like credit until these four issues are resolved:

1. Concurrent session rotation.
2. One-active-card enforcement.
3. Cross-tenant database integrity.
4. A reproducible, usable authentication bootstrap.

Once those are closed, Phase 1 can be considered genuinely complete rather than administratively archived.
