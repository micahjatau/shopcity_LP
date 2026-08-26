## Context

Review 52 is a frontend truthfulness review. The backend already provides the authoritative role, policy, balance, and operational data; the remaining problem is that several screens still map that data incorrectly or expose controls that should not be available to the current role.

## Goals

- Make cashier, supervisor, and admin workspaces role-correct.
- Keep the generated client as the source of truth.
- Eliminate misleading UI states, fake controls, and contract misreads.
- Preserve auditability and append-only money history.
- Add only the smallest presentation adapters needed to render the existing backend contract safely.

## Non-Goals

- No changes to ledger authority or financial policy rules.
- No GraphQL or alternate data authority.
- No replacement of backend permissions with frontend trust.
- No reintroduction of demo metrics or placeholder controls.
- No hand-maintained DTO mirrors if the generated client can already represent the contract.

## Design Decisions

### 1. Role-aware shell and route map

The shell should expose only the routes and controls that the authenticated role can actually use.

- Cashier: lookup, earn, redeem, read-only customer review, sync queue.
- Supervisor: customer/card management, transactions, approvals, fraud, reports.
- Admin: supervisor capabilities plus adjustments, users, devices, branches, audit, pilot ops.
- SYSTEM: never treated as a human admin.

If a route exists but the backend denies the action, the route should be hidden or rendered read-only before the user submits anything.

### 2. Cashier lookup and transaction truthfulness

Lookup remains the entry point, but it must be honest.

- If the UI says receipt lookup exists, the backend path must actually support it; otherwise the prompt must narrow to the supported identifier.
- Lookup should populate customer, card, balance, and policy context.
- Redeem must never copy available balance into basket amount.
- Redeem should show the maximum allowed amount, block over-limit submission, and only use balance as context.
- Earn should support offline capture on transport failure using the same logical draft and idempotency key.

### 3. Draft persistence and idempotency

Money-moving actions need stable draft state.

- Persist draft identity and idempotency across refresh for the same logical action.
- Generate a new idempotency key only when the draft is explicitly reset or completed.
- Offline capture must reuse the attempted operation identity so the offline queue and server attempt stay connected.

### 4. Customer/card role split

Cashier should not get mutation affordances that the backend forbids.

- Cashier sees read-only customer and card review.
- Supervisor and admin get customer and card mutation routes.
- Card assignment, replacement, and status changes must be role-gated before the form is shown.
- Admin card replacement must send the generated DTO shape, not a custom `as any` payload.

### 5. Offline sync as a real reconciliation flow

Offline sync is not a badge.

- The queue should show pending, retryable, approved, confirmed, and rejected records as separate states.
- Batch submission should preserve per-record evidence and server IDs.
- The device identifier should be derived from authenticated device/session context, not typed manually into the form.
- Retry should preserve the original logical record while resubmitting only the eligible subset.

### 6. Supervisor decision surfaces

Approvals, fraud, and reports must expose supported context only.

- Do not substitute generic reasons when the operator leaves a reason blank.
- Add the filters and pagination needed to make fraud and approval queues usable.
- Pilot summary and pilot health must render exact backend fields, not guessed property names.
- Export actions must actually trigger a file download or browser save behavior.
- Transaction reversal previews should use the canonical amount field for the transaction type being reversed.

### 7. Admin truthfulness and consequence preview

Admin actions must preview consequences before submission.

- Adjustments should show the current customer context and balance impact before confirmation.
- Branch create/update should respect configured receipt-week-start behavior.
- Users, devices, audit, pilot health, and pilot ops should be live-data surfaces.
- Any visible control that cannot complete should be hidden or disabled before submit.

### 8. Adapter policy

If a backend response is insufficient for presentation, the change should use one of three paths only:

1. derive the state locally from the existing response;
2. add a minimal frontend presentation adapter;
3. split the gap into a separate backend contract change.

Do not invent product behavior in the UI just to avoid a contract mismatch.

## Phased Implementation Plan

### Phase 1: Shell and role gating

- Rework the shell navigation and route exposure.
- Remove SYSTEM from human admin navigation.
- Surface public configuration where it matters.
- Add shared loading, error, unauthorized, and not-found states.

### Phase 2: Cashier correctness

- Fix lookup copy and supported identifier handling.
- Fix redeem basket prefill and over-limit enforcement.
- Persist drafts and idempotency across refresh.
- Add offline capture for failed earn submissions.

### Phase 3: Customer/card split

- Move mutation controls out of cashier.
- Add supervisor/admin customer and card management routes.
- Fix card replacement payload shape.
- Keep cashier on read-only customer/card detail.

### Phase 4: Sync and operations truthfulness

- Add a proper sync queue and device-context derivation.
- Fix pilot health, pilot ops summary, and report contract mapping.
- Make export produce a downloadable file.
- Remove generic reason fallbacks.

### Phase 5: Admin and governance

- Add adjustment consequence preview.
- Respect receipt-week-start branch configuration.
- Ensure users, devices, audit, and pilot ops are live-data surfaces.
- Add all role-aware tests and visual baselines.

## Risks / Trade-offs

- Route and role splitting will touch many files, but the change is mostly additive and can be staged per persona.
- Some screens may reveal hidden backend contract gaps; those should be separated instead of papered over.
- Adding draft persistence introduces more state, but it is necessary for safe money-moving workflows.
- Export/download behavior may require browser-specific handling, but that is preferable to a no-op button.

## Rollout Strategy

1. Land shell and route gating first.
2. Correct the cashier data flow and offline capture.
3. Split customer/card management by role.
4. Fix operations/reporting truthfulness.
5. Finish admin workflows and consequence previews.
6. Remove the remaining fake affordances only after replacements are live.

## Verification Strategy

- Route-level e2e coverage for lookup, earn, redeem, sync, customer/card management, approvals, fraud, reports, and admin operations.
- Accessibility coverage for keyboard focus, labels, and error states.
- Visual regression for shell, cashier, supervisor, and admin states.
- Contract-shape assertions for pilot health, pilot ops summary, reports, replacement payloads, and exports.
- Regression tests proving no generic reason substitution or over-limit redeem submission remains.
