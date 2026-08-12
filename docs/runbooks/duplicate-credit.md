# Duplicate Credit Runbook

## Purpose

Respond to suspected duplicate earn or adjustment credit without mutating confirmed ledger history directly.

## Triggers

- Customer balance appears higher than expected after one purchase.
- Pilot operations summary or reconciliation evidence shows a mismatch.
- Support ticket references the same receipt, device request ID, or idempotency key more than once.

## Steps

1. Capture the tenant, branch, card serial number, receipt number, request ID, and approximate event time.
2. Confirm the running `RELEASE_SHA` from the deployed environment and attach the request ID to the incident notes.
3. Query authoritative transaction evidence through the existing admin/API read surfaces; do not update ledger rows with ad hoc SQL.
4. Verify whether the duplicate is:
   - a repeated client submission blocked by idempotency,
   - a duplicated upstream receipt,
   - an operator training issue, or
   - a genuine product defect.
5. Check whether the same receipt or correlation ID produced more than one confirmed ledger entry.
6. If the duplicate is customer-visible and confirmed, open an audited remediation request for the approved product path; never delete or rewrite the confirmed ledger entry.
7. Re-run reconciliation and record the final evidence bundle, including request IDs and affected ledger entry IDs.

## Evidence to record

- Request ID or idempotency key
- Receipt number and card serial number
- Customer and tenant identifiers
- Confirmed ledger entry IDs involved
- Reconciliation status before and after containment
- Follow-up issue or remediation ticket reference
