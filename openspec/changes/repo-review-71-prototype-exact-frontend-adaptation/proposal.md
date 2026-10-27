# Proposal: Adapt the production frontend to the prototype-owned render tree

## Why

The stable design/reference baseline is commit `410ecd75`, which contains the current UI implementation plus the committed `figmaExport` reference images. The production frontend has the required authenticated, RBAC-aware, API-backed behavior, but its components still let business-capable route components decide layout. That produces visual drift: the shell has extra geometry, cashier workflows expose implementation cards instead of the prototype flow, bounded activity is presented like a full history, and production state is represented by components the prototype does not contain.

This change adopts the review's central architecture exactly: **the prototype owns the render tree; the production application owns the state**. Existing trusted logic is extracted into controllers/hooks and exposed as boring view-models. React views then follow the prototype DOM, dimensions, spacing, responsive behavior, status slots, and visual states as literally as possible. No financial, session, authorization, offline, or API guarantees may be weakened for visual parity.

The change is based on `docs/repo_review_71.md` and must preserve its explicit contract corrections rather than reintroduce prototype-only data collection.

## What Changes

### 1. Shared operational shell

Make the production shell use the prototype render tree:

- `.app` uses a `244px minmax(0, 1fr)` desktop grid; the sidebar uses `28px 12px 22px` padding; the main uses `16px 24px 40px`; the topbar is `64px`, padded `0 16px`, with `16px` radius and `20px` gap.
- Preserve the prototype brand, role-allowed navigation, Help & Training footer item, Logout footer action, search field, System Online pill, bell button, and 34px session-initials avatar.
- Keep `SessionBootstrapProvider`, RBAC, logout, connection state, browser bootstrap, branch/device/session context, sync state, and mobile keyboard/focus behavior as invisible or behavior-only state unless the prototype provides a slot.
- Remove visible `AppTopbar` extras: `SyncQueueIndicator`, sign-out button, branch/timezone/route/device strip, disabled notification dot, and responsive wrapping that changes the reference geometry. Remove the sidebar collapse control; tablet collapse follows the breakpoint.
- Use the existing notice/toast/overlay slots for offline and exceptional state rather than adding shell geometry.

### 2. Prototype identity and visual tokens

- Carry every existing `data-od-id` unchanged into React, including `overview-app`, `overview-sidebar`, `activity-metrics`, `recent-transactions`, `capture-flow`, `redeem-flow`, `register-flow`, and `transaction-filters`.
- Make the approved prototype CSS values canonical through shared production tokens and primitives such as `.sc-operational-shell`, `.sc-sidebar`, `.sc-topbar`, `.sc-page-head`, `.sc-flow-steps`, `.sc-flow-panel`, `.sc-flow-actions`, `.sc-table-card`, and `.sc-status`.
- Use the approved canvas, surface, foreground, muted, border, accent, display-sans, and display-serif values from the review instead of independently converging inline styles or duplicated `<style>` blocks.
- Maintain an explicit approved visual-deviation registry. A deviation is allowed only for security, authorization, accessibility, truthful API contract, or approved product scope—not because an existing generic component is easier to reuse.

### 3. Cashier overview (`/cashier`)

Implement the prototype hierarchy: page head with `Hi, Cashier!`, welcome copy, Register Customer and Find Customer actions; Today's Activity label; a `role="status"` notice; four metrics; and the Recent Transactions table card with table search, result footer, and View all transactions link.

Preserve `reportsControllerListCashierTodayV1(...)` and its existing derived values (`loadedTransactions`, `earnTransactions`, `redeemTransactions`, `creditIssuedKobo`). Filter the bounded loaded feed locally by receipt number. Do not invent a new API. Restore the missing notice and table footer. Enforce the review geometry: 1120px content max width, 34px H1, 40px buttons, four 9px-gap metric columns, 132px metric minimum height, `20px 22px` metric padding, 24px metric bottom margin, 16px table radius, and 760px table minimum width.

### 4. Find customer (`/cashier/lookup`)

Replace the generic `CashierWorkflowRoute` rendering with a dedicated prototype-exact `FindCustomerView`. Preserve the one-input visual surface, Search and Scan actions, hint, notice, recent-customer card, customer rows, and exact empty state. Use the review geometry: 1080px content max width, 712px centered search/recent cards, `16px 24px 17px` search padding, `1fr 160px 160px` columns, 9px gap, 33px controls, 398px recent minimum height, `16px 23px` recent padding, and `14px 18px` rows with 13px radius.

Keep `ScannerContextScope`; let scanner events drive the prototype input. Treat directory lookup through `customersControllerListCustomersV1` as discovery only. Before financial context becomes `verified`, require authoritative `cardsControllerLookupCardV1(cardSerial)`. Customer rows may look like the prototype, but they may not turn directory data, URL values, or client balances into financial authority.

### 5. Capture purchase (`/cashier/earn`)

Replace the current multi-card presentation with one persistent `data-od-id="capture-flow"` panel containing the prototype's `find`, `confirm`, `receipt`, `review`, and `success` nodes. Only one state is visible at a time. Preserve the exact heading, four-step indicator, notice slot, panel geometry (`860px` max, centered, `32px 40px 40px` padding, 16px radius), and two-column first-step layout.

Extract existing Earn behavior into `useEarnTransactionController()` with the review's state and view-model shape. Preserve card lookup, generated Earn client, CSRF, idempotency, integer-kobo conversion, device/actor/branch context, timezone and receipt-week calculation, offline queue, duplicate handling, policy calculation, approval threshold, and typed backend errors. The view must not receive or render CSRF tokens, IDs, device internals, raw errors, DTO construction, or receipt-week internals.

Remove the Policy Context, Customer Detail, Recent Ledger, and Need to Sync cards from this route. Fold policy and approval information into the review/notice slot. Use the prototype success geometry for confirmed, pending approval, and offline-saved outcomes. Decide the prototype's Till / cashier reference field before implementation: either connect it to a real backend property or remove it from the approved design; never collect and silently discard it.

### 6. Redeem credit (`/cashier/redeem`)

Implement one focused prototype flow panel with five states: find customer, basket subtotal, redemption amount, confirm redemption, and success. Extract existing behavior into `useRedeemTransactionController()` while preserving draft persistence, authoritative card lookup, CSRF, idempotency, available balance, basket amount, minimum and percentage ceilings, resulting balance, approval threshold, offline policy, 201/202 outcomes, and typed errors.

Remove context-ready, draft, ceiling, offline-disabled, policy-table, draft-summary, and alert cards. Fold their authoritative information into the prototype status, summary, fields, confirmation, and success surfaces. The amount step uses the exact two-column available-credit/basket-subtotal summary and MoneyInput layout from the review.

### 7. Registration

Extract registration from `CustomerWorkspace` into `useCustomerRegistrationController()` and a purpose-built `RegisterCustomerView`. Preserve the atomic authorized operation:

`customersControllerCreateCustomerV1({ fullName, phone, email?, cardSerialNumber }, { csrf: true, idempotencyKey })`.

Retain the prototype's 760px panel, stepper geometry, fields, spacing, actions, and success state, but make the steps `Customer information → Initial card → Review`. The Initial card step contains required card serial input and scanner guidance. Do not reintroduce birthday, marketing, loyalty consent, or consent/version fields absent from the MVP contract. Registration remains restricted to Supervisor/Admin workspaces and must not be granted by a selected frontend role.

### 8. Transactions

Build a dedicated prototype-exact transactions view with Operations · Live Ledger heading, Refresh data action, truthful notice, search/status/operation/minimum-amount filter bar, bounded table, and exact detail modal. Continue using the bounded cashier feed and local filtering. If the server remains bounded, pager copy must explicitly represent pages of loaded transactions; do not imply full history. Do not add a transaction-history endpoint in this change unless a separately approved contract requires it. Preserve authoritative transaction detail and reversal behavior and never synthesize audit history.

### 9. Login and role safety

Separate login view from session controller and follow the prototype `auth-page`, decorative bands, shell, card, role list, and form DOM. Use `Landing-1.png` at `1440x923` as the canonical desktop reference. Preserve real session issuance, role routing, recovery, logout, errors, and expiry. A staff-role selector is informational or UX-copy-only; it must never grant a backend role or open a role workspace without authenticated backend authorization.

### 10. Component boundaries

Move toward the review's boundaries:

- `apps/web/components/shopcity-shell/`: operational shell, sidebar, topbar.
- `apps/web/components/cashier/overview/`: view and overview controller.
- `apps/web/components/cashier/customer-search/`: FindCustomerView and lookup controller.
- `apps/web/components/cashier/earn/`: CapturePurchaseView and Earn controller.
- `apps/web/components/cashier/redeem/`: RedeemCreditView and Redeem controller.
- `apps/web/components/cashier/transactions/`: transactions view, detail dialog, controller.
- `apps/web/components/customers/registration/`: registration view and controller.

Decompose `CashierWorkflowRoute`; do not delete trusted logic until it is owned by the appropriate controller. Views receive simple, production-authoritative view-models and do not decide layout based on business implementation details.

### 11. Quantitative visual acceptance

At frozen reference SHA `410ecd75`, create a manifest mapping route, reference image/crop, and viewport for Login, Overview, Find Customer, Capture Purchase, Redeem Credit, Registration, Transactions, and other approved prototype surfaces. Add complementary screenshot and DOM-geometry tests.

Initial screenshot acceptance is less than 1% pixel mismatch, tightening toward less than 0.5% for static/chrome regions. Mask only fixture-dependent dynamic text. Geometry comparison uses `data-od-id` and checks position, dimensions, padding, gap, border radius, font family/size/weight/line height, colors, and borders with review tolerances: position and size ±2px, font-size/radius exact, colors token-equivalent, padding/gap ±1px.

### 12. Delivery sequence and evidence

Implement in this order:

1. Lock the shared shell to the prototype DOM and remove visible extras.
2. Finish Overview parity.
3. Replace visible CashierWorkflowRoute composition with dedicated lookup, capture, and redeem views.
4. Extract Earn and Redeem controllers without changing trusted financial behavior.
5. Extract truthful registration flow.
6. Build Transactions view and detail modal with honest bounded scope.
7. Make Figma/prototype diff and DOM-geometry tests the visual source of truth.

Add unit/contract, accessibility, Playwright, visual, controller, role-boundary, scanner, offline, error-state, and route regression evidence. The HIGH-risk `CashierWorkflowRoute` blast radius requires focused coverage for all three affected cashier processes before acceptance. Run `detect_changes()` before final certification.

## Capabilities

### New Capabilities

- `prototype-exact-production-views`: committed prototype DOM, geometry, tokens, and visual states are the production view source of truth.
- `workflow-controller-view-separation`: cashier and registration business behavior is exposed through controllers/view-models without layout decisions in business-aware components.
- `quantitative-prototype-parity`: screenshot and `data-od-id` geometry comparisons gate visual parity against the frozen reference assets.

### Modified Capabilities

- `frontend-shell-routing`: the operational shell uses the prototype tree while retaining session, RBAC, logout, connection, responsive, and accessibility behavior.
- `frontend-release-evidence`: committed Figma references, visual diffs, geometry checks, and approved-deviation registry become acceptance evidence.
- `financial-workflow-contracts`: Earn and Redeem preserve authoritative card context, integer-kobo rules, idempotency, CSRF, offline behavior, policy, and explicit outcomes beneath prototype-exact views.
- `cashier-data-minimization`: directory search remains discovery-only and financial authority comes from card lookup.
- `session-gated-shells`: login, role selection, logout, expiry, device context, and recovery remain backend-authoritative while matching the reference view.
- `accessible-component-hardening`: prototype-exact routes retain semantic status slots, keyboard/focus behavior, touch targets, responsive composition, and screen-reader behavior.

## Non-Goals

- Replacing the Nest backend, introducing GraphQL, or creating a second frontend.
- Weakening authentication, RBAC, tenant/branch/device boundaries, CSRF, idempotency, offline reconciliation, or server-authoritative financial policy.
- Adding a cashier transaction-history endpoint merely to make bounded data look paginated.
- Reintroducing prototype-only registration fields or silently discarded Till/cashier data.
- Exposing session roles, balances, approvals, eligibility, policy, or card authority from frontend state.
- Treating visual similarity as sufficient without controller, contract, accessibility, route, and security evidence.

## Impact

Expected changes are concentrated in `apps/web/app/(shell)/**`, `apps/web/components/**`, frontend CSS/design tokens, generated-client consumers, and unit/accessibility/Playwright/visual tests. The review's HIGH-risk surface is `CashierWorkflowRoute` in `apps/web/components/workflows/cashier-transaction-route.tsx`, with direct effects on `CashierEarnPage`, `CashierLookupPage`, and `CashierRedeemPage` across three processes. Existing backend/API contracts should remain unchanged except where the Till/cashier-reference decision or an explicitly approved truthful contract makes an additive change necessary. OpenSpec capability/spec files, the prototype-reference manifest, approved-deviation registry, and release evidence will also change.

The implementation must preserve unrelated working-tree changes and treat commit `410ecd75` as the visual/reference baseline, not as permission to rewrite existing production behavior without focused regression evidence.
