# Deployment Runbook

## Purpose

Deploy the backend safely with one reproducible release artifact, versioned contracts, and controlled rollout.

## Steps

1. Build the candidate container image from the release SHA and record the resulting image digest.
2. Verify `npm run verify:prod-entrypoints` and `npm run verify:docker-image` pass for that same candidate SHA.
3. Confirm backups are current before any production migration or rollout.
4. Deploy worker services before or alongside the API when async work is affected.
5. Set `RELEASE_SHA` and `RELEASE_VERSION` for both API and worker runtimes.
6. Verify health, readiness, pilot operations summary, and smoke tests on the deployed release.
7. Check logs, queue health, stale outbox counts, and reconciliation signals after release.
