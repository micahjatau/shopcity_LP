# Card lifecycle correctness

## ADDED Requirements

### Requirement: Canonicalize card serials server-side

The system SHALL apply one deterministic serial normalization rule at every input and persistence boundary and SHALL reject empty or malformed values.

#### Scenario: Equivalent serial input

- **GIVEN** a card exists for `sc-00123`
- **WHEN** a client looks it up as `SC-00123`
- **THEN** lookup resolves the existing card rather than creating or searching for a second identity

### Requirement: Protect canonical uniqueness

The system SHALL enforce canonical serial uniqueness within tenant scope after existing collisions are identified and explicitly resolved.

#### Scenario: Collision during migration

- **GIVEN** two existing raw serials normalize to the same value
- **WHEN** the migration preflight runs
- **THEN** it reports the collision and does not silently merge cards or wallets

### Requirement: Notify replacement

Card replacement SHALL create exactly one durable `card-replaced` SMS intent/outbox event in the same transaction as the lifecycle change and SHALL preserve fraud/audit behavior.

#### Scenario: Replacement rollback

- **GIVEN** replacement transaction fails
- **WHEN** the transaction rolls back
- **THEN** neither the new active card nor replacement SMS intent exists

### Requirement: Confirm consequential blocking

The UI SHALL require explicit confirmation before blocking a card, while the backend SHALL continue enforcing authorization and valid state transitions.

#### Scenario: Cancel block confirmation

- **GIVEN** an operator selects block for an active card
- **WHEN** the operator cancels the confirmation
- **THEN** the card remains active and no status mutation is sent

### Requirement: Preserve lifecycle concurrency

Canonicalization and notification changes SHALL retain active-card uniqueness, optimistic concurrency, replacement immutability, and authoritative customer balance behavior.

#### Scenario: Concurrent replacement

- **GIVEN** two requests attempt to replace the same active card
- **WHEN** both requests execute concurrently
- **THEN** exactly one replacement succeeds and the other receives the existing stale/conflict outcome without a second active card or duplicate notification
