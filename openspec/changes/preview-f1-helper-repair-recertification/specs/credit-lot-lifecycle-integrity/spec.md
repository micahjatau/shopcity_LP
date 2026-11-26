## ADDED Requirements

### Requirement: Canonical expiry derivation helper

The Preview database SHALL provide the immutable canonical `public.derive_credit_lot_expires_at(timestamp without time zone)` helper used by enabled credit-lot lifecycle triggers. The helper SHALL preserve the existing twelve-month anniversary rule and clamp month-end dates to the last valid day of the target month.

#### Scenario: Expiry helper is restored without changing financial history

- **GIVEN** the existing applied migration history is preserved and the helper is absent
- **WHEN** the forward-only helper migration is applied to Preview
- **THEN** the helper exists, is immutable, and is executable by the runtime role
- **AND** existing lot balances, expiry evidence, ledger rows, and audit rows remain unchanged by the migration

#### Scenario: Leap-day and month-end anniversary remain canonical

- **GIVEN** an earned timestamp on February 29 in a leap year or on a month-end date
- **WHEN** the helper derives its twelve-month expiry timestamp
- **THEN** the date is clamped to the last valid day of the target month while preserving the time component

### Requirement: Guarded F1 recertification

The Preview credit-expiry job SHALL remain inactive until the accepted Preview deployment is verified and the single authorized post-repair F1 invocation passes all financial and regression checks.

#### Scenario: Failed F1 is never retried

- **GIVEN** the authorized post-repair F1 invocation fails
- **WHEN** the failure is observed
- **THEN** no second F1 request is made and Cron job 2 remains inactive
