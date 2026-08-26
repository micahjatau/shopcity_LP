## ADDED Requirements

### Requirement: Navigation and shell changes must be covered by route and visual evidence

The frontend release evidence SHALL include route-resolution checks and visual baselines for the expanded shell, collapsed rail, tablet rail, and mobile drawer states.

#### Scenario: Navigation coverage is evaluated

- **WHEN** release evidence is assembled for the branch
- **THEN** every sidebar href is exercised by a test that proves it resolves
- **AND** the major shell states have explicit visual coverage

### Requirement: The login regression must prove the Sign in button routes correctly

The cashier login regression SHALL assert the actual navigation triggered by the Sign in button rather than bypassing it with a manual route change.

#### Scenario: A login attempt succeeds

- **WHEN** the user fills credentials and clicks Sign in
- **THEN** the test expects the route change driven by the button
- **AND** it does not substitute a manual page.goto for the real interaction

### Requirement: Release notes and OpenSpec tracking must reflect the implemented state

The branch's release evidence SHALL reconcile deployment status and OpenSpec tracking with the implementation that actually exists.

#### Scenario: The change is prepared for closure

- **WHEN** the release evidence is reviewed
- **THEN** there is one authoritative deployment view
- **AND** the OpenSpec tracker matches the branch's implemented state
