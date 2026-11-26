## ADDED Requirements

### Requirement: Active credit-lot lifecycle triggers retain their derivation helper

The database SHALL provide `derive_credit_lot_expires_at(timestamp without time zone)` with the canonical immutable twelve-month UTC month-clamp semantics whenever credit-lot lifecycle triggers call it. A forward-only migration SHALL restore the helper idempotently if absent, without changing existing credit-lot rows or migration-history records.

#### Scenario: Applied lifecycle trigger references a missing helper

- **WHEN** the credit-lot lifecycle insert or update trigger calls the derived-expiry helper and the helper is absent from the active search path
- **THEN** a forward-only migration SHALL restore the exact canonical helper implementation before lifecycle writes resume, without changing the expiry formula or existing financial rows

#### Scenario: Due credit lot is processed after helper restoration

- **WHEN** the expiry workflow updates a due lot's remaining balance with the helper available
- **THEN** lifecycle validation SHALL accept the unchanged expiry value and the existing ledger, expiry-evidence, lot-balance, and audit invariants SHALL remain enforced
