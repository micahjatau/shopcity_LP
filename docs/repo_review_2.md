# Latest `shopcity_LP` review

The current head is commit **`0801b3dbf33f5061da9bc5f4005fd7882f6f5896` — `chore: harden phase 1 integrity`**. It directly addresses most findings from the previous review.

## Updated verdict

> **This is the strongest state of the repository so far. Phase 1 is substantially implemented, but it is not yet safe to use as the foundation for the financial ledger.**

| Area                        | Current maturity |
| --------------------------- | ---------------: |
| Runtime foundation          |          **90%** |
| Authentication and RBAC     |          **70%** |
| Database deployability      |          **75%** |
| Customers/cards/master data |          **75%** |
| API documentation           |          **70%** |
| Automated testing           |          **60%** |
| Loyalty ledger              |         **0–5%** |
| Overall backend MVP         |       **45–50%** |

The previous review identified eight major blockers. Roughly five have been properly addressed, while three remain only partially resolved.

---

# What was fixed properly

## Financial values are now expressed correctly in kobo

The repository now uses:

- ₦500 → `50000` kobo
- ₦100,000 → `10000000` kobo
- ₦200,000 → `20000000` kobo
- ₦5,000 → `500000` kobo

This removes the previous factor-of-100 error.

## A real Prisma migration now exists

The migration creates all Phase 1 tables, enums, indexes and foreign keys.

The integration test now launches PostgreSQL through Testcontainers and executes `prisma migrate deploy` before testing the services.

That is a genuine improvement over the previous fake-Prisma test.

## Auth responses no longer expose hashes

Login, session rotation and `/auth/me` now return only:

- User ID
- Username
- Role
- Branch ID
- Session expiry

The controller uses this safe response instead of returning the complete Prisma session object.

## CSRF handling was meaningfully corrected

Unsafe requests now require:

- A CSRF header
- A CSRF cookie
- Matching header and cookie values
- A matching server-side hash

Production cookies now receive the `Secure` attribute.

## Mutation and audit writes are now transactional

Customer, card, branch and user mutations generally write their audit entries in the same Prisma transaction. For example, customer creation and its audit record now commit together.

`AuditService` now supports the transaction-scoped Prisma client.

## CI gates were restored

CI now runs:

- Prisma generation and validation
- Build
- Formatting
- ESLint
- Dependency Cruiser
- Type checking
- OpenAPI linting
- Unit, E2E and integration tests
- OpenAPI diff and generated-file drift checks

## OpenAPI request schemas are no longer empty

DTOs now use Swagger metadata and stronger enum/UUID validators.

This makes the generated API contract materially more useful to the frontend team.

---

# Remaining release blockers

## P0 — Redemption defaults still conflict with the agreed product requirements

You originally specified:

- Redemption available immediately
- No minimum redemption
- No maximum percentage of a basket

The repository currently publishes:

```text
Minimum redemption: ₦500
Maximum basket coverage: 30%
```

The configuration test explicitly locks in those values.

Unless ShopCity has subsequently approved the recommended restrictions, the implementation should currently be:

```env
MIN_REDEMPTION_KOBO=0
MAX_REDEMPTION_BASKET_PERCENT=100
```

`MAX_REDEMPTION_BASKET_PERCENT` is not present in `.env.example`, despite being an active policy variable.

This must be resolved before the ledger because it determines whether valid redemption requests are accepted or rejected.

---

## P0 — The session “refresh” implementation is still incomplete

The design says the system should use active-session rotation rather than pretend to implement a refresh-token family.

However, the database still stores a `refreshTokenHash`.

`issueSession()` still generates and hashes a refresh token, but the token is never returned, stored in a browser cookie or used to authenticate anything.

The current renewal sequence is also non-atomic:

1. Read active session.

2. Revoke old session.

3. Start a separate transaction to create the new session.

Consequences:

- If new-session creation fails, the user is unexpectedly logged out.
- Two concurrent refresh requests can both observe the session as active.
- Multiple replacement sessions may be created.
- The endpoint cannot renew an expired session because the global session guard rejects it before the controller runs.

### Correct direction

Since the stated decision is active-session rotation:

- Remove `refreshTokenHash`.
- Rename `/auth/refresh` to something explicit such as `/auth/session/rotate`.
- Revoke the old session and create the new session in one transaction.
- Use a conditional update requiring `status = ACTIVE`.
- Require exactly one affected row before creating the replacement.

---

## P0 — Card uniqueness is still enforced only through application prechecks

`createCard()` checks whether the customer already has an active card before entering its transaction.

There is no database constraint allowing only one active card per customer. The schema has an ordinary index, not an active-card uniqueness rule.

Two simultaneous assignment requests can therefore both pass the check and create two active cards.

The same race exists during replacement:

1. Both requests read the current card as active.
2. Both create replacement cards.
3. Both update the original.
4. One `replacedByCardId` overwrites the other.
5. Both replacement cards may remain active.

There are also state-machine gaps:

- A `REPLACED` card can be changed back to `ACTIVE`.
- A blocked old card can be reactivated after a different card has been assigned.
- Reactivation does not verify that the customer remains active.
- Reactivation does not check for another active card.

### Required fix

Add a PostgreSQL partial unique index:

```sql
CREATE UNIQUE INDEX "Card_one_active_per_customer"
ON "Card" ("tenantId", "customerId")
WHERE "status" = 'ACTIVE';
```

Then enforce transitions explicitly:

```text
ACTIVE → BLOCKED
ACTIVE → REPLACED
BLOCKED → ACTIVE only when no other active card exists
REPLACED → terminal
```

---

## P0 — Tenant integrity is still not enforced by foreign keys

A device, user, customer or card stores both:

- Its own `tenantId`
- A related branch/customer ID

But the foreign keys validate those columns independently.

For example, a customer can theoretically have:

```text
tenantId = tenant A
branchId = branch belonging to tenant B
```

The service prevents this during the current customer-creation path, but the database does not.

That becomes dangerous once workers, imports, receipts and ledger operations are added.

Use composite keys such as:

```text
Branch: unique(id, tenantId)
Customer: FK(branchId, tenantId) → Branch(id, tenantId)

Customer: unique(id, tenantId)
Card: FK(customerId, tenantId) → Customer(id, tenantId)
```

Application validation is helpful. Database-level tenant integrity is mandatory for financial records.

---

# Authentication and provisioning issues

## Supabase provisioning still leaves orphan identities on failure

User creation performs:

1. Supabase identity creation.
2. Prisma transaction for local user and audit record.

If the database transaction fails, the Supabase account remains but no local ShopCity user exists.

Add compensation:

```text
Create Supabase identity
→ Create local user and audit
→ On database failure, delete the new Supabase identity
```

A longer-term solution would use a provisioning-status record and reconciliation job.

## The seed does not create a usable authentication identity

The seed creates a local admin record with:

```text
username: admin@shopcity.local
supabaseAuthId: seed-admin-supabase-user
```

It does not create the corresponding Supabase user or establish a password. A fresh installation therefore cannot log in after running only the seed.

The README’s setup instructions also omit:

- `prisma migrate deploy`
- `prisma:seed`
- Starting or configuring Supabase
- Creating the initial Supabase administrator

There is currently a bootstrap gap: users can only be created through an authenticated admin, but a working initial authenticated admin is not created by the repository setup.

## Session authorization ignores tenant and branch status

The guard checks:

- Session status
- Session expiry
- User status

It does not verify that the tenant is active or that the user’s branch is active.

A user in a suspended tenant or inactive branch can therefore continue operating.

Load the user with tenant and branch status, or include their state in a centralized authorization lookup.

## Every authenticated request performs a session write

`SessionGuard` updates `lastUsedAt` for every request.

This will create:

- Extra database load
- Session-row contention
- More replication/write-ahead log traffic
- Latency on otherwise read-only endpoints

Throttle this update, for example only when the existing timestamp is more than five minutes old.

---

# Cookie and bearer-auth inconsistency

The session guard accepts either:

- `Authorization: Bearer <opaque-session-token>`
- The session cookie

Swagger documents bearer authentication.

But every unsafe request must also supply both a CSRF header and CSRF cookie.

That makes bearer-only requests impractical. A non-browser API client with a valid bearer session still needs a CSRF cookie.

Choose one clear model:

### Browser-only MVP

- Cookie session authentication
- CSRF required
- Remove bearer auth from Swagger and `SessionGuard`

### Dual browser/API model

- Cookie-authenticated requests require CSRF
- Bearer-authenticated requests do not
- Mark the resolved authentication method on the request
- Document both schemes correctly

For the current existing-POS browser deployment, browser-only cookie sessions are probably the cleaner MVP boundary.

---

# Public configuration can drift from database state

The public configuration reads tenant/branch details from environment variables and constants, not from the seeded database rows.

However, the admin API can update:

- Branch name
- Timezone
- Receipt week start day

After such an update:

- The database may say the receipt week starts Sunday.
- The public configuration may continue saying Monday.
- The frontend and backend can derive different receipt-week boundaries.

The public configuration should query the active seeded branch by `DEFAULT_PUBLIC_BRANCH_ID`. Financial policy may remain environment-driven for the single-store MVP, but branch metadata should come from the database.

---

# Phone-number validation is still incomplete

The customer DTO accepts any string.

The service considers a normalized value valid merely because it begins with `+`.

A value such as `"1"` can normalize into an invalid but accepted Nigerian phone number.

Use a proper phone parser or enforce:

```text
+234 followed by exactly 10 valid national digits
```

Also trim and normalize names, emails, barcodes and search strings before persistence.

---

# Testing assessment

The Phase 1 test now uses a genuine PostgreSQL container and runs the migration. That deserves credit.

But it is still a **service integration test**, not an application integration test:

- NestJS is not booted.

- HTTP endpoints are not called.

- Session, CSRF and role guards are bypassed.

- Supabase is mocked.

- Audit writes are stubbed.

- No concurrency cases are tested.

- The seed script is not tested.

- Cross-tenant foreign-key behavior is not tested.

The hardening design specifically stated that the tests should prove Prisma, HTTP and migration behavior.

Therefore, the OpenSpec task claiming the mocked coverage has been fully replaced is only partially satisfied.

Add a separate HTTP integration suite that boots the Nest application and tests:

1. Login and safe response shape.
2. Missing or mismatched CSRF.
3. Cashier attempting supervisor actions.
4. Suspended-user rejection.
5. Customer registration.
6. Duplicate registration.
7. Card assignment and replacement.
8. Blocked-customer card lookup.
9. Concurrent active-card assignment.
10. Concurrent session rotation.

---

# Migration-tracker wording is too strong

The tracker says:

> “restore/deploy path is now proven against a clean database.”

The test proves fresh migration deployment. It does not prove:

- Backup creation
- Backup restoration
- Point-in-time recovery
- Migration against an existing database
- Rollback

Rename the check to **“Fresh migration deploy verified”** until a real restore test is performed.

---

# CI status

The workflow definition is now appropriately comprehensive. However, GitHub exposed no combined statuses or workflow runs for the latest commit through the connector.

That does not prove CI failed, but it means I cannot independently confirm that the new pipeline completed successfully.

---

# Recommended next implementation sequence

## PR 1 — Product rules and configuration

- Resolve the no-minimum/no-cap redemption conflict.
- Add `MAX_REDEMPTION_BASKET_PERCENT` to `.env.example` and README.
- Read branch configuration from PostgreSQL.
- Add tests verifying configured business rules.

## PR 2 — Session semantics

- Remove unused refresh-token storage.
- Make active-session rotation atomic.
- Rename the endpoint to reflect its actual behavior.
- Decide between cookie-only and dual cookie/bearer authentication.
- Check tenant and branch status.
- Throttle `lastUsedAt` updates.

## PR 3 — Database invariants

- Add composite tenant foreign keys.
- Add one-active-card partial uniqueness.
- Enforce card state transitions.
- Add concurrent assignment and replacement tests.

## PR 4 — Bootstrap and provisioning

- Make the seed create or document a usable Supabase identity.
- Add Supabase provisioning compensation.
- Document the full fresh-install sequence.
- Add an initial-admin bootstrap procedure.

## PR 5 — Real HTTP integration

- Boot NestJS against Testcontainers.
- Exercise guards and controllers.
- Verify transactional audit records.
- Test concurrency and failure recovery.

---

# Bottom line

This hardening commit is a **substantial improvement**. It fixed the previous financial-unit error, unsafe auth responses, incomplete CSRF protection, missing migration, fake database tests, transactional-audit problem, empty request schemas and weakened CI.

The repository has moved from **“Phase 1 prototype”** to **“credible Phase 1 implementation.”**

It is still premature to start the immutable loyalty ledger because the remaining issues sit directly underneath it:

1. Unconfirmed redemption rules.
2. Non-atomic session rotation.
3. Race-prone card uniqueness.
4. Missing database-level tenant consistency.
5. Incomplete initial-admin provisioning.

Once those five are resolved, the backend will be in a defensible position to begin receipts, earning transactions and the append-only loyalty ledger.
