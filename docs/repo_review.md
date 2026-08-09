# Fresh review of `shopcity_LP`

## Verdict

The repository has made a **large, legitimate jump**. It is no longer merely a NestJS scaffold: Phase 1 now includes authentication, backend-owned sessions, RBAC, CSRF handling, users, branches, devices, customers, cards, audit logs, public configuration, Prisma models and an expanded OpenAPI document. The modules are registered globally and protected through session, CSRF and role guards.

However:

> **Phase 1 is not complete, despite every OpenSpec task being marked complete.**

Several remaining defects are serious enough to compromise money calculations, authentication security, database deployment and frontend integration.

| Area                    | Assessment |
| ----------------------- | ---------: |
| Foundation/runtime      |    **82%** |
| Phase 1 features        | **60–65%** |
| Database deployability  |    **25%** |
| Authentication security |    **45%** |
| API contract quality    |    **35%** |
| Testing credibility     |    **40%** |
| Overall backend MVP     | **35–40%** |

Do **not** begin the loyalty ledger yet. Fix the Phase 1 integrity layer first.

---

# What improved substantially

## Runtime hardening is now real

The repository correctly fixed several earlier findings:

- Swagger no longer contains the double API prefix.

- Production Swagger is disabled unless explicitly enabled.

- Request IDs are attached to successful and failed responses.

- Readiness failures return 503.

- Redis readiness now sends an actual `PING`.

- Standard success and error envelopes are documented.

- Dependency Cruiser was added.

- Domain exceptions can preserve stable error codes.

## Phase 1 domain code now exists

The Prisma schema now contains tenants, branches, devices, users, sessions, customers, cards, receipts and audit logs.

You also now have working module surfaces for:

- Login, refresh, logout and current-user lookup
- User creation, role changes and suspension
- Branch and device management
- Customer registration and lookup
- Card assignment, replacement and blocking
- Audit-log retrieval
- Public configuration

That is real progress, not architecture theatre.

---

# P0 blockers

## 1. The monetary configuration is wrong by a factor of 100

The configuration fields are explicitly named in **kobo**, but the defaults use naira-sized numbers:

| Policy              | Current value | Actual value | Intended value |
| ------------------- | ------------: | -----------: | -------------: |
| Minimum redemption  |    `500` kobo |       **₦5** |           ₦500 |
| Purchase flag       | `100000` kobo |   **₦1,000** |       ₦100,000 |
| Purchase approval   | `200000` kobo |   **₦2,000** |       ₦200,000 |
| Redemption approval |   `5000` kobo |      **₦50** |         ₦5,000 |

The TRD’s intended business values are ₦500, ₦100,000, ₦200,000 and ₦5,000 respectively.

Correct defaults:

```env
MIN_REDEMPTION_KOBO=50000
PURCHASE_FLAG_THRESHOLD_KOBO=10000000
PURCHASE_APPROVAL_THRESHOLD_KOBO=20000000
REDEMPTION_APPROVAL_THRESHOLD_KOBO=500000
```

Do not build the ledger against the current values. It would flag ordinary ₦2,000 baskets as approval events. That is not fraud detection; that is operational sabotage.

---

## 2. The database schema has no migration

The Prisma schema now contains more than 200 lines of models, but the migration tracker explicitly states:

> “Prisma schema updated, no migration file yet.”

No backup or restore validation has been performed either.

This means the schema exists conceptually but is not reproducibly deployable.

Before anything else:

```bash
npx prisma migrate dev --name phase_1_identity_master_data
npx prisma migrate deploy
```

The migration must be tested against an empty database and a rollback/restore workflow. Also add a seed for:

- One ShopCity tenant
- Main branch
- Initial admin
- Default configuration

The Phase 1 design explicitly required this seed/backfill, but it has not been delivered.

---

## 3. Authentication responses expose internal security records

Login, refresh and `/auth/me` return the entire `AuthContext`.

That context contains the full Prisma session object, including:

- `sessionTokenHash`
- `refreshTokenHash`
- `csrfTokenHash`
- Session database ID
- Internal Supabase identity ID through the user object

Those fields are stored directly on the `Session` and `User` records.

Return a dedicated safe DTO:

```ts
interface AuthMeResponse {
  user: {
    id: string;
    username: string;
    role: UserRole;
    branchId: string | null;
  };
  session: {
    expiresAt: string;
  };
}
```

No hashes. No Supabase ID. No internal session metadata.

---

## 4. The refresh-token design is not actually implemented

`AuthService` generates and stores a refresh token, but the controller never sends it to the client. The controller sets only:

- Session cookie

- CSRF cookie

The refresh endpoint uses the current active session ID, not the refresh token. Consequently:

- An expired session cannot be refreshed because `SessionGuard` rejects it first.

- The stored `refreshTokenHash` is unused.

- Concurrent refresh requests can both read the old session as active and create multiple replacements.

- Session rotation is not atomic.

Choose one design:

### Proper refresh model

- Short-lived session/access token
- Separate refresh cookie
- Atomic compare-and-revoke
- Refresh-token-family tracking
- Replay detection

### Simpler MVP model

- One opaque session cookie
- No refresh token field
- Explicit session renewal while still active

The current implementation sits awkwardly between both and achieves neither.

---

## 5. The CSRF guard accepts the CSRF cookie as proof

The CSRF guard accepts the token from:

1. `X-CSRF-Token`
2. `X-XSRF-Token`
3. The CSRF cookie itself

That undermines the intended double-submit mechanism. The browser automatically supplies cookies; the client should have to read the non-HttpOnly CSRF cookie and explicitly return it in a header.

Required validation:

```text
Header token exists
AND cookie token exists
AND header token equals cookie token
AND server-side hash matches
```

Also, the session and CSRF cookies do not include `Secure`, even in production.

Production cookies should use:

```text
Secure
SameSite=Lax or Strict
HttpOnly for session cookie
__Host- prefix where practical
```

---

## 6. The public configuration contains a tenant/branch identity bug

The response sets:

```ts
tenant.id = DEFAULT_PUBLIC_BRANCH_ID;
branch.id = DEFAULT_PUBLIC_BRANCH_ID;
```

There is no separate public tenant ID constant.

This will tell the frontend that the tenant and branch have the same UUID. Worse, the IDs are hardcoded rather than read from seeded database records.

The public configuration should either:

- Read the active tenant and branch from PostgreSQL, or
- Use separate environment variables backed by seeded records.

---

## 7. The OpenAPI request schemas are empty

The generated document references `LoginDto`, `CreateUserDto`, `CreateCustomerDto`, `CreateCardDto` and other schemas, but every component has:

```json
{
  "type": "object",
  "properties": {}
}
```

The response payloads are also largely documented as generic objects.

This means Orval cannot generate useful typed clients. Frontend engineers cannot know what fields are required from the official contract.

Add `@ApiProperty` / `@ApiPropertyOptional` to DTOs or enable the Nest Swagger CLI plugin. Then create response DTOs for:

- Authenticated user
- Customer
- Card with customer summary
- User
- Branch
- Device
- Public configuration
- Audit entry

The API is “documented” in volume, but not yet in information.

---

# Database and business-integrity findings

## Customer phone uniqueness does not match the specification

The task file says active-customer phone uniqueness was implemented.

The actual schema enforces unconditional uniqueness:

```prisma
@@unique([tenantId, phoneE164])
```

That means a blocked customer cannot be re-registered with the same phone number. This may be acceptable if the policy is “one permanent account per phone,” but it contradicts the current technical specification.

Choose one policy deliberately before generating the migration:

- Permanent uniqueness and account reactivation, or
- Partial uniqueness for active accounts.

Do not let the database decide product policy by accident.

## Tenant consistency is not protected at database level

Several models carry both a `tenantId` and a related entity ID:

- Device: tenant + branch
- User: tenant + branch
- Customer: tenant + branch
- Card: tenant + customer

But their foreign keys only verify that the related branch or customer exists—not that it belongs to the same tenant.

Before migration, use composite constraints or remove redundant tenant IDs and derive tenancy through the relation. Otherwise, a malformed write can create a tenant-A customer attached to a tenant-B branch.

## Card lifecycle invariants are weak

The schema and service allow multiple active cards for one customer. `createCard` does not check whether an active card already exists.

Other problems:

- Blocked customers can still have active cards looked up.

- Card lookup checks card status but not customer status.

- A blocked or already replaced card can be replaced again.

- `updateStatus` permits callers to manually set `REPLACED`.

- A replaced card can be changed back to `ACTIVE`.

- Concurrent replacement requests can create multiple replacement cards.

Implement an explicit card state machine:

```text
ACTIVE → BLOCKED
ACTIVE → REPLACED
BLOCKED → ACTIVE, with supervisor reason
REPLACED → terminal state
```

Replacement must be concurrency-safe and enforced by database constraints.

## Customer blocking does not block card access

Blocking a customer only updates the customer row.

Card lookup includes the customer but ignores its status.

A blocked customer’s active card therefore remains usable. At minimum, card lookup must reject:

```text
customer.status != ACTIVE
```

---

# Authentication and master-data weaknesses

## Supabase user creation is not transactional

User creation happens in this order:

1. Create Supabase Auth user.
2. Create Prisma user.
3. Create audit entry.

If step 2 fails, an orphan Supabase account remains. If step 3 fails, the user exists but the API may return an error.

Use a provisioning workflow with compensation:

```text
Create Supabase identity
    ↓
Create local user + audit in DB transaction
    ↓
If DB fails, delete Supabase identity
```

## Branch assignment is insufficiently validated

`createUser` accepts a branch ID but does not verify that the branch belongs to the same tenant.

Customer registration by an admin without a branch selects the first branch found for the tenant.

That is non-deterministic. Admin customer registration should explicitly provide a branch; supervisors should be restricted to their assigned branch.

## DTO validation is too weak

Roles and statuses use `@IsString()` rather than `@IsEnum()`. IDs use `@IsString()` rather than `@IsUUID()`. Passwords have no meaningful policy and usernames are not validated as emails.

Device status is cast directly to a Prisma enum after accepting any string.

Use enum-aware DTOs. Invalid domain values should fail at validation, not emerge as database exceptions.

## Phone validation is not sufficient

The normalizer handles common Nigerian formatting, but almost any digits become a `+234...` string.

The customer service considers a number valid merely if the result starts with `+`.

For example, `1` becomes `+2341` and passes.

Use a proper telephone-number library or enforce Nigerian mobile-number length and prefix rules explicitly.

---

# Audit integrity

Audit records are created after the primary mutation, outside the same transaction. This pattern appears in customer, card, branch and user services.

Consequences:

- Mutation succeeds.
- Audit insert fails.
- API returns an error.
- Client retries.
- Duplicate or contradictory state can result.

State change and audit record should commit atomically through one Prisma transaction.

The audit service accepts a request ID, but most callers never supply it.

Request IDs are generated for responses, but not propagated into application services or audit records.

Add a request-context provider rather than manually passing request IDs through every controller.

---

# CI and quality-gate regression

The current CI workflow runs:

- Install
- Prisma generation
- Formatting
- Lint
- Type-check
- Unit tests
- E2E tests
- Integration tests
- OpenAPI diff

But it no longer runs:

- `npm run build`
- `npm run prisma:validate`
- `npm run openapi:lint`
- `npm run architecture:check`
- Generated OpenAPI drift verification

The package has an architecture-check script, but neither `lint` nor CI invokes it.

This directly contradicts the completed OpenSpec task claiming the boundary check was wired into lint or an equivalent CI gate.

Restore all gates:

```yaml
- run: npm run prisma:validate
- run: npm run build
- run: npm run architecture:check
- run: npm run openapi:lint
- run: npm run openapi:diff
- run: git diff --exit-code -- docs/api/openapi.json
```

---

# Testing quality

The file named `phase-1.int-spec.ts` does not use PostgreSQL. It constructs a large fake Prisma object and tests services against in-memory arrays.

Those are useful service tests, but they are **not integration tests**. They cannot validate:

- Prisma migrations
- Unique constraints
- Foreign keys
- Database transactions
- Concurrency
- Cross-tenant consistency
- Real Prisma query behavior

The task file nevertheless marks customer registration, duplicate rejection and card replacement integration tests complete.

Create a real Testcontainers Phase 1 suite that:

1. Starts PostgreSQL.
2. Applies actual migrations.
3. Seeds tenant, branch and admin.
4. Boots the Nest application.
5. Exercises APIs over HTTP.
6. Verifies database state afterward.

Critical cases:

- Concurrent card replacement
- Concurrent session refresh
- Duplicate customer registration
- Suspended-user access
- Cross-tenant branch assignment
- Blocked customer card lookup
- CSRF cookie without header
- Audit rollback when mutation fails
- Supabase provisioning compensation

---

# OpenAPI contract quality

The response-envelope work is moving in the right direction, but the document is now over 13,000 lines largely because every endpoint repeats the same inline error structures.

Moreover, a 401, 403, 404 or 503 response is documented with the same example:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR"
}
```

Use reusable OpenAPI components and status-specific examples.

The security scheme also describes a Bearer JWT, although the actual system uses an opaque backend session token and primarily cookie-based browser authentication.

Document:

- Session cookie authentication
- Optional opaque bearer-session authentication
- CSRF header
- `Set-Cookie` responses
- Domain-specific errors
- Actual request and response schemas

Until that is done, the generated frontend client is not trustworthy.

---

# Documentation drift

The README still says the default route is `GET /`, although it is now `GET /api/v1`. It also omits the new policy variables and `SWAGGER_ENABLED`.

The `.env.example` similarly omits all the newly introduced policy variables and Swagger setting.

This matters because the code currently falls back to financially incorrect defaults.

---

# The OpenSpec completion problem

Both active change task files mark every task as complete.

But at least these “completed” items are not complete:

| Claimed completion                         | Reality                                             |
| ------------------------------------------ | --------------------------------------------------- |
| Active phone uniqueness                    | Schema implements unconditional uniqueness          |
| Architecture check wired into quality gate | Script exists but CI/lint never runs it             |
| Phase 1 integration tests                  | Main Phase 1 test uses mocked in-memory persistence |
| Prisma schema deployability                | No migration exists                                 |
| Frontend-ready API contract                | Request schemas are empty                           |
| Session refresh lifecycle                  | Refresh token is unused                             |
| CSRF plumbing                              | Cookie alone is accepted                            |

This is not just documentation drift. It means your Definition of Done is currently too easy to satisfy.

A checked box must represent verified behavior, not merely the presence of code.

---

# Recommended correction sequence

## PR 1 — `fix/phase1-financial-and-schema-integrity`

- Correct every kobo default.
- Add missing environment variables.
- Fix public tenant/branch IDs.
- Resolve phone uniqueness policy.
- Add composite tenancy constraints.
- Add one-active-card enforcement.
- Add real Prisma migration.
- Add seed data.

## PR 2 — `fix/auth-session-security`

- Introduce safe auth response DTOs.
- Stop returning hashes and Supabase IDs.
- Implement a real refresh-token flow or remove it.
- Make rotation atomic.
- Require CSRF header plus cookie.
- Add `Secure` production cookies.
- Add login throttling.
- Check tenant and branch status in guards.
- Avoid writing `lastUsedAt` on every request.

## PR 3 — `fix/master-data-invariants`

- Enforce card state transitions.
- Reject cards belonging to blocked customers.
- Validate branch scope.
- Use enum and UUID validation.
- Add Supabase user-creation compensation.
- Prevent self-demotion and last-admin lockout.
- Put mutations and audit events in one transaction.

## PR 4 — `test/phase1-real-database`

- Run migrations in Testcontainers.
- Exercise real HTTP endpoints.
- Add concurrency and rollback tests.
- Remove the misleading `.int` label from mocked tests or convert them into genuine integration tests.

## PR 5 — `chore/api-contract-and-ci`

- Add Swagger DTO metadata.
- Replace generic response objects.
- Reuse component schemas.
- Correct error examples.
- Document cookie and CSRF authentication.
- Restore build, Prisma, Spectral and architecture gates.
- Enforce generated OpenAPI cleanliness.

---

# Bottom line

The repo has crossed an important threshold: **there is now actual product code**.

But the implementation sprint moved too fast and closed its own checkboxes before proving the invariants. The most dangerous problems are not cosmetic:

1. Financial thresholds are 100 times too low.
2. No migration exists.
3. Authentication returns session hashes.
4. Refresh tokens are decorative.
5. CSRF validation is incomplete.
6. Card lifecycle rules are not enforced.
7. The OpenAPI request schemas are empty.
8. The “integration tests” do not touch the database.

Fix those before starting earn/redeem. A loyalty ledger built on an unstable identity and master-data foundation will merely preserve mistakes immutably—which is a very sophisticated way to be wrong.
