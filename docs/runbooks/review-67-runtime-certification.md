# Review 67 runtime certification runbook

This runbook executes the remaining authenticated Review 67 runtime gates and
writes a redacted evidence manifest. Run it only against an owner-approved
staging/production-smoke target with disposable lifecycle card fixtures.

## Required environment

Set these values without committing them:

- `REVIEW67_BASE_URL` — approved API origin, for example staging backend origin.
- `REVIEW67_SESSION_TOKEN` — preissued authenticated admin/supervisor session.
- `REVIEW67_CSRF_TOKEN` — CSRF token paired with the session.
- `REVIEW67_CANDIDATE_SHA` — exact release candidate SHA.
- `REVIEW67_BRANCH_ID` — approved branch fixture for reports/SMS operations.
- `REVIEW67_CARD_SERIAL` — active card fixture used for duplicate earn check.
- `REVIEW67_CARD_CUSTOMER_ID` — disposable lifecycle customer fixture.
- `REVIEW67_ASSIGN_CARD_SERIAL` — disposable unassigned serial for assignment.
- `REVIEW67_REPLACE_CARD_SERIAL` — disposable unassigned serial for replacement.
- `REVIEW67_WORKER_RUNTIME_SHA` — worker SHA; must match candidate for signoff.
- `REVIEW67_WORKER_DEPLOYMENT_ID` — opaque worker deployment ID.
- `REVIEW67_WORKER_READY=true` — set only after worker readiness was observed.

Optional:

- `REVIEW67_REPORT_ITERATIONS` — default `20`.
- `REVIEW67_REPORT_P95_THRESHOLD_MS` — default `1800`.
- `REVIEW67_OUTPUT` — default
  `test-results/review-67-runtime-certification.json`.

## Command

```bash
node scripts/smoke/review67-runtime-certification.mjs
```

Then include the emitted `runtimeCertification` object in the normal smoke
manifest and validate it:

```bash
node scripts/smoke/verify-smoke-evidence.mjs \
  --manifest test-results/smoke/<run>/smoke-evidence.json \
  --candidate-sha "$REVIEW67_CANDIDATE_SHA" \
  --require-runtime-certification
```

## Safety notes

- Use disposable lifecycle card serials only. Card replacement is intentionally
  irreversible for auditability.
- The script records opaque IDs, status names, counts, and timings only.
- Do not record session tokens, CSRF tokens, cookies, provider payloads, raw SMS
  bodies, or unmasked phone numbers.
- If duplicate receipt returns HTTP 500, the gate fails; expected result is 409.
- If report p95 exceeds the configured threshold, the gate fails.
