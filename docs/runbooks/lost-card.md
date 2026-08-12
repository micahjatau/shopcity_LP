# Lost Card Runbook

## Purpose

Handle a lost-card report while preserving auditability and preventing unsafe balance changes.

## Steps

1. Verify the customer identity using the approved support flow before disclosing any balance or transaction details.
2. Record the tenant, branch, reported card serial number, replacement card serial number if issued, and operator request ID.
3. Use approved application APIs or admin tooling to inspect the current card/customer linkage and recent activity.
4. If a replacement card is required, follow the supported reassignment/reissue flow only; do not move balances with direct SQL or manual ledger rewrites.
5. Confirm whether the original card should remain blocked from further use and document the time that state changed.
6. Ask the customer to test a lookup or controlled balance check on the replacement card before closing the incident.
7. Record all request IDs, affected customer/card identifiers, and the supervising operator who approved the action.

## Do not

- Do not edit `CreditLot`, `LoyaltyLedgerEntry`, or card-link rows manually in production.
- Do not transfer value outside the approved audited workflow.
- Do not close the incident without evidence that the replacement path was verified.
