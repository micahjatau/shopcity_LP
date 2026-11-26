# Preview cashier/POS non-mutating acceptance plan — 2026-11-26

## Status and scope

**Prepared; not executed.** Scheduler certification for the repaired workerless F1 flow is **GO** (see `preview-f1-helper-repair-closeout-2026-11-26.md`). Cashier/POS application acceptance is a separate, still-open item. The readiness check verifies POS HMAC-key health without reading the key; it did not exercise a signed cashier session or transaction.

This bounded acceptance slice verifies an existing authorized cashier's device-bound authentication and branch-scoped, read-only card lookup in Preview. It makes **no earn, redemption, adjustment, approval, or other financial request** and is designed not to change any customer balance, ledger, credit lot, receipt, or approval. It is not full financial-workflow acceptance.

## Preconditions and authorization

Do not execute until all of these are confirmed by the accountable Preview/Operations owner:

- Written authorization identifies the Preview window, cashier tester, and already-authorized POS device. Use the standard device-bound login flow; do not create a device, rotate/retrieve POS HMAC or scheduler secrets, bypass attestation, or use a test-session shortcut.
- Use only an existing dedicated smoke tenant/branch, test cashier, active branch-bound test device, and synthetic test card/customer provisioned for Preview. Never look up a real customer or use production identifiers/PII. If an approved fixture or device is unavailable, stop rather than create or modify one.
- Confirm the existing Preview cashier UI/BFF target is already approved and points to the certified Preview API release. Do not deploy, retarget an alias, change Vercel settings, or modify environment variables for this test.
- Confirm SMS remains disabled using the existing approved configuration/status evidence. Do not change SMS mode/cutoff, call a provider, replay or drain the backlog, or change schedules. Keep the seven-job inventory, F10 ownership, and all 28 historical pending SMS events untouched.
- Capture a minimal, secret-free baseline for the synthetic fixture only. Do not export or scan unrelated customer data.

The repository smoke-fixture requirements are in `docs/runbooks/smoke-testing.md`. This plan is intentionally narrower than the full staging smoke suite and does not launch `npm run smoke:staging`.

## Bounded procedure

Limit the run to **one cashier, one existing authorized device, one synthetic test card, one login, one read-only lookup, and one logout**, within 15 minutes. No retry or alternate identity/device is allowed after an authentication or authorization failure.

1. Verify the target is Preview and `/health/ready` is healthy. The ready response may be recorded as a status only; do not collect environment values or secrets.
2. Sign in through the normal cashier UI on the authorized device. Confirm the session is device-bound and the returned role/tenant/branch match the approved synthetic fixture. Do not copy cookies, bearer tokens, CSRF values, device tokens, or attestation material into evidence.
3. In the cashier UI, look up only the synthetic test card. The UI's read-only lookup uses `GET /api/v1/cards/lookup/:serialNumber`. Confirm the card/customer is the approved active test fixture and the response is scoped to its tenant/branch. Do not invoke `POST /api/v1/transactions/earn`, `POST /api/v1/transactions/redeem`, adjustments, approvals, or other write routes.
4. Confirm the synthetic fixture's displayed/read-only balance equals its captured baseline. Verify no new receipt, confirmed/pending ledger entry, credit lot, redemption, approval, or customer-balance delta resulted. If a supported read-only evidence view is unavailable, record that limitation; do not use direct SQL writes or broaden data access.
5. Confirm no SMS provider submission or replay occurred and the protected historical pending-event count/state remains unchanged. Do not inspect or submit provider payloads.
6. Log out normally. Record only the UTC window, target label, deployed release SHA, non-secret fixture identifiers, request IDs/statuses, role/tenant/branch checks, baseline/post-test equality, and any stop condition. Exclude PII, tokens, cookies, keys, passwords, connection strings, and raw headers/bodies.

## Stop conditions

Stop immediately, preserve evidence, and make no retry if the target is not Preview; the fixture is not synthetic or branch-bound as expected; device/session binding or role scope fails; the ready/key-health check is unhealthy; any `429 RATE_LIMITED` response occurs; a read-only route causes an unexpected write; the SMS backlog/provider state changes; or the intended UI would require an earn/redemption to proceed. Do not clear throttles, reset credentials, alter Cron, start workers, send SMS, or compensate by editing ledger/balance data.

## Acceptance result and remaining work

A pass certifies only **device-bound cashier authentication plus read-only synthetic-card lookup**. It does not certify signed earn/redemption, a purchase workflow, or full cashier acceptance. Any future financial-workflow acceptance must have a separate explicit authorization, a dedicated synthetic customer/card and an approved balance-change budget; it must use normal cashier flows and reconcile append-only financial history. No such transaction is authorized or performed by this plan.
