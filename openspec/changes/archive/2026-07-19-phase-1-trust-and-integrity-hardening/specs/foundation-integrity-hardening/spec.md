## ADDED Requirements

### Requirement: Atomic session rotation

The system MUST rotate authenticated sessions atomically so that a single active session produces at most one replacement session.

#### Scenario: Single rotation succeeds

- **WHEN** an authenticated user rotates an active, unexpired session
- **THEN** the current session is revoked and exactly one new active session is issued

#### Scenario: Concurrent rotations conflict

- **WHEN** two rotation requests target the same active session concurrently
- **THEN** only one request succeeds and the other is rejected without creating an extra active session

### Requirement: Tenant-safe identity resolution

The system MUST resolve login identities only through the Supabase-linked local user and MUST NOT fall back to tenant-ambiguous username matching.

#### Scenario: Linked Supabase identity logs in

- **WHEN** Supabase returns a user id linked to exactly one local user
- **THEN** the system authenticates that local user

#### Scenario: Unlinked identity is rejected

- **WHEN** Supabase identity does not match a linked local user
- **THEN** the system rejects the login instead of searching by username

### Requirement: Tenant and branch eligibility

The system MUST reject authenticated access when the linked tenant is suspended or the linked branch is inactive.

#### Scenario: Active tenant and branch are allowed

- **WHEN** a protected request is made for an active tenant and active branch
- **THEN** the request is authorized if the session and role are otherwise valid

#### Scenario: Suspended tenant is rejected

- **WHEN** a protected request is made for a suspended tenant
- **THEN** the system denies access before the protected operation executes

### Requirement: Active card uniqueness

The system MUST ensure each customer has at most one active card at a time and card replacement MUST preserve state history.

#### Scenario: Active card creation succeeds once

- **WHEN** a customer with no active card receives a card
- **THEN** the system creates one active card

#### Scenario: Concurrent active cards are blocked

- **WHEN** two requests try to create or reactivate an active card for the same customer concurrently
- **THEN** only one active card may exist after the requests complete

#### Scenario: Replacement preserves history

- **WHEN** an active card is replaced
- **THEN** the old card becomes replaced and references the replacement card

### Requirement: Usable initial administrator

The system MUST provide a fresh-install path that creates a usable administrator account that can authenticate through the real login flow.

#### Scenario: Fresh install admin can log in

- **WHEN** a new environment is seeded and bootstrapped
- **THEN** the administrator can authenticate without manual database surgery

#### Scenario: Provisioning failure is recoverable

- **WHEN** external identity creation succeeds but database persistence fails
- **THEN** the system leaves no orphaned usable admin setup without a recovery path or compensating action

### Requirement: Public config reflects branch metadata

The system MUST expose branch-facing public configuration from PostgreSQL branch records rather than stale env-only values.

#### Scenario: Admin updates branch settings

- **WHEN** an administrator changes branch timezone or receipt-week start
- **THEN** the public configuration endpoint returns the updated values

#### Scenario: Seeded config matches runtime

- **WHEN** a fresh seed is applied
- **THEN** public config reflects the same tenant and branch values as the seeded database
