# Latest `shopcity_LP` review

The current head is **`b726eb41ec471a5740d5f4771d93b7ad930d5c5b` — `chore: harden trust and integrity`**.

## Verdict

This is another meaningful improvement. Most of the previously identified authentication and card-concurrency weaknesses are now genuinely fixed.

> **The Phase 1 foundation is approximately 80–85% complete. The repository is close to being ready for ledger development, but four foundational issues should still be resolved first.**

| Area                            |   Maturity |
| ------------------------------- | ---------: |
| Runtime and CI foundation       |    **90%** |
| Authentication/session handling |    **85%** |
| Customer/card master data       |    **80%** |
| Database deployability          |    **82%** |
| API documentation               |    **72%** |
| Requirements alignment          |    **60%** |
| Loyalty ledger                  |   **0–5%** |
| Overall MVP backend             | **50–55%** |

---

# Previous findings: current status

| Previous finding                              | Status                |
| --------------------------------------------- | --------------------- |
| Ambiguous username login fallback             | **Fixed**             |
| Concurrent session rotation                   | **Fixed**             |
| Unused refresh-token storage                  | **Fixed**             |
| Tenant/branch authentication eligibility      | **Fixed**             |
| Session `lastUsedAt` written on every request | **Fixed**             |
| One active card only enforced in services     | **Fixed at DB level** |
| Concurrent card replacement                   | **Mostly fixed**      |
| Public branch config drifting from PostgreSQL | **Fixed**             |
| Initial administrator bootstrap               | **Partially fixed**   |
| Cross-tenant database consistency             | **Not fixed**         |
| Project-hub requirements alignment            | **Not fixed**         |

---

# What was fixed correctly

## 1. Session rotation is now concurrency-safe

Rotation now performs a conditional update inside the transaction:

```text
session ID matches
status is ACTIVE
expiry is in the future
```

Only when exactly one row is updated does the backend create the replacement session. A concurrent second request receives `Session already rotated`.

A real PostgreSQL concurrency test now sends two simultaneous rotation attempts and verifies:

- One succeeds
- One fails
- Exactly one active replacement remains

This finding is resolved.

## 2. The unused refresh-token contract was removed

The schema no longer contains `refreshTokenHash`, and the migration drops both the column and its unique index.

New sessions now generate only:

- Opaque session token
- CSRF token

That matches the actual session model instead of pretending to implement a refresh-token family.

## 3. Login is now tenant-safe

After Supabase authentication, login resolves the local user exclusively through `supabaseAuthId`. Username fallback has been removed.

That closes the risk of the same username resolving to an arbitrary account in another tenant.

## 4. Tenant and branch state are checked centrally

Authentication now loads the user with their tenant and branch and rejects access when:

- User is inactive

- Tenant is suspended

- Assigned branch is inactive

The HTTP integration suite verifies suspended-tenant and inactive-branch rejection.

## 5. Session activity writes are throttled

`lastUsedAt` is now updated only when its previous value is absent or more than five minutes old.

This avoids turning every authenticated read request into a database write.

## 6. Active-card uniqueness now belongs to PostgreSQL

The new partial unique index guarantees that one customer cannot have two active cards:

```sql
CREATE UNIQUE INDEX "Card_one_active_per_customer"
ON "Card"("tenantId", "customerId")
WHERE "status" = 'ACTIVE';
```

The services retain friendly prechecks, but PostgreSQL is now the final authority. Concurrent card creation and replacement tests verify the constraint against a real database.

## 7. Card replacement is much safer

Replacement now conditionally changes the current card from `ACTIVE` to `REPLACED` before creating the new card. A second concurrent request cannot pass that conditional update.

Because all operations occur inside one transaction, failure to create the replacement rolls back the old-card transition.

## 8. Public branch configuration now comes from PostgreSQL

Tenant and branch names, timezone and receipt-week start are read from the seeded database records rather than duplicated environment values.

An HTTP integration test updates the branch and confirms that `/config/public` immediately returns the database values.

---

# Remaining blockers

## P0 — The default administrator password is unsafe

The seed falls back to:

```text
admin@shopcity.local
password
```

when `DEFAULT_ADMIN_PASSWORD` is absent.

The local setup documentation publicly repeats this default. This may be acceptable for an isolated development fixture, but the same behavior exists in production code.

Worse, `.env.example` does not include `DEFAULT_ADMIN_PASSWORD`, making it easy for an operator to deploy the known default unintentionally.

### Required behaviour

- In development/test: allow an explicit development password.
- In staging/production: require `DEFAULT_ADMIN_PASSWORD`.
- Reject weak defaults such as `password`.
- Prefer a one-time random bootstrap password.
- Require password change or administrator invitation after first login.
- Never print the password to application logs.

This should be fixed before any publicly accessible deployment.

---

## P0 — The documented local bootstrap still does not start Supabase

The setup guide says:

1. Start Docker Compose.
2. Run the seed.
3. Start the application.

But Docker Compose starts only PostgreSQL and Redis. It does not start Supabase Auth.

Meanwhile, the seed requires a live Supabase URL and service-role key.

Following the documented setup with the supplied `.env.example` will therefore attempt to contact `127.0.0.1:54321`, where no Supabase service has been started.

### Correct the setup

Either document:

```bash
supabase start
docker compose up -d
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

or use a hosted development Supabase project and document its required credentials.

The repository currently lists Supabase CLI as a prerequisite but never tells the developer to run it.

---

## P0 — The “fresh install admin login” test does not use real Supabase

The integration suite stubs:

- Supabase admin `listUsers`

- Supabase admin `createUser`

- Supabase password login

It proves that the Prisma linkage and Nest login flow work when Supabase behaves exactly as expected. It does not prove that:

- The real local Supabase stack starts correctly.
- The service-role credentials work.
- The user is actually created in GoTrue.
- The supplied password authenticates.
- Rerunning the seed behaves correctly with a real existing identity.

The OpenSpec task describing a fresh-install real-auth proof is therefore only partially satisfied.

At least one smoke test should run against the local Supabase Auth service.

---

## P0 — Cross-tenant integrity is still not enforced by PostgreSQL

The database still stores redundant tenant identifiers without composite foreign keys.

For example:

```text
Device.tenantId
Device.branchId
```

are independently related to `Tenant` and `Branch`. PostgreSQL does not guarantee that the branch belongs to the same tenant. The same problem exists for users, customers and cards.

Current service checks reduce the risk, but workers, imports, raw scripts or future defects can create:

```text
Customer tenant = Tenant A
Customer branch = Branch belonging to Tenant B
```

Before financial records are introduced, add composite tenancy constraints:

```text
Branch: UNIQUE(id, tenantId)

Customer(branchId, tenantId)
    → Branch(id, tenantId)

Card(customerId, tenantId)
    → Customer(id, tenantId)

Device(branchId, tenantId)
    → Branch(id, tenantId)

User(branchId, tenantId)
    → Branch(id, tenantId)
```

The ledger must never depend solely on application code for tenant isolation.

---

# Important remaining defects

## Card state transitions are still incomplete

Although concurrent replacement is fixed, `updateStatus()` still permits any card—including a `REPLACED` card—to be changed to `ACTIVE` or `BLOCKED`.

That violates the expected terminal nature of `REPLACED`.

Reactivation also does not verify that the customer remains active. The database uniqueness constraint prevents two active cards, but it does not prevent an active card from belonging to a blocked customer.

Required state machine:

```text
ACTIVE  → BLOCKED
ACTIVE  → REPLACED
BLOCKED → ACTIVE, only if customer active and no other active card
REPLACED → no further transition
```

## Existing Supabase bootstrap users may not have the documented password

When the bootstrap finds an existing Supabase user with the same email, it returns that identity without updating or verifying the password.

Therefore, rerunning the seed does not guarantee that:

```text
admin@shopcity.local / password
```

actually works, despite the documentation saying it does.

The bootstrap needs a clear rule:

- Existing identity: update password explicitly, or
- Existing identity: preserve password and do not claim a known credential.

Also, `listUsers()` is not paginated, so a bootstrap identity outside the first page may not be found.

## User provisioning compensation is silent

Normal user creation now attempts to delete the Supabase identity when the Prisma transaction fails. That is a good improvement.

However, compensation failures are silently ignored. At minimum:

- Log a high-severity structured event.
- Store a reconciliation/audit record where possible.
- Provide a command or report for orphaned Supabase identities.

Silently losing the cleanup failure makes later identity problems difficult to investigate.

## Public config does not confirm tenant/branch relationship

The configuration service independently loads:

- Tenant by configured tenant ID
- Branch by configured branch ID

It does not verify that `branch.tenantId === tenant.id`.

Query the branch with both IDs:

```ts
where: {
  id: branchId,
  tenantId,
}
```

It should also decide whether an inactive branch should continue to be advertised publicly.

## Expired-session validation is missing in one code path

`resolveCurrentSession()` checks session status and user eligibility but does not check `expiresAt`.

The main guard performs the correct expiry check, so this is not currently the primary authentication path. Nevertheless, this method should either be corrected or removed before someone begins using it.

---

# Alignment with the revised ShopCity project hub

The repository still does not fully reflect the product definition you supplied.

| Revised requirement                    | Repository status                               |
| -------------------------------------- | ----------------------------------------------- |
| Name, phone **and email** registration | Email missing                                   |
| Unique card serial number              | Still called `barcodeValue`                     |
| Lookup by serial, name, phone or email | Name/phone/card split; email unavailable        |
| No scanning for MVP                    | API/domain terminology still barcode-oriented   |
| No mandatory hard receipt constraint   | Schema still enforces weekly receipt uniqueness |
| Manual earn/redeem                     | Not implemented                                 |
| Immutable wallet ledger                | Not implemented                                 |
| SMS after wallet movement              | Not implemented                                 |
| Daily loyalty reconciliation           | Not implemented                                 |
| Offline pending earn                   | Not implemented                                 |
| Approval thresholds                    | Configuration exists; workflow absent           |

The customer schema has no email field, and the registration DTO accepts only name, phone, staff status and branch.

The card business identifier remains `barcodeValue`, despite the revised requirement calling it a typed card serial number.

Most importantly, the schema still contains a mandatory receipt number, receipt-week date and hard weekly uniqueness constraint.

Before ledger development begins, formally decide whether:

1. A POS reference is captured.
2. It is mandatory or optional.
3. Duplicate real-world purchases are blocked, flagged or only reconciled later.
4. `Receipt` should remain, become `SaleRecord`, or be removed.

---

# Migration concern

The new migration immediately creates the active-card partial unique index without first identifying or cleaning duplicate active cards.

That works on the fresh Testcontainer database. It will fail on any existing environment containing two active cards for one customer.

Before applying it to shared data, run a preflight query and resolve duplicates explicitly. Do not add arbitrary automatic cleanup to the migration without a business-approved rule for which card remains active.

---

# Testing assessment

The latest tests are substantially better:

- Real PostgreSQL

- Real Prisma migrations

- Concurrent session rotation

- Concurrent card assignment

- Concurrent card replacement

- HTTP session lifecycle

- Tenant/branch suspension

- Database-backed public configuration

Still missing:

- Real Supabase Auth integration
- Bootstrap rerun against an existing Supabase user
- Bootstrap compensation failure
- Replaced-card reactivation rejection
- Blocked-customer card reactivation rejection
- Cross-tenant database constraint tests
- Migration against pre-existing duplicate active cards
- Audit persistence assertions during card concurrency
- Bearer-authenticated POST behaviour

No GitHub workflow results or combined status checks were visible for the latest commit through the connector, so I could not independently confirm that the full CI pipeline passed.

---

# Readiness decision

## Phase 1 foundation

**Conditionally acceptable.**

The authentication and card-concurrency implementation is now credible. The commit resolves most of the technical issues it claims to resolve.

## Production deployment

**Not ready**, primarily because of:

1. Known default administrator password.
2. Incomplete real-Supabase bootstrap instructions and testing.
3. Missing cross-tenant database constraints.
4. Incomplete card state machine.

## Loyalty-ledger implementation

**Almost ready.**

Before starting the ledger migration, complete one final foundation PR containing:

1. Production-safe administrator bootstrap.
2. Real local Supabase setup/test.
3. Composite tenant foreign keys.
4. Terminal `REPLACED` card state and customer eligibility checks.
5. Final receipt/reference decision.
6. Customer email and serial-number domain alignment.

After that, the repository can move cleanly into:

```text
SaleRecord / idempotency
→ Wallet
→ Append-only LedgerEntry
→ CreditLot
→ Earn
→ Redeem
→ Reversal
→ Transactional Outbox
→ SMS
→ Daily Reconciliation
```

The repository is no longer stuck in scaffolding. The remaining work is now concentrated around **production bootstrap, database isolation and final product-model alignment**, rather than basic backend architecture.
