# 06 — API → Screen → Component Mapping

The generated `docs/api/openapi.json` and Orval client are the frontend source of truth for available backend operations.

## Domain map

| Domain | Frontend surface | Main components |
|---|---|---|
| Session | Login and app bootstrap | `LoginForm`, `SessionProvider` |
| Customers | Search, registration and detail | `CustomerLookup`, `CustomerForm`, `CustomerDetail` |
| Cards | Lookup and card management | `CardScannerLookup`, `CardAssignmentForm`, `CardReplacementWizard` |
| Earn | Earn workflow | `EarnTransactionForm`, `EarnConfirmation` |
| Redeem | Redeem workflow | `RedeemTransactionForm`, `RedemptionConfirmation` |
| Approvals | Queue and detail | `ApprovalTable`, `ApprovalDecisionPanel` |
| Offline sync | Local queue and synchronization | `OfflineEarnQueue`, `OfflineSyncResult` |
| Operational review | Queue and detail | `ReviewTable`, `ReviewPanel` |
| Reports | Reports, exports and freshness | `ReportWorkspace`, `ExportAction` |
| Operations | Pilot health | `PilotHealthPanel` |

## Endpoint families already represented by the backend

- session/login/current-user operations;
- customer list/create/read/update/status operations;
- card lookup/assign/replace/status operations;
- earn and redeem transaction operations;
- approval list and decision operations;
- offline earn-batch synchronization;
- operational review list/detail/decision;
- executive, liability, customer, cashier, redemption, communication, audit and materialization reports;
- report CSV export and refresh;
- pilot operations summary.

The generated contract also includes related branch/master-data, configuration, adjustment, audit, receipt, communication and credit-expiry domains. Exact fields and role permissions are read from generated OpenAPI types rather than duplicated here.

## Integration checklist

For every generated operation used by UI:

1. identify authorized roles from the contract;
2. assign the route/screen;
3. define loading, empty, error and offline states;
4. map backend states to design-system language;
5. define cache and freshness behavior;
6. define safe submission/reconciliation behavior for mutations;
7. define result UI;
8. add Storybook fixtures;
9. add E2E coverage for critical workflows.

## Contract gaps

If a required screen cannot be supported by the current generated contract, document the gap and coordinate a deliberate backend/OpenAPI change before regenerating the frontend client. Frontend code must not become a second source of backend business rules.
