# Security Incident Runbook

## Purpose

Contain and remediate suspected secret exposure or severe security findings before pilot launch or continued production operation.

## Steps

1. Treat HIGH or CRITICAL findings from Gitleaks, CodeQL, Trivy, or approved dynamic checks as release blockers unless a documented time-bounded exception is approved.
2. Record the affected release SHA, image digest, workflow run, finding identifiers, and any known request IDs tied to the incident.
3. Preserve logs, deployment metadata, and workflow evidence before making destructive changes.
4. Contain access immediately: disable exposed credentials, revoke tokens, and restrict affected environments if needed.
5. Rotate compromised secrets; deleting the latest file alone is not sufficient remediation.
6. If rollback is safer than live repair, restore the previously approved artifact using `docs/runbooks/rollback.md`.
7. Rebuild and rescan the exact replacement image artifact after remediation.
8. Re-run required readiness gates plus the pilot operations summary checks and attach the updated evidence to the release record.
9. Document customer impact, root cause, remediation, notification decisions, and follow-up prevention work.

## Rules

- Do not erase evidence before it is preserved.
- Do not request direct ledger mutation as a security mitigation.
- Keep secrets, tokens, and protected customer data out of shared incident notes unless redacted.
