## MODIFIED Requirements

### Requirement: Earn endpoint has explicit rate limiting

The system SHALL apply explicit Redis-backed request throttling to the canonical earn endpoint and SHALL return the stable `RATE_LIMITED` domain error code when the runtime throttle limit is exceeded.

#### Scenario: Earn request exceeds configured financial limit

- **WHEN** an authenticated staff user and session device exceed the configured earn request rate
- **THEN** the earn endpoint returns a `429 RATE_LIMITED` error envelope

### Requirement: OpenAPI documents rate-limit errors

The OpenAPI contract SHALL document `429 RATE_LIMITED` for endpoints that opt into request throttling, and the documented code SHALL match the runtime error envelope.

#### Scenario: Earn contract includes 429 response

- **WHEN** the OpenAPI document is generated
- **THEN** the earn endpoint includes a `429` error-envelope response with code `RATE_LIMITED`

#### Scenario: Runtime throttle response matches OpenAPI

- **WHEN** an HTTP test exhausts the earn endpoint throttle limit
- **THEN** the serialized error envelope contains `statusCode: 429` and `code: RATE_LIMITED`
