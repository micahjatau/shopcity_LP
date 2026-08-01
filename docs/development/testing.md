# Testing

## Test Layers

- Unit tests: business rules and services.
- E2E tests: HTTP contract and request handling.
- Integration tests: Prisma and real database behavior.

## Commands

- `npm test`
- `npm run test:e2e`
- `npm run test:integration`

## CI Notes

- The integration workflow primes the required Testcontainers images before Jest starts so Docker pull failures surface earlier with clearer diagnostics.

## Expectations

- Keep tests deterministic.
- Use Testcontainers for database integration checks and Redis-backed integration checks.
- Prefer focused spec runs while developing.
