# Security Incident Runbook

## Purpose

Contain and remediate suspected secret exposure or severe security findings before pilot launch or continued production operation.

## Steps

1. Treat HIGH or CRITICAL findings from Gitleaks, CodeQL, Trivy, or approved dynamic checks as release blockers unless a documented time-bounded exception is approved.
2. Record the affected release SHA, image digest, workflow run, and finding identifiers.
3. Contain access immediately: disable exposed credentials, revoke tokens, and restrict affected environments if needed.
4. Rotate compromised secrets; deleting the latest file alone is not sufficient remediation.
5. Rebuild and rescan the exact replacement image artifact after remediation.
6. Re-run required readiness gates and attach the updated evidence to the release record.
7. Document customer impact, root cause, remediation, and follow-up prevention work.
