## 1. Specification and release safety

- [x] 1.1 Finalize the receipt-processing-readiness and api-auth-contract specs from the proposal and design.
- [x] 1.2 Update the receipt migration upgrade harness to copy only migrations that precede the target migration.
- [x] 1.3 Add a legacy duplicate-preflight test that seeds two normalized POS identities for the same tenant, branch, and receipt week.

## 2. Receipt integrity and workflow

- [x] 2.1 Add the duplicate legacy POS identity preflight to the receipt integrity migration before any receipt column mutation.
- [x] 2.2 Reorder the migration validation so blank and null legacy receipt references fail before rename/backfill/drop steps.
- [x] 2.3 Move receipt eligibility revalidation into the capture transaction and keep receipt creation, approval state, and audit persistence atomic.
- [x] 2.4 Add concurrent receipt capture coverage with one success and one conflict for the same physical receipt.
- [x] 2.5 Introduce the review state model for flagged and pending-approval receipts, including requester and approver separation.
- [x] 2.6 Bind device identity to the authenticated session and remove trust from the receipt capture body field.
- [x] 2.7 Change device deletion behavior so receipts keep their historical device reference and referenced devices cannot be deleted.
- [x] 2.8 Scope idempotency records to tenant plus actor, enforce expiry handling, and replay the stored completed response.

## 3. Auth contract

- [x] 3.1 Annotate the resolved auth transport on the request so the CSRF guard can distinguish bearer from cookie sessions.
- [x] 3.2 Update the CSRF guard so bearer-authenticated unsafe requests bypass CSRF and cookie-authenticated unsafe requests still require it.
- [x] 3.3 Update the receipt OpenAPI contract and integration tests to reflect the transport-specific CSRF rule.

## 4. Verification and rollout

- [x] 4.1 Update the migration tracker with the new release-safety checks and schema changes.
- [x] 4.2 Run the receipt migration upgrade test, receipt integration suite, auth HTTP suite, and OpenAPI contract test.
- [x] 4.3 Confirm the change is ready for implementation handoff.
