## Purpose

Keep public OpenAPI error examples and Sprint closeout error-code documentation aligned with runtime behavior.

## Requirements

### Requirement: Earn error examples match runtime behavior

The earn endpoint OpenAPI examples SHALL include only errors that the earn endpoint can emit at runtime.

#### Scenario: Approval-policy errors are absent from earn examples

- **WHEN** the OpenAPI document is generated
- **THEN** `PURCHASE_REQUIRES_APPROVAL` and `APPROVAL_POLICY_CHANGED` are not documented as earn endpoint `422` errors

### Requirement: Approval decision examples own policy-change errors

Approval execution errors SHALL be documented on the approval decision endpoint rather than the original earn request endpoint.

#### Scenario: Policy changed during approval decision

- **WHEN** the OpenAPI document is generated
- **THEN** `POST /api/v1/approvals/{id}/decision` documents `APPROVAL_POLICY_CHANGED` where that error can occur

### Requirement: Sprint 2 stable error-code documentation is truthful

Sprint 2 documentation SHALL accurately state whether inactive card, blocked customer, and staff-ineligible customer states are masked as `CARD_NOT_FOUND` or returned as distinct stable errors.

#### Scenario: Masking is preserved

- **WHEN** the earn flow intentionally masks those states
- **THEN** issue and technical documentation identify `CARD_NOT_FOUND` as the expected anti-enumeration response

#### Scenario: Distinct operational errors are selected

- **WHEN** the implementation returns distinct staff-only errors
- **THEN** OpenAPI examples, tests, and privacy rationale document the distinct codes together
