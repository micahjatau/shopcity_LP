## 1. Regenerate the OpenAPI artifact

- [x] 1.1 Run the OpenAPI export command and refresh `docs/api/openapi.json` from the current source tree.
- [x] 1.2 Review the regenerated diff to confirm it matches the current controller and envelope contract.

## 2. Verify cleanliness gates

- [x] 2.1 Run the OpenAPI integration test suite against the regenerated artifact.
- [x] 2.2 Confirm `git diff --exit-code -- docs/api/openapi.json` passes with the regenerated file.
- [x] 2.3 Re-run the CI-style OpenAPI lint/diff checks to verify the repository stays clean.
