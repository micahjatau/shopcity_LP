## 1. Implement backend immediate refresh

- [x] 1.1 Return whether the Supervisor refresh request created a new durable idempotency/audit/outbox intent; preserve replay and conflict behavior.
- [x] 1.2 Materialize only the authenticated Supervisor session's branch after a new intent is recorded; propagate failures.
- [x] 1.3 Add backend tests for new intent, completed replay, branch scoping, and materialization failure.

## 2. Connect the overview action

- [x] 2.1 Call the existing refresh endpoint from the button with CSRF and an idempotency key; refresh snapshot/approvals after success.
- [x] 2.2 Keep the button disabled and show progress while refreshing; show an actionable error on failure.
- [x] 2.3 Add focused frontend tests for success, order of requests, loading state, and error display.

## 3. Verify and roll out

- [x] 3.1 Run focused backend/frontend tests, typecheck, lint, build, and strict OpenSpec validation.
- [x] 3.2 Deploy API and web changes; verify both production deployments are Ready, the Supervisor page responds, the refresh route remains authenticated, and the scheduled materialization still succeeds.
- [ ] 3.3 Verify an authenticated Supervisor click advances branch `materializedAt` and refreshes the visible values.
