## 1. Image Hydration

- [ ] 1.1 Identify every container image used by the integration suite and the CI job that runs `npm run test:integration`.
- [ ] 1.2 Add a preflight hydration step so those images are available before the integration phase starts.
- [ ] 1.3 Ensure the hydration step prefers cached or mirrored sources and does not require a live Docker Hub pull during the test phase.

## 2. Harness Diagnostics

- [ ] 2.1 Update the integration bootstrap or shared helpers to report the missing image or hydration failure clearly.
- [ ] 2.2 Verify the integration suite still uses the same developer-facing `npm run test:integration` command.

## 3. Validation and Docs

- [ ] 3.1 Run the integration suite in the CI-equivalent environment and confirm the Docker timeout no longer blocks execution.
- [ ] 3.2 Update any CI or testing docs that describe the new image hydration prerequisite or mirror/cache expectation.
