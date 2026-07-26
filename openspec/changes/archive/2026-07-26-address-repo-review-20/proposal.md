## Why

Repo review 20 confirms Sprint 2's core financial-integrity implementation is complete, but the repository is not yet pilot-ready. Before Sprint 2 is formally closed and Sprint 3 redemption work begins, the remaining deployment, duplicate-orchestration, privacy, throttling, API-contract, and release-evidence gaps need one focused cleanup pass.

## What Changes

- Align production API and worker start scripts with the actual Nest build output, and add build smoke checks for both entrypoints.
- Remove the obsolete `ReceiptsService` orchestration path, or reduce it to a thin compatibility layer over canonical loyalty and approval services without duplicated financial write logic.
- Add explicit Redis-backed throttling to the canonical earn endpoint, keyed by authenticated staff identity and session device, with documented `429 RATE_LIMITED` responses.
- Minimize cashier-facing customer and card responses so cashiers receive only workflow-required customer/card fields, with full PII reserved for supervisors/admins and sensitive reads audited.
- Correct earn and approval OpenAPI examples so each endpoint documents only errors it can emit at runtime.
- Resolve the Sprint 2 error-code documentation mismatch by explicitly documenting whether inactive cards, blocked customers, and staff-ineligible customers remain masked as `CARD_NOT_FOUND` or become distinct stable operational errors.
- Add cursor pagination to customer search, customer ledger, and approval queue endpoints before frontend consumers depend on unbounded list shapes.
- Capture visible CI and release evidence for the current Sprint 2 closeout, update the migration tracker, and keep Issue #1 closure tied to that evidence.

## Capabilities

### New Capabilities
- `production-entrypoint-verification`: Production API and worker entrypoints are aligned with build output and smoke-tested after build.
- `canonical-receipt-orchestration`: Receipt capture and review use only the canonical loyalty and approval orchestration path, without stale duplicate financial logic.
- `financial-endpoint-rate-limiting`: Financial write endpoints, starting with earn, enforce explicit Redis-backed rate limits and document `429 RATE_LIMITED` errors.
- `cashier-data-minimization`: Cashier-facing customer and card reads expose only sales-workflow data, with privileged PII reads limited and audited.
- `api-error-contract-accuracy`: Public OpenAPI error examples match actual endpoint behavior and stable error-code documentation decisions.
- `bounded-list-endpoints`: Customer, ledger, and approval list endpoints use cursor pagination with stable ordering.
- `sprint-2-release-evidence`: Sprint 2 closure requires visible CI evidence and migration-tracker updates before formal closure.

### Modified Capabilities

- None. There are no existing mainline specs under `openspec/specs/` to modify.

## Impact

- Affected code includes `package.json`, build/CI scripts or workflows, `src/modules/receipts`, `src/modules/loyalty`, `src/common/throttle`, `src/common/openapi-envelope.ts`, `src/modules/customers`, `src/modules/cards`, `src/modules/approvals`, and release/migration documentation.
- API response shapes for cashier-accessible customer/card reads and list endpoints will change; frontend consumers must adopt the minimized DTOs and cursor pagination.
- GitNexus proposal impact recorded `toPublicCard` as HIGH risk because card create, replace, update, and lookup flows depend on the current public-card mapping; implementation must include targeted regression coverage for those flows.
- `apiErrorEnvelopeResponses` has MEDIUM shared blast radius, so `429` support should be additive and covered without disturbing existing documented errors.
