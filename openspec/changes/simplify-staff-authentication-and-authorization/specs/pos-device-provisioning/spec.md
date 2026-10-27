## MODIFIED Requirements

### Requirement: Exclusive device authentication binding modes

Each device SHALL accept exactly one cashier authentication proof according to its persisted binding mode. `UNPAIRED` SHALL accept no proof, `HMAC_LEGACY` SHALL accept only the inventoried legacy HMAC proof, `WEBAUTHN` SHALL accept only its active registered WebAuthn credential, and `DEVICE_TOKEN` SHALL accept only its active keyed device-token cookie. No mode SHALL fall back or downgrade to another proof. The approved pilot runtime SHALL additionally enforce a fail-closed `DEVICE_TOKEN`-only cashier-session policy: HMAC_LEGACY and WEBAUTHN modes SHALL NOT issue pilot Cashier sessions. This pilot restriction does not delete compatibility code/data or approve another runtime's use of those modes; such use requires an explicit separate policy and qualification.

#### Scenario: Pilot accepts only DEVICE_TOKEN

- **GIVEN** the backend is configured for the approved pilot runtime
- **WHEN** a Cashier attempts login from a DEVICE_TOKEN device with valid Supabase credentials and its active device-token cookie
- **THEN** the backend SHALL validate the token against the active persisted credential/device/tenant/branch records and SHALL issue a session bound to the persisted device ID
- **AND** a pilot Cashier login through HMAC_LEGACY, WEBAUTHN, or UNPAIRED SHALL fail closed without a fallback or device-less session

#### Scenario: Pilot policy is missing or invalid

- **GIVEN** the backend is configured for the pilot runtime
- **WHEN** the approved DEVICE_TOKEN-only policy or its required key configuration is missing or invalid
- **THEN** startup or authentication SHALL fail closed without issuing a Cashier session

#### Scenario: Non-pilot compatibility mode remains exclusive

- **GIVEN** a separate non-pilot runtime is explicitly approved to exercise a compatibility mode
- **WHEN** a device authenticates
- **THEN** only the proof matching its persisted binding mode MAY be accepted
- **AND** this compatibility behavior SHALL NOT be treated as pilot acceptance or WebAuthn hardware qualification

### Requirement: Public login Origin integrity

Browser-facing login SHALL be submitted through the same-origin ShopCity web/BFF. The BFF SHALL validate the browser Origin against trusted, deployment-specific canonical-origin identity and an explicitly configured environment-to-API mapping; generated Preview hostnames SHALL NOT require a source-code edit or manual per-host API allowlist entry. The API SHALL require the approved server-only BFF identity for browser-facing login and SHALL NOT accept forwarded Origin/Referer alone as proof that a request came through the BFF. Missing/malformed/disallowed browser origin, absent/invalid BFF identity, or cross-environment mapping SHALL fail closed before issuing a ShopCity session. Arbitrary client-supplied Host/Forwarded/X-Forwarded-* values SHALL NOT establish trust. Wildcard credentialed CORS is prohibited. Preserve the approved exact Origin check at the BFF, the current Referer fallback only when Origin is absent, login throttling, generic pre-identity failures, and the existing rule that public login does not require a pre-login session-bound CSRF pair.

#### Scenario: Approved Preview uses the BFF without a source edit

- **GIVEN** an approved Preview deployment has a trusted canonical origin and explicit non-production API mapping
- **WHEN** its browser submits login through the same-origin BFF
- **THEN** the BFF validates deployment identity and authenticates its upstream request
- **AND** the API completes the normal Supabase/ShopCity login without adding that generated Preview hostname to source code or a manually curated API host list

#### Scenario: Direct, spoofed, or cross-environment login is rejected

- **GIVEN** a browser attempts to call the API directly, spoof forwarded host/origin metadata, use an unapproved origin, or send a Preview identity to Staging/Production
- **WHEN** the login request is evaluated
- **THEN** the API SHALL reject it without issuing a session
- **AND** SHALL NOT disclose the BFF credential or account-existence information

#### Scenario: Missing or invalid canonical origin fails closed

- **WHEN** the BFF cannot determine a trusted canonical origin, or Origin and the approved Referer fallback are absent, malformed, or do not match the deployment identity
- **THEN** it rejects the login before credential verification or session creation
- **AND** returns only a safe stable error and request ID

### Requirement: Same-origin proxy preserves token cookie transport

The same-origin BFF SHALL preserve the current browser API contract for Cookie, validated Origin/Referer, request/response body, status, timeout/abort behavior, and Set-Cookie attributes. It SHALL attach the approved server-only BFF identity only on server-to-server requests after validating deployment-to-API mapping; it SHALL discard any browser-supplied value for that identity. The BFF credential SHALL never be exposed to browser code, response headers, logs, analytics, or test artifacts. The API SHALL treat BFF identity only as proof of the gateway, not as user authentication or authorization; Supabase verification, ShopCity sessions, CSRF and server-side RBAC remain required.

#### Scenario: Pairing and cashier login preserve the POS token cookie

- **WHEN** an authorized pairing/reset or cashier login is sent through the BFF
- **THEN** required Cookie and validated Origin/Referer context reaches the API
- **AND** API Set-Cookie attributes, including `__Host-shopcity_pos_device` security attributes, reach the browser unchanged
- **AND** the browser cannot read the HttpOnly credential or the BFF identity

#### Scenario: Browser-supplied BFF identity is not trusted

- **GIVEN** a browser includes a forged BFF credential or deployment header
- **WHEN** the BFF constructs its upstream request
- **THEN** it SHALL discard the client-supplied identity and attach only the server-configured identity for the validated target environment
- **AND** the API SHALL reject missing, invalid, or cross-environment identity
