## ADDED Requirements

### Requirement: Authenticated shell owns shared operational context

The authenticated shell SHALL provide typed session, user, role, branch, device, tenant, and frontend-safe policy context to descendant routes.

#### Scenario: Shell context becomes ready

- **WHEN** the backend session and policy bootstrap succeed
- **THEN** descendants can read the same context without issuing their own bootstrap requests
- **AND** the context identifies its freshness and readiness state

### Requirement: Context handles loading, unauthenticated, error, and stale states

The shared provider SHALL expose explicit state for loading, unauthenticated, unavailable, and stale policy/session data.

#### Scenario: Policy refresh fails with cached data

- **WHEN** revalidation fails while a valid cached policy exists
- **THEN** the current workflow may use the cached value with a visible stale indicator
- **AND** the UI does not represent the value as freshly confirmed

### Requirement: Public configuration cache is scope-safe

The public configuration cache SHALL key values by the tenant and branch scope that produced them and SHALL never reuse one scope's policy for another.

#### Scenario: Cashier changes branch context

- **WHEN** the active branch or tenant changes
- **THEN** the context requests or selects the matching scoped policy
- **AND** it does not display the previous branch's policy as current

### Requirement: Context freshness and invalidation are bounded

The cache SHALL use approximately five-minute freshness and thirty-minute stale-while-revalidate behavior and SHALL expose invalidation for known policy/branch changes.

#### Scenario: Cached policy becomes stale

- **WHEN** cached policy exceeds the freshness window but is within stale-while-revalidate
- **THEN** the current value may render with stale status
- **AND** a background refresh is attempted once per cache key

### Requirement: Route consumers do not duplicate shared bootstrap work

A route that consumes fresh shared context MUST NOT call `/auth/me` or `/config/public` solely to reconstruct the same session or policy data.

#### Scenario: Earn route renders with fresh context

- **WHEN** `/cashier/earn` mounts after the shell context is ready
- **THEN** it consumes context values
- **AND** it does not issue a second session or public-config request
