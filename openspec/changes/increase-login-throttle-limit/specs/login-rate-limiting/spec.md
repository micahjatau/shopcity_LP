## ADDED Requirements

### Requirement: Public login allows ten attempts per window

The public `/api/v1/auth/login` endpoint SHALL allow up to 10 requests per 15-minute window in each of its existing IP, normalized-account, and IP/account throttle buckets. Requests exceeding any bucket limit SHALL continue to receive `429 RATE_LIMITED`.

#### Scenario: Login remains allowed through the tenth attempt

- **WHEN** a client submits no more than 10 requests in the applicable 15-minute window for each existing login throttle bucket
- **THEN** the throttle SHALL allow the requests to proceed to the existing login validation

#### Scenario: The eleventh login attempt is rate limited

- **WHEN** a client submits an eleventh request within the 15-minute window for any existing login throttle bucket
- **THEN** the endpoint SHALL return `429 RATE_LIMITED`

### Requirement: Other authentication throttle limits remain unchanged

Changing the public login request allowance SHALL NOT change the cashier WebAuthn completion or password-recovery throttle limits, which remain 5 attempts per 15 minutes.

#### Scenario: Cashier completion and password recovery retain their limits

- **WHEN** throttle metadata is evaluated for cashier login completion or either password-recovery route
- **THEN** each route SHALL retain its existing 5-attempt, 15-minute limit
