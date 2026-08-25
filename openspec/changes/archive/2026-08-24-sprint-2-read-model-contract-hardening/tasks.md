## 1. Active Balance Read Model

- [x] 1.1 Add a shared backend active-balance read helper/service that sums only credit lots with `remainingAmountKobo > 0` and `expiresAt > now` using integer kobo values.
- [x] 1.2 Support batch balance loading for a bounded set of customer IDs so customer list pages do not load nested `creditLots` arrays.
- [x] 1.3 Add unit coverage for active, expired, depleted, mixed, and no-lot balance cases.

## 2. Customer Read DTOs

- [x] 2.1 Replace customer list `creditLots` includes with page-scoped aggregate active-balance loading.
- [x] 2.2 Add explicit cashier customer DTO mapping that preserves minimal sales fields and active `availableBalanceKobo` only.
- [x] 2.3 Add explicit supervisor/admin customer DTO mapping that serializes full-contact/admin fields safely without returning Prisma entities, nested `creditLots`, or raw `bigint` values.
- [x] 2.4 Update customer detail reads to use the same role-specific DTO mappers and active-balance source.
- [x] 2.5 Change privileged customer list audit metadata to omit raw search strings and record low-risk query classification plus result count.

## 3. Card Lookup DTOs

- [x] 3.1 Replace card lookup's unfiltered nested `creditLots` include with the shared active-balance read path.
- [x] 3.2 Ensure card lookup's nested customer summary remains cashier-minimized and reports active `availableBalanceKobo` only.
- [x] 3.3 Add regression coverage proving customer and card lookup summaries agree when expired credit lots exist.

## 4. Rate-Limit Error Contract

- [x] 4.1 Update throttle failure handling so runtime 429 responses produce `code: RATE_LIMITED` in the standard error envelope.
- [x] 4.2 Preserve existing domain error-code extraction behavior for other exceptions.
- [x] 4.3 Add an HTTP throttle-exhaustion regression test that verifies `success: false`, `statusCode: 429`, and `code: RATE_LIMITED`.
- [x] 4.4 Regenerate or inspect OpenAPI output to confirm the earn endpoint still documents `429 RATE_LIMITED`.

## 5. HTTP Regression Coverage

- [x] 5.1 Add route-level cashier customer list/detail tests that assert valid JSON, minimized fields, no full-contact PII, no nested `creditLots`, and active balance excluding expired credit.
- [x] 5.2 Add route-level supervisor/admin customer list/detail tests that assert valid JSON, expected privileged fields, no raw `bigint`, no nested `creditLots`, and audited PII reads.
- [x] 5.3 Add route-level card lookup tests that assert minimized nested customer fields and active balance excluding expired credit.

## 6. Sprint 2 Evidence Cleanup

- [x] 6.1 Reconcile Issue #1's final exit-gate checkbox or add a clean follow-up evidence note if issue body editing is unavailable.
- [x] 6.2 Inventory completed Sprint 2 OpenSpec changes and archive only those that are fully implemented and validated.
- [x] 6.3 Update repository evidence notes if any Sprint 2 closeout links or final evidence text render with escaped newlines.

## 7. Verification

- [x] 7.1 Run targeted unit and HTTP tests for customers, cards, throttle/error handling, and active-balance reads.
- [x] 7.2 Run `npm run lint` and `npm run build`.
- [x] 7.3 Run `npm run test` and the relevant integration/E2E suites affected by customer/card/earn HTTP paths.
- [x] 7.4 Run OpenSpec validation for the change and main specs.
- [x] 7.5 Run GitNexus change detection before committing implementation changes.
