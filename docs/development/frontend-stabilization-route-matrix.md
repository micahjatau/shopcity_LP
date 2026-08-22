# Frontend stabilization route matrix

This matrix is the Phase 1 measurement contract for `frontend-stabilization-and-performance`.

## Routes

| Route                   | Primary job                        | Cold measurement | Warm measurement |
| ----------------------- | ---------------------------------- | ---------------- | ---------------- |
| `/cashier`              | Operational overview and launchpad | Required         | Required         |
| `/cashier/lookup`       | Identify customer/card             | Required         | Required         |
| `/cashier/earn`         | Review and submit Earn             | Required         | Required         |
| `/cashier/redeem`       | Review and submit Redeem           | Required         | Required         |
| `/supervisor/approvals` | Supervisor approval queue          | Required         | Required         |
| `/admin/operations`     | Admin operational view             | Required         | Required         |

## Evidence fields

Each run must identify:

- commit SHA;
- production-build requirement and base URL;
- generated timestamp, browser, locale, and timezone;
- document/navigation transfer sizes;
- resource-group transfer sizes for RSC, JavaScript, API, and other resources;
- total API requests;
- `/auth/me` requests;
- `/config/public` requests;
- duplicate API URLs;
- API response status and timing data.

Web Vitals and hydration metrics are added by the browser workflow that consumes this artifact. Missing metrics are recorded as unavailable, never treated as zero.

## Initial release targets

- Warm navigation payload: `< 150 KB`.
- Warm `/auth/me` requests: `0`.
- Warm `/config/public` requests: `0`.
- Duplicate API requests: `0`.
- LCP: `< 2.5 s`.
- INP: `< 200 ms`.

These are gates for the stabilization program, not a claim that the current baseline passes. A staging exception must include the observed value, environment, owner, rationale, and follow-up date.

## Commands

Start the production web build and server, then run:

```bash
GIT_COMMIT_SHA="$(git rev-parse HEAD)" \
WEB_PERF_BASE_URL=http://127.0.0.1:3100 \
WEB_PERF_STORAGE_STATE=tmp/performance/shopcity-auth.json \
node scripts/performance/collect-web-route-baseline.mjs
```

`WEB_PERF_STORAGE_STATE` is optional for unauthenticated shell baselines. Authenticated workflow evidence MUST provide a Playwright storage-state file created through the approved test login flow; the artifact records whether authenticated state was supplied.

The default output is:

```text
tmp/performance/frontend-stabilization-baseline.json
```
