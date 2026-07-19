# API Conventions

## Style
- REST-first JSON API.
- Versioned routes.
- Explicit request and response DTOs.
- OpenAPI descriptions for auth, validation, and error states.

## Contract Rules
- Accept integer kobo for monetary values.
- Use stable error codes.
- Include examples in docs for common journeys.
- Keep idempotent and approval-dependent operations explicit.

## Development Expectations
- Generate API contracts from the implementation.
- Lint the contract before publishing it.
- Keep the backend as the source of truth for business rules.
