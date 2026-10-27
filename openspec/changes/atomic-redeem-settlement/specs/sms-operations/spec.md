## ADDED Requirements

### Requirement: Redemption settlement uses one combined notification

The system MUST enqueue at most one SMS for a confirmed redemption settlement and that message MUST communicate redeemed credit, new earned credit, and closing available credit. The worker MUST continue to accept already-queued legacy redemption payloads that do not contain settlement Earn fields.

#### Scenario: New settlement notification

- **WHEN** a redemption settlement is confirmed
- **THEN** one combined notification is enqueued and no separate Earn-confirmed notification is created

#### Scenario: Legacy notification recovery

- **WHEN** an existing queued redemption payload has only the legacy fields
- **THEN** the worker renders it through the legacy-compatible path and does not dead-letter it for missing settlement fields
