# Smoke Certification Security and Release-Integrity Hardening

## Why

Review 63 confirms that ShopCity's role-based staging smoke suite is deterministic: the frozen candidate passed three consecutive staging certifications with 43/43 tests, clean reconciliation, zero outbox drift, worker readiness/shutdown, provenance checks, and evidence verification. The remaining release blocker is the certification mechanism itself. It currently exposes authenticated browser state through uploaded artifacts, creates long-lived public bootstrap sessions without throttling, trusts privileged `workflow_run` inputs too broadly, can mutate unrelated staging devices, and carries migration/recovery exceptions that are becoming permanent deployment behavior.

## What Changes

- Move Playwright authentication storage outside the evidence tree and prevent auth material from entering uploaded artifacts.
- Revoke and delete smoke sessions during teardown; make bootstrap-created sessions short-lived while retaining the normal login lifetime.
- Rate-limit the public smoke-session bootstrap endpoint with a stricter auth-specific bucket.
- Harden privileged staging `workflow_run` trust, checkout provenance, permissions, and exact-SHA manual dispatch behavior.
- Scope staging attestation remediation to the dedicated smoke tenant/device.
- Extend terminal SMS outbox recovery to include `SENT`.
- Make the outbox invariant migration repair every invalid historical state before enforcing its constraint, and strengthen migration tests.
- Restore historical migration immutability and replace repeated `migrate resolve ... || true` calls with an explicit, auditable one-time staging reconciliation procedure.
- Upgrade `fast-uri` to the patched release and require Trivy to pass.
- Add exact-SHA final-release certification and resolve/justify remaining CodeRabbit major findings before merge.

## Non-Goals

- No production smoke execution without explicit approval.
- No disabling or whitelisting Trivy findings; fixable HIGH/CRITICAL findings remain blocking.
- No broad staging-data cleanup, fabricated device secrets, or weakening of database constraints.
- No deletion or mutation of immutable financial or audit history.
- No replacement of the existing role-based smoke workflows.

## Success Criteria

- No uploaded smoke artifact contains cookies, storage state, session tokens, CSRF tokens, authorization headers, or passwords.
- Smoke bootstrap sessions expire within the configured short lifetime and are revoked during teardown.
- Bootstrap requests are throttled and abuse attempts are observable.
- Only trusted repository-owned workflow runs can receive staging secrets and execute candidate code.
- Staging remediation changes only smoke-owned devices.
- `SENT`, `DELIVERED`, and `SUPPRESSED` terminal SMS states cannot leave a published outbox event stranded.
- Fresh and representative historical databases pass the outbox migration and constraint validation.
- Trivy reports no fixable HIGH or CRITICAL vulnerabilities in the candidate image; unfixed advisories are inventoried and reviewed with time-limited acceptance.
- A final merged master SHA, rather than a pre-merge SHA, has three consecutive passing staging certifications.
