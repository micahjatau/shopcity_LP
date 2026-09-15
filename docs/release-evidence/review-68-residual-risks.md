# Review 68 residual risks and evidence

## Verified locally

- Prisma integration migrations and report/card/SMS test suites pass in the
  local Supabase environment.
- Card serial preflight completed with zero rows because the local tenant has no
  cards.
- OpenAPI export and lint pass.
- Web lint, typecheck, build, and Playwright coverage pass.
- Focused jobs/reports/cards/web workflow Semgrep secrets scan completed with
  zero findings.
- Scanner throttle k6 script executed locally and failed only because no server
  was listening on `127.0.0.1:3000`; rerun with authorized staging tokens.
- Report refresh and SMS inspection enforce tenant/branch authorization in the
  application service.

## Environment gates

| Gate                                  | Status            | Required evidence                                                                                                                                                                            |
| ------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real-tenant collision resolution      | Pending           | Authorized preflight, approved dispositions, zero-collision rerun.                                                                                                                           |
| Fresh/upgrade/restore migration check | Pending           | Backup checksum, restore log, Prisma migration status, smoke result.                                                                                                                         |
| Scanner production-load exercise      | Environment-gated | Local k6 invocation reached the script and failed with connection-refused because the app was not running; valid evidence requires staging/prod-like URL, CSRF/session token, and test card. |
| Provider invoice reconciliation       | Pending           | Approved tariff/invoice reconciliation artifact.                                                                                                                                             |
| Production logging review             | Pending           | Redacted log sample and evidence-retention review.                                                                                                                                           |
| Full Semgrep cleanup                  | Pending           | Existing workflow findings require action-owner review; no findings are suppressed here.                                                                                                     |

No production result is inferred from local execution, and no raw provider
payloads or unmasked customer data belong in release evidence.
