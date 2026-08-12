## ADDED Requirements

### Requirement: Same-receipt race tests assert deterministic loser outcomes

The system SHALL prove not only that same-receipt concurrency creates exactly one financial effect, but also that the losing path resolves to a recognized domain outcome.

#### Scenario: Online loses after offline success with expected duplicate semantics

- **GIVEN** an offline earn has already confirmed a canonical receipt
- **WHEN** an online earn submits the same canonical receipt with a different idempotency key
- **THEN** the online request returns the expected duplicate/conflict or replay-safe outcome for that path
- **AND** authoritative financial counts remain one receipt, one earn ledger entry, and one credit lot

#### Scenario: Concurrent online and offline earn race returns one recognized loser outcome

- **GIVEN** an online earn and an offline earn start concurrently for the same canonical receipt
- **WHEN** both requests settle
- **THEN** one path wins and the other resolves to a recognized duplicate/conflict or replay-safe outcome
- **AND** authoritative financial counts remain one receipt, one earn ledger entry, and one credit lot

#### Scenario: Distinct offline local identities cannot produce ambiguous loser behavior

- **GIVEN** two offline records have different `localId` values and idempotency keys but the same canonical receipt identity
- **WHEN** they are processed concurrently
- **THEN** at most one record creates financial effects
- **AND** the losing record resolves to a recognized duplicate/conflict or replay-safe outcome
