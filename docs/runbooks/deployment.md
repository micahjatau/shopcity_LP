# Deployment Runbook

## Purpose
Deploy the backend safely with versioned contracts and controlled rollout.

## Steps
1. Verify build, tests, and migration checks pass.
2. Confirm backups are current.
3. Deploy worker services before or alongside the API when async work is affected.
4. Verify health, readiness, and smoke tests.
5. Check logs and queue health after release.
