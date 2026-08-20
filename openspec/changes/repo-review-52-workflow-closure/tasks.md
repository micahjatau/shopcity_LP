## 1. Shell and role boundaries

- [ ] 1.1 Make the shell navigation role-aware for cashier, supervisor, admin, and SYSTEM contexts.
- [ ] 1.2 Hide human admin routes from SYSTEM sessions.
- [ ] 1.3 Surface branch identity, tenant context, timezone, policy values, receipt-week-start, and offline-redemption availability in the shell.
- [ ] 1.4 Add shared loading, error, unauthorized, and not-found states for workspace routes.
- [ ] 1.5 Ensure the route map does not expose actions the authenticated role cannot perform.

## 2. Cashier lookup and transaction truthfulness

- [ ] 2.1 Align the cashier lookup prompt with the actually supported identifier(s), or add the missing receipt lookup support explicitly.
- [ ] 2.2 Keep lookup results focused on customer identity, card status, balance, expiring credit, and policy context.
- [ ] 2.3 Fix redeem so available balance is shown as context and never copied into basket amount.
- [ ] 2.4 Disable redeem submission when the requested amount exceeds the calculated maximum.
- [ ] 2.5 Preserve the logical draft and idempotency key across refresh/retry for the same earn or redeem action.
- [ ] 2.6 Add offline capture for failed earn submissions using the same operation identity as the online attempt.
- [ ] 2.7 Make lookup-to-earn and lookup-to-redeem handoff paths carry the correct card and customer context.

## 3. Customer and card role split

- [ ] 3.1 Remove customer/card mutation affordances from cashier screens.
- [ ] 3.2 Add read-only customer and card review for cashier users.
- [ ] 3.3 Add supervisor/admin customer management routes for search, detail, create, edit, and status change.
- [ ] 3.4 Add supervisor/admin card management routes for lookup, assign, replace, block/unblock, and status change.
- [ ] 3.5 Fix card replacement to send the generated DTO shape instead of a custom `as any` payload.
- [ ] 3.6 Ensure customer and card state changes are visible in the detail views immediately after mutation.

## 4. Offline sync as a real reconciliation flow

- [ ] 4.1 Derive device context from authenticated device/session data instead of a manual device ID field.
- [ ] 4.2 Present the local sync queue with pending, retryable, approved, confirmed, and rejected states.
- [ ] 4.3 Show per-record sync outcomes, server identifiers, and rejection reasons.
- [ ] 4.4 Preserve local evidence when a batch partially succeeds or fails.
- [ ] 4.5 Keep retry actions scoped to eligible records only.

## 5. Supervisor decision surfaces

- [ ] 5.1 Fix pilot health to read the exact backend contract fields.
- [ ] 5.2 Fix pilot operations summary rendering so it uses the dedicated summary shape, not a generic report item list.
- [ ] 5.3 Fix reports to map the exact backend summary shape instead of generic `items` rendering.
- [ ] 5.4 Make report export trigger an actual downloadable file or browser save action.
- [ ] 5.5 Remove generic reason fallback from approvals and require an explicit operator reason.
- [ ] 5.6 Remove generic reason fallback from fraud decisions and require an explicit operator reason.
- [ ] 5.7 Add the fraud and approval filters plus pagination needed to make the queues usable.
- [ ] 5.8 Add the missing approval and fraud detail context, including receipt, policy, audit, and branch/customer clues.
- [ ] 5.9 Keep supervisor reports limited to supervisor-visible actions, and reserve admin-only refresh or audit surfaces for admin roles.

## 6. Admin and governance workflows

- [ ] 6.1 Add consequence preview for manual adjustments, including customer context and balance impact.
- [ ] 6.2 Add user creation and role/status management with human-safe role pickers.
- [ ] 6.3 Add device create/update/rotation/status workflows where the backend supports them.
- [ ] 6.4 Ensure branch create/update respects the configured receipt-week-start value.
- [ ] 6.5 Add audit-trail lookup as a live data surface.
- [ ] 6.6 Replace the pilot-summary and pilot-health demo surfaces with live operational data.
- [ ] 6.7 Add transaction reversal preview with the canonical amount field for the transaction type.

## 7. Truthful UI state and no-op cleanup

- [ ] 7.1 Remove or hide any visible control that cannot actually complete its action.
- [ ] 7.2 Replace fake metrics and demo cards with live data or hidden placeholders.
- [ ] 7.3 Ensure empty states explain the next real action the user can take.
- [ ] 7.4 Ensure loading and error states are actionable rather than decorative.
- [ ] 7.5 Remove any remaining no-op export, lookup, or navigation affordances.

## 8. Contract alignment and quality gates

- [ ] 8.1 Add minimal presentation adapters only where the generated client is otherwise sufficient.
- [ ] 8.2 Split any true backend contract gap into a separate follow-up change instead of inventing frontend behavior.
- [ ] 8.3 Add route, accessibility, and workflow regression coverage for the new and corrected screens.
- [ ] 8.4 Add visual-regression coverage for shell, cashier, supervisor, and admin states.
- [ ] 8.5 Add e2e tests for lookup, earn, redeem, offline capture, customer/card management, approvals, fraud, reports, exports, adjustments, and reversal.
- [ ] 8.6 Run `npm run openspec:validate` and the relevant frontend test commands before closing the change.
