## ADDED Requirements

### Requirement: Offline and online sync outcomes remain server-authoritative

The system SHALL keep offline sync decisions server-authoritative so invalid actor, expiry, device, branch, and card/staff cases are rejected by the backend rather than trusted from client-submitted state.

#### Scenario: Invalid actor is rejected

- **WHEN** a sync payload is submitted by an actor that does not match the server-authoritative record
- **THEN** the system rejects the sync with the documented actor mismatch outcome

#### Scenario: Expired record is rejected

- **WHEN** a sync payload targets a record that has expired according to server-authoritative state
- **THEN** the system rejects the sync with the documented expiration outcome

### Requirement: Duplicate receipt race behavior is covered at the offline boundary

The system SHALL preserve duplicate-receipt race behavior consistently across offline and online submission boundaries so the winner is accepted and the duplicate attempt is recorded as evidence.

#### Scenario: Racing duplicate receipt loses cleanly

- **WHEN** two submissions race for the same receipt identity
- **THEN** one submission succeeds, the other is rejected, and duplicate-attempt evidence is preserved

### Requirement: Offline concurrency still yields exactly one financial effect

The system SHALL keep simultaneous duplicate-receipt attempts from producing more than one confirmed financial effect even when one submission is offline and the other is online.

#### Scenario: Online and offline submissions collide

- **WHEN** one receipt submission is accepted online and a second offline sync later reaches the same receipt identity
- **THEN** exactly one financial effect is confirmed and the losing submission remains an evidence-only rejection
