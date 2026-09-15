# Deployment Runbook

## Purpose

Deploy the backend safely with one reproducible release artifact, versioned contracts, and controlled rollout.

## Steps

1. Build the candidate container image from the release SHA and record the resulting image digest.
2. Verify `npm run verify:prod-entrypoints` and `npm run verify:docker-image` pass for that same candidate SHA.
3. Confirm backups are current before any production migration or rollout.
4. Deploy worker services before or alongside the API when async work is affected.
5. Set `RELEASE_SHA` and `RELEASE_VERSION` for both API and worker runtimes; verify the worker reports `SHOPCITY_WORKER_READY` and `SHOPCITY_WORKER_SHA` for the exact candidate.
6. Configure production SMS with `SMS_PROVIDER_MODE=real`; keep `ALLOW_FAKE_SMS_IN_PRODUCTION` false or unset.
7. Record API and worker deployment IDs, runtime SHAs, readiness, and the terminal outbox/provider state in release evidence.
8. Verify health, readiness, pilot operations summary, and smoke tests on the deployed release.
9. Check logs, queue health, stale outbox counts, and reconciliation signals after release.
