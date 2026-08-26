## 1. Financial flow fixes

- [x] 1.1 Repair the earn reversal branch so eligible reversals persist the compensating ledger entry, restoration/evidence rows, audit record, outbox intent, SMS intent, idempotency response, and `201` response.
- [x] 1.2 Make manual adjustment expiry server-authoritative by removing caller-controlled expiry from the request flow and reading the configured expiry months in the service.
- [x] 1.3 Enforce the configured adjustment amount ceiling before any financial write is created.

## 2. Truthful read models and audit evidence

- [x] 2.1 Update the transaction read model so receiptless reversals and adjustments return null receipt/card fields and explicit type-specific detail blocks instead of fabricated receipt data.
- [x] 2.2 Remove the false `redemption.expired` audit event from the redemption rejection path.
- [x] 2.3 Extend unit tests to cover the corrected read-model shape and the rejection audit event set.

## 3. Contract regeneration and closure verification

- [x] 3.1 Regenerate OpenAPI output and the generated client from the updated application.
- [x] 3.2 Run OpenAPI lint, diff, and client typecheck to confirm the committed artifacts match runtime behavior.
- [x] 3.3 Add and run tests for successful earn reversal, idempotent replay, conflicting replay, and the adjustment policy edge cases called out by the review.
- [x] 3.4 Add and run integration coverage for the concurrent reversal and adjustment scenarios required for Sprint 3 closure.
