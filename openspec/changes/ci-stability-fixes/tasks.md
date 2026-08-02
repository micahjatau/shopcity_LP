## 1. Verification Contract

- [x] 1.1 Audit `package.json`, `.github/workflows/ci.yml`, `AGENTS.md`, and `CLAUDE.md` against the new CI stability spec.
- [x] 1.2 Update any stale command references so lint, lint:fix, GitNexus, and verification guidance all match the actual scripts.

## 2. Lint-Safe Test Fixtures

- [x] 2.1 Remove unsafe type escapes from the worker test support code and replace them with typed fixtures or mocked interfaces.
- [x] 2.2 Re-run the affected worker and integration specs to confirm the lint-safe path still exercises the intended runtime behavior.

## 3. CI Validation

- [x] 3.1 Run the repository verification commands used by CI, including lint and fast verification, from a clean checkout.
- [x] 3.2 Confirm the workflow still passes the static, GitNexus, e2e, and integration jobs without relying on ambient tools.
