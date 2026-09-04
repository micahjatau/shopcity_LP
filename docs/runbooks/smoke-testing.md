# ShopCity Smoke Testing Runbook

## Purpose

The role-based smoke suite certifies deployed Cashier, Supervisor, and Admin workflows without using ordinary operational data. It combines real Playwright browser actions with authenticated API setup, verification, reconciliation, and secret-free release evidence.

## One-time fixture provisioning

Create these resources in a dedicated smoke tenant and branch only:

- [ ] Smoke tenant and branch
- [ ] Smoke Admin account and `SMOKE_ADMIN_USER_ID`
- [ ] Smoke Supervisor account and `SMOKE_SUPERVISOR_USER_ID`
- [ ] Smoke Cashier account and `SMOKE_CASHIER_USER_ID`
- [ ] Active smoke POS device, branch-bound and `ACTIVE`
- [ ] Active baseline customer and card
- [ ] Inactive customer and card
- [ ] Staff/ineligible customer and card
- [ ] At least two spare cards
- [ ] Smoke-scoped open fraud flag
- [ ] Versioned manifest containing non-secret IDs and expected relationships
- [ ] `production-smoke` GitHub Environment with required reviewers
- [ ] Environment secrets and variables populated using the `SMOKE_*` names
- [ ] Backend deployment and GitHub Environment both contain the same `SMOKE_SESSION_BOOTSTRAP_SECRET`

Never place real credentials, attestation secrets, customer PII, bootstrap secrets, or exact production identifiers in this document or source control.

## Staging execution

Staging smoke runs after the release-candidate CI/deployment workflow. A manual run may be started with the exact candidate SHA:

```bash
SMOKE_ENVIRONMENT=staging npm run smoke:staging
```

The smoke runner creates short-lived role sessions through the secret-gated `/api/v1/auth/smoke-session` endpoint to avoid consuming the production login throttle. The backend rejects bootstrap requests unless `SMOKE_SESSION_BOOTSTRAP_SECRET` is configured and matches the GitHub Environment secret. Bootstrap uses deterministic role user IDs, not fuzzy username discovery. Cashier bootstrap still requires device attestation.

The result is a PASS only when Cashier, Supervisor, Admin, cross-role, guardrails, and reconciliation groups all pass. Download the generated JUnit, HTML, screenshots, traces, and manifest evidence for release certification.

### One-time staging migration reconciliation

Before the first certification after a staging database restore or migration-history reset, an authorized operator must take a provider-managed backup, review `_prisma_migrations`, reconcile only the known historical entries with `npx prisma migrate resolve`, run `npx prisma migrate deploy`, and record the backup reference, repaired migration IDs, constraint checks, and post-deploy status in `docs/database/migration-tracker.md`. The normal certification workflow must never swallow migration errors.

If the smoke device lacks attestation metadata, stop certification and use the authenticated Admin device update endpoint with `rotateAttestationSecret: true` for the dedicated `SMOKE_DEVICE_ID`. Do not fabricate ciphertext, rotate unrelated devices, or repair device state with direct SQL.

## Production execution

Production smoke is manual-only:

1. Open **Actions → production-smoke → Run workflow**.
2. Enter the exact deployed 40-character `candidate_sha`.
3. Enter `RUN_PRODUCTION_SMOKE` exactly as confirmation.
4. Provide a release/pilot reason.
5. Wait for `production-smoke` Environment approval.
6. Confirm the smoke tenant/device and deployed SHA before approving.

Only one production run may mutate the tenant at a time. Production device-secret rotation and Offline Earn are disabled by default and require explicit policy enablement.

## Outcomes

- `PASS`: every mandatory group and invariant passed.
- `FAIL_TEST`: browser or workflow assertions failed; preserve evidence and fix/redeploy.
- `FAIL_RECONCILIATION`: financial or mutable state could not be restored; treat as high severity.
- `FAIL_INFRASTRUCTURE`: configuration, fixture, deployment, or service prerequisite failed.
- `ABORTED`: operator interruption.

## `FAIL_RECONCILIATION` recovery

1. Do not rerun production smoke.
2. Download the evidence artifact and identify the `smokeRunId`.
3. Identify every unresolved transaction, approval, adjustment, offline record, or fixture mutation.
4. Use normal Admin reversal/compensation controls; never delete ledger, transaction, credit-lot, or audit rows.
5. Verify balance, customer/card/device state, approvals, fraud flags, offline sync, credit-lot reconciliation, and outbox backlog.
6. Record the incident and operator reference.
7. Clear the production safety lock through the authorized recovery procedure.
8. Run staging smoke against the candidate before requesting another production run.

A second production workflow cannot override the safety lock by using a new run ID.

## Evidence privacy

Evidence may contain run IDs, non-secret fixture IDs, receipt/transaction references, statuses, timings, route names, candidate SHA, screenshots, and traces. It must not contain passwords, cookies, session IDs, CSRF tokens, attestation secrets, Supabase service-role keys, Redis credentials, storage-state files, or real customer PII. Review artifacts before sharing them externally.
