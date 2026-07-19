## ADDED Requirements

### Requirement: backend-owned staff session lifecycle
The system MUST verify staff identity with Supabase and MUST create, rotate, and revoke application sessions within the ShopCity backend boundary.

#### Scenario: successful login creates application session
- **WHEN** a valid staff credential is submitted
- **THEN** the system SHALL establish a backend-owned authenticated session for the user

#### Scenario: revoked session is rejected
- **WHEN** a request uses a revoked or expired session
- **THEN** the system SHALL deny access and require re-authentication

### Requirement: role-aware authorization
The system MUST enforce cashier, supervisor, admin, and system permissions on the server for all protected actions.

#### Scenario: cashier attempts admin-only action
- **WHEN** a cashier calls an admin-only endpoint
- **THEN** the system SHALL reject the request with a forbidden authorization error

#### Scenario: system-only automation is isolated
- **WHEN** a human user attempts to assume the system role
- **THEN** the system SHALL reject the request and preserve the system role for automation only

### Requirement: branch and device master data
The system MUST store branch policy context and device attribution data for operational and audit purposes.

#### Scenario: branch policy is retrieved for the frontend
- **WHEN** an authenticated client requests public configuration
- **THEN** the system SHALL return the branch policy values needed for UI behavior

### Requirement: customer registration and lookup
The system MUST allow supervisors and admins to register customers, search customers, and update customer status within authorized scope.

#### Scenario: supervisor registers a new customer
- **WHEN** a supervisor submits a valid customer registration request
- **THEN** the system SHALL create a customer record with normalized phone identity and audit the action

#### Scenario: duplicate active phone is blocked
- **WHEN** an operator registers a customer whose normalized phone already has an active account
- **THEN** the system SHALL reject the request

### Requirement: card assignment and replacement
The system MUST allow supervisors and admins to assign, replace, and status-update loyalty cards without deleting historical records.

#### Scenario: replace a blocked card
- **WHEN** a supervisor replaces an existing card
- **THEN** the system SHALL block the old card, assign a new barcode, and retain history

### Requirement: immutable audit trail
The system MUST write audit entries for sensitive auth, user, customer, card, and policy actions.

#### Scenario: sensitive action is recorded
- **WHEN** an operator changes a user role or customer/card status
- **THEN** the system SHALL create an audit record with actor, action, target, and request context
