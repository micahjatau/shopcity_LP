## Purpose

Close the supervisor/admin operational, release-evidence, and branch-policy gaps identified in repo review 53.

## ADDED Requirements

### Requirement: Supervisor surfaces must expose authorized materialization state

The supervisor view SHALL render materialization state that the backend authorizes, while keeping admin-only refresh and mutation actions restricted.

#### Scenario: Supervisor opens the operations view

- **WHEN** a supervisor loads the operational surface
- **THEN** materialization state is visible
- **AND** admin-only refresh or mutation controls remain hidden or disabled

### Requirement: Pilot health and approval surfaces must present truthful operational controls

Pilot health and approvals SHALL reflect the backend contract exactly, including zero-failure semantics, filtering, pagination, and decision context.

#### Scenario: Approvals are paged and filtered

- **WHEN** the operator changes the page size or status filter
- **THEN** the approval list updates accordingly
- **AND** zero-failure or empty states do not imply an error when the backend reports a healthy state

### Requirement: Branch administration must capture receipt-week-start-day

Branch create and update forms SHALL expose and persist receipt-week-start-day so offline and reconciliation workflows use the same branch policy.

#### Scenario: An admin creates or updates a branch

- **WHEN** the branch form is submitted
- **THEN** the receipt-week-start-day value is included in the request
- **AND** the saved branch policy reflects the submitted value

### Requirement: Release evidence must not contain duplicate deployment noise

The release evidence and deployment status surfaces SHALL present one authoritative deployment view and SHALL reconcile OpenSpec tracking with the actual branch state.

#### Scenario: A release review is prepared

- **WHEN** the release evidence is assembled for the branch
- **THEN** duplicate deployment-status entries are removed
- **AND** the OpenSpec tracker reflects the implemented state of the branch
