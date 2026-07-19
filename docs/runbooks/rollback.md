# Rollback Runbook

## Purpose
Return to the last known good state when a deployment causes regressions.

## Steps
1. Stop or drain the bad release.
2. Restore the previous stable image.
3. Use only forward-safe migration patterns where possible.
4. Validate API health and critical journeys.
