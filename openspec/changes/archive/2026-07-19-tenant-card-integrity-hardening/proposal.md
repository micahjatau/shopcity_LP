## Why

The backend still has a few trust-boundary gaps that can surface incorrect tenant context or let a replaced card be reactivated. These are the last integrity issues in the current auth/config/card path and should be closed before the project moves deeper into ledger and receipt work.

## What Changes

- Validate that the public configuration tenant and branch resolve to a consistent pair before responding.
- Reject attempts to reactivate a replaced card through the card status endpoint.
- Keep card replacement behavior intact: the old card remains inactive and the new card becomes the active card for the same customer.
- Add tests that cover mismatched public config data and invalid card reactivation attempts.

## Capabilities

### New Capabilities
- `tenant-card-integrity`: public config must not mix tenant/branch context, and replaced cards must remain terminal.

### Modified Capabilities

## Impact

- `src/modules/configuration/`: public config lookup and validation.
- `src/modules/cards/`: card status transition rules.
- `test/`: integration and unit coverage for config consistency and card lifecycle rules.
