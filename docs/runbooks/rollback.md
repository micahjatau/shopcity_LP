# Rollback Runbook

## Purpose

Return to the last known good release artifact when a deployment causes regressions.

## Steps

1. Stop or drain the bad release without mutating ledger history manually.
2. Restore the previously approved image digest for both API and worker.
3. Use only forward-safe migration patterns; never edit shared migrations in place.
4. Re-apply `RELEASE_SHA` and `RELEASE_VERSION` for the restored release.
5. Validate API health, worker startup, critical journeys, and pilot operations summary.
