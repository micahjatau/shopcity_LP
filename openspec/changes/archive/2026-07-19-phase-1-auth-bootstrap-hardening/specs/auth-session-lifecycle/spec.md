## ADDED Requirements

### Requirement: Session issuance on successful login
The system MUST create an authenticated backend session when a valid staff user submits correct credentials.

#### Scenario: Login succeeds
- **WHEN** a valid username and password are submitted
- **THEN** the system creates an active session and returns sanitized user and session data

### Requirement: Session rotation invalidates the previous session
The system MUST revoke the current session before issuing a replacement session during refresh.

#### Scenario: Refresh succeeds
- **WHEN** an active session is refreshed
- **THEN** the prior session is revoked and a new active session is created

### Requirement: Protected routes require an active authenticated session
The system MUST reject requests that do not present a valid active session or whose session/user is inactive.

#### Scenario: Revoked session is used
- **WHEN** a request is made with a revoked or expired session token
- **THEN** the system rejects the request as unauthorized

### Requirement: Unsafe requests require CSRF validation
The system MUST require matching CSRF protection data for authenticated unsafe requests.

#### Scenario: CSRF token is missing or invalid
- **WHEN** an authenticated unsafe request is sent without a valid CSRF match
- **THEN** the system rejects the request as forbidden

### Requirement: Logout revokes the current session
The system MUST revoke the current authenticated session and clear client session cookies on logout.

#### Scenario: User logs out
- **WHEN** an authenticated user logs out
- **THEN** the current session is revoked and session cookies are cleared
