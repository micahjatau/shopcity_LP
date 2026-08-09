Repository review — current head

Current head: de13765b8aea9a2d767cf9107af131efffd37358
Latest code-bearing commit: e9f120b9fd59034c5b910350551e2705207e8093 — fix: close repo review 20 blockers
The latest head adds Sprint 2 CI evidence after that implementation commit.

Verdict

The repository is in its strongest state so far.

Sprint 2’s financial core is complete, remotely verified and legitimately closable. The latest changes correctly addressed the previous findings:

Production API and worker entrypoints now match the build output.

Duplicate ReceiptsService orchestration was removed.

The earn endpoint is throttled.

Cashier-facing customer/card responses are minimised.

Customer, ledger and approval lists are bounded.

OpenAPI errors were moved to the correct endpoints.

CI evidence is recorded and Issue #1 is closed.

The latest cleanup nevertheless introduced two important read-model bugs and left one API-contract mismatch:

1. Supervisor/admin customer reads return raw Prisma BigInt values.

2. Cashier-visible balances include expired credit lots.

3. Runtime throttling emits HTTP_429, while OpenAPI promises RATE_LIMITED.

These should be corrected before implementing redemption.

---

Improvements confirmed

1. Sprint 2 now has real CI evidence

The migration tracker records a successful workflow for commit e9f120b, including:

Static checks.

E2E tests.

Integration tests.

GitNexus.

All 16 migrations applied to fresh Testcontainers databases.

Issue #1 is now closed as completed, and the final evidence comment identifies the successful workflow and jobs.

2. Production entrypoints are corrected

The production scripts now point to the actual compiled files:

"start:prod": "node dist/src/main.js",
"start:worker:prod": "node dist/src/worker.js"

The verification script confirms both artifacts exist and exercises a non-running worker help path. verify:fast includes the build and entrypoint verification.

The worker explicitly supports --help, so the smoke command does not attempt to connect to PostgreSQL or Redis.

3. Duplicate receipt orchestration is gone

ReceiptsService was removed. ReceiptsModule now contains only the compatibility controller and imports the canonical loyalty and approvals modules.

The deprecated routes now function strictly as adapters:

Receipt capture delegates to LoyaltyService.earn.

Receipt approval/rejection delegates to ApprovalsService.

This removes the previous risk of two financial implementations drifting apart.

4. Earn throttling is present

The canonical earn endpoint now has an explicit limit of 30 requests per minute, keyed by tenant, user and session device.

The key builder includes all three identities.

5. Cashier PII exposure is substantially reduced

Cashier customer reads now return:

Customer ID.

Full name.

Masked phone.

Card status.

Available balance.

Full phone, email, registration attribution and customer administration fields are omitted. Supervisor/admin full-contact reads are audited.

Card lookup similarly returns a manually constructed customer summary instead of spreading the complete Prisma customer object.

6. Unbounded top-level lists were addressed

Customer, ledger and approval routes now accept limit and cursor, with a default of 50 and maximum of 100.

Customer, customer-ledger and approval responses expose:

items

nextCursor

hasMore

---

New findings

P0 — Supervisor/admin customer responses contain raw BigInt

The customer service now includes creditLots.remainingAmountKobo when retrieving customer records.

For cashiers, these values are converted to JavaScript numbers. For supervisors and admins, however, the service returns the raw Prisma customer object:

if (isPrivilegedCustomerRead(actor)) {
return {
items: pageItems,
...
};
}

and:

return customer;

Those objects contain Prisma bigint values. The response interceptor merely wraps the returned object without converting nested values.

Unless a custom Fastify serializer is configured elsewhere, supervisor/admin calls to:

GET /api/v1/customers
GET /api/v1/customers/{id}

are likely to fail during JSON serialization.

The existing test does not catch this because it calls the service directly and never serialises the result through HTTP. Its fixture explicitly contains a BigInt credit-lot balance.

Required correction

Never return Prisma entities directly from these endpoints.

Create explicit DTO mappers for supervisor/admin responses and convert or aggregate financial values:

{
id,
fullName,
phoneE164,
email,
status,
activeCardStatus,
availableBalanceKobo: Number(balance),
}

Add HTTP-level tests for both cashier and supervisor responses. The tests should call the actual route and confirm the response is valid JSON.

---

P0 — Cashier balances include expired credit

Both customer summaries and card lookup calculate balance by summing every associated credit lot:

customer.creditLots.reduce(
(total, lot) => total + Number(lot.remainingAmountKobo),
0,
)

The relation query has no filter for:

expiresAt > now

remainingAmountKobo > 0

The canonical balance calculation used by the loyalty engine correctly applies both filters.

This means the same customer can currently receive two different balances:

The transaction endpoint reports active, unexpired balance.

Customer/card lookup reports total historical remaining balance, including expired lots.

That would cause a cashier-facing frontend to display credit that is no longer redeemable.

Required correction

Centralise balance reconstruction.

At minimum, filter the relations:

creditLots: {
where: {
remainingAmountKobo: { gt: 0 },
expiresAt: { gt: new Date() },
},
select: { remainingAmountKobo: true },
}

A better implementation is a shared balance query/service used by:

Earn responses.

Customer summaries.

Card lookup.

Redemption validation.

Reports.

This must be fixed before Sprint 3 redemption.

---

P1 — Runtime 429 code disagrees with OpenAPI

The earn endpoint documents:

429 RATE_LIMITED

But the throttle guard throws a plain HttpException with no domain code.

The global exception filter maps statuses as follows:

400 → VALIDATION_ERROR

409 → CONFLICT

422 → POLICY_VIOLATION

503 → DEPENDENCY_UNAVAILABLE

Other non-500 statuses → HTTP_<status>

There is no 429 mapping, so the real response code is:

HTTP_429

not:

RATE_LIMITED

The tests only confirm throttle-key generation and the OpenAPI example. They do not exercise the HTTP guard and inspect the runtime error envelope.

Required correction

Either throw a domain exception from the guard:

throw new DomainHttpException(
HttpStatus.TOO_MANY_REQUESTS,
'RATE_LIMITED',
'Too many requests',
);

or add an explicit 429 case to errorCodeFromStatus.

Then add an E2E test that exhausts a low test limit and verifies:

{
"success": false,
"error": {
"statusCode": 429,
"code": "RATE_LIMITED"
}
}

---

P1 — Customer pagination still loads unbounded nested credit lots

The top-level customer page is bounded, but every customer includes all associated credit lots.

Once redemption begins, a regular customer may accumulate many lots. A page of 100 customers could therefore load thousands of unnecessary rows merely to display one aggregate balance per customer.

For supervisors/admins, those complete credit-lot arrays are also returned to the client.

Required correction

Do not load credit-lot arrays for customer lists.

Use:

A database aggregate.

A dedicated active-balance read model.

A grouped SQL query.

A cached balance projection with ledger reconciliation.

The API should return an aggregate balance, not the lot collection.

---

P2 — Cursor tokens claim timestamp-plus-ID behaviour but use only ID

The cursor encodes both:

{id, timestamp}

However, list queries decode the timestamp and then ignore it:

cursor: { id: decodedCursor.id }

The implementation therefore depends on the cursor row continuing to exist so Prisma can locate its ordered position. A deleted cursor row can make an otherwise valid cursor fail.

It also does not bind the cursor to:

Tenant.

Customer.

Endpoint.

Sort field.

Better implementation

Use explicit keyset predicates:

OR: [
{ effectiveAt: { lt: cursor.timestamp } },
{
effectiveAt: cursor.timestamp,
id: { lt: cursor.id },
},
]

Cursor payloads should also include the endpoint/scope and ideally be signed to prevent arbitrary manipulation.

This is not a Sprint 2 blocker, but it should be corrected while implementing the higher-volume Sprint 3 ledger views.

---

P2 — Full-contact audit metadata can duplicate searched PII

Privileged customer list reads record the raw search query in audit metadata.

Since the search supports phone and email, an audit record may permanently duplicate the exact contact information being searched.

Audit logs should record that a search occurred, but normally do not need the full raw search string.

Recommended correction

Record:

{
queryPresent: true,
queryType: 'phone' | 'email' | 'name' | 'card',
resultCount,
}

Or record a keyed hash of the normalised query when correlation is operationally necessary.

---

P3 — Sprint 2 issue body remains internally inconsistent

Issue #1 is correctly closed and has remote CI evidence, but the final exit-gate checkbox inside the issue body remains unchecked.

This does not affect the implementation, but it creates avoidable ambiguity for future review.

The final evidence comment also appears to contain escaped newline characters in its stored body, making the rendered links less clean than the migration-tracker evidence.

---

Sprint status

Sprint 2

Area Status

Atomic earn Complete
Immutable receipt evidence Complete
Append-only ledger Complete
Credit-lot lifecycle protection Complete
Approval execution Complete
Outbox and SMS intent Complete
Duplicate orchestration cleanup Complete
Remote CI evidence Complete
Cashier PII minimisation Mostly complete
Customer/card balance consistency Incorrect
Supervisor customer JSON response At risk of failure
Runtime 429 contract Incorrect

Sprint 2 financial core: complete.
Sprint 2 read/API layer: requires one focused correction.

Sprint 3

Sprint 3 has not materially started. The schema still permits only:

LedgerEntryType = EARN
LedgerEntryDirection = CREDIT

There is no redemption allocation model, debit ledger type, expiry ledger event, reversal execution or adjustment workflow.

---

Recommended next change

Create a narrow post-Sprint-2 change before redemption:

sprint-2-read-model-contract-hardening

Scope:

1. Introduce explicit customer DTO mappers.

2. Remove raw BigInt from all HTTP responses.

3. Centralise active-balance calculation.

4. Exclude expired credit lots from customer and card summaries.

5. Stop returning complete credit-lot arrays from customer endpoints.

6. Make runtime 429 return RATE_LIMITED.

7. Add HTTP tests for cashier and supervisor customer reads.

8. Add a real HTTP throttle-exhaustion test.

9. Reconcile the closed issue checkbox.

10. Archive completed Sprint 2 OpenSpec changes.

After this small correction, begin Sprint 3 with:

DEBIT, REDEEM, EXPIRY, REVERSAL, ADJUSTMENT.

RedemptionAllocation.

FIFO lot selection.

Row locking.

Idempotent redemption.

Atomic balance reduction plus debit ledger entry.

A concurrency test proving two redemptions cannot consume more than the available active balance.

Release decision

Target Decision

Sprint 2 financial closure Go
Begin Sprint 3 schema/design Go after read-model correction
Frontend earn integration Go
Customer/card balance UI integration No-go until expiry filtering is fixed
Supervisor customer management integration No-go until BigInt responses are mapped
Pilot with real transactions Conditional
Production deployment Not yet
