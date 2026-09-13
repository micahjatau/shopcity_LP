# Proposal: Close reports, cards, and SMS correctness gaps

## Why

`docs/repo_review_68.md` finds the underlying infrastructure in the reports, cards, and SMS slices strong, but identifies business-semantics and operational gaps that make some management reports misleading and leave the notification product incomplete. The review was performed against SHA `118facd5bf2dd282a84d4157c7ebcd40cdac0ee6`; implementation must re-check the current branch and preserve unrelated existing work.

This change closes every P1/P2 gap in the review in one bounded correctness release. It does not rewrite the ledger or replace the existing transactional-outbox and worker architecture.

## What changes

### 1. Make executive reporting semantically explicit

- Separate current stock snapshots from historical daily flows. The executive summary will expose a clearly named current snapshot (`asOf`, registered customers, outstanding liability, and other current-state values) alongside a daily series containing only period-attributed flows and explicitly defined cumulative/point-in-time values.
- Do not copy today’s `registeredCustomers`, `creditExpiredKobo`, or `outstandingLiabilityKobo` into every historical `reportDate` row. Either materialize end-of-day historical stocks with an auditable definition or, preferably, remove those stocks from daily rows and expose them only in the current snapshot.
- Preserve watermark/as-of reconstruction: SMS, redemptions, reversals, expiry, and liability calculations must use state known at the requested materialization watermark, not today’s status.
- Document the definitions in the report DTO/OpenAPI descriptions and reporting documentation, including timezone, inclusive date boundaries, branch scope, and whether each value is a stock, flow, cumulative total, or ratio.

### 2. Correct SMS operational counts and add operations detail

- Make status counts mutually meaningful: `queuedCount` counts records currently in `QUEUED`; add `totalCount`/`submittedCount` for all intents created or submitted, as appropriate to the documented definition.
- Retain separate counts for queued, sent, delivered, failed, suppressed, retrying, and dead-lettered records where the source model can prove them. Do not infer delivery from API submission success.
- Add retry attempt totals and safe provider-cost metadata/estimated cost fields. Cost must be integer minor units or a documented decimal-safe representation, never floating-point financial logic; if a provider does not return cost, report it as unavailable rather than fabricating precision.
- Add a supervisor/admin operational query and UI surface for failed, dead-lettered, retry-scheduled, invalid-recipient, and provider-rejected messages. Each item must show transaction/template, masked destination, status, attempts, last attempt, next retry, provider reference, failure category, last error (redacted), and lifecycle timestamps, with tenant/branch authorization enforced.
- Extend the transaction SMS inspection contract with `GET /notifications/sms/{transactionId}` for Supervisor/Admin. Return only the authorized transaction’s notification records and the fields above; preserve PII masking and avoid message content or credentials in logs/evidence.

### 3. Complete cashier activity reporting

Replace the ambiguous cashier `transactionCount` basis with documented fields:

- `earnCount`, `earnPurchaseValueKobo`, and `creditIssuedKobo`;
- `redemptionCount` and `redemptionValueKobo`;
- `approvalRequestCount`;
- `duplicateAttemptCount`;
- `reversalCount`;
- `fraudFlagCount`;
- an optional derived `transactionCount` whose formula is documented and tested.

Count only source events that belong to the cashier, tenant, and selected branch/date scope. Do not double-count approvals, reversals, or duplicate attempts as successful financial transactions. Add empty-state and mixed earn/redeem/exception fixtures.

### 4. Expand redemption reporting

Add the missing TRD-facing aggregate and drilldown data:

- redemption value with a precise confirmed/requested/reversed definition;
- basket ratio with a documented denominator and zero-denominator behavior;
- approval requested/approved/rejected/pending counts;
- lots consumed and allocation count/fragmentation metrics;
- remaining balance, using authoritative active balance at the report as-of point;
- transaction-level drilldown sufficient to inspect the redemption, allocations/lots, approval state, and reversal state without exposing unauthorized customer data.

Keep financial history append-only. These are derived read-model fields and must be rebuildable from authoritative receipts, ledger, lots, allocations, approvals, restorations, and reversal evidence.

### 5. Turn customer performance into useful rankings

Add explicit ranked views/queries rather than returning customer rows ordered by `customerId`:

- top customers by spend;
- highest current liability/balance holders;
- most frequent visitors;
- recently dormant high-value customers.

Support deterministic tie-breaking, date/as-of/branch scope, bounded limits, empty states, and Supervisor branch isolation. Preserve masked PII for non-admins. The UI should render purpose-built ranking tables/cards with labels and units instead of generic key/value items.

### 6. Make report refresh idempotency atomic

Write the refresh audit record, outbox event, and idempotency record in one database transaction. Replays with the same key must return the original result without a second event; conflicting payloads must retain the existing conflict behavior. Add concurrent retry and rollback tests. Do not alter financial transaction idempotency.

### 7. Add card replacement notification

During the existing replacement transaction, create exactly one `card-replaced` outbox event and durable `SmsMessage` intent after the old card is transitioned and the new active card is created. Use a template such as: “Your ShopCity loyalty card ending XXXX was replaced. If you did not request this, contact ShopCity.”

- Add `card-replaced` to the template union/rendering and provider payload validation.
- Include only the masked old/new card suffixes and approved support wording.
- Ensure rollback creates neither the card change nor the SMS intent, and retries do not duplicate the notification.
- Preserve fraud evaluation and existing audit ordering/semantics.

### 8. Canonicalize card serial identity server-side

Introduce one `normalizeCardSerial()` rule and apply it at every trust boundary: DTO validation, idempotency hashing, assignment, replacement, lookup, earn, redeem, offline sync, and persistence. The rule must define trimming, case normalization if serials are case-insensitive, allowed characters, and min/max length. Empty or malformed values must fail consistently.

Migrate existing data safely: detect collisions before enforcing canonical uniqueness, provide an explicit operator-resolution/backfill path, and add a database uniqueness constraint/index over the canonical value within tenant scope. Never silently merge cards or move wallets. Update generated contracts/clients only if the public contract changes.

### 9. Add deliberate blocking confirmation and validate lookup throttle

- Require an explicit UI confirmation before applying `BLOCKED`; retain server-side authorization and state-transition checks.
- Exercise the real scanner/checkout workflow against the current 30/minute lookup throttle. Change the limit only if measured workflow traffic demonstrates false throttling; preserve abuse protection and document the selected limit.

### 10. Make delivery lifecycle truthful and recovery-complete

- Add the eBulkSMS delivery-receipt callback/webhook path if supported, validating authenticity, tenant/message correlation, idempotency, and allowed transitions (`SENT` → `DELIVERED`, with terminal failure handling as documented). Never let callbacks resurrect terminal records or claim delivery without provider evidence.
- If the provider does not support usable delivery receipts, document `QUEUED → SENT` and `FAILED` as the real lifecycle and remove/qualify any UI/report implication that `SENT` means phone delivery.
- Make missing-SMS reconstruction template-aware: financial templates require a transaction reference; expiry reminders require customer identity and expiry context. Reconstruct only when the required source data exists; otherwise classify the record as an operationally visible invalid/dead-letter case.
- Add tests for callback replay, invalid signatures/references, terminal-state protection, expiry-reminder reconstruction, and missing-source failure.

### 11. Add complete semantic and operational verification

Add focused unit, integration, contract, and affected frontend tests for:

- multi-day executive stock/flow semantics and watermark rebuilds;
- empty/non-empty redemption, cashier, customer-ranking, and SMS fixtures;
- mutually meaningful SMS counts, retries, cost-unavailable behavior, and drilldown RBAC/masking;
- card serial normalization, collision handling, replacement SMS, block confirmation, and replacement concurrency;
- atomic refresh idempotency under retry/concurrency;
- delivery-receipt and expiry-reminder recovery paths.

Run the repository verification contract: lint, typecheck, build, Jest unit/integration suites, Semgrep, affected Playwright workflows, OpenSpec validation, GitNexus change detection, and final diff/status inspection. Update reporting/release documentation and the migration tracker for any schema migration.

## Capabilities

### New capabilities

- `truthful-executive-reporting`: Separate current snapshots from historical series and document every report metric’s temporal and financial meaning.
- `transaction-sms-inspection`: Authorized transaction-level SMS lifecycle inspection for support and operations.
- `ranked-customer-performance`: Deterministic, scoped management rankings and high-value dormancy views.
- `card-replacement-notification`: Durable, idempotent customer notification for card replacement.
- `canonical-card-serial-identity`: Server-owned card serial normalization and uniqueness.
- `sms-delivery-receipts`: Provider-backed delivery lifecycle updates, or an explicit submission-only lifecycle when DLR is unavailable.

### Modified capabilities

- `report-read-model-materialization`
- `cashier-activity-reporting`
- `redemption-reporting`
- `sms-operations-reporting`
- `sms-outbox-recovery`
- `card-lifecycle-integrity`
- `report-refresh-idempotency`
- `customer-performance-reporting`

## Impact

- Reports materializer/service/controller, DTOs, OpenAPI, frontend reports workspace, SMS operations UI, and report integration tests.
- Cards service/controller/DTOs, shared card identity helper, earn/redeem/offline-sync boundaries, Prisma schema/migration, generated clients, and card tests.
- SMS templates, provider interface/factory, outbox worker recovery, webhook/callback controller if supported, notification controller, and worker tests.
- Report refresh audit/outbox/idempotency transaction boundary.
- Documentation under `docs/api/`, `docs/architecture/`, `docs/runbooks/`, and `docs/database/migration-tracker.md` where applicable.
- No change to ledger arithmetic, confirmed financial history, wallet ownership, authorization trust boundaries, or deployment topology.

## Acceptance criteria

1. Historical executive rows no longer contain current materialization-time stocks presented as historical dates; snapshot and series contracts are explicit and tested.
2. SMS queued counts represent currently queued work, while total/submitted, sent, delivered, failed, retry, suppressed, and dead-letter semantics are documented and tested.
3. Cashier activity includes earn, redeem, approvals, duplicates, reversals, and fraud flags without double-counting.
4. Redemption reports expose value, ratio, approvals, lot consumption, and authoritative remaining balance, with scoped drilldown.
5. Customer performance provides deterministic top-spend, high-balance, frequent-visitor, and dormant-high-value views.
6. Report refresh audit, outbox, and idempotency writes commit atomically; replay and conflict behavior is stable under concurrency.
7. Card replacement creates exactly one durable replacement SMS intent and preserves existing fraud/audit behavior.
8. Equivalent card serial inputs resolve to one canonical identity across every server boundary; malformed inputs fail closed and existing collision handling is explicit.
9. Blocking requires deliberate confirmation in the UI, and lookup throttling is validated against scanner workflow evidence.
10. SMS delivery is either updated by authenticated, idempotent provider receipts or explicitly documented as submission-only; no UI claims SENT equals delivered.
11. Expiry reminder reconstruction uses customer context rather than incorrectly requiring a transaction ID.
12. Supervisors/Admins can inspect SMS status for an authorized transaction and drill into operational failures with masking and RBAC.
13. All affected tests and repository verification gates pass, with no unreviewed schema/report contract changes and with GitNexus change detection confirming expected scope.

## Non-goals

- No rewrite of ledger, balance, FIFO allocation, redemption authorization, fraud scoring, or append-only financial history.
- No GraphQL, microservices, new queue/worker architecture, or replacement SMS provider unless required only to consume an existing delivery-receipt capability.
- No silent merging/deletion of duplicate cards or historical financial/report rows.
- No fabrication of delivery, provider cost, or historical stock values when authoritative evidence is unavailable.
- No broad frontend redesign beyond the report, SMS operations, transaction inspection, and card-confirmation surfaces required by this proposal.
- No premature incremental-materialization rewrite; record it as a follow-up once correctness is closed.

## Rollback and operational safety

Use additive report fields/contracts and expand-and-contract database changes. Back up and resolve canonical-serial collisions before enforcing uniqueness. If a migration or DLR integration cannot be safely activated, retain the existing proven path, disable only the new surface behind configuration, and document the limitation rather than weakening financial or notification truthfulness. Preserve append-only audit, outbox, SMS, and ledger evidence during rollback.
