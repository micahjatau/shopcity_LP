# 03 — Components & Patterns

## 1. Component levels

### Accessible primitives

Own the source even when initialized from shadcn/Radix.

`Button`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`, `Select`, `Combobox`, `Dialog`, `Sheet`, `Popover`, `DropdownMenu`, `Tooltip`, `Tabs`, `Accordion`, `Badge`, `Progress`, `Skeleton`, `Separator`, `Alert`, `Toast`, `Table`, `Pagination`.

### ShopCity components

`Money`, `MoneyInput`, `StatusBadge`, `TransactionStateBadge`, `ApprovalBadge`, `FraudSeverityBadge`, `SmsStatusBadge`, `LoyaltyBalance`, `ExpiringCreditNotice`, `CustomerIdentity`, `CardIdentity`, `ReceiptIdentity`, `BranchBadge`, `DeviceStatus`, `RoleBadge`, `MetricCard`, `FilterBar`, `DateRangeFilter`, `CursorPagination`, `DataTable`, `EmptyState`, `ErrorState`, `OfflineIndicator`, `SyncQueueIndicator`, `ConnectionStatus`, `PageHeader`, `DetailHeader`, `AuditTimeline`.

### Workflow components

`CustomerLookup`, `CardScannerLookup`, `EarnTransactionForm`, `EarnConfirmation`, `RedeemTransactionForm`, `RedemptionPreview`, `RedemptionConfirmation`, `PendingApprovalPanel`, `ApprovalDecisionPanel`, `OfflineEarnQueue`, `OfflineSyncResult`, `CardReplacementWizard`, `FraudReviewPanel`, `AdjustmentForm`, `ReversalDialog`, `ReportFilters`, `ReportTable`, `ExportAction`, `PilotHealthPanel`.

Feature code composes these rather than creating bespoke button/input/status implementations.

## 2. Public component API conventions

Use predictable props:

```tsx
<Button
  variant="primary"
  size="lg"
  loading={isPending}
  disabled={!isValid}
>
  Add credit
</Button>
```

Standard conventions:

- `variant` controls semantic appearance;
- `size` controls density/target size;
- `loading` preserves label/context and exposes busy state;
- `disabled` means unavailable, with an understandable reason where needed;
- forward refs for focusable primitives;
- use controlled inputs where validation/state coordination requires it;
- support `aria-label` only when a visible label is genuinely impossible;
- avoid domain props in primitives.

Do not add props such as `red`, `bigButton`, `spinning` or `noClick`.

## 3. Buttons

Variants:

- `primary`: ShopCity-red primary task;
- `secondary`: neutral outlined/soft;
- `ghost`: low-emphasis utility;
- `danger`: destructive semantic danger;
- `link`: inline navigation only.

Sizes: compact 36px, standard 44px, large POS 48–52px.

Only one visually dominant primary action per decision region.

Loading buttons maintain width, prevent repeated activation, retain action-aware wording and expose busy state.

## 4. Status language dictionary

Backend values should not leak directly when a clearer UX label exists.

| API/domain state | UI label | Semantic | Terminal? | Typical action |
|---|---|---|---|---|
| `CONFIRMED` | Confirmed | success | yes | View details |
| `PENDING_APPROVAL` | Awaiting approval | warning | no | View approval |
| `REJECTED` | Rejected | danger | yes | View reason |
| `RETRYABLE` | Retry required | warning | no | Retry sync |
| `CAPTURED` | Recorded | neutral/info | depends | View |
| Fraud `OPEN` | Needs review | warning | no | Review |
| Fraud `ACKNOWLEDGED` | Under review | info | no | Continue review |
| Fraud `RESOLVED` | Resolved | success | yes | View decision |
| SMS `QUEUED` | Queued | neutral | no | none |
| SMS `SENT` | Sent | info | no | none |
| SMS `DELIVERED` | Delivered | success | yes | none |
| SMS `FAILED` | Delivery failed | danger | maybe | Retry/inspect |
| SMS `SUPPRESSED` | Not sent | neutral | yes | Inspect reason |

Status components use text + icon + semantic color. New backend enums require an explicit mapping before frontend release.

## 5. Identity components

### CustomerIdentity

Shows customer name, masked phone, status, optional branch and a detail link where permitted.

### CardIdentity

Shows masked serial/last digits, status, assigned customer, and replacement/disable context when applicable.

### ReceiptIdentity

Shows POS receipt number, branch, occurred/captured date and purchase amount where useful.

Never use raw UUIDs as the main identity. UUIDs belong in expandable technical details or copy controls.

## 6. Money components

### `Money`

Input is integer kobo plus optional direction/emphasis. It owns locale-safe formatting, tabular numerals, semantic sign and accessible labeling.

### `MoneyInput`

It accepts user-friendly naira entry but emits integer kobo; handles paste/large amounts; uses explicit two-decimal precision when committed; and never relies on floating-point business arithmetic.

## 7. Tables and data density

Use semantic table markup; TanStack Table may manage sorting/filtering/pagination state.

Densities:

- `comfortable`: cashier/supervisor default, 52–56px rows;
- `compact`: admin/reporting, 40–44px rows.

Rules:

- currency/numbers right-aligned;
- dates consistently formatted;
- row actions rightmost;
- sticky headers only when useful;
- bulk selection only when a valid bulk operation exists;
- cursor pagination maps to backend cursor contracts;
- empty table gets an explanatory empty state;
- loading preserves structure where possible;
- prioritize/hide lower-value columns on narrower widths before forcing horizontal scroll;
- mobile detail may transform a row into stacked key/value cards.

Do not virtualize small lists by default. Add virtualization after measured need.

## 8. Filter bars

Recommended order:

1. primary search;
2. status/branch/domain filters;
3. date range;
4. clear/reset;
5. export/secondary action.

Report/admin filters can be URL-addressable when they contain no sensitive values. Avoid persisting sensitive customer search terms in URLs.

## 9. Pagination

Many backend lists use cursor pagination. `CursorPagination` must not pretend cursor pages have an authoritative total count.

Use `Load more` or Previous/Next according to API capability, preserve navigation state, and do not synthesize `Page 7 of 18` without count/page semantics from the backend.

## 10. Dashboard composition

Prioritize decisions.

### Level 1 — attention

- approvals awaiting review;
- open high-severity fraud;
- failed sync;
- unhealthy reconciliation/operations.

### Level 2 — current performance

- transactions/credit issued/redeemed;
- active liability;
- customer activity.

### Level 3 — trends

Charts and historical comparisons.

Avoid walls of KPI cards. Every primary card should answer an operational question or lead to action.

## 11. Data visualization

Preferred:

- line: time series;
- bar: discrete comparison;
- stacked bar: composition where totals matter;
- sparkline: compact trend support;
- KPI + trend: one important metric.

Avoid pie/donut unless a very small set of meaningful proportions genuinely benefits.

Rules:

- chart colors are semantic/data colors, not all ShopCity red;
- color never carries meaning alone;
- provide accessible text summary/table;
- tooltip is supplemental, not the only source of values;
- use full units/currency;
- preserve report/branch timezone context;
- lazy-load chart libraries on report/admin routes.

## 12. Empty states

Types:

- first-use;
- filtered-no-result;
- true zero activity;
- permission-limited;
- offline-unavailable.

Each explains what is absent, whether that is expected and the next action. Avoid whimsical illustrations on fraud, security or financial-exception screens.

## 13. Alerts and banners

`Alert` variants: info, success, warning, danger.

An alert contains semantic icon, concise title, useful body and optional action. Do not make a still-relevant condition dismissible merely for visual cleanliness.

System offline/reconciliation problems use persistent banners.

## 14. Dialogs and sheets

Use dialog for a discrete decision. Use sheet for supporting detail/inspection that benefits from retaining page context.

Financial/destructive dialogs must show target and amount, state the consequence, collect reason when supported, and avoid focusing a destructive action in a way that encourages accidental confirmation.

## 15. Audit timeline

Canonical timeline:

```text
10:42  Transaction captured
       Cashier · POS-02

10:43  Approval requested
       High-value transaction

10:47  Approved
       Supervisor · John Musa

10:47  Credit issued
       ₦12,500.00

10:48  SMS queued
```

Actor, branch and device are visible where available. Absolute timestamps are preferred in dispute/audit contexts.

## 16. Report workspace

`ReportWorkspace` composes page header, report context, branch/date/timezone filters, data freshness/materialization state, optional summary metrics, table/chart, CSV export and admin-only refresh control.

Never imply live data when a report has a materialization watermark.

## 17. Pilot health panel

Admin-only operational view maps backend pilot-operations summary into:

- release/version;
- outbox backlog/staleness;
- failed SMS;
- offline sync failures;
- open fraud count;
- report staleness;
- financial reconciliation health.

Use semantic health states and drill-through links where routes/endpoints support them.
