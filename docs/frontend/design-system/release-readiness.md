# Frontend release readiness

This note records the current release-gate evidence for the ShopCity frontend implementation in `apps/web`.

## Verified gates

- `npm run openapi:lint`
- `npm run openapi:diff`
- `npm run web:sync:client`
- `npm --prefix apps/web run lint`
- `npm --prefix apps/web run typecheck`
- `npm run web:test`
- `npm run web:a11y:test`
- `npm run web:critical:test`
- `npm run web:visual:test`
- `npm run web:build`

## Evidence summary

- Generated OpenAPI client is in sync after export + generation.
- Accessibility gates pass for shared controls and shell routes.
- Critical Playwright flows pass for login/session, lookup, earn, redeem, approval, offline, fraud, report and revocation scenarios.
- Visual regression baselines exist for the component and shell gallery.
- Production build succeeds.

## Telemetry/privacy review

The frontend design-system guidance limits telemetry to route/workflow/error/timing signals and excludes unnecessary customer identifiers or sensitive authentication/session material. The current implementation remains aligned with that guidance.

## Notes

- Visual snapshots live under `apps/web/tests/visual-regression.spec.ts-snapshots/`.
- Critical-flow fixtures live under `apps/web/app/testing/critical-flows/page.tsx`.
- The release gate summary is intentionally concise and should be refreshed when the frontend contract, shells or test matrix change.
