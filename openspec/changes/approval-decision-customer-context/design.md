## Context

See `proposal.md` for motivation. The approval row supplies customer identity but not the two requested metrics. Existing role-authorized APIs provide them separately: the customer detail response includes `availableBalanceKobo`, and the customer profile projection includes `lifetimeEarnedKobo` plus `customerId` for response identity verification.

## Goals / Non-Goals

**Goals:**

- Load customer metrics only for a real selected customer and keep each field's loading/error state independent.
- Prevent a late response for a previously selected row from changing the current evidence.
- Keep metric presentation truthful when a customer is missing or one source is unavailable.

**Non-Goals:**

- No approval endpoint, authorization, policy, ledger, or settlement changes.
- No new API fields, database queries, schema migrations, or metric derivation from queue/activity data.
- No change to the Admin approval presentation.

## Decisions

- Reuse the existing customer detail API for wallet balance and the existing profile-projection API for lifetime earned. Both are already restricted to Supervisor/Admin reads and tenant-scoped by the backend; their response customer IDs must match the selected customer before values are displayed. This avoids widening the approval list payload or duplicating financial calculations.
- Fetch the two reads when the Supervisor selection changes. Track loading, success, and unavailability independently so a failure for one source does not mask the other. Treat zero as a valid amount, null/missing values as unavailable, and a missing real customer identity as “Not provided.”
- Bind resolved state to the selected customer ID and ignore responses after the selection changes. This is preferable to retaining previous values during a refresh, which could associate another customer's balance with the current approval.
- Remove the UUID evidence row and use ID-free confirmation copy. Keep the UUID internally for the existing decision endpoint and queue selection.

## Risks / Trade-offs

- [A customer read is denied or unavailable] → Render “Unavailable” for only that metric; leave decision actions and the other metric unaffected.
- [Approval data lacks a real customer relationship] → Do not fetch using the approval ID; render “Not provided.”
- [Additional reads occur when selection changes] → Fetch only the two summaries for the selected Supervisor record; no per-row prefetch or changes to list pagination.

## Migration Plan

Deploy as a web-only change. No database or API rollout is required. Rollback by reverting the UI change; approval processing remains compatible throughout.
