## ADDED Requirements

### Requirement: Public reversal boundary remains review-required
The system MUST not advertise a successful public reversal response until reversal execution can actually complete. When reversal execution is unavailable, the API MUST return `REVERSAL_REVIEW_REQUIRED` with HTTP 422 and the OpenAPI contract MUST not advertise HTTP 201 or 202 for that route.

#### Scenario: Reversal execution is unavailable
- **WHEN** reversal execution is not implemented
- **THEN** the runtime returns HTTP 422 with `REVERSAL_REVIEW_REQUIRED` and no successful reversal response is documented

#### Scenario: Reversal request is replayed
- **WHEN** the same reversal request is replayed with the same idempotency key
- **THEN** the API returns the same review-required boundary instead of a success code

#### Scenario: Reversal contract is regenerated
- **WHEN** OpenAPI and the generated client are rebuilt from source
- **THEN** the reversal route remains review-required and does not advertise a successful reversal outcome
