# Frontend stabilization API contract evidence

Generated from `docs/api/openapi.json` after `npm run openapi:export` and validated with `npm run openapi:lint`.

| Consumer surface   | Success statuses used by the frontend | Contract statuses present                        |
| ------------------ | ------------------------------------- | ------------------------------------------------ |
| Session `/auth/me` | 200                                   | 200, 400, 401, 403, 404, 409, 422, 429, 503      |
| Public config      | 200                                   | 200, 400, 401, 403, 404, 409, 422, 429, 503      |
| Customer list      | 200                                   | 200, 400, 401, 403, 404, 409, 422, 429, 503      |
| Customer create    | 201                                   | 201, 400, 401, 403, 404, 409, 422, 429, 503      |
| Customer update    | 200                                   | 200, 400, 401, 403, 404, 409, 422, 429, 503      |
| Customer ledger    | 200                                   | 200, 400, 401, 403, 404, 409, 422, 429, 503      |
| Card lookup        | 200                                   | 200, 400, 401, 403, 404, 409, 422, 429, 503      |
| Earn               | 201 confirmed, 202 pending            | 201, 202, 400, 401, 403, 404, 409, 422, 429, 503 |
| Redeem             | 201 confirmed, 202 pending            | 201, 202, 400, 401, 403, 404, 409, 422, 429, 503 |
| Offline Earn batch | 200                                   | 200, 400, 401, 403, 404, 409, 422, 429, 503      |

Frontend non-success handling intentionally preserves the HTTP status in user-facing fallback copy (for example, `Earn failed with 409.`) and never interprets a non-success body as authoritative confirmation. Earn and Redeem only treat 201/202 as transaction outcomes; offline batch only treats 200 as a batch response.

Verification:

- `npm run openapi:export`
- `npm run openapi:lint`
- `npm run client:generate`
- `npm run client:typecheck`
- `npx jest test/openapi.int-spec.ts --config ./test/jest-int.json --runInBand` — passed
- `apps/web/tests/transaction-forms.spec.tsx` — passed
