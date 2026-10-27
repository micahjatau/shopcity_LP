## Why

The Supervisor approval Decision panel currently exposes the approval UUID as evidence while showing no customer wallet balance or lifetime earned total. Replace the internal identifier with useful customer context from existing authorized, tenant-scoped customer APIs so reviewers can make a more informed decision without changing approval authority.

## What Changes

- Remove the internal approval/request UUID from Supervisor decision evidence and user-facing decision confirmation copy.
- Load wallet balance from the customer detail projection and lifetime earned from the customer profile projection for the selected customer.
- Display values as NGN, including zero; communicate loading and unavailable data honestly and independently.
- Preserve existing approval list, decision, authorization, idempotency, and financial behavior.

## Capabilities

### New Capabilities

- `supervisor-approval-customer-evidence`: Customer financial context and readable evidence in the Supervisor approval decision panel.

### Modified Capabilities

None.

## Impact

- `apps/web/components/workflows/approvals-panel.tsx` and `apps/web/tests/approvals-panel.spec.tsx`.
- Reuses existing Supervisor/Admin-authorized customer detail and profile-projection APIs; no API or database contract changes.
- OpenSpec documentation and proposal-time GitNexus impact tracker.
