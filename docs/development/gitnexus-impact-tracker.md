# GitNexus Impact Tracker

Use this tracker when preparing a spec proposal. Run `npm run proposal:impact -- --file <path> <symbol>` for the planned change surface, then record the symbol-level blast radius here.

## Rules

- Run impact analysis before drafting a spec proposal.
- Record the exact symbol, risk, and impacted count.
- Call out HIGH or CRITICAL results explicitly.
- Update the tracker whenever proposal scope changes.

## Findings

### 2026-10-21 — Cashier recent-redemptions table (pre-draft impact)

Proposal-time impact ran with `npm run proposal:impact -- --file apps/web/components/workflows/cashier-transaction-route.tsx CashierWorkflowRoute`. GitNexus reports LOW risk with 3 impacted symbols, all 3 direct dependants, and no affected processes/modules; no HIGH/CRITICAL result. The result comes from an index at `f99f79e` while HEAD is `daf7b21`. Refresh was attempted, but analysis failed because the local `file_fts` index is inconsistent (`document for node offset 1933 is missing during delete`). Preserve the stale index and treat this result as limited until it can be repaired. Planned scope is a Redeem-only presentation component using the existing cashier-today report; no backend, schema, or financial-write changes.

```text
npm run proposal:impact -- --file apps/web/components/workflows/cashier-transaction-route.tsx CashierWorkflowRoute
node .gitnexus/run.cjs impact --repo shopcity_LP --file apps/web/components/workflows/cashier-transaction-route.tsx CashierWorkflowRoute --summary-only
```

### 2026-10-13 — Keep Supervisor report snapshots current on quiet days

| Symbol                                  | Risk | Impacted | Direct | Processes | Notes                                                                                                                                                                              |
| --------------------------------------- | ---: | -------: | -----: | --------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildDailyFinancialSummaries`          |  LOW |        6 |      2 |         0 | Called by tenant and branch planning; include the as-of business date so closing balances do not stop on the last transaction/expiry date. Flow totals remain zero on quiet dates. |
| `ReportMaterializerService.materialize` |  LOW |        4 |      3 |         0 | Shared by tenant, branch, and rebuild entrypoints; keep source calculation and scope authorization unchanged.                                                                      |

```text
npm run proposal:impact -- --file src/modules/reports/report-materializer.service.ts buildDailyFinancialSummaries
gitnexus impact materialize --direction upstream --repo shopcity_LP --file src/modules/reports/report-materializer.service.ts
```

Both symbol-level results are LOW; no HIGH/CRITICAL risk was reported. The existing five-minute materialization worker remains responsible for producing refreshed snapshots; Supervisor dashboard refresh remains a read-only reload.

### 2026-10-13 — Supervisor flagged-activity review redesign

Proposal-time upstream impact with tests included:

```text
npm run proposal:impact -- --file apps/web/components/workflows/fraud-flags-panel.tsx FraudFlagsPanel
npm run proposal:impact -- --file 'apps/web/app/(shell)/supervisor/fraud/page.tsx' SupervisorFraudPage
npm run proposal:impact -- --file src/modules/fraud/fraud-review.service.ts FraudReviewService.listFraudFlags
npm run proposal:impact -- --file src/modules/fraud/fraud.controller.ts listFraudFlags
```

| Symbol                              | Risk | Impacted symbols | Direct dependants | Affected processes                   |
| ----------------------------------- | ---: | ---------------: | ----------------: | ------------------------------------ |
| `FraudFlagsPanel`                   |  LOW |                3 |                 3 | SupervisorFraudPage, AdminFraudPage  |
| `SupervisorFraudPage`               |  LOW |                0 |                 0 | 0                                    |
| `FraudReviewService.listFraudFlags` |  LOW |                2 |                 2 | 1 (`FraudController.listFraudFlags`) |
| `FraudController.listFraudFlags`    |  LOW |                0 |                 0 | 0                                    |

No HIGH/CRITICAL result. Keep the neutral redesign isolated to the Supervisor variant; Admin presentation and behavior remain unchanged. The list-read additions are tenant/branch-scoped and additive; authorization and decision writes remain unchanged. `FR-HV-003` remains the canonical runtime/persisted redemption code; `FR-RED-001` is retained only as a presentation alias. Existing dirty worktree changes are preserved.

### 2026-10-13 — Server-side pagination for Cashier Transactions

| Symbol                               | Risk | Impacted | Direct | Processes | Notes                                                                                                                                             |
| ------------------------------------ | ---: | -------: | -----: | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReportsService.listCashierToday`    |  LOW |        1 |      1 |         1 | The controller is the direct caller; preserve the existing cashier/tenant/branch/current-day bounds while adding page slicing and a scoped count. |
| `ReportsController.listCashierToday` |  LOW |        0 |      0 |         0 | Query parsing and response schema are confined to this endpoint.                                                                                  |
| `TransactionDashboard`               |  LOW |        1 |      1 |         1 | Used by `CashierTransactionsPage`; other Cashier Today consumers keep their existing default page and limit behavior.                             |

```text
gitnexus impact listCashierToday --direction upstream --repo shopcity_LP --file src/modules/reports/reports.service.ts
gitnexus impact listCashierToday --direction upstream --repo shopcity_LP --file src/modules/reports/reports.controller.ts
gitnexus impact TransactionDashboard --direction upstream --repo shopcity_LP
```

All results are LOW; no HIGH/CRITICAL risk was reported. Pagination remains within the authenticated cashier's branch-local current-day scope.

### 2026-10-13 — Atomic redemption settlement

| Symbol                                    |     Risk | Impacted | Direct | Processes | Notes                                                                                                                                                                                       |
| ----------------------------------------- | -------: | -------: | -----: | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RedemptionsService.redeem`               |      LOW |        2 |      2 |         0 | Creates the immediate settlement; request/controller and integration test are direct dependants.                                                                                            |
| `LoyaltyService.decideRedemptionApproval` | **HIGH** |       10 |      1 |         3 | Approval execution path; the affected approval flows include decision, approve-receipt, and reject-receipt. Keep pending effects absent and execute debit+earn atomically only on approval. |
| `LoyaltyService.earn`                     |   MEDIUM |       12 |      8 |         1 | Shared earn calculation has many callers, including offline sync. Preserve normal Earn/offline behavior; reuse only the existing integer formula/policy semantics.                          |
| `calculateCreditKobo`                     | **HIGH** |       19 |      2 |         4 | Direct callers span Earn, approvals, receipts, and offline sync; arithmetic reuse must preserve exact integer rounding and legacy behavior.                                                 |
| `addMonths`                               | **HIGH** |       19 |      2 |         4 | UTC expiry month-clamp feeds Earn, approvals, and offline sync; shared extraction must preserve leap-day/month-end behavior exactly.                                                        |
| `resolveCaptureStatus`                    | **HIGH** |       16 |      2 |         4 | Used by Earn approval/capture and offline sync; settlement-specific policy decisions must not change those existing paths.                                                                  |
| `getApprovalPolicyVersion`                | **HIGH** |       16 |      2 |         4 | Approval policy version reaches approval, receipt, and offline-sync execution; preserve existing fingerprint semantics.                                                                     |
| `buildRedemptionConfirmedSmsPayload`      | **HIGH** |       10 |      3 |         3 | Used by immediate redemption and redemption approval plus provider tests. Preserve legacy queued payload compatibility while sending one settlement notification for new confirmations.     |
| `ReversalsService.reverse`                |      LOW |        3 |      2 |         0 | Inspect paired-effect reversal safety; never allow one settlement leg to be reversed silently.                                                                                              |
| `ReportsService.listCashierToday`         |      LOW |        2 |      2 |         1 | Cashier report row is receipt-based today; must represent both settlement effects without losing cashier scope/bounds.                                                                      |
| `LoyaltyService.getTransaction`           |      LOW |        4 |      4 |         0 | Transaction detail should expose both effects for the shared receipt while preserving each ledger entry's identity.                                                                         |

```text
npm run proposal:impact -- --file src/modules/redemptions/redemptions.service.ts redeem
npm run proposal:impact -- --file src/modules/loyalty/loyalty.service.ts decideRedemptionApproval
npm run proposal:impact -- --file src/modules/loyalty/loyalty.service.ts earn
npm run proposal:impact -- --file src/jobs/sms.templates.ts buildRedemptionConfirmedSmsPayload
node scripts/gitnexus.cjs impact -r shopcity_LP --file src/modules/reversals/reversals.service.ts --include-tests reverse --summary-only
node scripts/gitnexus.cjs impact -r shopcity_LP --file src/modules/reports/reports.service.ts --include-tests listCashierToday --summary-only
node scripts/gitnexus.cjs impact -r shopcity_LP --file src/modules/loyalty/loyalty.service.ts --include-tests getTransaction --summary-only
```

The HIGH results are acknowledged. Keep the change bounded to redemption settlement/approval, its truthful transaction read models and SMS, with normal Earn and offline sync semantics unchanged. No remote database mutation is in scope.

### 2026-10-13 — Figma Redeem workflow redesign

| Symbol                         |         Risk | Impacted | Direct | Processes | Notes                                                                                                                                      |
| ------------------------------ | -----------: | -------: | -----: | --------: | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `CashierWorkflowRoute`         |     **HIGH** |        4 |      4 |         3 | Shared by Earn, Lookup, and Redeem. Only Redeem presentation and transitions will change; validate all three route consumers.              |
| `RedeemTransactionForm`        |          LOW |        2 |      2 |         0 | Exact form callers only; controller, request payload, and server authority remain unchanged.                                               |
| `CustomerConfirmationSummary`  |     **HIGH** |        4 |      1 |         3 | Redeem-only use in the route; removing the redundant stage still touches the shared route.                                                 |
| `RedeemLookupContext`          |      UNKNOWN |        0 |      0 |         0 | Type symbol is not indexed; direct usages will be inspected and covered by TypeScript/unit tests.                                          |
| `SupervisorVirtualCardPreview` | **CRITICAL** |       11 |      3 |         6 | Shared by Cashier/Supervisor profiles and workflow consumers. Do not modify this component; any Redeem card composition must remain local. |

```text
npm run proposal:impact -- --file apps/web/components/workflows/cashier-transaction-route.tsx CashierWorkflowRoute
npm run proposal:impact -- --file apps/web/components/workflows/redeem-transaction-form.tsx RedeemTransactionForm
node .gitnexus/run.cjs impact CustomerConfirmationSummary --repo shopcity_LP --file apps/web/components/workflows/cashier-transaction-route.tsx --direction upstream --summary-only
node .gitnexus/run.cjs impact RedeemLookupContext --repo shopcity_LP --file apps/web/components/workflows/use-redeem-transaction-controller.ts --direction upstream --summary-only
node .gitnexus/run.cjs impact SupervisorVirtualCardPreview --repo shopcity_LP --file apps/web/components/workflows/supervisor-virtual-card-preview.tsx --direction upstream --summary-only
```

HIGH/CRITICAL findings are acknowledged. Do not edit `SupervisorVirtualCardPreview`; keep all changed markup and styles Redeem-scoped and retain regression coverage for Earn and Lookup.

### 2026-10-13 — Align Earn amount semantics and TRD default rate

| Symbol                   |     Risk | Impacted | Direct | Processes | Notes                                                                                                                                                                                                                                              |
| ------------------------ | -------: | -------: | -----: | --------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EarnTransactionForm`    | **HIGH** |        4 |      1 |         3 | Review display remains Earn-scoped, uses server policy context (TRD default 200 bps / 2%), and treats the recorded full purchase amount as eligible because the API has no item-level eligible field. No payload or calculation authority changes. |
| `EarnTransactionSuccess` |  UNKNOWN |        0 |      0 |         0 | New symbol is not yet indexed. Source confirms it is rendered only by the confirmed Earn branch in `EarnTransactionForm`; the success receipt/eligible values both use authoritative `purchaseAmountKobo`.                                         |

```text
node .gitnexus/run.cjs impact EarnTransactionForm --file apps/web/components/workflows/earn-transaction-form.tsx --kind Function --repo shopcity_LP --direction upstream --summary-only
node .gitnexus/run.cjs impact EarnTransactionSuccess --file apps/web/components/workflows/earn-transaction-success.tsx --kind Function --repo shopcity_LP --direction upstream --summary-only
```

The HIGH result is acknowledged; changes are limited to Earn presentation and tests. Shared Lookup/Redeem behavior and financial/API contracts are unchanged.

### 2026-10-13 — Figma Capture Purchase confirmed Earn success result

| Symbol                 |     Risk | Impacted | Direct | Processes | Notes                                                                                                                                                                  |
| ---------------------- | -------: | -------: | -----: | --------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EarnTransactionForm`  | **HIGH** |        7 |      3 |         3 | The confirmed-result branch is replaced with an Earn-only card; pending approval and receipt/review stages remain separate. API and financial authority are unchanged. |
| `CashierWorkflowRoute` | **HIGH** |        4 |      4 |         3 | Passes the session display label and completes the final step only after confirmed Earn; Lookup and Redeem composition/step mapping are preserved.                     |

```text
npm run proposal:impact -- --file apps/web/components/workflows/earn-transaction-form.tsx EarnTransactionForm
npm run proposal:impact -- --file apps/web/components/workflows/cashier-transaction-route.tsx CashierWorkflowRoute
```

GitNexus reports affected processes for Cashier Earn, Redeem, and Lookup because these route consumers share workflow symbols. The implementation remains restricted to the Earn success branch and confirmed-state step completion.

### 2026-10-13 — Figma Step 2 Capture Purchase confirmation card

| Symbol                 |    Risk | Impacted | Direct | Processes | Notes                                                                                                                       |
| ---------------------- | ------: | -------: | -----: | --------: | --------------------------------------------------------------------------------------------------------------------------- |
| `CashierWorkflowRoute` | **LOW** |        3 |      3 |         0 | Step 2 markup is in the Earn branch and its styles are Earn-scoped; Lookup and Redeem presentation/behavior stay unchanged. |

```text
node .gitnexus/run.cjs impact CashierWorkflowRoute --file apps/web/components/workflows/cashier-transaction-route.tsx --kind Function --repo shopcity_LP --direction upstream --summary-only
```

The index was stale at `b2603c2` against current commit `600317e`; refresh failed with an inconsistent FTS index, so the LOW result uses the existing index. The change was also checked directly for Earn-only markup/CSS scope. No API calls, eligibility rules, or financial workflow behavior are changed.

### 2026-10-12 — Populate Cashier Overview recent-transactions columns

`CashierOverviewLookup` has LOW upstream risk: no indexed callers. `ReportsService.listCashierToday` has LOW risk with one direct controller caller and one affected process; `ReportsController.listCashierToday` has LOW risk and no indexed dependants. The change adds read-only customer-name and receipt purchase-amount projections to the existing cashier/branch/tenant-scoped endpoint; role and scope enforcement remain unchanged.

```text
npm run proposal:impact -- --file openspec/changes/align-cashier-layouts-to-prototype/proposal.md CashierOverviewLookup
node .gitnexus/run.cjs impact listCashierToday --file src/modules/reports/reports.service.ts --kind Method --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact listCashierToday --file src/modules/reports/reports.controller.ts --kind Method --repo shopcity_LP --direction upstream
```

No HIGH/CRITICAL symbol-level impact was reported.

### 2026-10-12 — Supervisor and Admin Operational Reports presentation and role controls

| Symbol                                                                                              |     Risk | Impacted | Direct | Processes | Notes                                                                                                                          |
| --------------------------------------------------------------------------------------------------- | -------: | -------: | -----: | --------: | ------------------------------------------------------------------------------------------------------------------------------ |
| `SupervisorOperationalReports` (`apps/web/components/workflows/supervisor-operational-reports.tsx`) |      LOW |        2 |      2 |         1 | Existing Supervisor wrapper remains unchanged; the added Admin audience is served by the shared dashboard implementation.      |
| `OperationalReportsDashboard` (`apps/web/components/workflows/supervisor-operational-reports.tsx`)  |  UNKNOWN |        0 |      0 |         0 | New symbol was not present in the index; its route callers were verified directly in source.                                   |
| `AdminReportsPage` (`apps/web/app/(shell)/admin/reports/page.tsx`)                                  |      LOW |        0 |      0 |         0 | Admin route maps to the shared presentation; Admin shell authorization remains unchanged.                                      |
| `ReportsWorkspace` (`apps/web/components/workflows/reports-workspace.tsx`)                          | **HIGH** |        6 |      4 |         3 | Shared by Supervisor Reports, Admin Reports, and Admin Operations; role flags are opt-in and Admin Operations remains default. |
| `formatReportMoney` (`apps/web/lib/reports/supervisor-report-metrics.ts`)                           |      LOW |        7 |      4 |         2 | Display-only conversion to exact integer/decimal formatting; API values and calculations are unchanged.                        |

The reports controller exposes most report reads to both `SUPERVISOR` and `ADMIN`; audit, pilot operations, and materialization refresh are Admin-only. Audit and pilot operations are tenant-wide under their existing API contracts. The TRD role table/RBAC matrix does not consistently match controller declarations. The export path is rate limited to 10 requests per minute per actor/report; report-list reads and refresh do not declare that throttle in the inspected controller. The backend emits its existing `success/error/meta.requestId` envelope rather than RFC 7807. This change preserves those contracts and authorization; it does not grant a role access the backend does not already permit. GitNexus did not resolve `formatReportBusinessDate` or `formatReportTimestamp` (UNKNOWN, 0 indexed impacts); their direct call sites and usages were inspected in source.

### 2026-10-12 — Add persisted late-claim approvals and server-side category counts

GitNexus reports `LoyaltyService.earn` at MEDIUM risk (7 direct callers, 9 total impacts), `listApprovals` LOW (4), `decideApproval` LOW (8), `ApprovalsController` LOW (4), and `buildApprovalListWhere` LOW (5). The index is stale and reported no execution processes for these symbols; tests and source were separately traced. Earn changes remain constrained to receipt age >7 days, pending approval, and no financial effect until existing audited decision execution. No HIGH/CRITICAL result was reported.

```text
node .gitnexus/run.cjs impact earn --file src/modules/loyalty/loyalty.service.ts --kind Method --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact listApprovals --file src/modules/loyalty/loyalty.service.ts --kind Method --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact decideApproval --file src/modules/loyalty/loyalty.service.ts --kind Method --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact ApprovalsController --file src/modules/approvals/approvals.controller.ts --kind Class --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact buildApprovalListWhere --file src/modules/loyalty/loyalty.service.ts --kind Function --repo shopcity_LP --direction upstream
```

### 2026-10-12 — Restrict Supervisor approval categories and define late receipt claims

`ApprovalsPanel` has LOW upstream risk: two direct dependants, no affected processes or modules. `categoryForApproval` and `SupervisorApprovalCenter` were not individually resolvable in the stale index, so the containing exported panel was used as the impact target. The category presentation remains Supervisor-only; Admin behavior and decision/API workflows are unchanged.

```text
node .gitnexus/run.cjs impact ApprovalsPanel --file apps/web/components/workflows/approvals-panel.tsx --kind Function --repo shopcity_LP --direction upstream --summary-only
```

No HIGH/CRITICAL symbol-level impact was reported.

### 2026-10-12 — Require the cashier Earn occurrence timestamp

GitNexus reports HIGH upstream risk for `EarnTransactionForm` (7 impacted symbols, 3 direct dependants) and `useEarnTransactionController` (8 impacted symbols, 1 direct dependant); each is associated with the `CashierEarnPage`, `CashierLookupPage`, and `CashierRedeemPage` processes in the Shopcity module. The change is limited to cashier Earn client-side required/validity checks and preserving the empty state safely; the backend contract and financial/late-claim rules are unchanged.

```text
npm run proposal:impact -- --file apps/web/components/workflows/earn-transaction-form.tsx EarnTransactionForm
npm run proposal:impact -- --file apps/web/components/workflows/use-earn-transaction-controller.ts useEarnTransactionController
```

No HIGH/CRITICAL result is ignored; the reported HIGH risk is contained to UI form validation.

### 2026-10-12 — Add category-specific approval columns and Card-style filter menus

After refreshing the stale index, `SupervisorApprovalCenter` reports LOW upstream risk: 4 impacted symbols (1 direct dependant), two indexed approval processes (`SupervisorApprovalsPage` and `AdminApprovalsPage`), and the Workflows module. The changed table headers/cells and custom filter menus remain confined to the Supervisor approval presentation branch; the Admin presentation and audited decision handlers are unchanged.

```text
npm run proposal:impact -- --file apps/web/components/workflows/approvals-panel.tsx SupervisorApprovalCenter
```

No HIGH/CRITICAL symbol-level impact was reported.

### 2026-10-11 — Align Supervisor Transactions table and filters to Customers directory

`SupervisorTransactionsDashboard` has LOW upstream risk: zero direct dependants, affected processes, or modules. The presentation changes preserve branch scope, explicit filter submission, pagination, transaction detail, and reversal safeguards; Refresh now uses the bordered Customers table action-pill treatment, and the amount field's label/placeholder use `Minimum amount (₦)` with a consistent 12px placeholder size throughout the route.

```text
node .gitnexus/run.cjs impact --repo shopcity_LP --direction upstream --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx SupervisorTransactionsDashboard
```

No HIGH/CRITICAL symbol-level impact was reported.

### 2026-10-11 — Match issued-card table and controls to Customers directory

`SupervisorIssuedCardDirectory` has LOW upstream risk: one direct dependant (`SupervisorCardWorkflows`), no affected processes or modules. The directory now reuses the Customers table action/toolbar/filter/primary-button styles, with card-specific column widths; API and lifecycle behavior are unchanged.

```text
node .gitnexus/run.cjs impact --repo shopcity_LP --direction upstream --file apps/web/components/workflows/supervisor-issued-card-directory.tsx SupervisorIssuedCardDirectory
```

No HIGH/CRITICAL symbol-level impact was reported.

### 2026-10-11 — Match the Supervisor Customers status dropdown to the filter button

`SupervisorCustomerWorkflows` has LOW upstream risk: zero direct dependants, affected processes, or modules. The status menu is scoped to the customer directory; no shared UI primitive or customer filtering semantics are changed.

```text
node .gitnexus/run.cjs impact --repo shopcity_LP --direction upstream --file apps/web/components/workflows/supervisor-customer-workflows.tsx SupervisorCustomerWorkflows
```

No HIGH/CRITICAL symbol-level impact was reported.

### 2026-10-11 — Replace the temporary issue-date picker with the authorized SOM component

`SupervisorIssuedCardDirectory` has LOW upstream risk: one direct dependant (`SupervisorCardWorkflows`), no affected processes or modules. The local index is stale; the attempted re-index failed because its FTS index is inconsistent, but the existing index resolved the symbol and direct caller.

```text
node .gitnexus/run.cjs impact --repo shopcity_LP --direction upstream --file apps/web/components/workflows/supervisor-issued-card-directory.tsx SupervisorIssuedCardDirectory
```

No HIGH/CRITICAL symbol-level impact was reported. The change is confined to date-picker presentation/event mapping; the issued-card endpoint, tenant/date filtering semantics, and lifecycle protections remain unchanged.

### 2026-10-11 — Refine issue-date and assignment controls

`SupervisorIssuedCardDirectory` has LOW upstream risk: one direct dependant (`SupervisorCardWorkflows`), no affected processes or modules. This refinement changes the date trigger, popup presentation, selected-range field, and toolbar button sizing only; API filters and card workflows are unchanged.

```text
node .gitnexus/run.cjs impact --repo shopcity_LP --direction upstream --file apps/web/components/workflows/supervisor-issued-card-directory.tsx SupervisorIssuedCardDirectory
```

No HIGH/CRITICAL symbol-level impact was reported.

### 2026-10-11 — Style Supervisor issued-card status options

`SupervisorIssuedCardDirectory` has LOW upstream risk: one direct dependant (`SupervisorCardWorkflows`), no affected processes or modules. The native select is replaced locally by an accessible styled listbox; shared Select behavior remains untouched.

```text
node .gitnexus/run.cjs impact --repo shopcity_LP --direction upstream --file apps/web/components/workflows/supervisor-issued-card-directory.tsx SupervisorIssuedCardDirectory
```

No HIGH/CRITICAL symbol-level impact was reported.

### 2026-10-10 — Polish Supervisor issued-card controls

Upstream GitNexus impact is LOW for each edited UI symbol: `SupervisorIssuedCardDirectory` (1 impacted symbol; 1 `SupervisorCardsPage` process), `SupervisorCardWorkflows` (0), `SupervisorCardsPage` (0), and `SupervisorCardAssignment` (1 impacted symbol; 1 `SupervisorCardsPage` process). `SupervisorVirtualCardPreview` is LOW (3 impacted symbols across 2 processes: `SupervisorCustomerProfilePage` and `CustomerDetailsDialog`), and the UI `Popover` primitive is LOW (1 direct dependant, no indexed process). No HIGH/CRITICAL impact was reported. The work is scoped to presentation and UI orchestration; API filtering, tenant scope, stable customer identity, and lifecycle protections remain unchanged.

```text
node .gitnexus/run.cjs impact SupervisorIssuedCardDirectory --file apps/web/components/workflows/supervisor-issued-card-directory.tsx --kind Function --repo shopcity_LP --direction upstream --summary-only
node .gitnexus/run.cjs impact SupervisorCardWorkflows --file apps/web/components/workflows/supervisor-card-workflows.tsx --kind Function --repo shopcity_LP --direction upstream --summary-only
node .gitnexus/run.cjs impact SupervisorCardsPage --file 'apps/web/app/(shell)/supervisor/cards/page.tsx' --kind Function --repo shopcity_LP --direction upstream --summary-only
node .gitnexus/run.cjs impact SupervisorCardAssignment --file apps/web/components/workflows/supervisor-card-assignment.tsx --kind Function --repo shopcity_LP --direction upstream --summary-only
node .gitnexus/run.cjs impact SupervisorVirtualCardPreview --file apps/web/components/workflows/supervisor-virtual-card-preview.tsx --kind Function --repo shopcity_LP --direction upstream --summary-only
node .gitnexus/run.cjs impact Popover --file apps/web/components/ui/popover.tsx --kind Function --repo shopcity_LP --direction upstream --summary-only
```

### 2026-10-10 — Include historical cards and filters in Supervisor Cards

`CardsController` (3 impacted symbols), `CardsService` (5), and `SupervisorIssuedCardDirectory` (1; Cards page process) report LOW upstream risk. `SupervisorCustomerStatusBadge` reports HIGH impact (10 symbols and four UI processes); it is deliberately left unchanged. Card-specific status colors use the existing lower-level StatusBadge directly to avoid widening that shared symbol's blast radius.

```text
node .gitnexus/run.cjs impact CardsController --file src/modules/cards/cards.controller.ts --kind Class --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact CardsService --file src/modules/cards/cards.service.ts --kind Class --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact SupervisorIssuedCardDirectory --file apps/web/components/workflows/supervisor-issued-card-directory.tsx --kind Function --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact SupervisorCustomerStatusBadge --file apps/web/components/workflows/supervisor-customer-status-badge.tsx --kind Function --repo shopcity_LP --direction upstream
```

No HIGH/CRITICAL-risk symbol is modified; no schema, tenant boundary, or lifecycle write behavior changes.

### 2026-10-10 — Simplify the verified-customer card management popup

Upstream impact for the popup workflow is LOW. `SupervisorCardManagement` reports 0 indexed dependants. An exact kind-filtered `CustomerDetailsDialog` function query affects one direct dependant, two indexed symbols total, and the `SupervisorCustomerProfilePage` process; its broader earlier tracker entry likewise reported LOW.

```text
node .gitnexus/run.cjs impact SupervisorCardManagement --file apps/web/components/workflows/supervisor-card-management.tsx --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact CustomerDetailsDialog --file apps/web/components/workflows/customer-details-dialog.tsx --kind Function --repo shopcity_LP --direction upstream
```

No HIGH/CRITICAL symbol-level upstream risk was reported. The popup is scoped by verified profile customer ID, performs same-customer card lookups before exposing status-appropriate buttons, and retains existing operation confirmations and write contracts.

### 2026-10-10 — Add Supervisor issued-card directory and Virtual Card profile link

Upstream impact was checked for the changed route and card service. The new method `listIssuedManagementCards` is not yet indexed as a standalone symbol; the containing service class was used as the nearest available indexed target.

```text
node .gitnexus/run.cjs impact CardsService --file src/modules/cards/cards.service.ts --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact SupervisorCardWorkflows --file apps/web/components/workflows/supervisor-card-workflows.tsx --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact SupervisorCustomerProfile --file apps/web/components/workflows/supervisor-customer-workflows.tsx --repo shopcity_LP --direction upstream
```

| Symbol                      | Risk       | Impacted symbols | Direct dependants | Affected processes / modules |
| --------------------------- | ---------- | ---------------: | ----------------: | ---------------------------- |
| `CardsService`              | LOW, exact |                5 |                 3 | No process reported          |
| `SupervisorCardWorkflows`   | LOW, exact |                0 |                 0 | No process reported          |
| `SupervisorCustomerProfile` | LOW, exact |                0 |                 0 | No process reported          |

No HIGH/CRITICAL symbol-level upstream impact was reported. Post-implementation `detect-changes --scope all` reports CRITICAL at the worktree level (27 files, 74 symbols, 16 flows), including pre-existing dirty files and the expected Supervisor Cards and customer-profile flows; this is not scoped solely to this feature. No commit was made.

### 2026-10-10 — Apply supplied branding to the Virtual Card preview

`SupervisorVirtualCardPreview` is a new untracked symbol and was not present in the current GitNexus index. Upstream impact was checked on its existing caller, `CustomerDetailsDialog`:

```text
node scripts/gitnexus.cjs impact CustomerDetailsDialog --direction upstream --file apps/web/components/workflows/customer-details-dialog.tsx --repo shopcity_LP --include-tests
```

| Symbol                  | Risk       | Impacted symbols | Direct dependants | Affected processes / modules                 |
| ----------------------- | ---------- | ---------------: | ----------------: | -------------------------------------------- |
| `CustomerDetailsDialog` | LOW, exact |                4 |                 1 | 1 `SupervisorCustomerProfilePage`; Workflows |

No HIGH/CRITICAL risk was reported. The change is limited to the card preview's logo image and its focused verification; no card data, API, or lifecycle behavior changes.

### 2026-10-10 — Move verified card preview to profile Virtual Card tab

Upstream impact was checked before relocating the graphic preview; the move preserves Manage cards' search, same-record verification, customer/card details, and lifecycle actions.

```text
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-card-management.tsx SupervisorCardManagement
npm run proposal:impact -- --file apps/web/components/workflows/customer-details-dialog.tsx CustomerDetailsDialog
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-customer-workflows.tsx SupervisorCustomerProfile
```

| Symbol                      | Risk       | Impacted symbols | Direct dependants | Affected processes / modules                      |
| --------------------------- | ---------- | ---------------: | ----------------: | ------------------------------------------------- |
| `SupervisorCardManagement`  | LOW, exact |                4 |                 2 | 1 `SupervisorCardsPage` flow; Workflows           |
| `CustomerDetailsDialog`     | LOW, exact |                5 |                 1 | 1 `SupervisorCustomerProfilePage` flow; Workflows |
| `SupervisorCustomerProfile` | LOW, exact |                3 |                 3 | 1 `SupervisorCustomerProfilePage` flow; Workflows |

No HIGH/CRITICAL risk was reported. The preview will render only from the profile's verified card projection; Manage cards continues to display the freshly verified serial/status/customer and its existing protected operations without the graphic.

### 2026-10-10 — Profile Wallet Ledger table and API mapping

Upstream impact was checked before updating the profile Wallet Ledger UI and its read-only API payload. Existing working-tree changes remain preserved.

```text
npm run proposal:impact -- --file apps/web/components/workflows/customer-details-dialog.tsx CustomerDetailsDialog
npm run proposal:impact -- --file src/modules/loyalty/loyalty.service.ts listCustomerLedger
npm run proposal:impact -- --file src/modules/loyalty/loyalty.controller.ts getCustomerLedger
```

| Symbol                  | Risk       | Impacted symbols | Direct dependants | Affected processes / modules                      |
| ----------------------- | ---------- | ---------------: | ----------------: | ------------------------------------------------- |
| `CustomerDetailsDialog` | LOW, exact |                5 |                 1 | 1 `SupervisorCustomerProfilePage` flow; Workflows |
| `listCustomerLedger`    | LOW, exact |                4 |                 4 | No process reported; Pagination                   |
| `getCustomerLedger`     | LOW, exact |                0 |                 0 | No process or module reported                     |

The local GitNexus index did not resolve the helper `ProfileRows` or `getCustomerProfileProjection` by exact name; no edits to the latter method are planned. No HIGH/CRITICAL risk was reported. The Wallet Ledger uses one authenticated, tenant/customer-scoped cursor API per page, not per-cell requests. The read response adds only receipt-number and creator-username metadata. No schema changes or ledger writes were made. Historical Balance After is not available as an authoritative snapshot and displays **Not provided** rather than using the live available balance.

### 2026-10-09 — Customer profile typography and Annual Purchases summary

Upstream impact for the profile summary/card typography and shared shell text sizing:

```text
npm run proposal:impact -- --file apps/web/components/workflows/customer-details-dialog.tsx CustomerDetailsDialog
npm run proposal:impact -- --file apps/web/components/app-topbar.tsx AppTopbar
npm run proposal:impact -- --file apps/web/components/app-sidebar.tsx AppSidebar
```

| Symbol                  | Risk       | Impacted symbols | Direct dependants | Affected processes                   |
| ----------------------- | ---------- | ---------------: | ----------------: | ------------------------------------ |
| `CustomerDetailsDialog` | LOW, exact |                5 |                 1 | 1 (`SupervisorCustomerProfilePage`)  |
| `AppTopbar`             | LOW, exact |                4 |                 2 | 2 (`ShellLayout`, `AppShellContent`) |
| `AppSidebar`            | LOW, exact |                4 |                 1 | 2 (`ShellLayout`, `AppShellContent`) |

### 2026-10-13 — Supervisor branch-scoped operational report refresh

| Symbol                              | Risk | Impacted | Direct | Processes | Notes                                                                                                                                         |
| ----------------------------------- | ---: | -------: | -----: | --------: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `OperationalReportsDashboard`       |  LOW |        4 |      2 |         2 | Shared by Supervisor and Admin reports pages; retain existing Admin button behavior and enable enqueue/poll only for the Supervisor audience. |
| `ReportsController`                 |  LOW |        5 |      3 |         0 | Add a separate Supervisor-only dashboard refresh route; leave the Admin refresh route role unchanged.                                         |
| `ReportExportService`               |  LOW |        7 |      4 |         0 | Add scoped, audited, idempotent outbox enqueue; derive branch from session and verify it belongs to tenant.                                   |
| `ReportExportService.refreshReport` |  LOW |        1 |      1 |         0 | Existing Admin refresh remains unchanged.                                                                                                     |
| `ReportsController.refreshReport`   |  LOW |        0 |      0 |         0 | Existing Admin refresh remains unchanged.                                                                                                     |

```text
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-operational-reports.tsx OperationalReportsDashboard
npm run proposal:impact -- --file src/modules/reports/reports.controller.ts ReportsController
npm run proposal:impact -- --file src/modules/reports/report-export.service.ts ReportExportService
node scripts/gitnexus.cjs impact -r shopcity_LP --file src/modules/reports/report-export.service.ts --include-tests refreshReport --summary-only
node scripts/gitnexus.cjs impact -r shopcity_LP --file src/modules/reports/reports.controller.ts --include-tests refreshReport --summary-only
```

All exact results are LOW; no HIGH/CRITICAL risk was reported. Supervisor refresh remains server-derived and branch-only; do not widen the existing Admin endpoint.

No HIGH/CRITICAL risk was reported. Scope is CSS/type hierarchy plus the Annual Purchases label; no API, schema, authorization, or workflow behavior changes are planned. The current API has no annual-purchases total, so the card remains **Not provided** rather than deriving a value from partial activity.

### 2026-10-09 — Read-only customer details with profile edit dialog

Upstream impact for separating the customer-details presentation from its existing editor and keeping verified profile saves on the profile route:

```text
node .gitnexus/run.cjs impact CustomerDetailsDialog --file apps/web/components/workflows/customer-details-dialog.tsx --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact ManageCustomers --file apps/web/components/workflows/supervisor-customer-workflows.tsx --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact saveProfile --file apps/web/components/workflows/supervisor-customer-workflows.tsx --repo shopcity_LP --direction upstream
```

| Symbol                  | Risk       | Impacted symbols | Direct dependants | Affected processes                  |
| ----------------------- | ---------- | ---------------: | ----------------: | ----------------------------------- |
| `CustomerDetailsDialog` | LOW, exact |                2 |                 1 | 1 (`SupervisorCustomerProfilePage`) |
| `ManageCustomers`       | LOW, exact |                1 |                 1 | 1 (`SupervisorCustomerProfilePage`) |
| `saveProfile`           | LOW, exact |                2 |                 1 | 1 (`SupervisorCustomerProfilePage`) |

The direct dependant for `CustomerDetailsDialog` is `ManageCustomers`; `SupervisorCustomerProfile` is indirect. `ManageCustomers` and `saveProfile` each affect the profile route process. No HIGH/CRITICAL risk was reported. The implementation is limited to the existing customer profile UI and its save/dirty-state flow; no schema or authorization changes are planned.

### 2026-10-08 — Supervisor sign-in stale cashier pairing message

Upstream impact was checked before changing the shared login form:

```text
node .gitnexus/run.cjs impact LoginForm -r shopcity_LP -f apps/web/components/auth/login-form.tsx --include-tests
```

| Symbol      | Risk       | Impacted symbols | Direct dependants | Affected processes |
| ----------- | ---------- | ---------------: | ----------------: | -----------------: |
| `LoginForm` | LOW, exact |                1 |                 1 |                  0 |

The only direct dependant is `apps/web/tests/login-form.spec.tsx`; no processes or modules are affected. The guard is cashier-only; changing to Supervisor/Admin now clears stale cashier pairing guidance, while the backend remains authoritative for role and session permissions.

### 2026-10-08 — Loopback bind for local cashier test session

Upstream impact for the API entrypoint bind selection:

```text
node .gitnexus/run.cjs impact bootstrap --file src/main.ts --repo shopcity_LP --direction upstream
```

| Symbol      | Risk       | Impacted symbols | Direct dependants | Affected processes |
| ----------- | ---------- | ---------------: | ----------------: | -----------------: |
| `bootstrap` | LOW, exact |                1 |                 1 |                  0 |

The indexed blast radius is the `main.ts` entrypoint only, with no execution flows or modules affected. When the explicit local cashier test-session flag is requested, the API listener will be constrained to loopback; the normal listener binding remains unchanged when the flag is off. The feature still requires the existing local database/SMS/environment gate.

A separate local frontend build directory was also checked before launching alongside the existing dev server:

```text
node .gitnexus/run.cjs impact nextConfig --file apps/web/next.config.mjs --repo shopcity_LP --direction upstream
```

| Symbol       | Risk       | Impacted symbols | Direct dependants | Affected processes |
| ------------ | ---------- | ---------------: | ----------------: | -----------------: |
| `nextConfig` | LOW, exact |                0 |                 0 |                  0 |

The environment-controlled build directory will be used only for this isolated local runtime; the default `.next` directory remains unchanged.

### 2026-10-08 — Exact Tailscale origin for local cashier test sessions

GitNexus was refreshed after its local FTS index reported corruption (repair succeeded and a full re-index completed). The following upstream impacts were then run before changing the cashier test-session origin check and HTTPS cookie behavior:

```text
node .gitnexus/run.cjs impact createLocalCashierTestSession --file src/modules/auth/auth.service.ts --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact isLocalCashierTestSessionEnabledFromConfig --file src/config/local-cashier-test-session.ts --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact localCashierTestSession --file src/modules/auth/auth.controller.ts --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact setSessionCookies --file src/modules/auth/auth.controller.ts --repo shopcity_LP --direction upstream
node .gitnexus/run.cjs impact envValidationSchema --file src/config/env.validation.ts --repo shopcity_LP --direction upstream
```

| Symbol                                       | Risk       | Impacted symbols | Direct dependants | Affected processes                                 |
| -------------------------------------------- | ---------- | ---------------: | ----------------: | -------------------------------------------------- |
| `AuthService.createLocalCashierTestSession`  | LOW, exact |                1 |                 1 | 1 local cashier test-session flow                  |
| `isLocalCashierTestSessionEnabledFromConfig` | LOW, exact |                9 |                 3 | local-session/refresh paths                        |
| `AuthController.localCashierTestSession`     | LOW, exact |                0 |                 0 | 0                                                  |
| `AuthController.setSessionCookies`           | LOW, exact |                4 |                 4 | login, WebAuthn completion, smoke session, refresh |
| `envValidationSchema`                        | LOW, exact |                0 |                 0 | 0                                                  |

The shared local-session config helper will retain its existing behavior; the exact Tailscale origin check is added only to the local cashier-session creation path. Existing cookie call sites keep their defaults; only the HTTPS Tailscale local-test response opts into Secure cookies.

### 2026-10-08 — Supervisor overview reference presentation proposal

Proposal-time upstream impact for the Supervisor overview route:

```text
node .gitnexus/run.cjs impact SupervisorPage -r shopcity_LP -f 'apps/web/app/(shell)/supervisor/page.tsx' --include-tests
```

| Symbol           | Risk       | Impacted symbols | Direct dependants | Affected processes |
| ---------------- | ---------- | ---------------: | ----------------: | -----------------: |
| `SupervisorPage` | LOW, exact |                0 |                 0 |                  0 |

GitNexus found no upstream dependants or affected processes. Scope is the page presentation and its focused frontend tests; shared shell navigation, scanner lookup context, and dedicated Supervisor routes remain unchanged. The initial implementation incorrectly embedded the supplied SVGs; this follow-up corrects the spec to require semantic HTML/CSS modeled on the SVGs, with their sample metrics/rows clearly illustrative and never presented as live operational data.

### 2026-10-08 — Supervisor overview live reporting

Proposal-time upstream impact was run for the overview route and each existing approval-list method that may gain an additive count/projection:

```text
npm run proposal:impact -- --file 'apps/web/app/(shell)/supervisor/page.tsx' SupervisorPage
npm run proposal:impact -- --file src/modules/approvals/approvals.controller.ts listApprovals
npm run proposal:impact -- --file src/modules/approvals/approvals.service.ts listApprovals
npm run proposal:impact -- --uid 'Method:src/modules/loyalty/loyalty.service.ts:LoyaltyService.listApprovals#4'
```

| Symbol                              | Risk       | Impacted symbols | Direct dependants | Affected processes / modules   |
| ----------------------------------- | ---------- | ---------------: | ----------------: | ------------------------------ |
| `SupervisorPage`                    | LOW, exact |                0 |                 0 | 0                              |
| `ApprovalsController.listApprovals` | LOW, exact |                1 |                 1 | 0                              |
| `ApprovalsService.listApprovals`    | LOW, exact |                4 |                 3 | 0 processes; Pagination module |
| `LoyaltyService.listApprovals`      | LOW, exact |                6 |                 2 | 0 processes; Pagination module |

No HIGH/CRITICAL result. Existing reporting and approvals endpoints enforce caller scope. Planned changes are limited to using the branch-scoped executive snapshot, optionally counting filtered approvals for the overview, and adding scoped customer/requester display fields. No execution flows are indexed.

### 2026-10-08 — Supervisor overview approvals pagination

Proposal-time upstream impact for the Supervisor overview route:

```text
npm run proposal:impact -- --file 'apps/web/app/(shell)/supervisor/page.tsx' SupervisorPage
```

| Symbol           | Risk       | Impacted symbols | Direct dependants | Affected processes |
| ---------------- | ---------- | ---------------: | ----------------: | -----------------: |
| `SupervisorPage` | LOW, exact |                0 |                 0 |                  0 |

Pagination is limited to the existing cursor-based, branch-authorized approvals API. No upstream dependants or execution flows are indexed; no API authorization or reporting logic is in scope.

### 2026-10-08 — Supervisor overview full-queue approvals search

Proposal-time upstream impact for server-side search across the pending approval queue:

```text
npm run proposal:impact -- --file 'apps/web/app/(shell)/supervisor/page.tsx' SupervisorPage
npm run proposal:impact -- --file src/modules/approvals/approvals.controller.ts listApprovals
npm run proposal:impact -- --file src/modules/approvals/approvals.service.ts listApprovals
npm run proposal:impact -- --uid 'Method:src/modules/loyalty/loyalty.service.ts:LoyaltyService.listApprovals#4'
```

| Symbol                              | Risk       | Impacted symbols | Direct dependants | Affected processes / modules   |
| ----------------------------------- | ---------- | ---------------: | ----------------: | ------------------------------ |
| `SupervisorPage`                    | LOW, exact |                0 |                 0 | 0                              |
| `ApprovalsController.listApprovals` | LOW, exact |                1 |                 1 | 0                              |
| `ApprovalsService.listApprovals`    | LOW, exact |                4 |                 3 | 0 processes; Pagination module |
| `LoyaltyService.listApprovals`      | LOW, exact |                6 |                 2 | 0 processes; Pagination module |

No HIGH/CRITICAL risk or execution flows are indexed. The planned API filter must be applied within the existing caller-authorized tenant/branch scope before cursor pagination, without changing decision behavior.

### 2026-10-08 — Supervisor overview pagination alignment

Proposal-time upstream impact for the Supervisor overview presentation adjustment:

```text
npm run proposal:impact -- --file 'apps/web/app/(shell)/supervisor/page.tsx' SupervisorPage
```

| Symbol           | Risk       | Impacted symbols | Direct dependants | Affected processes |
| ---------------- | ---------- | ---------------: | ----------------: | -----------------: |
| `SupervisorPage` | LOW, exact |                0 |                 0 |                  0 |

The pagination CSS is style-only and has no indexed symbol impact. The change is limited to right-aligning the navigation group and using accessible icon-only Previous/Next controls.

### 2026-10-08 — Supervisor transaction table and dialog reference alignment

Upstream impact for matching the supplied transaction table and transaction-dialog references:

```text
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx SupervisorTransactionsDashboard
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx statusTone
```

| Symbol                            | Risk       | Impacted symbols | Direct dependants |               Affected processes |
| --------------------------------- | ---------- | ---------------: | ----------------: | -------------------------------: |
| `SupervisorTransactionsDashboard` | LOW, exact |                2 |                 2 | 1 (`SupervisorTransactionsPage`) |
| `statusTone`                      | LOW, exact |                3 |                 1 | 1 (`SupervisorTransactionsPage`) |

Scope is limited to the Supervisor transaction route's table and selected-transaction presentation. Existing branch authorization, authoritative detail verification, and reversal behavior remain unchanged; only fields returned by the current API will be displayed.

### 2026-10-08 — Supervisor transaction filters and table columns

Upstream impact before extending the receipt-search contract with status, staff, and minimum-receipt-amount filters and reference-aligned data columns:

```text
npm run proposal:impact -- --file src/modules/loyalty/loyalty.service.ts searchTransactionsByReceipt
npm run proposal:impact -- --file src/modules/loyalty/loyalty.controller.ts searchTransactionsByReceipt
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx SupervisorTransactionsDashboard
npm run proposal:impact -- --file src/modules/loyalty/loyalty.service.ts SupervisorTransactionSearchItem
```

| Symbol                                          | Risk          | Impacted symbols | Direct dependants | Affected processes               |
| ----------------------------------------------- | ------------- | ---------------: | ----------------: | -------------------------------- |
| `LoyaltyService.searchTransactionsByReceipt`    | LOW, exact    |                1 |                 1 | 0                                |
| `LoyaltyController.searchTransactionsByReceipt` | LOW, exact    |                0 |                 0 | 0                                |
| `SupervisorTransactionsDashboard`               | LOW, exact    |                2 |                 2 | 1 (`SupervisorTransactionsPage`) |
| `SupervisorTransactionSearchItem`               | MEDIUM, exact |               23 |                13 | 0                                |

No HIGH/CRITICAL risk or execution flows were reported. The MEDIUM contract blast radius is the service module's broader import graph; the focused endpoint is Supervisor-only and will continue to enforce session tenant/branch scope before applying filters and cursor pagination. The table will expose only the branch-authorized customer name (no customer contact details); unsupported eligibility was initially marked unavailable rather than inferred.

### 2026-10-09 — Omit unsupported transaction eligibility column

Upstream impact for removing the always-unavailable Eligible column from the Supervisor transaction table:

```text
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx SupervisorTransactionsDashboard
```

| Symbol                            | Risk       | Impacted symbols |                                Direct dependants | Affected processes |
| --------------------------------- | ---------- | ---------------: | -----------------------------------------------: | ------------------ |
| `SupervisorTransactionsDashboard` | LOW, exact |                1 | 1 (`supervisor-transactions-dashboard.spec.tsx`) | 0                  |

No API, database, or execution-flow impact. The table will omit the column until the product defines an authoritative eligibility amount; it will not infer one from purchase amount or balance.

### 2026-10-09 — Optimize login background delivery

Upstream impact before adding a page-scoped preload for the optimized decorative login background:

```text
node scripts/gitnexus.cjs impact LoginPage -r shopcity_LP --file 'apps/web/app/(auth)/login/page.tsx' --include-tests
```

| Symbol      | Risk       | Impacted symbols | Direct dependants | Affected processes |
| ----------- | ---------- | ---------------: | ----------------: | ------------------ |
| `LoginPage` | LOW, exact |                0 |                 0 | 0                  |

The change is limited to the public login route and its decorative asset; authentication, role routing, and session behavior are unchanged.

### 2026-10-09 — Transaction status column and badge colors

Upstream impact for renaming the result heading and assigning distinct confirmed/reversed badge tones:

```text
node scripts/gitnexus.cjs impact SupervisorTransactionsDashboard -r shopcity_LP --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx --include-tests
node scripts/gitnexus.cjs impact statusTone -r shopcity_LP --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx --include-tests
```

| Symbol                            | Risk       | Impacted symbols | Direct dependants | Affected processes               |
| --------------------------------- | ---------- | ---------------: | ----------------: | -------------------------------- |
| `SupervisorTransactionsDashboard` | LOW, exact |                1 |                 1 | 0                                |
| `statusTone`                      | LOW, exact |                2 |                 1 | 1 (`SupervisorTransactionsPage`) |

The change is presentation-only. It does not change supported outcomes, API status values, transaction data, or reversal policy.

### 2026-10-09 — Transaction pagination and refresh

Upstream impact before aligning the Supervisor transaction cursor pager and adding current-page refresh:

```text
node scripts/gitnexus.cjs impact SupervisorTransactionsDashboard -r shopcity_LP --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx --include-tests
```

| Symbol                            | Risk       | Impacted symbols | Direct dependants | Affected processes |
| --------------------------------- | ---------- | ---------------: | ----------------: | ------------------ |
| `SupervisorTransactionsDashboard` | LOW, exact |                1 |                 1 | 0                  |

Refresh reuses the existing authenticated, branch-scoped query with applied filters and the current cursor; no API, database, or reversal behavior changes. The customer workspace in this checkout has no pager, so the visual treatment follows the existing compact Supervisor overview pager without claiming a total page count.

### 2026-10-09 — Right-align transaction refresh and pager

Upstream impact before adjusting the Supervisor transaction header and pagination alignment:

```text
node scripts/gitnexus.cjs impact SupervisorTransactionsDashboard -r shopcity_LP --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx --include-tests
```

| Symbol                            | Risk       | Impacted symbols | Direct dependants | Affected processes |
| --------------------------------- | ---------- | ---------------: | ----------------: | ------------------ |
| `SupervisorTransactionsDashboard` | LOW, exact |                1 |                 1 | 0                  |

This is a route-scoped visual adjustment; query, cursor, and authorization behavior remain unchanged.

### 2026-10-09 — Remove transaction hint and darken pagination

Upstream impact before removing the initial status sentence and changing pagination text/icon contrast:

```text
node scripts/gitnexus.cjs impact SupervisorTransactionsDashboard -r shopcity_LP --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx --include-tests
```

| Symbol                            | Risk       | Impacted symbols | Direct dependants | Affected processes |
| --------------------------------- | ---------- | ---------------: | ----------------: | ------------------ |
| `SupervisorTransactionsDashboard` | LOW, exact |                1 |                 1 | 0                  |

Only the Supervisor transactions presentation and its component test are affected; search and cursor behavior remain unchanged.

### 2026-10-09 — Specify default transaction date ordering

Upstream impacts before documenting and testing the existing newest-first receipt-search order:

```text
node scripts/gitnexus.cjs impact searchTransactionsByReceipt -r shopcity_LP --file src/modules/loyalty/loyalty.service.ts --include-tests
node scripts/gitnexus.cjs impact SupervisorTransactionsDashboard -r shopcity_LP --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx --include-tests
```

| Symbol                                       | Risk       | Impacted symbols |                                   Direct dependants | Affected processes |
| -------------------------------------------- | ---------- | ---------------: | --------------------------------------------------: | ------------------ |
| `LoyaltyService.searchTransactionsByReceipt` | LOW, exact |                1 | 1 (`LoyaltyController.searchTransactionsByReceipt`) | 0                  |
| `SupervisorTransactionsDashboard`            | LOW, exact |                1 |    1 (`supervisor-transactions-dashboard.spec.tsx`) | 0                  |

The service already orders by `effectiveAt DESC, id DESC`, and the cursor predicate follows the same order. The UI preserves response order; this follow-up codifies those guarantees without changing production query behavior.

### 2026-10-09 — Load all branch transactions by default

Upstream impacts before making receipt-number filtering optional and adding an initial branch-scoped list request:

```text
node scripts/gitnexus.cjs impact SupervisorTransactionsDashboard -r shopcity_LP --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx --include-tests
node scripts/gitnexus.cjs impact searchTransactionsByReceipt -r shopcity_LP --file src/modules/loyalty/loyalty.service.ts --include-tests
node scripts/gitnexus.cjs impact searchTransactionsByReceipt -r shopcity_LP --file src/modules/loyalty/loyalty.controller.ts --include-tests
```

| Symbol                                          | Risk       | Impacted symbols |                                   Direct dependants | Affected processes |
| ----------------------------------------------- | ---------- | ---------------: | --------------------------------------------------: | ------------------ |
| `SupervisorTransactionsDashboard`               | LOW, exact |                1 |    1 (`supervisor-transactions-dashboard.spec.tsx`) | 0                  |
| `LoyaltyService.searchTransactionsByReceipt`    | LOW, exact |                1 | 1 (`LoyaltyController.searchTransactionsByReceipt`) | 0                  |
| `LoyaltyController.searchTransactionsByReceipt` | LOW, exact |                0 |                                                   0 | 0                  |

The change remains within the Supervisor list API and route, preserving session-derived tenant/branch scope, bounded cursor pagination, and the existing reversal flow.

### 2026-10-09 — Remove scope hint and brand shared-shell footers

Upstream impacts before removing the duplicate transaction scope sentence and replacing the desktop/mobile shell branch-timezone footer:

```text
node scripts/gitnexus.cjs impact SupervisorTransactionsDashboard -r shopcity_LP --file apps/web/components/workflows/supervisor-transactions-dashboard.tsx --include-tests
node scripts/gitnexus.cjs impact AppSidebar -r shopcity_LP --file apps/web/components/app-sidebar.tsx --include-tests
node scripts/gitnexus.cjs impact AppShellContent -r shopcity_LP --file apps/web/components/app-shell.tsx --include-tests
```

| Symbol                            | Risk       | Impacted symbols |                                Direct dependants | Affected processes                   |
| --------------------------------- | ---------- | ---------------: | -----------------------------------------------: | ------------------------------------ |
| `SupervisorTransactionsDashboard` | LOW, exact |                1 | 1 (`supervisor-transactions-dashboard.spec.tsx`) | 0                                    |
| `AppSidebar`                      | LOW, exact |                3 |                            1 (`AppShellContent`) | 2 (`ShellLayout`, `AppShellContent`) |
| `AppShellContent`                 | LOW, exact |                2 |                                   1 (`AppShell`) | 1 (`ShellLayout`)                    |

The shell change is presentation-only; the navigation, session bootstrap, and branch/timezone configuration remain untouched outside the removed footer rendering.

### 2026-10-09 — Align OpenAPI integration assertion with optional receipt filter

Upstream impact before correcting the stale contract assertion in `test/openapi.int-spec.ts`:

```text
node scripts/gitnexus.cjs impact buildOpenApiDocument -r shopcity_LP --file src/bootstrap.ts --include-tests
```

| Symbol                 | Risk       | Impacted symbols |          Direct dependants | Affected processes |
| ---------------------- | ---------- | ---------------: | -------------------------: | -----------------: |
| `buildOpenApiDocument` | LOW, exact |                1 | `test/openapi.int-spec.ts` |                  0 |

The integration assertion now verifies that `receiptNumber` is optional, matching the branch transaction list contract.

### 2026-09-30 — Fraud review results presentation

Proposal-time upstream impact was run for the shared fraud panel and both route components:

```text
npm run proposal:impact -- --file apps/web/components/workflows/fraud-flags-panel.tsx FraudFlagsPanel
node scripts/gitnexus.cjs impact SupervisorFraudPage -r shopcity_LP --file apps/web/app/(shell)/supervisor/fraud/page.tsx --include-tests --summary-only
node scripts/gitnexus.cjs impact AdminFraudPage -r shopcity_LP --file apps/web/app/(shell)/admin/fraud/page.tsx --include-tests --summary-only
```

| Symbol                | Risk       | Impacted symbols | Direct dependants | Affected processes                      |
| --------------------- | ---------- | ---------------: | ----------------: | --------------------------------------- |
| `FraudFlagsPanel`     | LOW, exact |                2 |                 2 | `SupervisorFraudPage`, `AdminFraudPage` |
| `SupervisorFraudPage` | LOW, exact |                0 |                 0 | 0                                       |
| `AdminFraudPage`      | LOW, exact |                0 |                 0 | 0                                       |

No HIGH/CRITICAL result. The shared panel presentation change applies to both role routes; existing fraud list scope, filters, CSRF/idempotency protections, selected-case evidence, and decision endpoint behavior remain preserved. A follow-up refinement adds valid status/severity selects and moves per-case decisions into an accessible dialog; a repeat impact check confirmed the same LOW-risk, two-route blast radius.

### 2026-09-30 — Approval review queue and decision dialog proposal

Proposal-time upstream impacts were run with tests included for the shared approval panel and paginated approval-list path:

```text
node scripts/gitnexus.cjs impact ApprovalsPanel -r shopcity_LP --file apps/web/components/workflows/approvals-panel.tsx --include-tests --summary-only
node scripts/gitnexus.cjs impact listApprovals -r shopcity_LP --file src/modules/approvals/approvals.controller.ts --include-tests --summary-only
node scripts/gitnexus.cjs impact listApprovals -r shopcity_LP --file src/modules/approvals/approvals.service.ts --include-tests --summary-only
node scripts/gitnexus.cjs impact listApprovals -r shopcity_LP --file src/modules/loyalty/loyalty.service.ts --include-tests --summary-only
```

| Symbol                              | Risk       | Impacted symbols | Direct dependants | Affected processes                              |
| ----------------------------------- | ---------- | ---------------: | ----------------: | ----------------------------------------------- |
| `ApprovalsPanel`                    | LOW, exact |                2 |                 2 | `SupervisorApprovalsPage`, `AdminApprovalsPage` |
| `ApprovalsController.listApprovals` | LOW, exact |                0 |                 0 | 0                                               |
| `ApprovalsService.listApprovals`    | LOW, exact |                3 |                 3 | 1 (`ApprovalsController.listApprovals`)         |
| `LoyaltyService.listApprovals`      | LOW, exact |                5 |          2 direct | 1 (`listApprovals`)                             |
| `SupervisorApprovalsPage`           | LOW, exact |                0 |                 0 | 0                                               |
| `AdminApprovalsPage`                | LOW, exact |                0 |                 0 | 0                                               |

No HIGH/CRITICAL result. Because `ApprovalsPanel` is shared, changes affect both Supervisor and Admin approval routes. Existing approval authorization, tenant/branch scope, cursor ordering, decision/idempotency semantics, and backend financial authority must remain intact. The current UI filters only the fetched cursor page and truncates rendered rows, while the API list does not accept status filters; an accurate historical filter must therefore be applied server-side before cursor pagination. No code changes had been made when this impact was recorded.

### 2026-09-29 — Supervisor receipt search and reversal dialog proposal

Proposal-time upstream impacts with tests included were run before drafting the Supervisor receipt-search UI and read-only API:

```text
npm run proposal:impact -- --file apps/web/components/workflows/transaction-workspace.tsx TransactionWorkspace
npm run proposal:impact -- --file apps/web/components/workflows/transaction-dashboard.tsx TransactionDashboard
npm run proposal:impact -- --file apps/web/app/(shell)/supervisor/transactions/page.tsx SupervisorTransactionsPage
npm run proposal:impact -- --file src/modules/loyalty/loyalty.controller.ts LoyaltyController
npm run proposal:impact -- --file src/modules/loyalty/loyalty.service.ts LoyaltyService
```

| Symbol                       | Risk          | Impacted symbols | Direct dependants | Affected processes                                        |
| ---------------------------- | ------------- | ---------------: | ----------------: | --------------------------------------------------------- |
| `TransactionWorkspace`       | LOW, exact    |                3 |                 3 | 2 (`AdminTransactionsPage`, `SupervisorTransactionsPage`) |
| `TransactionDashboard`       | LOW, exact    |                2 |                 2 | 1 (`CashierTransactionsPage`)                             |
| `SupervisorTransactionsPage` | LOW, exact    |                0 |                 0 | 0                                                         |
| `LoyaltyController`          | LOW, exact    |                6 |                 1 | 0                                                         |
| `LoyaltyService`             | MEDIUM, exact |               21 |                12 | 0                                                         |

The cashier list is not a safe Supervisor data source: it is CASHIER-only and limited to the logged-in cashier's current-day receipts; the Supervisor cashier-activity report is aggregate data. Keep both contracts unchanged. Implement only a new bounded receipt-number read query under authenticated Supervisor branch scope, return stable ledger-entry IDs, and retain authoritative detail/reversal checks. Add tests for branch isolation and bounded results; no HIGH/CRITICAL proposal-time impact was found. No code changes had been made when this impact was recorded.

### 2026-09-29 — Supervisor overview greeting and card cleanup proposal

Proposal-time upstream impact with tests included was run before drafting this Supervisor landing-page change:

```text
npm run proposal:impact -- --file apps/web/app/(shell)/supervisor/page.tsx SupervisorPage
```

| Symbol           | Risk       | Impacted symbols | Direct dependants | Affected processes |
| ---------------- | ---------- | ---------------: | ----------------: | -----------------: |
| `SupervisorPage` | LOW, exact |                0 |                 0 |                  0 |

GitNexus indexed no upstream dependants/processes for the route component. Scope is limited to the Supervisor overview composition and tests that currently assume review panels live on `/supervisor`; the dedicated approvals, fraud, reports, customer, card, and transaction routes remain intact. Preserve the overview's scanner lookup context, shared shell navigation, authorization, and operational route behavior. No backend/API or data changes are planned.

### 2026-09-29 — Supervisor card-assignment eligibility dialog proposal

Proposal-time upstream impact was run for the assignment workspace before drafting this focused UI change:

```text
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-card-assignment.tsx SupervisorCardAssignment
```

| Symbol                     | Risk       | Impacted symbols | Direct dependants | Affected process      |
| -------------------------- | ---------- | ---------------: | ----------------: | --------------------- |
| `SupervisorCardAssignment` | LOW, exact |                4 |                 1 | `SupervisorCardsPage` |

The impact is contained in the Supervisor `Workflows` module. The page route is the sole direct process caller; the change is limited to the Assign card tab's layout and selection/eligibility presentation. Existing authoritative detail loading, assignment contract, idempotency, and card serial review remain in scope as invariants; no backend, RBAC, or persistence change is planned.

### 2026-09-29 — Branch-owned card serial inventory and automatic assignment proposal

Proposal-time upstream impacts were run with tests included for the affected issuance and identity surfaces:

```text
npm run proposal:impact -- --file src/modules/customers/customers.service.ts createCustomer
npm run proposal:impact -- --file src/modules/cards/cards.service.ts createCard
npm run proposal:impact -- --file src/modules/cards/cards.service.ts replaceCard
npm run proposal:impact -- --file src/common/card-identity.ts normalizeCardSerial
```

| Symbol                | Risk                | Impacted symbols | Direct dependants | Affected processes  |
| --------------------- | ------------------- | ---------------: | ----------------: | ------------------- |
| `createCustomer`      | LOW, exact          |                4 |                 4 | 0                   |
| `createCard`          | LOW, exact          |                3 |                 3 | 0                   |
| `replaceCard`         | LOW, exact          |                3 |                 3 | 0                   |
| `normalizeCardSerial` | **CRITICAL, exact** |               31 |                 9 | 1 (`processRecord`) |

`normalizeCardSerial` reaches Cards, Loyalty, Offline-sync, Customers, and Redemptions. Any format-policy change requires explicit cross-role/process regression coverage; avoid changing this shared function as part of a branch-only pilot without first warning and scoping the migration. The initial pilot should keep allocation branch-local and serial history immutable. No code changes were made during this impact review.

### 2026-09-29 — Supervisor customer management dialog proposal

Ran proposal-time upstream impact with tests included for the Manage Customers surface:

```text
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-customer-workflows.tsx ManageCustomers
```

| Symbol            | Risk       | Impacted symbols | Direct dependants | Affected process          |
| ----------------- | ---------- | ---------------: | ----------------: | ------------------------- |
| `ManageCustomers` | LOW, exact |                3 |                 1 | `SupervisorCustomersPage` |

The indexed blast radius is limited to the Supervisor customer route and `Workflows` module. The implementation keeps the change in this route-local workspace/dialog and verifies selected-ID detail loading, profile/status refreshes, and responsive behavior with focused Jest and Playwright coverage.

### 2026-09-29 — Customer registration consent capture proposal

Ran proposal-time upstream impact with tests included before drafting the consent contract change:

```text
npm run proposal:impact -- --file src/modules/customers/customers.service.ts createCustomer
npm run proposal:impact -- --file src/modules/customers/customers.controller.ts createCustomer
npm run proposal:impact -- --file src/modules/customers/customers.dto.ts CreateCustomerDto
npm run proposal:impact -- --file apps/web/components/workflows/customer-registration-flow.tsx CustomerRegistrationFlow
```

| Symbol                               | Risk       |      Impacted symbols | Direct dependants | Affected processes |
| ------------------------------------ | ---------- | --------------------: | ----------------: | -----------------: |
| `CustomersService.createCustomer`    | LOW, exact |                     4 |                 4 |                  0 |
| `CustomersController.createCustomer` | LOW, exact | 0 (unresolved target) |                 0 |                  0 |
| `CreateCustomerDto`                  | LOW, exact |                     3 |                 1 |                  0 |
| `CustomerRegistrationFlow`           | LOW, exact |                     3 |                 3 |                  2 |

No HIGH/CRITICAL proposal-time finding for the service/DTO/flow; `CustomerWorkspace` was separately found HIGH at 4 impacted symbols, 4 direct dependants, and 3 processes, and `RegisterCustomer` LOW at 3 impacted symbols, 1 direct dependant, and 1 process. Post-implementation `detect-changes --repo shopcity_LP` reports 26 changed files, 44 symbols, 29 processes, CRITICAL aggregate risk; affected flows include SupervisorCustomersPage, AdminCardsPage, AdminCustomersPage, and CashierCustomersPage via the shared workspace. This broad graph blast radius is expected from consent-enabling all customer-creation call sites but requires role regression checks. The controller symbol is unresolved in the proposal index and must be treated as unknown until direct call-site and route tests are checked. Scope includes tenant-scoped append-only consent written atomically with customer/card creation, required loyalty consent, optional marketing opt-in, versioned copy, generated API contract, and registration UI. Migration remains additive; no historical consent is backfilled or inferred. Preserve unrelated dirty changes.

### 2026-09-28 — Supervisor customer-selection preview modal

The required proposal-time impact commands were run after a successful full GitNexus index rebuild:

```text
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-customer-workflows.tsx ManageCustomers
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-card-assignment.tsx SupervisorCardAssignment
```

| Symbol                     | Risk       | Impacted symbols | Direct dependants | Affected process          |
| -------------------------- | ---------- | ---------------: | ----------------: | ------------------------- |
| `ManageCustomers`          | LOW, exact |                3 |                 1 | `SupervisorCustomersPage` |
| `SupervisorCardAssignment` | LOW, exact |                4 |                 1 | `SupervisorCardsPage`     |

Both targets are contained in the Supervisor `Workflows` module; no HIGH/CRITICAL findings. The incremental index refresh first failed because the local FTS index was inconsistent; the repo-local GitNexus CLI's forced full rebuild succeeded before these impacts were recorded. The proposal remains Supervisor-specific and reuses the existing dialog primitive and authoritative customer detail requests; no shared components, API, role policy, or persistence behavior are in scope.

### 2026-09-27 — Supervisor card artwork identification

Before drafting the focused visual proposal, the required proposal-time impact command was run:

```text
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-card-management.tsx SupervisorCardManagement
```

`SupervisorCardManagement`: **LOW**, exact, 4 impacted symbols, 2 direct dependants, 1 affected process (`SupervisorCardsPage`), and 1 affected module (`Workflows`). A detailed context check localized consumers to the route's management tests and Supervisor card-management flows. No HIGH/CRITICAL result. Scope remains a Supervisor-only visual preview using the already-authorized live card serial, status, and customer name; no API, shared workspace, lifecycle, role, or data changes.

### 2026-09-27 — Review 80 approved Supervisor/Admin card-management lookup

The operator authorized a narrowly bounded tenant-scoped read-only management lookup API. The proposal impact command was invoked:

```text
npm run proposal:impact -- --file src/modules/cards/cards.service.ts CardsService.lookupCard
```

The index FTS refresh was previously broken; exact queries worked. Proposal-time direct `gitnexus impact` evidence:

| Symbol                    | Risk | Impacted symbols |        Direct callers/dependants | Processes | Exact finding                                                                   |
| ------------------------- | ---- | ---------------: | -------------------------------: | --------: | ------------------------------------------------------------------------------- |
| `CardsService.lookupCard` | LOW  |                1 | 1 (`CardsController.lookupCard`) |         — | Direct exact-symbol impact; sole direct caller is `CardsController.lookupCard`. |
| `CardsService`            | LOW  |                5 |                                3 |         0 | Exact class impact; no processes.                                               |
| `CardsController`         | LOW  |                3 |                                1 |         — | Exact controller impact.                                                        |

These are proposal-time bounds, not implementation proof. The implementation must still be reviewed and validated against the approved narrow endpoint contract and its role, tenant, privacy, throttle, and cashier-regression tests.

### 2026-09-26 — Supervisor copy and typography standardization proposal

Proposal-time upstream impact was checked against the refreshed `shopcity_LP` index before drafting the Supervisor change. The repository command was invoked for `SupervisorPage`, and direct exact file-qualified GitNexus impacts were run for the planned route/workspace components.

| Planned symbol                                    | File                                                      |         Risk | Direct dependants | Affected processes | Scope implication                                                                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------- | -----------: | ----------------: | -----------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SupervisorPage`                                  | `apps/web/app/(shell)/supervisor/page.tsx`                |          LOW |                 0 |                  0 | Dashboard route-local changes.                                                                                                                                                                     |
| `SupervisorApprovalsPage`                         | `apps/web/app/(shell)/supervisor/approvals/page.tsx`      |          LOW |                 0 |                  0 | Route-local page heading/copy.                                                                                                                                                                     |
| `SupervisorFraudPage`                             | `apps/web/app/(shell)/supervisor/fraud/page.tsx`          |          LOW |                 0 |                  0 | Route-local page heading/copy.                                                                                                                                                                     |
| `SupervisorReportsPage`                           | `apps/web/app/(shell)/supervisor/reports/page.tsx`        |          LOW |                 0 |                  0 | Route-local page heading/copy.                                                                                                                                                                     |
| `SupervisorTransactionsPage`                      | `apps/web/app/(shell)/supervisor/transactions/page.tsx`   |          LOW |                 0 |                  0 | Route-local wrapper; `TransactionWorkspace` below is shared.                                                                                                                                       |
| `SupervisorCardsPage` / `SupervisorCustomersPage` | respective supervisor routes                              |          LOW |                 0 |                  0 | Route wrappers; shared workspace below is high-risk.                                                                                                                                               |
| `CustomerWorkspace`                               | `apps/web/components/workflows/customer-workspace.tsx`    | **CRITICAL** |                 5 |                  5 | Direct consumers include Supervisor Cards/Customers, Admin Cards/Customers, and Cashier Customers. Scope any edit to an explicit Supervisor presentation variant and verify other roles unchanged. |
| `ApprovalsPanel`                                  | `apps/web/components/workflows/approvals-panel.tsx`       |     **HIGH** |                 3 |                  3 | Consumers include Supervisor overview/Approvals and Admin Approvals. Prefer route-scoped styles; any shared copy change needs Admin regression coverage.                                           |
| `FraudFlagsPanel`                                 | `apps/web/components/workflows/fraud-flags-panel.tsx`     |     **HIGH** |                 3 |                  3 | Consumers include Supervisor overview/Fraud and Admin Fraud. Prefer route-scoped styles; any shared copy change needs Admin regression coverage.                                                   |
| `ReportsWorkspace`                                | `apps/web/components/workflows/reports-workspace.tsx`     |     **HIGH** |                 4 |                  4 | Consumers include Supervisor overview/Reports and Admin Operations/Reports. Prefer route-scoped styles; any shared copy change needs Admin regression coverage.                                    |
| `TransactionWorkspace`                            | `apps/web/components/workflows/transaction-workspace.tsx` |          LOW |                 2 |                  2 | Consumers are Supervisor Transactions and Admin Transactions; preserve default Admin presentation if a Supervisor-only variant is added.                                                           |

**HIGH/CRITICAL findings were reported to the operator before implementation.** The change must not alter authorization, data scope, reporting meanings, approval/fraud/transaction actions, or other workflow behavior. Styling should be scoped to Supervisor route wrappers; shared components are only in scope for explicitly gated presentation variants with role-regression tests.

### 2026-09-25 — Sync Queue constrained-width header follow-up

Before updating the active Sync Queue OpenSpec and its responsive header, the proposal-time impact command was run:

```text
npm run proposal:impact -- --file apps/web/app/(shell)/cashier/sync/page.tsx CashierSyncPage
```

`CashierSyncPage`: **LOW**, exact, zero upstream dependants and zero affected processes. The initial follow-up stacks `.cashier-sync-header` at constrained widths. The additional phone-width correction is scoped to `.cashier-sync-queue-header` and `.cashier-sync-filters`; shell navigation, sync handlers, state values, and API interactions remain out of scope. Responsive coverage checks 375px full-width filters, 1080px stacked header, and 1440px two-column header.

### 2026-09-23 — Review 78 prototype-first reconstruction proposal impact

Before updating `openspec/changes/repo-review-78-prototype-first-frontend-reconstruction`, the required proposal-time command was run:

```text
npm run proposal:impact -- --file apps/web/components/app-topbar.tsx AppTopbar
```

`AppTopbar`: **LOW**, exact, 4 impacted symbols, 1 direct dependant, 2 affected processes (`ShellLayout`, `AppShellContent`), and 1 affected module (`Components`). This is documentation-only proposal work; no source symbol was edited. The audit separately records `CashierWorkflowRoute` as **HIGH**, so any future route JSX edit must rerun exact upstream impact and obtain review before editing.

### 2026-09-23 — Review 78b Phase 4 implementation impact

Before Phase 4 source edits, exact upstream GitNexus impact was run with tests included:

```text
node scripts/gitnexus.cjs impact -r shopcity_LP --summary-only --include-tests --file apps/web/components/workflows/use-customer-registration-controller.ts useCustomerRegistrationController
```

`useCustomerRegistrationController`: **CRITICAL**, 7 impacted symbols, 1 direct dependant, 5 affected processes, and 1 affected module. Direct/indirect route consumers are `SupervisorCustomersPage`, `AdminCustomersPage`, `CashierCustomersPage`, `SupervisorCardsPage`, and `AdminCardsPage`. The controller edit is limited to preserving one logical registration idempotency key across uncertain retries; customer/card/auth contracts remain unchanged.

The new `CustomerRegistrationFlow` target was not yet indexed (`impactedCount: 0`, risk `UNKNOWN`); local route/type/test coverage is used for this new symbol.

The required pre-edit impact for `CustomerWorkspace` was also run:

```text
node scripts/gitnexus.cjs impact -r shopcity_LP --summary-only --include-tests --file apps/web/components/workflows/customer-workspace.tsx CustomerWorkspace
```

`CustomerWorkspace`: **CRITICAL**, 6 impacted symbols, 6 direct dependants, 5 affected processes, and 1 affected module (`AdminCardsPage`, `CashierCustomersPage`, `SupervisorCardsPage`, `AdminCustomersPage`, `SupervisorCustomersPage`). No `CustomerWorkspace` edit is authorized or made in Phase 4; the focused registration flow composes the existing controller separately.

### 2026-09-19 — Review 73: `unify-cashier-design-system`

Planning baseline: `workflow-states-implementation` at `8d9eb98`, with existing dirty-tree changes preserved. Refreshed the index using `npm run gitnexus:analyze`; GitNexus status reports current HEAD. Ran `npm run proposal:impact -- --file <path> <symbol>` before drafting. Direction is upstream and tests are included by the script.

| Symbol                   | File                                                          | Risk         | Upstream symbols | Direct dependants | Processes |
| ------------------------ | ------------------------------------------------------------- | ------------ | ---------------: | ----------------: | --------: |
| `Button`                 | `apps/web/components/ui/button.tsx`                           | **CRITICAL** |               53 |                24 |        29 |
| `CashierWorkflowRoute`   | `apps/web/components/workflows/cashier-transaction-route.tsx` | **HIGH**     |                4 |                 4 |         3 |
| `VerifiedCardLookupStep` | `apps/web/components/workflows/verified-card-lookup-step.tsx` | **HIGH**     |                5 |                 1 |         3 |
| `TransactionDashboard`   | `apps/web/components/workflows/transaction-dashboard.tsx`     | LOW          |                2 |                 2 |         1 |
| `CashierOverviewLookup`  | `apps/web/components/workflows/cashier-overview-lookup.tsx`   | LOW          |                2 |                 2 |         1 |
| `AppShell`               | `apps/web/components/app-shell.tsx`                           | LOW          |                2 |                 2 |         1 |
| `CashierSyncPage`        | `apps/web/app/(shell)/cashier/sync/page.tsx`                  | LOW          |                0 |                 0 |         0 |

`Button` initially returned ambiguous const/function candidates; the authoritative result above uses `npm run proposal:impact -- --file apps/web/components/ui/button.tsx --kind Function Button`. HIGH/CRITICAL risks were explicitly reported before drafting. Workflow impact includes Cashier lookup, earn and redeem entry processes. Button reaches login, all three roles, customer/card/approval/report and operational consumers. CSS inheritance, variables and imports are not bounded by call-graph counts: LOW/zero upstream results do not make route/global-style changes safe without visual and functional coverage.

Required mitigation: phase the token/cascade/primitive migration; preserve controllers, sessions, financial contracts and queue state; test affected non-Cashier consumers; add real-route computed-style plus screenshot/behavior evidence. Re-run impact before editing every actual symbol, including generator/form/dialog helpers not individually analyzed during proposal creation. See `openspec/changes/unify-cashier-design-system/audit.md` and `execution-plan.md`. This entry records proposal analysis, not implementation verification.

Implementation update: the initial presentation/token/Sync slice was applied and GitNexus was re-analyzed. Final `detect-changes --scope all` passed but reports aggregate CRITICAL risk because the dirty tree also contains pre-existing AGENTS/CLAUDE/Admin/Supervisor/config changes. The aggregate must not be attributed solely to this change. The final candidate still requires computed-style conformance, reference review and remaining OpenSpec tasks before acceptance.

| 2026-09-17 | Final prototype adaptation review | CRITICAL (branch comparison) | 102 files / 259 symbols | 66 processes | `detect-changes --scope compare --base-ref master` includes the branch's accumulated historical work, not only the final page-at-a-time commits. Current working-tree modifications are limited to pre-existing AGENTS/CLAUDE files, generated test/build artifacts, screenshots, and caches; no unrelated source files were edited by this adaptation. Focused CashierWorkflowRoute, browser accessibility, workflow, critical-flow, build, lint, typecheck, and targeted Semgrep gates passed. |

| 2026-09-17 | Repo review 71 prototype-exact cashier adaptation | HIGH | 4 | 4 | `CashierWorkflowRoute` affects `CashierEarnPage`, `CashierLookupPage`, and `CashierRedeemPage` across 3 execution processes. Exact GitNexus impact: 4 direct dependants, 3 processes, 1 module. Proceed only with focused route/workflow regression coverage and preserve the extracted business logic while replacing presentational JSX. |

| 2026-09-17 | Prototype integration baseline surfaces | LOW–MEDIUM | 4–22 per symbol | 2–4 | Pre-implementation impact review covered `ConfigurationService` (LOW, 4), `RedemptionPolicyService` (LOW, 22), `LoyaltyService` (MEDIUM, 17), `FraudRulesService` (LOW, 3), and `RedemptionsService` (LOW, 5). Financial policy consumers require focused regression tests; no HIGH/CRITICAL result was returned for this change surface. |

| Date       | Symbol                                                               |     Risk | Impacted | Direct Dependants | Notes                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------- | -------: | -------: | ----------------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-21 | `AppShell`                                                           |      LOW |        2 |                 2 | Role-aware sidebar/workflow routing proposal touches the top-level shell; `ShellLayout` is the indexed process affected, so keep route/auth tests focused on shell composition and workflow navigation.                     |
| 2026-08-21 | `AppShell` / `ApprovalsPanel`                                        |      LOW |        4 |                 4 | Risk cleanup adds mobile drawer focus/close coverage and removes the approvals-panel hook dependency warning; both symbols had LOW impact with direct shell/workflow dependants only.                                       |
| 2026-08-21 | `CashierCustomersPage` / `CashierSyncPage`                           |      LOW |        0 |                 0 | Removed redundant route-local back links in favor of the role-aware shell sidebar; no indexed upstream callers or processes were affected.                                                                                  |
| 2026-07-20 | `RequestThrottleService`                                             |      LOW |        7 |                 3 | Process-local throttling implementation has limited blast radius, but proposal-time work should still treat it as shared infrastructure.                                                                                    |
| 2026-07-20 | `RequestThrottleGuard`                                               |      LOW |        6 |                 2 | Route-level throttling guard affects login/config/card lookup entry points.                                                                                                                                                 |
| 2026-07-20 | `CardsService.updateStatus`                                          |      LOW |        2 |                 2 | Directly affects `CardsController.updateStatus`; verify card-state changes with integration coverage.                                                                                                                       |
| 2026-07-20 | `ConfigurationService.getPublicConfig`                               |      LOW |        2 |                 2 | Directly affects the configuration module; validate inactive-tenant/branch behavior.                                                                                                                                        |
| 2026-07-20 | `seedFoundation`                                                     |      LOW |        2 |                 2 | Bootstrap path is narrow but operationally important; keep proposal-time credential changes explicit.                                                                                                                       |
| 2026-07-20 | `UsersService.createUser`                                            |      LOW |        1 |                 1 | Branch ownership changes flow through the users controller.                                                                                                                                                                 |
| 2026-07-20 | `CustomersService.createCustomer`                                    |      LOW |        2 |                 1 | Branch ownership changes flow through the customers controller.                                                                                                                                                             |
| 2026-07-20 | `CardsService.createCard`                                            |      LOW |        2 |                 1 | Card creation blast radius is small and localized.                                                                                                                                                                          |
| 2026-07-20 | `AuditService.recordWithClient`                                      | CRITICAL |       35 |                15 | Broadest blast radius in the repo; proposal changes touching audit should be treated as high-risk and require explicit review.                                                                                              |
| 2026-07-25 | `RealSmsProvider`                                                    |      LOW |        9 |                 4 | Repo review 17 SMS provider replacement affects the provider implementation and interface-level worker usage.                                                                                                               |
| 2026-07-25 | `createSmsProvider`                                                  |      LOW |        6 |                 3 | Provider factory changes affect worker bootstrap paths `bootstrap` and `bootstrapWorker`.                                                                                                                                   |
| 2026-07-25 | `LoyaltyService.decideApproval`                                      |     HIGH |        7 |                 3 | Approval expiry persistence fix affects receipt approval/rejection and approvals decision processes.                                                                                                                        |
| 2026-07-25 | `ApprovalsController.decideApproval`                                 |      LOW |        0 |                 0 | OpenAPI response schema update has no indexed upstream callers.                                                                                                                                                             |
| 2026-07-25 | `OutboxWorkerRuntime`                                                |   MEDIUM |        8 |                 6 | Worker recovery edits affect worker bootstrap paths and background job recovery behavior.                                                                                                                                   |
| 2026-07-25 | `LoyaltyService.earn`                                                |      LOW |        4 |                 4 | Sprint 2 financial integrity closure changes earn transaction retry/error mapping and affects earn plus receipt capture flows.                                                                                              |
| 2026-07-25 | `ReceiptsController.captureReceipt`                                  |      LOW |        0 |                 0 | Receipt workflow OpenAPI/deprecation surface has no indexed upstream callers.                                                                                                                                               |
| 2026-07-25 | `apiSuccessEnvelopeResponse`                                         |   MEDIUM |       13 |                12 | API governance work touches shared OpenAPI response decorators used across controllers.                                                                                                                                     |
| 2026-07-25 | `isTransactionConflict` (`src/modules/loyalty/loyalty.service.ts`)   |      LOW |        5 |                 1 | Sprint 2 lifecycle closure narrows earn retry classification; affected processes are `earn` and receipt capture via shared earn flow.                                                                                       |
| 2026-07-25 | `isTransactionConflict` (`src/modules/receipts/receipts.service.ts`) |      LOW |        1 |                 1 | Retry classifier narrowing has localized receipt-service impact.                                                                                                                                                            |
| 2026-07-25 | `apiErrorEnvelopeResponses`                                          |   MEDIUM |       28 |                12 | Earn endpoint error contract work may touch shared error-response decorator; prefer endpoint-specific examples to avoid broad behavioral changes.                                                                           |
| 2026-07-25 | `CreditLot` (`prisma/schema.prisma`)                                 |  UNKNOWN |        0 |                 0 | GitNexus did not index Prisma model symbol; proposal treats database migration as high-integrity surface and requires integration coverage.                                                                                 |
| 2026-07-26 | `ReceiptsService`                                                    |      LOW |        3 |                 1 | Repo review 20 cleanup can remove or adapt obsolete receipt orchestration with narrow indexed blast radius.                                                                                                                 |
| 2026-07-26 | `LoyaltyController.earn` (`earn`)                                    |      LOW |        0 |                 0 | Earn endpoint throttling and OpenAPI example cleanup are route-local at the indexed method level.                                                                                                                           |
| 2026-07-26 | `apiErrorEnvelopeResponses`                                          |   MEDIUM |       28 |                12 | Adding 429 documentation touches shared response decorator used by many controllers; prefer additive response support and focused tests.                                                                                    |
| 2026-07-26 | `CustomersService`                                                   |      LOW |        6 |                 4 | Cashier customer response minimization affects customer controller/service reads; require role-specific DTO coverage.                                                                                                       |
| 2026-07-26 | `toPublicCard`                                                       |     HIGH |       11 |                 4 | Cashier PII minimization affects card create/replace/update/lookup flows; proposal must call out compatibility checks and targeted regression tests.                                                                        |
| 2026-07-26 | `CustomersService`                                                   |      LOW |        6 |                 4 | Repo review 21 read-model hardening affects customer read DTO mapping, active-balance projection, and HTTP JSON serialization coverage.                                                                                     |
| 2026-07-26 | `CardsService`                                                       |   MEDIUM |        7 |                 5 | Card lookup balance correction affects cashier card/customer summaries; verify expiry filtering and PII minimization remain intact.                                                                                         |
| 2026-07-26 | `errorCodeFromStatus`                                                |      LOW |        2 |                 1 | Runtime 429 contract fix affects the global exception filter process and should align HTTP errors with OpenAPI `RATE_LIMITED`.                                                                                              |
| 2026-07-26 | `RequestThrottleGuard`                                               |      LOW |        9 |                 2 | Throttle exhaustion contract test may touch shared guard behavior; keep response envelope compatible across throttled routes.                                                                                               |
| 2026-07-26 | `LoyaltyService`                                                     |   MEDIUM |       12 |                 7 | Centralized active-balance reconstruction should align earn/customer/card reads without changing append-only financial history semantics.                                                                                   |
| 2026-07-26 | `LoyaltyLedgerEntry` (`prisma/schema.prisma`)                        |  UNKNOWN |        0 |                 0 | GitNexus did not index Prisma model symbol; Sprint 3 treats ledger schema expansion as high-integrity surface requiring migration and integration coverage.                                                                 |
| 2026-07-26 | `CreditLot` (`prisma/schema.prisma`)                                 |  UNKNOWN |        0 |                 0 | GitNexus did not index Prisma model symbol; controlled lot-balance mutation replaces temporary immutability and requires database invariant coverage.                                                                       |
| 2026-07-26 | `Approval` (`prisma/schema.prisma`)                                  |  UNKNOWN |        0 |                 0 | GitNexus did not index Prisma model symbol; generic approval targets require additive migration, backfill, and upgrade regression coverage.                                                                                 |
| 2026-07-26 | `ActiveBalanceService`                                               |   MEDIUM |       29 |                 8 | Sprint 3 balance reads and allocation planning depend on positive, unexpired lots; no affected processes were indexed, but customer/card/ledger reads need regression coverage.                                             |
| 2026-07-26 | `LoyaltyService`                                                     |   MEDIUM |       14 |                 8 | Sprint 3 transaction reads and existing earn orchestration remain central; avoid weakening append-only earn behavior while adding debit workflows.                                                                          |
| 2026-07-26 | `ApprovalsService`                                                   |      LOW |        8 |                 4 | Generic approval target read/decision surfaces have limited indexed blast radius but require earn approval upgrade compatibility tests.                                                                                     |
| 2026-07-26 | `publishOutboxEvent`                                                 |      LOW |        1 |                 1 | Sprint 3 should reuse transactional outbox publishing without changing queue semantics.                                                                                                                                     |
| 2026-07-26 | `createOutboxQueue`                                                  |      LOW |        5 |                 1 | Queue creation affects worker bootstrap and runtime startup flows; avoid unrelated worker lifecycle changes.                                                                                                                |
| 2026-07-26 | `createOutboxWorker`                                                 |      LOW |        5 |                 1 | Worker creation affects worker bootstrap and runtime startup flows; Sprint 3 SMS/outbox work should preserve recovery behavior.                                                                                             |
| 2026-07-26 | `SmsProvider`                                                        |   MEDIUM |       17 |                 8 | Interface-level SMS impact is lower-bound and touches worker bootstrap flows; new templates must preserve truthful provider states.                                                                                         |
| 2026-07-26 | `RedemptionsService.redeem`                                          |  UNKNOWN |        0 |                 0 | GitNexus did not find the current stub method in the index; index appears stale for redemptions, so implementation must proceed with extra local search and tests.                                                          |
| 2026-07-26 | `ApprovalsService.listApprovals`                                     |      LOW |        2 |                 2 | Repo review 22 approval receipt mapping changes flow through `ApprovalsController.listApprovals`; preserve existing approval list contract.                                                                                 |
| 2026-07-26 | `LoyaltyService.listApprovals`                                       |      LOW |        3 |                 1 | Redemption approval includes may affect the shared loyalty approval listing path used by the approvals module.                                                                                                              |
| 2026-07-26 | `LoyaltyService.decideApproval`                                      |     HIGH |        7 |                 3 | Repo review 22 approval execution changes affect receipt approval/rejection and approvals decision processes; warn before editing this symbol.                                                                              |
| 2026-07-26 | `OutboxWorkerRuntime.createSmsMessageFromOutboxEvent`                |      LOW |        4 |                 1 | SMS ownership generalization affects worker bootstrap and SMS recovery paths; preserve outbox-event idempotency.                                                                                                            |
| 2026-07-26 | `RedemptionsService.redeem`                                          |      LOW |        1 |                 1 | Refreshed after GitNexus re-index; redemption endpoint implementation affects only `RedemptionsController.redeem` directly.                                                                                                 |
| 2026-07-26 | `ApprovalsService.decideApproval`                                    |      LOW |        2 |                 2 | Approval controller decision endpoint remains narrow, but delegates into HIGH-risk `LoyaltyService.decideApproval`.                                                                                                         |
| 2026-07-30 | `PrismaService`                                                      |     HIGH |       69 |                26 | Repo review 23 database analysis found Prisma model names are not indexed, so `PrismaService` is the actionable blast-radius symbol for schema and migration work.                                                          |
| 2026-08-03 | `AuthService`                                                        |      LOW |        6 |                 4 | Repo review 34 device-session and attestation work affects auth session resolution and refresh paths; proceed with focused auth tests.                                                                                      |
| 2026-08-03 | `LoyaltyService.decideApproval` (`decideApproval`)                   |     HIGH |        9 |                 4 | Approval aggregate safety changes affect receipt approve/reject and approval decision processes; warn before editing and add concurrency coverage.                                                                          |
| 2026-08-03 | `ApprovalsService`                                                   |   MEDIUM |        9 |                 5 | Approval list/decision wrapper impact is moderate and delegates into loyalty approval workflows.                                                                                                                            |
| 2026-08-03 | `OutboxWorkerRuntime`                                                |   MEDIUM |        8 |                 6 | SMS payload terminal classification affects worker bootstrap/runtime flows; preserve outbox recovery behaviour.                                                                                                             |
| 2026-08-03 | `SmsProvider`                                                        |   MEDIUM |       17 |                 8 | Interface impact is a lower-bound across provider implementations and worker bootstrap paths; avoid provider API churn while hardening payloads.                                                                            |
| 2026-08-03 | `apiErrorEnvelopeResponses`                                          |     HIGH |       36 |                17 | OpenAPI error contract changes touch many controllers; prefer endpoint-specific examples and avoid broad shared decorator edits unless required.                                                                            |
| 2026-08-03 | `PrismaService`                                                      | CRITICAL |       77 |                30 | Repo review 34 schema/migration surfaces are high blast-radius; use additive migrations, Prisma model edits, and targeted integration coverage instead of shared service behaviour edits.                                   |
| 2026-08-03 | `LoyaltyService`                                                     |   MEDIUM |       15 |                 9 | Ledger/read-model and Adjustment invariant work touches central loyalty service behaviour; preserve append-only financial history.                                                                                          |
| 2026-08-10 | `OfflineSyncService`                                                 |      LOW |        5 |                 3 | Offline replay-hardening is localized to offline sync, but it directly affects the canonical idempotency record and regression coverage.                                                                                    |
| 2026-08-10 | `FraudService`                                                       |      LOW |        4 |                 2 | Fraud evidence hardening is narrow but will change duplicate-attempt evidence and durable evaluation paths.                                                                                                                 |
| 2026-08-10 | `FraudRulesService`                                                  |      LOW |        6 |                 4 | Fraud rule changes remain localized to rule evaluation, but downstream review and outbox handling will need matching tests.                                                                                                 |
| 2026-08-10 | `ReportMaterializerService`                                          |   MEDIUM |       11 |                 6 | Reporting correctness fixes touch the materializer core and can change report totals, liability eligibility, and duplicate-attempt counts.                                                                                  |
| 2026-08-10 | `ReportExportService`                                                |      LOW |        6 |                 4 | Export/refresh changes are narrow but affect durability and any newly exposed report views.                                                                                                                                 |
| 2026-08-10 | `OutboxWorkerRuntime`                                                |   MEDIUM |        8 |                 6 | Durable fraud dispatch touches the shared worker runtime and the bootstrap/worker recovery flow.                                                                                                                            |
| 2026-08-10 | `ReportsController`                                                  |      LOW |        4 |                 2 | Exposing missing report endpoints is route-local but needs contract and RBAC checks.                                                                                                                                        |
| 2026-08-10 | `FraudController`                                                    |      LOW |        3 |                 1 | Fraud review/exposure changes are route-local, with limited direct blast radius.                                                                                                                                            |
| 2026-08-11 | `ReportMaterializerService`                                          |   MEDIUM |       11 |                 6 | Review 42 reporting closure touches the materializer core and can change report totals, watermark filtering, reversal-aware credit math, and tenant-wide locking.                                                           |
| 2026-08-11 | `FraudService`                                                       |      LOW |        4 |                 2 | Review 42 fraud closure is localized but needs post-commit evidence persistence and duplicate-attempt handling coverage.                                                                                                    |
| 2026-08-11 | `OutboxWorkerRuntime`                                                |   MEDIUM |        8 |                 6 | Review 42 fraud delivery lifecycle changes affect worker bootstrap and recovery flows; preserve SMS/outbox behavior while adding terminal fraud processing.                                                                 |
| 2026-08-11 | `FraudBehaviorRuntime`                                               |     HIGH |       17 |                 5 | Review 42 behavioral fraud normalization affects shared job/runtime evaluation paths; keep day-window dedupe and shared wrapper coverage aligned with the outbox worker changes.                                            |
| 2026-08-11 | `ReportMaterializerService`                                          |   MEDIUM |       11 |                 6 | Final-gate reporting closure expands as-of snapshots, tenant-wide isolation, and durable refresh handling; validate report totals and materialization recovery.                                                             |
| 2026-08-11 | `OutboxWorkerRuntime`                                                |   MEDIUM |        8 |                 6 | Final-gate outbox recovery adds durable report refresh handling; preserve existing SMS and fraud recovery behavior while extending replay eligibility.                                                                      |
| 2026-08-11 | `FraudBehaviorRuntime`                                               |     HIGH |       21 |                 5 | Final-gate branch-day normalization is a HIGH-risk surface because it can regroup findings and alter dedupe counts across worker and test paths.                                                                            |
| 2026-08-11 | `OfflineSyncService`                                                 |      LOW |        5 |                 3 | Final-gate offline acceptance coverage is localized but must preserve server-authoritative rejection and exactly-one-effect duplicate races.                                                                                |
| 2026-08-11 | `branchDayWindow`                                                    |  UNKNOWN |        0 |                 0 | New branch-day helper was not indexed yet when impact was checked; covered by unit tests and wired into fraud day-window evaluation.                                                                                        |
| 2026-08-11 | `ReportMaterializerService`                                          |   MEDIUM |       14 |                 8 | Review 43 reporting closure changes historical redemption/SMS snapshot inputs and daily financial totals; verify consistency across all read models.                                                                        |
| 2026-08-11 | `processRecord` (`OfflineSyncService`)                               |      LOW |        3 |                 1 | Review 43 offline replay ownership fix is localized but must prevent follower requests from writing canonical sync attempts after timeout.                                                                                  |
| 2026-08-11 | `mapSmsDispatchResult`                                               |     HIGH |        4 |                 1 | Review 43 SMS evidence preservation is HIGH-risk because worker delivery-state updates affect retry, terminal message state, and historical reporting reconstruction.                                                       |
| 2026-08-12 | `OutboxWorkerRuntime`                                                |   MEDIUM |        8 |                 6 | Review 44 remaining-gap proposal touches report-refresh recovery evidence and GitHub worker/bootstrap certification paths; add focused recovery tests before certifying Sprint 4.                                           |
| 2026-08-12 | `OfflineSyncService`                                                 |      LOW |        5 |                 3 | Review 44 receipt-race evidence tightening is localized to offline sync replay/duplicate semantics and should keep exactly-one-effect guarantees intact.                                                                    |
| 2026-08-12 | `LoyaltyService`                                                     |   MEDIUM |       20 |                12 | Review 44 concurrent receipt loser-outcome assertions still touch the central earn path; verify duplicate/conflict outcomes without weakening receipt uniqueness or append-only ledger rules.                               |
| 2026-08-13 | `PrismaService` (`prisma/schema.prisma`)                             |  UNKNOWN |        0 |                 0 | Sprint 5 proposal-time analysis could not resolve the Prisma schema surface by symbol name; treat schema, migration, and custom SQL work as a high-integrity surface with mandatory integration coverage.                   |
| 2026-08-13 | `ReportMaterializerService`                                          |   MEDIUM |       14 |                 8 | Sprint 5 expiry and pilot reporting work changes authoritative as-of reconstruction and worker-driven materialization; verify expiry liability math and reconciliation views.                                               |
| 2026-08-13 | `OutboxWorkerRuntime`                                                |   MEDIUM |        8 |                 6 | Sprint 5 reminder, observability, and recovery work extends shared worker delivery/recovery behavior; preserve SMS and report-refresh terminal handling.                                                                    |
| 2026-08-13 | `LoyaltyService`                                                     |   MEDIUM |       20 |                12 | Sprint 5 expiry integration touches the central financial orchestration surface and must preserve append-only history, exact lot math, and duplicate protection.                                                            |
| 2026-08-13 | `bootstrap` (`src/worker.ts`)                                        |      LOW |        2 |                 2 | Sprint 5 worker bootstrap additions are localized but affect runtime startup and shutdown ordering for expiry, reminders, and pilot operations signals.                                                                     |
| 2026-08-13 | `envValidationSchema`                                                |      LOW |        1 |                 1 | Sprint 5 reminder worker config extends shared environment validation; keep additive defaults and preserve existing API/worker boot validation.                                                                             |
| 2026-08-13 | `renderSmsMessage`                                                   |   MEDIUM |        8 |                 4 | Sprint 5 reminder template support changes shared SMS rendering/validation behavior and must remain compatible with existing transactional templates.                                                                       |
| 2026-08-13 | `ReportMaterializerService`                                          |   MEDIUM |       14 |                 8 | Sprint 5 phase 4 reporting updates affect worker bootstrap flows and authoritative as-of liability reconstruction; preserve branch/tenant materialization semantics.                                                        |
| 2026-08-13 | `ReportsService`                                                     |   MEDIUM |        8 |                 6 | Sprint 5 reporting surface updates affect executive summary and export reads; keep scope filtering and date validation unchanged.                                                                                           |
| 2026-08-13 | `LoyaltyService`                                                     |   MEDIUM |       20 |                12 | Sprint 5 transaction read-model updates expose expiry evidence through shared ledger reads; preserve existing earn/redeem/adjustment/reversal behavior.                                                                     |
| 2026-08-13 | `LoyaltyController`                                                  |      LOW |        6 |                 1 | Sprint 5 OpenAPI contract updates are additive and localized to transaction read schemas and summaries.                                                                                                                     |
| 2026-08-13 | `ReportsController`                                                  |      LOW |        4 |                 2 | Sprint 5 report contract verification touches route-local reporting endpoints with limited blast radius.                                                                                                                    |
| 2026-08-13 | `AppModule`                                                          |      LOW |        8 |                 1 | Sprint 5 observability wiring adds release metadata and log redaction to shared HTTP logging; keep bootstrap behavior and non-production pretty logging intact.                                                             |
| 2026-08-13 | `envValidationSchema`                                                |      LOW |        0 |                 0 | Sprint 5 observability env additions are additive and should preserve current startup validation defaults for API and worker processes.                                                                                     |
| 2026-08-13 | `ReportsService`                                                     |   MEDIUM |        8 |                 6 | Sprint 5 pilot operations summary adds source-backed operational aggregates and reconciliation signals; preserve RBAC, scope resolution, and read-only behavior.                                                            |
| 2026-08-13 | `AppModule`                                                          |      LOW |        8 |                 1 | Sprint 5 packaging/security work uses release metadata in runtime packaging and should preserve current API bootstrap behavior.                                                                                             |
| 2026-08-13 | `envValidationSchema`                                                |      LOW |        0 |                 0 | Sprint 5 packaging/security env updates remain additive and should not weaken startup validation defaults.                                                                                                                  |
| 2026-08-13 | `ReportsService`                                                     |   MEDIUM |        8 |                 6 | Sprint 5 packaging/security work keeps the pilot operations summary as a read-only admin surface while release verification expands around it.                                                                              |
| 2026-08-13 | `ReportsController`                                                  |      LOW |        4 |                 2 | Sprint 5 packaging/security work keeps reporting route contracts additive while introducing operational release verification around the deployment artifact.                                                                |
| 2026-08-13 | `ExpiryReminderService`                                              |  UNKNOWN |        0 |                 0 | Proposal-time GitNexus lookup could not resolve the exact reminder symbol; reminder revalidation should be treated as a high-integrity transactional surface with targeted integration coverage.                            |
| 2026-08-13 | `validateReadinessDocument`                                          |  UNKNOWN |        0 |                 0 | Proposal-time GitNexus lookup could not resolve the exact readiness-verifier function; hardening the release gate needs direct unit and evidence-path regression coverage.                                                  |
| 2026-08-13 | `CreditExpiryWorkerRuntime`                                          |  UNKNOWN |        0 |                 0 | Proposal-time GitNexus lookup could not resolve the exact worker runtime symbol; worker sweep sequencing should retain existing startup/shutdown coverage while reminder and expiry fixes land.                             |
| 2026-08-13 | `HealthController`                                                   |      LOW |        5 |                 3 | Repo review 46 certification cleanup keeps the readiness endpoint localized, but evidence gating still needs fail-closed regression coverage.                                                                               |
| 2026-08-13 | `initializeSentryIfConfigured`                                       |  UNKNOWN |        0 |                 0 | Proposal-time impact check returned target-not-found; keep Sentry bootstrap hardening covered by direct tests and note that it is not indexed as a named symbol.                                                            |
| 2026-08-13 | `SystemActorService`                                                 |  UNKNOWN |        0 |                 0 | Review 47 optional P2 SYSTEM actor first-creation race was not resolved by GitNexus; if fixed before freeze, cover with direct race/regression tests.                                                                       |
| 2026-08-14 | `MoneyInput`                                                         |  UNKNOWN |        0 |                 0 | Proposal-time impact lookup returned target-not-found for the frontend money parser surface; treat this as a new-surface/index gap and cover with direct financial input tests.                                             |
| 2026-08-14 | `SessionBootstrap`                                                   |  UNKNOWN |        0 |                 0 | Proposal-time impact lookup returned target-not-found for session-gating shell work; treat the frontend shell as a new-surface/index gap and add protected route tests.                                                     |
| 2026-08-14 | `AppShell`                                                           |      LOW |        2 |                 2 | Proposal-time impact lookup resolved the top-level app shell; role navigation and route protection remain a narrow but cross-cutting frontend surface that should be covered with integration tests.                        |
| 2026-08-13 | `SystemActorService.getOrCreate`                                     |  UNKNOWN |        0 |                 0 | Review 47 optional P2 SYSTEM actor first-creation race target was not resolved by GitNexus; treat as unindexed high-integrity worker support surface.                                                                       |
| 2026-08-13 | `HealthController`                                                   |      LOW |        5 |                 3 | Repo review 49 release-certification cleanup keeps readiness fail-closed, but Vercel `/health/ready` still returns 503 DEPENDENCY_UNAVAILABLE and the candidate/deployment evidence chain must be reconciled.               |
| 2026-08-13 | `bootstrap` (`src/worker.ts`)                                        |      LOW |        2 |                 2 | Repo review 49 release-certification cleanup keeps worker startup localized, but the certified release surface still needs the worker runtime alongside the API artifact.                                                   |
| 2026-08-15 | `ConfigurationController`                                            |      LOW |        3 |                 1 | Repo review 51 workflow completion uses public configuration as shell context; keep the backend contract anchor stable while the frontend starts consuming branch, timezone, and policy data.                               |
| 2026-08-15 | `OfflineSyncController`                                              |      LOW |        3 |                 1 | Repo review 51 workflow completion treats offline batch submission as a real reconciliation surface; keep the controller contract stable while the new sync queue UI lands.                                                 |
| 2026-08-15 | `ConfigurationController` / `OfflineSyncController`                  |      LOW |        6 |                 2 | Repo review 51 workflow completion v2 expands the same public-config and sync-queue frontend anchors into a line-by-line exhaustive workflow plan; backend blast radius remains low.                                        |
| 2026-08-15 | `PilotHealthPanel`                                                   |      LOW |        3 |                 3 | Repo review 52 workflow closure fixes exact pilot-health contract mapping; keep the panel aligned with published backend fields and verify the warning/success state logic.                                                 |
| 2026-08-15 | `ReportsWorkspace`                                                   |      LOW |        2 |                 2 | Repo review 52 workflow closure fixes report contract mapping and export behavior; keep the workspace on exact backend summary fields and file-download behavior.                                                           |
| 2026-08-15 | `EarnTransactionForm`                                                |      LOW |        1 |                 1 | Repo review 52 workflow closure adds offline-capture producer behavior and draft/idempotency persistence to the earn form.                                                                                                  |
| 2026-08-15 | `RedeemTransactionForm`                                              |      LOW |        1 |                 1 | Repo review 52 workflow closure fixes redeem basket prefill and limit enforcement; keep basket amount separate from available balance context.                                                                              |
| 2026-08-15 | `SupervisorPage`                                                     |      LOW |        0 |                 0 | Repo review 52 workflow closure treats the supervisor shell wrapper as a route-level gating surface; page symbol is not a blast-radius hotspot but still needs route tests.                                                 |
| 2026-08-22 | `LoginForm`                                                          |      LOW |        1 |                 1 | Frontend stabilization removes raw device-secret persistence from the login form; the direct caller is the login page and the auth flow remains covered by focused browser tests.                                           |
| 2026-08-24 | `CashierPage`                                                        |      LOW |        0 |                 0 | Repo review 57 cashier launcher proposal adds scanner-first entry; GitNexus found no indexed upstream callers or processes.                                                                                                 |
| 2026-08-24 | `AuthService`                                                        |   MEDIUM |        7 |                 5 | Repo review 57 inactivity enforcement and POS provisioning touch auth session creation/resolution; preserve session refresh and device-attestation coverage.                                                                |
| 2026-08-24 | `CardsService`                                                       |   MEDIUM |        7 |                 5 | Repo review 57 cashier lookup contract changes affect card lookup and related callers; preserve branch scope, masked PII, and balance projection tests.                                                                     |
| 2026-08-24 | `ConfigurationService`                                               |      LOW |        5 |                 3 | Expanded repo review 57 scope includes authenticated branch authority and public-config caching; preserve tenant/branch filtering and configuration contract tests.                                                         |
| 2026-08-24 | `nextConfig`                                                         |  UNKNOWN |        0 |                 0 | GitNexus could not resolve the Next.js config symbol; CSP/header changes require direct configuration inspection and browser/security-header verification.                                                                  |
| 2026-08-25 | `CashierPage`                                                        |      LOW |        0 |                 0 | Repo review 58 proposal extends the cashier overview with an on-dashboard scanner/search field and backend-backed today-transaction summary; no indexed upstream callers or processes were affected.                        |
| 2026-08-25 | `ReportsService`                                                     |   MEDIUM |        8 |                 6 | Repo review 58 adds a cashier-scoped today-transaction read model beside existing report queries; preserve supervisor/admin report behavior and branch isolation.                                                           |
| 2026-08-25 | `ReportsController`                                                  |      LOW |        4 |                 2 | Repo review 58 adds an authenticated cashier today-transaction route; verify role and OpenAPI coverage without weakening report restrictions.                                                                               |
| 2026-08-26 | `ReportsService.listCashierToday`                                    |      LOW |        2 |                 2 | Reindexed after repairing GitNexus native dependencies. Review 60 DTO correction affects the cashier-today controller process and Reports module only; preserve cashier/tenant/branch scope and add contract coverage.      |
| 2026-08-26 | `ReportsController.listCashierToday`                                 |      LOW |        0 |                 0 | The cashier-today route contract has no indexed upstream callers; regenerate OpenAPI/client and retain Cashier-only RBAC coverage.                                                                                          |
| 2026-08-26 | `CashierOverviewLookup`                                              |      LOW |        2 |                 2 | Review 60 generated-client and signed activity rendering affect CashierPage only; include focus, activity, accessibility, and visual regression coverage.                                                                   |
| 2026-09-10 | `ReportMaterializerService`                                          |   MEDIUM |       14 |                 8 | Review 68 proposal: executive stock/flow, cashier, redemption, customer-ranking, and SMS aggregate semantics affect the materializer and report read paths; preserve as-of reconstruction and require integration coverage. |
| 2026-09-10 | `CardsService`                                                       |   MEDIUM |        7 |                 5 | Review 68 proposal: canonical serial identity, replacement notification, block confirmation, and lookup behavior affect card lifecycle callers; require collision migration and concurrency tests.                          |
| 2026-09-10 | `OutboxWorkerRuntime`                                                |   MEDIUM |        8 |                 6 | Review 68 proposal: template-aware SMS recovery, DLR transitions, and operational status counts affect shared worker recovery; preserve monotonic terminal-state behavior.                                                  |
| 2026-09-10 | `ReportsService`                                                     |   MEDIUM |        8 |                 6 | Review 68 proposal: snapshot/series contracts, rankings, SMS inspection, and refresh idempotency affect report reads; preserve RBAC and branch/tenant scope.                                                                |
| 2026-09-10 | `ReportsController`                                                  |      LOW |        4 |                 2 | Review 68 proposal adds transaction SMS inspection and report contract fields; route-level impact requires OpenAPI and RBAC coverage.                                                                                       |
| 2026-09-10 | `normalizeCardSerial`                                                |  UNKNOWN |        0 |                 0 | New shared identity helper was not indexed; treat canonicalization and collision migration as high-integrity and cover every server boundary directly.                                                                      |
| 2026-09-14 | `ReportMaterializerService`                                          |   MEDIUM |       12 |                 6 | Repo review 69 timezone-correct historical cutoffs and SMS ownership changes affect the materializer core; preserve as-of semantics and add boundary/integration coverage.                                                  |
| 2026-09-14 | `filterSmsForScope`                                                  |      LOW |        4 |                 1 | Repo review 69 adds card-linked replacement SMS branch attribution; keep tenant/branch isolation and unresolved-ownership exclusion explicit.                                                                               |
| 2026-09-14 | `ReportsService`                                                     |   MEDIUM |        9 |                 7 | Repo review 69 report read-path changes may expose corrected historical and SMS aggregates; preserve authorization and scope filtering.                                                                                     |

### 2026-09-21 — Review 78: `repo-review-78-prototype-first-frontend-reconstruction`

Planning baseline: `workflow-states-implementation` at `3ca692b`, with existing dirty-tree changes preserved. GitNexus was refreshed before analysis. Direction is upstream and tests are included.

| Symbol      | File                                 | Risk | Upstream symbols | Direct dependants | Processes |
| ----------- | ------------------------------------ | ---- | ---------------: | ----------------: | --------: |
| `AppTopbar` | `apps/web/components/app-topbar.tsx` | LOW  |                3 |                 1 |         2 |

The affected processes are `ShellLayout` and `AppShellContent`; the affected module is `Components`. This is a presentation/shell surface, so CSS cascade, DOM hierarchy, responsive geometry, and browser evidence exceed call-graph counts. Re-run impact for each additional symbol before implementation and preserve the backend, authorization, and financial boundaries recorded in the proposal.

### 2026-09-23 — Review 78b: `review-78b-prototype-parity-closure`

Planning baseline: `workflow-states-implementation` at `0b56977`, with existing dirty-tree changes preserved. GitNexus direction is upstream and tests are included. The index is stale relative to HEAD.

| Symbol                  | File                                                        | Risk     |  Direct dependants | Processes | Finding                                                                                    |
| ----------------------- | ----------------------------------------------------------- | -------- | -----------------: | --------: | ------------------------------------------------------------------------------------------ |
| `LoginForm`             | `apps/web/components/auth/login-form.tsx`                   | LOW      |                  2 |         1 | `LoginPage`                                                                                |
| `CashierOverviewLookup` | `apps/web/components/workflows/cashier-overview-lookup.tsx` | LOW      |                  2 |         1 | `CashierPage`                                                                              |
| `TransactionDashboard`  | `apps/web/components/workflows/transaction-dashboard.tsx`   | LOW      |                  2 |         1 | `CashierTransactionsPage`                                                                  |
| `RedeemTransactionForm` | `apps/web/components/workflows/redeem-transaction-form.tsx` | HIGH     | 3 direct / 7 total |         3 | Lookup, Earn, and Redeem processes                                                         |
| `CustomerWorkspace`     | `apps/web/components/workflows/customer-workspace.tsx`      | CRITICAL |                  6 |         5 | Admin/Supervisor/Cashier customer and card pages                                           |
| `CashierWorkflowRoute`  | `apps/web/components/workflows/cashier-workflow-route.tsx`  | UNKNOWN  |                  0 |         0 | Target not found in stale index; verify with local search and focused tests before editing |

HIGH/CRITICAL findings require focused regression coverage and explicit review before shared workflow or customer workspace edits. No implementation edit was made during proposal drafting.

### 2026-09-23 — Review 78b Phase 2 implementation impact

Exact GitNexus upstream impact was run with `--include-tests` before the Phase 2 source edits. All resolved targets were LOW risk; no HIGH or CRITICAL result was returned.

| Symbol                  | File                                                        | Risk |  Direct dependants | Processes | Finding                                                           |
| ----------------------- | ----------------------------------------------------------- | ---- | -----------------: | --------: | ----------------------------------------------------------------- |
| `CashierOverviewLookup` | `apps/web/components/workflows/cashier-overview-lookup.tsx` | LOW  |                  2 |         1 | `CashierPage`; overview metric and bounded-feed presentation      |
| `AppShell`              | `apps/web/components/app-shell.tsx`                         | LOW  |                  2 |         1 | `ShellLayout`; shared one-sidebar/one-topbar geometry boundary    |
| `GlobalShellSearch`     | `apps/web/components/global-shell-search.tsx`               | LOW  | 2 direct / 4 total |         2 | `ShellLayout` and `AppShellContent`; role-aware search categories |

The exact commands were `npx gitnexus impact <symbol> --direction upstream --repo shopcity_LP --file <file> --include-tests --summary-only`. A second exact LOW-risk `CashierOverviewLookup` impact was run immediately before refining authoritative zero/unavailable credit handling. CSS token/cascade verification remains broader than call-graph counts, so shell geometry is covered by source checks and focused shell/search tests without changing backend, auth, RBAC, or financial code.

### 2026-09-23 — Review 78b Phase 3 workflow impact

Exact GitNexus upstream impact was run with tests included before the Phase 3 workflow edits. The approved bounded scope is presentation/accessibility only; no controller state transitions, API, auth/RBAC, masking/scope, financial, idempotency, or offline semantics are changed.

| Symbol                       | File                                                             | Risk     |  Direct dependants | Processes | Finding                                                                                |
| ---------------------------- | ---------------------------------------------------------------- | -------- | -----------------: | --------: | -------------------------------------------------------------------------------------- |
| `CashierWorkflowRoute`       | `apps/web/components/workflows/cashier-transaction-route.tsx`    | **HIGH** |                  4 |         3 | `CashierEarnPage`, `CashierLookupPage`, and `CashierRedeemPage`; shared workflow route |
| `useCashierLookupController` | `apps/web/components/workflows/use-cashier-lookup-controller.ts` | **HIGH** | 1 direct / 5 total |         3 | Lookup controller used by all three cashier workflow routes                            |
| `EarnTransactionForm`        | `apps/web/components/workflows/earn-transaction-form.tsx`        | LOW      |                  2 |         0 | Direct form consumers only                                                             |
| `RedeemTransactionForm`      | `apps/web/components/workflows/redeem-transaction-form.tsx`      | LOW      |                  2 |         0 | Direct form consumers only                                                             |

Exact commands:

```text
node scripts/gitnexus.cjs impact -r shopcity_LP --summary-only --include-tests --file apps/web/components/workflows/cashier-transaction-route.tsx CashierWorkflowRoute
node scripts/gitnexus.cjs impact -r shopcity_LP --summary-only --include-tests --file apps/web/components/workflows/use-cashier-lookup-controller.ts useCashierLookupController
node scripts/gitnexus.cjs impact -r shopcity_LP --summary-only --include-tests --file apps/web/components/workflows/earn-transaction-form.tsx EarnTransactionForm
node scripts/gitnexus.cjs impact -r shopcity_LP --summary-only --include-tests --file apps/web/components/workflows/redeem-transaction-form.tsx RedeemTransactionForm
```

The HIGH findings were reported and bounded presentation/accessibility edits were subsequently approved. Any edit widening beyond those boundaries must stop for fresh impact review and approval.

### 2026-09-30 — Supervisor Operational Reports dashboard

Proposal-time upstream impact with tests included was run before bringing the dashboard change from PR #47 onto `workflow-states-implementation`:

```text
npm run proposal:impact -- --file apps/web/components/workflows/reports-workspace.tsx ReportsWorkspace
npm run proposal:impact -- --file 'apps/web/app/(shell)/supervisor/reports/page.tsx' SupervisorReportsPage
```

| Symbol                  | Risk            | Impacted symbols | Direct dependants | Affected processes / callers                                                                  |
| ----------------------- | --------------- | ---------------: | ----------------: | --------------------------------------------------------------------------------------------- |
| `ReportsWorkspace`      | **HIGH**, exact |                4 |                 4 | 3 flows: `AdminOperationsPage`, `SupervisorReportsPage`, `AdminReportsPage`, and report tests |
| `SupervisorReportsPage` | LOW, exact      |                0 |                 0 | 0                                                                                             |

The shared report builder reaches Admin and Supervisor workflows, so preserve default Admin behavior and verify period propagation, branch scoping, report generation, and existing export controls. The HIGH result was reported before proceeding; no backend/API or authorization changes are in the ported patch.

### 2026-09-27 — Cashier Sync Queue presentation/copy follow-up

Before drafting `openspec/changes/cashier-sync-queue-presentation-copy`, ran the required proposal-time command:

```text
npm run proposal:impact -- --file openspec/changes/cashier-sync-queue-presentation-copy/proposal.md CashierSyncPage
```

The local CLI reported `Target 'CashierSyncPage' not found` (`UNKNOWN`, 0 impacted) despite the supplied file/symbol. The parent-provided refreshed-index upstream analysis for this exact planned page surface is authoritative: **LOW**, 0 direct callers, 0 affected flows. No app source was edited before this proposal and impact record. Scope remains presentation/copy only.

### 2026-10-02 — Browser-bound POS WebAuthn device attestation proposal

Proposal-time upstream impacts with tests included were run before drafting this change:

```text
npm run proposal:impact -- --file src/modules/auth/auth.service.ts login
npm run proposal:impact -- --file src/modules/auth/auth.controller.ts login
npm run proposal:impact -- --file apps/web/components/auth/login-form.tsx LoginForm
npm run proposal:impact -- --file apps/web/components/auth/login-form.tsx buildDeviceHeaders
npm run proposal:impact -- --file 'apps/web/app/(shell)/admin/devices/page.tsx' AdminDevicesPage
npm run proposal:impact -- --file src/modules/branches/branches.service.ts createDevice
```

| Symbol                         | Risk       | Impacted symbols | Direct dependants | Affected processes / modules                |
| ------------------------------ | ---------- | ---------------: | ----------------: | ------------------------------------------- |
| `AuthService.login`            | LOW, exact |                3 |                 3 | 1 process (`login`); Auth                   |
| `AuthController.login`         | LOW, exact |                0 |                 0 | 0                                           |
| `LoginForm`                    | LOW, exact |                2 |                 2 | 1 process (`LoginPage`); Workflows          |
| `buildDeviceHeaders`           | LOW, exact |                4 |                 1 | 1 process (`LoginPage`); Auth and Workflows |
| `AdminDevicesPage`             | LOW, exact |                0 |                 0 | 0                                           |
| `BranchesService.createDevice` | LOW, exact |                2 |                 2 | Branches; 0 processes                       |

No HIGH/CRITICAL result. The proposal crosses the login/device-enrollment boundary but preserves device records, branch binding, session device identity, and the fail-closed Earn/Redeem checks. Re-run impact if implementation expands into refresh, offline reconciliation, or financial services; those are not proposed to change.

### 2026-10-05 — WebAuthn credential-bound session design refinement

The proposal review added two-phase cashier login and `Session.deviceCredentialId` validation/revocation. Exact upstream impacts with tests included were run before revising the design and TRD:

```text
npm run proposal:impact -- --file src/modules/auth/auth.service.ts login
npm run proposal:impact -- --file src/modules/auth/auth.service.ts refresh
npm run proposal:impact -- --file src/modules/auth/auth.service.ts resolveCurrentSession
npm run proposal:impact -- --file src/modules/auth/auth.service.ts issueSession
npm run proposal:impact -- --file src/common/auth/session.guard.ts isSessionDeviceEligible
```

| Symbol                              | Risk            | Impacted symbols | Direct dependants | Affected processes / modules                           |
| ----------------------------------- | --------------- | ---------------: | ----------------: | ------------------------------------------------------ |
| `AuthService.login`                 | LOW, exact      |                3 |                 3 | 1 process (`login`); Auth                              |
| `AuthService.refresh`               | LOW, exact      |                3 |                 3 | 1 process (`refresh`); Auth                            |
| `AuthService.resolveCurrentSession` | LOW, exact      |                1 |                 1 | 0 processes/modules                                    |
| `AuthService.issueSession`          | **HIGH**, exact |                8 |                 3 | 3 processes (`login`, `refresh`, `smokeSession`); Auth |
| `isSessionDeviceEligible`           | LOW, exact      |               10 |                 4 | 1 process (`refresh`); Auth                            |

The HIGH finding was reported before proceeding. `issueSession` is shared by login, refresh, and smoke-session issuance; implementation must explicitly preserve non-cashier and smoke-session behavior and add focused regression coverage. No application symbols were edited during this proposal/TRD refinement.

### 2026-10-08 — Shared POS credential across eligible cashier users

The existing `browser-pos-webauthn-attestation` proposal was refined to make explicit that WebAuthn credentials identify the paired POS device, while each cashier authenticates with their own account credentials. Proposal-time upstream impacts with tests included:

```text
npm run proposal:impact -- --file src/modules/branches/branches.service.ts completeDeviceEnrollment
npm run proposal:impact -- --file src/modules/auth/auth.service.ts completeCashierLogin
```

| Symbol                                     | Risk       | Impacted symbols | Direct dependants | Affected processes / modules |
| ------------------------------------------ | ---------- | ---------------: | ----------------: | ---------------------------- |
| `BranchesService.completeDeviceEnrollment` | LOW, exact |                1 |                 1 | 0 processes; Branches        |
| `AuthService.completeCashierLogin`         | LOW, exact |                2 |                 1 | 0 processes; Auth            |

No HIGH/CRITICAL result. The proposal preserves Admin tenant-wide device management and Supervisor own-branch scope. The added requirement is that multiple branch-eligible CASHIER accounts may independently use the same device-scoped POS credential, with separate account authorization and sessions bound to that POS/credential; it does not permit syncing a POS credential across physical devices or weaken user/device/branch checks.

### 2026-10-08 — Local-only unpaired cashier workflow session

Proposal-time upstream impacts with tests included were run before adding the local-only development-session requirement:

```text
npm run proposal:impact -- --file src/modules/auth/auth.service.ts bootstrapSmokeSession
npm run proposal:impact -- --file src/modules/auth/auth.service.ts refresh
npm run proposal:impact -- --file src/common/auth/session.guard.ts loadAuthContext
npm run proposal:impact -- --file src/common/auth/session.guard.ts isSessionDeviceEligible
npm run proposal:impact -- --file src/modules/auth/auth.controller.ts AuthController
npm run proposal:impact -- --file apps/web/components/auth/login-form.tsx LoginForm
```

| Symbol                              | Risk       | Impacted symbols | Direct dependants | Affected processes / modules     |
| ----------------------------------- | ---------- | ---------------: | ----------------: | -------------------------------- |
| `AuthService.bootstrapSmokeSession` | LOW, exact |                1 |                 1 | 1 process (`smokeSession`); Auth |
| `AuthService.refresh`               | LOW, exact |                4 |                 4 | 1 process (`refresh`); Auth      |
| `loadAuthContext`                   | LOW, exact |                4 |                 3 | Auth                             |
| `isSessionDeviceEligible`           | LOW, exact |                7 |                 3 | 1 process (`refresh`); Auth      |
| `AuthController`                    | LOW, exact |                4 |                 2 | 0                                |
| `LoginForm`                         | LOW, exact |                1 |                 1 | 0                                |

No HIGH/CRITICAL result. Implementation is limited to a separate local-only smoke-session path and the exact session eligibility exception; the existing Earn/Redeem services, device-proof login, Preview configuration, and production qualification gate remain unchanged.

### 2026-10-09 — Supervisor customer directory table restyle

Follow-up upstream impact lookup for the updated directory toolbar, table, status filter, and pagination scope:

```text
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-customer-workflows.tsx CustomerDirectory
```

| Symbol              | Risk    | Impacted symbols | Direct dependants | Affected processes |
| ------------------- | ------- | ---------------: | ----------------: | -----------------: |
| `CustomerDirectory` | UNKNOWN |                0 |           unknown |            unknown |

GitNexus could not find `CustomerDirectory` in the then-current index, so the zero count was not a safe blast-radius estimate. A later index refresh found the symbol; see the follow-up entry below. Manual review also confirmed the refresh flow rejects smoke-session refresh and must continue to do so.

### 2026-10-09 — Customer directory card, purchase, earned totals, and sorting

The directory now needs authoritative list projections for card serial, latest approved purchase amount, and lifetime earned credits, plus numeric sorting. Upstream impacts were reviewed before implementation:

```text
node .gitnexus/run.cjs impact -r shopcity_LP -f apps/web/components/workflows/supervisor-customer-workflows.tsx CustomerDirectory
node .gitnexus/run.cjs impact -r shopcity_LP -f src/modules/customers/customers.service.ts toPrivilegedCustomerSummary
node .gitnexus/run.cjs impact -r shopcity_LP -u Method:src/modules/customers/customers.service.ts:CustomersService.listCustomers#4
node .gitnexus/run.cjs impact -r shopcity_LP -f src/modules/customers/customers.controller.ts listCustomers
```

| Symbol                              | Risk       | Impacted symbols | Direct dependants | Affected processes / modules         |
| ----------------------------------- | ---------- | ---------------: | ----------------: | ------------------------------------ |
| `CustomerDirectory`                 | LOW, exact |                3 |                 1 | 1 Supervisor page flow; Workflows    |
| `toPrivilegedCustomerSummary`       | LOW, exact |                2 |                 2 | 1 `listCustomers` process; Customers |
| `CustomersService.listCustomers#4`  | LOW, exact |                0 |                 0 | 0                                    |
| `CustomersController.listCustomers` | LOW, exact |                0 |                 0 | 0                                    |

The overloaded service symbol also has one integration-test caller on overload `#2` (LOW). No HIGH/CRITICAL result. The implementation adds tenant-scoped read-only projections to the existing list response; it does not change database schema, ledger writes, or card lifecycle.

### 2026-10-09 — Unify customer card number and last-purchase meaning

Upstream impacts were rerun before normalizing card aliases in the list/profile UI and adding a canonical `cardNumber` response field. The current customer projection reads `Card.barcodeValue`; the card API exposes the same value as `serialNumber`. The customer directory will display the canonical field, while accepting existing top-level and nested aliases for compatibility. Last purchase remains the latest captured-and-approved `Receipt.purchaseAmountKobo`, i.e. the full basket total.

```text
node .gitnexus/run.cjs impact -r shopcity_LP -f apps/web/components/workflows/supervisor-customer-workflows.tsx CustomerDirectory
node .gitnexus/run.cjs impact -r shopcity_LP -f src/modules/customers/customers.service.ts toPrivilegedCustomerSummary
node .gitnexus/run.cjs impact -r shopcity_LP -f apps/web/components/workflows/customer-details-dialog.tsx CustomerDetailsDialog
node .gitnexus/run.cjs impact -r shopcity_LP -f src/modules/customers/customers.controller.ts listCustomers
```

| Symbol                              | Risk       | Impacted symbols | Direct dependants | Affected processes / modules         |
| ----------------------------------- | ---------- | ---------------: | ----------------: | ------------------------------------ |
| `CustomerDirectory`                 | LOW, exact |                1 |                 1 | 1 Supervisor page flow; Workflows    |
| `toPrivilegedCustomerSummary`       | LOW, exact |                2 |                 2 | 1 `listCustomers` process; Customers |
| `CustomerDetailsDialog`             | LOW, exact |                2 |                 1 | 1 Supervisor profile flow; Workflows |
| `CustomersController.listCustomers` | LOW, exact |                0 |                 0 | 0                                    |

No HIGH/CRITICAL result. No database schema, ledger writes, or card-lifecycle changes are in scope.

### 2026-10-09 — Reference-led Supervisor customer profile and activity

Proposal-time upstream impacts were run before extending the customer profile design with API-backed activity, card, and credit-expiry surfaces. The branch was `workflow-states-implementation`; the repository already contained the directory/profile work and unrelated dirty changes, all of which must be preserved.

```text
node .gitnexus/run.cjs impact SupervisorCustomerProfile -r shopcity_LP -f apps/web/components/workflows/supervisor-customer-workflows.tsx --include-tests
node .gitnexus/run.cjs impact CustomerDetailsDialog -r shopcity_LP -f apps/web/components/workflows/customer-details-dialog.tsx --include-tests
node .gitnexus/run.cjs impact CustomersService -r shopcity_LP -f src/modules/customers/customers.service.ts --include-tests
node .gitnexus/run.cjs impact CustomersController -r shopcity_LP -f src/modules/customers/customers.controller.ts --include-tests
node .gitnexus/run.cjs impact listCustomerLedger -r shopcity_LP -f src/modules/loyalty/loyalty.service.ts --include-tests
```

| Symbol                              | Risk          | Impacted symbols | Direct dependants | Affected processes / modules                              |
| ----------------------------------- | ------------- | ---------------: | ----------------: | --------------------------------------------------------- |
| `SupervisorCustomerProfile`         | LOW, exact    |                2 |                 2 | 0 processes; two profile component test files             |
| `CustomerDetailsDialog`             | LOW, exact    |                4 |                 1 | `SupervisorCustomerProfilePage` process; Workflows module |
| `CustomersService`                  | MEDIUM, exact |                7 |                 5 | 0 processes or modules                                    |
| `CustomersController`               | LOW, exact    |                3 |                 1 | 0 processes or modules                                    |
| `LoyaltyService.listCustomerLedger` | LOW, exact    |                4 |                 4 | 0 processes; Pagination module                            |

No HIGH/CRITICAL risk. `CustomersService` is the broadest seam, so any addition remains a tenant/customer-scoped read projection. No schema, ledger, or card-lifecycle writes are authorized; purchase and redemption controls must hand off to existing protected workflows. SVG examples are visual references only.

### 2026-10-09 — Unify typography across Supervisor dashboard pages

Proposal-time upstream impacts were run before the Supervisor-scoped typography extension. The branch is `workflow-states-implementation`, four commits ahead of origin, with pre-existing modified and untracked work that must be preserved.

```text
npm run proposal:impact -- --file apps/web/components/app-shell.tsx AppShellContent
npm run proposal:impact -- --file apps/web/components/ui/button.tsx Button
```

| Symbol            | Risk                                  | Impacted symbols | Direct dependants | Affected processes / modules                                |
| ----------------- | ------------------------------------- | ---------------: | ----------------: | ----------------------------------------------------------- |
| `AppShellContent` | LOW, exact                            |                3 |                 1 | 1 `ShellLayout` process; Components                         |
| `Button`          | AMBIGUOUS; maximum candidate CRITICAL |               80 |                35 | No unique authoritative candidate from the ambiguous lookup |

The UI-only migration is scoped to Supervisor page roots and does not edit `AppShellContent` or `Button`; shared button/sidebar colors and Admin/Cashier defaults are preserved.

### 2026-10-10 — Style the customer-profile Transactions tab

Proposal-time upstream impact was run before updating the Transactions tab presentation. The branch is `workflow-states-implementation`; preserve all pre-existing dirty and untracked work, including the supplied reference SVG.

```text
npm run proposal:impact -- --file apps/web/components/workflows/customer-details-dialog.tsx CustomerDetailsDialog
```

| Symbol                  | Risk       | Impacted symbols | Direct dependants | Affected processes / modules                      |
| ----------------------- | ---------- | ---------------: | ----------------: | ------------------------------------------------- |
| `CustomerDetailsDialog` | LOW, exact |                5 |                 1 | 1 `SupervisorCustomerProfilePage` flow; Workflows |

The planned change is read-only UI rendering and scoped CSS. No API, tenant scope, ledger, receipt, or card-lifecycle writes are in scope. Keep column headings visible in an empty result by rendering the empty message in a full-width table row. The current projection does not provide a receipt number or transaction-level credit amount; the UI must show **Not provided** rather than reveal the internal receipt ID or infer credit.

### 2026-10-11 — Restyle Supervisor approvals queue

Proposal-time upstream impact was run before the Supervisor-only approvals redesign. The shared `ApprovalsPanel` currently has three direct dependants; visual changes will be gated by an explicit variant so Admin remains unchanged.

```text
npm run proposal:impact -- --file apps/web/components/workflows/approvals-panel.tsx ApprovalsPanel
```

| Symbol           | Risk       | Impacted symbols | Direct dependants | Affected processes / modules |
| ---------------- | ---------- | ---------------: | ----------------: | ---------------------------- |
| `ApprovalsPanel` | LOW, exact |                3 |                 3 | 0 processes / modules        |

No API, tenant scope, decision policy, ledger, or schema changes are planned. The API exposes EARN/REDEEM and `reasonCode`, but not the four requested approval categories or per-category counts; category tabs must not invent data and their constraints should be explicit in the UI/spec.

### 2026-10-11 — Update Supervisor approvals selected-item state

Follow-up upstream impact for the updated selected-item interaction and details presentation:

```text
npm run proposal:impact -- --file apps/web/components/workflows/approvals-panel.tsx ApprovalsPanel
```

| Symbol           | Risk       | Impacted symbols | Direct dependants | Affected processes / modules |
| ---------------- | ---------- | ---------------: | ----------------: | ---------------------------- |
| `ApprovalsPanel` | LOW, exact |                2 |                 2 | 0 processes / modules        |

The list response contains UUID, amount, requested/decision timestamps, nullable customer name/ID, nullable requester username/role, and a policy `reasonCode`. It omits wallet balance, lifetime earned, and submitter-entered reason text. Preserve these as “Not provided”; do not treat `reasonCode` as free-text. No backend changes are authorized by this UI update.

### 2026-10-12 — Cashier customer search, recent directory, and profile actions

Proposal-time impact was run before expanding the Cashier Find Customer flow. The branch contains unrelated dirty work that must remain untouched.

```text
npm run proposal:impact -- --file openspec/changes/align-cashier-layouts-to-prototype/proposal.md FindCustomerView
node .gitnexus/run.cjs impact --uid 'Function:src/modules/customers/customers.service.ts:customerSearchWhere' --direction upstream -r shopcity_LP
node .gitnexus/run.cjs impact CashierCustomersPage --direction upstream -r shopcity_LP
npm run proposal:impact -- --file openspec/changes/align-cashier-layouts-to-prototype/proposal.md matchShellRoute
node .gitnexus/run.cjs impact matchShellRoute --direction upstream -r shopcity_LP
```

| Symbol                              | Risk        | Impacted symbols | Direct dependants | Affected processes / modules                      |
| ----------------------------------- | ----------- | ---------------: | ----------------: | ------------------------------------------------- |
| `FindCustomerView`                  | HIGH, exact |                4 |                 1 | 3 Cashier lookup/Earn/Redeem processes; Workflows |
| `customerSearchWhere`               | LOW, exact  |                1 |                 1 | 1 `listCustomers` process; Customers              |
| `CashierCustomersPage`              | LOW, exact  |                0 |                 0 | No upstream processes or modules                  |
| `useCashierLookupController.lookup` | HIGH, exact |                5 |                 1 | Cashier lookup/Earn/Redeem processes; 2 modules   |
| `matchShellRoute`                   | LOW, exact  |                8 |                 4 | 2 shell navigation/access processes; Components   |

Keep all table/search/profile UI changes gated to the Lookup/Cashier route. Do not alter the shared lookup controller or Earn/Redeem behavior. Name/phone directory results use the existing tenant-authorized, cashier-minimized customer projection; local phone input normalization must not reveal unmasked phone numbers. Profile workflow links still require exact card verification before financial actions. The existing `/cashier/customers` profile path was not recognized by the Cashier shell route guard; add it as a route alias of Find Customer without exposing another sidebar item. Regression-test Cashier access plus unchanged Admin/Supervisor route guards.

### 2026-10-13 — Refine Cashier Find Customer presentation

```text
node .gitnexus/run.cjs impact FindCustomerView --direction upstream --repo shopcity_LP
node .gitnexus/run.cjs impact CashierOverviewLookup --direction upstream --repo shopcity_LP
```

| Symbol                  | Risk       | Impacted symbols | Direct dependants | Affected processes / modules |
| ----------------------- | ---------- | ---------------: | ----------------: | ---------------------------- |
| `FindCustomerView`      | LOW, exact |                4 |                 1 | No indexed processes         |
| `CashierOverviewLookup` | LOW, exact |                0 |                 0 | No indexed processes         |

The index was stale at commit `ff5c515`; impact queries remained available, but reanalysis failed because the local `file_fts` index was inconsistent. This is a presentation-only refinement scoped to Find Customer; the overview and cashier verification/financial workflows remain unchanged. The follow-up color-codes active/positive states green, pending amber, inactive/negative red, and zero or unavailable values neutral; no API or business logic changes.

### 2026-10-13 — Cashier profile presentation parity (cashier-safe)

```text
npm run proposal:impact -- --file apps/web/components/workflows/customer-details-dialog.tsx CustomerDetailsDialog
node .gitnexus/run.cjs impact --uid 'Function:apps/web/components/workflows/customer-details-dialog.tsx:CustomerDetailsDialog' --direction upstream --repo shopcity_LP
node .gitnexus/run.cjs impact --uid 'Function:apps/web/components/workflows/supervisor-customer-workflows.tsx:ManageCustomers' --direction upstream --repo shopcity_LP
node .gitnexus/run.cjs impact --uid 'Function:apps/web/components/workflows/customer-details-dialog.tsx:ExpirySchedule' --direction upstream --repo shopcity_LP
node .gitnexus/run.cjs impact --file 'apps/web/app/(shell)/cashier/customers/page.tsx' --kind Function --direction upstream --repo shopcity_LP page
```

| Symbol                  | Risk       | Impacted symbols | Direct dependants | Notes                                                                 |
| ----------------------- | ---------- | ---------------: | ----------------: | --------------------------------------------------------------------- |
| `CustomerDetailsDialog` | LOW, exact |                2 |                 1 | Direct caller `ManageCustomers`; indirect `SupervisorCustomerProfile` |
| `ManageCustomers`       | LOW, exact |                1 |                 1 | Direct caller `SupervisorCustomerProfile`                             |
| `ExpirySchedule`        | LOW, exact |                3 |                 1 | Call chain remains within customer profile                            |
| Cashier `page`          | UNKNOWN    |                0 |                 0 | Target not found in stale index                                       |

The index is stale at `ff5c515` and its reanalysis previously failed because the local FTS index was inconsistent. The Cashier replica will use only cashier-authorized customer summary and ledger APIs; it will not call or broaden access to the Supervisor/Admin profile-projection endpoint. Phone stays masked; profile editing, status changes, and card management remain Supervisor-only. Implementation verification reported LOW risk from `detect_changes` for the combined dirty tree; targeted source lint, typecheck, Jest, Playwright, build, Semgrep, OpenSpec, formatting, and diff checks passed.

### 2026-10-13 — Cashier profile recent transactions

```text
node .gitnexus/run.cjs impact listCashierToday --file src/modules/reports/reports.controller.ts --kind Method --direction upstream --repo shopcity_LP
node .gitnexus/run.cjs impact listCashierToday --file src/modules/reports/reports.service.ts --kind Method --direction upstream --repo shopcity_LP
node .gitnexus/run.cjs impact --uid 'Function:apps/web/components/workflows/customer-details-dialog.tsx:ProfileTransactions' --direction upstream --repo shopcity_LP
```

`listCashierToday` controller and service impact was LOW; the service has one direct controller caller. `ProfileTransactions` impact was LOW with one direct caller inside the shared profile. The existing cashier/tenant/branch/cashier scope remains enforced; the optional stable customer filter only narrows the existing read and caps the profile request at three rows. The generated client was regenerated from the updated OpenAPI contract.

### 2026-10-13 — Cashier profile metric, card, tab, and ledger refinement

`CustomerDetailsDialog` and `ProfileWalletLedger` both reported LOW exact impact within the shared profile chain. The wallet-ledger diagnosis found the frontend request was correct but the controller role guard excluded Cashiers; adding Cashier to the existing branch-scoped ledger read fixes the authorization mismatch without changing ledger writes or query scope. Cashier presentation now uses Last purchase amount, Total monthly Earn (the confirmed EARN/CREDIT ledger sum for the branch-local month), and Last amount redeemed; omits the Cashier Redemptions tab because Wallet Ledger captures both earn and redemption entries; omits Consent, duplicate transaction outcome badges, missing member/status fallback copy, and extra virtual-card explanation; and reuses the Supervisor card image with the verified card number rendered on it and only status shown outside it. The profile typography remains shared, while the virtual-card customer/card-number text is larger. Cashier Overview now maps the authorized activity rows into Recent activity, derives the latest purchase/redeem values from those rows, requests up to ten rows while displaying only three in Transactions, and omits the credit-expiry card. The cashier-safe customer summary now returns a card number, masked email, and explicit birthday-month field; Cashier Customer details omits Registered, Transactions, and Redemptions rows.

### 2026-10-13 — Local cashier test-session one-hour lifetime

Proposal-time impact was run before updating the active POS WebAuthn specification and session implementation:

```text
npm run proposal:impact -- --file src/modules/auth/auth.service.ts createLocalCashierTestSession
npm run proposal:impact -- --file src/modules/auth/auth.service.ts issueSession
npm run proposal:impact -- --file apps/web/components/auth/login-form.tsx LoginForm
node .gitnexus/run.cjs impact --repo shopcity_LP --file src/modules/auth/auth.service.ts --kind Method createLocalCashierTestSession --direction upstream --depth 3 --include-tests
node .gitnexus/run.cjs impact issueSession --repo shopcity_LP --direction upstream --depth 3 --include-tests
```

| Symbol                                                                                                                                                                                                                                                                                                                                                               | Risk          | Impacted symbols | Direct dependants | Affected processes / modules                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------: | ----------------: | ------------------------------------------------ |
| `AuthService.createLocalCashierTestSession`                                                                                                                                                                                                                                                                                                                          | LOW, exact    |                4 |                 2 | Auth; caller, service spec, and controller tests |
| `AuthService.issueSession`                                                                                                                                                                                                                                                                                                                                           | MEDIUM, exact |               15 |                 5 | `smokeSession` and `refresh`; Auth               |
| `LoginForm`                                                                                                                                                                                                                                                                                                                                                          | LOW, exact    |                2 |                 2 | `LoginPage`; Shopcity                            |
| The issueSession blast radius is controlled by keeping its 15-minute default cap for all smoke sessions except the already-gated `auth.local_cashier_test_session` action. The public smoke-bootstrap session remains capped at 15 minutes; ordinary session expiry, refresh behavior, local-only eligibility/origin gates, and non-refreshability remain unchanged. |

### 2026-10-13 — Cashier verified-card lookup and progress presentation

Proposal-time GitNexus impact was run before refining the active Cashier layout specification:

```text
npm run proposal:impact -- --file apps/web/components/workflows/cashier-transaction-route.tsx CashierWorkflowRoute
npm run proposal:impact -- --file apps/web/components/workflows/verified-card-lookup-step.tsx VerifiedCardLookupStep
node .gitnexus/run.cjs impact CashierWorkflowRoute --file apps/web/components/workflows/cashier-transaction-route.tsx --direction upstream --repo shopcity_LP --include-tests
node .gitnexus/run.cjs impact VerifiedCardLookupStep --file apps/web/components/workflows/verified-card-lookup-step.tsx --direction upstream --repo shopcity_LP --include-tests
```

| Symbol                   | Risk        | Impacted symbols | Direct dependants | Affected processes           |
| ------------------------ | ----------- | ---------------: | ----------------: | ---------------------------- |
| `CashierWorkflowRoute`   | HIGH, exact |                4 |                 4 | Cashier Lookup, Earn, Redeem |
| `VerifiedCardLookupStep` | HIGH, exact |                5 |                 1 | Cashier Lookup, Earn, Redeem |

The change is confined to shared lookup messaging/placeholder, the Capture Purchase search icon/gradient, and Cashier stepper CSS; lookup state, protected card verification, financial logic, and API behavior remain unchanged.

### 2026-10-13 — Apply Supervisor Cards styling to Fraud

| Symbol                    | Risk | Impacted | Direct | Processes | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------- | ---: | -------: | -----: | --------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FraudFlagsPanel`         |  LOW |        2 |      2 |         2 | Shared by Admin and Supervisor fraud routes; keep behavior intact, scope visual rules beneath `.supervisor-page`, align action-button dimensions and copy (`Refresh flags`, `Review case`), and scope Cards-style accessible filter popovers to Supervisor while retaining Admin native selects; keep option values in the menus and use filter names on closed triggers; remove the Supervisor branch filter while retaining Admin's branch query, and keep Supervisor filter/refresh controls compact. |
| `SupervisorCardWorkflows` |  LOW |        1 |      1 |         1 | Cards route is the visual reference only; do not change its workflows or styles.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `SupervisorFraudPage`     |  LOW |        0 |      0 |         0 | Route receives an explicit Supervisor presentation prop; no upstream callers.                                                                                                                                                                                                                                                                                                                                                                                                                            |

```text
npm run proposal:impact -- --file apps/web/components/workflows/fraud-flags-panel.tsx FraudFlagsPanel
gitnexus impact SupervisorCardWorkflows --direction upstream --repo shopcity_LP --file apps/web/components/workflows/supervisor-card-workflows.tsx
gitnexus impact SupervisorFraudPage --direction upstream --repo shopcity_LP --file 'apps/web/app/(shell)/supervisor/fraud/page.tsx'
```

Both component results are LOW. No HIGH/CRITICAL risk was reported. The title-based target for the contract-flow browser test is not indexed (UNKNOWN, impactedCount 0); the test is updated to assert the revised narrow-screen layout and Cards-style menu geometry. Admin fraud presentation, fraud API behavior, and case decisions remain unchanged; refresh and review labels match their visible and accessible names; the filter-menu implementation is Supervisor-only and preserves Admin native selects.

### 2026-10-13 — Separate and pace SMS delivery-report polling

| Symbol                                    | Risk | Impacted | Direct | Processes | Notes                                                                                                                |
| ----------------------------------------- | ---: | -------: | -----: | --------: | -------------------------------------------------------------------------------------------------------------------- |
| `OutboxWorkerRuntime.pollDeliveryReports` |  LOW |        5 |      1 |         1 | Called by the recovery cycle; move DLR polling to a separate paced timer and make persisted due-time selection fair. |
| `OutboxWorkerRuntime.runRecoveryCycle`    |  LOW |        6 |      2 |         1 | Keep outbox recovery independent from slow provider report lookups.                                                  |
| `OutboxWorkerRuntime.start`               |  LOW |        4 |      2 |         1 | Start the DLR schedule without delaying worker readiness.                                                            |
| `OutboxWorkerRuntime.stop`                |  LOW |        6 |      2 |         1 | Clear the DLR timer and await any active DLR batch before shutdown.                                                  |
| `loadWorkerConfig`                        |  LOW |        6 |      3 |         1 | Add validated polling interval and bounded batch configuration.                                                      |
| `envValidationSchema`                     |  LOW |        0 |      0 |         0 | Configuration schema has no indexed upstream dependants.                                                             |

```text
node .gitnexus/run.cjs impact -r shopcity_LP --uid 'Method:src/jobs/outbox-worker.runtime.ts:OutboxWorkerRuntime.pollDeliveryReports#0' --direction upstream --include-tests
node .gitnexus/run.cjs impact -r shopcity_LP --uid 'Method:src/jobs/outbox-worker.runtime.ts:OutboxWorkerRuntime.runRecoveryCycle#0' --direction upstream --include-tests --summary-only
node .gitnexus/run.cjs impact -r shopcity_LP --uid 'Method:src/jobs/outbox-worker.runtime.ts:OutboxWorkerRuntime.start#0' --direction upstream --include-tests --summary-only
node .gitnexus/run.cjs impact -r shopcity_LP --uid 'Method:src/jobs/outbox-worker.runtime.ts:OutboxWorkerRuntime.stop#0' --direction upstream --include-tests --summary-only
node .gitnexus/run.cjs impact -r shopcity_LP --uid 'Function:src/jobs/outbox-worker.runtime.ts:loadWorkerConfig' --direction upstream --include-tests --summary-only
node .gitnexus/run.cjs impact -r shopcity_LP --uid 'Const:src/config/env.validation.ts:envValidationSchema' --direction upstream --include-tests --summary-only
```

All symbol-level results are LOW; no HIGH/CRITICAL risk was reported. `SmsMessage` is a Prisma schema model not indexed as a GitNexus symbol; its schema and query consumers are reviewed directly. No real provider request or shared-database migration is authorized by this code change.

### 2026-10-14 — Add Arkesel V2 sandbox provider

| Symbol                |                Risk | Impacted | Direct | Processes | Notes                                                                                                                                          |
| --------------------- | ------------------: | -------: | -----: | --------: | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `createSmsProvider`   |          LOW, exact |        6 |      3 |         1 | Worker bootstrap selects the provider; preserve the default eBulkSMS path and fake-provider production guard.                                  |
| `envValidationSchema` |          LOW, exact |        0 |      0 |         0 | Schema constant has no indexed upstream dependants; validate its new vendor-specific settings with config tests.                               |
| `SmsProvider`         | MEDIUM, lower-bound |       21 |     10 |         1 | Interface has multiple implementations and dynamic dispatch is not fully traced; leave the interface unchanged and add an implementation only. |

```text
npm run proposal:impact -- --file src/jobs/sms.provider.factory.ts createSmsProvider
npm run proposal:impact -- --file src/config/env.validation.ts envValidationSchema
npm run proposal:impact -- --file src/jobs/sms.provider.ts SmsProvider
```

No HIGH/CRITICAL risk was reported. The interface result is MEDIUM because its consumers and implementations are lower-bound; implementation will not alter its contract. The relevant worker flow is provider bootstrap → outbox send and delivery-report polling.

### 2026-10-14 — Diagnose Arkesel V2 validation response

| Symbol                    |               Risk | Impacted | Direct | Processes | Notes                                                                                                                                                                       |
| ------------------------- | -----------------: | -------: | -----: | --------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ArkeselSmsProvider.send` | UNKNOWN, unindexed |        0 |      0 |         0 | The adapter was added after the indexed commit; preserve the `SmsProvider` contract and limit this correction to the Arkesel recipient request shape plus its focused test. |

```text
npm run proposal:impact -- --file src/jobs/sms.provider.ts ArkeselSmsProvider.send
node .gitnexus/run.cjs impact -r shopcity_LP -f src/jobs/sms.provider.ts --kind Method ArkeselSmsProvider.send --direction upstream --include-tests --summary-only
```

The UNKNOWN result reflects an absent graph symbol, not proof of no runtime usage. Factory selection and worker dispatch were inspected directly; no provider interface, worker, or business-event changes are planned.

### 2026-10-14 — Add Africa's Talking SMS provider

| Symbol                |                Risk | Impacted | Direct | Processes | Notes                                                                                                                                                |
| --------------------- | ------------------: | -------: | -----: | --------: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createSmsProvider`   |          LOW, exact |        6 |      3 |         1 | Factory selection feeds worker bootstrap; keep eBulkSMS as the default and gate the new provider on explicit vendor selection and valid credentials. |
| `envValidationSchema` |          LOW, exact |        0 |      0 |         0 | Joi schema is not represented as an upstream symbol in the graph; cover vendor-specific settings and sandbox safety with config tests.               |
| `SmsProvider`         | MEDIUM, lower-bound |       21 |     10 |         1 | Existing abstraction has multiple implementations and dynamic dispatch is not fully traced; do not modify the interface.                             |

```text
node .gitnexus/run.cjs impact -r shopcity_LP -f src/jobs/sms.provider.factory.ts --kind Function createSmsProvider --direction upstream --include-tests --summary-only
node .gitnexus/run.cjs impact -r shopcity_LP -f src/config/env.validation.ts envValidationSchema --direction upstream --include-tests --summary-only
node .gitnexus/run.cjs impact -r shopcity_LP -f src/jobs/sms.provider.ts --kind Interface SmsProvider --direction upstream --include-tests --summary-only
```

No HIGH/CRITICAL risk was reported. The new provider class is not indexed yet; implementation will preserve `SmsProvider` and worker contracts. Africa's Talking DLRs arrive by callback, while the current worker only polls; this proposal scopes the adapter to truthful `SENT` acceptance and defers callback ingestion rather than adding an unauthenticated delivery-state mutation path.

### 2026-10-14 — Add Twilio Programmable Messaging provider

| Symbol                |                Risk | Impacted | Direct | Processes | Notes                                                                                                                                       |
| --------------------- | ------------------: | -------: | -----: | --------: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `createSmsProvider`   |          LOW, exact |        6 |      3 |         1 | Worker bootstrap selects the provider; preserve eBulkSMS as the default and require explicit Twilio selection with complete credentials.    |
| `envValidationSchema` |          LOW, exact |        0 |      0 |         0 | Schema constant has no indexed upstream dependants; cover sender XOR, credential validation, and production behavior with config tests.     |
| `OutboxWorkerRuntime` |       MEDIUM, exact |        8 |      6 |         1 | Provider dispatch participates in worker bootstrap; add a local pre-send reservation for Twilio where provider idempotency is undocumented. |
| `SmsProvider`         | MEDIUM, lower-bound |       21 |     10 |         1 | Add only an optional send-safety capability; preserve the `send` contract and existing provider implementations.                            |

```text
npm run proposal:impact -- --file src/jobs/sms.provider.factory.ts createSmsProvider
npm run proposal:impact -- --file src/config/env.validation.ts envValidationSchema
npm run proposal:impact -- --file src/jobs/outbox-worker.runtime.ts OutboxWorkerRuntime.handleJob
npm run proposal:impact -- --file src/jobs/outbox-worker.runtime.ts OutboxWorkerRuntime
npm run proposal:impact -- --file src/jobs/sms.provider.ts SmsProvider
```

`OutboxWorkerRuntime.handleJob` was not resolved as a standalone target; class impact is MEDIUM/exact. The interface risk is MEDIUM/lower-bound because dynamic dispatch may hide consumers. No HIGH/CRITICAL risk was reported. Twilio does not document idempotency for Messages creation, so the implementation will reserve each local outbox event before submission, stop on stale/ambiguous reservations, retry only explicit HTTP 429 rejections, and require provider-history review before manual replay.

### 2026-10-15 — Simplify pilot POS device authentication

| Symbol                         |       Risk | Impacted | Direct | Processes | Notes                                                                                                                                                        |
| ------------------------------ | ---------: | -------: | -----: | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AuthService.login`            | LOW, exact |        4 |      4 |         0 | Direct callers are the auth controller plus focused/integration tests. Add DEVICE_TOKEN as an exclusive branch; preserve HMAC/WebAuthn fail-closed behavior. |
| `BranchesService.updateDevice` | LOW, exact |        3 |      3 |         0 | Direct callers are controller and device provisioning tests. Pair/reset/deactivation must preserve branch authorization and revoke sessions atomically.      |
| `AuthController.login`         | LOW, exact |        1 |      1 |         0 | Auth service test is direct dependant; cookie transport contract and generated OpenAPI/client require additional endpoint/browser verification.              |

```text
npm run proposal:impact -- --file src/modules/auth/auth.service.ts login
npm run proposal:impact -- --file src/modules/branches/branches.service.ts updateDevice
npm run proposal:impact -- --file src/modules/auth/auth.controller.ts login
```

The equivalent direct GitNexus impacts resolved exactly with the counts above. No HIGH/CRITICAL impact was reported. This is a security-critical authentication and session change despite LOW graph counts; validate exclusive device modes, cookie/CSRF behavior, immediate revocation under concurrent login/refresh, and authoritative session.deviceId attribution. `AuthService.login` has four direct callers; the controller login method is tested directly. Do not downgrade existing HMAC_LEGACY or WEBAUTHN devices.

Supplemental upstream impact analysis before editing additional existing symbols:

| Symbol                                   |       Risk | Impacted | Direct | Processes | Notes                                                                                                                           |
| ---------------------------------------- | ---------: | -------: | -----: | --------: | ------------------------------------------------------------------------------------------------------------------------------- |
| `AuthService.refresh`                    | LOW, exact |        4 |      4 |         1 | Preserve credential cookie independently of ShopCity session rotation; revalidate active DEVICE_TOKEN credential/device/branch. |
| `BranchesService.revokeDeviceCredential` | LOW, exact |        3 |      3 |         0 | Extend device reset/revoke flow with transactionally revoked sessions and non-enumerating scope.                                |
| `DeviceManagement`                       | LOW, exact |        3 |      3 |         2 | Minimal UI changes affect Admin and Supervisor device management routes.                                                        |

```text
node scripts/gitnexus.cjs impact -r shopcity_LP --file src/modules/auth/auth.service.ts refresh --summary-only --include-tests
node scripts/gitnexus.cjs impact -r shopcity_LP --file src/modules/branches/branches.service.ts revokeDeviceCredential --summary-only --include-tests
node scripts/gitnexus.cjs impact -r shopcity_LP --file apps/web/components/devices/device-management.tsx DeviceManagement --summary-only --include-tests
```

All supplemental results are LOW/exact; no HIGH/CRITICAL result was reported. New endpoint/helper symbols are not indexed yet. Existing `loadAuthContext` and `CsrfGuard` scope will be kept unchanged except for adding a public-login Origin gate; endpoint-level and focused tests will cover that change. The working tree was already dirty; generated outputs and all unrelated changes remain preserved.

### 2026-10-16 — Close POS lifecycle, fraud pagination, and SMS tracking findings

| Symbol                              |       Risk | Impacted | Direct | Processes | Notes                                                                                                                                                         |
| ----------------------------------- | ---------: | -------: | -----: | --------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DeviceManagement.createDevice`     | LOW, exact |        3 |      1 |         2 | Same-payload retries reuse the server-supported idempotency key; successful/new payload operations get fresh keys.                                            |
| `DeviceManagement.updateDevice`     | LOW, exact |        3 |      1 |         2 | Same target/payload retry identity is retained across uncertain outcomes; the existing device idempotency service remains unchanged.                          |
| `SupervisorFlaggedActivity.refresh` | LOW, exact |        5 |      2 |         2 | Shared component feeds Admin/Supervisor flows in the graph; implementation stays in the Supervisor presentation and preserves scope-level summaries.          |
| `mapArkeselSmsResponse`             | LOW, exact |        1 |      1 |         0 | Arkesel acceptance without a matching non-empty ID is terminal/uncertain; Africa's Talking `SENT` behavior without an ID and no DLR polling remain unchanged. |

```text
npm run proposal:impact -- --file apps/web/components/devices/device-management.tsx createDevice
npm run proposal:impact -- --file apps/web/components/devices/device-management.tsx updateDevice
npm run proposal:impact -- --file apps/web/components/workflows/supervisor-flagged-activity.tsx refresh
npm run proposal:impact -- --file src/jobs/sms.provider.ts mapArkeselSmsResponse
```

No HIGH/CRITICAL result was reported. The POS cookie/lifecycle changes remain scoped to DEVICE_TOKEN; fraud status/severity/branch filters use the existing scoped API and cursor pagination; Arkesel's uncertain accepted send is not automatically retried. Existing unrelated dirty/untracked checkout content is preserved.
