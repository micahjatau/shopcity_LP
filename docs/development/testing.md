# Testing

## Test Layers
- Unit tests: business rules and services.
- E2E tests: HTTP contract and request handling.
- Integration tests: Prisma and real database behavior.

## Commands
- `npm test`
- `npm run test:e2e`
- `npm run test:integration`

## Expectations
- Keep tests deterministic.
- Use Testcontainers for database integration checks.
- Prefer focused spec runs while developing.
