## Why

Repo review 21 found that the post-Sprint-2 read/API layer can return raw Prisma `bigint` values, display expired credit as cashier-visible balance, and emit a runtime throttling error code that disagrees with OpenAPI. These contract issues should be corrected before Sprint 3 redemption depends on customer, card, and balance read models.

## What Changes

- Introduce explicit customer read DTO mapping for cashier and privileged customer responses instead of returning Prisma entities directly.
- Centralize active-balance reconstruction so customer summaries, card lookup, and earn-facing read models exclude expired or depleted credit lots.
- Stop loading or returning complete credit-lot arrays from customer list/detail endpoints when only aggregate balance is needed.
- Align runtime throttling responses with the documented `RATE_LIMITED` 429 error envelope.
- Add HTTP-level regression coverage for cashier and supervisor customer reads, balance expiry filtering, and throttle exhaustion.
- Reconcile Sprint 2 closeout evidence so the closed issue state and recorded evidence do not conflict.

## Capabilities

### New Capabilities

- `active-balance-read-model`: Defines the authoritative active-balance read model used by customer, card, earn, and future redemption reads.

### Modified Capabilities

- `cashier-data-minimization`: Require all customer/card read DTOs to avoid raw Prisma entities, raw `bigint`, and nested PII while preserving audited privileged full-contact reads.
- `bounded-list-endpoints`: Require customer list endpoints to return aggregate balances without unbounded nested credit-lot collections.
- `financial-endpoint-rate-limiting`: Require runtime throttling failures to return the documented `RATE_LIMITED` envelope.
- `api-error-contract-accuracy`: Require generated OpenAPI error examples and runtime envelopes to agree for 429 responses.
- `sprint-2-release-evidence`: Require Sprint 2 closeout records, including the issue body, to be internally consistent after evidence is posted.

## Impact

- Affected modules: `src/modules/customers`, `src/modules/cards`, `src/modules/loyalty`, `src/common/throttle`, and `src/common/errors`.
- Affected APIs: `GET /api/v1/customers`, `GET /api/v1/customers/{id}`, card lookup responses, and throttled financial endpoint error envelopes.
- Data integrity: active-balance reads must use integer kobo values and must not alter append-only ledger or credit-lot history.
- Tests: add HTTP/E2E coverage for JSON serialization, role-specific customer DTOs, expiry-filtered balances, and rate-limit error envelopes.
- Documentation/process: update Sprint 2 issue/evidence records and validate OpenSpec artifacts before implementation.
