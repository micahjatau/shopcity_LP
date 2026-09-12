# Tasks: Reports, cards, and SMS correctness closure

## P0 — Reporting truthfulness

- [ ] Inventory current report tables, DTOs, controller responses, CSV columns, and frontend labels against the TRD and review 68.
- [ ] Define and document stock, flow, cumulative, ratio, status, timezone, branch-scope, and as-of semantics.
- [ ] Split executive current snapshot from daily flow series without breaking existing authorized report routes.
- [x] Remove current-materialization stock values from historical daily rows by computing end-of-day liability and date-attributed expiry values.
- [ ] Add multi-day watermark fixtures proving rebuilds do not rewrite historical meaning.
- [x] Correct SMS queued status aggregation and add durable total/retry/dead-letter metrics; migration verification remains pending.
- [x] Expand cashier activity with earn, redemption, approval, duplicate, reversal, and fraud-flag metrics; fraud flags are derived from authoritative records.
- [ ] Expand redemption aggregates with ratio, approval lifecycle, lots consumed, allocation detail, and remaining authoritative balance; ratio/lots/allocation/ending-balance/approval metrics are implemented, drilldown work remains.
- [x] Add deterministic, bounded customer rankings for spend, balance, frequency, and dormant high-value customers, including the management UI selector.
- [ ] Update report DTOs, OpenAPI, CSV export, frontend labels, empty states, and accessibility text. (CSV fields updated; remaining surfaces pending.)
- [ ] Add report unit, integration, contract, and affected Playwright coverage for non-zero, empty, reversed, pending, and multi-branch fixtures.

## P0 — Card lifecycle correctness

- [x] Run a data preflight for noncanonical serials and canonicalization collisions by tenant; added the read-only `preflight:card-serials` command and operator runbook.
- [x] Define `normalizeCardSerial()` format and invalid-input error contract.
- [ ] Apply normalization at DTO, idempotency hash, assignment, replacement, lookup, earn, redeem, offline-sync, and persistence boundaries.
- [ ] Resolve existing collisions through an explicit operator/data-migration procedure; never merge wallets silently.
- [ ] Apply expand-and-contract schema/index migration and update `docs/database/migration-tracker.md`.
- [ ] Add unit/integration tests for whitespace, case, malformed/empty values, collision handling, and all lifecycle entry points. (Implementation contract added; broader coverage remains pending.)
- [x] Add `card-replaced` template and create exactly one replacement SMS intent/outbox pair inside replacement transaction.
- [ ] Test replacement rollback, retry/idempotency, fraud evidence, and replacement concurrency.
- [ ] Add UI confirmation for blocking and test cancel/confirm plus server-side authorization.
- [ ] Exercise scanner traffic against the 30/minute lookup throttle; change/document the threshold only with workflow evidence.

## P0 — SMS inspection, lifecycle, and recovery

- [x] Add `GET /notifications/sms/{transactionId}` for Supervisor/Admin with tenant/branch authorization, masking, redaction, OpenAPI coverage, and bounded pagination.
- [ ] Add transaction UI Inspect action and operational SMS failure/retry/dead-letter drilldown.
- [ ] Confirm eBulkSMS delivery-receipt capabilities and callback authentication requirements.
- [ ] If supported, implement authenticated/idempotent provider callback handling and monotonic status transitions.
- [ ] If unsupported, document submission-only lifecycle and update report/UI labels to avoid implying phone delivery; callback support is not documented, while eBulkSMS DLR polling remains to be implemented.
- [ ] Add provider-cost metadata/estimated-cost fields using integer minor units or an explicit unavailable state; document estimation limits.
- [ ] Make worker SMS reconstruction template-aware for financial notifications and expiry reminders.
- [ ] Add callback replay, invalid callback, terminal-state, expiry-reminder, missing-source, retry, and dead-letter tests.
- [ ] Verify no credentials, message content, provider payloads, or unmasked PII enter logs or evidence.

## P1 — Report refresh reliability

- [x] Put refresh idempotency record, audit row, and outbox event in one transaction.
- [ ] Preserve replay and conflicting-payload behavior and add rollback/concurrent retry tests.
- [ ] Verify report refresh authorization and branch/tenant scope remain unchanged.

## P1 — Documentation and contracts

- [ ] Update report metric definitions and SMS lifecycle documentation.
- [x] Update notification support/runbook procedures for transaction inspection and failure triage.
- [x] Document provider DLR/cost limitations and the incremental-materialization follow-up separately; DLR polling implementation remains pending.
- [ ] Regenerate generated OpenAPI/client artifacts where source contracts change.

## P1 — Verification gates

- [ ] Run targeted reports/cards/SMS tests.
- [ ] Run lint, typecheck, build, full unit/integration tests, and Semgrep.
- [ ] Run affected Playwright workflows and OpenAPI validation/diff checks.
- [ ] Run OpenSpec validation.
- [ ] Run GitNexus `detect_changes()` and inspect expected blast radius/diff/status.
- [ ] Record final residual risks and migration evidence before implementation sign-off.

## P2 — Follow-up, not implementation blocker

- [ ] Design incremental report materialization by day/watermark after pilot volume data is available.
- [ ] Establish provider billing reconciliation if estimated SMS cost must become invoice-accurate.
