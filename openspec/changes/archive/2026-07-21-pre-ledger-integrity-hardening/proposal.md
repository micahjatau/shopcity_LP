## Why

The system still has a few release-blocking trust gaps before immutable earning-ledger work can sit on top of it. Receipt integrity upgrades can still be surprised by bad legacy data, receipt capture is not fully guarded against concurrency and trust-boundary drift, and bearer-vs-cookie CSRF behavior is still ambiguous for API clients.

## What Changes

- Add a preflight that rejects duplicate or blank legacy POS receipt identities before the receipt integrity migration mutates receipt data.
- Fix the upgrade-path harness so it applies only migrations that precede the target migration under test.
- Make receipt capture transactionally authoritative by revalidating eligibility inside the write transaction and resolving duplicates with a single success/conflict outcome.
- Introduce receipt review states for high-value receipts, including separate requesting and approving actors.
- Bind captured receipts to a session-resolved device identity and stop trusting a body-supplied device identifier for capture.
- Preserve device history by preventing deletion of devices referenced by captured receipts.
- Scope idempotency records to the tenant and actor, enforce expiry, and replay the full stored success response for completed captures.
- Make CSRF enforcement depend on auth transport: bearer-authenticated unsafe requests bypass CSRF, cookie-authenticated unsafe requests require it, and the OpenAPI contract reflects that behavior. **BREAKING** for clients that assumed bearer requests also needed CSRF.

## Capabilities

### New Capabilities

- `receipt-processing-readiness`: receipt migration safety, atomic capture, concurrency protection, high-value review workflow, session-bound device identity, device history preservation, and idempotency ownership/cleanup.
- `api-auth-contract`: transport-specific CSRF behavior and documented auth expectations for unsafe requests.

### Modified Capabilities

## Impact

Affected areas include receipt migrations, Prisma schema and relations, receipt capture service and DTOs, session/auth guards, OpenAPI documentation, integration tests, and the migration tracker. This change is a prerequisite for the immutable earning-ledger phase.
