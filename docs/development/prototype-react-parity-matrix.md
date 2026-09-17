# Prototype → React parity matrix

This is the working migration inventory for `prototype-to-production-frontend-integration`.

Parity requires visual hierarchy, interaction flow, contract authority, operational behavior, and verification evidence. A matching screenshot alone is insufficient.

| Prototype reference                                     | Production route/component                                                | Existing authority                                                                      | Required parity work                                                                                                                                                                 | Evidence                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `apps/web/public/prototype/login-page.html`             | `/login`; `components/auth/login-form.tsx`                                | Auth/session bootstrap and role redirect                                                | Preserve focused sign-in hierarchy; replace prototype recovery/dead links with real contract or remove; verify logout/expiry behavior                                                | Auth unit tests, browser flow, a11y, visual snapshot              |
| `apps/web/public/prototype/overview-dashboard.html`     | `/cashier`; `cashier-overview-context.tsx`, `cashier-overview-lookup.tsx` | `cardsControllerLookupCardV1`, `reportsControllerListCashierTodayV1`, session bootstrap | Keep launcher-first layout and compact branch/device/sync context; label activity as recent/loaded; no fake health, notification, or pagination claims                               | Cashier route test, mobile/desktop snapshots, a11y                |
| `apps/web/public/prototype/find-customer.html`          | `/cashier/lookup`; `CashierWorkflowRoute` with `kind="lookup"`            | `cardsControllerLookupCardV1` and masked customer projection                            | Scanner/card serial is the financial entry point; directory search remains discovery-only; safe query-param hydration; preserve keyboard-wedge focus/Enter behavior                  | Lookup contract tests, Playwright, wrong-scope tests, visual/a11y |
| `apps/web/public/prototype/capture-purchase.html`       | `/cashier/earn`; `CashierWorkflowRoute` + `EarnTransactionForm`           | Card lookup, generated earn client, session/device context                              | Never derive serial from reduced customer search response; require verified card context; preserve integer-kobo, receipt, idempotency, pending, duplicate, offline, and error states | Earn unit/contract/integration/Playwright tests                   |
| `apps/web/public/prototype/redeem-credit.html`          | `/cashier/redeem`; `CashierWorkflowRoute` + `RedeemTransactionForm`       | Card lookup, generated redeem client, server balance/policy                             | Require verified card context; display server balance/policy; preserve approval, insufficient-balance, inactive-card, retry, and confirmed outcomes                                  | Redeem unit/contract/integration/Playwright tests                 |
| `apps/web/public/prototype/register-customer.html`      | Supervisor/Admin customer workspace                                       | TRD: Supervisor/Admin, full name, normalized phone, unused barcode, atomic creation     | Remove from Cashier; implement atomic customer + initial card workflow; do not collect birthday/consent/marketing fields absent from TRD                                             | RBAC/transaction/idempotency/integration tests                    |
| `apps/web/public/prototype/transactions-dashboard.html` | Existing transaction/report workspaces                                    | Bounded `cashier-today`, transaction detail, report contracts                           | Remove fake browser pagination and full-history implication; use recent/loaded language for MVP                                                                                      | Scope/timezone/visual/Playwright tests                            |
| `apps/web/public/prototype/workflow-states.html`        | No production route                                                       | Mixed Cashier/Supervisor/Admin diagnostic calls                                         | Retain only as developer/test harness if needed; split concepts into role-safe workspaces; never expose in shell navigation                                                          | Navigation role matrix and route guard tests                      |
| Shared prototype CSS/JS                                 | `apps/web/styles`, token/primitives/UI components                         | Existing CSS tokens and React UI primitives                                             | Extract only reusable visual language; do not copy inline-script behavior or create a second frontend                                                                                | Token drift, lint, visual snapshots                               |

## Authority rules

- Card/customer/balance/status/eligibility/policy/device identity comes from the backend or authenticated session bootstrap.
- Query parameters may seed a lookup input but cannot authorize a financial action.
- Directory customer search cannot unlock Earn or Redeem.
- Browser-local state may hold drafts and offline queue records, but cannot finalize financial effects.
- The TRD is authoritative for MVP scope: registration is Supervisor/Admin-only and atomic; registration fields are full name, normalized phone, and initial barcode; cashier activity remains bounded; policy mutation is Admin-owned.

## Required route states

Every migrated route must cover:

- loading
- empty
- validation failure
- unauthorized/forbidden
- offline/unavailable dependency
- stale or missing context
- duplicate/idempotency conflict
- pending approval where applicable
- confirmed success
- unexpected server error with request correlation
- session expiry/logout

## Responsive checkpoints

- Desktop: shell navigation is usable on one line and the primary task is visually dominant.
- Tablet: shell may use the compact rail; workflow controls remain reachable without horizontal scrolling.
- Mobile: navigation uses the accessible drawer; multi-column workflow sections collapse intentionally; scanner/input and primary action remain first-order controls.

## Completion rule

A row may be marked complete only when its React route, contract authority, role boundary, required states, and listed evidence all pass. Prototype screenshots or static HTML do not count as production evidence.
