## MODIFIED Requirements

### Requirement: Critical workflow tests cover authoritative outcomes

The frontend test suite SHALL cover the critical login, shell routing, customer, cashier, sync, and transaction workflows through authoritative backend outcomes rather than only static rendering.

#### Scenario: Login navigation regression is tested

- **WHEN** the login form is submitted with valid test credentials
- **THEN** the test proves the Sign in action performs the expected navigation
- **AND** it verifies the authenticated shell becomes available

#### Scenario: Customer deep link is tested

- **WHEN** a customer route opens with `?id=<customerId>` while the initial list search is in flight
- **THEN** the selected customer remains `<customerId>` after both requests settle
- **AND** the list response cannot replace it without explicit user action

#### Scenario: Customer create and update are tested

- **WHEN** an authorized Supervisor/Admin submits valid customer create or update data
- **THEN** the test verifies the generated API client calls the existing backend contract
- **AND** the UI reflects the authoritative response
- **AND** it does not allow frontend-submitted balances, roles, or approvals

### Requirement: Route and role coverage is complete

Tests SHALL iterate every canonical sidebar destination and verify route resolution, role visibility, shared-workspace link neutrality, and responsive shell behavior.

#### Scenario: Canonical routes are checked

- **WHEN** the route-resolution test iterates shell navigation entries
- **THEN** every visible href resolves to a page
- **AND** no shared workspace link points to an unavailable role route

#### Scenario: Responsive shell states are checked

- **WHEN** visual/accessibility tests render expanded, collapsed, tablet, and mobile shell states
- **THEN** the rail/drawer layout, focus containment, skip link, labels, and background inertness are verified

### Requirement: Device and Offline Earn coverage uses the real UI path

Tests SHALL verify device provisioning, secret handling, device-bound login, Offline Earn readiness, durable persistence, and sync outcomes through the real user-facing flow.

#### Scenario: Raw secret persistence is rejected

- **WHEN** a provisioning or login flow completes
- **THEN** browser storage and URL state contain no raw device secret
- **AND** the one-time secret is cleared from the visible UI after completion

#### Scenario: Offline Earn lacks device readiness

- **WHEN** the authenticated session has no device ID
- **THEN** the UI blocks queue creation and offers recovery guidance

#### Scenario: Offline Earn persists and syncs

- **WHEN** a device-ready cashier saves an eligible Earn transaction offline
- **THEN** the UI reports local success only after durable persistence
- **AND** reconciliation retains idempotency, branch, device, and sync context
- **AND** the eventual server outcome is displayed distinctly from local queueing

### Requirement: Performance and request-waterfall coverage is automated

The test/evidence suite SHALL verify production-build route payloads, Web Vitals, hydration, and duplicate bootstrap request counts for the agreed route matrix.

#### Scenario: Warm route navigation is measured

- **WHEN** the browser navigates between cashier workflow routes with fresh context
- **THEN** the evidence records zero duplicate `/auth/me` and `/config/public` calls
- **AND** it records the route payload and interaction metrics

### Requirement: Release evidence is exact-head and deployment-aware

The release test suite SHALL verify that CI evidence and canonical deployment evidence refer to the same source commit and approved deployment context.

#### Scenario: Candidate evidence is reviewed

- **WHEN** the release gate evaluates the stabilization candidate
- **THEN** all required checks identify the exact candidate SHA
- **AND** stale duplicate deployment context is excluded or explicitly marked non-canonical
