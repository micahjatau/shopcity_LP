## Why

Review 28 shows the repo is still not safe to treat as production-ready: migration history is not fully reconciled, delayed idempotency replay can still lose to mutable validation, approval expiry leaves REDEEM receipts inconsistent, and key read surfaces still leak beyond actor scope. This change closes the remaining hardening gaps before reversal and manual-adjustment work proceeds.

## What Changes

- Reconcile the shared migration ledger against committed migrations and require restore-based verification before release.
- Make completed replay authoritative before time-sensitive redemption and earn validation.
- Generalize credit-lot source validation for adjustment credits and enforce original-debit ownership for restorations.
- Centralize approval expiry so worker and decision paths settle Approval, Redemption, Receipt, and audit state atomically.
- Enforce actor-aware branch scoping for approval lists, approval decisions, and customer-ledger reads.
- Align release evidence and tracker docs with the current verified head and migration state.

## Capabilities

### New Capabilities
- `approval-expiry-consistency`: shared atomic expiry flow for approval-driven workflows, including REDEEM receipt settlement and expiry audit recording.
- `supervisor-read-authorization`: actor-aware branch-scoped approval listing, approval decisions, and customer-ledger reads.

### Modified Capabilities
- `migration-safety`: require the actual shared migration history to match committed migrations and be verified by backup/restore rehearsal.
- `financial-workflow-contracts`: resolve completed idempotency replays before timestamp or policy checks for new execution.
- `credit-lot-lifecycle-integrity`: allow approved adjustment-credit sources and require restorations to stay tied to the original debit.
- `sprint-2-release-evidence`: require evidence and tracker records to reflect the current verified head and migration state.

## Impact

- Prisma migrations, backup/restore verification, and release evidence docs.
- Redemption, earn, approval-expiry, and ledger-validation code paths.
- Transaction, approval, and customer-ledger authorization boundaries.
- CI and tracker entries tied to release reproducibility.
