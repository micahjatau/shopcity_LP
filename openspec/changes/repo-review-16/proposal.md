## Why

Sprint 2 still cannot close because the latest head regressed core release gates, left several public API schemas underspecified, and still has open reliability gaps in SMS recovery, approval policy enforcement, and migration verification. This change turns those review findings into a concrete backlog so implementation can proceed against a clear contract.

## What Changes

- Restore the missing CI verification gates so linting, formatting, and full typechecking are visible again before release checks pass.
- Fill out the public OpenAPI contract for transaction details, customer ledger output, approval lists, and earn responses so generated clients match actual behavior.
- Bound SMS recovery with terminal dead-letter handling for retry exhaustion and poison-event cases.
- Harden the production SMS provider with runtime validation, explicit failure classification, and required operational configuration.
- Reapply current approval policy at execution time so stale approvals cannot execute under outdated limits or thresholds.
- Require visible migration verification evidence before the tracker can claim schema changes are operationally verified.

## Capabilities

### New Capabilities

- `ci-gate-restoration`: restore the missing static verification gates in CI and keep them visible ahead of release checks.
- `api-contract-completeness`: fully describe the current transaction, ledger, approval, and earn HTTP responses in OpenAPI.
- `sms-terminal-failure-handling`: make SMS recovery stop at terminal failure states and dead-letter poison or exhausted messages.
- `sms-production-provider-hardening`: make the real SMS provider enforce runtime safety, auth expectations, and documented environment requirements.
- `approval-policy-reapplication`: require approval execution to re-evaluate current policy before financial effects are applied.
- `migration-verification-evidence`: require concrete migration test evidence before schema work is marked verified.

### Modified Capabilities

- None.

## Impact

CI workflow steps, OpenAPI generation and linting, controller response schemas, SMS outbox/worker recovery logic, approval execution flow, migration tracker docs, and the test suites covering those paths.
