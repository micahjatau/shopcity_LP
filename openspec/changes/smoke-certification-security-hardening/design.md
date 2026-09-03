# Design

## Authentication-state boundary

`globalSetup` will continue to use Playwright storage state for role contexts, but the path will be rooted in `$RUNNER_TEMP/shopcity-smoke-auth/<run-id>/`. The smoke output/evidence directory will contain only redacted evidence and run metadata. The upload path will explicitly exclude `auth/` as defense in depth. Teardown will revoke the created backend sessions through the supported API and remove temporary files. The evidence verifier will reject keys and serialized values associated with cookies, storage state, session tokens, CSRF tokens, bearer/authorization data, and passwords.

## Short-lived smoke sessions

Extend the backend session issuance path with an optional lifetime parameter. Ordinary login remains 12 hours. The public smoke bootstrap passes a configured 15-minute lifetime and records only a safe session reference. Teardown revokes those session IDs. Tests cover expiration configuration and normal-login compatibility.

## Bootstrap abuse controls

Apply an explicit IP-based throttle to `POST /auth/smoke-session` using a dedicated bucket and a low limit/window. Keep constant-time secret comparison and fail-closed configuration validation. Add tests for throttle metadata and rejection behavior.

## Workflow trust and exact candidate checkout

For `workflow_run`, require the upstream repository full name to equal the current repository and restrict accepted upstream branch/event/conclusion to the trusted release contract before checkout or secret exposure. Set `contents: read`, disable checkout credential persistence, and pass the verified SHA only after checkout validation. For `workflow_dispatch`, checkout `inputs.candidate_sha` directly and verify the checked-out commit before any migration, worker, or smoke step.

## Scoped staging repair

Keep the strict attestation constraint. Any transitional repair query must be parameterized to the configured smoke tenant and, preferably, the configured smoke device. It must report the affected ID count and fail if an unexpected device would be changed. Long-term staging preparation should use an authorized device rotation flow rather than generic SQL state changes.

## Outbox and migration integrity

Add `SENT` to the terminal SMS recovery query and test publisher/consumer crash ordering. Repair all rows violating `processedAt IS NULL OR status = COMPLETED`, including dead-lettered rows; if dead-letter semantics require an exception, document and encode that exception explicitly rather than leaving an inconsistent repair subset. Restore the historical 20260804 migration SQL and use a new forward migration for compatibility. Reconcile existing staging migration history once using a reviewed runbook/command, then reduce the normal workflow to `npx prisma migrate deploy` without swallowed errors.

## Release proof

Update dependency manifests and lockfile to the patched `fast-uri` release. Run Trivy against the actual candidate image. After all fixes merge, deploy the resulting master SHA, refresh provenance/evidence, and repeat the three-run staging certification. Keep production workflow approval-gated.

## Rollback

Application and workflow changes revert through normal Git rollback. Do not roll back a successfully applied database migration by editing it; use a forward corrective migration. If a security or reconciliation gate fails, retain the production safety lock and stop certification until an authorized operator resolves the incident.
