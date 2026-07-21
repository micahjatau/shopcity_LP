## Why

Receipt policy is split across config, validation, and runtime checks in a way that can let invalid settings pass startup but fail later, while large purchase values and device trust are only partially constrained. We also have a process gap: the migration tracker no longer reflects the latest schema work.

## What Changes

- Align receipt-week start validation and capture derivation so the same weekday convention is accepted end-to-end.
- Add a hard upper bound for `purchaseAmountKobo` so absurdly large values are rejected instead of only being routed through review logic.
- Introduce cryptographic device attestation for session binding, replacing trust in a bare device ID alone.
- Update the migration tracker process so applied schema changes are recorded consistently.

## Capabilities

### New Capabilities
- `receipt-policy-hardening`: receipt-week consistency, purchase ceiling enforcement, device attestation, and migration-tracker hygiene.

### Modified Capabilities

- None.

## Impact

Receipt capture, auth/session issuance, device provisioning, env validation, branch settings, migration-tracker docs, and the receipt integration/migration test suites.
