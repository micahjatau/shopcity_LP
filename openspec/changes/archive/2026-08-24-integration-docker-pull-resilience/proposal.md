## Why

`npm run test:integration` is failing in CI because Testcontainers/Docker is timing out while pulling images from Docker Hub. That blocks the required validation gate even though the failure is environmental, not a product regression.

## What Changes

- Add a CI/runtime path that makes integration test image hydration deterministic and resilient to transient Docker Hub access failures.
- Prefer locally cached or mirrored container images before attempting remote pulls during the integration test phase.
- Improve failure output so missing image availability is reported clearly instead of surfacing only a generic Docker timeout.
- Keep the developer-facing `npm run test:integration` command intact.

## Capabilities

### New Capabilities

- `integration-test-runtime-resilience`: integration validation can complete in CI without depending on live Docker Hub availability during the test phase.

### Modified Capabilities

## Impact

- `.github/workflows/ci.yml`
- Integration test bootstrap and Testcontainers setup under `test/`
- Any shared test helpers that declare container images or startup behavior
- CI documentation and runbooks that describe integration validation prerequisites
