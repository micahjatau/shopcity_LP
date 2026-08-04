# API Conventions

## Style

- REST-first JSON API.
- Versioned routes.
- Explicit request and response DTOs.
- OpenAPI descriptions for auth, validation, and error states.
- Success responses use `{ success, data, meta }`; error responses use `{ success, error, meta }` per ADR 008.
- Canonical financial workflows are `POST /api/v1/transactions/earn`, `GET /api/v1/approvals`, and `POST /api/v1/approvals/{id}/decision`.
- Receipt-specific write and approve/reject endpoints are deprecated for new frontend integration.

## Contract Rules

- Accept integer kobo for monetary values.
- Use stable error codes.
- Include examples in docs for common journeys.
- Keep idempotent and approval-dependent operations explicit.

## Development Expectations

- Generate API contracts from the implementation.
- Lint the contract before publishing it.
- Keep the backend as the source of truth for business rules.
