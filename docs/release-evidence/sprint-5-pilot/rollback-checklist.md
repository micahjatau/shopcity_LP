# Sprint 5 Pilot Rollback Checklist

- [ ] Stop or drain the affected release using the documented rollback path.
- [ ] Restore the previously approved image digest for both API and worker.
- [ ] Re-verify `RELEASE_SHA` and `RELEASE_VERSION` after rollback.
- [ ] Preserve the incident evidence, request IDs, and affected pilot operations summary snapshots.
- [ ] Confirm reconciliation and backlog signals are healthy on the restored release.
- [ ] Record the rollback approver, reason, and follow-up issue.
