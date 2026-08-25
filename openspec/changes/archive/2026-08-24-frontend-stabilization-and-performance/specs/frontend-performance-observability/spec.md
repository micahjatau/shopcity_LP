## ADDED Requirements

### Requirement: Production performance baselines are route-attributed

The project SHALL measure the production web build for `/cashier`, `/cashier/lookup`, `/cashier/earn`, `/cashier/redeem`, `/supervisor/approvals`, and `/admin/operations`.

#### Scenario: Baseline command runs

- **WHEN** the measurement harness runs against a production build
- **THEN** it records the commit SHA, route, environment, browser, timestamp, and measurement version
- **AND** it does not use development-server numbers as production evidence

### Requirement: Performance evidence includes transfer and interaction metrics

The evidence SHALL include document/HTML bytes, RSC transfer, JavaScript transfer, TTFB, FCP/LCP, INP, hydration duration, total API calls, `/auth/me` calls, `/config/public` calls, and duplicate request counts.

#### Scenario: Route evidence is generated

- **WHEN** a measured route loads and performs a warm navigation
- **THEN** the report contains each required metric or an explicit unavailable reason
- **AND** request counts distinguish cold load from warm navigation

### Requirement: Warm navigation avoids duplicate bootstrap requests

The frontend SHALL make zero `/auth/me` and zero `/config/public` requests on warm route changes when the shared context is already fresh.

#### Scenario: Cashier navigates between workflows

- **WHEN** a cashier navigates from overview to Lookup, Earn, or Redeem with fresh context
- **THEN** no duplicate session or public-config request is issued
- **AND** the workflow reuses the shared context

### Requirement: Performance thresholds are explicit release evidence

The release gate SHALL target a warm navigation payload below 150 KB, zero duplicate bootstrap requests, warm route usability below 500 ms where the environment supports the measurement, LCP below 2.5 seconds, and INP below 200 ms.

#### Scenario: Threshold is exceeded

- **WHEN** a measured route exceeds a threshold
- **THEN** the evidence marks the gate failed or explicitly excepted with the observed value and reason
- **AND** the pipeline does not silently replace the result with an unmeasured pass

### Requirement: Backend topology is documented with performance evidence

The project SHALL record the effective region or placement of the frontend runtime, API/backend, and database for staging performance runs.

#### Scenario: Staging topology is measured

- **WHEN** a staging performance run is accepted as release evidence
- **THEN** the report identifies the frontend, backend, and database placement
- **AND** it identifies unresolved cross-region latency risks
