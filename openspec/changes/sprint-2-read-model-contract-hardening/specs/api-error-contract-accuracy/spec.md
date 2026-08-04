## ADDED Requirements

### Requirement: Runtime 429 errors match documented domain code

Runtime HTTP 429 responses for endpoints with documented rate-limit errors SHALL use the same domain error code as their OpenAPI contract.

#### Scenario: Throttled earn request returns documented code

- **WHEN** the earn endpoint rejects a request because the configured throttle bucket is exhausted
- **THEN** the HTTP response error envelope contains `code: RATE_LIMITED` rather than `HTTP_429`

#### Scenario: OpenAPI and runtime stay aligned

- **WHEN** OpenAPI generation and HTTP throttle tests run in verification
- **THEN** both sources agree on `429 RATE_LIMITED` for the earn endpoint
