## ADDED Requirements

### Requirement: Supabase authenticates and ShopCity authorizes

Supabase Auth SHALL verify staff identity credentials and own the approved password-reset flow. The backend SHALL NOT store raw passwords or return Supabase tokens to the browser. The backend SHALL resolve the verified Supabase identity to exactly one active ShopCity user and SHALL own ShopCity session issuance, role, tenant, branch, account status, device authorization, and financial permissions. A Supabase identity without one active linked ShopCity user SHALL receive no ShopCity session or authorization.

#### Scenario: Verified identity is not linked to an active ShopCity user

- **WHEN** Supabase verifies credentials but the identity has no unique active ShopCity user
- **THEN** the backend SHALL NOT issue a ShopCity session
- **AND** the response SHALL NOT expose whether another ShopCity account or tenant exists

#### Scenario: Active linked Supervisor signs in without POS state

- **GIVEN** Supabase verifies an active Supervisor's credentials and the ShopCity user, tenant, and assigned branch are active
- **AND** the browser request uses the approved same-origin web/BFF path
- **WHEN** the Supervisor signs in without a POS token or device identifier
- **THEN** the backend SHALL issue the normal ShopCity session using server-owned user and scope data
- **AND** the client SHALL route the user to the Supervisor workspace from the persisted role

### Requirement: Login is role-neutral

The login experience SHALL NOT ask the user to select Cashier, Supervisor, Admin, Owner, or System. The backend SHALL determine the authenticated role exclusively from the active ShopCity user record; client-selected roles SHALL NOT affect session authority or workspace routing. `SYSTEM` SHALL remain an internal workload principal and SHALL NOT be assigned to human staff.

#### Scenario: Workspace follows persisted ShopCity role

- **GIVEN** a user successfully authenticates through Supabase and resolves to an active ShopCity user
- **WHEN** the frontend receives the authenticated session context
- **THEN** it SHALL route according to the server-returned persisted role
- **AND** changing a client field, URL parameter, or request body SHALL NOT change that role or its scope

### Requirement: Staff role scope is server-owned and explicit

The backend SHALL enforce the existing role/scope model from authoritative ShopCity records: CASHIER and SUPERVISOR are limited to their assigned active branch and tenant; CASHIER additionally requires the paired POS proof defined for the pilot; SUPERVISOR does not require POS proof; ADMIN/OWNER permissions are tenant-scoped and do not require POS proof; SYSTEM is internal-only. Route selection and hidden UI controls SHALL NOT grant permission. Resource ownership, approval separation, and financial/business eligibility SHALL remain enforced by the relevant backend service.

#### Scenario: Role follows assigned scope, not client claims

- **GIVEN** a staff member has an active ShopCity role and assigned scope
- **WHEN** the request submits a different role, tenant, branch, or device ID
- **THEN** the backend SHALL authorize only the persisted session/user scope and SHALL deny out-of-scope access

#### Scenario: System role cannot authenticate as human staff

- **WHEN** a human login attempts to select, request, or map to the SYSTEM principal
- **THEN** the login SHALL NOT issue a human ShopCity session with SYSTEM permissions

### Requirement: DEVICE_TOKEN is the only paired Cashier proof in the pilot

A Cashier SHALL establish a ShopCity session only after valid Supabase credentials and verification of the active DEVICE_TOKEN cookie for a paired, active, branch-compatible POS. The backend SHALL resolve the token credential to its persisted device and SHALL derive `session.deviceId` from that relationship. The pilot SHALL NOT require or trust a browser-supplied device ID in localStorage, a login body, or `x-device-id`. HMAC_LEGACY and WEBAUTHN SHALL NOT be accepted as pilot Cashier authentication modes; no fallback or downgrade between modes is allowed.

#### Scenario: Cashier logs in from a paired POS

- **GIVEN** Supabase verifies a Cashier's credentials and the browser presents a valid active DEVICE_TOKEN cookie
- **WHEN** the backend resolves the credential, device, branch, user, and tenant state
- **THEN** it SHALL issue a ShopCity session bound to the device ID obtained from persisted credential/device records
- **AND** the browser SHALL NOT need to submit or persist a device ID to identify the POS

#### Scenario: Cashier has no usable DEVICE_TOKEN

- **GIVEN** Supabase has verified the Cashier's credentials
- **WHEN** the DEVICE_TOKEN cookie is missing, invalid, revoked, expired, or belongs to an inactive or incompatible device
- **THEN** the backend SHALL NOT issue a usable ShopCity session
- **AND** it MAY return a safe actionable pairing outcome without revealing account data before credential verification

#### Scenario: Legacy proof is not accepted for the pilot

- **GIVEN** a device is UNPAIRED, HMAC_LEGACY, or WEBAUTHN
- **WHEN** a Cashier attempts pilot sign-in without a valid DEVICE_TOKEN credential for that device
- **THEN** the backend SHALL reject the attempt without accepting another mode's proof or silently migrating the device

### Requirement: Browser authentication uses a trusted same-origin BFF boundary

Browser-facing authentication requests SHALL use the ShopCity same-origin web/BFF path. The BFF SHALL validate the browser-facing origin against trusted deployment identity and SHALL authenticate its server-to-server request to the API using a server-only per-environment credential or an equivalent reviewed deployment identity. The API SHALL reject browser-facing authentication requests that bypass the trusted BFF path. The system SHALL NOT rely on a manually maintained list of every generated Preview hostname, accept arbitrary forwarded-host metadata, or enable wildcard credentialed CORS. Session CSRF protection SHALL remain in force.

#### Scenario: Approved Preview authenticates without a source edit

- **GIVEN** a new approved Preview has a valid environment-to-API mapping and trusted canonical browser origin
- **WHEN** its browser submits an authentication request through the same-origin BFF
- **THEN** the BFF and API SHALL validate the configured deployment identity and complete the request without a source-code change or ad hoc per-host API allowlist edit

#### Scenario: Direct or mismatched authentication request is rejected

- **GIVEN** an authentication request bypasses the trusted BFF, has an unapproved origin, carries spoofed Host/Forwarded metadata, or targets a mismatched environment
- **WHEN** the request reaches the API or BFF
- **THEN** it SHALL fail closed without issuing a session
- **AND** the system SHALL NOT disclose or expose the server-only proxy credential

#### Scenario: Proxy credential is unavailable or rotated

- **GIVEN** the BFF credential is missing, invalid, or no longer valid for the target environment
- **WHEN** the BFF attempts an upstream authentication request
- **THEN** the system SHALL fail closed and SHALL NOT fall back to an untrusted direct browser request

### Requirement: Authorization uses backend-owned scope context

The backend SHALL derive role, tenant, branch, account status, and any paired POS identity from authoritative ShopCity records and the authenticated session. Shared role, tenant-scope, branch-scope, and paired-POS policies SHOULD be reusable across controllers and workflows. Resource ownership, approval separation, and domain/financial eligibility SHALL remain enforced by the relevant backend service. Frontend visibility SHALL NOT be an authorization boundary.

#### Scenario: Client submits forged scope or role

- **GIVEN** an authenticated request includes client-supplied role, tenant, branch, or device identity that conflicts with backend session state
- **WHEN** the backend authorizes the request
- **THEN** it SHALL use authoritative ShopCity context and deny an out-of-scope operation

### Requirement: Pilot operators use individual credentials

Seeded shared default passwords SHALL be limited to local development, automated tests, and disposable environments. Staging and pilot operators SHALL use individually provisioned accounts and an approved password setup/reset process.

#### Scenario: Staging operator is provisioned

- **WHEN** a Supervisor, Cashier, or Admin account is prepared for staging or pilot use
- **THEN** it SHALL be individually provisioned through the approved identity workflow
- **AND** a shared seed password SHALL NOT be the operational credential

### Requirement: Authentication failures are supportable and non-enumerating

The API SHALL use stable machine-readable error codes and request IDs. Before valid credentials establish identity, user-visible authentication failures SHALL use a generic response and SHALL NOT disclose whether an email, ShopCity user, role, tenant, or account status exists. After valid credentials identify a Cashier, the application MAY present safe role-appropriate POS-pairing guidance without disclosing another user's/device's/tenant's data. Unexpected failures SHALL include a user-safe request/reference ID and SHALL be logged with a request correlation ID and actionable internal reason while excluding passwords, BFF/device credentials, cookies, Supabase tokens, session/CSRF values, and sensitive payloads.

#### Scenario: Invalid credentials

- **WHEN** Supabase rejects credentials or no authenticated identity has been established
- **THEN** the user receives a stable generic sign-in error code/message and request ID that does not enumerate account state
- **AND** the internal log records a safe reason and request ID without secrets

#### Scenario: Supervisor/Admin service failure

- **GIVEN** an unauthenticated Supervisor or Admin login request fails because a required service is unavailable
- **WHEN** the failure is rendered
- **THEN** the message SHALL NOT mention register pairing or expose internal service details
- **AND** it SHALL include a support reference ID

#### Scenario: Authenticated Cashier requires pairing

- **GIVEN** valid Supabase credentials establish a Cashier identity but no usable DEVICE_TOKEN is available
- **WHEN** sign-in is denied
- **THEN** the user MAY receive safe POS-pairing guidance
- **AND** the response SHALL NOT expose another user's or tenant's device information
