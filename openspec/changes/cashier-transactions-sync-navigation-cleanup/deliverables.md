# Final Deliverables Draft

## Final revision

- HEAD: `b535232d4a42af53f43d7c94b8fba35c32a29586`
- OpenSpec change: `cashier-transactions-sync-navigation-cleanup`
- Status: implementation and verification complete for the scoped frontend change; repository commit not created.

## Changed-file rationale

- Shell/navigation: canonical Cashier destinations and active route behavior.
- Cashier overview: “View all transactions” now targets `/cashier/transactions`.
- Cashier Transactions route/dashboard: bounded Cashier Today list, exact receipt/transaction matching, normalized status/credit filters, authoritative detail request, truthful modal fields, focus lifecycle, stale-response protection.
- Supervisor/Admin transaction routes: retain `TransactionWorkspace` and reversal behavior; no longer mount the Cashier Today dashboard.
- Cashier Sync Queue: controlled search/status filtering, full-queue summaries, selected details, batch actions, technical disclosure, operational copy, responsive mobile grids.
- Cashier workflow/forms: supported card-lookup copy and operational Earn/Redeem outcome language.
- Tests/evidence: deterministic route fixtures, route helper, modal/race tests, responsive assertions, screenshots, and this evidence set.

Pre-existing unrelated dirty files, including root guidance and admin/supervisor overview surfaces, remain preserved and are not part of this change rationale.

## Route/sidebar map

| Role       | Primary destinations                                                                                                  | Transaction authority                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Cashier    | Overview → Find Customer → Capture Purchase → Redeem Credit → Transactions → Sync Queue                               | Bounded Cashier Today activity; no reversal           |
| Supervisor | Overview → Transactions → Customers → Cards → Approvals → Fraud → Reports                                             | TransactionWorkspace and authorized reversal flow     |
| Admin      | Overview → Operations → Transactions → Approvals → Fraud → Customers → Cards → Adjustments → Reports → Audit → Access | TransactionWorkspace and authorized management routes |

Customer deep links remain available at `/cashier/customers`; they are not a primary Cashier navigation item.

## Search capability matrix

| Surface              | Supported search                             | Execution                | Unsupported claims avoided                                               |
| -------------------- | -------------------------------------------- | ------------------------ | ------------------------------------------------------------------------ |
| Global topbar        | None; explicitly noninteractive              | No request               | No implied global search scope                                           |
| Find Customer        | Card serial lookup                           | Submit/Enter/Scan action | Phone/name discovery is not fabricated without an authoritative contract |
| Cashier Transactions | Exact receipt number or transaction ID       | Local filter             | No substring ambiguity or complete-history claim                         |
| Sync Queue           | Receipt number, card serial, local record ID | Local controlled filter  | Summary counts remain full-queue counts                                  |

## Transactions parity review

- Desktop list screenshot: `tests/workflow-routes.spec.ts-snapshots/cashier-transactions-list-linux.png`
- Open detail screenshot: `tests/workflow-routes.spec.ts-snapshots/cashier-transactions-detail-linux.png`
- Reviewed hierarchy: Cashier workspace heading, bounded activity copy, refresh, filters, result count, table, status badge, backdrop, modal close control, authoritative fields.
- Accepted deviations: no receipt image, customer name, fabricated audit trail, reversal control, or complete-history pagination.

## Sync Queue state/copy matrix

| State             | Presentation/action                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------- |
| Empty             | Offline transaction queue explanation and empty queue state                                          |
| Waiting           | Waiting count and sync action                                                                        |
| Syncing           | Syncing count and disabled/busy action state                                                         |
| Awaiting approval | Approval badge and per-record result                                                                 |
| Confirmed         | Confirmed badge and explicit cleanup confirmation                                                    |
| Rejected          | Rejected badge and truthful error state                                                              |
| Retry required    | Retry action requeues the local record                                                               |
| Mobile            | Stacked controls, no horizontal overflow, selected details and technical disclosure remain reachable |

Mobile screenshot: `tests/workflow-routes.spec.ts-snapshots/sync-queue-mobile-empty-linux.png`.

## Verification results

- Focused Jest suites: passed.
- Full affected `workflow-routes.spec.ts`: 14/14 passed.
- `browser-a11y.spec.ts`: 2/2 passed.
- Web lint: passed.
- Web typecheck: passed.
- Web build: passed.
- Semgrep OWASP scan: 0 findings.
- OpenSpec validation: valid.
- GitNexus impact analysis: completed before affected symbol edits.
- GitNexus `detect_changes --scope all`: inspected result of 28 files, 41 symbols, 37 affected processes, risk CRITICAL. The aggregate includes unrelated pre-existing dirty files; this expected-scope exception is recorded and no commit or staging was performed.

## Remaining intentional risks

- Phone/name customer discovery remains unsupported pending an authoritative backend contract.
- Aggregate GitNexus scope cannot be cleanly certified until unrelated working-tree changes are separated.
- No deployment, database, Supabase, or production mutation was performed.
