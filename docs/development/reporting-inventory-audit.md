# Reporting inventory and semantic audit

## Scope

This audit maps the Review 68 reporting surfaces to their authoritative source
and historical semantics. Report rows are derived read models; they are never a
source of financial truth.

| Surface               | Storage/read model             | Primary source                                                              | Semantics                                                                                        |
| --------------------- | ------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Executive summary     | `ReportDailyFinancialSummary`  | customers, receipts, confirmed ledger entries, credit lots, expiry evidence | Current snapshot plus date-attributed daily flows; monetary values are integer kobo.             |
| Liability ageing      | `ReportLiabilityBucket`        | credit lots, allocations, restorations, expiry evidence                     | End-of-day unexpired balance grouped by expiry month and age bucket.                             |
| Customer performance  | `ReportCustomerSnapshot`       | customers, receipts, confirmed ledger entries, credit lots                  | Bounded customer ranking at `asOf`; balance is authoritative unexpired lot balance.              |
| Cashier activity      | `ReportCashierDailySummary`    | receipts, ledger entries, approvals, fraud flags                            | Daily cashier activity; reversals and duplicate attempts are separate operational metrics.       |
| Redemption summary    | `ReportRedemptionDailySummary` | redemption status history, approvals, allocations, credit lots              | Requested/confirmed/reversed flows attributed to request date; approval outcomes respect `asOf`. |
| SMS operations        | `ReportSmsDailySummary`        | SMS messages and status timestamps                                          | Queue/provider lifecycle counts; `SENT` means provider submission, not handset delivery.         |
| Audit report          | direct audit-log query         | append-only audit log                                                       | Operational evidence, tenant/branch scoped and paginated.                                        |
| Materialization state | `ReportMaterializationState`   | materializer state and reconciliation                                       | Freshness and reconciliation status, not business truth.                                         |

## Shared rules

- All monetary values are integer kobo and serialized without JavaScript floating
  point arithmetic.
- Flow metrics use the event’s business date in the selected branch timezone.
- Stock metrics use the authoritative state at the report’s `asOf` boundary.
- Historical rows are not overwritten with later current balances.
- Tenant and branch scope is enforced in the service query and materializer.
- Status metrics use the status transition visible at `asOf`, not today’s final
  status.
- Empty collections are valid results and must render an explicit empty state.
- SMS cost is `UNAVAILABLE` unless a trusted integer minor-unit tariff is supplied.

## Verification status

Source-level unit, integration, OpenAPI, and frontend tests cover the current
report paths. Real backup/restore evidence, production tenant collision
preflight, and provider billing evidence require their respective environments.
